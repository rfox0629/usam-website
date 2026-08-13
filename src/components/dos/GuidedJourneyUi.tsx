"use client";

import { CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, ExternalLink } from "lucide-react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { DosGuidedResourceSession, DosGuidedResourceSessionChapter } from "@/src/lib/dos/resource-catalog";

/**
 * Canonical DOS Guided Journey presentation.
 *
 * Visual + interaction source of truth: journey-canonical-mockup_1.html (founder approved).
 * Tokens below are lifted directly from that file:
 *   ink #0F1520 · ink-2 #3D4654 · ink-3 #6B7686 · ink-4 #9AA4B2
 *   hair #EDEFF2 · hair-2 #E3E6EB · tint #FBFAF8 · warm #FCFAF6
 *   blue #2450C8 · blue-2 #1B3EA0 · blue-soft #EEF2FD
 *   green #1F7A4D · green-soft #EDF7F1
 *
 * These components are presentational only. All persistence, autosave, voice input,
 * assignment and progress logic stays with the calling surface.
 */

export type GuidedJourneyUnitLabel = "Day" | "Week";
export type GuidedJourneyTheme = "light" | "dark";

const theme = {
  light: {
    eyebrow: "text-[#2450C8]",
    kicker: "text-[#9AA4B2]",
    title: "text-[#0F1520]",
    body: "text-[#3D4654]",
    muted: "text-[#6B7686]",
    faint: "text-[#9AA4B2]",
    hair: "border-[#EDEFF2]",
    hair2: "border-[#E3E6EB]",
    band: "bg-[#FBFAF8] border-y border-[#EDEFF2]",
    warm: "bg-[#FCFAF6]",
    track: "bg-[#E7E9ED]",
    fill: "bg-[#2450C8]",
    selectorLabel: "text-[#2450C8]",
    selectorIdle: "border-[#E3E6EB]",
    surface: "bg-white",
    field: "border-[#E3E6EB]",
  },
  dark: {
    eyebrow: "text-[#E8C884]",
    kicker: "text-[#8EA4C0]",
    title: "text-white",
    body: "text-[#D7E0EA]",
    muted: "text-[#8EA4C0]",
    faint: "text-[#8EA4C0]",
    hair: "border-white/10",
    hair2: "border-white/10",
    band: "bg-white/[0.04] border-y border-white/10",
    warm: "bg-white/[0.05]",
    track: "bg-white/10",
    fill: "bg-[#E8C884]",
    selectorLabel: "text-[#E8C884]",
    selectorIdle: "border-white/10",
    surface: "bg-transparent",
    field: "border-white/10",
  },
} satisfies Record<GuidedJourneyTheme, Record<string, string>>;

/* ------------------------------------------------------------------ *
 * Content helpers — unchanged public API, used by callers and tests.
 * ------------------------------------------------------------------ */

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

export function guidedJourneyQuestionLabel(unitLabel: GuidedJourneyUnitLabel): string {
  return unitLabel === "Day" ? "Today’s Question" : "This Week’s Question";
}

export function guidedJourneyChapterHeading(chapter: DosGuidedResourceSessionChapter): string {
  return `Chapter ${chapter.order} · ${chapter.title}`;
}

export function guidedJourneyReflectionHelper(session: DosGuidedResourceSession, isReadingPlan: boolean): string {
  const chapters = session.chapters ?? [];

  if (isReadingPlan) {
    return "What stood out to you as you considered this question and reading?";
  }

  return chapters.length > 1
    ? "Looking across both chapters and questions, what stood out most?"
    : "What stood out to you as you considered this question and chapter?";
}

export function guidedJourneyActionHelper(session: DosGuidedResourceSession, isReadingPlan: boolean): string {
  const chapters = session.chapters ?? [];

  if (isReadingPlan) {
    return "What is one response or next step you want to take today?";
  }

  return chapters.length > 1
    ? "What is one response or next step you want to take this week?"
    : "What is one response or next step you want to take?";
}

