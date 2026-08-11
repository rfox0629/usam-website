"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { DosResource } from "@/src/lib/dos/resource-catalog";
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
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  const selectedProgress = selectedSession ? progressBySession.get(selectedSession.id) ?? null : null;
  const message = journeyStateMessage(state);
  const isComplete = Boolean(selectedProgress?.completedAt);
  const isAllComplete = sessions.length > 0 && completedCount === sessions.length;

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
            <span>{isAllComplete ? "Journey complete" : "Progress"}</span>
            <span>{completedCount}/{sessions.length} {unitLabelLower}s complete</span>
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

        <section className="relative grid gap-2 rounded-lg border border-white/10 bg-[#111418] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
          <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{unitLabel}s</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {sessions.map((session) => {
              const sessionComplete = Boolean(progressBySession.get(session.id)?.completedAt);
              const isCurrent = session.id === firstOpenSession?.id;
              const isSelected = session.id === selectedSessionId;
              const stateLabel = sessionComplete ? "Done" : isCurrent ? "Current" : "Upcoming";

              return (
                <button
                  className={`flex min-h-14 shrink-0 flex-col items-start justify-center gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-[#C2A14E] bg-[#C2A14E]/14 text-[#F8C56A]"
                      : sessionComplete
                        ? "border-[#C2A14E]/30 bg-[#C2A14E]/5 text-white/75 hover:border-[#C2A14E]/50"
                        : isCurrent
                          ? "border-[#5B8DEF]/50 bg-[#5B8DEF]/10 text-white/85 hover:border-[#5B8DEF]/70"
                          : "border-white/10 bg-white/[0.02] text-white/45 hover:border-white/20"
                  }`}
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  type="button"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
                    {stateLabel === "Done" ? "✓ Done" : stateLabel === "Current" ? "● Current" : `${unitLabel} ${session.order}`}
                  </span>
                  <span className="max-w-[9rem] truncate text-xs font-bold">
                    {session.chapters?.length ? session.chapters.map((chapter) => chapter.title).join(" & ") : session.title.replace(/^(Week|Day) \d+\s*[·-]\s*/, "")}
                  </span>
                </button>
              );
            })}
          </div>
          {sessions.length > 3 ? (
            <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-3 top-8 w-8 bg-[linear-gradient(90deg,transparent,#111418)]" />
          ) : null}
        </section>

        {selectedSession ? (
          <section className="grid gap-3 rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">{unitLabel} {selectedSession.order}</p>
                <p className="mt-0.5 text-lg font-black leading-tight text-white">
                  {selectedSession.chapters?.length
                    ? selectedSession.chapters.map((chapter) => chapter.title).join(" & ")
                    : selectedSession.title.replace(/^(Week|Day) \d+\s*[·-]\s*/, "")}
                </p>
              </div>
              {isComplete ? (
                <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
                  Complete
                </span>
              ) : null}
            </div>

            <JourneyCard eyebrow="Reading Assignment">
              <p className="text-sm font-bold leading-6 text-white">{selectedSession.assignment}</p>
            </JourneyCard>

            {selectedSession.beginWithPrayer ? (
              <JourneyCard accent="gold" eyebrow="Begin With Prayer">
                <p className="text-sm font-bold leading-6 text-white">{selectedSession.beginWithPrayer}</p>
              </JourneyCard>
            ) : null}

            {selectedSession.chapters?.length ? (
              selectedSession.chapters.map((chapter) => (
                <div className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3" key={chapter.order}>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Chapter {chapter.order} · {chapter.assignment} · {chapter.title}</p>
                  {chapter.bigIdea ? <p className="text-sm font-bold leading-6 text-white">{chapter.bigIdea}</p> : null}
                  <JourneyCard accent="gold" eyebrow="Chapter Question">
                    <p className="text-sm font-bold leading-6 text-white">{chapter.chapterQuestion}</p>
                  </JourneyCard>
                  {chapter.keyScriptures?.length ? (
                    <JourneyCard accent="blue" eyebrow="Search the Scriptures">
                      <p className="text-sm font-bold leading-6 text-white">{chapter.keyScriptures.join(" · ")}</p>
                    </JourneyCard>
                  ) : null}
                </div>
              ))
            ) : (
              <>
                {selectedSession.bigIdea ? (
                  <JourneyCard eyebrow="Main Idea">
                    <p className="text-base font-bold leading-7 text-white">{selectedSession.bigIdea}</p>
                  </JourneyCard>
                ) : null}

                {selectedSession.chapterQuestion ? (
                  <JourneyCard accent="gold" eyebrow="Chapter Question">
                    <p className="text-sm font-bold leading-6 text-white">{selectedSession.chapterQuestion}</p>
                  </JourneyCard>
                ) : null}

                {selectedSession.keyScriptures?.length ? (
                  <JourneyCard accent="blue" eyebrow="Search the Scriptures">
                    <p className="text-sm font-bold leading-6 text-white">{selectedSession.keyScriptures.join(" · ")}</p>
                  </JourneyCard>
                ) : null}
              </>
            )}

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

            {selectedSession.multiply ? (
              <JourneyCard accent="gold" eyebrow="Multiply">
                <p className="text-sm font-bold leading-6 text-white">{selectedSession.multiply}</p>
              </JourneyCard>
            ) : null}

            {selectedSession.leaderNotes ? (
              <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Optional Leader Notes</summary>
                <p className="mt-2 text-sm leading-6 text-white/80">{selectedSession.leaderNotes}</p>
              </details>
            ) : null}

            <form action={saveGroupMemberJourneyProgress} className="grid gap-3 border-t border-white/10 pt-3" key={selectedSession.id}>
              <input name="slug" type="hidden" value={groupSlug} />
              <input name="resourceSlug" type="hidden" value={resource.slug} />
              <input name="sessionId" type="hidden" value={selectedSession.id} />

              {selectedSession.personalReflection ? (
                <label className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{isReadingPlan ? "Summary & Reflection" : "Reflect Personally"} — {selectedSession.personalReflection}</span>
                  <AutoGrowTextarea
                    className="min-h-28 resize-none overflow-hidden rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]"
                    defaultValue={selectedProgress?.reflection ?? ""}
                    name="reflection"
                    placeholder={isReadingPlan ? "Write one sentence about today's reading." : "Write what God is showing you this week."}
                  />
                </label>
              ) : null}

              <label className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{isReadingPlan ? "Next Step / Walk It Out" : "Walk It Out"} — {selectedSession.actionStep}</span>
                <AutoGrowTextarea
                  className="min-h-20 resize-none overflow-hidden rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]"
                  defaultValue={selectedProgress?.actionStep ?? ""}
                  name="actionStep"
                  placeholder="Name one concrete next step."
                />
              </label>

              <label className="grid gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">{isReadingPlan ? "Prayer Response" : "Pray"} — {selectedSession.prayerFocus}</span>
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
