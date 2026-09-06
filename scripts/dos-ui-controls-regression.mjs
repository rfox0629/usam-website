// DOS shared UI controls regression (USA-213).
//
// Protects: (1) the legacy controls were moved out of DosMvpAppClient.tsx as a
// pure move and the client imports them; (2) the spec §3 controls keep their
// contracts (tokens only, no blur, pill-rail semantics and hit areas, status
// tones, row and card grammar); (3) the single component root re-exports the
// two components that still live under components/dos/.
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const client = read("app/dos/app/DosMvpAppClient.tsx");
const legacy = read("src/components/dos/ui/legacy-controls.tsx");
const button = read("src/components/dos/ui/Button.tsx");
const header = read("src/components/dos/ui/PageHeader.tsx");
const rail = read("src/components/dos/ui/PillRail.tsx");
const pills = read("src/components/dos/ui/Pills.tsx");
const row = read("src/components/dos/ui/Row.tsx");
const states = read("src/components/dos/ui/States.tsx");
const barrel = read("src/components/dos/ui/index.ts");

// 1. Pure move.
for (const name of ["AppButton", "CompactButton", "TabPageHeader", "SectionHeading", "MoreBackButton", "UserProfileAvatar"]) {
  assert(!client.includes(`function ${name}(`), `The client must not keep a private copy of ${name}.`);
  assert(legacy.includes(`export function ${name}(`), `legacy-controls.tsx must export ${name}.`);
}
assert(!client.includes("type ButtonTone ="), "ButtonTone lives with AppButton now.");
assert(legacy.includes('export type ButtonTone = "black" | "soft" | "white";'), "ButtonTone is unchanged.");
assert(client.includes('from "@/src/components/dos/ui/legacy-controls"'), "The client imports the moved controls.");
assert(legacy.includes("bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)]"), "AppButton's primary gradient is unchanged (screens render as before).");

// 2. Spec controls: tokens only, no blur, no retired light-gray text.
for (const [label, source] of [["Button", button], ["PageHeader", header], ["PillRail", rail], ["Pills", pills], ["Row", row], ["States", states]]) {
  assert(!/#[0-9A-Fa-f]{6}\b/.test(source), `${label} uses tokens, not hex literals.`);
  assert(!source.includes("backdrop-blur"), `${label} has no translucent blur chrome.`);
  assert(!/text-\[(8|9|10|11)px\]/.test(source), `${label} renders nothing readable below 12px.`);
}

// Button: 48px primary, five variants, compact 36px.
assert(button.includes('primary: "bg-dos-blue text-white'), "Primary is the blue fill.");
assert(button.includes('danger: "text-dos-red'), "Danger is red text, never a red fill.");
assert(!/danger: "bg-dos-red/.test(button), "Danger must not be filled.");
assert(button.includes('compact ? "h-9 px-3.5 text-dos-label" : "h-12 px-[18px] text-dos-body"'), "48px default, 36px compact.");

// PageHeader + Eyebrow.
assert(header.includes('className="mt-1 text-dos-display text-dos-primary"'), "The title uses the display size.");
assert(header.includes("h-11 w-11"), "The back button has a 44px hit area.");
assert(header.includes('tone === "section" ? "text-dos-eyebrowSection" : "text-dos-eyebrow"'), "Section eyebrows are blue; sub-eyebrows grey.");
assert(header.includes("text-dos-eyebrow uppercase"), "Eyebrows are the only uppercase text.");

// PillRail: tablist semantics, 44px hit area around a 36px pill, active filled blue, fade, scroll-into-view.
assert(rail.includes('role="tablist"') && rail.includes('role="tab"') && rail.includes("aria-selected={selected}"), "PillRail is a tablist.");
assert(rail.includes("flex h-11 shrink-0") && rail.includes("flex h-9 items-center rounded-dos-3 border px-[15px] text-dos-label"), "44px hit area around a 36px, 15px-padded pill.");
assert(rail.includes('selected ? "border-dos-blue bg-dos-blue text-white"'), "The active pill is filled blue with white text.");
/* USA-233: the rail scrolls itself horizontally (`scrollBy`) instead of `scrollIntoView`, which also scrolled ancestors vertically. */
assert(rail.includes("overflow-x-auto") && rail.includes("rail.scrollBy({ left:") && !rail.includes("scrollIntoView"), "Native horizontal scroll; the selected pill scrolls into view without moving the page.");
assert(rail.includes("bg-gradient-to-l from-white to-transparent"), "Right-edge fade.");
assert(!rail.includes("truncate\"") || rail.indexOf("function Segmented") < rail.indexOf('truncate"'), "Pill labels never truncate.");
assert(rail.includes("bg-dos-surface2 p-1") && rail.includes("aria-pressed={selected}"), "Segmented: surface-2 track, 4px padding, pressed state.");

// StatusPill: five tones on tokens, 20px, capped width, not a control.
for (const tone of ['grey: "bg-dos-surface2 text-dos-secondary"', 'blue: "bg-dos-blue50 text-dos-blueText"', 'amber: "bg-dos-amberBg text-dos-amber"', 'green: "bg-dos-greenBg text-dos-green"', 'red: "bg-dos-redBg text-dos-red"']) {
  assert(pills.includes(tone), `StatusPill tone missing: ${tone}`);
}
assert(pills.includes("h-5 max-w-[100px]") && pills.includes("text-dos-pill"), "StatusPill is 20px, capped at 100px, 12/600.");
assert(!/<button/.test(pills.slice(pills.indexOf("export function StatusPill"), pills.indexOf("export function Avatar"))), "A status pill is not a control.");
assert(pills.includes("ring-2 ring-dos-amber"), "Avatar carries the amber overdue ring.");

// Row and Card grammar.
assert(row.includes("border-t border-dos-line py-3") && row.includes("first:border-t-0"), "Rows are hairline-separated with 12px padding.");
assert(row.includes("text-dos-body font-semibold text-dos-primary") && row.includes("text-dos-meta text-dos-secondary"), "Row lines use the ladder.");
assert(row.includes("rounded-dos-2 border border-dos-line bg-white px-4 py-3.5"), "Card: r2, hairline, 14/16 padding.");

// Empty state and search.
assert(states.includes("children: string") && !states.includes("<svg") && !states.includes("<img"), "Empty state is one sentence, no illustration.");
assert(states.includes('type="search"') && states.includes("h-12") && states.includes('aria-label="Clear search"'), "Search field is 48px with a clear control.");

// Barrel and component root.
for (const name of ["Button", "PageHeader", "Eyebrow", "PillRail", "Segmented", "StatusPill", "Avatar", "IconTile", "Row", "Card", "EmptyState", "SearchField"]) {
  assert(barrel.includes(name), `ui/index.ts must export ${name}.`);
}
assert(read("src/components/dos/DosCircleTarget.ts").includes('from "@/components/dos/DosCircleTarget"'), "Single component root re-exports the circle target.");
assert(read("src/components/dos/DosTargetLoader.ts").includes('from "@/components/dos/DosTargetLoader"'), "Single component root re-exports the loader.");

console.log("DOS UI controls regression passed.");
