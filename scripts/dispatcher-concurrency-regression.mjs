import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["--test", "automation/dispatcher/test/dispatcher-concurrency.test.mjs"], {
  encoding: "utf8",
  stdio: "inherit",
});

process.exitCode = result.status ?? 1;
