import "server-only";

import { createHash, randomBytes } from "crypto";

export function createManageToken() {
  return randomBytes(32).toString("base64url");
}

export function hashManageToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
