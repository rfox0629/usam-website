import { redirect } from "next/navigation";

export function redirectLegacyDosRoute(collectiveSlug: string, query?: Record<string, string>): never {
  const search = query ? `?${new URLSearchParams(query).toString()}` : "";
  redirect(`/dos/${encodeURIComponent(collectiveSlug)}${search}`);
}
