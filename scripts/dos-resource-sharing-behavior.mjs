/* USA-278 behavior: the send/complete/revoke path, run end to end against an
 * in-memory stand-in for the workspace database.
 *
 * The contract checks live in dos-resource-sharing-regression.mjs. This file
 * exercises the rules that only show up when the code actually runs: a couple
 * never ends up with two open links, a spouse linked later keeps the
 * responses, a second submission never writes a second result, and a revoked
 * or expired token stops at the door.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

/* Modules run in their own vm realm, so arrays and objects they return are not
   reference-equal to host ones. Compare their plain shape. */
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ---- A tiny module loader: real DOS modules, stubbed edges --------------- */

const moduleCache = new Map();
let supabaseState = null;

function loadTsModule(absolutePath) {
  if (moduleCache.has(absolutePath)) {
    return moduleCache.get(absolutePath);
  }

  const source = readFileSync(absolutePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: absolutePath,
  });
  const sandbox = {
    console,
    exports: {},
    module: { exports: {} },
    require: makeRequire(path.dirname(absolutePath)),
    URL,
  };

  sandbox.module.exports = sandbox.exports;
  moduleCache.set(absolutePath, sandbox.module);
  vm.runInNewContext(outputText, sandbox, { filename: absolutePath });

  return sandbox.module;
}

function resolveTs(specifier, fromDir) {
  const base = specifier.startsWith("@/")
    ? path.join(repoRoot, specifier.slice(2))
    : path.resolve(fromDir, specifier);

  for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
    try {
      readFileSync(candidate, "utf8");
      return candidate;
    } catch {
      /* keep looking */
    }
  }

  return null;
}

function makeRequire(fromDir) {
  return function requireModule(specifier) {
    if (specifier === "server-only") {
      return {};
    }

    if (specifier === "node:crypto") {
      return { randomBytes: (size) => ({ toString: () => `tok${"x".repeat(Math.max(0, size))}${supabaseState.tokenSeed++}` }) };
    }

    /* `missionary-app` is the whole DOS server read path; the share library
       uses one predicate from it, so the test supplies that predicate rather
       than booting Supabase's browser client. */
    if (specifier === "@/src/lib/dos/missionary-app") {
      return {
        isMissingWorkspaceScopeColumn: (error) => {
          const message = error?.message?.toLowerCase() ?? "";
          return message.includes("workspace_id") && message.includes("column");
        },
      };
    }

    if (specifier === "@/src/lib/dos/auth") {
      return {};
    }

    if (specifier === "@/src/lib/site-url") {
      return { getCanonicalSiteUrl: () => "https://usamissionaries.test" };
    }

    if (specifier === "@/src/lib/supabase/admin") {
      return {
        createSupabaseAdminClient: () => createFakeSupabase(),
        isSupabaseAdminConfigured: () => true,
      };
    }

    const resolved = resolveTs(specifier, fromDir);

    if (!resolved) {
      throw new Error(`Unexpected import in the share behavior test: ${specifier}`);
    }

    return loadTsModule(resolved).exports;
  };
}

/* ---- The stand-in database ---------------------------------------------- */

function matchesFilters(row, filters) {
  return filters.every((filter) => {
    if (filter.kind === "eq") {
      return row[filter.column] === filter.value;
    }

    if (filter.kind === "neq") {
      return row[filter.column] !== filter.value;
    }

    if (filter.kind === "in") {
      return filter.values.includes(row[filter.column]);
    }

    if (filter.kind === "lte") {
      return String(row[filter.column]) <= String(filter.value);
    }

    /* `or` arrives as PostgREST text: "a.eq.1,b.in.(x,y)". */
    return filter.clauses.some((clause) => {
      const [column, operator, rawValue] = clause.split(/\.(eq|in)\./).length > 1
        ? [clause.split(".")[0], clause.includes(".in.") ? "in" : "eq", clause.slice(clause.indexOf(clause.includes(".in.") ? ".in." : ".eq.") + (clause.includes(".in.") ? 4 : 4))]
        : [null, null, null];

      if (!column) {
        return false;
      }

      if (operator === "in") {
        return rawValue.replace(/^\(|\)$/g, "").split(",").filter(Boolean).includes(row[column]);
      }

      return row[column] === rawValue;
    });
  });
}

/* Row ids look like real uuids because the library refuses anything else
   before it ever reaches a query. */
function fakeUuid(counter) {
  const suffix = String(counter).padStart(12, "0");

  return `99999999-9999-4999-8999-${suffix}`;
}

