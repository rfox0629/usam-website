"use client";

import { GroupHomeMemberView } from "@/app/groups/GroupHomeMemberView";
import { buildLeaderPreviewPortalData, type LeaderPreviewInput } from "@/src/lib/groups/member-preview";

/**
 * "Preview {First}'s Experience" — the leader-side window onto a participant's
 * Group Home.
 *
 * USA-170: this used to be a second, hand-built black/gold mock of Group Home.
 * It now renders the same `GroupHomeMemberView` the participant's real secure
 * link renders, from the same `GroupMemberPortalData` shape, so the two cannot
 * drift. The only thing this file owns is the read-only preview frame around it.
 *
 * Read-only is enforced in the shared view (`readOnly`): no sign-out, no
 * navigation into the participant's Journey, no reads or writes of their stored
 * install state. Nothing here mints a token, claims a session, or touches
 * participant data — the preview is a projection of what the leader already has
 * loaded.
 */

type MemberGroupHomePreviewProps = LeaderPreviewInput & {
  onClose: () => void;
};

export function MemberGroupHomePreview({ onClose, ...input }: MemberGroupHomePreviewProps) {
  const data = buildLeaderPreviewPortalData(input);
  const firstName = input.member.personName.trim().split(/\s+/)[0] || input.member.personName;

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#DCEBFF] bg-white shadow-[0_18px_44px_rgba(37,99,235,0.10)]">
      <div className="border-b border-[#EAF2FF] bg-[#F8FBFF] px-4 py-3">
        {/* Wraps at 390px: the heading column shrinks, the action never clips. */}
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 basis-full min-[420px]:basis-auto">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">Preview Mode</p>
            <h3 className="mt-1 text-lg font-black leading-tight text-[#0F172A]">{firstName}&apos;s Group Home</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#64748B]">
              Exactly what {firstName} sees on their secure link.{" "}
              {/* Kept on one line: the read-only promise is asserted verbatim by
                  scripts/dos-group-member-portal-regression.mjs. */}
              <span>Read-only — no progress, private responses, token, or onboarding state changes.</span>
            </p>
          </div>
          <button
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-bold text-[#1D4ED8] transition-colors hover:bg-[#EBF2FF]"
            onClick={onClose}
            type="button"
          >
            Close Preview
          </button>
        </div>
      </div>

      {/* The participant page is a full page. Scroll it inside the frame rather
          than letting it push the leader's sheet off screen. */}
      <div className="max-h-[70vh] overflow-y-auto overscroll-contain">
        <GroupHomeMemberView data={data} readOnly />
      </div>
    </article>
  );
}
