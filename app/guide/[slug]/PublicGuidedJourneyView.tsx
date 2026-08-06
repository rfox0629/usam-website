"use client";

import { CheckCircle2, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { DosResource } from "@/src/lib/dos/resource-catalog";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

type SavedDayProgress = {
  actionStep?: string;
  completed?: boolean;
  prayerFocus?: string;
  reflection?: string;
};

type SavedProgress = Record<string, SavedDayProgress>;

function progressStorageKey(slug: string) {
  return `usam-guide-progress:${slug}`;
}

function loadSavedProgress(slug: string): SavedProgress {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(progressStorageKey(slug));

    return raw ? (JSON.parse(raw) as SavedProgress) : {};
  } catch {
    return {};
  }
}

function persistSavedProgress(slug: string, progress: SavedProgress) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(progressStorageKey(slug), JSON.stringify(progress));
  } catch {
    // Private-browsing or storage-full failures are non-fatal for a self-guided plan.
  }
}

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

function DayCard({ accent = "neutral", children, eyebrow }: { accent?: "blue" | "gold" | "neutral"; children: ReactNode; eyebrow: string }) {
  const borderClass = accent === "gold" ? "border-[#FED7AA] bg-[#FFF7ED]" : accent === "blue" ? "border-[#BFDBFE] bg-[#EBF2FF]" : "border-[#EAF2FF] bg-[#F8FBFF]";

  return (
    <div className={`rounded-2xl border px-3.5 py-3 ${borderClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>{eyebrow}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function PublicGuidedJourneyView({ resource }: { resource: DosResource }) {
  const sessions = useMemo(() => resource.content?.guidedResource?.sessions ?? [], [resource]);
  const [progress, setProgress] = useState<SavedProgress>({});
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState(sessions[0]?.id ?? "");
  const [reflection, setReflection] = useState("");
  const [actionStep, setActionStep] = useState("");
  const [prayerFocus, setPrayerFocus] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    const saved = loadSavedProgress(resource.slug);
    const firstOpen = sessions.find((session) => !saved[session.id]?.completed) ?? sessions[0] ?? null;

    setProgress(saved);
    setSelectedId(firstOpen?.id ?? sessions[0]?.id ?? "");
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource.slug]);

  const selectedSession = sessions.find((session) => session.id === selectedId) ?? sessions[0] ?? null;
  const selectedProgress = selectedSession ? progress[selectedSession.id] : undefined;

  useEffect(() => {
    setReflection(selectedProgress?.reflection ?? "");
    setActionStep(selectedProgress?.actionStep ?? "");
    setPrayerFocus(selectedProgress?.prayerFocus ?? "");
    setSavedNotice(false);
  }, [selectedProgress?.actionStep, selectedProgress?.prayerFocus, selectedProgress?.reflection, selectedSession?.id]);

  const completedCount = sessions.filter((session) => progress[session.id]?.completed).length;
  const isComplete = Boolean(selectedProgress?.completed);
  const firstOpenSession = sessions.find((session) => !progress[session.id]?.completed) ?? sessions[0] ?? null;

  function saveDay(completed?: boolean) {
    if (!selectedSession) {
      return;
    }

    const next: SavedProgress = {
      ...progress,
      [selectedSession.id]: {
        actionStep,
        completed: completed ?? selectedProgress?.completed ?? false,
        prayerFocus,
        reflection,
      },
    };

    setProgress(next);
    persistSavedProgress(resource.slug, next);
    setSavedNotice(true);
  }

  if (!sessions.length) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#F8FBFF_0%,#F6F8FF_52%,#FFF4EC_100%)] text-[#0F172A]">
      <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-6 pb-24 sm:px-6 sm:py-10">
        <div>
          <a className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1D4ED8]" href="/">USA Missionaries</a>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>Reading Plan</span>
            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Self-Guided</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-[#0F172A] sm:text-4xl" style={{ fontFamily: font.oswald }}>{resource.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#475569]">{resource.content?.subtitle ?? resource.description}</p>
          {resource.downloadPath ? (
            <a className="mt-3 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#0F172A]" download href={resource.downloadPath}>
              <FileText className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
              Download PDF
            </a>
          ) : null}
        </div>

        <p className="rounded-2xl border border-[#DCEBFF] bg-white/80 px-3.5 py-2.5 text-xs font-semibold leading-5 text-[#475569]">
          Reading without an account? Your notes and completed days are saved in this browser only. Ask your group leader for a personal invite link to save your progress permanently.
        </p>

        <section className="rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_16px_40px_rgba(37,99,235,0.05)]">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
            <span>{completedCount === sessions.length ? "Plan complete" : "Progress"}</span>
            <span>{completedCount}/{sessions.length} days complete</span>
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {sessions.map((session) => {
              const done = Boolean(progress[session.id]?.completed);
              const isCurrent = session.id === firstOpenSession?.id;

              return (
                <span
                  className={`h-2 flex-1 rounded-full ${done ? "bg-[#2563EB]" : isCurrent ? "bg-[#93C5FD]" : "bg-[#EAF2FF]"}`}
                  key={session.id}
                />
              );
            })}
          </div>
        </section>

        <section className="relative grid gap-2 rounded-[24px] border border-[#EAF2FF] bg-white p-3 shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
          <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Days</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {sessions.map((session) => {
              const done = Boolean(progress[session.id]?.completed);
              const isCurrent = session.id === firstOpenSession?.id;
              const isSelected = session.id === selectedId;
              const stateLabel = done ? "Done" : isCurrent ? "Current" : "Day";

              return (
                <button
                  className={`flex min-h-14 shrink-0 flex-col items-start justify-center gap-0.5 rounded-2xl border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]"
                      : done
                        ? "border-[#BFDBFE] bg-[#F8FBFF] text-[#0F172A] hover:border-[#2563EB]"
                        : isCurrent
                          ? "border-[#93C5FD] bg-[#F8FBFF] text-[#0F172A] hover:border-[#2563EB]"
                          : "border-[#EAF2FF] bg-white text-[#64748B] hover:border-[#BFDBFE]"
                  }`}
                  key={session.id}
                  onClick={() => setSelectedId(session.id)}
                  type="button"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
                    {stateLabel === "Done" ? "✓ Done" : stateLabel === "Current" ? "● Current" : `Day ${session.order}`}
                  </span>
                  <span className="max-w-[9rem] truncate text-xs font-bold">{session.title.replace(/^Day \d+\s*-\s*/, "")}</span>
                </button>
              );
            })}
          </div>
        </section>

        {selectedSession ? (
          <section className="grid gap-3 rounded-[24px] border border-[#DCEBFF] bg-white p-4 shadow-[0_16px_40px_rgba(37,99,235,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>{selectedSession.title}</p>
              {isComplete ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#DCFCE7] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#15803D]" style={{ fontFamily: font.rajdhani }}>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
                  Complete
                </span>
              ) : null}
            </div>

            <DayCard eyebrow="Reading Assignment">
              <p className="text-sm font-bold leading-6 text-[#0F172A]">{selectedSession.assignment}</p>
            </DayCard>

            {selectedSession.beginWithPrayer ? (
              <DayCard accent="gold" eyebrow="Begin With Prayer">
                <p className="text-sm font-bold leading-6 text-[#0F172A]">{selectedSession.beginWithPrayer}</p>
              </DayCard>
            ) : null}

            {selectedSession.lookForChrist || selectedSession.listenCarefully || selectedSession.respondPersonally || selectedSession.moveTowardOthers ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedSession.lookForChrist ? (
                  <DayCard accent="blue" eyebrow="Look for Christ">
                    <p className="text-sm font-bold leading-6 text-[#0F172A]">{selectedSession.lookForChrist}</p>
                  </DayCard>
                ) : null}
                {selectedSession.listenCarefully ? (
                  <DayCard accent="blue" eyebrow="Listen Carefully">
                    <p className="text-sm font-bold leading-6 text-[#0F172A]">{selectedSession.listenCarefully}</p>
                  </DayCard>
                ) : null}
                {selectedSession.respondPersonally ? (
                  <DayCard accent="blue" eyebrow="Respond Personally">
                    <p className="text-sm font-bold leading-6 text-[#0F172A]">{selectedSession.respondPersonally}</p>
                  </DayCard>
                ) : null}
                {selectedSession.moveTowardOthers ? (
                  <DayCard accent="blue" eyebrow="Move Toward Others">
                    <p className="text-sm font-bold leading-6 text-[#0F172A]">{selectedSession.moveTowardOthers}</p>
                  </DayCard>
                ) : null}
              </div>
            ) : null}

            <form
              className="grid gap-3 border-t border-[#EAF2FF] pt-3"
              key={selectedSession.id}
              onSubmit={(event) => {
                event.preventDefault();
                saveDay();
              }}
            >
              {selectedSession.personalReflection ? (
                <label className="grid gap-1.5 rounded-2xl border border-[#EAF2FF] bg-[#F8FBFF] px-3.5 py-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Summary &amp; Reflection — {selectedSession.personalReflection}</span>
                  <AutoGrowTextarea
                    className="min-h-24 resize-none overflow-hidden rounded-xl border border-[#DCEBFF] bg-white px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                    onChange={(event) => setReflection(event.target.value)}
                    placeholder="Write one sentence about today's reading."
                    value={reflection}
                  />
                </label>
              ) : null}

              <label className="grid gap-1.5 rounded-2xl border border-[#EAF2FF] bg-[#F8FBFF] px-3.5 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Next Step / Walk It Out — {selectedSession.actionStep}</span>
                <AutoGrowTextarea
                  className="min-h-20 resize-none overflow-hidden rounded-xl border border-[#DCEBFF] bg-white px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                  onChange={(event) => setActionStep(event.target.value)}
                  placeholder="Name one faithful next step."
                  value={actionStep}
                />
              </label>

              <label className="grid gap-1.5 rounded-2xl border border-[#EAF2FF] bg-[#F8FBFF] px-3.5 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Prayer Response — {selectedSession.prayerFocus}</span>
                <AutoGrowTextarea
                  className="min-h-20 resize-none overflow-hidden rounded-xl border border-[#DCEBFF] bg-white px-3 py-3 text-sm leading-6 text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                  onChange={(event) => setPrayerFocus(event.target.value)}
                  placeholder="Turn what you read into a one-phrase prayer."
                  value={prayerFocus}
                />
              </label>

              {savedNotice ? <p className="text-xs font-bold leading-5 text-[#15803D]">Saved in this browser.</p> : null}
              {!hydrated ? null : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#0F172A]" type="submit">
                    Save Progress
                  </button>
                  {isComplete ? (
                    <button className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-4 text-xs font-black text-[#0F172A]" onClick={() => saveDay(false)} type="button">
                      Reopen This Day
                    </button>
                  ) : (
                    <button className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#2563EB] px-4 text-xs font-black text-white" onClick={() => saveDay(true)} type="button">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
                      Save &amp; Mark Day Complete
                    </button>
                  )}
                </div>
              )}
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
