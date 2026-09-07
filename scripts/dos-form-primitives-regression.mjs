// DOS editable-surface and form-primitive regression (USA-211).
//
// Two things are protected here:
//   1. The overlay primitives and the unsaved-work guard were moved out of
//      DosMvpAppClient.tsx into src/components/dos/overlays/DosSurfaces.tsx as a
//      pure move. The client must import them rather than keep private copies,
//      and the file must keep its function order because other regression
//      scripts slice it by function name.
//   2. The new spec §3 form primitives keep the contracts that make a form safe
//      without per-form wiring: every value-holding control is readable by the
//      guard, the sticky primary never disables for validation, and the stepper
//      has no ceiling.
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
const surfaces = read("src/components/dos/overlays/DosSurfaces.tsx");
const formPrimitives = read("src/components/dos/forms/FormPrimitives.tsx");
const optionSelect = read("src/components/dos/forms/OptionSelect.tsx");
const icon = read("src/components/dos/Icon.tsx");
const primitives = read("src/components/dos/forms/primitives.tsx");

// 1. Pure move: no private copies remain in the client.
for (const name of [
  "function Sheet(",
  "function MobileBottomSheet(",
  "function DosWorkflowPage(",
  "function DiscardChangesDialog(",
  "function useUnsavedWorkGuard(",
  "function readSurfaceValues(",
  "function FieldLabel(",
  "function DosFormSection(",
  "function DosFormField(",
  "function DisclosureSection(",
  "function StickyFormFooter(",
  "function CompactOptionSelect(",
  "function FormOptionSelect(",
  "function Icon(",
]) {
  assert(!client.includes(name), `The client must not keep a private copy: ${name}`);
}

assert(client.includes('from "@/src/components/dos/overlays/DosSurfaces"'), "The client imports the shared overlay primitives.");
assert(client.includes('from "@/src/components/dos/forms/FormPrimitives"'), "The client imports the shared form primitives.");
assert(client.includes('from "@/src/components/dos/forms/OptionSelect"'), "The client imports the shared option selects.");
assert(client.includes('from "@/src/components/dos/Icon"'), "The client imports the shared icon set.");

// The shared files export what the client used to define, in the original order.
const order = ["function DosWorkflowPage(", "function DiscardChangesDialog(", "function useUnsavedWorkGuard(", "function readSurfaceValues(", "function Sheet(", "function MobileBottomSheet("];
let last = -1;
for (const name of order) {
  const at = surfaces.indexOf(`export ${name}`);
  assert(at > last, `DosSurfaces.tsx must export ${name} after the previous primitive (scripts slice by order).`);
  last = at;
}
for (const name of ["FieldLabel", "FieldInputClass", "FieldSelectClass", "FieldTextareaClass", "DosFormSection", "DosFormField", "DosFormGrid", "RequiredMark", "OptionalTag", "DisclosureSection", "FormMessage", "StickyFormFooter"]) {
  assert(formPrimitives.includes(`export function ${name}(`), `FormPrimitives.tsx must export ${name}.`);
}
assert(optionSelect.includes("export function CompactOptionSelect(") && optionSelect.includes("export function FormOptionSelect("), "OptionSelect.tsx exports both selects.");
assert(icon.includes("export type IconName =") && icon.includes("export function Icon("), "Icon.tsx exports the icon set and its name type.");
for (const nav of ['case "home":', 'case "meetings":', 'case "apps":']) {
  assert(icon.includes(nav), `The protected navigation icon ${nav} must still be drawn by the shared Icon.`);
}

// The guard contract survived the move byte-for-byte in the parts that matter.
const sheet = surfaces.slice(surfaces.indexOf("function Sheet("), surfaces.indexOf("function MobileBottomSheet("));
assert(sheet.includes("onMouseDown={backdropMayDismiss(kind) ? onClose : undefined}"), "An editable sheet's backdrop stays inert.");
assert(sheet.includes("readSurfaceValues(panelRef.current)"), "Dirtiness is still read from the rendered controls.");
assert(/kind = "inspection"/.test(sheet), "Inspection stays the default.");

// 2. New primitives keep the safety contracts.
for (const name of ["HelperLine", "fieldControlClass", "Field", "Stepper", "Chip", "ChipGroup", "ToggleRow", "StickyPrimary"]) {
  assert(primitives.includes(`export function ${name}(`), `primitives.tsx must export ${name}.`);
}

const stepper = primitives.slice(primitives.indexOf("export function Stepper("), primitives.indexOf("export function Chip("));
assert(!/\bmax\b\s*[:=]/.test(stepper), "The stepper has no ceiling; thresholds belong to the caller.");
assert(stepper.includes('type="hidden"'), "The stepper mirrors its value into a form control so the guard and FormData see it.");
assert(/h-full w-\[52px\]/.test(stepper), "Stepper end controls keep a generous 52px hit area.");
assert(stepper.includes("bg-dos-blue50") && stepper.includes("border-r border-dos-line") && stepper.includes("border-l border-dos-line"), "Stepper minus and plus controls keep their blue-tinted, divided end regions.");
assert(stepper.includes('className="flex h-12 w-full'), "The stepper spans the form width instead of shrinking around its contents.");
assert(stepper.includes("min-w-0 flex-1 text-center"), "The stepper value owns the remaining width between equal controls.");

const chip = primitives.slice(primitives.indexOf("export function Chip("), primitives.indexOf("export function ChipGroup("));
assert(chip.includes("aria-pressed={selected}"), "Chips expose aria-pressed, which the guard reads.");
assert(chip.includes("max-w-[190px]") && chip.includes("truncate"), "Long chip labels truncate at ~190px.");

const toggle = primitives.slice(primitives.indexOf("export function ToggleRow("), primitives.indexOf("export function StickyPrimary("));
assert(toggle.includes('type="checkbox"'), "ToggleRow is backed by a real checkbox so the guard and FormData see it.");
assert(toggle.includes("min-h-12"), "The whole toggle row is a comfortable tap target.");

const sticky = primitives.slice(primitives.indexOf("export function StickyPrimary("));
assert(sticky.includes("disabled={isSaving}"), "The sticky primary is disabled only while saving.");
assert(!/disabled=\{invalid/.test(sticky) && !/disabled=\{isSaving \|\| invalid/.test(sticky), "The sticky primary never disables for validation.");
assert(sticky.includes("`Fix ${invalidCount} ${invalidCount === 1 ? \"thing\" : \"things\"} to ${verb}`"), "When invalid it names how many things to fix.");
assert(sticky.includes("onClick={invalid ? onInvalidClick : onClick}"), "A tap while invalid scrolls to the first error instead of submitting.");
assert(sticky.includes("env(safe-area-inset-bottom)"), "The sticky action respects the bottom safe area.");

const field = primitives.slice(primitives.indexOf("export function Field("), primitives.indexOf("export function Stepper("));
assert(field.includes('className="ml-0.5 text-dos-red"'), "Required renders a red asterisk after the label.");
assert(field.includes('optional ? "optional" : hint'), "Optional renders the word optional on the right.");
assert(field.includes('tone="error"'), "An error replaces the helper with a red instruction.");

// No retired colors in the new primitives; tokens only.
assert(!/#[0-9A-Fa-f]{6}\b/.test(primitives), "New primitives use tokens, not hex literals.");

console.log("DOS form primitives regression passed.");
