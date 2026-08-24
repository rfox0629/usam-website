"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
  assignmentId: string | null;
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

  // The participant's real route owns the page; the preview overlay nests this
  // view inside the leader document, where a second <main> would be invalid.
  const Shell = preview ? "div" : "main";

  return (
    <Shell className="min-h-screen bg-white text-[#0F172A]">
      <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-28 sm:px-6 sm:py-6">
        {/* The one navigation control on this screen: back to the member's
            Group Home. Plain navigation in the real route (state is already
            saved server-side); a callback inside the preview overlay. */}
        {preview ? (
          <button
            className="inline-flex items-center gap-1.5 justify-self-start text-sm font-bold text-[#1D4ED8] underline-offset-4 hover:underline"
            onClick={preview.onNavigateToGroup}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={2.2} />
            Back to Group
          </button>
        ) : (
          <Link
            className="inline-flex items-center gap-1.5 justify-self-start text-sm font-bold text-[#1D4ED8] underline-offset-4 hover:underline"
            href={groupPath}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={2.2} />
            Back to Group
          </Link>
        )}

        <div className="flex items-start gap-4">
          {resource.coverImage ? (
            <img
              alt={resource.coverImage.alt}
              className="aspect-[2/3] w-20 shrink-0 rounded-lg border border-[#DCEBFF] bg-white object-cover shadow-[0_14px_34px_rgba(37,99,235,0.08)] sm:w-24"
              src={resource.coverImage.src}
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">{groupName}</p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-[#0F172A] sm:text-3xl">{resource.title}</h1>
            {resource.author ? <p className="mt-1 text-sm font-bold text-[#64748B]">— {resource.author}</p> : null}
          </div>
        </div>

        {message ? (
          <p className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm font-bold text-[#15803D]">{message}</p>
        ) : null}

        <div className="-mx-4 sm:-mx-6">
          <GuidedJourneyProgress completedCount={completedCount} totalCount={sessions.length} unitLabel={unitLabel} />
        </div>

        {selectedSession ? (
          <div className="-mx-2 sm:-mx-3">
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
            unitLabel={unitLabel}
          />
          </div>
        ) : null}

        {selectedSession ? (
          <section className="grid">
            {isComplete ? (
              <span className="mb-1 inline-flex items-center justify-self-start rounded-full border border-[#DCEEE3] bg-[#EDF7F1] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#1F7A4D]">
                Complete
              </span>
            ) : null}

            {/* The chapter reading sits on the light DOS-blue band the founder
                approved; the question inside it carries the deeper tint. White
                stays the canvas — no card around any of this. */}
            <div className="-mx-4 border-y border-[#EAF2FF] bg-[#F8FBFF] pb-7 sm:-mx-6">
              <GuidedJourneyChapterContent session={selectedSession} unitLabel={unitLabel} />
            </div>

            <form
              action={preview ? undefined : saveGroupMemberJourneyProgress}
              className="-mx-4 grid gap-1 sm:-mx-6"
              key={`${selectedSession.id}:${preview ? "preview" : "live"}`}
              onSubmit={preview ? handlePreviewSubmit : undefined}
            >
              <input name="slug" type="hidden" value={groupSlug} />
              <input name="assignmentId" type="hidden" value={assignment?.id ?? ""} />
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
    </Shell>
  );
}
