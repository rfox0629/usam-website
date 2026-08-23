"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { identityFieldLabels, visibleFieldsForStep, type JoinField } from "./application-fields";
import {
  applicantDisplayName,
  joinApplicationStepIndex,
  joinApplicationSteps,
  type JoinApplicantIdentity,
  type JoinApplicationDraft,
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

type ResumeState = "expired" | "none" | "restored" | "submitted" | "unavailable";

type SaveState = "error" | "idle" | "saved" | "saving";

type Props = {
  initialDraft: JoinApplicationDraft;
  initialStep: JoinApplicationStepId;
  resumeState: ResumeState;
  resumeToken: string | null;
};

const shellClassName =
  "usam-application-route min-h-screen bg-[linear-gradient(135deg,#F8FBFF_0%,#F6F8FF_48%,#FFF4EC_100%)] text-[#0F172A]";

function resumeNotice(state: ResumeState) {
  switch (state) {
    case "expired":
      return "That link has expired. Your answers are safe, so contact us and we will send a fresh one.";
    case "restored":
      return "Welcome back. Your application is exactly where you left it.";
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

  // Skips the autosave that would otherwise fire immediately on mount and
  // create an empty draft row for anyone who merely opened the page.
  const dirtyRef = useRef(false);

  const stepIndex = joinApplicationStepIndex(stepId);
  const step = joinApplicationSteps[stepIndex];

  const persist = useCallback(
    async (options: { sendResumeEmail?: boolean } = {}) => {
      setSaveState("saving");

      try {
        const response = await fetch("/api/join/draft", {
          body: JSON.stringify({
            currentStep: stepId,
            draft,
            resumeToken: token,
            sendResumeEmail: options.sendResumeEmail === true,
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

        if (options.sendResumeEmail) {
          setEmailNotice(
            result.emailSent
              ? "We sent your link. Check your inbox."
              : "Your application is saved. We could not send the email just now, so keep this tab open if you can.",
          );
        }

        return true;
      } catch {
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

  const requiredMissing = useMemo(() => {
    const missing: { label: string; stepId: JoinApplicationStepId }[] = [];

    if (!draft.applicant.firstName.trim() || !draft.applicant.lastName.trim() || !draft.applicant.email.trim()) {
      missing.push({ label: "Your name and email", stepId: "about" });
    }

    if (draft.applyingAsCouple && (!draft.spouse.firstName.trim() || !draft.spouse.lastName.trim())) {
      missing.push({ label: "Your spouse's name", stepId: "about" });
    }

    for (const candidate of joinApplicationSteps) {
      if (candidate.id === "start" || candidate.id === "review") {
        continue;
      }

      for (const field of visibleFieldsForStep(candidate.id, draft.applyingAsCouple)) {
        if (field.required && !(draft.answers[field.id] ?? "").trim()) {
          missing.push({ label: field.label, stepId: candidate.id });
        }
      }
    }

    return missing;
  }, [draft]);

  const goTo = (next: JoinApplicationStepId) => {
    setStepId(next);
    dirtyRef.current = true;
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  const goRelative = (offset: number) => {
    const next = joinApplicationSteps[stepIndex + offset];

    if (next) {
      goTo(next.id);
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

        {stepId === "start" && !started ? (
          <StartScreen onStart={() => { setStarted(true); goTo("about"); }} resumeState={resumeState} />
        ) : (
          <>
            <ProgressRail currentIndex={stepIndex} onSelect={goTo} />

            <h1 className="mt-7 text-[34px] font-black leading-[1.05] tracking-[-0.03em] text-[#020617] sm:text-[44px]">
              {step.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-[#475569]">{step.intro}</p>

            <div className="mt-8 space-y-7">
              {stepId === "about" ? (
                <IdentitySection
                  draft={draft}
                  onIdentityChange={setIdentity}
                  onToggleCouple={(value) => {
                    dirtyRef.current = true;
                    setDraft((current) => ({ ...current, applyingAsCouple: value }));
                  }}
                />
              ) : null}

              {stepId === "review" ? <ReviewSection draft={draft} missing={requiredMissing} onJump={goTo} /> : null}

              {stepId !== "review" && stepId !== "start"
                ? visibleFieldsForStep(stepId, draft.applyingAsCouple).map((field) => (
                    <FieldInput
                      field={field}
                      key={field.id}
                      onChange={(value) => setAnswer(field.id, value)}
                      value={draft.answers[field.id] ?? ""}
                    />
                  ))
                : null}
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
                disabled={stepIndex <= 1}
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
                  className="inline-flex h-12 min-w-[7rem] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-6 text-sm font-black text-white"
                  onClick={() => goRelative(1)}
                  type="button"
                >
                  Continue
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

      <div className="mt-7 space-y-5 text-base leading-7 text-[#334155]">
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
        className="mt-9 inline-flex h-13 min-h-[3.25rem] w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-8 text-base font-black text-white sm:w-auto sm:px-12"
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
    <ol className="mt-6 flex flex-wrap gap-2">
      {joinApplicationSteps.slice(1).map((step, index) => {
        const position = index + 1;
        const isCurrent = position === currentIndex;
        const isDone = position < currentIndex;

        return (
          <li key={step.id}>
            <button
              aria-current={isCurrent ? "step" : undefined}
              className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                isCurrent
                  ? "border-[#2563EB] bg-[#2563EB] text-white"
                  : isDone
                    ? "border-[#DCEBFF] bg-white text-[#1D4ED8]"
                    : "border-[#E2E8F0] bg-white/70 text-[#64748B]"
              }`}
              onClick={() => onSelect(step.id)}
              type="button"
            >
              {step.title}
            </button>
          </li>
        );
      })}
    </ol>
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
    <div>
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
}: {
  draft: JoinApplicationDraft;
  missing: { label: string; stepId: JoinApplicationStepId }[];
  onJump: (id: JoinApplicationStepId) => void;
}) {
  const name = applicantDisplayName(draft);

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
                  onClick={() => onJump(item.stepId)}
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

      {/*
        Submission is intentionally not wired up in this checkpoint. The
        canonical write goes through the existing USA-172 ingress and
        usam_missionary_applications, and mapping these answers onto that
        contract is the next piece of work. Showing a Submit button that
        silently dropped an application would be worse than not showing one.
      */}
      <p className="rounded-3xl border border-[#DCEBFF] bg-[#F8FBFF] p-5 text-sm leading-6 text-[#475569]">
        Submission opens once this application is connected to the Operations review queue. Your answers are saved and
        your resume link keeps working in the meantime.
      </p>
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
          onClick={onSave}
          type="button"
        >
          Save now
        </button>
        <button
          className="inline-flex h-12 items-center justify-center rounded-full border border-[#2563EB] bg-white px-5 text-sm font-black text-[#1D4ED8] disabled:opacity-40"
          disabled={!hasEmail}
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
