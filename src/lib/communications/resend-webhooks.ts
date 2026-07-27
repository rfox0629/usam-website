import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const svixToleranceSeconds = 60 * 5;

function decodeWebhookSecret(secret: string) {
  const value = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;

  return Buffer.from(value, "base64");
}

function signatureCandidates(headerValue: string) {
  return headerValue
    .split(" ")
    .flatMap((part) => {
      const [version, signature] = part.split(",");

      return version === "v1" && signature ? [signature] : [];
    });
}

function safeCompareBase64(expected: string, actual: string) {
  let expectedBuffer: Buffer;
  let actualBuffer: Buffer;

  try {
    expectedBuffer = Buffer.from(expected, "base64");
    actualBuffer = Buffer.from(actual, "base64");
  } catch {
    return false;
  }

  return expectedBuffer.length === actualBuffer.length
    && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function verifyResendWebhookSignature(input: {
  id: string | null;
  payload: string;
  secret: string | undefined;
  signature: string | null;
  timestamp: string | null;
}) {
  if (!input.secret?.trim()) {
    return {
      ok: false,
      reason: "missing_secret",
    };
  }

  if (!input.id || !input.timestamp || !input.signature) {
    return {
      ok: false,
      reason: "missing_headers",
    };
  }

  const timestampSeconds = Number(input.timestamp);

  if (!Number.isFinite(timestampSeconds)) {
    return {
      ok: false,
      reason: "invalid_timestamp",
    };
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);

  if (ageSeconds > svixToleranceSeconds) {
    return {
      ok: false,
      reason: "stale_timestamp",
    };
  }

  let secret: Buffer;

  try {
    secret = decodeWebhookSecret(input.secret.trim());
  } catch {
    return {
      ok: false,
      reason: "invalid_secret",
    };
  }

  const signedPayload = `${input.id}.${input.timestamp}.${input.payload}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("base64");
  const verified = signatureCandidates(input.signature).some((candidate) => (
    safeCompareBase64(expected, candidate)
  ));

  return verified
    ? { ok: true as const }
    : { ok: false as const, reason: "invalid_signature" };
}
