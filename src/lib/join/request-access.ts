import "server-only";

import { isJoinPreviewTokenValid, JOIN_PREVIEW_COOKIE_NAME } from "@/src/lib/join/preview-access";

/**
 * USA-167: one preview-gate check shared by every /join endpoint.
 *
 * A gate that covers the page but not the API is not a gate. Draft saves,
 * photo uploads and submission all run through this, so switching
 * JOIN_PREVIEW_ACCESS_KEY on closes the whole surface at once.
 */
export async function requireJoinPreviewAccess(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${JOIN_PREVIEW_COOKIE_NAME}=`))
    ?.slice(JOIN_PREVIEW_COOKIE_NAME.length + 1);

  return isJoinPreviewTokenValid(cookie);
}
