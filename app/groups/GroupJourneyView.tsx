"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ComponentProps } from "react";
import type { DosResource } from "@/src/lib/dos/resource-catalog";
import {
  GuidedJourneyChapterContent,
  GuidedJourneyProgress,
  GuidedJourneySessionSelector,
  guidedJourneyActionHelper,
  guidedJourneyReflectionHelper,
  type GuidedJourneyUnitLabel,
} from "@/src/components/dos/GuidedJourneyUi";
import { saveGroupMemberJourneyProgress } from "./[slug]/member/actions";

function AutoGrowTextarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={className}
      ref={(node) => {
        if (!node) {
          return;
        }

        const resize = () => {
          node.style.height = "auto";
          node.style.height = `${node.scrollHeight}px`;
        };

        resize();
        node.addEventListener("input", resize);

        return () => node.removeEventListener("input", resize);
      }}
    />
  );
}

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

type GroupJourneyViewProps = {
  assignment: JourneyAssignment;
  groupName: string;
  groupPath: string;
  groupSlug: string;
  otherResourceSlugs: string[];
  progress: JourneyProgress[];
  resource: DosResource;
  state: string | null;
};

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
  const completedCount = sessions.filter((session) => Boolean(progressBySession.get(session.id)?.completedAt)).length;
  const firstOpenSession = sessions.find((session) => !progressBySession.get(session.id)?.completedAt) ?? sessions[0] ?? null;
  const [selectedSessionId, setSelectedSessionId] = useState(firstOpenSession?.id ?? sessions[0]?.id ?? "");
  const [isSessionSelectorOpen, setIsSessionSelectorOpen] = useState(false);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  const selectedProgress = selectedSession ? progressBySession.get(selectedSession.id) ?? null : null;
  const message = journeyStateMessage(state);
  const isComplete = Boolean(selectedProgress?.completedAt);
  const completedSessionIds = new Set(sessions.filter((session) => Boolean(progressBySession.get(session.id)?.completedAt)).map((session) => session.id));
  const currentSessionId = firstOpenSession?.id ?? selectedSession?.id ?? "";
  const reflectionHelper = selectedSession ? guidedJourneyReflectionHelper(selectedSession, isReadingPlan) : "";
  const actionHelper = selectedSession ? guidedJourneyActionHelper(selectedSession, isReadingPlan) : "";

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
            <Link className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]" href={groupPath}>
              {groupName}
            </Link>
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
            {otherResourceSlugs.map((slug) => (
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
                <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
                  Complete
                </span>
              ) : null}
            </div>

            <GuidedJourneyChapterContent session={selectedSession} themeName="light" unitLabel={unitLabel} />

            <form action={saveGroupMemberJourneyProgress} className="grid gap-3 border-t border-[#EAF2FF] pt-3" key={selectedSession.id}>
              <input name="slug" type="hidden" value={groupSlug} />
              <input name="resourceSlug" type="hidden" value={resource.slug} />
              <input name="sessionId" type="hidden" value={selectedSession.id} />

              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">WHAT STOOD OUT?</span>
                <AutoGrowTextarea
                  aria-label={reflectionHelper || "What stood out?"}
                  className="min-h-28 w-full resize-none overflow-hidden rounded-2xl border border-[#DCEBFF] bg-white px-3 py-3 text-base leading-6 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                  defaultValue={selectedProgress?.reflection ?? ""}
                  name="reflection"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">WHAT WILL YOU DO WITH IT?</span>
                <AutoGrowTextarea
                  aria-label={actionHelper || "What will you do with it?"}
                  className="min-h-20 w-full resize-none overflow-hidden rounded-2xl border border-[#DCEBFF] bg-white px-3 py-3 text-base leading-6 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                  defaultValue={selectedProgress?.actionStep ?? ""}
                  name="actionStep"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]">PRAYER</span>
                <AutoGrowTextarea
                  aria-label="Prayer"
                  className="min-h-20 w-full resize-none overflow-hidden rounded-2xl border border-[#DCEBFF] bg-white px-3 py-3 text-base leading-6 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                  defaultValue={selectedProgress?.prayerFocus ?? ""}
                  name="prayerFocus"
                />
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
