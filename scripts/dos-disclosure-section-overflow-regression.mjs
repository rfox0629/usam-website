import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// USA-211 moved DisclosureSection into the shared form primitives; the assertions are unchanged.
const appClient = read("src/components/dos/forms/FormPrimitives.tsx");
const fnStart = appClient.indexOf("function DisclosureSection(");
const fnEnd = appClient.indexOf("\nexport function StickyFormFooter(", fnStart);
const fnBlock = appClient.slice(fnStart, fnEnd);

assert(fnStart !== -1 && fnEnd !== -1, "DisclosureSection must exist in FormPrimitives.tsx.");

assert(
  !fnBlock.includes('<section className="overflow-hidden'),
  "DisclosureSection's outer <section> must not use overflow-hidden. " +
  "(Regression guard: overflow-hidden here clips any absolutely-positioned dropdown a child renders " +
  "-- e.g. Engagement Level, Discipleship Role Visibility, Discipleship Relationship, and the Schedule " +
  "Meeting Discipleship Role picker all render their option list as a `position: absolute` panel, which " +
  "was invisible/cut off when nested inside this container. Found and reported in production.)",
);

assert(
  fnBlock.includes("rounded-t-[20px]") && fnBlock.includes('isOpen ? "" : "rounded-b-[20px]"') && fnBlock.includes("rounded-b-[20px]"),
  "DisclosureSection must apply rounded corners directly to its header/content instead of relying on overflow-hidden clipping, so removing overflow-hidden doesn't leave square corners peeking out.",
);

console.log("DOS DisclosureSection overflow regression passed.");
