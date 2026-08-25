"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, X } from "lucide-react";
import { GroupHomeMemberView } from "@/app/groups/GroupHomeMemberView";
import { GroupJourneyView, type GroupJourneyPreviewDraft } from "@/app/groups/GroupJourneyView";
import { publicGroupPath } from "@/src/lib/groups/public-site-path";
import { getDosResourceBySlug } from "@/src/lib/dos/resource-catalog";
import { buildLeaderPreviewPortalData, type LeaderPreviewInput } from "@/src/lib/groups/member-preview";

/**
 * "Preview as Member" — the leader's QA window onto a participant's scoped
 * experience (USA-170).
 *
 * One DOS experience, permission-scoped: this overlay renders the exact shared
 * member components — `GroupHomeMemberView` and `GroupJourneyView` — that the
 * participant's real secure link renders, and lets the leader click through
 * the real flow: Group Home → current Journey → week → response fields →
 * save → return → reopen.
 *
 * Three promises this file keeps:
 *
 * 1. No second participant implementation. It composes the shared components;
 *    it draws only the preview frame.
 * 2. Nothing is saved. Journey "saves" land in this overlay's memory (drafts
 *    survive within the preview session so save → return → reopen works) and
 *    are discarded on exit. No fetch, no token, no session, no writes. The
 *    participant's private responses are never shown — the leader-side
 *    projection carries completion state only.
 * 3. Permission realism. The overlay covers the whole app, so no leader tools,
 *    People, Reports, or DOS navigation exist inside the preview — only the
 *    unmistakable preview bar.
 */

type MemberGroupHomePreviewProps = LeaderPreviewInput & {
  onClose: () => void;
};

type PreviewScreen = { view: "home" } | { assignmentId: string; view: "journey" };

export function MemberGroupHomePreview({ onClose, ...input }: MemberGroupHomePreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [screen, setScreen] = useState<PreviewScreen>({ view: "home" });
  const [drafts, setDrafts] = useState<Record<string, Record<string, GroupJourneyPreviewDraft>>>({});

  useEffect(() => setMounted(true), []);

  // The preview owns the viewport while open; the leader app must not scroll
  // underneath it.
  useEffect(() => {
    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const data = buildLeaderPreviewPortalData(input);
  const firstName = input.member.personName.trim().split(/\s+/)[0] || input.member.personName;
  const groupPath = publicGroupPath(data.group.slug);

  const journeyAssignment = screen.view === "journey"
    ? data.journeyAssignments.find((assignment) => assignment.id === screen.assignmentId) ?? null
    : null;
  const journeyResource = journeyAssignment ? getDosResourceBySlug(journeyAssignment.resourceSlug) : null;
  // Completion state only. Reflections/action steps/prayer stay null in the
  // leader projection by design: a preview must never expose the member's
  // private responses.
  const journeyProgress = screen.view === "journey"
    ? data.journeyProgress.filter((item) => item.assignmentId === screen.assignmentId)
    : [];

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div aria-label={`Preview as Member: ${input.member.personName}`} className="fixed inset-0 z-[90] flex flex-col bg-[#F8FBFF]" role="dialog">
      {/* The unmistakable preview indicator: always visible, never part of the
          participant page itself, so leader QA cannot be mistaken for the
          member's live activity. */}
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[#BFDBFE] bg-[#EBF2FF] px-3 sm:px-4">
        <p className="flex min-w-0 items-center gap-2 text-xs font-bold text-[#1D4ED8]">
          <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" strokeWidth={2} />
          <span className="truncate">
            Preview as Member · {firstName}&apos;s view — nothing you do here is saved
          </span>
        </p>
        <button
          className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-bold text-[#1D4ED8] transition-colors hover:bg-white/70"
          onClick={onClose}
          type="button"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
          Exit Preview
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {screen.view === "journey" && journeyResource ? (
          <GroupJourneyView
            assignment={journeyAssignment}
            groupName={data.group.name}
            groupPath={groupPath}
            groupSlug={data.group.slug}
            key={screen.assignmentId}
            preview={{
              drafts: drafts[screen.assignmentId] ?? {},
              onDraftChange: (sessionId, draft) => setDrafts((current) => ({
                ...current,
                [screen.assignmentId]: { ...current[screen.assignmentId], [sessionId]: draft },
              })),
              onNavigateToGroup: () => setScreen({ view: "home" }),
            }}
            progress={journeyProgress}
            resource={journeyResource}
            state={null}
          />
        ) : (
          <GroupHomeMemberView
            data={data}
            onOpenJourney={(assignmentId) => setScreen({ assignmentId, view: "journey" })}
            readOnly
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
