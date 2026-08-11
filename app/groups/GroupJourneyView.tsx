"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { DosGuidedResourceSession, DosGuidedResourceSessionChapter, DosResource } from "@/src/lib/dos/resource-catalog";
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

function groupJourneySessionHeading(session: DosGuidedResourceSession) {
  return session.title.replace(/^(Week|Day) \d+\s*[·-]\s*/, "");
}

function groupJourneySessionChapterRange(session: DosGuidedResourceSession, unitLabel: "Day" | "Week") {
  if (!session.chapters?.length) {
    return unitLabel === "Day" ? `Day ${session.order}` : session.assignment;
  }

  const orders = session.chapters.map((chapter) => chapter.order);
  const first = Math.min(...orders);
  const last = Math.max(...orders);

  return first === last ? `Ch. ${first}` : `Ch. ${first}-${last}`;
}

function groupJourneySessionSelectorTitle(session: DosGuidedResourceSession) {
  return session.chapters?.length
    ? session.chapters.map((chapter) => chapter.title).join(" / ")
    : groupJourneySessionHeading(session);
}

function groupJourneyChapterHeading(chapter: DosGuidedResourceSessionChapter) {
  return `Chapter ${chapter.order} · ${chapter.title}`;
}

function groupJourneyReflectionHelper(session: DosGuidedResourceSession, isReadingPlan: boolean) {
  if (isReadingPlan || !session.chapters?.length) {
    return session.personalReflection ?? "What stood out to you as you considered this question and chapter?";
  }

  return session.chapters.length > 1
    ? "Looking across both chapters and questions, what stood out most?"
    : "What stood out to you as you considered this question and chapter?";
}

function groupJourneyActionHelper(session: DosGuidedResourceSession) {
  return session.chapters?.length && session.chapters.length > 1
    ? "What is one response or next step you want to take this week?"
    : "What is one response or next step you want to take?";
}

