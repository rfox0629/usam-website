import { getConfiguredSiteUrl } from "@/src/lib/site-url";

export function getPublicMissionaryBaseUrl() {
  return getConfiguredSiteUrl();
}

export function getPublicMissionaryProfileUrl(slug: string) {
  return `${getPublicMissionaryBaseUrl()}/missionaries/${slug}`;
}
