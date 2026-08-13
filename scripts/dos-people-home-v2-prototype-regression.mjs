import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const route = read("app/dos/v2/page.tsx");
const component = read("src/components/dos/v2/PeopleHomeV2Prototype.tsx");
const fixture = read("src/components/dos/v2/fixtureData.ts");

assert.match(route, /PeopleHomeV2Prototype/, "/dos/v2 must render the founder prototype component.");
assert.match(component, /Home V2/, "prototype must include the Home V2 surface.");
assert.match(component, /Meeting Workspace/, "prototype must include the relational meeting workspace.");
assert.match(component, /Quiet Time With God/, "prototype must surface Quiet Time With God accountability.");
assert.match(component, /Purity/, "prototype must demonstrate adding Purity accountability.");
assert.match(component, /Ministry \/ Relationship Report/, "prototype must include the consolidated report.");
assert.match(component, /3 \/ 12 \/ 70 \/ 120/, "prototype must include relationship sphere drill-down.");
assert.match(component, /Unified History/, "prototype must include unified History.");
assert.match(component, /Add Person/, "prototype must include simplified Add Person.");
assert.match(fixture, /Wednesday Men's Group/, "fixture data must surface group context.");
assert.doesNotMatch(component, /supabase/i, "prototype component must not read from or write to Supabase.");
assert.match(fixture, /Mocked \/ assumed/, "fixture data must document mocked calculations and mappings.");
assert.match(fixture, /Lyf/, "fixture data must keep Lyf Nimmo as the golden-path person.");

console.log("dos-people-home-v2-prototype regression passed");
