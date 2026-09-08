// USA-238 / USA-239 Phase 2: the USAM boundary for Kitchen Table responses is a
// server decision made from workspace organization state, not a client
// courtesy. This script runs the real code on both sides of that boundary:
//
//   * decideUsamWorkspace        — the one pure decision (app loader + API)
//   * loadUsamWorkspaceFacts /
//     isUsamWorkspaceById         — the server loader, against fake Supabase rows
//   * conversationFlowRequiresGate + the engine's normalization — the meetings
//     API's flow decision
//
// and composes them the way app/api/dos/app/meetings/route.ts does, so a
// generic DOS workspace is proven unable to persist a gated flow through the
// API, a USAM workspace is proven able to create and edit one, and historical
// Four Questions data is proven to survive without being offered for capture.
import { readFileSync } from "node:fs";
import { register } from "node:module";

const repoRoot = new URL("../", import.meta.url).href;

// Resolve the `@/` alias for the TypeScript modules under test.
register(
  `data:text/javascript,${encodeURIComponent(`
    const root = ${JSON.stringify(repoRoot)};
    export async function resolve(specifier, context, next) {
      if (specifier.startsWith("@/")) {
        const target = root + specifier.slice(2);
        for (const suffix of ["", ".ts", ".tsx", "/index.ts"]) {
          try { return await next(target + suffix, context); } catch {}
        }
      }
      return next(specifier, context);
    }
  `)}`,
);

const { decideUsamWorkspace, isUsamWorkspaceById, loadUsamWorkspaceFacts } = await import("../src/lib/dos/usam-workspace.ts");
const engine = await import("../src/lib/dos/meeting-engine.ts");

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);

  assert(left === right, `${message} Expected ${right}, received ${left}.`);
}

const checks = [];

function check(name, run) {
  checks.push({ name, run });
}

// A minimal PostgREST-shaped client: `from(table)` returns a builder whose
// eq calls narrow the configured rows and whose maybeSingle resolves
// `{ data, error }`. A table configured with an `error` fails every query on
// it, which is how read failures are simulated. Nothing else is mocked.
function fakeSupabase(tables) {
  return {
    from(table) {
      const config = tables[table] ?? { rows: [] };
      const filters = [];
      const builder = {
        eq(column, value) {
          filters.push((row) => row[column] === value);

          return builder;
        },
        limit() {
          return builder;
        },
        async maybeSingle() {
          if (config.error) {
            return { data: null, error: config.error };
          }

          return { data: (config.rows ?? []).find((row) => filters.every((filter) => filter(row))) ?? null, error: null };
        },
        order() {
          return builder;
        },
        select() {
          return builder;
        },
      };

      return builder;
    },
  };
}

const usamOrganization = { branding_mode: "usam", id: "org-usam", name: "USA Missionaries", slug: "usa-missionaries" };
const partnerOrganization = { branding_mode: "affiliate", id: "org-partner", name: "Partner Church", slug: "partner-church" };
const organizations = { rows: [partnerOrganization, usamOrganization] };

function household(id, slug, extra = {}) {
  return { id, public_visible: false, show_household: true, slug, usam_application_status: null, ...extra };
}

const workspaces = {
  // A generic DOS workspace: owned by a partner organization, no USAM
  // application, no live public profile.
  generic: {
    id: "11111111-1111-4111-8111-111111111111",
    tables: {
      collectives: { rows: [{ owner_organization_id: "org-partner", slug: "partner-ws" }] },
      missionary_households: { rows: [household("11111111-1111-4111-8111-111111111111", "partner-ws")] },
      organizations,
      usam_missionary_applications: { rows: [] },
    },
  },
  // A workspace with no owning organization at all and nothing else: the
  // loader's display-only USAM fallback must not make it USAM.
  unowned: {
    id: "44444444-4444-4444-8444-444444444444",
    tables: {
      collectives: { rows: [] },
      missionary_households: { rows: [household("44444444-4444-4444-8444-444444444444", "unowned-ws", { usam_application_status: "pending_review" })] },
      organizations,
      usam_missionary_applications: { rows: [] },
    },
  },
  // USAM through an approved application, even though the collective is
  // owned by a partner organization.
  usamByApplication: {
    id: "22222222-2222-4222-8222-222222222222",
    tables: {
      collectives: { rows: [{ owner_organization_id: "org-partner", slug: "fox-family" }] },
      missionary_households: { rows: [household("22222222-2222-4222-8222-222222222222", "fox-family", { usam_application_status: "under_review" })] },
      organizations,
      usam_missionary_applications: { rows: [{ id: "app-1", status: "approved", workspace_id: "22222222-2222-4222-8222-222222222222" }] },
    },
  },
  // USAM through organization ownership alone.
  usamByOrganization: {
    id: "33333333-3333-4333-8333-333333333333",
    tables: {
      collectives: { rows: [{ owner_organization_id: "org-usam", slug: "jenko" }] },
      missionary_households: { rows: [household("33333333-3333-4333-8333-333333333333", "jenko")] },
      organizations,
      usam_missionary_applications: { rows: [] },
    },
  },
  // USAM through a live public missionary profile.
  usamByProfile: {
    id: "55555555-5555-4555-8555-555555555555",
    tables: {
      collectives: { rows: [] },
      missionary_households: { rows: [household("55555555-5555-4555-8555-555555555555", "live-profile", { public_visible: true })] },
      organizations,
      usam_missionary_applications: { rows: [] },
    },
  },
};

