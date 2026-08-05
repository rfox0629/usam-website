import { redirect } from "next/navigation";

// USA-138: these legacy routes used to drop the record id, so
// /dos/<workspace>/people/<personId> and /dos/<workspace>/meetings/<meetingId>
// both landed on the dashboard instead of the record that was linked. The id is
// now forwarded as a query param that the DOS app resolves on load.
export function redirectLegacyDosRoute(collectiveSlug: string, query?: Record<string, string>): never {
  const entries = Object.entries(query ?? {}).filter(([, value]) => Boolean(value));
  const search = entries.length ? `?${new URLSearchParams(Object.fromEntries(entries)).toString()}` : "";

  redirect(`/dos/${encodeURIComponent(collectiveSlug)}${search}`);
}
