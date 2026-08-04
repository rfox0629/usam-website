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

function readDir(dir) {
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
      .map((f) => [f, readFileSync(path.join(dir, f), "utf8")]),
  );
}

const sources = readDir(ROUTE_DIR);
const raceSources = readDir(path.join(ROUTE_DIR, "race"));
const allSource = [...Object.values(sources), ...Object.values(raceSources)].join("\n");

const page = sources["page.tsx"];
const client = sources["Two3TwoPage.tsx"];
const kit = sources["KitSpec.tsx"];
const primitives = sources["primitives.tsx"];
const racePage = raceSources["page.tsx"];
const race = raceSources["RacePage.tsx"];

/* ---------------------------------------------- isolation from production */

for (const [label, source] of [["/2three2-v1", page], ["/2three2-v1/race", racePage]]) {
  assert(source.includes("index: false"), `${label} must stay noindex.`);
  assert(source.includes("follow: false"), `${label} must stay nofollow.`);
}

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
assert(race.includes("Race. Pray. Pursue."), "Race page must carry the campaign phrase.");
assert(
  !client.includes("Race. Pray. Pursue."),
  "The campaign phrase belongs on the race page, not the main vision page.",
);
// The founder asked that the page stop explaining which phrase is the primary
// one. The phrases should simply be used where they belong.
assert(
  !/(movement|master|primary|core) phrase/i.test(allSource),
  "Do not editorialise about which phrase is the movement's core saying.",
);
assert(client.includes("2 Timothy 2:22"), "2 Timothy 2:22 must be present as the Scriptural foundation.");
assert(
  client.includes("https://usamissionaries.org") || primitives.includes("https://usamissionaries.org"),
  "Powered by USA Missionaries must link to usamissionaries.org.",
);
assert(client.includes("https://kitchentablegospel.org"), "Kitchen Table Gospel connection must be present.");

/* ------------------------------------------------- fundraising guardrails */

assert(!/all proceeds/i.test(allSource), 'Must not promise "all proceeds" before a fund policy exists.');
assert(
  race.includes("support the USA Missionaries Missionary Deployment Fund"),
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

const kitDrawing = kit.slice(kit.indexOf("const JERSEY_BODY"), kit.indexOf("export function KitSpec"));
assert(
  !kitDrawing.includes("Deploying Missionaries Across America"),
  "First mockup must keep 'Deploying Missionaries Across America' OFF the kit artwork.",
);
assert(kitDrawing.includes("RESERVED"), "The reserved lower-back zone must stay documented on the kit spec.");
assert(kitDrawing.includes("POWERED BY USA MISSIONARIES"), "Kit must carry the small Powered by USA Missionaries mark.");
assert(race.includes("Invented names"), "Sponsor marks must be labelled as invented placeholders.");

/* ------------------------------------------------------ rendering hazards */

// app/globals.css sets `:where(p, li, dd) { color: #d1d5db }`, which beats an
// inherited colour and made light-band body copy invisible on cream.
assert(
  primitives.includes("<p\n          className=\"mt-5 text-base leading-relaxed md:text-lg\""),
  "SectionHeading must style its own <p> so light-band copy survives the global paragraph colour.",
);
for (const [label, source] of [["Two3TwoPage.tsx", client], ["RacePage.tsx", race]]) {
  assert(
    !/<SectionHeading[^>]*>\s*<p>/.test(source),
    `${label}: SectionHeading body copy must be passed as text, not wrapped in an unstyled <p>.`,
  );
}

/* ------------------------------------------------------------- copy rules */

// The founder asked for no em dashes anywhere in this route.
assert(
  !/\u2014|&mdash;/.test(allSource),
  "This route must not contain em dashes, in copy or in source.",
);

// Invented people were removed at the founder's direction: the page uses real
// ministry photography or nothing at all.
assert(
  !allSource.includes("figures") && !allSource.includes("HeroScene") && !allSource.includes("PacelineScene"),
  "Illustrated stand-in people must not come back; use real photography or no people.",
);
assert(
  client.includes("/images/vision/group-prayer-01.jpg"),
  "The hero should use real ministry photography.",
);

/* ------------------------------------------------------------ vision page */

assert(client.includes("What this is"), "The main page must state plainly what 2THREE2 is.");
assert(client.includes("What this is not"), "The main page must state plainly what 2THREE2 is not.");
assert(
  client.includes("Physical activity is the environment"),
  "The main page must lead with the vision, not the activity.",
);
assert(client.includes("/2three2-v1/race"), "The main page must link to the race page.");

/* -------------------------------------------------------------- race page */

for (const ref of ["1 Corinthians 9", "Hebrews 12:1", "1 Timothy 4", "2 Timothy 4:7"]) {
  assert(race.includes(ref), `Race page must tie in ${ref}.`);
}
assert(race.includes("train together"), "Race page must carry the train-together idea.");

console.log("2THREE2 founder-preview regression checks passed.");