const kitchenTableResponses = {
  believeJesus: "yes",
  faithCommitmentOutcomes: ["rededication"],
  fivefoldGifts: ["pastor"],
  manifestationGifts: ["faith", "not_a_gift"],
  relationshipWithJesus: 8,
  spiritualGifts: "yes",
};
const fourQuestionsResponses = {
  followUpActions: ["wants_prayer"],
  recognizes_problem: "unsure",
  response_notes: "Kept for the record.",
};

// The route's decision, composed exactly as POST and PATCH compose it: read
// workspace state only for a gated flow, refuse with 403 when the requested
// flow does not survive normalization, otherwise store the normalized flow.
async function decideForWorkspace(workspace, payload) {
  const allowGatedFlows = engine.conversationFlowRequiresGate(payload.conversationFlowKey)
    ? await isUsamWorkspaceById(fakeSupabase(workspace.tables), workspace.id)
    : false;
  const requested = payload.conversationFlowKey;
  const conversationFlowKey = engine.normalizeConversationFlowKey(requested, allowGatedFlows);

  if (typeof requested === "string" && requested !== "none" && conversationFlowKey === "none") {
    const flowName = engine.getConversationFlowDefinition(requested)?.title ?? "Conversation flow";

    return { error: `${flowName} is not available for this workspace.`, status: 403 };
  }

  return {
    conversationFlowKey,
    conversationResponses: engine.normalizeConversationResponses(conversationFlowKey, payload.conversationResponses),
    status: 200,
  };
}

check("The pure decision grants access only from organization state", () => {
  const generic = { applicationStatus: "not_connected", ownerOrganization: null, publicProfileLive: false };

  assertEqual(decideUsamWorkspace(generic), false, "A workspace with no facts is generic.");
  assertEqual(decideUsamWorkspace({ ...generic, ownerOrganization: { brandingMode: "affiliate", slug: "partner-church" } }), false, "A partner-owned workspace is generic.");
  assertEqual(decideUsamWorkspace({ ...generic, applicationStatus: "approved" }), true, "An approved USAM application grants access.");
  assertEqual(decideUsamWorkspace({ ...generic, applicationStatus: "active" }), true, "An active USAM application grants access.");
  assertEqual(decideUsamWorkspace({ ...generic, publicProfileLive: true }), true, "A live USAM public profile grants access.");
  assertEqual(decideUsamWorkspace({ ...generic, ownerOrganization: { brandingMode: "usam", slug: "usa-missionaries" } }), true, "USAM organization ownership grants access.");
  assertEqual(decideUsamWorkspace({ ...generic, applicationStatus: "pending_review" }), false, "A pending application does not grant access.");
  assertEqual(decideUsamWorkspace({ ...generic, applicationStatus: "archived" }), false, "An archived application does not grant access.");
});

