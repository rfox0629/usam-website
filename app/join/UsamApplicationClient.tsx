"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import "./join-experience.css";
import { MovementField } from "./MovementField";
import { WelcomeExperience } from "./WelcomeExperience";
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
 * USA-167 / USA-191: the USA Missionaries application.
 *
 * The draft lives on the server, not in localStorage. That is the whole reason a
 * resume link can work at all: the applicant can start on a laptop, get the
 * email, and continue on a phone. The token minted on first save is held in
 * component state and sent with every later save so they all land on one draft.
 *
 * USA-191 rebuilt the presentation on top of that machinery without touching
 * it. The step and section state below is the same guided spine USA-167 shipped;
 * what changed is that one section is now a screen rather than a card in a
 * stack, the chrome carries progress and save state so the body can be nothing
 * but the current question, and every advance replays a transition. No data
 * contract, validation rule or request shape was altered.
 */

type ResumeState = "expired" | "none" | "restored" | "revoked" | "submitted" | "unavailable";

type SaveState = "error" | "idle" | "saved" | "saving";

type Props = {
  initialDraft: JoinApplicationDraft;
  initialStep: JoinApplicationStepId;
  resumeState: ResumeState;
  resumeToken: string | null;
};

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

function ArrowRight() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4 12h15m0 0-6-6m6 6-6 6" stroke="currentColor" strokeLinecap="square" strokeWidth="1.6" />
    </svg>
  );
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
  /** Drives which way the transition plays, so back does not read as forward. */
  const [direction, setDirection] = useState<"back" | "forward">("forward");

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
        return { resumeToken: token, saved: true };
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

        const savedToken = result.resumeToken ?? token;

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

        return { resumeToken: savedToken, saved: true };
      } catch {
        if (shouldSendResumeEmail && emailRequestId && resumeEmailAttemptRef.current?.id === emailRequestId) {
          resumeEmailAttemptRef.current = { id: emailRequestId, inFlight: false };
        }

        setSaveState("error");

        return { resumeToken: null, saved: false };
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
    setSubmitState("submitting");
    setSubmitError("");

    // Submission reads the draft from the server by token, so it has to be
    // saved first or the last edits would not be part of what is submitted.
    //
    // The token comes back from that save rather than from component state.
    // Autosave is debounced, so somebody who fills the application quickly and
    // submits can still be holding a null token in state while the save that
    // mints one is in flight. Reading it from the response is what makes the
    // submit button work on the first click regardless of that timing.
    const saved = await persist();

    if (!saved.saved) {
      setSubmitState("error");
      setSubmitError("We could not save your latest answers, so we have not submitted anything yet.");

      return;
    }

    const submissionToken = saved.resumeToken ?? token;

    if (!submissionToken) {
      setSubmitState("error");
      setSubmitError("We could not save your application, so we have not submitted anything yet.");

      return;
    }

    try {
      const response = await fetch("/api/join/application", {
        body: JSON.stringify({ resumeToken: submissionToken }),
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
    setDirection(offset < 0 ? "back" : "forward");

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

  /**
   * Keyboard pacing.
   *
   * Enter advances from a single line field, the way a guided flow is expected
   * to behave. Inside a textarea Enter has to stay a newline, because these are
   * the long answers the whole application is asking for, so those advance on
   * the modifier instead. Nothing here is the only way to move: the footer
   * control does the same job for anyone using a pointer or a touch screen.
   */
  useEffect(() => {
    if (!started || submitState === "submitted") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || continueBlocked || stepId === "review") {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTextarea = target?.tagName === "TEXTAREA";
      const modified = event.metaKey || event.ctrlKey;

      if (isTextarea && !modified) {
        return;
      }

      if (target?.tagName === "BUTTON" && !modified) {
        return;
      }

      event.preventDefault();
      goRelative(1);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const notice = resumeNotice(resumeState);

  if (submitState === "submitted") {
    return (
      <main aria-label="Apply to become a USA Missionary" className="join">
        <div className="join-screen">
          <MovementField />
          <SubmittedScreen applicationId={applicationId} name={applicantDisplayName(draft)} />
        </div>
      </main>
    );
  }

  if (stepId === "start" && !started) {
    return (
      <main aria-label="Apply to become a USA Missionary" className="join">
        <WelcomeExperience
          onStart={() => {
            setStarted(true);
            setDirection("forward");
            goTo("about");
          }}
          returning={resumeState === "restored"}
        />
      </main>
    );
  }

  // Named locals rather than inline expressions on the button: the resume-email
  // idempotency guard reads this exact condition, because "the email action is
  // dead while a save is in flight" is the property that stops a second send.
  const hasEmail = Boolean(draft.applicant.email.trim());
  const isSaving = saveState === "saving";

  const answeredSteps = joinApplicationSteps.slice(1, -1);
  const overallProgress = Math.round((stepIndex / (joinApplicationSteps.length - 1)) * 100);
  const isLastSection = sectionIndex >= currentSections.length - 1;
  const nextStepTitle = joinApplicationSteps[stepIndex + 1]?.title ?? "Review";

  return (
    <main aria-label="Apply to become a USA Missionary" className="join">
      <header className="join-chrome">
        <div className="join-chrome-inner">
          <p className="join-chrome-mark">
            <b>USA Missionaries</b>
          </p>

          <ol className="join-rail">
            {answeredSteps.map((railStep, index) => {
              const position = index + 1;
              const state = position === stepIndex ? "current" : position < stepIndex ? "done" : "todo";

              return (
                <li key={railStep.id}>
                  <button
                    aria-current={state === "current" ? "step" : undefined}
                    aria-label={railStep.title}
                    data-state={state}
                    onClick={() => {
                      setDirection(position < stepIndex ? "back" : "forward");
                      goTo(railStep.id);
                    }}
                    type="button"
                  >
                    <span className="join-rail-label">{railStep.title}</span>
                    <span className="join-rail-index">{position}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <p aria-live="polite" className="join-chrome-save" data-state={saveState}>
            <span aria-hidden="true" className="join-chrome-dot" />
            <span className="join-chrome-save-text">
              {saveState === "saving"
                ? "Saving"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? "Retrying"
                    : "Autosaving"}
            </span>
          </p>

          <button
            className="join-plain"
            disabled={!hasEmail || isSaving}
            onClick={() => void persist({ sendResumeEmail: true })}
            title={
              hasEmail
                ? "Save and email yourself a link back into this application"
                : "Add your email on the About You step to get a resume link"
            }
            type="button"
          >
            Email me a link
          </button>
        </div>

        <div aria-hidden="true" className="join-progress">
          <span style={{ width: `${overallProgress}%` }} />
        </div>
      </header>

      <div className="join-step">
        {notice ? <p className="join-notice">{notice}</p> : null}
        {emailNotice ? <p className="join-notice">{emailNotice}</p> : null}

        <div
          className="join-transition"
          data-direction={direction}
          key={`${stepId}-${sectionIndex}`}
        >
          <div className="join-step-head">
            <p className="join-step-count">
              {step.eyebrow}
              {currentSections.length > 0 ? ` of ${joinApplicationSteps.length - 2}` : ""}
            </p>

            <h1 className="join-step-title">{currentSection ? currentSection.title : step.title}</h1>

            <p className="join-step-intro">{currentSection ? currentSection.intro : step.intro}</p>

            {currentSections.length > 1 ? (
              <div className="join-parts">
                {currentSections.map((part, index) => (
                  <span
                    className="join-parts-tick"
                    data-done={index <= sectionIndex ? "true" : "false"}
                    key={part.id}
                  />
                ))}
                <span className="join-parts-label">
                  {step.title}, part {sectionIndex + 1} of {currentSections.length}
                </span>
              </div>
            ) : null}
          </div>

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
            <FieldGroup fields={currentSectionFields} onAnswer={setAnswer} values={draft.answers} />
          ) : null}

          {stepId === "profile" && currentSection?.id === "photos" ? (
            <PhotoSection draft={draft} onRemove={removePhoto} onUploaded={addPhoto} />
          ) : null}
        </div>
      </div>

      <div className="join-footer">
        <div className="join-footer-inner">
          <button
            className="join-button join-button-secondary"
            disabled={stepIndex <= 1 && sectionIndex === 0}
            onClick={() => goRelative(-1)}
            type="button"
          >
            Back
          </button>

          {stepId === "review" ? (
            <p className="join-footer-hint">
              {requiredMissing.length === 0
                ? "Ready to submit"
                : `${requiredMissing.length} question${requiredMissing.length === 1 ? "" : "s"} still to answer`}
            </p>
          ) : (
            <>
              <button
                className="join-button join-button-primary"
                disabled={continueBlocked}
                onClick={() => goRelative(1)}
                type="button"
              >
                {continueBlocked ? "Choose an option" : isLastSection ? nextStepTitle : "Continue"}
                <ArrowRight />
              </button>

              <p className="join-footer-hint">Press Enter to continue</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * Lays a section's questions out as a column of questions rather than a grid
 * of boxes. Consecutive short answers pair up once there is room, because two
 * of them on one line still read as one thought, while a long answer always
 * gets the full measure to itself.
 */
function FieldGroup({
  fields,
  onAnswer,
  values,
}: {
  fields: JoinField[];
  onAnswer: (id: string, value: string) => void;
  values: Record<string, string>;
}) {
  const rows: JoinField[][] = [];

  for (const field of fields) {
    const last = rows[rows.length - 1];

    if (field.kind === "short" && last && last.length < 2 && last[0].kind === "short" && !last[0].help && !field.help) {
      last.push(field);
      continue;
    }

    rows.push([field]);
  }

  return (
    <div className="join-fields join-stagger">
      {rows.map((row, index) => (
        <div
          className={row.length > 1 ? "join-pair join-pair-2" : undefined}
          key={row.map((field) => field.id).join("-")}
          style={{ "--i": index } as CSSProperties}
        >
          {row.map((field) => (
            <FieldInput
              field={field}
              key={field.id}
              onChange={(value) => onAnswer(field.id, value)}
              value={values[field.id] ?? ""}
            />
          ))}
        </div>
      ))}
    </div>
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
    <button aria-pressed={selected} className="join-choice" onClick={onSelect} type="button">
      <span className="join-choice-title">{title}</span>
      <span className="join-choice-note">{description}</span>
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
    <div className="join-money-row">
      <label className="join-field-label" htmlFor={id}>
        {label}
        {required ? <span className="join-field-req">*</span> : null}
      </label>

      {help ? <p className="join-field-help">{help}</p> : null}

      <div className="join-money">
        <span aria-hidden="true">$</span>
        <input
          className="join-input"
          id={id}
          inputMode="decimal"
          onChange={(event) => onChange(cleanMoneyInput(event.target.value))}
          placeholder="0"
          type="text"
          value={value}
        />
      </div>

      {action ? (
        <p style={{ marginTop: 8 }}>
          <button className="join-plain" onClick={action.onClick} type="button">
            {action.label}
          </button>
        </p>
      ) : null}
    </div>
  );
}

function SupportMetric({ label, value, tone = "default" }: { label: string; value: number; tone?: "accent" | "default" }) {
  return (
    <div className="join-metric" data-tone={tone}>
      <p className="join-metric-label">{label}</p>
      <p className="join-metric-value">{formatMoney(value)}</p>
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
      <div className="join-fields">
        {employmentField ? (
          <FieldInput
            field={employmentField}
            onChange={(value) => onAnswer(employmentField.id, value)}
            value={draft.answers[employmentField.id] ?? ""}
          />
        ) : null}

        <fieldset>
          <legend className="join-field-label">
            Do you expect to raise monthly support?<span className="join-field-req">*</span>
          </legend>
          <p className="join-field-help">Your answer controls which financial questions come next.</p>

          <div className="join-choices join-choices-3">
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
      <div className="join-fields join-fields-wide">
        {(["household", "ministry"] as const).map((group) => {
          const categories = supportBudgetCategories.filter((category) => category.group === group);
          const subtotal = group === "household" ? summary.household : summary.ministry;

          return (
            <section key={group}>
              <div className="join-worksheet-head">
                <div>
                  <p className="join-eyebrow">{group === "household" ? "Household" : "Ministry"}</p>
                  <p className="join-panel-title" style={{ marginTop: 6 }}>
                    Monthly estimates
                  </p>
                </div>
                <p className="join-subtotal">{formatMoney(subtotal)}</p>
              </div>

              <div className="join-worksheet">
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

        <div className="join-panel join-panel-gold">
          <p className="join-panel-title">Estimated monthly budget</p>
          <p className="join-metric-value" style={{ fontSize: "2rem", color: "var(--gold)" }}>
            {formatMoney(summary.budgetTotal)}
          </p>
          <p className="join-panel-body">
            All 17 categories remain private and go only to the review team.
          </p>
        </div>

        {contextField ? (
          <FieldInput
            field={contextField}
            onChange={(value) => onAnswer(contextField.id, value)}
            value={draft.answers[contextField.id] ?? ""}
          />
        ) : null}
      </div>
    );
  }

  if (section.id === "picture") {
    return (
      <div className="join-fields join-fields-wide">
        <div className="join-metrics">
          <SupportMetric label="Budget total" value={summary.budgetTotal} />
          <SupportMetric label="Proposed need" value={summary.proposedNeed} />
          <SupportMetric label="Already covered" value={summary.covered} />
          <SupportMetric label="Remaining gap" tone="accent" value={summary.gap} />
        </div>

        <div className="join-pair join-pair-2">
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

        <p className="join-panel-note">
          Your worksheet total, proposed need, and requested fundraising goal are three separate values. USA Missionaries Operations reviews the application and owns the approved public goal.
        </p>
      </div>
    );
  }

  const readinessFields = expectsFundraising
    ? fields
    : fields.filter((field) => field.id === "supportImmediateNeeds");

  return (
    <div className="join-fields">
      {!expectsFundraising ? (
        <div className="join-panel">
          <p className="join-panel-title">No monthly fundraising path selected</p>
          <p className="join-panel-body">
            We will preserve that answer for review. Nothing here creates a public giving page.
          </p>
        </div>
      ) : null}

      {readinessFields.map((field) => (
        <FieldInput
          field={field}
          key={field.id}
          onChange={(value) => onAnswer(field.id, value)}
          value={draft.answers[field.id] ?? ""}
        />
      ))}

      {expectsFundraising ? (
        <label className="join-check">
          <input
            checked={draft.disclosures.excessSupportAgreement === true}
            onChange={(event) => onDisclosure("excessSupportAgreement", event.target.checked)}
            type="checkbox"
          />
          <span className="join-check-body">
            <strong>Support overflow acknowledgement</strong>
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
  /* The questions that ask for a whole story get a taller box than the ones
     that ask for a detail, so the field itself signals how much is wanted. */
  const isNarrative = /story|testimony|journey|narrative|vision|describe|why/i.test(field.id);

  return (
    <div>
      <label className="join-field-label" htmlFor={field.id}>
        {field.label}
        {field.required ? <span className="join-field-req">*</span> : null}
      </label>

      {field.help ? <p className="join-field-help">{field.help}</p> : null}

      {field.kind === "long" ? (
        <textarea
          className={`join-textarea${isNarrative ? " join-textarea-tall" : ""}`}
          id={field.id}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      ) : (
        <input
          className="join-input"
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

/**
 * `name` exists separately from `heading` because these ids used to be built
 * from the heading text, which produced ids containing a space ("About
 * you-firstName"). That is invalid HTML and unaddressable by an id selector,
 * so the person key supplies the id and the heading stays prose.
 */
function IdentityFields({
  heading,
  identity,
  name,
  onChange,
}: {
  heading: string;
  identity: JoinApplicantIdentity;
  name: "applicant" | "spouse";
  onChange: (key: keyof JoinApplicantIdentity, value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="join-eyebrow">{heading}</legend>

      <div className="join-pair join-pair-2" style={{ marginTop: 18 }}>
        {(Object.keys(identityFieldLabels) as (keyof JoinApplicantIdentity)[]).map((key) => (
          <div key={key}>
            <label className="join-field-label" htmlFor={`${name}-${key}`}>
              {identityFieldLabels[key]}
            </label>
            <input
              autoComplete="off"
              className="join-input"
              id={`${name}-${key}`}
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
    <div className="join-fields">
      <IdentityFields
        heading="About you"
        identity={draft.applicant}
        name="applicant"
        onChange={(key, value) => onIdentityChange("applicant", key, value)}
      />

      <label className="join-check">
        <input
          checked={draft.applyingAsCouple}
          onChange={(event) => onToggleCouple(event.target.checked)}
          type="checkbox"
        />
        <span className="join-check-body">
          <strong>We are applying as a couple</strong>
          You apply together as one household, and we keep both of you on file as two people in your own right.
        </span>
      </label>

      {draft.applyingAsCouple ? (
        <IdentityFields
          heading="About your spouse"
          identity={draft.spouse}
          name="spouse"
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
    <div className="join-fields join-fields-wide">
      <p className="join-step-intro" style={{ marginTop: 0 }}>
        {name ? `This is the application for ${name}.` : "This is your application."} Check anything you want to revisit
        before you submit.
      </p>

      {missing.length > 0 ? (
        <section className="join-panel">
          <p className="join-panel-title">Still to answer</p>
          <ul className="join-review-list">
            {missing.map((item) => (
              <li key={`${item.stepId}-${item.label}`}>
                <button
                  className="join-review-jump"
                  onClick={() => onJump(item.stepId, item.sectionId)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <span>Go</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="join-panel join-panel-gold">
          <p className="join-panel-title">Every required question is answered.</p>
        </section>
      )}

      <section>
        <p className="join-eyebrow">Before you submit</p>
        <ul className="join-review-list">
          <li>
            <p className="join-check-body" style={{ padding: "12px 0" }}>
              Submitting does not guarantee acceptance.
            </p>
          </li>
          <li>
            <p className="join-check-body" style={{ padding: "12px 0" }}>
              Nothing you have written becomes public because you submitted it.
            </p>
          </li>
          <li>
            <p className="join-check-body" style={{ padding: "12px 0" }}>
              If you are accepted, we would use some of this to prepare your missionary profile, and you would review it
              before anything is published.
            </p>
          </li>
          <li>
            <p className="join-check-body" style={{ padding: "12px 0" }}>
              USA Missionaries reviews beliefs and ministry expectations with every applicant before acceptance, and we
              will walk through ours with you as part of that conversation.
            </p>
          </li>
        </ul>
      </section>

      <fieldset>
        <legend className="join-eyebrow">Please confirm</legend>

        <div className="join-disclosures">
          {joinDisclosureIds.map((id) => (
            <label className="join-check" key={id}>
              <input
                checked={draft.disclosures[id] === true}
                onChange={(event) => onToggleDisclosure(id, event.target.checked)}
                type="checkbox"
              />
              <span className="join-check-body">{joinDisclosureLabels[id]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {submitError ? <p className="join-error">{submitError}</p> : null}

      <div>
        <button
          className="join-button join-button-primary"
          disabled={submitState === "submitting" || missing.length > 0 || !allDisclosuresConfirmed}
          onClick={onSubmit}
          type="button"
        >
          {submitState === "submitting" ? "Submitting" : "Submit application"}
          <ArrowRight />
        </button>

        {missing.length > 0 || !allDisclosuresConfirmed ? (
          <p className="join-field-help" style={{ marginTop: 12 }}>
            {missing.length > 0
              ? "Answer the remaining questions above to submit."
              : "Confirm each acknowledgement to submit."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SubmittedScreen({ applicationId, name }: { applicationId: string; name: string }) {
  return (
    <section className="join-done">
      <div className="join-mask">
        <p className="join-eyebrow">Application received</p>
      </div>

      {/* Warm without promising anything. Submitting is not acceptance, and the
          acknowledgements the applicant just signed say so, so the closing line
          thanks them for the step rather than implying they are through. */}
      <h1>
        <span className="join-mask">
          <span>Thank you for</span>
        </span>
        <span className="join-mask">
          <span style={{ color: "var(--gold)" }}>stepping forward.</span>
        </span>
      </h1>

      <div className="join-done-body join-lift" style={{ animationDelay: "0.4s" }}>
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
      </div>

      {applicationId ? (
        <p className="join-done-ref">
          Reference <b>{applicationId}</b>
        </p>
      ) : null}
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
    <div className="join-fields join-fields-wide">
      <p className="join-field-help" style={{ marginTop: 0 }}>
        A photo of you and one of your family, if you have them. These are stored privately and are never published
        without your review. JPG, PNG, or WebP, up to 5 MB.
      </p>

      <div className="join-photos">
        {(["profile", "family"] as const).map((kind) => {
          const existing = draft.photos.find((photo) => photo.kind === kind);

          return (
            <div className="join-photo" data-filled={existing ? "true" : "false"} key={kind}>
              <p className="join-photo-kind">{kind === "profile" ? "Your photo" : "Family photo"}</p>

              {existing ? (
                <div style={{ marginTop: 12 }}>
                  <p className="join-field-help" style={{ marginTop: 0, overflowWrap: "anywhere" }}>
                    {existing.fileName}
                  </p>
                  <button className="join-plain" onClick={() => onRemove(existing.path)} type="button">
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  accept="image/jpeg,image/png,image/webp"
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

              {busyKind === kind ? <p className="join-field-help">Uploading...</p> : null}
            </div>
          );
        })}
      </div>

      {error ? <p className="join-error">{error}</p> : null}
    </div>
  );
}