function JourneyCard({
  accent = "neutral",
  children,
  eyebrow,
}: {
  accent?: "neutral" | "gold" | "blue";
  children: ReactNode;
  eyebrow: string;
}) {
  const borderClass = accent === "gold" ? "border-[#C2A14E]/30 bg-[#C2A14E]/10" : accent === "blue" ? "border-[#5B8DEF]/25 bg-[#5B8DEF]/10" : "border-white/10 bg-white/[0.04]";
  const labelClass = accent === "gold" ? "text-[#F8C56A]" : accent === "blue" ? "text-[#9DBBFF]" : "text-white/45";

  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${borderClass}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${labelClass}`}>{eyebrow}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
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
  const unitLabel = isReadingPlan ? "Day" : "Week";
  const unitLabelLower = isReadingPlan ? "day" : "week";
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
  const isAllComplete = sessions.length > 0 && completedCount === sessions.length;
  const selectedChapterRange = selectedSession ? groupJourneySessionChapterRange(selectedSession, unitLabel) : "";
  const selectedSelectorTitle = selectedSession ? groupJourneySessionSelectorTitle(selectedSession) : "";
  const reflectionHelper = selectedSession ? groupJourneyReflectionHelper(selectedSession, isReadingPlan) : "";
  const actionHelper = selectedSession ? groupJourneyActionHelper(selectedSession) : "";

  return (
    <main className="min-h-screen bg-[#080A0D] text-[#F5F3EE]">
      <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-28 sm:px-6 sm:py-6">
        <div className="flex items-start gap-4">
          {resource.coverImage ? (
            <img
              alt={resource.coverImage.alt}
              className="aspect-[2/3] w-20 shrink-0 rounded-lg border border-white/10 object-cover shadow-[0_14px_34px_rgba(0,0,0,0.4)] sm:w-24"
              src={resource.coverImage.src}
            />
          ) : null}
          <div className="min-w-0">
            <Link className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]" href={groupPath}>
              {groupName}
            </Link>
            <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">{resource.title}</h1>
            {resource.author ? <p className="mt-1 text-sm font-bold text-white/55">— {resource.author}</p> : null}
          </div>
        </div>

        {message ? (
          <p className="rounded-lg border border-[#C2A14E]/35 bg-[#C2A14E]/10 px-3 py-2 text-sm font-bold text-[#F8C56A]">{message}</p>
        ) : null}

        <section className="rounded-lg border border-[#C2A14E]/22 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
            <span>{isAllComplete ? "Journey complete" : "Your Journey"}</span>
            <span>{completedCount}/{sessions.length}</span>
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {sessions.map((session) => {
              const sessionComplete = Boolean(progressBySession.get(session.id)?.completedAt);
              const isCurrent = session.id === firstOpenSession?.id;

              return (
                <span
                  className={`h-2 flex-1 rounded-full ${
                    sessionComplete ? "bg-[#C2A14E]" : isCurrent ? "bg-[#5B8DEF]" : "bg-white/10"
                  }`}
                  key={session.id}
                />
              );
            })}
          </div>
          {assignment?.personalMessage ? (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-6 text-white/75">
              &ldquo;{assignment.personalMessage}&rdquo;
            </p>
          ) : null}
        </section>

        {otherResourceSlugs.length ? (
          <div className="flex flex-wrap gap-2">
            {otherResourceSlugs.map((slug) => (
              <Link
                className="inline-flex min-h-9 items-center rounded-sm border border-white/14 bg-white/[0.04] px-3 text-xs font-black text-white/72"
                href={`${groupPath}/journey?resource=${encodeURIComponent(slug)}`}
                key={slug}
              >
                Also assigned: {slug.replace(/-/g, " ")}
              </Link>
            ))}
          </div>
        ) : null}

        <section className="grid gap-2">
          <button
            aria-expanded={isSessionSelectorOpen}
            aria-label={`Choose ${unitLabelLower}`}
            className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-[#5B8DEF]/35 bg-white/[0.03] px-3.5 py-3 text-left transition-colors hover:border-[#5B8DEF]/60"
            onClick={() => setIsSessionSelectorOpen((open) => !open)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#9DBBFF]">
                {unitLabel} {selectedSession?.order ?? 1} of {sessions.length}
              </span>
              <span className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="shrink-0 text-sm font-black text-white">{selectedChapterRange}</span>
                <span className="min-w-0 text-sm font-bold leading-5 text-white/70">{selectedSelectorTitle}</span>
              </span>
            </span>
            <span className={`text-lg font-black text-[#F8C56A] transition-transform ${isSessionSelectorOpen ? "rotate-180" : ""}`}>⌄</span>
          </button>

          {isSessionSelectorOpen ? (
            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#080A0D]">
              <div className="divide-y divide-white/10">
                {sessions.map((session) => {
                  const sessionComplete = Boolean(progressBySession.get(session.id)?.completedAt);
                  const isCurrent = session.id === firstOpenSession?.id && !sessionComplete;
                  const isSelected = session.id === selectedSessionId;
                  const stateLabel = sessionComplete ? "Completed" : isCurrent ? "Current" : "Upcoming";

                  return (
                    <button
                      className={`grid w-full min-w-0 grid-cols-[1fr_auto] gap-3 px-3.5 py-3 text-left transition-colors ${
                        isSelected
                          ? "bg-[#C2A14E]/12"
                          : isCurrent
                            ? "bg-[#5B8DEF]/8 hover:bg-[#5B8DEF]/12"
                            : "hover:bg-white/[0.04]"
                      }`}
                      key={session.id}
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        setIsSessionSelectorOpen(false);
                      }}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{unitLabel} {session.order}</span>
                          <span className="text-xs font-black text-white/85">{groupJourneySessionChapterRange(session, unitLabel)}</span>
                        </span>
                        <span className="mt-0.5 block text-sm font-bold leading-5 text-white/72">{groupJourneySessionSelectorTitle(session)}</span>
                      </span>
                      <span className={`self-start rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                        sessionComplete
                          ? "bg-emerald-400/10 text-emerald-300"
                          : isCurrent
                            ? "bg-[#5B8DEF]/16 text-[#9DBBFF]"
                            : "bg-white/[0.05] text-white/45"
                      }`}>
                        {stateLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {selectedSession ? (
          <section className="grid gap-3 rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">{unitLabel} {selectedSession.order}</p>
                <p className="mt-0.5 text-lg font-black leading-tight text-white">
                  {selectedSelectorTitle}
                </p>
                <p className="mt-1 text-sm font-bold text-white/50">{selectedChapterRange}</p>
              </div>
              {isComplete ? (
                <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
                  Complete
                </span>
              ) : null}
            </div>

            {!selectedSession.chapters?.length ? (
              <JourneyCard eyebrow="Reading Assignment">
                <p className="text-sm font-bold leading-6 text-white">{selectedSession.assignment}</p>
              </JourneyCard>
            ) : null}

            {!selectedSession.chapters?.length && selectedSession.beginWithPrayer ? (
              <JourneyCard accent="gold" eyebrow="Begin With Prayer">
                <p className="text-sm font-bold leading-6 text-white">{selectedSession.beginWithPrayer}</p>
              </JourneyCard>
            ) : null}

            {selectedSession.chapters?.length ? (
              <div className="divide-y divide-white/10">
                {selectedSession.chapters.map((chapter) => (
                  <section className="grid gap-2 py-4 first:pt-0 last:pb-0" key={chapter.order}>
                    <div>
                      <h2 className="text-base font-black leading-6 text-white">{groupJourneyChapterHeading(chapter)}</h2>
                      {chapter.bigIdea ? <p className="mt-1.5 text-sm font-bold leading-6 text-white/78">{chapter.bigIdea}</p> : null}
                    </div>
                    {chapter.chapterQuestion ? (
                      <div className="grid gap-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#F8C56A]">Question</p>
                        <p className="text-sm font-bold leading-6 text-white">{chapter.chapterQuestion}</p>
                      </div>
                    ) : null}
                    {chapter.keyScriptures?.length ? (
                      <div className="grid gap-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Scripture</p>
                        <p className="text-sm font-bold leading-6 text-white/82">{chapter.keyScriptures.join(" · ")}</p>
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            ) : (
              <>
                {selectedSession.bigIdea ? (
                  <JourneyCard eyebrow="Main Idea">
                    <p className="text-base font-bold leading-7 text-white">{selectedSession.bigIdea}</p>
                  </JourneyCard>
                ) : null}

                {selectedSession.chapterQuestion ? (
                  <JourneyCard accent="gold" eyebrow="Question">
                    <p className="text-sm font-bold leading-6 text-white">{selectedSession.chapterQuestion}</p>
                  </JourneyCard>
                ) : null}

                {selectedSession.keyScriptures?.length ? (
                  <JourneyCard accent="blue" eyebrow="Scripture">
                    <p className="text-sm font-bold leading-6 text-white">{selectedSession.keyScriptures.join(" · ")}</p>
                  </JourneyCard>
                ) : null}
              </>
            )}

            {selectedSession.beginWithPrayer && selectedSession.chapters?.length ? (
              <details className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-3">
                <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Begin With Prayer</summary>
                <p className="mt-2 text-sm font-bold leading-6 text-white/80">{selectedSession.beginWithPrayer}</p>
              </details>
            ) : null}

            {selectedSession.lookForChrist || selectedSession.listenCarefully || selectedSession.respondPersonally || selectedSession.moveTowardOthers ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedSession.lookForChrist ? (
                  <JourneyCard eyebrow="Look for Christ">
                    <p className="text-sm font-bold leading-6 text-white">{selectedSession.lookForChrist}</p>
                  </JourneyCard>
                ) : null}
                {selectedSession.listenCarefully ? (
                  <JourneyCard eyebrow="Listen Carefully">
                    <p className="text-sm font-bold leading-6 text-white">{selectedSession.listenCarefully}</p>
                  </JourneyCard>
                ) : null}
                {selectedSession.respondPersonally ? (
                  <JourneyCard eyebrow="Respond Personally">
                    <p className="text-sm font-bold leading-6 text-white">{selectedSession.respondPersonally}</p>
                  </JourneyCard>
                ) : null}
                {selectedSession.moveTowardOthers ? (
                  <JourneyCard eyebrow="Move Toward Others">
                    <p className="text-sm font-bold leading-6 text-white">{selectedSession.moveTowardOthers}</p>
                  </JourneyCard>
                ) : null}
              </div>
            ) : null}

            <form action={saveGroupMemberJourneyProgress} className="grid gap-3 border-t border-white/10 pt-3" key={selectedSession.id}>
              <input name="slug" type="hidden" value={groupSlug} />
              <input name="resourceSlug" type="hidden" value={resource.slug} />
              <input name="sessionId" type="hidden" value={selectedSession.id} />

              {selectedSession.personalReflection ? (
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">What stood out?</span>
                  <span className="text-xs font-bold leading-5 text-white/58">{reflectionHelper}</span>
                  <AutoGrowTextarea
                    className="min-h-28 resize-none overflow-hidden rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]"
                    defaultValue={selectedProgress?.reflection ?? ""}
                    name="reflection"
                    placeholder={isReadingPlan ? "Write one sentence about today's reading." : "Write what God is showing you this week."}
                  />
                </label>
              ) : null}

              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">What will you do with it?</span>
                <span className="text-xs font-bold leading-5 text-white/58">{actionHelper}</span>
                <AutoGrowTextarea
                  className="min-h-20 resize-none overflow-hidden rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]"
                  defaultValue={selectedProgress?.actionStep ?? ""}
                  name="actionStep"
                  placeholder="Name one concrete next step."
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Prayer</span>
                <span className="text-xs font-bold leading-5 text-white/58">What do you want to pray or ask God about?</span>
                <AutoGrowTextarea
                  className="min-h-20 resize-none overflow-hidden rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]"
                  defaultValue={selectedProgress?.prayerFocus ?? ""}
                  name="prayerFocus"
                  placeholder="Write a prayer request or focus."
                />
              </label>

              <button
                className="inline-flex min-h-11 cursor-not-allowed items-center justify-center gap-2 rounded-sm border border-dashed border-white/14 bg-white/[0.02] px-4 text-xs font-black uppercase tracking-[0.12em] text-white/35"
                disabled
                title="Voice responses are coming soon. Type your response for now."
                type="button"
              >
                Voice Response — Coming Soon
              </button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/14 bg-white/[0.04] px-4 text-sm font-black text-white" name="intent" type="submit" value="save">
                  Save
                </button>
                {isComplete ? (
                  <button className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/14 bg-white/[0.04] px-4 text-sm font-black text-white/70" name="intent" type="submit" value="reopen">
                    Reopen This {unitLabel}
                  </button>
                ) : (
                  <button className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#C2A14E] px-4 text-sm font-black text-[#080A0D]" name="intent" type="submit" value="complete">
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
