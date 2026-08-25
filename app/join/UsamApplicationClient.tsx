"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  identityFieldLabels,
  joinApplicationSections,
  supportBudgetAnswerId,
  supportBudgetCategories,
  visibleFieldsForSection,
  visibleFieldsForStep,
  type JoinField,
  type JoinFieldSection,
} from "./application-fields";
import {
  applicantDisplayName,
  joinApplicationStepIndex,
  joinApplicationSteps,
  joinDisclosureIds,
  joinDisclosureLabels,
  type JoinApplicantIdentity,
  type JoinApplicationDraft,
  type JoinApplicationPhoto,
  type JoinApplicationStepId,
} from "@/src/lib/join/application-steps";

/**
 * USA-167: the USA Missionaries application.
 *
 * The draft lives on the server, not in localStorage. That is the whole reason a
 * resume link can work at all: the applicant can start on a laptop, get the
 * email, and continue on a phone. The token minted on first save is held in
 * component state and sent with every later save so they all land on one draft.
 */

type ResumeState = "expired" | "none" | "restored" | "revoked" | "submitted" | "unavailable";

type SaveState = "error" | "idle" | "saved" | "saving";

type Props = {
  initialDraft: JoinApplicationDraft;
  initialStep: JoinApplicationStepId;
  resumeState: ResumeState;
  resumeToken: string | null;
};

const shellClassName =
  "usam-application-route min-h-screen bg-[linear-gradient(135deg,#F8FBFF_0%,#F6F8FF_48%,#FFF4EC_100%)] text-[#0F172A]";
const wholeDollarFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

type SupportPath = "no" | "unsure" | "yes";

function isApplicationContentStep(
  value: JoinApplicationStepId,
): value is Exclude<JoinApplicationStepId, "review" | "start"> {
  return value !== "review" && value !== "start";
}

function moneyNumber(value: string | undefined) {
  return Number((value ?? "").replace(/[^0-9.]/g, "")) || 0;
}

function cleanMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...decimals] = cleaned.split(".");

  return decimals.length > 0 ? `${whole}.${decimals.join("").slice(0, 2)}` : whole;
}

function formatMoney(value: number) {
  return wholeDollarFormatter.format(value);
}

function supportPathFromDraft(draft: JoinApplicationDraft): SupportPath | "" {
  const value = draft.answers.supportPath;

  return value === "yes" || value === "unsure" || value === "no" ? value : "";
}

function supportSectionsForDraft(draft: JoinApplicationDraft) {
  const sections = joinApplicationSections.support;
  const path = supportPathFromDraft(draft);

  if (!path) {
    return sections;
  }

  if (path === "no") {
    return [sections[0], { ...sections[3], intro: "Share any financial or ministry needs we should still understand.", title: "Anything else" }];
  }

  return sections;
}

function supportBudgetSummary(draft: JoinApplicationDraft) {
  const budget = supportBudgetCategories.reduce(
    (totals, category) => {
      totals[category.group] += moneyNumber(draft.answers[supportBudgetAnswerId(category.key)]);

      return totals;
    },
    { household: 0, ministry: 0 },
  );
  const { household, ministry } = budget;
  const budgetTotal = household + ministry;
  const proposedNeed = moneyNumber(draft.answers.supportMonthlyNeed);
  const committed = moneyNumber(draft.answers.supportCommittedAmount);
  const otherIncome = moneyNumber(draft.answers.supportOtherMonthlyIncome);
  const covered = committed + otherIncome;

  return {
    budgetTotal,
    committed,
    covered,
    gap: Math.max(0, proposedNeed - covered),
    household,
    ministry,
    otherIncome,
    proposedNeed,
    requestedGoal: moneyNumber(draft.answers.supportRequestedGoal),
  };
}

function resumeNotice(state: ResumeState) {
  switch (state) {
    case "expired":
      return "That link has expired. Your answers are safe, so contact us and we will send a fresh one.";
    case "restored":
      return "Welcome back. Your application is exactly where you left it.";
    case "revoked":
      return "That link is no longer active. Contact us if you need a new one.";
    case "submitted":
      return "This application has already been submitted, so the link no longer opens it.";
    case "unavailable":
      return "We could not find an application for that link. You can start a new one below.";
    default:
      return "";
  }
}

