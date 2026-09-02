import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";

const DEFAULT_CHUNK_BYTES = 64 * 1024;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

function countNewlines(buffer) {
  let count = 0;
  for (const byte of buffer) {
    if (byte === 10) count += 1;
  }
  return count;
}

export function tailLines(path, maxLines = 200, options = {}) {
  if (!existsSync(path) || maxLines <= 0) {
    return [];
  }

  const stat = statSync(path);
  if (stat.size === 0) {
    return [];
  }

  const chunkBytes = Math.max(1024, Number(options.chunkBytes || DEFAULT_CHUNK_BYTES));
  const maxBytes = Math.max(chunkBytes, Number(options.maxBytes || DEFAULT_MAX_BYTES));
  const fd = openSync(path, "r");
  const chunks = [];
  let position = stat.size;
  let bytesReadTotal = 0;
  let newlineCount = 0;

  try {
    while (position > 0 && bytesReadTotal < maxBytes && newlineCount <= maxLines) {
      const bytesToRead = Math.min(chunkBytes, position, maxBytes - bytesReadTotal);
      position -= bytesToRead;
      const buffer = Buffer.allocUnsafe(bytesToRead);
      const bytesRead = readSync(fd, buffer, 0, bytesToRead, position);
      const chunk = bytesRead === bytesToRead ? buffer : buffer.subarray(0, bytesRead);
      chunks.unshift(chunk);
      bytesReadTotal += bytesRead;
      newlineCount += countNewlines(chunk);
      if (bytesRead === 0) break;
    }
  } finally {
    closeSync(fd);
  }

  if (chunks.length === 0) {
    return [];
  }

  let text = Buffer.concat(chunks).toString("utf8");
  if (position > 0) {
    const firstNewline = text.indexOf("\n");
    text = firstNewline >= 0 ? text.slice(firstNewline + 1) : "";
  }

  return text.trim().split(/\r?\n/).filter(Boolean).slice(-maxLines);
}
