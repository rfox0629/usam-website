const canonicalProductionSiteUrl = "https://usamissionaries.org";

const siteUrlEnvKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_BASE_URL",
  "SITE_URL",
  "APP_URL",
] as const;

function normalizeUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  return url.replace(/\/+$/, "");
}

function isLocalUrl(value: string) {
  try {
    const url = new URL(value);

    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getCanonicalSiteUrl() {
  return canonicalProductionSiteUrl;
}

export function getConfiguredSiteUrl({ allowLocalhost = false } = {}) {
  for (const envKey of siteUrlEnvKeys) {
    const url = normalizeUrl(process.env[envKey]);

    if (url && (allowLocalhost || !isLocalUrl(url))) {
      return url;
    }
  }

  return canonicalProductionSiteUrl;
}
