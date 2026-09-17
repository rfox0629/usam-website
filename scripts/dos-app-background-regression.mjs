// DOS app background consistency.
//
// The reported fault: a Person record (Tanner Kent) sat on a blue/lavender
// gradient while every other DOS screen carried the shell's warm pass in its
// lower corner, so the record read as a different surface from the rest of the
// app.
//
// The cause was a second background. The Person overlay declared its own
// `dosPersonAtmosphereClassName` -- deliberately "blue and violet only, the
// shell's warm pass left out" -- instead of the background the shell paints.
// Two definitions meant two appearances.
//
// What must hold now: ONE definition of the DOS app background, painted by the
// shell and by every surface that overlays another screen, with no
// record-specific gradient, tint or variant anywhere.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../app/dos/app/DosMvpAppClient.tsx", import.meta.url), "utf8");

// 1. One background, composed from the opaque base plus the shell's passes.
assert(
  client.includes('const dosSurfaceBaseClassName = "bg-white md:bg-[#F8FBFF]";'),
  "The opaque surface base must be named once.",
);
assert(
  client.includes("const dosAppBackgroundClassName = `${dosSurfaceBaseClassName} ${dosDawnShellClassName}`;"),
  "The DOS app background must be the shared base plus the shared decorative passes.",
);

// 2. The Person-specific variant is gone, and nothing has replaced it.
assert(
  !client.includes("dosPersonAtmosphereClassName"),
  "The Person-specific background variant must not exist.",
);
assert(
  !/rgba\(221,214,254,0\.4\)|#EEF3FF|linear-gradient\(140deg/.test(client),
  "The Person variant's own gradient stops must not survive anywhere in the client.",
);

// 3. Every gradient background in the client comes from the one dawn constant.
//    A second `radial-gradient` background string would be a new variant.
const gradientBackgrounds = client.match(/const \w+ = "bg-\[radial-gradient/g) ?? [];
assert.equal(
  gradientBackgrounds.length,
  1,
  `Exactly one gradient background may be declared; found ${gradientBackgrounds.length}.`,
);

// 4. The shell and both overlay surfaces paint that one background.
assert(
  client.includes("<div ref={appShellRef} className={`${dosPhoneShellClassName} ${dosAppBackgroundClassName}`}>"),
  "The app shell must paint the shared background.",
);
const overlayUses = client.match(/absolute inset-0 overflow-y-auto px-4 pt-7[^`]*\$\{dosAppBackgroundClassName\}/g) ?? [];
const conceptOverlayUses = client.match(/conceptMode \? `\$\{dosAppBackgroundClassName\}/g) ?? [];
assert.equal(
  overlayUses.length + conceptOverlayUses.length,
  2,
  "Both overlay surfaces -- the Person record and My Record -- must paint the shared background.",
);

// 5. The shell must not carry its own opaque background any more; it takes the
//    base from the shared constant, so there is a single place to change it.
const phoneShell = client.match(/const dosPhoneShellClassName = "([^"]*)"/)?.[1] ?? "";
assert(
  phoneShell && !/\bbg-white\b|\bmd:bg-\[#F8FBFF\]/.test(phoneShell),
  "The phone shell must take its background from the shared constant, not restate it.",
);

// 6. The white cards, blue actions and typography are untouched by this fix:
//    the surfaces still place content on white sections.
assert(
  client.includes("md:rounded-[32px] md:border md:border-[#EAF2FF] md:bg-white"),
  "Record content must still sit on white cards.",
);

console.log("DOS app background consistency regression passed.");
