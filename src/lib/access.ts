import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const USAM_ACCESS_COOKIE_NAME = "usam_access";
export const USAM_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type AccessPayload = {
  email?: string;
  exp: number;
  iat: number;
  jti: string;
  scope: "all";
  source: "system" | "team";
  sub?: string;
  v: 1;
};

type AccessCodeType = "preview" | "system" | "team";

type SystemAccessCodeRow = {
  code: string;
  code_type: AccessCodeType;
  is_active: boolean;
};

export type AccessCookieOptions = {
  httpOnly: true;
  maxAge: number;
  path: string;
  sameSite: "lax";
  secure: boolean;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getTokenSecret() {
  return process.env.USAM_ACCESS_TOKEN_SECRET
    || process.env.SYSTEM_ACCESS_TOKEN_SECRET
    || process.env.USAM_SYSTEM_ACCESS_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SYSTEM_ACCESS_CODE
    || process.env.USAM_SYSTEM_PREVIEW_CODE
    || null;
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeCompare(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function readCodes(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
}

function codeMatches(input: string, code: string) {
  const inputBuffer = Buffer.from(input);
  const codeBuffer = Buffer.from(code);

  return inputBuffer.length === codeBuffer.length && timingSafeEqual(inputBuffer, codeBuffer);
}

function accessCodeTypesForSource(source: "system" | "team"): AccessCodeType[] {
  return source === "team" ? ["team"] : ["system", "preview"];
}

function getEnvAccessCodes(source: "system" | "team") {
  const sharedCodes = [
    ...readCodes(process.env.USAM_ACCESS_CODE),
    ...readCodes(process.env.USAM_ACCESS_CODES),
  ];

  if (source === "team") {
    return [
      ...sharedCodes,
      ...readCodes(process.env.USAM_TEAM_ACCESS_CODE),
      ...readCodes(process.env.USAM_TEAM_ACCESS_CODES),
      ...readCodes(process.env.USAM_SYSTEM_PREVIEW_CODE),
    ];
  }

  return [
    ...sharedCodes,
    ...readCodes(process.env.SYSTEM_ACCESS_CODE),
    ...readCodes(process.env.SYSTEM_ACCESS_CODES),
    ...readCodes(process.env.USAM_SYSTEM_ACCESS_CODE),
    ...readCodes(process.env.USAM_SYSTEM_PREVIEW_CODE),
  ];
}

function isMissingSystemAccessCodesTable(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  return code === "42P01"
    || code === "PGRST205"
    || message.includes("system_access_codes")
    || message.includes("schema cache")
    || message.includes("does not exist");
}

async function getStoredAccessCodes(source: "system" | "team") {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("system_access_codes")
    .select("code, code_type, is_active")
    .in("code_type", accessCodeTypesForSource(source))
    .eq("is_active", true);

  if (error) {
    if (!isMissingSystemAccessCodesTable(error)) {
      console.error("System access code lookup failed:", error.message);
    }

    return null;
  }

  return ((data ?? []) as SystemAccessCodeRow[])
    .filter((row) => row.is_active && row.code.trim())
    .map((row) => row.code.trim());
}

export async function isValidAccessCode(input: string, source: "system" | "team") {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return false;
  }

  const storedCodes = await getStoredAccessCodes(source);
  const codes = storedCodes && storedCodes.length > 0
    ? storedCodes
    : getEnvAccessCodes(source);

  return codes.some((code) => codeMatches(trimmedInput, code));
}

export function accessCookieOptions(): AccessCookieOptions {
  return {
    httpOnly: true,
    maxAge: USAM_ACCESS_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export function createAccessToken({
  email,
  name,
  source,
}: {
  email?: string | null;
  name?: string | null;
  source: "system" | "team";
}) {
  const secret = getTokenSecret();

  if (!secret) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: AccessPayload = {
    email: email?.trim().toLowerCase() || undefined,
    exp: now + USAM_ACCESS_MAX_AGE_SECONDS,
    iat: now,
    jti: randomUUID(),
    scope: "all",
    source,
    sub: name?.trim() || undefined,
    v: 1,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token: string | undefined | null) {
  const secret = getTokenSecret();

  if (!secret || !token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return false;
  }

  if (!safeCompare(sign(encodedPayload, secret), signature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AccessPayload>;
    const now = Math.floor(Date.now() / 1000);

    return payload.v === 1
      && payload.scope === "all"
      && typeof payload.exp === "number"
      && payload.exp > now;
  } catch {
    return false;
  }
}
