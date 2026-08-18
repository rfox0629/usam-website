/**
 * USA-170 — invitation links must survive being looked at.
 *
 * The production failure: Ryan texted Tanner an invitation at 9:58 AM. iMessage
 * unfurled it and the token was marked `used` ten seconds later. Tanner tapped
 * at 9:59 and was told the link had expired. Two tokens in the production audit
 * were consumed 8 and 10 seconds after creation — no human taps that fast.
 *
 * This suite has two halves:
 *
 *   1. Structural — redemption must be unreachable from a GET handler, and the
 *      inspection path must contain no writes at all.
 *   2. Behavioral — boot the built app and act like an unfurler: HEAD, then
 *      repeated cookieless GETs. None may establish a session. Only the POST
 *      may. This is the half that would actually have caught the outage.
 *
 * Run: npm run test:dos-invitation-crawler-safety
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Missing files are a failure to report, not a crash: this suite must be able
 * to run against a tree where the fix has been reverted and still say why.
 */
function read(path) {
  try {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
}

function exists(path) {
  try {
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

    return true;
  } catch {
    return false;
  }
}

const failures = [];

function check(condition, message) {
  if (condition) {
    return true;
  }

  failures.push(message);

  return false;
}

/* ------------------------------------------------------------------ *
 * 1. Structural guards
 * ------------------------------------------------------------------ */

const memberAccess = read("src/lib/groups/member-access.ts");
const actions = read("app/groups/[slug]/member/actions.ts");
const accessPage = read("app/groups/[slug]/member/access/page.tsx");

check(
  !exists("app/groups/[slug]/member/access/route.ts"),
  "The invitation route must not be a GET route handler again — that is what redeemed on unfurl.",
);
check(exists("app/groups/[slug]/member/access/page.tsx"), "The invitation confirmation page must exist.");
check(accessPage.includes("export default async function"), "The invitation route must be a page that renders a confirmation step.");
check(accessPage.includes("openGroupMemberAccess"), "The invitation page must redeem through the explicit POST action.");
check(accessPage.includes("<form action={openGroupMemberAccess}"), "Redemption must be a form POST, not a link or an effect.");
check(!accessPage.includes("claimGroupMemberAccessToken"), "The invitation page must not claim tokens during render.");
check(!accessPage.includes("cookieStore.set"), "The invitation page must not establish a session during render.");

// The inspection helper is what a crawler reaches. It must be read-only.
const inspectStart = memberAccess.indexOf("export async function inspectGroupMemberAccessToken");
const inspectEnd = memberAccess.indexOf("export async function claimGroupMemberAccessToken");
check(inspectStart >= 0 && inspectEnd > inspectStart, "inspectGroupMemberAccessToken must exist ahead of the claim path.");
const inspectBody = memberAccess.slice(inspectStart, inspectEnd);
for (const write of [".update(", ".insert(", ".upsert(", ".delete("]) {
  check(!inspectBody.includes(write), `Token inspection must perform no writes (found ${write}).`);
}

// Redemption stays server-action only.
check(actions.includes('"use server"'), "Redemption must live in a server action module.");
check(actions.includes("export async function openGroupMemberAccess"), "openGroupMemberAccess must be the redemption entry point.");

// The recovery path must never rotate the leader's live token again.
const recoveryStart = actions.indexOf("export async function requestGroupMemberAccess");
const recoveryEnd = actions.indexOf("export async function signOutGroupMember");
const recoveryBody = actions.slice(recoveryStart, recoveryEnd);
check(recoveryStart >= 0 && recoveryEnd > recoveryStart, "requestGroupMemberAccess must exist.");
check(
  !recoveryBody.includes("createGroupMemberAccessInvitation"),
  "Recovery must not mint/revoke tokens: it revoked the link the leader had just sent (6 tokens revoked, consumed_at null, in the production audit).",
);
check(recoveryBody.includes("notifyGroupAccessRecovery"), "Recovery must actually notify the leader.");
check(recoveryBody.includes("recovery-sent"), "Recovery must distinguish a delivered request from an undelivered one.");

/* ------------------------------------------------------------------ *
 * 2. Behavioral guards — act like an unfurler against the real server
 * ------------------------------------------------------------------ */

const host = "127.0.0.1";
const port = Number(process.env.CRAWLER_SAFETY_PORT || 4321);
const baseUrl = `http://${host}:${port}`;
const sessionCookieName = "dos_group_member_session";

function demoToken(overrides = {}) {
  const payload = {
    completedSessionIds: [],
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    groupId: "demo-group-wednesday-mens",
    groupName: "Wednesday Men's Group",
    groupSlug: "wednesday-mens-group",
    identityId: "demo-identity-crawler-safety",
    memberId: "demo-group-wednesday-member-tanner",
    personId: "demo-person-tanner-kent",
    personName: "Tanner Kent",
    resourceSlug: "marks-of-discipleship",
    startDate: "2026-08-12",
    ...overrides,
  };

  return `demo_group_member_access.${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}`;
}

function setsMemberSession(response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  const combined = raw.length ? raw.join("; ") : (response.headers.get("set-cookie") ?? "");

  // An empty/expiring cookie is a clear, not an establishment.
  return combined.includes(`${sessionCookieName}=`) && !combined.includes(`${sessionCookieName}=;`);
}

const server = spawn("npm", ["run", "start", "--", "--hostname", host, "--port", String(port)], {
  env: { ...process.env, HOSTNAME: host, NEXT_TELEMETRY_DISABLED: "1", PORT: String(port), VERCEL_ENV: "preview" },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk.toString(); });
server.stderr.on("data", (chunk) => { serverLog += chunk.toString(); });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
    } catch {
      // not up yet
    }
    await delay(1000);
  }

  throw new Error(`Server did not start.\n${serverLog}`);
}

