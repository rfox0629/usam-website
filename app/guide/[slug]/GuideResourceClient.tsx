"use client";

import { useMemo, useState } from "react";
import type { DosAssessmentQuestion, DosResource } from "@/src/lib/dos/resource-catalog";

type GuideResourceClientProps = {
  resource: DosResource;
};

type AssessmentScores = Record<string, Record<string, number>>;

const scoreOptions = Array.from({ length: 11 }, (_, index) => index);

export function GuideResourceClient({ resource }: GuideResourceClientProps) {
  const assessment = resource.content?.assessment ?? null;

  if (assessment) {
    return <AssessmentResource resource={resource} />;
  }

  return <TeachingResource resource={resource} />;
}

function TeachingResource({ resource }: GuideResourceClientProps) {
  const sections = resource.content?.sections ?? [];

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-[#0D0D0D]">
      <article className="mx-auto max-w-xl pb-8">
        <header className="rounded-[34px] border border-white/80 bg-white/95 p-5 shadow-[0_24px_70px_rgba(13,13,13,0.10)] backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-usam-gold/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#0D0D0D]">
              {resource.category}
            </span>
            <span className="rounded-full border border-[#C2A14E]/30 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#0D0D0D]/70">
              Teaching
            </span>
          </div>
          <h1 className="mt-4 text-[42px] font-black leading-[0.92] tracking-[-0.045em] text-[#0D0D0D] sm:text-5xl">
            {resource.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-[#0D0D0D]/70">
            {resource.description}
          </p>
          {resource.content?.body ? (
            <p className="mt-3 text-sm leading-6 text-[#0D0D0D]/75">
              {resource.content.body}
            </p>
          ) : null}
          {resource.content?.scripture ? (
            <p className="mt-4 rounded-2xl border border-[#C2A14E]/30 bg-white px-3 py-2 text-sm font-black text-[#0D0D0D]">
              Scripture: {resource.content.scripture}
            </p>
          ) : null}
          <ReferencePills references={resource.content?.scriptureReferences} />
        </header>

        <div className="mt-4 grid gap-3">
          {sections.map((section, sectionIndex) => (
            <section className="rounded-[28px] border border-[#C2A14E]/20 bg-white p-4 shadow-[0_16px_44px_rgba(13,13,13,0.055)]" key={section.title}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-usam-gold/15 text-sm font-black text-[#0D0D0D]">
                  {sectionIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black leading-6 text-[#0D0D0D]">{section.title}</h2>
                  {section.body ? <p className="mt-2 text-sm leading-6 text-[#0D0D0D]/70">{section.body}</p> : null}
                  <ReferencePills references={section.scriptureReferences} />
                </div>
              </div>

              {section.items?.length ? (
                <div className="mt-4 grid gap-2">
                  {section.items.map((item) => (
                    <div className="rounded-[22px] border border-[#C2A14E]/30 bg-white p-3" key={item.title}>
                      <p className="text-sm font-black text-[#0D0D0D]">{item.title}</p>
                      {item.body ? <p className="mt-1 text-sm leading-6 text-[#0D0D0D]/70">{item.body}</p> : null}
                      <ReferencePills references={item.scriptureReferences} />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ))}

          {resource.content?.attribution ? (
            <footer className="rounded-[24px] border border-[#C2A14E]/30 bg-white p-4 text-sm leading-6 text-[#0D0D0D]/70 shadow-[0_12px_34px_rgba(13,13,13,0.045)]">
              <p className="font-bold text-[#0D0D0D]">{resource.content.attribution}</p>
              {resource.content.credits ? <p className="mt-1 text-xs font-semibold text-[#0D0D0D]/55">{resource.content.credits}</p> : null}
            </footer>
          ) : null}
        </div>
      </article>
    </main>
  );
}

function ReferencePills({ references }: { references?: readonly string[] }) {
  if (!references?.length) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {references.map((reference) => (
        <span className="rounded-full bg-usam-gold/15 px-3 py-1.5 text-xs font-bold text-[#0D0D0D]" key={reference}>
          {reference}
        </span>
      ))}
    </div>
  );
}

function AssessmentResource({ resource }: GuideResourceClientProps) {
  const assessment = resource.content?.assessment;
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [scores, setScores] = useState<AssessmentScores>({});
  const [copyMessage, setCopyMessage] = useState("");

  const totalSteps = assessment ? assessment.participants.length * assessment.questions.length : 0;
  const isComplete = started && totalSteps > 0 && stepIndex >= totalSteps;
  const participantIndex = assessment ? Math.min(Math.floor(stepIndex / assessment.questions.length), assessment.participants.length - 1) : 0;
  const questionIndex = assessment ? stepIndex % assessment.questions.length : 0;
  const participant = assessment?.participants[participantIndex] ?? "";
  const question = assessment?.questions[questionIndex] ?? null;
  const selectedScore = question ? scores[participant]?.[question.id] : undefined;
  const progressPercent = totalSteps ? Math.min(100, Math.round((Math.min(stepIndex, totalSteps) / totalSteps) * 100)) : 0;
  const results = useMemo(() => {
    if (!assessment) {
      return [];
    }

    return assessment.participants.map((name) => {
      const participantScores = scores[name] ?? {};
      const total = assessment.questions.reduce((sum, item) => sum + (participantScores[item.id] ?? 0), 0);
      const growthAreas = assessment.questions
        .map((item) => ({ question: item, score: participantScores[item.id] ?? 0 }))
        .sort((first, second) => first.score - second.score)
        .slice(0, 3);

      return { growthAreas, name, total };
    });
  }, [assessment, scores]);

  if (!assessment) {
    return null;
  }

  const maxAssessmentScore = assessment.maxScore;

  function selectScore(value: number) {
    if (!question) {
      return;
    }

    setScores((current) => ({
      ...current,
      [participant]: {
        ...(current[participant] ?? {}),
        [question.id]: value,
      },
    }));
    setCopyMessage("");
  }

  function goNext() {
    if (selectedScore === undefined) {
      return;
    }

    setStepIndex((current) => Math.min(current + 1, totalSteps));
    setCopyMessage("");
  }

  function goBack() {
    setStepIndex((current) => Math.max(current - 1, 0));
    setCopyMessage("");
  }

  function restart() {
    setStarted(false);
    setStepIndex(0);
    setScores({});
    setCopyMessage("");
  }

  async function copyResults() {
    const lines = [
      `${resource.title} Results`,
      "",
      ...results.flatMap((result) => [
        `${result.name}: ${result.total}/${maxAssessmentScore}`,
        `Growth areas: ${result.growthAreas.map(({ question: item }) => questionPrompt(item, result.name)).join("; ")}`,
        "",
      ]),
    ];
    const text = lines.join("\n").trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Results copied.");
    } catch {
      setCopyMessage(text);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-[#0D0D0D]">
      <article className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-xl flex-col justify-center pb-8">
        <section className="rounded-[34px] border border-white/80 bg-white/95 p-5 shadow-[0_24px_70px_rgba(13,13,13,0.10)] backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-usam-gold/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#0D0D0D]">
              {resource.category}
            </span>
            <span className="rounded-full border border-[#C2A14E]/30 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#0D0D0D]/70">
              Assessment
            </span>
          </div>
          <h1 className="mt-4 text-[42px] font-black leading-[0.92] tracking-[-0.045em] text-[#0D0D0D] sm:text-5xl">
            {resource.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-[#0D0D0D]/70">
            {resource.description}
          </p>

          {!started ? (
            <div className="mt-5 rounded-[26px] border border-[#C2A14E]/30 bg-white p-4">
              <p className="text-sm font-black text-[#0D0D0D]">0-10 scale</p>
              <p className="mt-2 text-sm leading-6 text-[#0D0D0D]/70">
                {resource.content?.assessmentScale ?? "Each person answers the same questions and receives a score out of 150."}
              </p>
              <button
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0D0D0D] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(13,13,13,0.22)]"
                onClick={() => setStarted(true)}
                type="button"
              >
                Start Assessment
              </button>
            </div>
          ) : null}

          {started && !isComplete && question ? (
            <div className="mt-5">
              <div className="rounded-full bg-usam-gold/10 p-1">
                <div className="h-2 rounded-full bg-[#0D0D0D] transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#0D0D0D]">
                {participant} - Question {questionIndex + 1} of {assessment.questions.length}
              </p>
              <h2 className="mt-3 text-2xl font-black leading-8 text-[#0D0D0D]">
                {questionPrompt(question, participant)}
              </h2>
              {question.note ? <p className="mt-3 rounded-2xl border border-[#C2A14E]/35 bg-usam-gold/12 px-3 py-2 text-xs font-bold leading-5 text-[#0D0D0D]">{question.note}</p> : null}

              <div className="mt-5 grid grid-cols-6 gap-2">
                {scoreOptions.map((score) => {
                  const selected = selectedScore === score;

                  return (
                    <button
                      aria-pressed={selected}
                      className={`h-11 rounded-2xl text-sm font-black transition-colors ${
                        selected
                          ? "bg-[#0D0D0D] text-white shadow-[0_12px_24px_rgba(13,13,13,0.22)]"
                          : "border border-[#C2A14E]/30 bg-white text-[#0D0D0D] hover:bg-usam-gold/15"
                      }`}
                      key={score}
                      onClick={() => selectScore(score)}
                      type="button"
                    >
                      {score}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-[0.8fr_1fr] gap-2">
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#C2A14E]/30 bg-white px-4 text-sm font-black text-[#0D0D0D]"
                  disabled={stepIndex === 0}
                  onClick={goBack}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0D0D0D] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(13,13,13,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={selectedScore === undefined}
                  onClick={goNext}
                  type="button"
                >
                  {stepIndex + 1 >= totalSteps ? "Show Results" : "Next"}
                </button>
              </div>
            </div>
          ) : null}

          {isComplete ? (
            <div className="mt-5 space-y-3">
              {results.map((result) => (
                <section className="rounded-[26px] border border-[#C2A14E]/30 bg-white p-4" key={result.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-lg font-black text-[#0D0D0D]">{result.name}</h2>
                    <p className="text-2xl font-black text-[#0D0D0D]">{result.total}/{assessment.maxScore}</p>
                  </div>
                  <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#0D0D0D]/55">Growth areas</p>
                  <div className="mt-2 grid gap-2">
                    {result.growthAreas.map(({ question: item, score }) => (
                      <div className="rounded-2xl bg-white px-3 py-2 text-sm leading-5 text-[#0D0D0D]/70" key={item.id}>
                        <span className="font-black text-[#0D0D0D]">{score}/10</span> - {questionPrompt(item, result.name)}
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {copyMessage ? (
                <p className="rounded-2xl border border-[#C2A14E]/35 bg-usam-gold/15 px-3 py-2 text-xs font-bold leading-5 text-[#0D0D0D]">
                  {copyMessage}
                </p>
              ) : null}

              <div className="grid gap-2">
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#0D0D0D] px-4 text-sm font-black text-white shadow-[0_14px_28px_rgba(13,13,13,0.22)]"
                  onClick={copyResults}
                  type="button"
                >
                  Copy Results
                </button>
                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#C2A14E]/30 bg-white px-4 text-sm font-black text-[#0D0D0D]"
                  onClick={restart}
                  type="button"
                >
                  Start Over
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </article>
    </main>
  );
}

function questionPrompt(question: DosAssessmentQuestion, participant: string) {
  return question.participantPrompts?.[participant] ?? question.prompt;
}
