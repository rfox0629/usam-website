import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const client = readFileSync("app/dos/app/DosMvpAppClient.tsx", "utf8");
const groupsRoute = readFileSync("app/groups/[slug]/page.tsx", "utf8");

assert(client.includes("label: \"My Record\""), "Desktop nav must keep My Record visible.");
assert(client.includes("label: \"Groups\"") && client.includes("value: \"groups\""), "DOS nav/app launcher must keep Groups visible.");
assert(client.includes("function GroupsWorkspace") && client.includes("/groups/2three2"), "Groups workspace must link to the 2three2 route.");
assert(groupsRoute.includes("2three2") && groupsRoute.includes("notFound"), "Groups route must serve 2three2 and reject unknown groups.");

console.log("DOS Groups regression checks passed.");
