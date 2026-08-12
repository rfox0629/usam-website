"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import type { DosGuidedResourceSession, DosGuidedResourceSessionChapter } from "@/src/lib/dos/resource-catalog";

export type GuidedJourneyUnitLabel = "Day" | "Week";
export type GuidedJourneyTheme = "light" | "dark";

type GuidedJourneyProgressProps = {
  completedCount: number;
  totalCount: number;
  theme?: GuidedJourneyTheme;
};

type GuidedJourneySessionSelectorProps = {
  completedSessionIds: ReadonlySet<string>;
  currentSessionId: string;
  isOpen: boolean;
  onSelect: (sessionId: string) => void;
  onToggle: () => void;
  selectedSession: DosGuidedResourceSession;
  sessions: readonly DosGuidedResourceSession[];
  theme?: GuidedJourneyTheme;
  unitLabel: GuidedJourneyUnitLabel;
};

type GuidedJourneyChapterContentProps = {
  session: DosGuidedResourceSession;
  theme?: GuidedJourneyTheme;
  unitLabel: GuidedJourneyUnitLabel;
};

const themeClasses = {
  light: {
    eyebrow: "text-[#4B6B91]",
    title: "text-[#0F172A]",
    body: "text-[#475569]",
    muted: "text-[#64748B]",
    divider: "border-[#E2E8F0]",
    progressTrack: "bg-[#E5E7EB]",
    progressFill: "bg-[#234C7D]",
    selectorButton:
      "border-[#D6E4F7] bg-white text-[#10243D] shadow-[0_14px_40px_rgba(15,35,64,0.08)] hover:border-[#AEC8EA]",
    selectorMenu: "border-[#D6E4F7] bg-white shadow-[0_18px_48px_rgba(15,35,64,0.12)]",
    selectorItem: "text-[#10243D] hover:bg-[#F3F8FF]",
    selectorItemSelected: "border-[#C7DAF2] bg-[#EEF6FF]",
    selectorItemCompleted: "border-[#D9E7F6] bg-white",
    selectorItemUpcoming: "border-[#E5EAF1] bg-white",
    contentShell: "border-[#E2E8F0] bg-white",
    label: "text-[#4B6B91]",
    scripture: "text-[#334155]",
  },
  dark: {
    eyebrow: "text-[#8EA4C0]",
    title: "text-white",
    body: "text-[#D7E0EA]",
    muted: "text-[#8EA4C0]",
    divider: "border-white/10",
    progressTrack: "bg-white/10",
    progressFill: "bg-[#E8C884]",
    selectorButton:
      "border-white/10 bg-white/[0.06] text-white shadow-[0_18px_60px_rgba(0,0,0,0.28)] hover:border-white/20",
    selectorMenu: "border-white/10 bg-[#111820] shadow-[0_18px_60px_rgba(0,0,0,0.4)]",
    selectorItem: "text-white hover:bg-white/[0.07]",
    selectorItemSelected: "border-[#E8C884]/50 bg-[#E8C884]/10",
    selectorItemCompleted: "border-emerald-400/25 bg-emerald-400/10",
    selectorItemUpcoming: "border-white/10 bg-white/[0.03]",
    contentShell: "border-white/10 bg-white/[0.04]",
    label: "text-[#E8C884]",
    scripture: "text-[#D7E0EA]",
  },
} satisfies Record<GuidedJourneyTheme, Record<string, string>>;

export function guidedJourneySessionHeading(session: DosGuidedResourceSession): string {
  const chapters = session.chapters ?? [];

  if (chapters.length > 0) {
    return chapters.map((chapter) => chapter.title).join(" / ");
  }

  return session.title;
}

export function guidedJourneySessionChapterRange(
  session: DosGuidedResourceSession,
  unitLabel: GuidedJourneyUnitLabel,
): string {
  const chapters = session.chapters ?? [];

  if (chapters.length === 0) {
    return `${unitLabel} ${session.order}`;
  }

  if (chapters.length === 1) {
    return `Chapter ${chapters[0].order}`;
  }

  const firstChapter = chapters[0];
  const lastChapter = chapters[chapters.length - 1];
  return `Chapters ${firstChapter.order}-${lastChapter.order}`;
}

export function guidedJourneySessionSelectorTitle(
  session: DosGuidedResourceSession,
  unitLabel: GuidedJourneyUnitLabel,
): string {
  const chapters = session.chapters ?? [];

  if (chapters.length === 0) {
    return session.title;
  }

  if (chapters.length === 1) {
    const chapter = chapters[0];
    return `Chapter ${chapter.order} · ${chapter.title}`;
  }

  return `${guidedJourneySessionChapterRange(session, unitLabel)} · ${guidedJourneySessionHeading(session)}`;
}

export function guidedJourneyChapterHeading(chapter: DosGuidedResourceSessionChapter): string {
  return `Chapter ${chapter.order} · ${chapter.title}`;
}

export function guidedJourneyReflectionHelper(session: DosGuidedResourceSession, isReadingPlan: boolean): string {
  const chapters = session.chapters ?? [];

  if (isReadingPlan) {
    return "What stood out from today's passage?";
  }

  return chapters.length > 1
    ? "What stood out across these chapters?"
    : "What stood out from this chapter?";
}

