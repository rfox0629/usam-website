// How a job's result reaches stdout.
//
// Under launchd, stdout is appended to one log file that is never rotated. The
// launcher runs every 30 seconds, and printing its full pretty-printed result
// (queue, eligibility reports, events) on every pass grew that file to 40.7 GB
// and filled the disk (2026-09-29). Unattended runs now print one compact
// summary line; the full result is still printed for interactive use (a TTY)
// or when explicitly requested with --print-result / USAM_PRINT_RESULT=1.

export function shouldPrintFullResult({ isTTY = false, flag = false, env = {} } = {}) {
  return Boolean(isTTY || flag || env.USAM_PRINT_RESULT === "1");
}

export function summarizeResult(job, result, at = new Date().toISOString()) {
  const summary = { at, event: "job_result", job, exitStatus: result?.exitStatus ?? 0 };

  if (result && typeof result === "object") {
    const counts = {};
    for (const [key, value] of Object.entries(result)) {
      if (Array.isArray(value)) counts[key] = value.length;
    }
    if (Object.keys(counts).length) summary.counts = counts;
    for (const key of ["status", "state", "reason", "claimed", "issue"]) {
      if (typeof result[key] === "string" || typeof result[key] === "number" || typeof result[key] === "boolean") {
        summary[key] = result[key];
      }
    }
  }

  return JSON.stringify(summary);
}

export function formatResult(job, result, options = {}) {
  return shouldPrintFullResult(options) ? JSON.stringify(result, null, 2) : summarizeResult(job, result);
}
