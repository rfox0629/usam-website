import { permanentRedirect } from "next/navigation";
import { morRoutes } from "@/src/lib/mission-of-reconciliation/brand";

/**
 * The restoration intake used to sit behind a per-invitation token. It is now a
 * public front door at /restoration, so any older invitation link lands there
 * instead of 404ing.
 */
export default async function RestorationInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await params;

  permanentRedirect(morRoutes.restoration);
}
