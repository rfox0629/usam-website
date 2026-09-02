import assert from "node:assert/strict";
import {
  closeSync,
  ftruncateSync,
  mkdtempSync,
  openSync,
  rmSync,
  writeFileSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tailLines } from "../src/dispatcher-log-tail.mjs";

const dir = mkdtempSync(join(tmpdir(), "usam-log-tail-"));

try {
  const small = join(dir, "small.jsonl");
  writeFileSync(small, "one\ntwo\nthree\n");
  assert.deepEqual(tailLines(small, 2), ["two", "three"]);

  const large = join(dir, "large.jsonl");
  const fd = openSync(large, "w+");
  const suffix = "\nold\nlatest-a\nlatest-b\n";
  const size = 600 * 1024 * 1024;
  try {
    ftruncateSync(fd, size);
    writeSync(fd, suffix, size - Buffer.byteLength(suffix), "utf8");
  } finally {
    closeSync(fd);
  }

  assert.deepEqual(tailLines(large, 2), ["latest-a", "latest-b"]);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
