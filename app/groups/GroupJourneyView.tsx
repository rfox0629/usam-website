"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { DosResource } from "@/src/lib/dos/resource-catalog";
import {
  GuidedJourneyChapterContent,
  GuidedJourneyProgress,
  GuidedJourneyResponseField,
  GuidedJourneyResponses,
  GuidedJourneySessionSelector,
  guidedJourneyActionHelper,
  guidedJourneyPrayerHelper,
  guidedJourneyReflectionHelper,
  type GuidedJourneyUnitLabel,
} from "@/src/components/dos/GuidedJourneyUi";
import { VoiceTextarea } from "@/src/components/dos/VoiceTextarea";
import { saveGroupMemberJourneyProgress } from "./[slug]/member/actions";

type JourneyAssignment = {
  completedAt: string | null;
  dueDate: string | null;
  id: string;
  personalMessage: string | null;
  resourceSlug: string;
  startDate: string;
  status: string;
} | null;

type JourneyProgress = {
  actionStep: string | null;
  completedAt: string | null;
  id: string;
  prayerFocus: string | null;
  reflection: string | null;
  resourceSlug: string;
  sessionId: string;
  updatedAt: string | null;
};

/**
 * USA-170 Preview as Member: the leader QA overlay renders this exact
 * component. In preview, saving never reaches the server action — responses
 * live in the overlay's memory (`drafts`), so Tanner's real progress and
 * private responses cannot be touched — and the Group link becomes a callback
 * so navigation stays inside the preview.
 */
export type GroupJourneyPreviewDraft = {
  actionStep: string;
  completed: boolean;
  prayerFocus: string;
  reflection: string;
};

type GroupJourneyPreviewMode = {
  drafts: Record<string, GroupJourneyPreviewDraft>;
  onDraftChange: (sessionId: string, draft: GroupJourneyPreviewDraft) => void;
  onNavigateToGroup: () => void;
};

type GroupJourneyViewProps = {
  assignment: JourneyAssignment;
  groupName: string;
  groupPath: string;
  groupSlug: string;
  otherResourceSlugs: string[];
  preview?: GroupJourneyPreviewMode;
  progress: JourneyProgress[];
  resource: DosResource;
  state: string | null;
};

/**
 * Same borderless treatment as the full DOS Journey textarea — the bordered
 * box comes from the shared GuidedJourneyResponseField. 16px so mobile Safari
 * does not zoom the page on focus.
 */
const memberJourneyTextarea =
  "min-h-[86px] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[16px] leading-[1.55] text-[#475569] outline-none placeholder:text-[#94A3B8] focus:ring-0";

function journeyStateMessage(state: string | null) {
  switch (state) {
    case "journey-completed":
      return "Marked complete. Great work.";
    case "journey-error":
      return "That could not be saved. Try again.";
    case "journey-saved":
      return "Saved. You can come back and finish this any time.";
    default:
      return "";
  }
}

