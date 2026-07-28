import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = Number(process.env.CI_SMOKE_PORT || 4173);
const baseUrl = `http://${host}:${port}`;
const artifactsDir = path.join(process.cwd(), "test-results");

const server = spawn(
  "npm",
  ["run", "start", "--", "--hostname", host, "--port", String(port)],
  {
    env: {
      ...process.env,
      HOSTNAME: host,
      PORT: String(port),
    },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverExited = false;
let serverExitCode = null;
let serverOutput = "";

server.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  serverOutput += chunk.toString();
});

server.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  serverOutput += chunk.toString();
});

server.on("exit", (code) => {
  serverExited = true;
  serverExitCode = code;
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer() {
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error(
        `Next.js server exited before smoke test could run. Exit code: ${serverExitCode}\n${serverOutput}`,
      );
    }

    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
    } catch {
      // The server is still warming up.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function main() {
  let browser;
  let page;

  try {
    await waitForServer();

    browser = await chromium.launch();
    page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("body", { state: "visible", timeout: 10_000 });

    const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
    if (bodyText.trim().length < 200) {
      throw new Error("Homepage rendered, but the body content was unexpectedly small.");
    }
  } catch (error) {
    await mkdir(artifactsDir, { recursive: true });
    if (page) {
      await page
        .screenshot({
          path: path.join(artifactsDir, "homepage-smoke-failure.png"),
          fullPage: true,
        })
        .catch(() => {});
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }

    await stopServer();
  }
}

async function stopServer() {
  if (serverExited) {
    return;
  }

  const signalServer = (signal) => {
    try {
      if (process.platform === "win32") {
        server.kill(signal);
      } else {
        process.kill(-server.pid, signal);
      }
    } catch {
      // The process may already be gone.
    }
  };

  signalServer("SIGTERM");

  await Promise.race([
    once(server, "exit"),
    delay(5_000).then(() => {
      if (!serverExited) {
        signalServer("SIGKILL");
      }
    }),
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