export function UsamApplicationClient({ initialDraft, initialStep, resumeState, resumeToken }: Props) {
  const [draft, setDraft] = useState<JoinApplicationDraft>(initialDraft);
  const [stepId, setStepId] = useState<JoinApplicationStepId>(initialStep);
  const [token, setToken] = useState<string | null>(resumeToken);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [emailNotice, setEmailNotice] = useState("");
  const [started, setStarted] = useState(initialStep !== "start");
  const [submitState, setSubmitState] = useState<"error" | "idle" | "submitted" | "submitting">("idle");
  const [submitError, setSubmitError] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [sectionIndexByStep, setSectionIndexByStep] = useState<Partial<Record<JoinApplicationStepId, number>>>({});

  // One intentional click owns one stable request ID. It survives an
  // ambiguous network failure so a retry cannot create a second email, while
  // a successful later click starts a new intentional send.
  const resumeEmailAttemptRef = useRef<{ id: string; inFlight: boolean } | null>(null);

  // Skips the autosave that would otherwise fire immediately on mount and
  // create an empty draft row for anyone who merely opened the page.
  const dirtyRef = useRef(false);

  const stepIndex = joinApplicationStepIndex(stepId);
  const step = joinApplicationSteps[stepIndex];
  const currentSections = isApplicationContentStep(stepId)
    ? stepId === "support"
      ? supportSectionsForDraft(draft)
      : joinApplicationSections[stepId]
    : [];
  const requestedSectionIndex = sectionIndexByStep[stepId] ?? 0;
  const sectionIndex = Math.min(requestedSectionIndex, Math.max(0, currentSections.length - 1));
  const currentSection = currentSections[sectionIndex];
  const currentSectionFields = isApplicationContentStep(stepId) && currentSection
    ? visibleFieldsForSection(stepId, currentSection.id, draft.applyingAsCouple)
    : [];
  const continueBlocked = stepId === "support" && currentSection?.id === "path" && !supportPathFromDraft(draft);

  const persist = useCallback(
    async (options: { sendResumeEmail?: boolean } = {}) => {
      const shouldSendResumeEmail = options.sendResumeEmail === true;

      if (shouldSendResumeEmail && resumeEmailAttemptRef.current?.inFlight) {
        return true;
      }

      const emailRequestId = shouldSendResumeEmail
        ? resumeEmailAttemptRef.current?.id ?? crypto.randomUUID()
        : undefined;

      if (shouldSendResumeEmail && emailRequestId) {
        resumeEmailAttemptRef.current = { id: emailRequestId, inFlight: true };
      }

      setSaveState("saving");

      try {
        const response = await fetch("/api/join/draft", {
          body: JSON.stringify({
            currentStep: stepId,
            draft,
            emailRequestId,
            resumeToken: token,
            sendResumeEmail: shouldSendResumeEmail,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("save failed");
        }

        const result = (await response.json()) as { emailSent?: boolean; resumeToken?: string | null };

        if (result.resumeToken) {
          setToken(result.resumeToken);
        }

        setSaveState("saved");

        if (shouldSendResumeEmail) {
          resumeEmailAttemptRef.current = null;
          setEmailNotice(
            result.emailSent
              ? "We sent your link. Check your inbox."
              : "Your application is saved. We could not send the email just now, so keep this tab open if you can.",
          );
        }

        return true;
      } catch {
        if (shouldSendResumeEmail && emailRequestId && resumeEmailAttemptRef.current?.id === emailRequestId) {
          resumeEmailAttemptRef.current = { id: emailRequestId, inFlight: false };
        }

        setSaveState("error");

        return false;
      }
    },
    [draft, stepId, token],
  );

  // Autosave a short while after typing stops, so a browser closing unexpectedly
  // does not cost the applicant their work.
  useEffect(() => {
    if (!dirtyRef.current || !started) {
      return;
    }

    const timer = setTimeout(() => {
      void persist();
    }, 1500);

    return () => clearTimeout(timer);
  }, [draft, persist, started, stepId]);

  const setAnswer = (id: string, value: string) => {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, answers: { ...current.answers, [id]: value } }));
  };

  const setIdentity = (person: "applicant" | "spouse", key: keyof JoinApplicantIdentity, value: string) => {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, [person]: { ...current[person], [key]: value } }));
  };

  const setDisclosure = (id: string, value: boolean) => {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, disclosures: { ...current.disclosures, [id]: value } }));
  };

  const addPhoto = (photo: JoinApplicationPhoto) => {
    dirtyRef.current = true;
    setDraft((current) => ({
      ...current,
      // One photo per kind: a second profile photo replaces the first rather
      // than quietly piling up in the bucket.
      photos: [...current.photos.filter((existing) => existing.kind !== photo.kind), photo],
    }));
  };

  const removePhoto = (path: string) => {
    dirtyRef.current = true;
    setDraft((current) => ({ ...current, photos: current.photos.filter((photo) => photo.path !== path) }));
  };

  async function submitApplication() {
    if (!token) {
      setSubmitError("Save your application before submitting.");

      return;
    }

    setSubmitState("submitting");
    setSubmitError("");

    // Submission reads the draft from the server by token, so it has to be
    // saved first or the last edits would not be part of what is submitted.
    const saved = await persist();

    if (!saved) {
      setSubmitState("error");
      setSubmitError("We could not save your latest answers, so we have not submitted anything yet.");

      return;
    }

    try {
      const response = await fetch("/api/join/application", {
        body: JSON.stringify({ resumeToken: token }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { applicationId?: string; error?: string };

      if (!response.ok) {
        throw new Error(
          result.error === "disclosures_required"
            ? "Please confirm each acknowledgement before submitting."
            : "We could not submit your application just now. Your answers are saved.",
        );
      }

      setApplicationId(result.applicationId ?? "");
      setSubmitState("submitted");
      window.scrollTo({ behavior: "smooth", top: 0 });
    } catch (error) {
      setSubmitState("error");
      setSubmitError(error instanceof Error ? error.message : "We could not submit your application just now.");
    }
  }

  const requiredMissing = useMemo(() => {
    const missing: { label: string; sectionId?: string; stepId: JoinApplicationStepId }[] = [];
    const supportPath = supportPathFromDraft(draft);
    const expectsFundraising = supportPath === "yes" || supportPath === "unsure";

    if (!draft.applicant.firstName.trim() || !draft.applicant.lastName.trim() || !draft.applicant.email.trim()) {
      missing.push({ label: "Your name and email", sectionId: "identity", stepId: "about" });
    }

    if (draft.applyingAsCouple && (!draft.spouse.firstName.trim() || !draft.spouse.lastName.trim())) {
      missing.push({ label: "Your spouse's name", sectionId: "identity", stepId: "about" });
    }

    for (const candidate of joinApplicationSteps) {
      if (candidate.id === "start" || candidate.id === "review") {
        continue;
      }

      for (const field of visibleFieldsForStep(candidate.id, draft.applyingAsCouple)) {
        if (
          candidate.id === "support" &&
          (field.id === "supportMonthlyNeed" || field.id === "fundraisingReadiness") &&
          !expectsFundraising
        ) {
          continue;
        }

        if (field.required && !(draft.answers[field.id] ?? "").trim()) {
          missing.push({ label: field.label, sectionId: field.section, stepId: candidate.id });
        }
      }
    }

    if (!supportPath) {
      missing.push({ label: "Whether you expect to raise monthly support", sectionId: "path", stepId: "support" });
    }

    if (expectsFundraising && supportBudgetSummary(draft).budgetTotal <= 0) {
      missing.push({ label: "Your monthly budget estimates", sectionId: "budget", stepId: "support" });
    }

    if (expectsFundraising && draft.disclosures.excessSupportAgreement !== true) {
      missing.push({ label: "Support overflow acknowledgement", sectionId: "readiness", stepId: "support" });
    }

    return missing;
  }, [draft]);

  const goTo = (next: JoinApplicationStepId, sectionId?: string) => {
    if (sectionId && isApplicationContentStep(next)) {
      const sections = next === "support" ? supportSectionsForDraft(draft) : joinApplicationSections[next];
      const nextSectionIndex = sections.findIndex((section) => section.id === sectionId);

      if (nextSectionIndex >= 0) {
        setSectionIndexByStep((current) => ({ ...current, [next]: nextSectionIndex }));
      }
    } else {
      setSectionIndexByStep((current) => ({ ...current, [next]: 0 }));
    }

    setStepId(next);
    dirtyRef.current = true;
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  const goRelative = (offset: number) => {
    if (isApplicationContentStep(stepId)) {
      const nextSectionIndex = sectionIndex + offset;

      if (nextSectionIndex >= 0 && nextSectionIndex < currentSections.length) {
        setSectionIndexByStep((current) => ({ ...current, [stepId]: nextSectionIndex }));
        dirtyRef.current = true;
        window.scrollTo({ behavior: "smooth", top: 0 });

        return;
      }
    }

    const next = joinApplicationSteps[stepIndex + offset];

    if (next) {
      if (offset < 0 && isApplicationContentStep(next.id)) {
        const previousSections = next.id === "support" ? supportSectionsForDraft(draft) : joinApplicationSections[next.id];

        setSectionIndexByStep((current) => ({ ...current, [next.id]: Math.max(0, previousSections.length - 1) }));
        setStepId(next.id);
        dirtyRef.current = true;
        window.scrollTo({ behavior: "smooth", top: 0 });
      } else {
        goTo(next.id);
      }
    }
  };

  const notice = resumeNotice(resumeState);

  return (
    <main className={shellClassName}>
      <style>{`
        body:has(.usam-application-route) {
          background: linear-gradient(135deg, #F8FBFF 0%, #F6F8FF 48%, #FFF4EC 100%) !important;
          color: #0F172A;
        }
        body:has(.usam-application-route) > footer { display: none !important; }
      `}</style>

      <div className="mx-auto w-full max-w-[820px] px-4 pb-32 pt-8 sm:px-6 sm:pt-12">
        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#2563EB]">Join USA Missionaries</p>

        {notice ? (
          <p className="mt-4 rounded-2xl border border-[#DCEBFF] bg-white px-4 py-3 text-sm font-semibold text-[#1D4ED8]">
            {notice}
          </p>
        ) : null}

        {submitState === "submitted" ? (
          <SubmittedScreen applicationId={applicationId} name={applicantDisplayName(draft)} />
        ) : stepId === "start" && !started ? (
          <StartScreen onStart={() => { setStarted(true); goTo("about"); }} resumeState={resumeState} />
        ) : (
          <>
            <ProgressRail currentIndex={stepIndex} onSelect={(next) => goTo(next)} />

            <h1 className="mt-7 text-[34px] font-black leading-[1.05] tracking-[-0.03em] text-[#020617] sm:text-[44px]">
              {step.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-[#475569]">{step.intro}</p>

            {currentSection ? (
              <GuidedPartHeader
                current={sectionIndex + 1}
                intro={currentSection.intro}
                title={currentSection.title}
                total={currentSections.length}
              />
            ) : null}

            <div className="mt-5">
              {stepId === "about" && currentSection?.id === "identity" ? (
                <IdentitySection
                  draft={draft}
                  onIdentityChange={setIdentity}
                  onToggleCouple={(value) => {
                    dirtyRef.current = true;
                    setDraft((current) => ({ ...current, applyingAsCouple: value }));
                  }}
                />
              ) : null}

              {stepId === "review" ? (
                <ReviewSection
                  draft={draft}
                  missing={requiredMissing}
                  onJump={goTo}
                  onSubmit={() => void submitApplication()}
                  onToggleDisclosure={setDisclosure}
                  submitError={submitError}
                  submitState={submitState}
                />
              ) : null}

              {stepId === "support" && currentSection ? (
                <SupportSection
                  draft={draft}
                  onAnswer={setAnswer}
                  onDisclosure={setDisclosure}
                  section={currentSection}
                />
              ) : null}

              {isApplicationContentStep(stepId) && stepId !== "support" && currentSectionFields.length > 0 ? (
                <div className="grid gap-5 rounded-[26px] border border-[#DCEBFF] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:grid-cols-2 sm:p-6">
                  {currentSectionFields.map((field) => (
                    <FieldInput
                      field={field}
                      key={field.id}
                      onChange={(value) => setAnswer(field.id, value)}
                      value={draft.answers[field.id] ?? ""}
                    />
                  ))}
                </div>
              ) : null}

              {stepId === "profile" && currentSection?.id === "photos" ? (
                <PhotoSection draft={draft} onRemove={removePhoto} onUploaded={addPhoto} />
              ) : null}
            </div>

            <SaveBar
              emailNotice={emailNotice}
              hasEmail={Boolean(draft.applicant.email.trim())}
              onSave={() => void persist()}
              onSaveAndEmail={() => void persist({ sendResumeEmail: true })}
              saveState={saveState}
            />

            <nav className="mt-10 flex items-center justify-between gap-3">
              <button
                className="inline-flex h-12 min-w-[7rem] items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-5 text-sm font-black text-[#0F172A] disabled:opacity-40"
                disabled={stepIndex <= 1 && sectionIndex === 0}
                onClick={() => goRelative(-1)}
                type="button"
              >
                Back
              </button>

              {stepId === "review" ? (
                <span className="text-sm font-semibold text-[#475569]">
                  {requiredMissing.length === 0
                    ? "Ready to submit."
                    : `${requiredMissing.length} question${requiredMissing.length === 1 ? "" : "s"} still to answer.`}
                </span>
              ) : (
                <button
                  className="inline-flex h-12 min-w-[7rem] items-center justify-center rounded-full bg-[#F5B82E] px-6 text-sm font-black text-[#111827] shadow-[0_14px_28px_rgba(245,184,46,0.24)] transition hover:bg-[#F7C64B] disabled:cursor-not-allowed disabled:bg-[#E2E8F0] disabled:text-[#64748B] disabled:shadow-none"
                  disabled={continueBlocked}
                  onClick={() => goRelative(1)}
                  type="button"
                >
                  {continueBlocked
                    ? "Choose an option"
                    : sectionIndex < currentSections.length - 1
                      ? "Continue"
                      : `Continue to ${joinApplicationSteps[stepIndex + 1]?.title ?? "Review"}`}
                </button>
              )}
            </nav>
          </>
        )}
      </div>
    </main>
  );
}

function StartScreen({ onStart, resumeState }: { onStart: () => void; resumeState: ResumeState }) {
  return (
    <section className="mt-5">
      <h1 className="text-[40px] font-black leading-[1.02] tracking-[-0.035em] text-[#020617] sm:text-[56px]">
        Apply to Become a USA Missionary
      </h1>

      <div className="mt-7 space-y-5 text-base leading-7 text-[#334155] [&>p]:text-[#334155]">
        <p>
          USA Missionaries sends and supports missionaries serving here at home. This is an application to serve with
          us, and a real person on our team will read every word of it.
        </p>
        <p>
          Take your time. The questions ask about your faith, your calling, your ministry experience, and what you
          believe God is asking you to do. Thoughtful answers help us understand you, and rushed ones do not.
        </p>
        <p>
          Your progress is saved as you go. You can stop at any point and we will email you a link that brings you
          straight back here, on any device.
        </p>
        <p>
          Submitting an application does not guarantee acceptance. Nothing you write becomes public automatically. If
          you are accepted, we would use some of this material to prepare a missionary profile, and you would review it
          before anything is published.
        </p>
      </div>

      <button
        className="mt-9 inline-flex h-13 min-h-[3.25rem] w-full items-center justify-center rounded-full bg-[#F5B82E] px-8 text-base font-black text-[#111827] shadow-[0_16px_32px_rgba(245,184,46,0.24)] transition hover:bg-[#F7C64B] sm:w-auto sm:px-12"
        onClick={onStart}
        type="button"
      >
        {resumeState === "restored" ? "Continue Application" : "Start Application"}
      </button>
    </section>
  );
}

function ProgressRail({
  currentIndex,
  onSelect,
}: {
  currentIndex: number;
  onSelect: (id: JoinApplicationStepId) => void;
}) {
  return (
    <ol className="mt-6 flex items-center justify-between gap-2 sm:flex-wrap sm:justify-start">
      {joinApplicationSteps.slice(1).map((step, index) => {
        const position = index + 1;
        const isCurrent = position === currentIndex;
        const isDone = position < currentIndex;

        return (
          <li key={step.id}>
            <button
              aria-label={step.title}
              aria-current={isCurrent ? "step" : undefined}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 ${
                isCurrent
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : isDone
                    ? "border-[#DCEBFF] bg-white text-[#1D4ED8]"
                    : "border-[#E2E8F0] bg-white/70 text-[#64748B]"
              }`}
              onClick={() => onSelect(step.id)}
              type="button"
            >
              <span className="sm:hidden">{position}</span>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function GuidedPartHeader({
  current,
  intro,
  title,
  total,
}: {
  current: number;
  intro: string;
  title: string;
  total: number;
}) {
  return (
    <section className="mt-7 rounded-[26px] border border-[#DCEBFF] bg-white/85 px-5 py-4 shadow-[0_16px_44px_rgba(15,23,42,0.04)] backdrop-blur sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#B77900]">
          Part {current} of {total}
        </p>
        <div className="flex flex-1 justify-end gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <span
              className={`h-1.5 max-w-10 flex-1 rounded-full ${index < current ? "bg-[#F5B82E]" : "bg-[#E2E8F0]"}`}
              key={index}
            />
          ))}
        </div>
      </div>
      <h2 className="mt-3 text-[22px] font-black leading-tight tracking-[-0.025em] text-[#020617] sm:text-2xl">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-[#475569]">{intro}</p>
    </section>
  );
}

function SupportChoice({
  description,
  onSelect,
  selected,
  title,
}: {
  description: string;
  onSelect: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <button
      aria-pressed={selected}
      className={`rounded-[20px] border p-4 text-left transition ${
        selected
          ? "border-[#D59A16] bg-[#FFF8E6] shadow-[0_12px_30px_rgba(245,184,46,0.14)] ring-2 ring-[#F8D77F]"
          : "border-[#DCEBFF] bg-white hover:border-[#AFCBF3]"
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="block text-sm font-black text-[#0F172A]">{title}</span>
      <span className="mt-1 block text-sm leading-5 text-[#64748B]">{description}</span>
    </button>
  );
}

function SupportMoneyField({
  action,
  help,
  id,
  label,
  onChange,
  required = false,
  value,
}: {
  action?: { label: string; onClick: () => void };
  help?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <label className="block text-sm font-black text-[#0F172A]" htmlFor={id}>
          {label}
          {required ? <span className="ml-1 text-[#B77900]">*</span> : null}
        </label>
        {action ? (
          <button className="shrink-0 text-xs font-black text-[#1D4ED8] underline underline-offset-2" onClick={action.onClick} type="button">
            {action.label}
          </button>
        ) : null}
      </div>
      {help ? <p className="mt-1 text-sm leading-5 text-[#64748B]">{help}</p> : null}
      <div className="relative mt-2">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-bold text-[#64748B]">$</span>
        <input
          className="h-12 w-full rounded-2xl border border-[#DCEBFF] bg-white pl-8 pr-4 text-base text-[#0F172A] outline-none focus:border-[#2563EB]"
          id={id}
          inputMode="decimal"
          onChange={(event) => onChange(cleanMoneyInput(event.target.value))}
          placeholder="0"
          type="text"
          value={value}
        />
      </div>
    </div>
  );
}

function SupportMetric({ label, value, tone = "default" }: { label: string; value: number; tone?: "accent" | "default" }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone === "accent" ? "border-[#F4D17A] bg-[#FFF9EA]" : "border-[#EAF2FF] bg-[#F8FBFF]"}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]">{label}</p>
      <p className={`mt-1 text-xl font-black tracking-[-0.03em] ${tone === "accent" ? "text-[#8A5A00]" : "text-[#0F172A]"}`}>
        {formatMoney(value)}
      </p>
    </div>
  );
}

function SupportSection({
  draft,
  onAnswer,
  onDisclosure,
  section,
}: {
  draft: JoinApplicationDraft;
  onAnswer: (id: string, value: string) => void;
  onDisclosure: (id: string, value: boolean) => void;
  section: JoinFieldSection;
}) {
  const path = supportPathFromDraft(draft);
  const fields = visibleFieldsForSection("support", section.id, false);
  const summary = supportBudgetSummary(draft);
  const expectsFundraising = path === "yes" || path === "unsure";

  if (section.id === "path") {
    const employmentField = fields.find((field) => field.id === "supportEmploymentContext");

    return (
      <div className="space-y-6 rounded-[26px] border border-[#DCEBFF] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-6">
        {employmentField ? (
          <FieldInput
            field={employmentField}
            onChange={(value) => onAnswer(employmentField.id, value)}
            value={draft.answers[employmentField.id] ?? ""}
          />
        ) : null}

        <fieldset>
          <legend className="text-base font-black text-[#0F172A]">
            Do you expect to raise monthly support?<span className="ml-1 text-[#B77900]">*</span>
          </legend>
          <p className="mt-1 text-sm leading-6 text-[#475569]">Your answer controls which financial questions come next.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SupportChoice
              description="I expect monthly partners to help sustain this ministry."
              onSelect={() => onAnswer("supportPath", "yes")}
              selected={path === "yes"}
              title="Yes"
            />
            <SupportChoice
              description="I need help discerning the right support model."
              onSelect={() => onAnswer("supportPath", "unsure")}
              selected={path === "unsure"}
              title="Not sure yet"
            />
            <SupportChoice
              description="My household and ministry are already funded."
              onSelect={() => onAnswer("supportPath", "no")}
              selected={path === "no"}
              title="No"
            />
          </div>
        </fieldset>
      </div>
    );
  }

  if (section.id === "budget") {
    const contextField = fields.find((field) => field.id === "supportBudget");

    return (
      <div className="space-y-5">
        {(["household", "ministry"] as const).map((group) => {
          const categories = supportBudgetCategories.filter((category) => category.group === group);
          const subtotal = group === "household" ? summary.household : summary.ministry;

          return (
            <section className="rounded-[26px] border border-[#DCEBFF] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-6" key={group}>
              <div className="flex items-end justify-between gap-4 border-b border-[#EAF2FF] pb-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#B77900]">
                    {group === "household" ? "Household" : "Ministry"}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#0F172A]">Monthly estimates</h3>
                </div>
                <p className="text-right text-sm text-[#64748B]">
                  Subtotal <span className="ml-1 block text-lg font-black text-[#0F172A] sm:inline">{formatMoney(subtotal)}</span>
                </p>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {categories.map((category) => {
                  const answerId = supportBudgetAnswerId(category.key);

                  return (
                    <SupportMoneyField
                      id={answerId}
                      key={category.key}
                      label={category.label}
                      onChange={(value) => onAnswer(answerId, value)}
                      value={draft.answers[answerId] ?? ""}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="grid gap-3 rounded-[24px] border border-[#F4D17A] bg-[#FFF9EA] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-black text-[#8A5A00]">Estimated monthly budget</p>
            <p className="mt-1 text-sm leading-5 text-[#6B5A2D]">All 17 categories remain private and go only to the review team.</p>
          </div>
          <p className="text-3xl font-black tracking-[-0.04em] text-[#6B4700]">{formatMoney(summary.budgetTotal)}</p>
        </div>

        {contextField ? (
          <div className="rounded-[26px] border border-[#DCEBFF] bg-white p-5 sm:p-6">
            <FieldInput
              field={contextField}
              onChange={(value) => onAnswer(contextField.id, value)}
              value={draft.answers[contextField.id] ?? ""}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (section.id === "picture") {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SupportMetric label="Budget total" value={summary.budgetTotal} />
          <SupportMetric label="Proposed need" value={summary.proposedNeed} />
          <SupportMetric label="Already covered" value={summary.covered} />
          <SupportMetric label="Remaining gap" tone="accent" value={summary.gap} />
        </div>

        <section className="rounded-[26px] border border-[#DCEBFF] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <SupportMoneyField
              action={summary.budgetTotal > 0 ? { label: "Use budget total", onClick: () => onAnswer("supportMonthlyNeed", String(summary.budgetTotal)) } : undefined}
              help="Your considered estimate. It may match the worksheet, but it is not an approved public goal."
              id="supportMonthlyNeed"
              label="Proposed monthly need"
              onChange={(value) => onAnswer("supportMonthlyNeed", value)}
              required
              value={draft.answers.supportMonthlyNeed ?? ""}
            />
            <SupportMoneyField
              id="supportCommittedAmount"
              label="Committed monthly support"
              onChange={(value) => onAnswer("supportCommittedAmount", value)}
              value={draft.answers.supportCommittedAmount ?? ""}
            />
            <SupportMoneyField
              id="supportOtherMonthlyIncome"
              label="Other monthly household income"
              onChange={(value) => onAnswer("supportOtherMonthlyIncome", value)}
              value={draft.answers.supportOtherMonthlyIncome ?? ""}
            />
            <SupportMoneyField
              help="Choose the amount you want Operations to review. It is never calculated automatically."
              id="supportRequestedGoal"
              label="Requested fundraising goal"
              onChange={(value) => onAnswer("supportRequestedGoal", value)}
              value={draft.answers.supportRequestedGoal ?? ""}
            />
          </div>
        </section>

        <div className="rounded-[22px] border-l-4 border-[#2563EB] bg-white px-4 py-3 text-sm leading-6 text-[#475569] shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
          Your worksheet total, proposed need, and requested fundraising goal are three separate values. USA Missionaries Operations reviews the application and owns the approved public goal.
        </div>
      </div>
    );
  }

  const readinessFields = expectsFundraising
    ? fields
    : fields.filter((field) => field.id === "supportImmediateNeeds");

  return (
    <div className="space-y-5 rounded-[26px] border border-[#DCEBFF] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-6">
      {!expectsFundraising ? (
        <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
          <p className="text-sm font-black text-[#166534]">No monthly fundraising path selected</p>
          <p className="mt-1 text-sm leading-5 text-[#3F6750]">We will preserve that answer for review. Nothing here creates a public giving page.</p>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        {readinessFields.map((field) => (
          <FieldInput
            field={field}
            key={field.id}
            onChange={(value) => onAnswer(field.id, value)}
            value={draft.answers[field.id] ?? ""}
          />
        ))}
      </div>

      {expectsFundraising ? (
        <label className="flex items-start gap-3 rounded-[20px] border border-[#F4D17A] bg-[#FFF9EA] p-4 text-sm leading-6 text-[#5F4B1C]">
          <input
            checked={draft.disclosures.excessSupportAgreement === true}
            className="mt-1 h-5 w-5 shrink-0 accent-[#D59A16]"
            onChange={(event) => onDisclosure("excessSupportAgreement", event.target.checked)}
            type="checkbox"
          />
          <span>
            <strong className="block text-[#6B4700]">Support overflow acknowledgement</strong>
            I understand USA Missionaries leadership approves the public monthly goal. Support above that approved goal is not automatically assigned to my household and may be stewarded by USA Missionaries for ministry needs and approved support priorities.
          </span>
        </label>
      ) : null}
    </div>
  );
}

function FieldInput({
  field,
  onChange,
  value,
}: {
  field: JoinField;
  onChange: (value: string) => void;
  value: string;
}) {
  const shared =
    "mt-2 w-full rounded-2xl border border-[#DCEBFF] bg-white px-4 text-base text-[#0F172A] outline-none focus:border-[#2563EB]";

  return (
    <div className={field.kind === "long" ? "sm:col-span-2" : ""}>
      <label className="block text-base font-black text-[#0F172A]" htmlFor={field.id}>
        {field.label}
        {field.required ? <span className="ml-1 text-[#2563EB]">*</span> : null}
      </label>
      {field.help ? <p className="mt-1 text-sm leading-6 text-[#475569]">{field.help}</p> : null}

      {field.kind === "long" ? (
        <textarea
          className={`${shared} min-h-[9rem] py-3 leading-7`}
          id={field.id}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      ) : (
        <input
          className={`${shared} h-12`}
          id={field.id}
          inputMode={field.kind === "money" ? "decimal" : undefined}
          onChange={(event) => onChange(event.target.value)}
          type="text"
          value={value}
        />
      )}
    </div>
  );
}

function IdentityFields({
  heading,
  identity,
  onChange,
}: {
  heading: string;
  identity: JoinApplicantIdentity;
  onChange: (key: keyof JoinApplicantIdentity, value: string) => void;
}) {
  return (
    <fieldset className="rounded-3xl border border-[#DCEBFF] bg-white p-5">
      <legend className="px-2 text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">{heading}</legend>

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(identityFieldLabels) as (keyof JoinApplicantIdentity)[]).map((key) => (
          <div key={key}>
            <label className="block text-sm font-black text-[#0F172A]" htmlFor={`${heading}-${key}`}>
              {identityFieldLabels[key]}
            </label>
            <input
              autoComplete="off"
              className="mt-2 h-12 w-full rounded-2xl border border-[#DCEBFF] bg-white px-4 text-base text-[#0F172A] outline-none focus:border-[#2563EB]"
              id={`${heading}-${key}`}
              onChange={(event) => onChange(key, event.target.value)}
              type={key === "email" ? "email" : "text"}
              value={identity[key]}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function IdentitySection({
  draft,
  onIdentityChange,
  onToggleCouple,
}: {
  draft: JoinApplicationDraft;
  onIdentityChange: (person: "applicant" | "spouse", key: keyof JoinApplicantIdentity, value: string) => void;
  onToggleCouple: (value: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <IdentityFields
        heading="About you"
        identity={draft.applicant}
        onChange={(key, value) => onIdentityChange("applicant", key, value)}
      />

      <label className="flex items-start gap-3 rounded-2xl border border-[#DCEBFF] bg-white px-4 py-3">
        <input
          checked={draft.applyingAsCouple}
          className="mt-1 h-5 w-5"
          onChange={(event) => onToggleCouple(event.target.checked)}
          type="checkbox"
        />
        <span className="text-base font-semibold text-[#0F172A]">
          We are applying as a couple
          <span className="mt-1 block text-sm font-normal leading-6 text-[#475569]">
            You apply together as one household, and we keep both of you on file as two people in your own right.
          </span>
        </span>
      </label>

      {draft.applyingAsCouple ? (
        <IdentityFields
          heading="About your spouse"
          identity={draft.spouse}
          onChange={(key, value) => onIdentityChange("spouse", key, value)}
        />
      ) : null}
    </div>
  );
}

function ReviewSection({
  draft,
  missing,
  onJump,
  onSubmit,
  onToggleDisclosure,
  submitError,
  submitState,
}: {
  draft: JoinApplicationDraft;
  missing: { label: string; sectionId?: string; stepId: JoinApplicationStepId }[];
  onJump: (id: JoinApplicationStepId, sectionId?: string) => void;
  onSubmit: () => void;
  onToggleDisclosure: (id: string, value: boolean) => void;
  submitError: string;
  submitState: "error" | "idle" | "submitted" | "submitting";
}) {
  const name = applicantDisplayName(draft);
  const allDisclosuresConfirmed = joinDisclosureIds.every((id) => draft.disclosures[id] === true);

  return (
    <div className="space-y-6">
      <p className="text-base leading-7 text-[#334155]">
        {name ? `This is the application for ${name}.` : "This is your application."} Check anything you want to revisit
        before you submit.
      </p>

      {missing.length > 0 ? (
        <div className="rounded-3xl border border-[#FBD5B5] bg-[#FFF7ED] p-5">
          <h2 className="text-base font-black text-[#9A3412]">Still to answer</h2>
          <ul className="mt-3 space-y-2">
            {missing.map((item) => (
              <li key={`${item.stepId}-${item.label}`}>
                <button
                  className="text-left text-sm font-bold text-[#9A3412] underline underline-offset-2"
                  onClick={() => onJump(item.stepId, item.sectionId)}
                  type="button"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#BBF7D0] bg-[#F0FDF4] p-5">
          <h2 className="text-base font-black text-[#166534]">Every required question is answered.</h2>
        </div>
      )}

      <div className="rounded-3xl border border-[#DCEBFF] bg-white p-5">
        <h2 className="text-base font-black text-[#0F172A]">Before you submit</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[#475569]">
          <li>Submitting does not guarantee acceptance.</li>
          <li>Nothing you have written becomes public because you submitted it.</li>
          <li>
            If you are accepted, we would use some of this to prepare your missionary profile, and you would review it
            before anything is published.
          </li>
          <li>
            USA Missionaries reviews beliefs and ministry expectations with every applicant before acceptance, and we
            will walk through ours with you as part of that conversation.
          </li>
        </ul>
      </div>

      <fieldset className="rounded-3xl border border-[#DCEBFF] bg-white p-5">
        <legend className="px-2 text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">
          Please confirm
        </legend>

        <div className="space-y-3">
          {joinDisclosureIds.map((id) => (
            <label className="flex items-start gap-3" key={id}>
              <input
                checked={draft.disclosures[id] === true}
                className="mt-1 h-5 w-5 shrink-0"
                onChange={(event) => onToggleDisclosure(id, event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm leading-6 text-[#334155]">{joinDisclosureLabels[id]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {submitError ? (
        <p className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B91C1C]">
          {submitError}
        </p>
      ) : null}

      <button
        className="inline-flex h-13 min-h-[3.25rem] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-8 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={submitState === "submitting" || missing.length > 0 || !allDisclosuresConfirmed}
        onClick={onSubmit}
        type="button"
      >
        {submitState === "submitting" ? "Submitting..." : "Submit Application"}
      </button>

      {missing.length > 0 || !allDisclosuresConfirmed ? (
        <p className="text-center text-sm text-[#475569]">
          {missing.length > 0
            ? "Answer the remaining questions above to submit."
            : "Confirm each acknowledgement to submit."}
        </p>
      ) : null}
    </div>
  );
}

function SubmittedScreen({ applicationId, name }: { applicationId: string; name: string }) {
  return (
    <section className="mt-6 rounded-[30px] border border-[#BBF7D0] bg-white p-7 sm:p-10">
      <h1 className="text-[32px] font-black leading-[1.05] tracking-[-0.03em] text-[#020617] sm:text-[42px]">
        Your application is submitted
      </h1>

      <div className="mt-6 space-y-4 text-base leading-7 text-[#334155]">
        <p>
          Thank you{name ? `, ${name}` : ""}. We have received your application and a real person on the USA
          Missionaries team will read it.
        </p>
        <p>
          You will get a confirmation email shortly. We will follow up as the review progresses, and we may come back to
          you with questions or to arrange a conversation.
        </p>
        <p>
          Nothing you wrote is public. If you are accepted, we would prepare a missionary profile from some of this
          material and you would review it before anything is published.
        </p>
        {applicationId ? (
          <p className="text-sm text-[#64748B]">
            Reference: <span className="font-mono">{applicationId}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PhotoSection({
  draft,
  onRemove,
  onUploaded,
}: {
  draft: JoinApplicationDraft;
  onRemove: (path: string) => void;
  onUploaded: (photo: JoinApplicationPhoto) => void;
}) {
  const [error, setError] = useState("");
  const [busyKind, setBusyKind] = useState("");

  async function upload(kind: "family" | "profile", file: File) {
    setBusyKind(kind);
    setError("");

    try {
      const body = new FormData();

      body.append("file", file);
      body.append("kind", kind);

      const response = await fetch("/api/join/photos", { body, method: "POST" });
      const result = (await response.json().catch(() => ({}))) as { error?: string; photo?: JoinApplicationPhoto };

      if (!response.ok || !result.photo) {
        throw new Error(result.error || "We could not upload that photo.");
      }

      onUploaded(result.photo);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "We could not upload that photo.");
    } finally {
      setBusyKind("");
    }
  }

  return (
    <div className="rounded-3xl border border-[#DCEBFF] bg-white p-5">
      <h2 className="text-base font-black text-[#0F172A]">Photos</h2>
      <p className="mt-1 text-sm leading-6 text-[#475569]">
        A photo of you and one of your family, if you have them. These are stored privately and are never published
        without your review. JPG, PNG, or WebP, up to 5 MB.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(["profile", "family"] as const).map((kind) => {
          const existing = draft.photos.find((photo) => photo.kind === kind);

          return (
            <div className="rounded-2xl border border-[#EAF2FF] p-4" key={kind}>
              <p className="text-sm font-black text-[#0F172A]">{kind === "profile" ? "Your photo" : "Family photo"}</p>

              {existing ? (
                <div className="mt-3">
                  <p className="truncate text-sm text-[#475569]">{existing.fileName}</p>
                  <button
                    className="mt-2 text-sm font-bold text-[#B91C1C] underline underline-offset-2"
                    onClick={() => onRemove(existing.path)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="mt-3 w-full text-sm"
                  disabled={busyKind === kind}
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void upload(kind, file);
                    }
                  }}
                  type="file"
                />
              )}

              {busyKind === kind ? <p className="mt-2 text-sm text-[#475569]">Uploading...</p> : null}
            </div>
          );
        })}
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-[#B91C1C]">{error}</p> : null}
    </div>
  );
}

function SaveBar({
  emailNotice,
  hasEmail,
  onSave,
  onSaveAndEmail,
  saveState,
}: {
  emailNotice: string;
  hasEmail: boolean;
  onSave: () => void;
  onSaveAndEmail: () => void;
  saveState: SaveState;
}) {
  const isSaving = saveState === "saving";
  const label =
    saveState === "saving"
      ? "Saving..."
      : saveState === "saved"
        ? "All changes saved"
        : saveState === "error"
          ? "We could not save just now. We will keep trying."
          : "Your progress saves automatically";

  return (
    <div className="mt-9 rounded-3xl border border-[#DCEBFF] bg-white p-5">
      <p className="text-sm font-bold text-[#475569]">{label}</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex h-12 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-5 text-sm font-black text-[#0F172A]"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          Save now
        </button>
        <button
          className="inline-flex h-12 items-center justify-center rounded-full border border-[#2563EB] bg-white px-5 text-sm font-black text-[#1D4ED8] disabled:opacity-40"
          disabled={!hasEmail || isSaving}
          onClick={onSaveAndEmail}
          type="button"
        >
          Save and email me a link
        </button>
      </div>

      {!hasEmail ? (
        <p className="mt-3 text-sm leading-6 text-[#475569]">
          Add your email on the About You step and we can send you a link back into this application.
        </p>
      ) : null}

      {emailNotice ? <p className="mt-3 text-sm font-semibold text-[#1D4ED8]">{emailNotice}</p> : null}
    </div>
  );
}
