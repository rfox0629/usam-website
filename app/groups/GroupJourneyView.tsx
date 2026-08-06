"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DosResource } from "@/src/lib/dos/resource-catalog";
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
      return "Week marked complete. Great work.";
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

  return (
    <main className="min-h-screen bg-[#080A0D] text-[#F5F3EE]">
      <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-28 sm:px-6 sm:py-6">
        <div>
          <Link className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]" href={groupPath}>
            {groupName}
          </Link>
          <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">{resource.title}</h1>
          {resource.author ? <p className="mt-1 text-sm font-semibold text-white/60">{resource.author}</p> : null}
        </div>

        {message ? (
          <p className="rounded-lg border border-[#C2A14E]/35 bg-[#C2A14E]/10 px-3 py-2 text-sm font-bold text-[#F8C56A]">{message}</p>
        ) : null}

        <section className="rounded-lg border border-[#C2A14E]/22 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
            <span>Progress</span>
            <span>{completedCount}/{sessions.length} weeks complete</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-[#C2A14E]" style={{ width: sessions.length ? `${(completedCount / sessions.length) * 100}%` : "0%" }} />
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

        <section className="grid gap-2 rounded-lg border border-white/10 bg-[#111418] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
          <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Weeks</p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {sessions.map((session) => {
              const sessionComplete = Boolean(progressBySession.get(session.id)?.completedAt);
              const isSelected = session.id === selectedSessionId;

              return (
                <button
                  className={`flex min-h-14 shrink-0 flex-col items-start justify-center gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-[#C2A14E] bg-[#C2A14E]/14 text-[#F8C56A]"
                      : "border-white/12 bg-white/[0.03] text-white/70 hover:border-white/24"
                  }`}
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  type="button"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
                    {sessionComplete ? "Done" : `Week ${session.order}`}
                  </span>
                  <span className="max-w-[9rem] truncate text-xs font-bold">{session.title.replace(/^Week \d+\s*-\s*/, "")}</span>
                </button>
              );
            })}
          </div>
        </section>

        {selectedSession ? (
          <section className="grid gap-3 rounded-lg border border-white/10 bg-[#111418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">{selectedSession.title}</p>
                <p className="mt-1 text-sm font-semibold text-white/60">Reading: {selectedSession.assignment}</p>
              </div>
              {isComplete ? (
                <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
                  Complete
                </span>
              ) : null}
            </div>

            <p className="text-base font-bold leading-7 text-white">{selectedSession.bigIdea}</p>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Search the Scriptures</p>
              <p className="mt-1 text-sm font-bold leading-6 text-white">{selectedSession.keyScriptures.join(" · ")}</p>
            </div>

            {selectedSession.memoryVerse ? (
              <div className="rounded-lg border border-[#C2A14E]/30 bg-[#C2A14E]/10 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#F8C56A]">Weekly Memory Verse</p>
                <p className="mt-1 text-sm font-black text-white">{selectedSession.memoryVerse.reference}</p>
              </div>
            ) : null}

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Discuss Together</p>
              <ul className="mt-2 grid gap-2">
                {selectedSession.discussionQuestions.map((question) => (
                  <li className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-6 text-white/85" key={question}>{question}</li>
                ))}
              </ul>
            </div>

            {selectedSession.leaderNotes ? (
              <details className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Leader Notes</summary>
                <p className="mt-2 text-sm leading-6 text-white/70">{selectedSession.leaderNotes}</p>
              </details>
            ) : null}

            <form action={saveGroupMemberJourneyProgress} className="grid gap-3 border-t border-white/10 pt-3" key={selectedSession.id}>
              <input name="slug" type="hidden" value={groupSlug} />
              <input name="resourceSlug" type="hidden" value={resource.slug} />
              <input name="sessionId" type="hidden" value={selectedSession.id} />

              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Reflect Personally — {selectedSession.personalReflection}</span>
                <textarea
                  className="min-h-28 rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]"
                  defaultValue={selectedProgress?.reflection ?? ""}
                  name="reflection"
                  placeholder="Write what God is showing you this week."
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Walk It Out — {selectedSession.actionStep}</span>
                <textarea
                  className="min-h-20 rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]"
                  defaultValue={selectedProgress?.actionStep ?? ""}
                  name="actionStep"
                  placeholder="Name one concrete next step."
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Pray — {selectedSession.prayerFocus}</span>
                <textarea
                  className="min-h-20 rounded-lg border border-white/12 bg-[#080A0D] px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-white/30 focus:border-[#C2A14E]"
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
                    Reopen This Week
                  </button>
                ) : (
                  <button className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#C2A14E] px-4 text-sm font-black text-[#080A0D]" name="intent" type="submit" value="complete">
                    Save &amp; Mark Complete
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
