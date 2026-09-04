// DOS design tokens regression (USA-208).
//
// The canonical token values live in docs/dos-ui-refresh/phase-3/dos-ui-canonical-spec.md §2
// and are implemented twice on purpose: as Tailwind theme entries (utility classes) and as
// constants in src/lib/dos/text-tokens.ts (inline styles, SVG). This script asserts that the
// two never drift, that the retired values do not come back as tokens, and that no DOS token
// leaks into the website's global stylesheet.
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const tailwind = read("tailwind.config.js");
const tokens = read("src/lib/dos/text-tokens.ts");
const globals = read("app/globals.css");

const expectedColors = {
  primary: "#0B1220",
  ink: "#0B1220",
  body: "#3D4654",
  secondary: "#5A6473",
  ink2: "#5A6473",
  eyebrow: "#6B7686",
  eyebrowSection: "#2251E8",
  disabled: "#9AA3B2",
  blue: "#2251E8",
  blueText: "#1E3FB8",
  blue50: "#F1F4FF",
  blue100: "#E4EAFF",
  line: "#E5E8EF",
  hairline: "#E5E8EF",
  rule: "#E5E8EF",
  surface2: "#F7F8FB",
  band: "#F7F8FB",
  amber: "#B45309",
  amberBg: "#FDF0D5",
  green: "#047857",
  greenBg: "#DCF5E9",
  red: "#B91C1C",
  redBg: "#FDE8E8",
};

const dosBlock = tailwind.slice(tailwind.indexOf("dos: {"), tailwind.indexOf("fontSize:"));
assert(dosBlock.length > 0, "tailwind.config.js must define theme.extend.colors.dos before fontSize.");

for (const [name, value] of Object.entries(expectedColors)) {
  assert(
    new RegExp(`\\b${name}: "${value}"`).test(dosBlock),
    `tailwind.config.js colors.dos.${name} must be ${value}.`,
  );
}

// text-tokens.ts mirrors the same values under its own groupings.
const mirrored = {
  "dosText.primary": ["primary", expectedColors.primary],
  "dosText.body": ["body", expectedColors.body],
  "dosText.secondary": ["secondary", expectedColors.secondary],
  "dosText.eyebrow": ["eyebrow", expectedColors.eyebrow],
  "dosText.eyebrowSection": ["eyebrowSection", expectedColors.eyebrowSection],
  "dosText.disabled": ["disabled", expectedColors.disabled],
  "dosSurface.hairline": ["hairline", expectedColors.hairline],
  "dosSurface.rule": ["rule", expectedColors.rule],
  "dosSurface.band": ["band", expectedColors.band],
  "dosSurface.blue": ["blue", expectedColors.blue],
  "dosSurface.blueText": ["blueText", expectedColors.blueText],
  "dosSurface.blue50": ["blue50", expectedColors.blue50],
  "dosSurface.blue100": ["blue100", expectedColors.blue100],
  "dosStatus.amber": ["amber", expectedColors.amber],
  "dosStatus.amberBg": ["amberBg", expectedColors.amberBg],
  "dosStatus.green": ["green", expectedColors.green],
  "dosStatus.greenBg": ["greenBg", expectedColors.greenBg],
  "dosStatus.red": ["red", expectedColors.red],
  "dosStatus.redBg": ["redBg", expectedColors.redBg],
};

for (const [label, [key, value]] of Object.entries(mirrored)) {
  assert(new RegExp(`\\b${key}: "${value}"`).test(tokens), `${label} in text-tokens.ts must be ${value}.`);
}

// Retired values must not be re-registered as tokens (they may still exist as
// one-off literals until the screen that uses them is refreshed).
for (const retired of ["#0F1520", "#2450C8", "#B4BBC5", "#E7E9ED", "#EDEFF2", "#F6F9FE", "#94A3B8", "#CBD5E1", "#2563EB", "#1D4ED8", "#0F172A", "#64748B"]) {
  assert(!dosBlock.includes(retired), `Retired value ${retired} must not be a DOS token.`);
  assert(!tokens.includes(`"${retired}"`), `Retired value ${retired} must not be in text-tokens.ts.`);
}

// Type scale, radii, elevation, clearance, z-index ladder.
for (const needle of [
  '"dos-display": ["30px"',
  '"dos-title": ["26px"',
  '"dos-heading": ["20px"',
  '"dos-question": ["17px"',
  '"dos-body": ["15px"',
  '"dos-label": ["13.5px"',
  '"dos-meta": ["12.5px"',
  '"dos-eyebrow": ["11.5px"',
  '"dos-pill": ["12px"',
  '"dos-1": "12px"',
  '"dos-2": "20px"',
  '"dos-3": "999px"',
  '"dos-float":',
  '"dos-nav-clearance": "calc(env(safe-area-inset-bottom) + 100px)"',
  '"dos-nav": "30"',
  '"dos-fab": "10"',
  '"dos-sheet": "1000"',
  '"dos-dialog": "1100"',
]) {
  assert(tailwind.includes(needle), `tailwind.config.js must define ${needle}.`);
}

assert(tokens.includes("navClearance: 100"), "dosLayout.navClearance must be 100 (70 + 14 + 16).");
assert(tokens.includes("hitArea: 44"), "dosLayout.hitArea must be 44.");

// DOS tokens never live in the website's global stylesheet.
assert(!/--dos-/.test(globals) && !/\.dos-/.test(globals), "app/globals.css must not define DOS tokens or classes.");

// Every token utility that existing screens rely on must still resolve to a name
// (the USA-168 surfaces use these class names; values are allowed to change, names are not).
for (const name of ["primary", "body", "secondary", "eyebrow", "disabled", "blue", "hairline", "rule", "band"]) {
  assert(new RegExp(`\\b${name}:`).test(dosBlock), `Existing token name dos.${name} must be preserved.`);
}

console.log("DOS design tokens regression passed.");
