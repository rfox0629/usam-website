#!/usr/bin/env node

import { readFile } from "node:fs/promises";

async function read(path) {
  return readFile(path, "utf8");
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label} is missing: ${expected}`);
  }
}

async function main() {
  const [adminLayout, adminAuth, access, vercelConfig, dispatcherScript] = await Promise.all([
    read("app/admin/layout.tsx"),
    read("src/lib/admin-auth.ts"),
    read("src/lib/access.ts"),
    read("vercel.json"),
    read("scripts/dispatcher-preview-completion.mjs"),
  ]);
  const vercel = JSON.parse(vercelConfig);

  assertIncludes(adminLayout, "getAdminAuthorization", "Admin layout");
  assertIncludes(adminLayout, "redirect(\"/login?next=/admin\")", "Admin layout");
  assertIncludes(adminAuth, ".from(\"admin_users\")", "Admin authorization");
  assertIncludes(access, "source === \"team\" ? [\"team\"] : [\"system\", \"preview\"]", "Preview access codes");
  assertIncludes(dispatcherScript, "product-preview-ready", "Dispatcher preview script");
  assertIncludes(dispatcherScript, "preview-blocked", "Dispatcher preview script");

  if (vercel?.git?.deploymentEnabled?.["dispatcher/**"] !== true) {
    throw new Error("vercel.json must explicitly enable dispatcher/** preview deployments.");
  }

  if (vercel?.github?.autoJobCancelation !== false) {
    throw new Error("vercel.json must keep dispatcher review builds from being auto-cancelled.");
  }

  console.log("preview security check passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
