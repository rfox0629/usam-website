import "server-only";

import { sendGroupAccessRecoveryNotification } from "@/src/lib/groups/email";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * USA-170 — tells a Group's leaders that a member is locked out and needs a
 * fresh secure link.
 *
 * Two rules this exists to enforce:
 *
 * 1. It mints and revokes nothing. The previous recovery path revoked the
 *    member's active token on every press, which is how a participant could
 *    destroy the very link his leader had just texted him.
 * 2. It reports whether the notification actually went out. The caller uses
 *    that to decide between "Request sent to Ryan" and a message that does not
 *    claim delivery — the founder's rule that we never say a request was sent
 *    when the system only performed a lookup.
 *
 * Best-effort by design: a leader's mail configuration must not turn into an
 * error on the participant's screen, so failures are logged and reported as
 * undelivered rather than thrown.
 */
export async function notifyGroupAccessRecovery(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  group: { id: string; name: string; slug: string; workspace_id: string },
  request: { memberName: string; requestedAt: string },
): Promise<boolean> {
  try {
    const { data: leaderRows, error: leaderError } = await supabase
      .from("dos_group_members")
      .select("person_id")
      .eq("group_id", group.id)
      .in("role", ["leader", "co_leader"])
      .eq("status", "active");

    if (leaderError || !leaderRows?.length) {
      return false;
    }

    const personIds = Array.from(new Set(leaderRows.map((row) => row.person_id).filter(Boolean)));
    const { data: peopleRows, error: peopleError } = await supabase
      .from("missionary_field_people")
      .select("email")
      .in("id", personIds);

    if (peopleError) {
      return false;
    }

    const leaderEmails = Array.from(new Set(
      (peopleRows ?? [])
        .map((person) => (person.email ?? "").trim().toLowerCase())
        .filter((email) => emailPattern.test(email)),
    ));

    if (!leaderEmails.length) {
      return false;
    }

    const { data: workspaceRow } = await supabase
      .from("missionary_households")
      .select("slug")
      .eq("id", group.workspace_id)
      .maybeSingle();
    const dashboardUrl = `${getConfiguredSiteUrl()}/dos/${workspaceRow?.slug ?? group.slug}?openGroup=${group.id}`;

    const result = await sendGroupAccessRecoveryNotification({
      dashboardUrl,
      groupName: group.name,
      leaderEmails,
      memberName: request.memberName,
      requestedAt: request.requestedAt,
    });

    return result.status === "sent";
  } catch (error) {
    console.warn("[Group Member Access] Recovery notification failed", error instanceof Error ? error.message : error);

    return false;
  }
}
