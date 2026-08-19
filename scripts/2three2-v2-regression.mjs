import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Guards the /2three2-v2 founder preview.
 *
 * V2 is a second design direction that must sit alongside V1 rather than
 * replace it, so this checks both that V2 holds its own constraints and that V1
 * is still present and intact. V1 has its own guard in
 * scripts/2three2-preview-regression.mjs, which this does not duplicate.
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const V1_DIR = "app/2three2-v1";
const V2_DIR = "app/2three2-v2";

function readDir(dir) {
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
      .map((f) => [f, readFileSync(path.join(dir, f), "utf8")]),
  );
}

const v2Root = readDir(V2_DIR);
const v2Race = readDir(path.join(V2_DIR, "race"));
const all = [...Object.values(v2Root), ...Object.values(v2Race)].join("\n");

const page = v2Root["page.tsx"];
const main = v2Root["Two3TwoV2Page.tsx"];
const photo = v2Root["Photo.tsx"];
const chrome = v2Root["Chrome.tsx"];
const racePage = v2Race["page.tsx"];
const race = v2Race["RaceV2Page.tsx"];

/* ------------------------------------------------------------ V1 preserved */

for (const f of ["page.tsx", "Two3TwoPage.tsx", "KitSpec.tsx", "primitives.tsx", "theme.ts"]) {
  assert(existsSync(path.join(V1_DIR, f)), `V1 must be preserved: ${V1_DIR}/${f} is missing.`);
}
assert(existsSync(path.join(V1_DIR, "race", "page.tsx")), "V1 race route must be preserved.");
const v1Main = readFileSync(path.join(V1_DIR, "Two3TwoPage.tsx"), "utf8");
assert(v1Main.includes("Run. Pray."), "V1 main page content must be intact.");
assert(
  readFileSync(path.join(V1_DIR, "KitSpec.tsx"), "utf8").includes("RESERVED"),
  "V1 flat kit spec must remain for comparison.",
);

/* ---------------------------------------------- isolation from production */

for (const [label, source] of [["/2three2-v2", page], ["/2three2-v2/race", racePage]]) {
  assert(source.includes("index: false"), `${label} must stay noindex.`);
  assert(source.includes("follow: false"), `${label} must stay nofollow.`);
}
for (const navFile of ["components/PrimaryNav.tsx", "components/SiteFooter.tsx", "components/RouteAwareSiteFooter.tsx"]) {
  assert(!readFileSync(navFile, "utf8").includes("2three2-v2"), `${navFile} must not link V2 into production navigation.`);
}
assert(!readFileSync("middleware.ts", "utf8").includes("2three2-v2"), "V2 must not be wired into domain-site routing.");

/* ----------------------------------------------- no backend in this phase */

for (const [needle, label] of [
  ["supabase", "Supabase"],
  ["fetch(", "network calls"],
  ["<form action", "server actions"],
  ["process.env", "runtime configuration"],
]) {
  assert(!all.includes(needle), `V2 must not use ${label} in this phase (found "${needle}").`);
}
assert(!/type="(email|tel|password)"/.test(all), "V2 must not collect contact or sensitive details.");

/* ------------------------------------------------------- honest imagery */

// The founder asked for real sports photography and explicitly ruled out an
// illustration standing in for it. No such photograph exists, so the frame is
// reserved rather than filled. These assertions keep it that way: either a real
// photo, or an openly labelled empty frame. Never a drawing presented as a photo.
assert(photo.includes("ReservedPlate"), "V2 must keep the reserved-photography plate component.");
assert(
  photo.includes("Reserved for commissioned photography"),
  "Reserved frames must say so on their face.",
);
assert(
  race.includes("No photograph of athletes in 2THREE2 kits exists yet"),
  "The race page must state plainly why the centerpiece frame is empty.",
);
assert(
  !/figures|HeroScene|PacelineScene|TriRider/.test(all),
  "V2 must not reintroduce illustrated stand-in people.",
);
// Every image actually rendered must come from the vetted inventory.
const srcs = [...all.matchAll(/src=\{photos\.(\w+)\.src\}/g)].map((m) => m[1]);
assert(srcs.length > 0, "V2 should use real photography where it exists.");
const theme = v2Root["theme.ts"];
for (const key of new Set(srcs)) {
  assert(theme.includes(`${key}: {`), `photos.${key} must be declared in the V2 photo inventory.`);
}

/* ------------------------------------------------------ rendering hazards */

// Tailwind orders `.relative` after `.absolute`, so a component that hardcodes
// `relative` silently overrides a caller's `absolute inset-0`. That collapsed
// the race hero plate to content height and let the page background show through.
assert(
  photo.includes("positionClass"),
  "Photo/ReservedPlate must not hardcode a position class that beats the caller's.",
);

// The condensed header sits on paper, so its contents must flip to dark. Getting
// this backwards rendered the wordmark white on white.
assert(
  chrome.includes('const barTone: "light" | "dark" = overHero ? "dark" : "light";'),
  "SmartHeader must derive its tone from whether it is over the hero.",
);

/* ------------------------------------------------------------- copy rules */

assert(!/—|&mdash;/.test(all), "V2 must not contain em dashes.");
assert(
  !/(movement|master|primary|core) phrase/i.test(all),
  "Do not editorialise about which phrase is the movement's core saying.",
);

// Content the founder asked V2 to carry over from V1.
assert(main.includes("Run. Pray."), "V2 must carry Run. Pray. Pursue.");
assert(race.includes("Race. Pray."), "V2 race page must carry Race. Pray. Pursue.");
assert(main.includes("Physical activity is the environment"), "V2 must carry the environment/purpose line.");
assert(main.includes("Movement creates room for relationship"), "V2 must carry the relationship line.");
assert(main.includes("Pick something hard"), "V2 must carry Pick something hard. Do it with people.");
for (const step of ["Show up", "Move together", "Build trust", "Pray together", "Pursue Jesus", "Live on mission"]) {
  assert(main.includes(step), `V2 progression must include "${step}".`);
}
for (const c of ["Move", "Pray", "Pursue", "Go"]) {
  assert(main.includes(`title: "${c}"`), `V2 must include the "${c}" commitment.`);
}
for (const line of [
  "2THREE2 develops active disciples.",
  "Challenges build awareness.",
  "The Missionary Deployment Fund sends missionaries.",
]) {
  assert(race.includes(line), `V2 must carry the deployment hierarchy line: ${line}`);
}

/* ------------------------------------------------- fundraising guardrails */

assert(!/all proceeds/i.test(all), 'Must not promise "all proceeds" before a fund policy exists.');
assert(
  race.includes("support the USA Missionaries Missionary Deployment Fund"),
  "Must use the approved, non-committal deployment-fund language.",
);
assert(
  !/\b(stripe|paypal|donorbox|givebutter|tithely)\b/i.test(all),
  "V2 must not wire up a payment provider in this phase.",
);
// The phrase may appear once as page copy documenting it as a future option,
// but never inside the kit brief a photographer or vendor would build from.
const kitStart = race.indexOf("Kit photography");
const kitBrief = race.slice(Math.max(0, kitStart - 900), kitStart + 900);
assert(
  !kitBrief.includes("Deploying Missionaries Across America"),
  "Deploying Missionaries Across America must stay out of the kit shot brief in this version.",
);

console.log("2THREE2 V2 regression checks passed.");
