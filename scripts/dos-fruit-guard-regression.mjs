import { readFileSync } from "node:fs";

const files = {
  fruitRoute: "app/api/dos/app/fruit/route.ts",
  intelligence: "src/lib/dos/fruit-intelligence.ts",
  meetingsRoute: "app/api/dos/app/meetings/route.ts",
  peopleRoute: "app/api/dos/app/people/route.ts",
};

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const peopleRoute = read(files.peopleRoute);
const meetingsRoute = read(files.meetingsRoute);
const intelligence = read(files.intelligence);
const fruitRoute = read(files.fruitRoute);

for (const [label, source] of [
  [files.peopleRoute, peopleRoute],
  [files.meetingsRoute, meetingsRoute],
]) {
  assert(
    !source.includes("inferFruitEventsFromEngagement"),
    `${label} must not infer fruit from passive person or meeting engagement.`,
  );
}

assert(
  !intelligence.includes("export async function inferFruitEventsFromEngagement"),
  "Fruit intelligence must not expose passive engagement fruit creation.",
);
assert(
  !intelligence.includes("engagement_pattern"),
  "Fruit intelligence must not create engagement-pattern fruit.",
);
assert(
  !intelligence.includes('title: "Church Engagement"'),
  "Fruit intelligence must not auto-create Church Engagement fruit.",
);

for (const action of ["leader_review", "quick_review", "record_fruit", "testimony_review"]) {
  assert(
    intelligence.includes(`"${action}"`),
    `Fruit intelligence must keep explicit source action ${action}.`,
  );
}

assert(
  fruitRoute.includes('source_app: "record_fruit"'),
  "Record Fruit route must mark manual fruit with source_app record_fruit.",
);

console.log("DOS fruit guard regression passed.");