check("The server loader resolves each workspace from its rows", async () => {
  assertEqual(await loadUsamWorkspaceFacts(fakeSupabase(workspaces.generic.tables), workspaces.generic.id), { applicationStatus: null, ownerOrganization: { brandingMode: "affiliate", slug: "partner-church" }, publicProfileLive: false }, "The generic workspace's facts come from its collective and organization rows.");
  assertEqual(await isUsamWorkspaceById(fakeSupabase(workspaces.generic.tables), workspaces.generic.id), false, "The generic workspace is refused.");
  assertEqual(await isUsamWorkspaceById(fakeSupabase(workspaces.unowned.tables), workspaces.unowned.id), false, "An unowned pending applicant is refused; the display-only USAM fallback never counts.");
  assertEqual(await loadUsamWorkspaceFacts(fakeSupabase(workspaces.usamByApplication.tables), workspaces.usamByApplication.id), { applicationStatus: "approved", ownerOrganization: { brandingMode: "affiliate", slug: "partner-church" }, publicProfileLive: false }, "The latest application row outranks the household's stale status.");
  assertEqual(await isUsamWorkspaceById(fakeSupabase(workspaces.usamByApplication.tables), workspaces.usamByApplication.id), true, "The approved-application workspace is allowed.");
  assertEqual(await isUsamWorkspaceById(fakeSupabase(workspaces.usamByOrganization.tables), workspaces.usamByOrganization.id), true, "The USAM-owned workspace is allowed.");
  assertEqual(await isUsamWorkspaceById(fakeSupabase(workspaces.usamByProfile.tables), workspaces.usamByProfile.id), true, "The live-profile workspace is allowed.");
});

check("The server loader never grants access when it cannot read", async () => {
  assertEqual(await loadUsamWorkspaceFacts(fakeSupabase({ ...workspaces.usamByOrganization.tables, missionary_households: { error: { message: "connection reset" } } }), workspaces.usamByOrganization.id), null, "A household read failure yields no facts.");
  assertEqual(await isUsamWorkspaceById(fakeSupabase({ ...workspaces.usamByOrganization.tables, missionary_households: { error: { message: "connection reset" } } }), workspaces.usamByOrganization.id), false, "A household read failure is refusal, not access.");
  assertEqual(await isUsamWorkspaceById(fakeSupabase(workspaces.generic.tables), "99999999-9999-4999-8999-999999999999"), false, "An unknown workspace is refused.");
  assertEqual(await isUsamWorkspaceById(fakeSupabase({ ...workspaces.usamByOrganization.tables, collectives: { error: { message: "relation does not exist" } } }), workspaces.usamByOrganization.id), false, "A missing collectives table counts as no organization, not USAM.");
});

check("A generic workspace cannot persist a gated flow through the API", async () => {
  assertEqual(
    await decideForWorkspace(workspaces.generic, { conversationFlowKey: "kitchen_table_gospel", conversationResponses: kitchenTableResponses }),
    { error: "Kitchen Table Gospel is not available for this workspace.", status: 403 },
    "Kitchen Table is refused with 403 before anything is normalized for storage.",
  );
  assertEqual(
    await decideForWorkspace(workspaces.generic, { conversationFlowKey: "four_questions", conversationResponses: fourQuestionsResponses }),
    { error: "Four Questions is not available for this workspace.", status: 403 },
    "Four Questions is refused for a generic workspace too.",
  );
  assertEqual(
    await decideForWorkspace(workspaces.unowned, { conversationFlowKey: "kitchen_table_gospel", conversationResponses: kitchenTableResponses }),
    { error: "Kitchen Table Gospel is not available for this workspace.", status: 403 },
    "An unowned pending applicant is refused.",
  );
  // Even if a caller could slip past the 403, nothing gated survives
  // normalization without an allowed flow.
  assertEqual(engine.normalizeConversationResponses("none", kitchenTableResponses), {}, "The engine stores no responses for flow none.");
  assertEqual(engine.normalizeConversationFlowKey("kitchen_table_gospel", false), "none", "Without access the gated key normalizes to none.");
});

check("A USAM workspace can create and edit Kitchen Table responses", async () => {
  for (const workspace of [workspaces.usamByApplication, workspaces.usamByOrganization, workspaces.usamByProfile]) {
    const created = await decideForWorkspace(workspace, { conversationFlowKey: "kitchen_table_gospel", conversationResponses: kitchenTableResponses });

    assertEqual(created, {
      conversationFlowKey: "kitchen_table_gospel",
      conversationResponses: {
        believeJesus: "yes",
        spiritualGifts: "yes",
        relationshipWithJesus: 8,
        manifestationGifts: ["faith"],
        fivefoldGifts: ["pastor"],
        faithCommitmentOutcomes: ["rededication"],
      },
      status: 200,
    }, `Create succeeds for ${workspace.id} with invalid gift values dropped and the rest intact.`);

    const edited = await decideForWorkspace(workspace, { conversationFlowKey: "kitchen_table_gospel", conversationResponses: { ...kitchenTableResponses, spiritualGifts: "no" } });

    assertEqual(edited.status, 200, "Edit succeeds.");
    assertEqual(edited.conversationResponses.manifestationGifts, undefined, "Hidden gift answers are removed on edit.");
    assertEqual(edited.conversationResponses.faithCommitmentOutcomes, ["rededication"], "Outcomes survive the edit.");
  }
});