export function guidedJourneyPrayerHelper(): string {
  return "What do you want to pray or ask God about?";
}

/**
 * Every Scripture reference for a unit, in reading order and de-duplicated.
 * Scripture sits after the responses as supporting reference material, so a
 * multi-chapter week contributes one combined list rather than one block per
 * chapter.
 */
export function guidedJourneySessionScriptures(session: DosGuidedResourceSession): readonly string[] {
  const chapters = session.chapters ?? [];
  const references = chapters.length > 0
    ? chapters.flatMap((chapter) => chapter.keyScriptures ?? [])
    : session.keyScriptures ?? [];

  return Array.from(new Set(references));
}

export function guidedJourneyBandCaption({
  completedCount,
  totalCount,
  unitLabel,
}: {
  completedCount: number;
  totalCount: number;
  unitLabel: GuidedJourneyUnitLabel;
}): string {
  if (totalCount > 0 && completedCount >= totalCount) {
    return "Completed · you can review this Journey any time";
  }

  if (completedCount === 0) {
    return `Start with ${unitLabel} 1`;
  }

  const remaining = totalCount - completedCount;
  const noun = remaining === 1 ? unitLabel.toLowerCase() : `${unitLabel.toLowerCase()}s`;
  return `${remaining} ${noun} remaining`;
}

/* ------------------------------------------------------------------ *
 * Resource section — open and light, no enclosing card.
 * ------------------------------------------------------------------ */

