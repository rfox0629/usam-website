#!/usr/bin/env node
/**
 * USA-167 release gate for the /join application and its resume links.
 *
 * WHY THIS EXISTS
 * On Aug 21 and again on Aug 23 the founder tapped "Continue your application"
 * in a real resume email on a real phone and landed on the legacy DOS setup
 * screen: "Discipleship on the go" / Meet / Minister / Multiply / Start Setup.
 * A harness had reported 27/27 green for the same flow.
 *
 * The harness was green because it constructed resume URLs itself and checked
 * that a second browser could follow one. It never looked at the page the link
 * actually served. So this gate inspects the served bytes, and takes the resume
 * URL from the code that really sends it rather than rebuilding the URL.
 *
 * Traced against production (deployment dpl_9xKjF8PSuX3U2gZmu7bp2YhBWGZR,
 * commit 3233670, current head of main), GET /join?resume=<token> returns:
 *
 *   HTTP 200, no redirect, x-matched-path: /join
 *   <title>Join DOS</title>, og:title "DOS | Discipleship Operating System"
 *   <h1>Discipleship on the go.</h1>, Meet / Minister / Multiply, Start Setup
 *   x-nextjs-prerender: 1, x-vercel-cache: PRERENDER
 *
 * There is no redirect and no middleware rule for /join. The destination
 * itself is the DOS setup screen, and because the page is statically
 * prerendered the ?resume= token never reaches the server at all.
 *
 * THIS GATE FAILS ON PURPOSE TODAY. The USA-167 V2 application is not in this
 * repository (no JOIN_PREVIEW_ACCESS_KEY, no resume-token code, no resume
 * email, nothing in history on any branch). Every failure below names a
 * specific missing piece of the contract. The gate goes green when V2 lands;
 * it is not wired into CI precisely because it is a release gate for work
 * that has not been built yet.
 *
 *   node scripts/join-v2-release-regression.mjs
 *
 * Phase A is static and always runs. Phase B boots the production build and
 * probes with real Host headers, the same approach as
 * mission-domain-routing-regression.mjs; it is skipped with a notice when
 * there is no build, so the static contract stays runnable without one.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import path from "node:path";

const host = "127.0.0.1";
const port = Number(process.env.JOIN_RELEASE_PORT || 4199);
const CANONICAL_HOST = "usamissionaries.org";

const failures = [];
const check = (ok, message, detail) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${message}`);
  if (!ok) {
    failures.push(message);
    if (detail) console.log(`          ${detail}`);
  }
};

const read = (relativePath) => {
  const absolutePath = path.join(process.cwd(), relativePath);

  return existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : null;
};

/**
 * Markers unique to the legacy DOS setup experience. If any of these reach an
 * applicant at /join, the USA-167 separation has been violated.
 */
const dosMarkers = [
  "Discipleship on the go",
  "Start Setup",
  "Join DOS",
  "Set up DOS",
  "favicons/dos",
  "Discipleship Operating System",
];

console.log("USA-167 /join release gate\n");
console.log("Phase A: static contract\n");

// ---------------------------------------------------------------------------
// A1. The /join route must not declare DOS identity.
// ---------------------------------------------------------------------------
const joinPage = read(path.join("app", "join", "page.tsx"));

if (joinPage === null) {
  check(false, "app/join/page.tsx exists");
} else {
  const declaredDos = dosMarkers.filter((marker) => joinPage.includes(marker));

  check(
    declaredDos.length === 0,
    "/join route metadata carries USA Missionaries identity, not DOS",
    declaredDos.length > 0 ? `DOS markers in the route: ${declaredDos.join(", ")}` : undefined,
  );

  check(
    !joinPage.includes("dosAppMetadata"),
    "/join does not import DOS brand metadata",
    "app/join/page.tsx spreads dosAppMetadata, so the tab, favicon and share card all say DOS",
  );
}

// ---------------------------------------------------------------------------
// A2. Something must actually send a resume email carrying a resume URL.
//     The Aug 23 evidence is a delivered email, so the template has to exist
//     in the code that sends it, or the gate cannot read the real URL.
// ---------------------------------------------------------------------------
const emailModule = read(path.join("src", "lib", "email", "resend.ts"));