export function guidedJourneyActionHelper(session: DosGuidedResourceSession, isReadingPlan: boolean): string {
  const chapters = session.chapters ?? [];

  if (isReadingPlan) {
    return "What will you do with what you read?";
  }

  return chapters.length > 1
    ? "What will you do with these chapters this week?"
    : "What will you do with this chapter this week?";
}

export function GuidedJourneyProgress({
  completedCount,
  totalCount,
  theme = "light",
}: GuidedJourneyProgressProps) {
  const classes = themeClasses[theme];
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <section className="grid gap-2" aria-label="Journey progress">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${classes.eyebrow}`}>Your Journey</p>
        <p className={`text-xs font-semibold ${classes.muted}`}>{completedCount}/{totalCount}</p>
      </div>
      <div className={`h-1.5 overflow-hidden rounded-full ${classes.progressTrack}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${classes.progressFill}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </section>
  );
}

export function GuidedJourneySessionSelector({
  completedSessionIds,
  currentSessionId,
  isOpen,
  onSelect,
  onToggle,
  selectedSession,
  sessions,
  theme = "light",
  unitLabel,
}: GuidedJourneySessionSelectorProps) {
  const classes = themeClasses[theme];

  return (
    <section className="relative" aria-label={`${unitLabel} selector`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-h-[68px] w-full items-center justify-between gap-4 rounded-[18px] border px-4 py-3 text-left transition ${classes.selectorButton}`}
        aria-expanded={isOpen}
      >
        <span className="min-w-0">
          <span className={`block text-[11px] font-semibold uppercase tracking-[0.18em] ${classes.eyebrow}`}>
            {unitLabel} {selectedSession.order} of {sessions.length}
          </span>
          <span className={`mt-1 block truncate text-sm font-semibold ${classes.title}`}>
            {guidedJourneySessionSelectorTitle(selectedSession, unitLabel)}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${classes.muted} ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-80 overflow-y-auto rounded-[18px] border p-2 ${classes.selectorMenu}`}
        >
          {sessions.map((session) => {
            const isSelected = session.id === selectedSession.id;
            const isCompleted = completedSessionIds.has(session.id);
            const isCurrent = session.id === currentSessionId;
            const stateLabel = isCompleted ? "Completed" : isCurrent ? "Current" : "Upcoming";
            const stateClass = isSelected
              ? classes.selectorItemSelected
              : isCompleted
                ? classes.selectorItemCompleted
                : classes.selectorItemUpcoming;

            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelect(session.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-[14px] border px-3 py-3 text-left transition ${classes.selectorItem} ${stateClass}`}
              >
                <span className="min-w-0">
                  <span className={`block text-[10px] font-semibold uppercase tracking-[0.16em] ${classes.eyebrow}`}>
                    {unitLabel} {session.order} of {sessions.length}
                  </span>
                  <span className="mt-1 block truncate text-sm font-semibold">
                    {guidedJourneySessionChapterRange(session, unitLabel)}
                  </span>
                  <span className={`mt-0.5 block truncate text-xs ${classes.muted}`}>
                    {guidedJourneySessionHeading(session)}
                  </span>
                </span>
                <span className={`flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${classes.muted}`}>
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {stateLabel}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function GuidedJourneyChapterContent({
  session,
  theme = "light",
  unitLabel,
}: GuidedJourneyChapterContentProps) {
  const classes = themeClasses[theme];
  const chapters = session.chapters ?? [];
  const hasChapters = chapters.length > 0;

  if (!hasChapters) {
    const scripture = session.keyScriptures?.length ? session.keyScriptures.join(" · ") : "See assigned passage.";

    return (
      <section className={`rounded-[18px] border p-4 ${classes.contentShell}`}>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${classes.eyebrow}`}>
          {unitLabel} {session.order}
        </p>
        <h2 className={`mt-2 text-lg font-semibold leading-tight ${classes.title}`}>{session.title}</h2>
        {session.assignment ? <p className={`mt-2 text-sm leading-6 ${classes.body}`}>{session.assignment}</p> : null}
        <JourneyTextBlock label="QUESTION" text={session.chapterQuestion ?? session.personalReflection ?? session.actionStep} theme={theme} />
        <JourneyTextBlock label="SCRIPTURE" text={scripture} theme={theme} />
      </section>
    );
  }

  return (
    <div className={`divide-y ${classes.divider}`}>
      {chapters.map((chapter) => (
        <section key={chapter.order} className="py-4 first:pt-0 last:pb-0">
          <h2 className={`text-lg font-semibold leading-tight ${classes.title}`}>{guidedJourneyChapterHeading(chapter)}</h2>
          <p className={`mt-2 text-sm leading-6 ${classes.body}`}>{chapter.bigIdea}</p>
          <JourneyTextBlock label="QUESTION" text={chapter.chapterQuestion} theme={theme} />
          <JourneyTextBlock label="SCRIPTURE" text={chapter.keyScriptures?.join(" · ") ?? "See assigned passage."} theme={theme} />
        </section>
      ))}
    </div>
  );
}

function JourneyTextBlock({
  label,
  text,
  theme,
}: {
  label: string;
  text: string;
  theme: GuidedJourneyTheme;
}) {
  const classes = themeClasses[theme];

  return (
    <div className="mt-4">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${classes.label}`}>{label}</p>
      <p className={`mt-1 text-sm leading-6 ${label === "SCRIPTURE" ? classes.scripture : classes.body}`}>{text}</p>
    </div>
  );
}
