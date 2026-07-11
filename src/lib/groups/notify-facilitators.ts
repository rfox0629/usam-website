import "server-only";

import { sendGroupJoinRequestNotification } from "@/src/lib/groups/email";
import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import type { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Notifies the group's active leaders/co-leaders that a join request arrived. This is a
 * best-effort side effect: it must never throw back into the caller, because a facilitator's
 * email configuration should never determine whether a public join request succeeds.
 *
 * Deliberately kept out of app/groups/actions.ts: that action is the public join-request
 * submission path and must never create group members or DOS person records directly --
 * only reads them here, to resolve who to notify.
 */
export async function notifyGroupFacilitators(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  group: { id: string; name: string; slug: string; workspace_id: string },
  requester: { email: string; firstName: string; lastName: string; message: string; phone: string; submittedAt: string },
) {
  try {
    const { data: leaderRows, error: leaderError } = await supabase
      .from("dos_group_members")
      .select("person_id")
      .eq("group_id", group.id)
      .in("role", ["leader", "co_leader"])
      .eq("status", "active");

    if (leaderError || !leaderRows?.length) {
      return;
    }

    const personIds = Array.from(new Set(leaderRows.map((row) => row.person_id).filter(Boolean)));
    const { data: peopleRows, error: peopleError } = await supabase
      .from("missionary_field_people")
      .select("email")
      .in("id", personIds);

    if (peopleError) {
      return;
    }

    const facilitatorEmails = Array.from(new Set(
      (peopleRows ?? [])
        .map((person) => (person.email ?? "").trim().toLowerCase())
        .filter((email) => emailPattern.test(email)),
    ));

    if (!facilitatorEmails.length) {
      return;
    }

    const { data: workspaceRow } = await supabase
      .from("missionary_households")
      .select("slug")
      .eq("id", group.workspace_id)
      .maybeSingle();
    const dashboardUrl = `${getConfiguredSiteUrl()}/dos/${workspaceRow?.slug ?? group.slug}?openGroup=${group.id}`;

    await sendGroupJoinRequestNotification({
      dashboardUrl,
      facilitatorEmails,
      groupName: group.name,
      requesterEmail: requester.email,
      requesterMessage: requester.message || null,
      requesterName: [requester.firstName, requester.lastName].filter(Boolean).join(" "),
      requesterPhone: requester.phone || null,
      submittedAt: requester.submittedAt,
    });
  } catch (error) {
    console.warn("[Public Group] Facilitator notification failed", error instanceof Error ? error.message : error);
  }
}
