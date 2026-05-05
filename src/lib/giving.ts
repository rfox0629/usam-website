export const DEFAULT_GIVING_URL = "https://usa-missionaries-506166.churchcenter.com/giving";

export type GivingType = "monthly" | "onetime";

export function getGivingUrl(overrideUrl: string | null | undefined, type: GivingType) {
  const trimmedUrl = overrideUrl?.trim();

  if (trimmedUrl) {
    return trimmedUrl;
  }

  const url = new URL(DEFAULT_GIVING_URL);
  url.searchParams.set("type", type);

  return url.toString();
}
