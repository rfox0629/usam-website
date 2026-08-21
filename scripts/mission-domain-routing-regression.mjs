/**
 * Guards the Mission of Reconciliation host routing table.
 *
 * The failure this exists to prevent: /api/* was not in the host-native path
 * map, so a POST from www.missionofreconciliation.org was 308'd to
 * usamissionaries.org. The browser turned that into a cross-origin request,
 * CORS blocked it, and the restoration form died with "Load failed" while
 * silently losing the submission.
 *
 *   node scripts/mission-domain-routing-regression.mjs
 *
 * Boots the production build and probes real requests with spoofed Host
 * headers. Anything the browser calls from a Mission page must resolve on the
 * Mission host without a cross-origin redirect.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { request as httpRequest } from "node:http";

const host = "127.0.0.1";
const port = Number(process.env.MOR_ROUTING_PORT || 4188);
const base = `http://${host}:${port}`;
const MISSION = "www.missionofreconciliation.org";
const USAM = "usamissionaries.org";

const server = spawn("npx", ["next", "start", "--hostname", host, "--port", String(port)], {
  env: { ...process.env, ENABLE_MOR_DOMAIN_REDIRECT: "true" },
  stdio: ["ignore", "pipe", "pipe"],
});

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${message}`);
  if (!ok) failures.push(message);
};

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await probe(USAM, "/");
      if (response.status > 0) return;
    } catch {
      // still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${base}`);
}

/**
 * Uses node:http rather than fetch. fetch refuses to set `host`, and setting
 * only `x-forwarded-host` makes the middleware's internal rewrites look like
 * cross-origin ones, so pages come back as redirects instead of rendering.
 * A real Host header reproduces what the edge actually sees.
 */
function probe(hostname, path, { body, headers = {}, method = "GET" } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { headers: { host: hostname, ...headers }, hostname: host, method, path, port },
      (res) => {
        res.resume();
        res.on("end", () =>
          resolve({
            headers: { get: (name) => res.headers[name.toLowerCase()] ?? null },
            status: res.statusCode,
          }),
        );
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

try {
  await waitForServer();

  console.log("browser-called endpoints stay same-origin on the Mission host");
  for (const path of ["/api/form-submissions"]) {
    const response = await probe(MISSION, path, {
      body: JSON.stringify({ email: "regression@example.test", formType: "not_a_real_type" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    check(
      response.status !== 308 && response.status !== 307,
      `POST ${path} is served, not redirected (got ${response.status}${response.headers.get("location") ? ` -> ${response.headers.get("location")}` : ""})`,
    );
  }

  console.log("Mission pages render on the Mission host");
  for (const path of ["/", "/stories", "/stories/marty-and-lauri-fox", "/restoration"]) {
    const response = await probe(MISSION, path);
    check(response.status === 200, `GET ${path} -> ${response.status}`);
  }

  console.log("section-prefixed URLs collapse, off-section paths fall back");
  const collapsed = await probe(MISSION, "/mission-of-reconciliation/stories");
  check(collapsed.status === 308 && collapsed.headers.get("location") === "/stories", `section URL collapses -> ${collapsed.headers.get("location")}`);
  const offSection = await probe(MISSION, "/system");
  check(
    offSection.status === 308 && (offSection.headers.get("location") ?? "").startsWith("https://usamissionaries.org"),
    `off-section falls back -> ${offSection.headers.get("location")}`,
  );

  console.log("USA Missionaries keeps its own routes");
  for (const path of ["/", "/restoration", "/system", "/api/form-submissions"]) {
    const response = await probe(USAM, path, path === "/api/form-submissions"
      ? { body: JSON.stringify({}), headers: { "content-type": "application/json" }, method: "POST" }
      : {});
    check(response.status !== 308, `${path} not redirected on usamissionaries.org (${response.status})`);
  }

  const legacy = await probe(USAM, "/mission-of-reconciliation");
  check(
    legacy.status === 308 && legacy.headers.get("location") === "https://www.missionofreconciliation.org/",
    `legacy section URL -> ${legacy.headers.get("location")}`,
  );
} finally {
  server.kill("SIGTERM");
  await once(server, "exit").catch(() => {});
}

if (failures.length) {
  console.error(`\nmission domain routing regression FAILED (${failures.length})`);
  process.exit(1);
}

console.log("\nmission domain routing regression passed");
