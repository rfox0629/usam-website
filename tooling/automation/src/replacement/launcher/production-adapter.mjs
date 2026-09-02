import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "../../..");

function commandEnv(configPath, env = process.env) {
  return {
    ...env,
    DISPATCHER_CONFIG: configPath,
    NO_COLOR: env.NO_COLOR || "1",
    TERM: env.TERM || "xterm-256color",
  };
}

function runNode(args, options = {}) {
  const {
    cwd = defaultRoot,
    env = process.env,
    timeoutMs = 60 * 60 * 1000,
  } = options;

  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolvePromise({ code: 127, error, stderr, stdout, timedOut });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolvePromise({ code, signal, stderr, stdout, timedOut });
    });
  });
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${error.message}`);
  }
}

function parseJsonl(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { event: "unparsed_output", line };
      }
    });
}

function inspectionHealth(inspection) {
  const issues = inspection?.issues || [];
  const ready = issues.filter((issue) => issue.state === "Ready").length;
  const founderReview = issues.filter((issue) => issue.state === "Founder Review").length;
  return {
    candidateCount: inspection?.candidateCount ?? issues.length,
    classifiedIssueCount: issues.length,
    founderReviewCount: founderReview,
    inspectedAt: inspection?.at || null,
    linearPollingConnected: true,
    readyCount: ready,
  };
}

function commandFailure(result, label) {
  const text = [result.error?.message, result.stderr, result.stdout]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
  const error = new Error(`${label} failed${result.code === null ? "" : ` with exit ${result.code}`}: ${text || "no output"}`);
  error.exitStatus = result.code || 1;
  error.timedOut = result.timedOut;
  return error;
}

export function createProductionLauncherAdapter({
  configPath,
  env = process.env,
  root = defaultRoot,
  timeoutMs,
} = {}) {
  const dispatcherPath = resolve(root, "src", "dispatcher.mjs");
  const resolvedConfigPath = resolve(root, configPath || "config/dispatcher.config.json");
  const runEnv = commandEnv(resolvedConfigPath, env);

  return {
    async inspectQueue() {
      const result = await runNode([dispatcherPath, "--inspect-queue"], {
        cwd: root,
        env: runEnv,
        timeoutMs: timeoutMs || 5 * 60 * 1000,
      });
      if (result.code !== 0 || result.timedOut) {
        throw commandFailure(result, "dispatcher inspect-queue");
      }
      const inspection = parseJson(result.stdout, "dispatcher inspect-queue");
      return {
        health: inspectionHealth(inspection),
        inspection,
      };
    },

    async runOnce() {
      const result = await runNode([dispatcherPath, "--once"], {
        cwd: root,
        env: runEnv,
        timeoutMs: timeoutMs || 60 * 60 * 1000,
      });
      return {
        events: parseJsonl(result.stdout),
        exitStatus: result.code || 0,
        stderr: result.stderr,
        timedOut: result.timedOut,
      };
    },
  };
}
