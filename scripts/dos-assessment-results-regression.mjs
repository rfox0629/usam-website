import { readFileSync } from "node:fs";

const files = {
  apiRoute: "app/api/dos/app/assessment-results/route.ts",
  client: "app/dos/library/marriage-assessment/MarriageAssessmentClient.tsx",
  dosApp: "app/dos/app/DosMvpAppClient.tsx",
  loader: "src/lib/dos/missionary-app.ts",
  migration: "supabase/migrations/20260703141054_dos_assessment_results.sql",
  page: "app/dos/library/marriage-assessment/page.tsx",
};

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const apiRoute = read(files.apiRoute);
const client = read(files.client);
const dosApp = read(files.dosApp);
const loader = read(files.loader);
const migration = read(files.migration);
const page = read(files.page);

for (const requiredSql of [
  "create table if not exists public.dos_assessment_results",
  "workspace_id uuid not null references public.missionary_households",
  "person_id uuid references public.missionary_field_people",
  "assessment_type text not null",
  "category_scores jsonb not null",
  "answers jsonb not null",
  "alter table public.dos_assessment_results enable row level security",
  "grant select, insert, update on table public.dos_assessment_results to authenticated",
]) {
  assert(migration.includes(requiredSql), `Assessment migration missing: ${requiredSql}`);
}

for (const requiredRouteGuard of [
  "requireDosWorkspaceRouteAccess",
  "personBelongsToWorkspace",
  ".from(\"dos_assessment_results\")",
  ".from(\"missionary_field_people\")",
  "Assessment persistence is not installed yet.",
]) {
  assert(apiRoute.includes(requiredRouteGuard), `Assessment API route missing: ${requiredRouteGuard}`);
}

for (const forbiddenPersistence of [
  ".from(\"fruit_events\")",
  ".from('fruit_events')",
  "createFruitEvent",
  "source_app: \"record_fruit\"",
]) {
  assert(!apiRoute.includes(forbiddenPersistence), `Assessment API must not create fruit: ${forbiddenPersistence}`);
}

assert(page.includes("saveContext={params.person && params.workspace"), "Marriage page must pass save context only when person and workspace are present.");
assert(client.includes("/api/dos/app/assessment-results"), "Marriage client must save through the DOS assessment result API.");
assert(client.includes("Standalone result. Not saved to a profile."), "Standalone assessment must remain no-save.");
assert(client.includes("Saved to profile."), "Saved assessment confirmation copy missing.");
assert(dosApp.includes("assessmentResults={data.assessmentResults}"), "Person profile overlay must receive assessment results.");
assert(dosApp.includes("AssessmentResultSummaryCard"), "Growth tab must render saved assessment result card.");
assert(page.includes("tab=growth"), "Assessment link must return to the person Growth tab.");
assert(loader.includes("loadAssessmentResultsForWorkspace"), "DOS app loader must fetch assessment results.");
assert(loader.includes("isMissingWorkflowTable(result.error, \"dos_assessment_results\")"), "DOS app loader must tolerate missing assessment table.");

console.log("DOS assessment results regression passed.");