export function GuidedJourneyResourceHeader({
  author,
  coverAlt,
  coverSrc,
  description,
  eyebrow,
  isFeatured,
  onAssign,
  primaryAction,
  purchaseHref,
  themeName = "light",
  title,
}: {
  author?: string | null;
  coverAlt?: string;
  coverSrc?: string | null;
  description?: string | null;
  eyebrow: string;
  isFeatured?: boolean;
  onAssign?: () => void;
  primaryAction?: ReactNode;
  purchaseHref?: string | null;
  themeName?: GuidedJourneyTheme;
  title: string;
}) {
  const t = theme[themeName];

  return (
    <section className="px-5 pb-6 pt-7 sm:px-6" aria-label="Resource">
      <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${t.eyebrow}`}>{eyebrow}</p>

      <div className="mt-4 flex items-start gap-[18px]">
        {coverSrc ? (
          <img
            alt={coverAlt ?? title}
            className="w-[92px] shrink-0 rounded-[5px] shadow-[0_10px_26px_-12px_rgba(66,50,20,0.55)]"
            src={coverSrc}
          />
        ) : null}
        <div className="min-w-0">
          <h1 className={`text-[27px] font-bold leading-[1.08] tracking-[-0.032em] ${t.title}`}>{title}</h1>
          {author ? <p className={`mt-[5px] text-[14.5px] ${t.muted}`}>{author}</p> : null}
          {isFeatured ? (
            <span className="mt-3 inline-block rounded-full bg-[#EEF2FD] px-[9px] py-[5px] text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#2450C8]">
              Featured
            </span>
          ) : null}
        </div>
      </div>

      {description ? (
        <p className={`mt-[18px] text-[15.5px] leading-[1.62] ${t.body}`}>{description}</p>
      ) : null}

      {purchaseHref || onAssign || primaryAction ? (
        <div className="mt-5 flex flex-wrap gap-[10px]">
          {purchaseHref ? (
            <a
              className={`inline-flex min-h-[46px] flex-1 basis-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] border border-[#E3E6EB] bg-white px-3 text-[14.5px] font-semibold ${t.title}`}
              href={purchaseHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              Purchase Book
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#9AA4B2]" aria-hidden="true" strokeWidth={1.8} />
            </a>
          ) : null}
          {primaryAction}
          {onAssign ? (
            <button
              className="inline-flex min-h-[46px] flex-1 basis-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] bg-[#2450C8] px-3 text-[14.5px] font-semibold text-white"
              onClick={onAssign}
              type="button"
            >
              <ClipboardCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" strokeWidth={1.9} />
              Assign
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Compact sticky nav — resource chrome recedes once actively progressing.
 * ------------------------------------------------------------------ */

export function GuidedJourneyCompactNav({
  completedCount,
  coverAlt,
  coverSrc,
  onClose,
  positionLabel,
  themeName = "light",
  title,
  totalCount,
}: {
  completedCount: number;
  coverAlt?: string;
  coverSrc?: string | null;
  onClose?: () => void;
  positionLabel: string;
  themeName?: GuidedJourneyTheme;
  title: string;
  totalCount: number;
}) {
  const t = theme[themeName];
  const surface = themeName === "dark" ? "bg-transparent" : "bg-white";

  return (
    <div className={`flex items-center gap-3 border-b ${t.hair} ${surface} px-5 py-3 sm:px-6`}>
      <div className="flex min-w-0 flex-1 items-center gap-[10px]">
        {coverSrc ? (
          <img
            alt={coverAlt ?? title}
            className="h-9 w-[26px] shrink-0 rounded-[3px] object-cover shadow-[0_2px_6px_-2px_rgba(0,0,0,0.3)]"
            src={coverSrc}
          />
        ) : null}
        <div className="min-w-0">
          <p className={`truncate text-[14px] font-bold tracking-[-0.012em] ${t.title}`}>{title}</p>
          <p className={`mt-px text-[11.5px] font-semibold ${t.faint}`}>
            {positionLabel} · {completedCount}/{totalCount} complete
          </p>
        </div>
      </div>

      {onClose ? (
        <button
          aria-label="Close"
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[#F3F4F6] text-[#6B7686]"
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true" className="text-sm leading-none">✕</span>
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Your Journey band — the hinge between "what is this" and "where am I".
 * ------------------------------------------------------------------ */

export function GuidedJourneyProgress({
  caption,
  completedCount,
  themeName = "light",
  totalCount,
  unitLabel = "Week",
}: {
  caption?: string;
  completedCount: number;
  themeName?: GuidedJourneyTheme;
  totalCount: number;
  unitLabel?: GuidedJourneyUnitLabel;
}) {
  const t = theme[themeName];
  const percentage = totalCount > 0 ? Math.max(2, Math.round((completedCount / totalCount) * 100)) : 0;
  const resolvedCaption = caption ?? guidedJourneyBandCaption({ completedCount, totalCount, unitLabel });

  return (
    <section className={`px-5 py-4 sm:px-6 ${t.band}`} aria-label="Journey progress">
      <div className="flex items-baseline justify-between gap-3">
        <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${t.title}`}>Your Journey</p>
        <p className={`text-[12.5px] font-bold tabular-nums ${t.muted}`}>
          {completedCount} / {totalCount}
        </p>
      </div>
      <div className={`mt-[11px] h-1 overflow-hidden rounded-full ${t.track}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${t.fill}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className={`mt-[9px] text-[12px] font-semibold ${t.faint}`}>{resolvedCaption}</p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Week / Day selector — compact, expands in place, bounded scroll.
 * ------------------------------------------------------------------ */

export function GuidedJourneySessionSelector({
  alwaysExpanded = false,
  completedSessionIds,
  currentSessionId,
  isOpen,
  onSelect,
  onToggle,
  selectedSession,
  sessions,
  themeName = "light",
  unitLabel,
}: {
  alwaysExpanded?: boolean;
  completedSessionIds: ReadonlySet<string>;
  currentSessionId: string;
  isOpen: boolean;
  onSelect: (sessionId: string) => void;
  onToggle: () => void;
  selectedSession: DosGuidedResourceSession;
  sessions: readonly DosGuidedResourceSession[];
  themeName?: GuidedJourneyTheme;
  unitLabel: GuidedJourneyUnitLabel;
}) {
  const t = theme[themeName];
  const expanded = alwaysExpanded || isOpen;

  const list = (
    <div
      className={`max-h-[322px] overflow-y-auto border ${t.hair2} ${
        alwaysExpanded ? "rounded-[18px]" : "rounded-b-[18px] border-t-0"
      }`}
    >
      {sessions.map((session) => {
        const isCompleted = completedSessionIds.has(session.id);
        const isSelected = session.id === selectedSession.id;
        const stateLabel = isCompleted ? "Completed" : session.id === currentSessionId ? "Current" : "Upcoming";

        return (
          <button
            className={`flex w-full items-start gap-[13px] border-t ${t.hair} px-[15px] py-[13px] text-left first:border-t-0 ${
              isSelected ? "bg-[#EEF2FD]" : "bg-white"
            }`}
            key={session.id}
            onClick={() => onSelect(session.id)}
            type="button"
          >
            <span
              className={`mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${
                isSelected
                  ? "bg-[#2450C8] text-white"
                  : isCompleted
                    ? "bg-[#EDF7F1] text-[#1F7A4D]"
                    : "bg-[#F1F3F6] text-[#9AA4B2]"
              }`}
            >
              {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} /> : session.order}
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`block text-[10.5px] font-bold uppercase tracking-[0.11em] ${
                  isSelected ? "text-[#1B3EA0]" : "text-[#9AA4B2]"
                }`}
              >
                {unitLabel} {session.order}
              </span>
              <span className={`mt-0.5 block text-[14.5px] font-semibold tracking-[-0.01em] ${t.title}`}>
                {guidedJourneySessionChapterRange(session, unitLabel)}
              </span>
              <span className={`mt-0.5 block text-[13px] leading-[1.4] ${t.muted}`}>
                {guidedJourneySessionHeading(session)}
              </span>
            </span>

            <span
              className={`mt-0.5 shrink-0 rounded-full px-[8px] py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] ${
                isSelected
                  ? "bg-[#2450C8] text-white"
                  : isCompleted
                    ? "bg-[#EDF7F1] text-[#1F7A4D]"
                    : "bg-[#F3F4F6] text-[#9AA4B2]"
              }`}
            >
              {stateLabel}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (alwaysExpanded) {
    return (
      <section className="px-5 pt-3 sm:px-6" aria-label={`${unitLabel} selector`}>
        {list}
      </section>
    );
  }

  return (
    <section className="px-5 pt-[14px] sm:px-6" aria-label={`${unitLabel} selector`}>
      <button
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-3 border bg-white px-[15px] py-[13px] text-left transition-colors ${
          isOpen ? `rounded-t-[18px] border-b-transparent ${t.selectorIdle}` : `rounded-[18px] ${t.selectorIdle}`
        }`}
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0">
          <span className={`block text-[10px] font-bold uppercase tracking-[0.13em] ${t.selectorLabel}`}>
            {unitLabel} {selectedSession.order} of {sessions.length}
          </span>
          <span className={`mt-[3px] block text-[15px] font-semibold tracking-[-0.012em] ${t.title}`}>
            {guidedJourneySessionSelectorTitle(selectedSession, unitLabel)}
          </span>
        </span>
        <span className="grid h-[25px] w-[25px] shrink-0 place-items-center rounded-full bg-[#F3F4F6]">
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 text-[#6B7686] transition-transform ${isOpen ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </span>
      </button>
      {expanded ? list : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Chapter content — editorial reading, warm question band, Scripture rows.
 * ------------------------------------------------------------------ */

export function GuidedJourneyChapterContent({
  session,
  themeName = "light",
  unitLabel,
}: {
  session: DosGuidedResourceSession;
  themeName?: GuidedJourneyTheme;
  unitLabel: GuidedJourneyUnitLabel;
}) {
  const t = theme[themeName];
  const chapters = session.chapters ?? [];
  const isMultiChapter = chapters.length > 1;

  if (chapters.length === 0) {
    return (
      <div>
        <JourneyReading
          framing={session.bigIdea ?? session.assignment}
          kicker={`${unitLabel} ${session.order}`}
          themeName={themeName}
          title={session.title}
        />
        <JourneyQuestionBand
          label={guidedJourneyQuestionLabel(unitLabel)}
          question={session.chapterQuestion ?? session.personalReflection ?? session.actionStep}
          themeName={themeName}
        />
      </div>
    );
  }

  return (
    <div>
      {isMultiChapter ? (
        <div className="px-5 pt-[18px] sm:px-6">
          <span className={`inline-flex rounded-full bg-[#F3F4F6] px-[9px] py-[5px] text-[10.5px] font-bold uppercase tracking-[0.1em] ${t.muted}`}>
            {chapters.length} chapters this {unitLabel.toLowerCase()}
          </span>
        </div>
      ) : null}

      {chapters.map((chapter, index) => (
        <div key={`${chapter.order}-${chapter.title}`}>
          {index > 0 ? <div className={`mx-5 mt-8 border-t ${t.hair} sm:mx-6`} /> : null}
          <JourneyReading
            framing={chapter.bigIdea}
            kicker={`Chapter ${chapter.order}`}
            themeName={themeName}
            title={chapter.title}
          />
          <JourneyQuestionBand
            label={isMultiChapter ? `Chapter ${chapter.order} · Question` : guidedJourneyQuestionLabel(unitLabel)}
            question={chapter.chapterQuestion}
            themeName={themeName}
          />
        </div>
      ))}
    </div>
  );
}

function JourneyReading({
  framing,
  kicker,
  themeName,
  title,
}: {
  framing?: string | null;
  kicker: string;
  themeName: GuidedJourneyTheme;
  title: string;
}) {
  const t = theme[themeName];

  return (
    <section className="px-5 pt-[26px] sm:px-6">
      <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${t.kicker}`}>{kicker}</p>
      <h2 className={`mt-2 text-[25px] font-bold leading-[1.16] tracking-[-0.03em] ${t.title}`}>{title}</h2>
      {framing ? <p className={`mt-[14px] text-[16.5px] leading-[1.65] ${t.body}`}>{framing}</p> : null}
    </section>
  );
}

function JourneyQuestionBand({
  label,
  question,
  themeName,
}: {
  label: string;
  question?: string | null;
  themeName: GuidedJourneyTheme;
}) {
  const t = theme[themeName];

  if (!question) {
    return null;
  }

  return (
    <section className={`mt-[26px] px-5 py-6 sm:px-6 ${t.warm}`} aria-label="This week's question">
      <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${t.eyebrow}`}>{label}</p>
      <p className={`mt-3 text-[21px] font-semibold leading-[1.35] tracking-[-0.022em] ${t.title}`}>{question}</p>
    </section>
  );
}

/**
 * Scripture for the unit. Rendered after the responses as supporting
 * reference material rather than beside the question.
 */
export function GuidedJourneyScripture({
  canOpenScripture,
  onOpenScripture,
  references,
  themeName = "light",
}: {
  canOpenScripture?: (reference: string) => boolean;
  onOpenScripture?: (reference: string, event: ReactMouseEvent<HTMLButtonElement>) => void;
  references: readonly string[];
  themeName?: GuidedJourneyTheme;
}) {
  const t = theme[themeName];

  if (references.length === 0) {
    return null;
  }

  return (
    <section className={`mt-[30px] border-t px-5 pt-6 sm:px-6 ${t.hair}`} aria-label="Scripture">
      <p className={`mb-1 text-[11px] font-bold uppercase tracking-[0.15em] ${t.kicker}`}>Scripture</p>
      {references.map((reference) => {
        const row = (
          <>
            <span className={`text-[16px] font-semibold tracking-[-0.012em] ${t.title}`}>{reference}</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9AA4B2]" strokeWidth={1.9} />
          </>
        );

        // Only render a target when the tap actually goes somewhere, so the
        // chevron is never a dead affordance.
        const isOpenable = Boolean(onOpenScripture) && (canOpenScripture?.(reference) ?? true);

        if (!isOpenable) {
          return (
            <div
              className={`flex items-center justify-between gap-3 border-b py-[14px] last:border-b-0 ${t.hair}`}
              key={reference}
            >
              {row}
            </div>
          );
        }

        return (
          <button
            className={`-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-[10px] border-b px-2 py-[14px] text-left transition-colors last:border-b-0 hover:bg-[#FBFAF8] active:bg-[#F3F4F6] ${t.hair}`}
            key={reference}
            onClick={(event) => onOpenScripture?.(reference, event)}
            type="button"
          >
            {row}
          </button>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Responses — three saved fields, spacious, voice lives inside the field.
 * ------------------------------------------------------------------ */

export function GuidedJourneyResponses({ children }: { children: ReactNode }) {
  return (
    <section className="px-5 pt-[30px] sm:px-6" aria-label="Your response">
      {children}
    </section>
  );
}

export function GuidedJourneyResponseField({
  children,
  helper,
  isFirst = false,
  label,
  status,
  themeName = "light",
}: {
  children: ReactNode;
  helper: string;
  isFirst?: boolean;
  label: string;
  status?: ReactNode;
  themeName?: GuidedJourneyTheme;
}) {
  const t = theme[themeName];

  return (
    <div className={isFirst ? "" : "mt-[26px]"}>
      <p className={`text-[17px] font-bold tracking-[-0.015em] ${t.title}`}>{label}</p>
      <p className={`mt-1 text-[13.5px] leading-[1.5] ${t.muted}`}>{helper}</p>
      <div className={`mt-3 rounded-[18px] border ${t.field} bg-white p-[15px] pb-3`}>
        {children}
        {status ? <div className="mt-3 flex items-center justify-between">{status}</div> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Completion action — lives at the natural end of the week, not pinned.
 * ------------------------------------------------------------------ */

export function GuidedJourneyDock({
  onPrimary,
  onSecondary,
  primaryDisabled = false,
  primaryLabel,
  secondaryLabel,
  themeName = "light",
}: {
  onPrimary: () => void;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
  primaryLabel: string;
  secondaryLabel?: string;
  themeName?: GuidedJourneyTheme;
}) {
  const t = theme[themeName];

  return (
    <div className="mt-[34px] flex flex-col gap-3 px-5 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
      <button
        className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[14px] bg-[#2450C8] px-[34px] text-[15.5px] font-bold text-white disabled:bg-[#9AA4B2] sm:w-auto"
        disabled={primaryDisabled}
        onClick={onPrimary}
        type="button"
      >
        {primaryLabel}
      </button>
      {secondaryLabel && onSecondary ? (
        <button
          className={`min-h-[44px] text-[13.5px] font-semibold ${t.muted}`}
          onClick={onSecondary}
          type="button"
        >
          {secondaryLabel}
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Layout — single column under 900px, rail + reading column at 900px+.
 * ------------------------------------------------------------------ */

export function GuidedJourneyLayout({
  rail,
  reading,
}: {
  rail: ReactNode;
  reading: ReactNode;
}) {
  return (
    <div className="grid min-h-full bg-white min-[900px]:grid-cols-[352px_minmax(0,1fr)]">
      <div className="border-[#EDEFF2] bg-white min-[900px]:border-r min-[900px]:bg-[#FDFDFD] min-[900px]:pb-8">{rail}</div>
      <div className="flex justify-center min-[900px]:pb-10">
        <div className="w-full min-[900px]:max-w-[700px]">{reading}</div>
      </div>
    </div>
  );
}
