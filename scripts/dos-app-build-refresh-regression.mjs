/* USA-283 follow-up: the installed Home Screen app must not keep serving an
 * old build.
 *
 * The reported fault: the Groups redesign was merged, deployed and verified on
 * the server, and the leader's phone still showed the previous screen --
 * duplicate title tile, wrapped pill tabs, Status cards. Nothing was wrong
 * with the deployment. DOS is installed on the Home Screen, and an installed
 * iOS web app keeps the JavaScript it was opened with: no address bar, no
 * reload on resume, the same process alive for days.
 *
 * What must hold: the server stamps each render with its deployment, the
 * client can ask what the server is on now, and a difference reloads the app
 * -- without interrupting work and without any possibility of a reload loop.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dosAppBuildId, dosAppBuildLabel } from "../src/lib/dos/app-build.ts";
import { dosHasUnsavedWork, registerDosUnsavedWorkSource } from "../src/lib/dos/unsaved-work.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/* 1. The build id itself. */
assert.equal(typeof dosAppBuildId(), "string");
assert.ok(dosAppBuildId().length > 0, "a build id is always reported");
assert.equal(dosAppBuildLabel("dpl_CtmXF29PG9gfVQAspQeYF6UszJou"), "CtmXF29P", "a Vercel deployment id is shortened for display");
assert.equal(dosAppBuildLabel("383a060a0ac5e92b15f3bf743129621725ecc052"), "383a060", "a commit sha shows as its short form");
assert.equal(dosAppBuildLabel(""), "development", "a local run says so rather than showing an empty label");

/* 2. The endpoint that answers "what build are you on now". */
const route = read("app/api/dos/app/build/route.ts");

assert.ok(route.includes('export const dynamic = "force-dynamic"'), "the route is dynamic, never prerendered at build time");
assert.ok(route.includes('"cache-control": "no-store, max-age=0"'), "the answer is never cached -- a cached build id would defeat the check");
assert.ok(!/supabase|getDosAuthorization|missionary_/.test(route), "the endpoint exposes only the deployment id, no data and no auth surface");

/* 3. The client check. */
const refresh = read("src/components/dos/DosBuildRefresh.tsx");

assert.ok(refresh.includes('document.addEventListener("visibilitychange"'), "resuming the app is the moment an installed app gets to notice a new build");
assert.ok(refresh.includes('window.addEventListener("pageshow"'), "a page restored from the back/forward cache is checked too");
assert.ok(refresh.includes('fetch("/api/dos/app/build", { cache: "no-store" })'), "the check itself is uncached");
assert.ok(refresh.includes("if (appIsBusy() || readReloadedFor() === serverBuildId) {") && refresh.includes("setUpdateReady(true);"), "a busy app is offered the update instead of being reloaded under the leader");
/* Found in testing: a sheet's backdrop covers the notice, so offering it
   while a sheet is open offers something that cannot be tapped. It waits. */
assert.ok(refresh.includes("if (!updateReady || isBusy) {"), "the notice stays hidden until the screen is clear, then appears");
assert.ok(refresh.includes("const timer = window.setInterval(() => setIsBusy(appIsBusy()), 1000);"), "the app watches for the sheet to close so the waiting update can surface");
assert.ok(refresh.includes('document.querySelector(\'[role="dialog"], [aria-modal="true"]\')'), "any open sheet or dialog counts as busy, so unsaved work is never discarded");
assert.ok(refresh.indexOf("rememberReloadedFor(serverBuildId);") < refresh.indexOf("window.location.reload();"), "the build is remembered before reloading, so one build can only ever trigger one reload");
assert.ok(refresh.includes('buildId === "development"') && refresh.includes('serverBuildId === "development"'), "local development never reloads itself");
assert.ok(/catch \{\n      \/\* Offline/.test(refresh), "a failed check is silent: being offline is not an update");

/* 3b. Unsaved work anywhere in DOS, not just what looks like a dialog.
 *
 * The full-screen workflow pages (Log Meeting, Add Person, Manage circles)
 * hold the longest work in the app and carry no dialog role, so a DOM check
 * would reload straight over them -- verified in a browser: that page is not
 * a dialog, and with the registry the typed value survives a new deployment.
 */
assert.equal(dosHasUnsavedWork(), false, "a quiet app holds nothing");

const releaseDirty = registerDosUnsavedWorkSource(() => true);

assert.equal(dosHasUnsavedWork(), true, "a registered dirty surface is reported");
releaseDirty();
assert.equal(dosHasUnsavedWork(), false, "unmounting a surface stops it reporting");

const releaseBroken = registerDosUnsavedWorkSource(() => { throw new Error("mid-unmount"); });

assert.equal(dosHasUnsavedWork(), true, "a surface that cannot answer is treated as holding work, never as safe to discard");
releaseBroken();

const surfaces = read("src/components/dos/overlays/DosSurfaces.tsx");

assert.ok(surfaces.includes("useEffect(() => registerDosUnsavedWorkSource(() => isDirtyRef.current()), []);"), "every surface using the unsaved-work guard registers itself, so new screens are covered without remembering anything");
assert.ok(refresh.includes("dosHasUnsavedWork() || document.querySelector("), "the refresher asks the guard first, then the DOM");
assert.ok(refresh.includes('active.tagName === "INPUT"'), "a field being typed into counts as busy even before it is dirty");

/* 4. Wiring: every surface that renders the app stamps its build. */
const client = read("app/dos/app/DosMvpAppClient.tsx");
const workspacePage = read("app/dos/[collectiveSlug]/page.tsx");
const previewPage = read("app/dos/app/preview/page.tsx");

assert.ok(client.includes("<DosBuildRefresh buildId={buildId} />"), "the app mounts the check");
assert.ok(client.includes('export function DosMvpAppClient({ buildId = "development", data, renderedAt }'), "the client receives the build that rendered it");
assert.ok(workspacePage.includes("buildId={dosAppBuildId()}"), "the real workspace route stamps its build");
assert.ok(previewPage.includes("buildId={dosAppBuildId()}"), "the preview route stamps its build");
assert.ok(client.includes("DOS · build {dosAppBuildLabel(buildId)}"), "More shows the running build, so a stale device can be identified from the screen");

console.log("DOS app build refresh (USA-283 follow-up) regression passed.");
