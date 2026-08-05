import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const page = read("app/dos/v3/page.tsx");
const client = read("app/dos/v3/DosV3PrototypeClient.tsx");
const intake = read("app/dos/v3/AiIntakeFlow.tsx");
const data = read("app/dos/v3/prototype-data.ts");
const ui = read("app/dos/v3/ui.tsx");

// USA-138 Phase 2/3. The prototype exists for founder review; these checks keep
// its safety and workflow guarantees from eroding.

/* -------------------------------------------------- isolation from production */

assert(page.includes("index: false"), "The V3 prototype must stay out of search indexes.");

// Comments in these files explain that the prototype avoids Supabase, so the
// checks below run against code with comments stripped.
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

for (const [label, source] of [
  ["page", page],
  ["client", client],
  ["intake", intake],
  ["data", data],
]) {
  const code = stripComments(source);

  assert(!/supabase/i.test(code), `The V3 prototype ${label} must not reach Supabase; it runs on synthetic data.`);
  assert(!/fetch\(/.test(code), `The V3 prototype ${label} must not call any API; it runs on synthetic data.`);
  assert(!/\/api\//.test(code), `The V3 prototype ${label} must not reference an API route.`);
}

/* ------------------------------------------- Phase 3: nothing saves untouched */

assert(
  intake.includes("NOTHING IS SAVED YET") || intake.includes("Nothing is saved yet"),
  "The intake review step must state that nothing has been saved.",
);
assert(
  intake.includes("disabled={!allAccepted}"),
  "Saving from intake must be blocked until every suggested section is reviewed.",
);
assert(
  /const reviewOrder/.test(intake),
  "The intake review step must enumerate the sections the user has to approve.",
);

for (const required of ["people", "summary", "prayer", "commitments", "nextStep", "scripture", "outcomes", "activity"]) {
  assert(
    new RegExp(`key: "${required}"`).test(intake),
    `The intake review step must ask the user to approve "${required}".`,
  );
}

/* ------------------------------------------------ Phase 3: source-agnostic in */

for (const source of ["recording", "transcript", "paste", "upload", "connected"]) {
  assert(
    new RegExp(`\\b${source}\\b`).test(data),
    `Intake must offer "${source}" as an input source so the flow is not tied to one device.`,
  );
}
assert(
  !/plaud/i.test(client) && !/plaud/i.test(intake) && !/plaud/i.test(data),
  "Intake must stay source-agnostic; no single vendor may be wired into the architecture.",
);

/* --------------------------------------------------------- workflow integrity */

assert(
  client.includes("mentionedIds"),
  "People merely named in notes must be tracked separately from meeting attendees.",
);
assert(
  client.includes("const nextStepOwnerId = capture.personIds[0] ?? null;"),
  "A next step must attach to the person the meeting was about, not to every attendee.",
);
assert(
  client.includes("Also mentioned"),
  "Capture must show mentioned-but-absent people so they are not silently counted as attending.",
);
assert(
  client.includes("Finish this"),
  "Today must let the user resume an unfinished capture.",
);
assert(
  /Every number here comes from meetings you already logged/.test(client),
  "Reporting must be derived from logged meetings rather than re-entered.",
);

/* ------------------------------------------------------- mobile is first-class */

assert(client.includes("md:hidden"), "The prototype must ship a mobile-specific navigation layer.");
assert(client.includes("hidden") && client.includes("md:flex"), "The desktop rail must be desktop-only.");
assert(
  client.includes("env(safe-area-inset-bottom)"),
  "Mobile navigation must respect the device safe area.",
);
assert(
  /min-h-1[12]/.test(ui.match(/const sizes = \{[\s\S]*?\} as const;/)?.[0] ?? ""),
  "Primary controls must keep comfortable touch targets.",
);

/* ---------------------------------------------------------------- readability */

// app/globals.css sets a light default color on bare h1-h6/p/li/label for the
// dark marketing site, so anything on the prototype's white surfaces needs an
// explicit color class or it renders nearly invisible.
for (const [label, source] of [
  ["client", client],
  ["intake", intake],
  ["ui", ui],
]) {
  const bareText = source.match(/<(?:p|h1|h2|h3|label)(?![a-zA-Z])(?![^>]*(?:className|\{))/g);

  assert(
    !bareText,
    `The V3 ${label} must give every text element an explicit color class (found ${bareText?.length} without one).`,
  );
}

console.log("DOS V3 prototype regression passed.");
