const fallbackPublicMissionaryBaseUrl = "https://new.usamissionaries.org";

export function getPublicMissionaryBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");

  if (!configuredUrl || configuredUrl.includes("localhost")) {
    return fallbackPublicMissionaryBaseUrl;
  }

  return configuredUrl;
}

export function getPublicMissionaryProfileUrl(slug: string) {
  return `${getPublicMissionaryBaseUrl()}/missionaries/${slug}`;
}