if (emailModule === null) {
  check(false, "src/lib/email/resend.ts exists");
} else {
  const hasResumeTemplate = /resume/i.test(emailModule);

  check(
    hasResumeTemplate,
    "the join email module builds a save/resume email",
    "No resume template exists. The five templates present are submitted, admin notification, "
      + "approved, more-info and declined. The resume email the founder received on Aug 23 was "
      + "not sent by this repository.",
  );

  if (hasResumeTemplate) {
    const resumeUrls = [...emailModule.matchAll(/https?:\/\/[^\s"'`]*resume[^\s"'`]*/gi)].map((m) => m[0]);
    const buildsJoinPath = /\/join\?[^"'`]*resume/i.test(emailModule);

    check(
      buildsJoinPath || resumeUrls.length > 0,
      "the resume email points at /join with a resume token",
      "A resume email exists but no /join?resume= URL is built in it.",
    );

    for (const url of resumeUrls) {
      check(
        !/\/dos\b/.test(url) && !/setup/i.test(url),
        `resume URL ${url} contains no DOS or setup path`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// A3. /join must read the resume token server-side. A statically prerendered
//     page cannot, which is why the token is silently dropped in production.
// ---------------------------------------------------------------------------
const joinClient = read(path.join("app", "join", "usam", "UsamJoinClient.tsx"));

if (joinPage !== null) {
  const readsResume = /resume/i.test(joinPage) || (joinClient !== null && /resume/i.test(joinClient));

  check(
    readsResume,
    "/join reads a resume token from the request",
    "Nothing in the /join route or its client reads a resume parameter. The page only reads "
      + "restart, reset, fresh and demo, client side, so ?resume=<token> is discarded.",
  );

  const declaresDynamic = /searchParams|export const dynamic|force-dynamic/.test(joinPage);

  check(
    declaresDynamic,
    "/join is request-time rendered so the query string reaches the server",
    "app/join/page.tsx takes no searchParams and sets no dynamic flag, so Next prerenders it "
      + "(observed in production as x-nextjs-prerender: 1) and the token never arrives.",
  );
}

// ---------------------------------------------------------------------------
// A4. A resume link is a cross-device return path, so the draft cannot live
//     only in the browser that typed it.
// ---------------------------------------------------------------------------
if (joinClient !== null) {
  const localStorageWrites = (joinClient.match(/localStorage\.setItem/g) || []).length;
  const hasServerDraft = /\/api\/join\/(draft|resume)/.test(joinClient);

  check(
    hasServerDraft,
    "the application draft is persisted server-side, not only in localStorage",
    `The draft is written to localStorage in ${localStorageWrites} place(s) under the key `
      + "dos-unified-setup-draft-v1 and to no server endpoint. Cross-device resume is impossible "
      + "by construction, whatever the link says.",
  );
}

// ---------------------------------------------------------------------------
// Phase B: the bytes actually served at /join.
// ---------------------------------------------------------------------------
function probe(pathname, { hostname = CANONICAL_HOST } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { headers: { host: hostname }, hostname: host, method: "GET", path: pathname, port },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve({
            body,
            header: (name) => res.headers[name.toLowerCase()] ?? null,
            location: res.headers.location ?? null,
            status: res.statusCode,
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await probe("/");
      if (response.status > 0) return true;
    } catch {
      // still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function runServedContract() {
  console.log("\nPhase B: served /join contract\n");

  if (!existsSync(path.join(process.cwd(), ".next"))) {
    console.log("  skip  no .next build found. Run `npm run build` first to check the served page.");

    return;
  }

  const server = spawn("npx", ["next", "start", "--hostname", host, "--port", String(port)], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    if (!(await waitForServer())) {
      check(false, `server started on ${host}:${port}`);

      return;
    }

    const plain = await probe("/join");

    check(plain.status === 200, `/join responds 200 (got ${plain.status})`);

    const servedDosMarkers = dosMarkers.filter((marker) => plain.body.includes(marker));

    check(
      servedDosMarkers.length === 0,
      "/join serves no DOS setup content",
      servedDosMarkers.length > 0
        ? `The applicant is shown: ${servedDosMarkers.join(", ")}. This is the exact screen from `
          + "the founder's mobile screenshots."
        : undefined,
    );

    check(
      /Apply to Become a USA Missionary|USA Missionaries application|JOIN USA MISSIONARIES/i.test(plain.body),
      "/join opens as a USA Missionaries application",
      "The first screen must unmistakably say the applicant is applying to USA Missionaries.",
    );

    // The real click, not a constructed one: the token must reach the server.
    const token = process.env.JOIN_RESUME_TEST_TOKEN || "usa-167-gate-token";
    const resumed = await probe(`/join?resume=${encodeURIComponent(token)}`);

    check(
      resumed.header("x-nextjs-prerender") !== "1",
      "/join?resume= is rendered at request time, not served from a prerender",
      "x-nextjs-prerender: 1 means the token was never seen by the server, so no link can restore "
        + "a draft on any device.",
    );

    check(
      resumed.status === 200,
      `/join?resume=<token> responds 200 (got ${resumed.status})`,
    );

    check(
      resumed.location === null || !/\/dos/.test(resumed.location),
      "/join?resume=<token> does not redirect into DOS",
      resumed.location ? `redirected to ${resumed.location}` : undefined,
    );

    check(
      resumed.body !== plain.body,
      "/join?resume=<token> renders differently from /join with no token",
      "Identical bytes mean the token changed nothing, so the link cannot be restoring a draft. "
        + "An invalid or expired token must still produce its own explicit state.",
    );
  } finally {
    server.kill("SIGTERM");
  }
}

await runServedContract();

console.log("");

if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed.\n`);
  console.error("USA-167 is not releasable and the resume link must not be sent to applicants.");
  process.exit(1);
}

console.log("The /join application and its resume links satisfy the USA-167 contract.");