async function main() {
  await waitForServer();

  const token = demoToken();
  const url = `${baseUrl}/groups/wednesday-mens-group/member/access?token=${encodeURIComponent(token)}`;

  // A real unfurler sends HEAD first, then GET, sometimes several times, and
  // never carries cookies.
  const head = await fetch(url, { method: "HEAD", redirect: "manual" });
  check(head.status < 400, `HEAD on an invitation should render, got ${head.status}.`);
  check(!setsMemberSession(head), "HEAD must not establish a member session.");

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const get = await fetch(url, { redirect: "manual" });
    check(get.status === 200, `Cookieless GET #${attempt} should render the confirmation page, got ${get.status}.`);
    check(!setsMemberSession(get), `GET #${attempt} must not establish a member session.`);

    const body = await get.text();
    check(body.includes("Open Group Home"), `GET #${attempt} must offer the explicit redemption action.`);

    // The token legitimately appears in the hidden POST field — that is how
    // redemption carries it, and the reader already holds it in their URL.
    // What must never carry it is anything a crawler republishes: metadata,
    // canonical URLs, structured data.
    const metaTags = body.match(/<(?:meta|link)\b[^>]*>/gi) ?? [];
    const leakingMeta = metaTags.filter((tag) => tag.includes(token) || /token=/i.test(tag));
    check(
      leakingMeta.length === 0,
      `GET #${attempt} must not place the token in metadata/canonical URLs (found ${leakingMeta.length}).`,
    );
    check(!body.includes("Tanner"), `GET #${attempt} must not leak the participant's name to an unfurler.`);
    // The preview card must not carry the retired campaign artwork.
    for (const retired of ["#C2A14E", "#0B0D10", "#080A0D", "groups-share.png"]) {
      check(!body.includes(retired), `GET #${attempt} preview metadata must not carry retired branding (${retired}).`);
    }
  }

  // Repeated looking must leave the link usable: the page still says "valid".
  const afterCrawls = await fetch(url, { redirect: "manual" });
  const afterBody = await afterCrawls.text();
  check(
    afterBody.includes("Open Group Home"),
    "After HEAD + 3 GETs the invitation must still be redeemable — this is the exact regression that locked Tanner out.",
  );
  check(
    !afterBody.includes("no longer active"),
    "Crawler traffic must not move the invitation into an expired state.",
  );
}

let exitCode = 0;

try {
  await main();
} catch (error) {
  failures.push(`Behavioral checks could not complete: ${error instanceof Error ? error.message : error}`);
} finally {
  server.kill("SIGTERM");
  await delay(500);
  if (!server.killed) {
    server.kill("SIGKILL");
  }
}

if (failures.length) {
  exitCode = 1;
  console.error("dos-invitation-crawler-safety-regression: FAILED");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
} else {
  console.log("dos-invitation-crawler-safety-regression: all checks passed.");
}

process.exit(exitCode);
