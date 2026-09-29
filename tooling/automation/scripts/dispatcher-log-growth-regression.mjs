// Regression for the 2026-09-29 disk-full incident: per-poll events and the
// launcher's full result must not be written on every 30-second pass.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRepeatSuppressor, DEFAULT_REPEAT_WINDOW_MS } from "../src/event-dedupe.mjs";
import { formatResult, shouldPrintFullResult, summarizeResult } from "../src/replacement/shared/result-output.mjs";

let clock = 1_000_000;
const now = () => clock;

{
  const gate = createRepeatSuppressor({ now });
  assert.equal(gate.shouldEmit("ineligible:USA-5", "Ready|deprecated label"), true, "first sighting is written");
  clock += 30_000;
  assert.equal(gate.shouldEmit("ineligible:USA-5", "Ready|deprecated label"), false, "unchanged 30s later is suppressed");
  assert.equal(gate.shouldEmit("ineligible:USA-5", "Done|deprecated label"), true, "a changed state is written");
  assert.equal(gate.shouldEmit("ineligible:USA-6", "Ready|deprecated label"), true, "keys are independent");
  clock += DEFAULT_REPEAT_WINDOW_MS;
  assert.equal(gate.shouldEmit("ineligible:USA-5", "Done|deprecated label"), true, "re-emitted once the window passes");
}

{
  // State survives the fresh process each poll runs in.
  const first = createRepeatSuppressor({ now });
  first.shouldEmit("stalled:poll_stale:", "stale");
  const persisted = JSON.parse(JSON.stringify(first.toState()));
  clock += 30_000;
  const second = createRepeatSuppressor({ now, state: persisted });
  assert.equal(second.shouldEmit("stalled:poll_stale:", "stale"), false, "persisted state suppresses the repeat");
  assert.equal(second.isDirty(), false, "a suppressed repeat does not rewrite state");
}

{
  // 67 unchanged candidates polled for an hour: one write each, not 120.
  const gate = createRepeatSuppressor({ now });
  let writes = 0;
  for (let poll = 0; poll < 119; poll += 1) {
    for (let issue = 0; issue < 67; issue += 1) {
      if (gate.shouldEmit(`ineligible:USA-${issue}`, "Ready|reason")) writes += 1;
    }
    clock += 30_000;
  }
  assert.equal(writes, 67);
}

{
  const big = { exitStatus: 0, events: new Array(500).fill({ x: "y".repeat(200) }), holds: [1, 2, 3], status: "idle" };
  assert.equal(shouldPrintFullResult({ isTTY: false, env: {} }), false);
  assert.equal(shouldPrintFullResult({ isTTY: true }), true);
  assert.equal(shouldPrintFullResult({ flag: true }), true);
  assert.equal(shouldPrintFullResult({ env: { USAM_PRINT_RESULT: "1" } }), true);
  const line = formatResult("launcher", big, { isTTY: false, env: {} });
  assert.ok(!line.includes("\n"), "unattended output is a single line");
  assert.ok(line.length < 300, `summary stays small (got ${line.length})`);
  const parsed = JSON.parse(line);
  assert.deepEqual(parsed.counts, { events: 500, holds: 3 });
  assert.equal(parsed.status, "idle");
  assert.ok(formatResult("launcher", big, { isTTY: true }).length > 100_000, "a TTY still gets the full result");
  assert.ok(summarizeResult("launcher", null).includes('"exitStatus":0'));
}

{
  const cli = readFileSync(new URL("../src/replacement/cli.mjs", import.meta.url), "utf8");
  assert.ok(!/console\.log\(JSON\.stringify\(result, null, 2\)\)/.test(cli), "cli no longer pretty-prints every result");
  const dispatcher = readFileSync(new URL("../src/dispatcher.mjs", import.meta.url), "utf8");
  assert.ok(dispatcher.includes('shouldWriteRepeatedEvent(`ineligible:${issue.identifier}`'), "poll loop gates ineligible events");
  assert.ok(dispatcher.includes("shouldWriteRepeatedEvent(`stalled:${alert.code}"), "health snapshot gates repeated stall events");
}

console.log("dispatcher log growth regression passed");
