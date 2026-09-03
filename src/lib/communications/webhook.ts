import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

type VerifyResendWebhookInput = {
  headers: Headers;
  now?: Date;
  payload: string;
  secret: string;
};

function getRequiredHeader(headers: Headers, name: string) {
  const value = headers.get(name);

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function decodedSvixSecret(secret: string) {
  const normalizedSecret = secret.trim();
  const secretBody = normalizedSecret.startsWith("whsec_")
    ? normalizedSecret.slice("whsec_".length)
    : normalizedSecret;

  if (!secretBody) {
    throw new Error("Missing webhook secret body.");
  }

  return Buffer.from(secretBody, "base64");
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function verifyResendWebhook({
  headers,
  now = new Date(),
  payload,
  secret,
}: VerifyResendWebhookInput) {
  const svixId = getRequiredHeader(headers, "svix-id");
  const svixTimestamp = getRequiredHeader(headers, "svix-timestamp");
  const svixSignature = getRequiredHeader(headers, "svix-signature");
  const timestamp = Number(svixTimestamp);

  if (!Number.isFinite(timestamp)) {
    throw new Error("Invalid webhook timestamp.");
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  const toleranceSeconds = 5 * 60;

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    throw new Error("Webhook timestamp outside tolerance.");
  }

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", decodedSvixSecret(secret))
    .update(signedContent)
    .digest("base64");
  const hasMatchingSignature = svixSignature
    .split(" ")
    .some((signature) => {
      const [version, value] = signature.split(",", 2);

      return version === "v1" && Boolean(value) && safeCompare(value, expectedSignature);
    });

  if (!hasMatchingSignature) {
    throw new Error("No matching webhook signature.");
  }

  return JSON.parse(payload) as Record<string, unknown>;
}
