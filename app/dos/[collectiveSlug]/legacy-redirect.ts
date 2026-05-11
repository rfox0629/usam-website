import { redirect } from "next/navigation";

export function redirectLegacyDosRoute(collectiveSlug: string): never {
  redirect(`/dos/app?workspace=${encodeURIComponent(collectiveSlug)}`);
}
