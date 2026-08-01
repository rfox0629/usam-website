import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Guards the /2three2-v1 founder preview.
 *
 * This route is a design mockup with hard constraints from USA-145: it must stay
 * isolated from production (no navigation entry, no indexing, no backend), it
 * must not make fundraising promises that no policy backs yet, and it must keep
 * the first-mockup kit restraint the founder asked for. Those are all things a
 * later edit could quietly undo, so they are asserted here.
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const ROUTE_DIR = "app/2three2-v1";

const routeFiles = readdirSync(ROUTE_DIR).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));
const sources = Object.fromEntries(
  routeFiles.map((f) => [f, readFileSync(path.join(ROUTE_DIR, f), "utf8")]),
);
const allSource = Object.values(sources).join("\n");

const page = sources["page.tsx"];
const client = sources["Two3TwoPage.tsx"];
const ironman = sources["IronmanVisual.tsx"];
const hero = sources["HeroScene.tsx"];
const primitives = sources["primitives.tsx"];

/* ---------------------------------------------- isolation from production */

assert(page.includes("index: false"), "Founder preview must stay noindex.");
assert(page.includes("follow: false"), "Founder preview must stay nofollow.");

for (const navFile of ["components/PrimaryNav.tsx", "components/SiteFooter.tsx", "components/RouteAwareSiteFooter.tsx"]) {
  const nav = readFileSync(navFile, "utf8");
  assert(!nav.includes("2three2-v1"), `${navFile} must not link the founder preview into production navigation.`);
}

const middleware = readFileSync("middleware.ts", "utf8");
assert(!middleware.includes("2three2-v1"), "Founder preview must not be wired into domain-site routing.");

/* ----------------------------------------------- no backend in this phase */

const forbiddenIntegrations = [
  ["supabase", "Supabase"],
  ["fetch(", "network calls"],
  ["useRouter", "router-driven submission"],
  ["<form action", "server actions"],
  ["process.env", "runtime configuration"],
];
for (const [needle, label] of forbiddenIntegrations) {
  assert(!allSource.includes(needle), `Founder preview must not use ${label} in this phase (found "${needle}").`);
}
assert(
  client.includes("event.preventDefault()"),
  "The interest-form concept must swallow its submit so the preview never posts anywhere.",
);

/* ----------------------------------------------------- brand and language */

// Comments are stripped first so the rule reads only what ships to the page,
// and the delimiters keep SVG path coordinates (e.g. "L232,45") out of scope.
const withoutComments = allSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
assert(
  !/(^|[\s">(])232([\s"<.,)]|$)/.test(withoutComments),
  'Public brand name must always be "2THREE2", never "232".',
);
assert(client.includes("Run. Pray."), "Hero must carry the movement phrase Run. Pray. Pursue.");
assert(client.includes("Race. Pray. Pursue."), "Ironman section must carry the campaign phrase.");
assert(client.includes("2 Timothy 2:22"), "2 Timothy 2:22 must be present as the Scriptural foundation.");
assert(
  client.includes("https://usamissionaries.org") || primitives.includes("https://usamissionaries.org"),
  "Powered by USA Missionaries must link to usamissionaries.org.",
);
assert(client.includes("https://kitchentablegospel.org"), "Kitchen Table Gospel connection must be present.");

/* ------------------------------------------------- fundraising guardrails */

assert(!/all proceeds/i.test(allSource), 'Must not promise "all proceeds" before a fund policy exists.');
assert(
  client.includes("support the USA Missionaries Missionary Deployment Fund"),
  "Must use the approved, non-committal deployment-fund language.",
);
// Checked as mechanisms, not as words: the page deliberately *names* donation
// processing and progress meters in order to say it has none of them.
assert(
  !/\b(stripe|paypal|donorbox|givebutter|tithely)\b/i.test(withoutComments),
  "Founder preview must not wire up a payment provider in this phase.",
);
assert(
  !/href="[^"]*\/(donate|give|checkout|campaign)/i.test(withoutComments),
  "Founder preview must not link out to donation or checkout flows.",
);
assert(
  !/type="(email|tel|password)"/.test(withoutComments),
  "The concept form must not collect contact or sensitive details while there is no backend to hold them.",
);

/* --------------------------------------------- first-mockup kit restraint */

const kitDrawing = ironman.slice(ironman.indexOf("const JERSEY_BODY"), ironman.indexOf("export function KitSpec"));
assert(
  !kitDrawing.includes("Deploying Missionaries Across America"),
  "First mockup must keep 'Deploying Missionaries Across America' OFF the kit artwork.",
);
assert(kitDrawing.includes("RESERVED"), "The reserved lower-back zone must stay documented on the kit spec.");
assert(kitDrawing.includes("POWERED BY USA MISSIONARIES"), "Kit must carry the small Powered by USA Missionaries mark.");
assert(
  ironman.includes("Invented names") || client.includes("Invented names"),
  "Sponsor marks must be labelled as invented placeholders.",
);

/* ------------------------------------------------------ rendering hazards */

// Both illustrated scenes render twice (one instance per breakpoint). Shared
// SVG paint-server ids resolve to the first match in the document — the hidden
// copy — which silently blanks every gradient-filled shape.
for (const [file, source] of [["IronmanVisual.tsx", ironman], ["HeroScene.tsx", hero]]) {
  assert(source.includes("useId()"), `${file} must namespace its SVG gradient ids per instance.`);
  assert(
    !/ id="(t2|tri)-/.test(source),
    `${file} must not declare static SVG paint-server ids; they collide between breakpoints.`,
  );
}

// app/globals.css sets `:where(p, li, dd) { color: #d1d5db }`, which beats an
// inherited colour and made light-band body copy invisible on cream.
assert(
  primitives.includes("<p\n          className=\"mt-5 text-base leading-relaxed md:text-lg\""),
  "SectionHeading must style its own <p> so light-band copy survives the global paragraph colour.",
);
assert(
  !/<SectionHeading[^>]*>\s*<p>/.test(client),
  "SectionHeading body copy must be passed as text, not wrapped in an unstyled <p>.",
);

console.log("2THREE2 founder-preview regression checks passed.");
