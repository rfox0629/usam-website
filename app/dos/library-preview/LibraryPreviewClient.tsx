"use client";

/**
 * DISPOSABLE PROTOTYPE - founder UX review only. Do not ship.
 *
 * Demonstrates a proposed LIBRARY -> RESOURCE -> CONTENT model for the DOS
 * Library. Real DOS content is imported from the production data modules
 * (resource catalog, prayer resources, Remnant content); only the navigation
 * shell around that content is new.
 */

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Church,
  ClipboardCheck,
  Download,
  Droplet,
  ExternalLink,
  FileText,
  Film,
  Flame,
  Gift,
  Heart,
  HeartHandshake,
  Home,
  LayoutGrid,
  Search,
  Send,
  Moon,
  Sparkles,
  Users,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DosResource, DosResourceIcon } from "@/src/lib/dos/resource-catalog";
import { getDosResourceBySlug, getDosResourcesByCategory } from "@/src/lib/dos/resource-catalog";
import {
  dosPrayerResourceAttribution,
  dosPrayerResourceCategories,
  dosPrayerResources,
} from "@/src/lib/dos/prayer-resources";
import type { RemnantVideo } from "@/src/lib/remnant/content";
import { RemnantVideoEmbed } from "../library/remnant/RemnantVideoEmbed";
import { PreviewAssessment } from "./PreviewAssessment";
import {
  fourQuestionsCoreIdea,
  fourQuestionsEyebrow,
  fourQuestionsGospel,
  fourQuestionsHowToUse,
  fourQuestionsProgression,
  fourQuestionsSteps,
  fourQuestionsSubtitle,
  fourQuestionsTitle,
} from "./four-questions-content";

const font = { oswald: "'Inter Tight', 'Inter', sans-serif", rajdhani: "'Inter', sans-serif" };

type ChromeMode = "focused" | "nav";

type PrayerBackMode = "back" | "breadcrumb";

type JourneySession = NonNullable<NonNullable<DosResource["content"]>["guidedResource"]>["sessions"][number];

type PreviewView =
  | { kind: "library" }
  | { kind: "prayer"; slug: string }
  | { kind: "resource"; slug: string };

const SYNTHETIC_REMNANT_SLUG = "remnant-collection";
const SYNTHETIC_PRAYER_SLUG = "prayer-resources";

function resourceIcon(icon: DosResourceIcon) {
  switch (icon) {
    case "church":
      return Church;
    case "bible":
    case "book":
      return BookOpen;
    case "baptism":
      return Droplet;
    case "giving":
      return Gift;
    case "discipleship":
      return Users;
    case "fasting":
      return Flame;
    case "sabbath":
      return Moon;
    case "sparkles":
      return Sparkles;
    case "heart":
    case "prayer":
      return Heart;
    case "relationship":
      return HeartHandshake;
    case "send":
      return Send;
    default:
      return BookOpen;
  }
}

function typeLabel(resource: DosResource) {
  switch (resource.type) {
    case "assessment":
      return "ASSESSMENT";
    case "prayer":
      return "PRAYER";
    case "challenge":
      return "CHALLENGE";
    case "guided_resource":
      return "GUIDED JOURNEY";
    case "reading_plan":
      return "READING PLAN";
    default:
      return "TEACHING";
  }
}

function shortDescription(resource: DosResource) {
  if (resource.title === "Four Questions") {
    return "Honesty, help, surrender, and obedience.";
  }

  return resource.content?.subtitle ?? resource.description;
}

function isJourney(resource: DosResource) {
  return resource.type === "guided_resource" || resource.type === "reading_plan";
}

/* ------------------------------------------------------------------ */
/* Shared library primitives                                          */
/* ------------------------------------------------------------------ */