check("Historical Four Questions data stays readable and editable without being offered for capture", async () => {
  assertEqual(
    await decideForWorkspace(workspaces.usamByOrganization, { conversationFlowKey: "four_questions", conversationResponses: fourQuestionsResponses }),
    { conversationFlowKey: "four_questions", conversationResponses: { recognizes_problem: "unsure", response_notes: "Kept for the record.", followUpActions: ["wants_prayer"] }, status: 200 },
    "A USAM workspace can still save an existing Four Questions meeting unchanged.",
  );
  assertEqual(engine.normalizeConversationResponses("four_questions", fourQuestionsResponses).response_notes, "Kept for the record.", "Reads normalize Four Questions with gated flows allowed.");

  const client = read("app/dos/app/DosMvpAppClient.tsx");
  const formStart = client.indexOf("function MeetingFormContent(");
  const formEnd = client.indexOf("\nfunction ", formStart + 1);
  const meetingForm = client.slice(formStart, formEnd);

  assert(!meetingForm.includes("four_questions") && !client.includes("ConversationFlowPicker"), "The Log Meeting form must not offer Four Questions or any flow chooser.");
  assert(client.includes("Those responses stay on the record unless you add {rowTitle} here."), "Editing a historical Four Questions meeting must say the data is kept.");
});

check("Requests without a gated flow never pay for the lookup, and unknown flows are refused", async () => {
  assertEqual(engine.conversationFlowRequiresGate("none"), false, "none needs no lookup.");
  assertEqual(engine.conversationFlowRequiresGate(undefined), false, "A missing flow needs no lookup.");
  assertEqual(engine.conversationFlowRequiresGate("bogus"), false, "An unknown flow needs no lookup.");
  assertEqual(engine.conversationFlowRequiresGate("kitchen_table_gospel"), true, "Kitchen Table needs the lookup.");
  assertEqual(engine.conversationFlowRequiresGate("four_questions"), true, "Four Questions needs the lookup.");

  const unreadable = { id: workspaces.generic.id, tables: { missionary_households: { error: { message: "connection reset" } } } };

  assertEqual(await decideForWorkspace(unreadable, { conversationFlowKey: "none", conversationResponses: {} }), { conversationFlowKey: "none", conversationResponses: {}, status: 200 }, "A plain meeting saves even when the organization rows are unreadable.");
  assertEqual(await decideForWorkspace(unreadable, { conversationFlowKey: "kitchen_table_gospel", conversationResponses: kitchenTableResponses }), { error: "Kitchen Table Gospel is not available for this workspace.", status: 403 }, "A gated request with unreadable organization rows is refused, not granted.");
  assertEqual(await decideForWorkspace(workspaces.usamByOrganization, { conversationFlowKey: "bogus", conversationResponses: {} }), { error: "Conversation flow is not available for this workspace.", status: 403 }, "An unknown flow is refused.");
});

check("The meetings route reads workspace state only for gated flows, on both create and edit", () => {
  const route = read("app/api/dos/app/meetings/route.ts");
  const gate = /const allowGatedConversationFlows = conversationFlowRequiresGate\(payload\.conversationFlowKey\)\n\s+\? await isUsamWorkspaceById\(supabase, workspaceId\)\n\s+: false;/g;

  assert((route.match(gate) ?? []).length === 2, "Both POST and PATCH must gate through conversationFlowRequiresGate + isUsamWorkspaceById.");
  assert(route.includes("unavailableConversationFlowResponse(payload.conversationFlowKey, allowGatedConversationFlows)") && route.includes("{ status: 403 }"), "A refused flow must answer 403 before any write.");
  assert(!route.includes("isUsamKitchenTableGospelWorkspace") && !route.includes("/missionaries/${workspace.slug}"), "The route-prefix heuristic must be gone from the meetings API.");
});

let failures = 0;

for (const { name, run } of checks) {
  try {
    await run();
    console.log(`- ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}\n  ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures) {
  console.error(`DOS Kitchen Table USAM boundary behavior: ${failures} check(s) failed.`);
  process.exit(1);
}

console.log(`DOS Kitchen Table USAM boundary behavior checks passed (${checks.length}).`);
