export const demoGroupMemberAccessTokenPrefix = "demo_group_member_access.";
export const demoGroupMemberSessionTokenPrefix = "demo_group_member_session.";

export type DemoGroupMemberAccessPayload = {
  completedSessionIds?: string[];
  expiresAt: string;
  groupId: string;
  groupName: string;
  groupSlug: string;
  identityId: string;
  memberId: string;
  personId: string;
  personName: string;
  resourceSlug: string;
  startDate: string;
};

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function parseDemoPayload(value: string): DemoGroupMemberAccessPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<DemoGroupMemberAccessPayload>;

    if (
      typeof parsed.expiresAt !== "string"
      || typeof parsed.groupId !== "string"
      || typeof parsed.groupName !== "string"
      || typeof parsed.groupSlug !== "string"
      || typeof parsed.identityId !== "string"
      || typeof parsed.memberId !== "string"
      || typeof parsed.personId !== "string"
      || typeof parsed.personName !== "string"
      || typeof parsed.resourceSlug !== "string"
      || typeof parsed.startDate !== "string"
    ) {
      return null;
    }

    const completedSessionIds = Array.isArray(parsed.completedSessionIds)
      ? parsed.completedSessionIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];

    return {
      completedSessionIds,
      expiresAt: parsed.expiresAt,
      groupId: parsed.groupId,
      groupName: parsed.groupName,
      groupSlug: parsed.groupSlug,
      identityId: parsed.identityId,
      memberId: parsed.memberId,
      personId: parsed.personId,
      personName: parsed.personName,
      resourceSlug: parsed.resourceSlug,
      startDate: parsed.startDate,
    };
  } catch {
    return null;
  }
}

export function buildDemoGroupMemberAccessToken(payload: DemoGroupMemberAccessPayload) {
  return `${demoGroupMemberAccessTokenPrefix}${encodeBase64Url(JSON.stringify(payload))}`;
}

export function buildDemoGroupMemberSessionToken(payload: DemoGroupMemberAccessPayload) {
  return `${demoGroupMemberSessionTokenPrefix}${encodeBase64Url(JSON.stringify(payload))}`;
}

export function parseDemoGroupMemberAccessToken(token: string | null | undefined) {
  const value = token?.trim() ?? "";

  if (!value.startsWith(demoGroupMemberAccessTokenPrefix)) {
    return null;
  }

  try {
    return parseDemoPayload(decodeBase64Url(value.slice(demoGroupMemberAccessTokenPrefix.length)));
  } catch {
    return null;
  }
}

export function parseDemoGroupMemberSessionToken(token: string | null | undefined) {
  const value = token?.trim() ?? "";

  if (!value.startsWith(demoGroupMemberSessionTokenPrefix)) {
    return null;
  }

  try {
    return parseDemoPayload(decodeBase64Url(value.slice(demoGroupMemberSessionTokenPrefix.length)));
  } catch {
    return null;
  }
}
