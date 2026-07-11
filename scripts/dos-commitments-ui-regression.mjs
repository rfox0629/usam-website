import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

function parseEnvValue(value) {
  const trimmed = value.trim();

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return;
  }

  const source = readFileSync(filePath, "utf8");

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex).trim();
    const value = parseEnvValue(line.slice(separatorIndex + 1));

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function maybeUrl(value, fallback) {
  const raw = value || fallback;

  if (!raw) {
    throw new Error("Missing base URL.");
  }

  return raw.replace(/\/$/, "");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function randomPhone() {
  return `555${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
}

async function applyVercelBypass(page, baseUrl) {
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    || process.env.VERCEL_PROTECTION_BYPASS_SECRET
    || process.env.VERCEL_BYPASS_SECRET
    || "";

  if (!bypassSecret || !/\.vercel\.app$/i.test(new URL(baseUrl).hostname)) {
    return;
  }

  const bypassUrl = new URL("/", baseUrl);
  bypassUrl.searchParams.set("x-vercel-protection-bypass", bypassSecret);
  bypassUrl.searchParams.set("x-vercel-set-bypass-cookie", "true");
  await page.goto(bypassUrl.toString(), { waitUntil: "domcontentloaded" });
}

async function createSupabaseSessionLink(supabase, baseUrl, email, workspaceSlug) {
  const redirectTo = new URL("/auth/session", baseUrl);
  redirectTo.searchParams.set("next", `/dos/${workspaceSlug}`);

  const { data, error } = await supabase.auth.admin.generateLink({
    email,
    options: {
      redirectTo: redirectTo.toString(),
    },
    type: "magiclink",
  });

  if (error) {
    throw new Error(`Unable to generate test login link: ${error.message}`);
  }

  const tokenHash = data?.properties?.hashed_token;
  const verificationType = data?.properties?.verification_type || "magiclink";

  if (!tokenHash) {
    throw new Error("Supabase did not return a token hash for the test login link.");
  }

  redirectTo.searchParams.set("token_hash", tokenHash);
  redirectTo.searchParams.set("type", verificationType);

  return redirectTo.toString();
}

async function createDisposablePerson(supabase, workspaceId) {
  const stamp = Date.now();
  const name = `Codex Commitment UI ${stamp}`;
  const { data, error } = await supabase
    .from("missionary_field_people")
    .insert({
      household_id: workspaceId,
      name,
      phone: randomPhone(),
      source: "field",
      status: "new",
      workspace_id: workspaceId,
    })
    .select("id, name")
    .single();

  if (error || !data?.id) {
    throw new Error(`Unable to create disposable test person: ${error?.message ?? "missing id"}`);
  }

  return { id: String(data.id), name };
}

async function cleanupTestData(supabase, personId, titles) {
  await supabase
    .from("dos_person_commitments")
    .delete()
    .eq("person_id", personId)
    .in("title", titles);

  await supabase
    .from("missionary_field_people")
    .delete()
    .eq("id", personId);
}

async function waitForDosReady(page, workspaceSlug) {
  await page.waitForURL((url) => url.pathname === `/dos/${workspaceSlug}`, { timeout: 45000 });
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { exact: true, name: "Commitment" }).waitFor({ state: "visible", timeout: 45000 });
}

async function openNewCommitmentFromHome(page) {
  await page.getByRole("button", { exact: true, name: "Commitment" }).click();
  const dialog = page.locator('[role="dialog"]').filter({ hasText: "New Commitment" }).last();
  await dialog.waitFor({ state: "visible", timeout: 15000 });
  return dialog;
}

async function captureCommitmentFormDiagnostics(dialog) {
  const form = dialog.locator("form").first();

  return form.evaluate((formElement) => {
    const controls = Array.from(formElement.elements).map((control) => ({
      id: control.id || "",
      name: control.getAttribute("name") || "",
      tagName: control.tagName.toLowerCase(),
      type: control.getAttribute("type") || "",
      value: "value" in control ? String(control.value ?? "") : "",
    }));
    const entries = Array.from(new FormData(formElement).entries()).map(([key, value]) => [key, String(value)]);
    const saveButton = formElement.querySelector("button[type='submit']");

    return {
      controlCount: controls.length,
      controls,
      formCount: document.forms.length,
      formOuterHTML: formElement.outerHTML.slice(0, 5000),
      formDataEntries: entries,
      nestedFormCount: formElement.querySelectorAll("form").length,
      saveButtonText: saveButton?.textContent?.trim() || "",
      saveButtonType: saveButton?.getAttribute("type") || "",
    };
  });
}

async function createCommitmentThroughUi({ page, person, title }) {
  const dialog = await openNewCommitmentFromHome(page);
  const form = dialog.locator("form").first();

  await form.locator('select[name="person_id"]').selectOption(person.id);
  await form.locator('input[name="title"]').fill(title);

  const diagnostics = await captureCommitmentFormDiagnostics(dialog);
  console.log("New Commitment form diagnostics before submit:");
  console.log(JSON.stringify(diagnostics, null, 2));

  const postBodies = [];
  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/dos/app/commitments" && response.request().method() === "POST";
  }, { timeout: 15000 });

  page.on("request", (request) => {
    const url = new URL(request.url());

    if (url.pathname === "/api/dos/app/commitments" && request.method() === "POST") {
      const postData = request.postData();
      postBodies.push(postData ? JSON.parse(postData) : null);
    }
  });

  await dialog.getByRole("button", { name: "Save Commitment" }).click();
  const response = await responsePromise;
  const responseBody = await response.json().catch(() => ({}));

  assert(response.ok(), `Commitment POST failed: ${response.status()} ${JSON.stringify(responseBody)}`);
  assert(postBodies.length === 1, `Expected one commitment POST, saw ${postBodies.length}.`);
  assert(postBodies[0]?.personId === person.id, "Submitted commitment payload used the wrong person id.");
  assert(postBodies[0]?.title === title, "Submitted commitment payload used the wrong title.");

  await page.getByText("Commitment saved.", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  assert(!(await page.getByText("Person and commitment title are required.").isVisible().catch(() => false)), "False required-field validation appeared.");
}

async function main() {
  loadEnvFile(process.env.DOS_REGRESSION_ENV_FILE || ".env.local");

  const baseUrl = maybeUrl(process.env.DOS_COMMITMENTS_TEST_BASE_URL, "http://localhost:3100");
  const workspaceSlug = process.env.DOS_COMMITMENTS_TEST_WORKSPACE_SLUG || "ryan-fox";
  const email = process.env.DOS_COMMITMENTS_TEST_EMAIL || "ryan@usamissionaries.org";
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: workspace, error: workspaceError } = await supabase
    .from("missionary_households")
    .select("id, slug")
    .eq("slug", workspaceSlug)
    .single();

  if (workspaceError || !workspace?.id) {
    throw new Error(`Unable to resolve test workspace ${workspaceSlug}: ${workspaceError?.message ?? "not found"}`);
  }

  const person = await createDisposablePerson(supabase, String(workspace.id));
  const staleTitle = `Stale UI ${Date.now()}`;
  const createdTitle = `UI Commitment ${Date.now()}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { height: 844, width: 390 },
  });
  const page = await context.newPage();

  try {
    await applyVercelBypass(page, baseUrl);
    const loginUrl = await createSupabaseSessionLink(supabase, baseUrl, email, workspaceSlug);

    await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
    await waitForDosReady(page, workspaceSlug);

    const firstDialog = await openNewCommitmentFromHome(page);
    await firstDialog.locator('select[name="person_id"]').selectOption(person.id);
    await firstDialog.locator('input[name="title"]').fill(staleTitle);
    await firstDialog.getByRole("button", { name: "Cancel" }).click();
    await firstDialog.waitFor({ state: "hidden", timeout: 15000 });

    const reopenedDialog = await openNewCommitmentFromHome(page);
    await reopenedDialog.locator('select[name="person_id"]').selectOption(person.id);
    const reopenedTitleValue = await reopenedDialog.locator('input[name="title"]').inputValue();
    assert(reopenedTitleValue === "", "Reopened New Commitment sheet preserved stale title value.");
    await reopenedDialog.getByRole("button", { name: "Cancel" }).click();

    await createCommitmentThroughUi({ page, person, title: createdTitle });

    await page.getByRole("button", { name: "Open Person Profile" }).click();
    await page.getByRole("heading", { name: person.name }).waitFor({ state: "visible", timeout: 15000 });
    await page.getByText(createdTitle, { exact: true }).waitFor({ state: "visible", timeout: 30000 });

    const { data: commitments, error: commitmentsError } = await supabase
      .from("dos_person_commitments")
      .select("id, person_id, status, title")
      .eq("person_id", person.id)
      .eq("title", createdTitle);

    if (commitmentsError) {
      throw new Error(`Unable to verify created commitment: ${commitmentsError.message}`);
    }

    assert(commitments.length === 1, `Expected one created commitment, found ${commitments.length}.`);
    assert(commitments[0].status === "active", "Created commitment was not active.");

    console.log("DOS New Commitment UI regression passed.");
  } finally {
    await browser.close();
    await cleanupTestData(supabase, person.id, [staleTitle, createdTitle]);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