function createFakeSupabase() {
  const state = supabaseState;

  function builder(table, mode, payload) {
    const filters = [];
    let selected = false;

    const api = {
      delete() {
        return builder(table, "delete");
      },
      eq(column, value) {
        filters.push({ column, kind: "eq", value });
        return api;
      },
      lte(column, value) {
        filters.push({ column, kind: "lte", value });
        return api;
      },
      in(column, values) {
        filters.push({ column, kind: "in", values });
        return api;
      },
      neq(column, value) {
        filters.push({ column, kind: "neq", value });
        return api;
      },
      or(text) {
        filters.push({ clauses: splitOrClauses(text), kind: "or" });
        return api;
      },
      order() {
        return api;
      },
      select() {
        selected = true;
        return api;
      },
      async maybeSingle() {
        const result = await run();
        return { data: result.data?.[0] ?? null, error: result.error };
      },
      async single() {
        const result = await run();

        return result.data?.[0]
          ? { data: result.data[0], error: null }
          : { data: null, error: { message: `No row returned from ${table}` } };
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
    };

    async function run() {
      state.queries.push({ filters: filters.length, mode, table });
      const rows = state.tables[table] ?? [];

      if (mode === "select") {
        return { data: rows.filter((row) => matchesFilters(row, filters)).map((row) => ({ ...row })), error: null };
      }

      if (mode === "insert") {
        const inserted = { id: fakeUuid(state.tables[table].length + 1), ...payload };

        if (table === "dos_resource_share_assignments") {
          /* The partial unique index, enforced here so the test proves the
             code finds the open assignment rather than leaning on a
             constraint error. */
          const clash = rows.some((row) => (
            row.workspace_id === inserted.workspace_id
            && row.resource_slug === inserted.resource_slug
            && row.primary_person_id === inserted.primary_person_id
            && ["link_ready", "in_progress"].includes(row.status)
          ));

          if (clash) {
            return { data: null, error: { message: "duplicate key value violates unique constraint \"dos_resource_share_assignments_open_unique\"" } };
          }
        }

        state.tables[table].push(inserted);

        return { data: [{ ...inserted }], error: null };
      }

      if (mode === "update") {
        const updated = [];

        rows.forEach((row, index) => {
          if (matchesFilters(row, filters)) {
            state.tables[table][index] = { ...row, ...payload };
            updated.push({ ...state.tables[table][index] });
          }
        });

        return { data: updated, error: null };
      }

      const kept = rows.filter((row) => !matchesFilters(row, filters));
      const removed = rows.length - kept.length;
      state.tables[table] = kept;

      return { data: [], error: null, removed };
    }

    void selected;

    return api;
  }

  return {
    from(table) {
      return {
        delete: () => builder(table, "delete"),
        insert: (payload) => builder(table, "insert", payload),
        select: () => builder(table, "select"),
        update: (payload) => builder(table, "update", payload),
      };
    },
  };
}

function splitOrClauses(text) {
  const clauses = [];
  let depth = 0;
  let current = "";

  for (const character of text) {
    if (character === "(") {
      depth += 1;
    }

    if (character === ")") {
      depth -= 1;
    }

    if (character === "," && depth === 0) {
      clauses.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (current) {
    clauses.push(current);
  }

  return clauses;
}

const workspaceId = "workspace-fox";
const otherWorkspaceId = "workspace-other";

function resetState() {
  supabaseState = {
    queries: [],
    tokenSeed: 1,
    tables: {
      dos_assessment_results: [],
      dos_resource_share_assignments: [],
      missionary_field_people: [
        { household_id: workspaceId, id: "11111111-1111-4111-8111-111111111111", name: "Samuel Gaffney", spouse_name: "Patty Gaffney", workspace_id: workspaceId },
        { household_id: workspaceId, id: "22222222-2222-4222-8222-222222222222", name: "Patty Gaffney", spouse_name: "Samuel Gaffney", workspace_id: workspaceId },
        { household_id: workspaceId, id: "33333333-3333-4333-8333-333333333333", name: "George Jenko", spouse_name: "Mara Jenko", workspace_id: workspaceId },
        { household_id: otherWorkspaceId, id: "44444444-4444-4444-8444-444444444444", name: "Someone Else", spouse_name: null, workspace_id: otherWorkspaceId },
      ],
    },
  };
}

resetState();

const shareLinks = loadTsModule(path.join(repoRoot, "src/lib/dos/resource-share-links.ts")).exports;
const catalog = loadTsModule(path.join(repoRoot, "src/lib/dos/resource-catalog.ts")).exports;
const marriage = catalog.getDosResourceBySlug("marriage-assessment");
const questions = marriage.content.assessment.questions;
const authorization = { access: "admin", email: "ryan@example.com", userId: "user-ryan" };

function completeAnswers() {
  return Object.fromEntries(questions.map((question) => [question.id, { Husband: 8, Wife: 7 }]));
}

async function sendTo(input) {
  return shareLinks.createDosResourceShareAssignment({
    authorization,
    requestedByName: "Fox Family",
    resourceSlug: "marriage-assessment",
    workspaceId,
    ...input,
  });
}

/* ---- Assign from the Library to an existing person, linked spouse -------- */

const created = await sendTo({ primaryPersonId: "11111111-1111-4111-8111-111111111111", secondaryParticipantName: "Patty Gaffney", secondaryPersonId: "22222222-2222-4222-8222-222222222222" });
assert.equal(created.ok, true, "a leader can send the assessment to a person in their workspace");
assert.equal(created.reused, false);
assert.equal(created.assignment.status, "link_ready", "creating a link never records a delivery");
assert.match(created.url, /^https:\/\/usamissionaries\.test\/dos\/resource\//, "the link is the public token path");
assert.equal(created.assignment.secondary_person_id, "22222222-2222-4222-8222-222222222222", "the linked spouse is carried on the assignment");
assert.equal(supabaseState.tables.dos_resource_share_assignments.length, 1);

/* Sending again does not split the couple's responses across two links. */
const resent = await sendTo({ primaryPersonId: "11111111-1111-4111-8111-111111111111", secondaryParticipantName: "Patty Gaffney", secondaryPersonId: "22222222-2222-4222-8222-222222222222" });
assert.equal(resent.ok, true);
assert.equal(resent.reused, true, "an open link for the same couple is handed back, not duplicated");
assert.equal(resent.url, created.url);
assert.equal(supabaseState.tables.dos_resource_share_assignments.length, 1);

/* Sending to the spouse instead reaches the same couple assignment. */
const fromSpouse = await sendTo({ primaryPersonId: "22222222-2222-4222-8222-222222222222", secondaryParticipantName: "Samuel Gaffney", secondaryPersonId: "11111111-1111-4111-8111-111111111111" });
assert.equal(fromSpouse.reused, true, "either spouse's record opens the same assignment");
assert.equal(supabaseState.tables.dos_resource_share_assignments.length, 1);

/* ---- Permission: a person outside the workspace is refused -------------- */

const crossWorkspace = await sendTo({ primaryPersonId: "44444444-4444-4444-8444-444444444444", secondaryParticipantName: "Anyone", secondaryPersonId: null });
assert.equal(crossWorkspace.ok, false);
assert.equal(crossWorkspace.status, 403, "a person id from another workspace is refused");

const crossWorkspaceSpouse = await sendTo({ primaryPersonId: "33333333-3333-4333-8333-333333333333", secondaryParticipantName: "Someone Else", secondaryPersonId: "44444444-4444-4444-8444-444444444444" });
assert.equal(crossWorkspaceSpouse.ok, false);
assert.equal(crossWorkspaceSpouse.status, 403, "a spouse id from another workspace is refused");

const missingSpouse = await sendTo({ primaryPersonId: "33333333-3333-4333-8333-333333333333", secondaryParticipantName: "  ", secondaryPersonId: null });
assert.equal(missingSpouse.ok, false);
assert.equal(missingSpouse.status, 400, "a couple assessment needs both participants named");

const notSendable = await shareLinks.createDosResourceShareAssignment({
  authorization,
  primaryPersonId: "33333333-3333-4333-8333-333333333333",
  requestedByName: "Fox Family",
  resourceSlug: "friendship-assessment",
  secondaryParticipantName: "Dana",
  secondaryPersonId: null,
  workspaceId,
});
assert.equal(notSendable.ok, false, "a resource whose flow is not finished cannot be sent");

/* ---- A spouse who is only a name ---------------------------------------- */

const georgeShare = await sendTo({ primaryPersonId: "33333333-3333-4333-8333-333333333333", secondaryParticipantName: "Mara", secondaryPersonId: null });
assert.equal(georgeShare.ok, true);
assert.equal(georgeShare.assignment.secondary_person_id, null, "no contact is created for a spouse given by name");
assert.equal(georgeShare.assignment.secondary_participant_name, "Mara", "the entered first name is the participant");
assert.equal(
  supabaseState.tables.missionary_field_people.length,
  4,
  "sending never adds a person to the field",
);

/* ---- The recipient's link ----------------------------------------------- */

const token = georgeShare.assignment.token;
const state = await shareLinks.loadDosResourceShareLink(token);
assert.equal(state.status, "ready");
assert.equal(state.requestedByName, "Fox Family", "the recipient sees who asked");
assert.deepEqual(plain(state.participants).map((participant) => participant.name), ["George Jenko", "Mara"]);
assert.equal(state.title, "Marriage Assessment");
assert.equal(Object.keys(state.responses).length, 0, "a fresh link starts empty");
assert.equal(state.assessment.questions.length, questions.length, "every existing question is preserved");

assert.equal((await shareLinks.loadDosResourceShareLink("not-a-token")).status, "invalid");
assert.equal((await shareLinks.loadDosResourceShareLink("unknownunknownunknown")).status, "invalid");

/* ---- Save progress and resume ------------------------------------------- */

const partial = { [questions[0].id]: { Husband: 9, Wife: 3 } };
const saved = await shareLinks.saveDosResourceShareProgress(token, partial);
assert.equal(saved.ok, true);
assert.equal(saved.savedCount, 2);

const resumed = await shareLinks.loadDosResourceShareLink(token);
assert.deepEqual(plain(resumed.responses), partial, "progress comes back on the same link");
assert.equal(
  supabaseState.tables.dos_resource_share_assignments.find((row) => row.token === token).status,
  "in_progress",
  "answering moves the assignment to In progress",
);
assert.equal(supabaseState.tables.dos_assessment_results.length, 0, "draft answers never become a result");

/* Rubbish in a saved payload is dropped rather than stored. */
await shareLinks.saveDosResourceShareProgress(token, { [questions[0].id]: { Husband: 9, Wife: 3, Stranger: 5 }, "made-up": { Husband: 1 } });
assert.deepEqual(plain((await shareLinks.loadDosResourceShareLink(token)).responses), partial);

/* An incomplete assessment cannot be submitted. */
const tooEarly = await shareLinks.submitDosResourceShareAssessment(token, partial);
assert.equal(tooEarly.status, 400, "every question needs both scores before a result exists");
assert.equal(supabaseState.tables.dos_assessment_results.length, 0);

/* ---- Completion ---------------------------------------------------------- */

const submitted = await shareLinks.submitDosResourceShareAssessment(token, completeAnswers());
assert.equal(submitted.ok, true);
assert.ok(submitted.resultId, "completion writes one result");
assert.equal(supabaseState.tables.dos_assessment_results.length, 1);

const result = supabaseState.tables.dos_assessment_results[0];
assert.equal(result.workspace_id, workspaceId, "the result is scoped to the sending workspace");
assert.equal(result.person_id, "33333333-3333-4333-8333-333333333333");
assert.equal(result.secondary_person_id, null);
assert.equal(result.source, "sent_link");
assert.equal(result.assessment_type, "marriage-assessment");
assert.equal(result.max_score, marriage.content.assessment.maxScore);
assert.equal(result.overall_score, 8 * questions.length / 2 + 7 * questions.length / 2 === 0 ? 0 : Math.round((8 * questions.length + 7 * questions.length) / 2), "the score is recomputed server-side from the stored answers");
assert.equal(result.answers.participantNames.Wife, "Mara", "each spouse's answers stay attributed by name");
assert.equal(result.answers.questions[0].scores.Husband, 8);
assert.equal(result.answers.questions[0].scores.Wife, 7);
assert.equal(result.completed_by_name, "George Jenko and Mara");

/* Repeated submission must not create a second result or a second timeline
   event: the assignment is already completed and its existing result stands. */
const repeated = await shareLinks.submitDosResourceShareAssessment(token, completeAnswers());
assert.equal(repeated.ok, true);
assert.equal(repeated.alreadyCompleted, true);
assert.equal(repeated.resultId, submitted.resultId);
assert.equal(supabaseState.tables.dos_assessment_results.length, 1, "a second submission never writes a second result");

/* The finished link stops offering the questionnaire. */
assert.equal((await shareLinks.loadDosResourceShareLink(token)).status, "completed");
assert.equal((await shareLinks.saveDosResourceShareProgress(token, completeAnswers())).alreadyCompleted, true);

/* ---- Repeat assessments stay distinct ----------------------------------- */

const secondRound = await sendTo({ primaryPersonId: "33333333-3333-4333-8333-333333333333", secondaryParticipantName: "Mara", secondaryPersonId: null });
assert.equal(secondRound.ok, true);
assert.equal(secondRound.reused, false, "a completed assessment never blocks a fresh one");
assert.notEqual(secondRound.assignment.token, token, "a new assessment gets its own link");
assert.equal(supabaseState.tables.dos_assessment_results.length, 1, "the earlier result is untouched");

/* ---- Linking the spouse's contact later keeps the responses -------------- */

supabaseState.tables.missionary_field_people.push({ household_id: workspaceId, id: "55555555-5555-4555-8555-555555555555", name: "Mara Jenko", spouse_name: "George Jenko", workspace_id: workspaceId });

const completedAssignment = supabaseState.tables.dos_resource_share_assignments.find((row) => row.token === token);
const linked = await shareLinks.linkDosResourceShareSpouse({
  assignmentId: completedAssignment.id,
  secondaryPersonId: "55555555-5555-4555-8555-555555555555",
  workspaceId,
});
assert.equal(linked.ok, true);
assert.equal(
  supabaseState.tables.dos_resource_share_assignments.find((row) => row.token === token).secondary_person_id,
  "55555555-5555-4555-8555-555555555555",
  "the contact can be linked later",
);
assert.equal(
  supabaseState.tables.dos_resource_share_assignments.find((row) => row.token === token).secondary_participant_name,
  "Mara",
  "the entered name stays as the attribution",
);
assert.deepEqual(
  plain(supabaseState.tables.dos_resource_share_assignments.find((row) => row.token === token).responses),
  completeAnswers(),
  "linking a contact never loses responses",
);
assert.equal(
  supabaseState.tables.dos_assessment_results[0].secondary_person_id,
  "55555555-5555-4555-8555-555555555555",
  "the completed result follows the link so both records show it once",
);

const linkOutsider = await shareLinks.linkDosResourceShareSpouse({
  assignmentId: completedAssignment.id,
  secondaryPersonId: "44444444-4444-4444-8444-444444444444",
  workspaceId,
});
assert.equal(linkOutsider.ok, false);
assert.equal(linkOutsider.status, 403, "a contact from another workspace cannot be linked in");

/* ---- Revoking ------------------------------------------------------------ */

const openAssignment = supabaseState.tables.dos_resource_share_assignments.find((row) => row.status === "link_ready");
const revoked = await shareLinks.revokeDosResourceShareAssignment({ assignmentId: openAssignment.id, workspaceId });
assert.equal(revoked.ok, true);
assert.equal((await shareLinks.loadDosResourceShareLink(openAssignment.token)).status, "revoked");
assert.equal((await shareLinks.saveDosResourceShareProgress(openAssignment.token, partial)).status, 410, "a revoked link accepts nothing");
assert.equal((await shareLinks.submitDosResourceShareAssessment(openAssignment.token, completeAnswers())).status, 410);

const revokeFromOtherWorkspace = await shareLinks.revokeDosResourceShareAssignment({
  assignmentId: secondRound.assignment.id,
  workspaceId: otherWorkspaceId,
});
assert.equal(revokeFromOtherWorkspace.ok, false, "another workspace cannot revoke this workspace's link");
assert.equal(
  supabaseState.tables.dos_resource_share_assignments.find((row) => row.id === secondRound.assignment.id).status,
  "link_ready",
  "the refused revoke changed nothing",
);

/* ---- Expiry -------------------------------------------------------------- */

const expiring = supabaseState.tables.dos_resource_share_assignments.find((row) => row.id === secondRound.assignment.id);
expiring.expires_at = new Date(Date.now() - 1000).toISOString();
assert.equal((await shareLinks.loadDosResourceShareLink(expiring.token)).status, "expired");
assert.equal((await shareLinks.submitDosResourceShareAssessment(expiring.token, completeAnswers())).status, 410, "an expired link cannot be completed");
assert.equal(supabaseState.tables.dos_assessment_results.length, 1, "an expired link writes no result");

/* An expired link is not treated as an open one, so the couple can be sent a
   fresh assessment. */
const afterExpiry = await sendTo({ primaryPersonId: "33333333-3333-4333-8333-333333333333", secondaryParticipantName: "Mara", secondaryPersonId: null });
assert.equal(afterExpiry.ok, true);
assert.equal(afterExpiry.reused, false, "an expired link is replaced rather than handed back");

console.log("DOS resource sharing (USA-278) behavior passed.");