function LibrarySection({ children, subtext, title }: { children: ReactNode; subtext?: string; title: string }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          {title}
        </h2>
        {subtext ? <p className="mt-1 text-xs leading-5 text-[#64748B]">{subtext}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ResourceRow({
  description,
  icon: IconComponent,
  onOpen,
  title,
  type,
}: {
  description: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  onOpen: () => void;
  title: string;
  type: string;
}) {
  return (
    <button
      className="flex min-h-[64px] w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#F8FBFF]"
      onClick={onOpen}
      type="button"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EBF2FF] text-[#2563EB]">
        <IconComponent className="h-4 w-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="block text-sm font-semibold leading-tight text-[#0F172A]">{title}</span>
          <span
            className="shrink-0 rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]"
            style={{ fontFamily: font.rajdhani }}
          >
            {type}
          </span>
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs leading-4 text-[#64748B]">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </button>
  );
}

function ResourceRowList({ children }: { children: ReactNode }) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
      <div className="divide-y divide-[#EBF2FF]">{children}</div>
    </article>
  );
}

/** One Journey card component used for every Guided Journey and Reading Plan. */
function JourneyCard({
  completed,
  onOpen,
  resource,
  total,
}: {
  completed: number;
  onOpen: () => void;
  resource: DosResource;
  total: number;
}) {
  const IconComponent = resourceIcon(resource.icon);
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white p-3.5 shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
      <button className="flex w-full items-start gap-3 text-left" onClick={onOpen} type="button">
        {resource.coverImage ? (
          <img
            alt={resource.coverImage.alt}
            className="aspect-[2/3] w-11 shrink-0 rounded-lg border border-[#DCEBFF] bg-[#F8FBFF] object-cover shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
            loading="lazy"
            src={resource.coverImage.src}
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EBF2FF] text-[#2563EB]">
            <IconComponent className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span
              className="rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#1D4ED8]"
              style={{ fontFamily: font.rajdhani }}
            >
              {typeLabel(resource)}
            </span>
            {resource.estimatedDuration ? (
              <span
                className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#C2410C]"
                style={{ fontFamily: font.rajdhani }}
              >
                {resource.estimatedDuration}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-sm font-black leading-tight text-[#0F172A]">{resource.title}</h3>
          {resource.author ? <p className="mt-0.5 text-xs font-bold leading-5 text-[#475569]">{resource.author}</p> : null}
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#64748B]">{shortDescription(resource)}</p>
          {total ? (
            <div className="mt-3">
              <div
                className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]"
                style={{ fontFamily: font.rajdhani }}
              >
                <span>Progress</span>
                <span>{completed}/{total}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EAF2FF]">
                <span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : null}
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
      </button>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* The one Resource shell                                             */
/* ------------------------------------------------------------------ */

function ResourceShell({
  actions,
  backLabel = "Library",
  breadcrumb,
  children,
  hideBackButton = false,
  meta,
  onBack,
  subtitle,
  title,
}: {
  actions?: ReactNode;
  backLabel?: string;
  breadcrumb?: ReactNode;
  children: ReactNode;
  hideBackButton?: boolean;
  meta?: readonly { label: string; tone?: "amber" | "blue" }[];
  onBack: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="space-y-4">
      {hideBackButton ? null : (
        <div className="flex min-h-9 items-center">
          <button
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.06)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
            {backLabel}
          </button>
        </div>
      )}

      {breadcrumb}

      <header>
        <h1
          className="text-[28px] font-black leading-[1.05] tracking-[-0.03em] text-[#0F172A]"
          style={{ fontFamily: font.oswald }}
        >
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm font-bold text-[#475569]">{subtitle}</p> : null}
        {meta?.length ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {meta.map((item) => (
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                  item.tone === "amber" ? "bg-[#FFF7ED] text-[#C2410C]" : "bg-[#EBF2FF] text-[#1D4ED8]"
                }`}
                key={item.label}
                style={{ fontFamily: font.rajdhani }}
              >
                {item.label}
              </span>
            ))}
          </div>
        ) : null}
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </header>

      <div className="border-t border-[#EAF2FF]" />

      <div>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resource content: Four Questions (native teaching)                 */
/* ------------------------------------------------------------------ */

function ScriptureCard({ reference, text }: { reference: string; text: string }) {
  return (
    <div className="rounded-[16px] border border-[#EAF2FF] bg-[#F8FBFF] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
        {reference}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-[#334155]">{text}</p>
    </div>
  );
}

function FourQuestionsContent() {
  const [showHowTo, setShowHowTo] = useState(false);

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.05)]">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          Core idea
        </p>
        <p className="mt-2 text-[15px] font-bold leading-7 text-[#0F172A]">{fourQuestionsCoreIdea}</p>
      </section>

      <section>
        <button
          className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-[#EAF2FF] bg-white px-4 py-3 text-left"
          onClick={() => setShowHowTo((open) => !open)}
          type="button"
        >
          <span className="text-sm font-black text-[#0F172A]">How to use this</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${showHowTo ? "rotate-180" : ""}`}
            strokeWidth={1.9}
          />
        </button>
        {showHowTo ? (
          <div className="mt-2 space-y-3 rounded-[20px] border border-[#EAF2FF] bg-white p-4">
            {fourQuestionsHowToUse.map((paragraph) => (
              <p className="text-sm leading-6 text-[#475569]" key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
            <div className="grid gap-2">
              {fourQuestionsProgression.map((step) => (
                <div className="flex items-start gap-3 rounded-[16px] bg-[#F8FBFF] p-3" key={step.number}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[11px] font-black text-[#1D4ED8]">
                    {step.number}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black leading-tight text-[#0F172A]">{step.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-[#64748B]">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {fourQuestionsSteps.map((step) => (
        <section className="rounded-[24px] border border-[#EAF2FF] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.045)]" key={step.number}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            Question {step.number}
          </p>
          <h2 className="mt-2 text-[19px] font-black leading-[1.25] tracking-[-0.02em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            {step.question}
          </h2>
          <div className="mt-3 space-y-3">
            {step.body.map((paragraph) => (
              <p className="text-[15px] leading-7 text-[#475569]" key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            {step.scriptures.map((scripture) => (
              <ScriptureCard key={scripture.reference} reference={scripture.reference} text={scripture.text} />
            ))}
          </div>
          <div className="mt-4 rounded-[18px] border border-[#BFDBFE] bg-[#EBF2FF] p-3.5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              Ask at the table
            </p>
            <p className="mt-1.5 text-[15px] font-bold leading-7 text-[#0F172A]">{step.prompt}</p>
          </div>
        </section>
      ))}

      <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.05)]">
        <h2 className="text-[19px] font-black leading-tight tracking-[-0.02em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          Jesus Is the Answer
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-[#475569]">{fourQuestionsGospel.body}</p>
        <div className="mt-4 grid gap-2">
          {fourQuestionsGospel.scriptures.map((scripture) => (
            <ScriptureCard key={scripture.reference} reference={scripture.reference} text={scripture.text} />
          ))}
        </div>
        <div className="mt-4 rounded-[18px] border border-[#BFDBFE] bg-[#EBF2FF] p-3.5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            Closing prompt
          </p>
          <p className="mt-1.5 text-[15px] font-bold leading-7 text-[#0F172A]">{fourQuestionsGospel.closingPrompt}</p>
        </div>
        <p className="mt-4 text-[15px] font-black leading-7 text-[#0F172A]">{fourQuestionsGospel.finalInvitation}</p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resource content: Guided Journey (Tozer)                           */
/* ------------------------------------------------------------------ */

function JourneyWeek({
  completed,
  isOpen,
  onToggleComplete,
  onToggleOpen,
  session,
}: {
  completed: boolean;
  isOpen: boolean;
  onToggleComplete: () => void;
  onToggleOpen: () => void;
  session: JourneySession;
}) {
  const item = session;

  return (
    <article className="overflow-hidden rounded-[22px] border border-[#EAF2FF] bg-white shadow-[0_12px_30px_rgba(37,99,235,0.04)]">
      <button className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left" onClick={onToggleOpen} type="button">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
            completed ? "bg-[#2563EB] text-white" : "bg-[#EBF2FF] text-[#1D4ED8]"
          }`}
        >
          {item.id.replace("week-", "")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black leading-tight text-[#0F172A]">{item.title}</span>
          <span className="mt-0.5 block text-xs text-[#64748B]">{item.assignment}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={1.9}
        />
      </button>

      {isOpen ? (
        <div className="space-y-4 border-t border-[#EBF2FF] px-3.5 py-4">
          {item.bigIdea ? (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
                Big idea
              </p>
              <p className="mt-1.5 text-sm leading-6 text-[#334155]">{item.bigIdea}</p>
            </div>
          ) : null}

          {item.keyScriptures?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {item.keyScriptures.map((reference) => (
                <span className="rounded-full bg-[#F8FBFF] px-2.5 py-1 text-[11px] font-bold text-[#1D4ED8]" key={reference}>
                  {reference}
                </span>
              ))}
            </div>
          ) : null}

          {item.discussionQuestions?.length ? (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
                Discussion
              </p>
              <ul className="mt-1.5 space-y-2">
                {item.discussionQuestions.map((question) => (
                  <li className="flex gap-2 text-sm leading-6 text-[#475569]" key={question}>
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#94A3B8]" />
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-[16px] border border-[#BFDBFE] bg-[#EBF2FF] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              Action step
            </p>
            <p className="mt-1.5 text-sm font-semibold leading-6 text-[#0F172A]">{item.actionStep}</p>
          </div>

          <div className="grid gap-2 text-sm leading-6 text-[#475569]">
            {item.personalReflection ? <p><span className="font-black text-[#0F172A]">Reflection. </span>{item.personalReflection}</p> : null}
            {item.prayerFocus ? <p><span className="font-black text-[#0F172A]">Prayer focus. </span>{item.prayerFocus}</p> : null}
            {item.multiply ? <p><span className="font-black text-[#0F172A]">Multiply. </span>{item.multiply}</p> : null}
            {item.memoryVerse ? <p><span className="font-black text-[#0F172A]">Memory verse. </span>{item.memoryVerse.reference}</p> : null}
          </div>

          {item.leaderNotes ? (
            <div className="rounded-[16px] border border-[#EAF2FF] bg-[#F8FBFF] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
                Leader notes
              </p>
              <p className="mt-1.5 text-xs leading-5 text-[#64748B]">{item.leaderNotes}</p>
            </div>
          ) : null}

          <button
            className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-xs font-black transition-colors ${
              completed
                ? "border border-[#BFDBFE] bg-white text-[#1D4ED8]"
                : "bg-[#2563EB] text-white shadow-[0_12px_28px_rgba(37,99,235,0.20)]"
            }`}
            onClick={onToggleComplete}
            type="button"
          >
            <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.9} />
            {completed ? "Mark not complete" : "Mark week complete"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function JourneyContent({
  completedIds,
  onToggleComplete,
  resource,
}: {
  completedIds: readonly string[];
  onToggleComplete: (sessionId: string) => void;
  resource: DosResource;
}) {
  const sessions = resource.content?.guidedResource?.sessions ?? [];
  const [openId, setOpenId] = useState<string | null>(sessions[0]?.id ?? null);
  const whyChosen = resource.content?.guidedResource?.whyChosen;

  return (
    <div className="space-y-4">
      {whyChosen ? (
        <section className="rounded-[20px] border border-[#EAF2FF] bg-[#F8FBFF] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            Why this resource
          </p>
          <p className="mt-1.5 text-sm leading-6 text-[#475569]">{whyChosen}</p>
        </section>
      ) : null}

      <div className="space-y-2.5">
        {sessions.map((session) => (
          <JourneyWeek
            completed={completedIds.includes(session.id)}
            isOpen={openId === session.id}
            key={session.id}
            onToggleComplete={() => onToggleComplete(session.id)}
            onToggleOpen={() => setOpenId((current) => (current === session.id ? null : session.id))}
            session={session}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Resource content: Remnant                                          */
/* ------------------------------------------------------------------ */

function RemnantVideoCard({ video }: { video: RemnantVideo }) {
  return (
    <article className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
      <div className="mb-3.5">
        <RemnantVideoEmbed video={video} />
      </div>
      <span className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#1D4ED8]">
        {video.category}
      </span>
      <h3 className="mt-2.5 text-base font-black leading-tight text-[#0F172A]">{video.speaker}</h3>
      {video.ministry ? <p className="mt-1 text-xs font-bold text-[#64748B]">{video.ministry}</p> : null}
      <p className="mt-3 text-sm leading-6 text-[#475569]">{video.description}</p>
      <div className="mt-3 rounded-[16px] border border-[#EAF2FF] bg-[#F8FBFF] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]">Why It Matters</p>
        <p className="mt-1.5 text-xs leading-5 text-[#475569]">{video.whyWeRecommendIt}</p>
      </div>
      {video.scriptureReferences?.length ? (
        <p className="mt-3 text-xs font-bold text-[#64748B]">Scripture: {video.scriptureReferences.join(" · ")}</p>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Resource content: Prayer Resources collection                      */
/* ------------------------------------------------------------------ */

function PrayerCollection({ onOpenPrayer }: { onOpenPrayer: (slug: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return dosPrayerResources.filter((resource) => {
      const matchesCategory = category === "All" || resource.category === category;
      const matchesQuery = !normalized
        || resource.title.toLowerCase().includes(normalized)
        || resource.description.toLowerCase().includes(normalized);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-full border border-[#DCEBFF] bg-white px-3.5 py-2.5 shadow-[0_8px_18px_rgba(37,99,235,0.04)]">
        <Search className="h-4 w-4 shrink-0 text-[#94A3B8]" strokeWidth={1.9} />
        <input
          aria-label="Search prayer resources"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#0F172A] placeholder:text-[#94A3B8]"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search prayers"
          type="search"
          value={query}
        />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {["All", ...dosPrayerResourceCategories].map((item) => (
          <button
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
              category === item
                ? "border-[#2563EB] bg-[#2563EB] text-white"
                : "border-[#DCEBFF] bg-white text-[#475569] hover:bg-[#EBF2FF]"
            }`}
            key={item}
            onClick={() => setCategory(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
        {filtered.length} {filtered.length === 1 ? "prayer" : "prayers"}
      </p>

      <ResourceRowList>
        {filtered.map((resource) => (
          <ResourceRow
            description={resource.description}
            icon={Heart}
            key={resource.slug}
            onOpen={() => onOpenPrayer(resource.slug)}
            title={resource.title}
            type={resource.category}
          />
        ))}
      </ResourceRowList>

      {filtered.length === 0 ? (
        <p className="rounded-[20px] border border-[#EAF2FF] bg-white p-4 text-sm text-[#64748B]">
          No prayers match that search.
        </p>
      ) : null}

      <p className="pt-1 text-[11px] leading-5 text-[#94A3B8]">{dosPrayerResourceAttribution}</p>
    </div>
  );
}

function PrayerDetail({ slug }: { slug: string }) {
  const prayer = dosPrayerResources.find((resource) => resource.slug === slug);

  if (!prayer) {
    return <p className="text-sm text-[#64748B]">Prayer not found.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-[#475569]">{prayer.description}</p>

      <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.05)]">
        {prayer.prayerText.split("\n\n").map((paragraph) => (
          <p className="mb-3 text-[15px] leading-7 text-[#0F172A] last:mb-0" key={paragraph.slice(0, 32)}>
            {paragraph}
          </p>
        ))}
      </section>

      {prayer.keyScriptures.length ? (
        <section>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            Key Scriptures
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {prayer.keyScriptures.map((reference) => (
              <span className="rounded-full bg-[#F8FBFF] px-2.5 py-1 text-[11px] font-bold text-[#1D4ED8]" key={reference}>
                {reference}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {prayer.reflectionQuestions.length ? (
        <section className="rounded-[20px] border border-[#EAF2FF] bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            Reflection
          </p>
          <ul className="mt-2 space-y-2">
            {prayer.reflectionQuestions.map((question) => (
              <li className="flex gap-2 text-sm leading-6 text-[#475569]" key={question}>
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#94A3B8]" />
                {question}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {prayer.followUpSuggestions.length ? (
        <section className="rounded-[20px] border border-[#EAF2FF] bg-[#F8FBFF] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            Follow up
          </p>
          <ul className="mt-2 space-y-2">
            {prayer.followUpSuggestions.map((suggestion) => (
              <li className="flex gap-2 text-sm leading-6 text-[#475569]" key={suggestion}>
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#94A3B8]" />
                {suggestion}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="pt-1 text-[11px] leading-5 text-[#94A3B8]">{dosPrayerResourceAttribution}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Prototype chrome                                                   */
/* ------------------------------------------------------------------ */

function PreviewControls({
  chromeMode,
  onChromeModeChange,
  onPrayerBackModeChange,
  prayerBackMode,
}: {
  chromeMode: ChromeMode;
  onChromeModeChange: (mode: ChromeMode) => void;
  onPrayerBackModeChange: (mode: PrayerBackMode) => void;
  prayerBackMode: PrayerBackMode;
}) {
  return (
    <div className="sticky top-0 z-[80] -mx-4 border-b border-[#1E293B] bg-[#0F172A] px-4 py-2 text-white">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#93C5FD]">Prototype controls</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">In resource</span>
          {(["nav", "focused"] as const).map((mode) => (
            <button
              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                chromeMode === mode ? "bg-[#2563EB] text-white" : "bg-[#1E293B] text-[#94A3B8]"
              }`}
              key={mode}
              onClick={() => onChromeModeChange(mode)}
              type="button"
            >
              {mode === "nav" ? "Bottom nav" : "Focused"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#94A3B8]">Prayer</span>
          {(["back", "breadcrumb"] as const).map((mode) => (
            <button
              className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                prayerBackMode === mode ? "bg-[#2563EB] text-white" : "bg-[#1E293B] text-[#94A3B8]"
              }`}
              key={mode}
              onClick={() => onPrayerBackModeChange(mode)}
              type="button"
            >
              {mode === "back" ? "Back only" : "Breadcrumb"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomNav() {
  const tabs = [
    { icon: Home, label: "Home" },
    { icon: CalendarDays, label: "Meetings" },
    { icon: LayoutGrid, label: "More" },
  ];

  return (
    <nav aria-label="Primary" className="absolute inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)]">
      <div className="mx-auto grid w-full grid-cols-3 gap-1 rounded-full border border-white/75 bg-white/62 p-1.5 shadow-[0_24px_55px_rgba(148,163,184,0.22)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58">
        {tabs.map((tab) => {
          const selected = tab.label === "More";
          const IconComponent = tab.icon;

          return (
            <span
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold ${
                selected ? "bg-[#EBF2FF] text-[#2563EB] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]" : "text-[#94A3B8]"
              }`}
              key={tab.label}
            >
              <IconComponent className="h-[18px] w-[18px]" strokeWidth={1.9} />
              {tab.label}
            </span>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Main prototype                                                     */
/* ------------------------------------------------------------------ */

export function LibraryPreviewClient({
  featuredRemnantVideo,
  remnantVideos,
}: {
  featuredRemnantVideo: RemnantVideo | null;
  remnantVideos: readonly RemnantVideo[];
}) {
  const [view, setView] = useState<PreviewView>({ kind: "library" });
  const [chromeMode, setChromeMode] = useState<ChromeMode>("nav");
  const [prayerBackMode, setPrayerBackMode] = useState<PrayerBackMode>("back");
  const [journeyProgress, setJourneyProgress] = useState<Record<string, readonly string[]>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const libraryScrollTop = useRef(0);
  const restoreLibraryScroll = useRef(false);

  const tableTeachings = getDosResourcesByCategory("Table Teachings");
  const commands = getDosResourcesByCategory("Commands of Jesus");
  const discipleship = getDosResourcesByCategory("Discipleship");
  const relationships = getDosResourcesByCategory("Relationships");

  const discipleshipJourneys = discipleship.filter(isJourney);
  const discipleshipOther = discipleship.filter((resource) => !isJourney(resource));

  useLayoutEffect(() => {
    const node = scrollRef.current;

    if (!node) {
      return;
    }

    if (view.kind === "library" && restoreLibraryScroll.current) {
      node.scrollTop = libraryScrollTop.current;
      restoreLibraryScroll.current = false;
      return;
    }

    node.scrollTop = 0;
  }, [view]);

  function openResource(slug: string) {
    libraryScrollTop.current = scrollRef.current?.scrollTop ?? 0;
    setView({ kind: "resource", slug });
  }

  function backToLibrary() {
    restoreLibraryScroll.current = true;
    setView({ kind: "library" });
  }

  function scrollToTop() {
    scrollRef.current?.scrollTo({ behavior: "smooth", top: 0 });
  }

  function toggleWeek(resourceSlug: string, sessionId: string) {
    setJourneyProgress((previous) => {
      const current = previous[resourceSlug] ?? [];
      const next = current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId];

      return { ...previous, [resourceSlug]: next };
    });
  }

  const showBottomNav = view.kind === "library" || chromeMode === "nav";

  /* ------------------------------ Library ------------------------------ */

  function renderLibrary() {
    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[34px] bg-white px-5 py-5 shadow-[0_24px_70px_rgba(37,99,235,0.075)]">
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#EFF6FF] text-[#2563EB] shadow-[inset_0_0_0_1px_#DCEBFF]">
              <BookOpen className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[24px] font-black leading-[1.02] tracking-[-0.035em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
                Grow in truth.
              </h2>
              <p className="mt-1 text-[13px] leading-5 text-[#64748B]">
                Resources for conversations, follow up, and discipleship.
              </p>
            </div>
          </div>
        </section>

        <LibrarySection title="Table Teachings">
          <ResourceRowList>
            {tableTeachings.map((resource) => (
              <ResourceRow
                description={shortDescription(resource)}
                icon={resource.slug === "four-questions" ? Send : BookOpen}
                key={resource.id}
                onOpen={() => openResource(resource.slug)}
                title={resource.title}
                type={typeLabel(resource)}
              />
            ))}
          </ResourceRowList>
        </LibrarySection>

        <LibrarySection title="Commands of Jesus">
          <ResourceRowList>
            {commands.map((resource) => (
              <ResourceRow
                description={shortDescription(resource)}
                icon={resourceIcon(resource.icon)}
                key={resource.id}
                onOpen={() => openResource(resource.slug)}
                title={resource.title}
                type={typeLabel(resource)}
              />
            ))}
          </ResourceRowList>
        </LibrarySection>

        <LibrarySection subtext="Guided Journeys keep an expanded card because they carry duration, progress, and assignment state." title="Discipleship">
          <div className="grid gap-3">
            {discipleshipJourneys.map((resource) => (
              <JourneyCard
                completed={(journeyProgress[resource.slug] ?? []).length}
                key={resource.id}
                onOpen={() => openResource(resource.slug)}
                resource={resource}
                total={resource.content?.guidedResource?.sessions.length ?? 0}
              />
            ))}
            {discipleshipOther.length ? (
              <ResourceRowList>
                {discipleshipOther.map((resource) => (
                  <ResourceRow
                    description={shortDescription(resource)}
                    icon={resourceIcon(resource.icon)}
                    key={resource.id}
                    onOpen={() => openResource(resource.slug)}
                    title={resource.title}
                    type={typeLabel(resource)}
                  />
                ))}
              </ResourceRowList>
            ) : null}
          </div>
        </LibrarySection>

        <LibrarySection subtext="Sermons and trusted teaching on obedience, evangelism, and formation." title="Remnant">
          <ResourceRowList>
            <ResourceRow
              description="Curated video messages for wholehearted disciples."
              icon={Film}
              onOpen={() => openResource(SYNTHETIC_REMNANT_SLUG)}
              title="Remnant Collection"
              type="VIDEO COLLECTION"
            />
          </ResourceRowList>
        </LibrarySection>

        <LibrarySection title="Relationships">
          <ResourceRowList>
            {relationships.map((resource) => (
              <ResourceRow
                description={shortDescription(resource)}
                icon={resourceIcon(resource.icon)}
                key={resource.id}
                onOpen={() => openResource(resource.slug)}
                title={resource.title}
                type={typeLabel(resource)}
              />
            ))}
          </ResourceRowList>
        </LibrarySection>

        <LibrarySection title="Prayer">
          <ResourceRowList>
            <ResourceRow
              description="Identity, healing, relationships, freedom, and life challenges."
              icon={Heart}
              onOpen={() => openResource(SYNTHETIC_PRAYER_SLUG)}
              title="Prayer Resources"
              type="PRAYER"
            />
          </ResourceRowList>
        </LibrarySection>

        <p className="rounded-[20px] border border-dashed border-[#CBD5E1] bg-white/60 p-3 text-[11px] leading-5 text-[#94A3B8]">
          Prototype note: the floating + button is intentionally absent here. Adding people, meetings, and prayer
          already lives in More and on the tabs that own those objects.
        </p>
      </div>
    );
  }

  /* ----------------------------- Resources ----------------------------- */

  function renderResource(slug: string) {
    if (slug === SYNTHETIC_REMNANT_SLUG) {
      const remaining = remnantVideos.filter((video) => video.id !== featuredRemnantVideo?.id);

      return (
        <ResourceShell
          meta={[{ label: "Video Collection" }, { label: `${remnantVideos.length} messages`, tone: "amber" }]}
          onBack={backToLibrary}
          subtitle="Trusted messages to strengthen obedience, evangelism, and formation."
          title="Remnant"
        >
          <div className="space-y-4">
            {featuredRemnantVideo ? (
              <section>
                <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
                  <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
                  Start Here
                </p>
                <RemnantVideoCard video={featuredRemnantVideo} />
              </section>
            ) : null}
            {remaining.length ? (
              <section>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#2563EB]">More Messages</p>
                <div className="grid gap-3">
                  {remaining.map((video) => (
                    <RemnantVideoCard key={video.id} video={video} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </ResourceShell>
      );
    }

    if (slug === SYNTHETIC_PRAYER_SLUG) {
      return (
        <ResourceShell
          meta={[{ label: "Collection" }, { label: `${dosPrayerResources.length} prayers`, tone: "amber" }]}
          onBack={backToLibrary}
          subtitle="Identity, healing, relationships, freedom, and life challenges."
          title="Prayer Resources"
        >
          <PrayerCollection onOpenPrayer={(prayerSlug) => setView({ kind: "prayer", slug: prayerSlug })} />
        </ResourceShell>
      );
    }

    const resource = getDosResourceBySlug(slug);

    if (!resource) {
      return (
        <ResourceShell onBack={backToLibrary} title="Not found">
          <p className="text-sm text-[#64748B]">This resource is not in the prototype.</p>
        </ResourceShell>
      );
    }

    if (slug === "four-questions") {
      return (
        <ResourceShell
          actions={
            <a
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#0F172A]"
              download
              href="/guides/four-questions.pdf"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
              Download PDF
            </a>
          }
          meta={[{ label: "Teaching" }, { label: fourQuestionsEyebrow, tone: "amber" }, { label: "20-30 min", tone: "amber" }]}
          onBack={backToLibrary}
          subtitle={fourQuestionsSubtitle}
          title={fourQuestionsTitle}
        >
          <FourQuestionsContent />
        </ResourceShell>
      );
    }

    if (isJourney(resource) && resource.content?.guidedResource?.sessions.length) {
      const sessions = resource.content.guidedResource.sessions;
      const completedIds = journeyProgress[resource.slug] ?? [];
      const percent = sessions.length ? Math.round((completedIds.length / sessions.length) * 100) : 0;
      const purchaseLink = resource.accessLinks?.find((link) => link.type === "publisher" || link.type === "purchase");

      return (
        <ResourceShell
          actions={
            <>
              {purchaseLink ? (
                <a
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#0F172A]"
                  href={purchaseLink.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Purchase Book
                </a>
              ) : null}
              {resource.downloadPath ? (
                <a
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#0F172A]"
                  download
                  href={resource.downloadPath}
                >
                  <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Download PDF
                </a>
              ) : null}
              {resource.assignable ? (
                <button
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-[#0F172A] px-4 text-xs font-black text-white"
                  type="button"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Assign
                </button>
              ) : null}
            </>
          }
          meta={[
            { label: typeLabel(resource) },
            ...(resource.estimatedDuration ? [{ label: resource.estimatedDuration, tone: "amber" as const }] : []),
            ...(resource.difficulty ? [{ label: resource.difficulty }] : []),
          ]}
          onBack={backToLibrary}
          subtitle={resource.author ?? resource.content?.subtitle}
          title={resource.title}
        >
          <div className="space-y-4">
            <section className="rounded-[20px] border border-[#EAF2FF] bg-white p-4">
              <div
                className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]"
                style={{ fontFamily: font.rajdhani }}
              >
                <span>Progress</span>
                <span>{completedIds.length}/{sessions.length}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EAF2FF]">
                <span className="block h-full rounded-full bg-[#2563EB]" style={{ width: `${percent}%` }} />
              </div>
            </section>
            <JourneyContent
              completedIds={completedIds}
              onToggleComplete={(sessionId) => toggleWeek(resource.slug, sessionId)}
              resource={resource}
            />
          </div>
        </ResourceShell>
      );
    }

    if (resource.content?.assessment) {
      const assessment = resource.content.assessment;

      return (
        <ResourceShell
          meta={[{ label: "Assessment" }, { label: `${assessment.questions.length} questions`, tone: "amber" }]}
          onBack={backToLibrary}
          subtitle={resource.content.assessmentScale}
          title={resource.title}
        >
          <PreviewAssessment
            description={resource.description}
            maxScore={assessment.maxScore}
            onScrollTop={scrollToTop}
            participants={assessment.participants}
            questions={assessment.questions}
          />
        </ResourceShell>
      );
    }

    if (resource.content?.sections?.length) {
      return (
        <ResourceShell
          meta={[{ label: typeLabel(resource) }]}
          onBack={backToLibrary}
          subtitle={resource.content.scripture}
          title={resource.title}
        >
          <div className="space-y-3">
            {resource.content.body ? <p className="text-[15px] leading-7 text-[#475569]">{resource.content.body}</p> : null}
            {resource.content.sections.map((section) => (
              <section className="rounded-[20px] border border-[#EAF2FF] bg-white p-4" key={section.title}>
                <h2 className="text-base font-black leading-tight text-[#0F172A]">{section.title}</h2>
                {section.body ? <p className="mt-2 text-sm leading-6 text-[#475569]">{section.body}</p> : null}
                {section.items?.length ? (
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <li className="text-sm leading-6 text-[#475569]" key={item.title}>
                        <span className="font-black text-[#0F172A]">{item.title}. </span>
                        {item.body}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
            {resource.content.attribution ? (
              <p className="pt-1 text-[11px] leading-5 text-[#94A3B8]">{resource.content.attribution}</p>
            ) : null}
          </div>
        </ResourceShell>
      );
    }

    // Every other Library resource still opens through the same doorway.
    // Content stays a PDF for now, but as a secondary action, not the destination.
    return (
      <ResourceShell
        actions={
          resource.path.endsWith(".pdf") ? (
            <a
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#0F172A]"
              href={resource.path}
              rel="noopener noreferrer"
              target="_blank"
            >
              <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
              Open PDF
            </a>
          ) : null
        }
        meta={[{ label: typeLabel(resource) }]}
        onBack={backToLibrary}
        subtitle={resource.description}
        title={resource.title}
      >
        <div className="rounded-[20px] border border-dashed border-[#CBD5E1] bg-white p-4">
          <p className="text-sm leading-6 text-[#475569]">
            Not converted to native DOS content in this prototype. The point here is that the doorway is identical:
            the resource still opens in place, still says Library, and still returns to where you were.
          </p>
        </div>
      </ResourceShell>
    );
  }

  /* ------------------------------ Prayer ------------------------------- */

  function renderPrayer(slug: string) {
    const prayer = dosPrayerResources.find((resource) => resource.slug === slug);

    return (
      <ResourceShell
        backLabel="Prayer Resources"
        breadcrumb={
          prayerBackMode === "breadcrumb" ? (
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-[#94A3B8]">
              <button className="text-[#2563EB]" onClick={backToLibrary} type="button">Library</button>
              <ChevronRight className="h-3 w-3" strokeWidth={2} />
              <button className="text-[#2563EB]" onClick={() => setView({ kind: "resource", slug: SYNTHETIC_PRAYER_SLUG })} type="button">
                Prayer Resources
              </button>
              <ChevronRight className="h-3 w-3" strokeWidth={2} />
              <span className="text-[#64748B]">{prayer?.title ?? "Prayer"}</span>
            </nav>
          ) : null
        }
        hideBackButton={prayerBackMode === "breadcrumb"}
        meta={prayer ? [{ label: "Prayer" }, { label: prayer.category, tone: "amber" }] : undefined}
        onBack={() => setView({ kind: "resource", slug: SYNTHETIC_PRAYER_SLUG })}
        title={prayer?.title ?? "Prayer"}
      >
        <PrayerDetail slug={slug} />
      </ResourceShell>
    );
  }

  /* ------------------------------ Render ------------------------------- */

  return (
    <div className="relative isolate mx-auto flex h-[100dvh] w-full overflow-hidden bg-white text-[#0F172A]">
      <div
        className={`h-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#F8FBFF] px-4 [scrollbar-width:none] ${
          showBottomNav ? "pb-28" : "pb-10"
        }`}
        ref={scrollRef}
      >
        <PreviewControls
          chromeMode={chromeMode}
          onChromeModeChange={setChromeMode}
          onPrayerBackModeChange={setPrayerBackMode}
          prayerBackMode={prayerBackMode}
        />

        <main className="min-w-0 max-w-full pt-4">
          {view.kind === "library" ? renderLibrary() : null}
          {view.kind === "resource" ? renderResource(view.slug) : null}
          {view.kind === "prayer" ? renderPrayer(view.slug) : null}
        </main>
      </div>

      {showBottomNav ? <BottomNav /> : null}
    </div>
  );
}