export function GroupJourneyView({
  assignment,
  groupName,
  groupPath,
  groupSlug,
  otherResourceSlugs,
  preview,
  progress,
  resource,
  state,
}: GroupJourneyViewProps) {
  const isReadingPlan = resource.type === "reading_plan";
  const unitLabel: GuidedJourneyUnitLabel = isReadingPlan ? "Day" : "Week";
  const sessions = resource.content?.guidedResource?.sessions ?? [];
  const progressBySession = useMemo(() => {
    const map = new Map<string, JourneyProgress>();

    for (const item of progress) {
      map.set(item.sessionId, item);
    }

    return map;
  }, [progress]);
  // Preview drafts sit on top of real progress so a leader can exercise the
  // complete/reopen states without a single write leaving the overlay.
  const isSessionDone = (sessionId: string) =>
    Boolean(progressBySession.get(sessionId)?.completedAt) || Boolean(preview?.drafts[sessionId]?.completed);
  const completedCount = sessions.filter((session) => isSessionDone(session.id)).length;
  const firstOpenSession = sessions.find((session) => !isSessionDone(session.id)) ?? sessions[0] ?? null;
  const [selectedSessionId, setSelectedSessionId] = useState(firstOpenSession?.id ?? sessions[0]?.id ?? "");
  const [isSessionSelectorOpen, setIsSessionSelectorOpen] = useState(false);
  const [previewState, setPreviewState] = useState<string | null>(null);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  const selectedProgress = selectedSession ? progressBySession.get(selectedSession.id) ?? null : null;
  const selectedDraft = preview && selectedSession ? preview.drafts[selectedSession.id] ?? null : null;
  const message = journeyStateMessage(preview ? previewState : state);
  const isComplete = preview
    ? Boolean(selectedDraft?.completed) || Boolean(selectedProgress?.completedAt)
    : Boolean(selectedProgress?.completedAt);
  const completedSessionIds = new Set(sessions.filter((session) => isSessionDone(session.id)).map((session) => session.id));
  const currentSessionId = firstOpenSession?.id ?? selectedSession?.id ?? "";
  const reflectionHelper = selectedSession ? guidedJourneyReflectionHelper(selectedSession, isReadingPlan) : "";
  const actionHelper = selectedSession ? guidedJourneyActionHelper(selectedSession, isReadingPlan) : "";

  /**
   * Preview save: same form, same fields, same saved/completed states — but
   * the values land in the overlay's memory instead of the server action.
   */
  function handlePreviewSubmit(event: FormEvent<HTMLFormElement>) {
    if (!preview || !selectedSession) {
      return;
    }

    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value ?? "save";
    const completed = intent === "complete" ? true : intent === "reopen" ? false : Boolean(selectedDraft?.completed);

    preview.onDraftChange(selectedSession.id, {
      actionStep: String(formData.get("actionStep") ?? ""),
      completed,
      prayerFocus: String(formData.get("prayerFocus") ?? ""),
      reflection: String(formData.get("reflection") ?? ""),
    });
    setPreviewState(intent === "complete" ? "journey-completed" : "journey-saved");
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  return (
    <main className="min-h-screen bg-[#F8FBFF] text-[#0F172A]">
      <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-28 sm:px-6 sm:py-6">
        <div className="flex items-start gap-4">
          {resource.coverImage ? (
            <img
              alt={resource.coverImage.alt}
              className="aspect-[2/3] w-20 shrink-0 rounded-lg border border-[#DCEBFF] bg-white object-cover shadow-[0_14px_34px_rgba(37,99,235,0.08)] sm:w-24"
              src={resource.coverImage.src}
            />
          ) : null}
          <div className="min-w-0">
            {preview ? (
              <button
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8] underline-offset-4 hover:underline"
                onClick={preview.onNavigateToGroup}
                type="button"
              >
                {groupName}
              </button>
            ) : (
              <Link className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]" href={groupPath}>
                {groupName}
              </Link>
            )}
            <h1 className="mt-2 text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl">{resource.title}</h1>
            {resource.author ? <p className="mt-1 text-sm font-bold text-[#64748B]">— {resource.author}</p> : null}
          </div>
        </div>

        {message ? (
          <p className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm font-bold text-[#15803D]">{message}</p>
        ) : null}

        <section className="grid gap-3">
          <GuidedJourneyProgress completedCount={completedCount} totalCount={sessions.length} themeName="light" unitLabel={unitLabel} />
          {assignment?.personalMessage ? (
            <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm leading-6 text-[#475569]">
              &ldquo;{assignment.personalMessage}&rdquo;
            </p>
          ) : null}
        </section>

        {otherResourceSlugs.length ? (
          <div className="flex flex-wrap gap-2">
            {otherResourceSlugs.map((slug) => preview ? (
              <span
                className="inline-flex min-h-9 items-center rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#475569]"
                key={slug}
              >
                Also assigned: {slug.replace(/-/g, " ")}
              </span>
            ) : (
              <Link
                className="inline-flex min-h-9 items-center rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#475569]"
                href={`${groupPath}/journey?resource=${encodeURIComponent(slug)}`}
                key={slug}
              >
                Also assigned: {slug.replace(/-/g, " ")}
              </Link>
            ))}
          </div>
        ) : null}

        {selectedSession ? (
          <GuidedJourneySessionSelector
            completedSessionIds={completedSessionIds}
            currentSessionId={currentSessionId}
            isOpen={isSessionSelectorOpen}
            onSelect={(sessionId) => {
              setSelectedSessionId(sessionId);
              setIsSessionSelectorOpen(false);
            }}
            onToggle={() => setIsSessionSelectorOpen((open) => !open)}
            selectedSession={selectedSession}
            sessions={sessions}
            themeName="light"
            unitLabel={unitLabel}
          />
        ) : null}

        {selectedSession ? (
          <section className="grid gap-3 rounded-[24px] border border-[#EAF2FF] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">{unitLabel} {selectedSession.order} of {sessions.length}</p>
              </div>
              {isComplete ? (
                <span className="inline-flex items-center rounded-full border border-[#DCEEE3] bg-[#EDF7F1] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#1F7A4D]">
                  Complete
                </span>
              ) : null}
            </div>

            <GuidedJourneyChapterContent session={selectedSession} themeName="light" unitLabel={unitLabel} />

            <form
              action={preview ? undefined : saveGroupMemberJourneyProgress}
              className="-mx-4 grid gap-1 border-t border-[#EAF2FF] pt-1"
              key={`${selectedSession.id}:${preview ? "preview" : "live"}`}
              onSubmit={preview ? handlePreviewSubmit : undefined}
            >
              <input name="slug" type="hidden" value={groupSlug} />
              <input name="resourceSlug" type="hidden" value={resource.slug} />
              <input name="sessionId" type="hidden" value={selectedSession.id} />

              {/* USA-170 founder correction: participant prompts carry the same
                  visible clarifying helper as the full DOS Journey — one
                  canonical prompt/helper source, one shared field component.
                  Previously the helper hid in aria-label and Tanner saw only
                  "WHAT STOOD OUT?" with no explanation. */}
              <GuidedJourneyResponses>
                <GuidedJourneyResponseField
                  helper={reflectionHelper}
                  isFirst
                  label="What stood out?"
                  status={isComplete ? <span className="text-[11.5px] font-semibold text-[#94A3B8]">Saved</span> : null}
                >
                  <VoiceTextarea
                    aria-label={reflectionHelper || "What stood out?"}
                    autoGrow
                    className={memberJourneyTextarea}
                    defaultValue={selectedDraft?.reflection ?? selectedProgress?.reflection ?? ""}
                    name="reflection"
                    placeholder="Start writing..."
                  />
                </GuidedJourneyResponseField>

                <GuidedJourneyResponseField helper={actionHelper} label="What will you do with it?">
                  <VoiceTextarea
                    aria-label={actionHelper || "What will you do with it?"}
                    autoGrow
                    className={memberJourneyTextarea}
                    defaultValue={selectedDraft?.actionStep ?? selectedProgress?.actionStep ?? ""}
                    name="actionStep"
                    placeholder="One response. One next step."
                  />
                </GuidedJourneyResponseField>

                <GuidedJourneyResponseField helper={guidedJourneyPrayerHelper()} label="Prayer">
                  <VoiceTextarea
                    aria-label={guidedJourneyPrayerHelper()}
                    autoGrow
                    className={memberJourneyTextarea}
                    defaultValue={selectedDraft?.prayerFocus ?? selectedProgress?.prayerFocus ?? ""}
                    name="prayerFocus"
                    placeholder="Write your prayer..."
                  />
                </GuidedJourneyResponseField>
              </GuidedJourneyResponses>

              <div className="grid grid-cols-1 gap-2 px-5 pt-6 sm:grid-cols-2 sm:px-6">
                <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-5 text-sm font-bold text-white" name="intent" type="submit" value="save">
                  Save
                </button>
                {isComplete ? (
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-5 text-sm font-bold text-[#475569]" name="intent" type="submit" value="reopen">
                    Reopen This {unitLabel}
                  </button>
                ) : (
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-5 text-sm font-bold text-white" name="intent" type="submit" value="complete">
                    Save &amp; Mark {unitLabel} Complete
                  </button>
                )}
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
