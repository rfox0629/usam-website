import "server-only";

import { headers } from "next/headers";
import { isMissionHostname, missionPathsFor, type MissionPaths } from "./domain";

/**
 * Reads the request host so links render host-native. This makes the Mission of
 * Reconciliation routes dynamic rather than prerendered, which is the tradeoff
 * for the same pages serving correctly on both hosts while the custom domain is
 * verified and the legacy redirect stays off.
 */
export async function getMissionPaths(): Promise<MissionPaths> {
  const headerList = await headers();
  const hostname = headerList.get("x-forwarded-host") ?? headerList.get("host");

  return missionPathsFor(isMissionHostname(hostname));
}
