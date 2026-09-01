"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import "./join-experience.css";
import { parseListValue, serializeListValue } from "./field-list";
import { WelcomeExperience } from "./WelcomeExperience";
import {
  identityFieldLabels,
  joinApplicationSections,
  supportBudgetAnswerId,
  supportBudgetCategories,
  visibleFieldsForSection,
  visibleFieldsForStep,
  type JoinField,
  type JoinListColumn,
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
 * it. The nine step model, the couple model, the private worksheet, the
 * validation and every request shape are exactly as USA-167 shipped them. What
 * changed is pacing: the step and section model is now compiled into a flat
 * list of pages, one question to a page, so the application is walked rather
 * than filled in. A narrative question owns its screen; a run of short factual
 * fields that make up one thought, like an address, stays together.
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

type ContentStepId = Exclude<JoinApplicationStepId, "review" | "start">;

/**
 * One screen of the application.
 *
 * Compiled from the USA-167 step and section model rather than replacing it,
 * so the information architecture, the review jumps and the submitted payload
 * all still speak in steps and sections.
 */
type Page =
  | { fields: JoinField[]; kind: "fields"; sectionId: string; solo: boolean; stepId: ContentStepId }
  | { kind: "identity"; sectionId: string; stepId: ContentStepId }
  | { kind: "photos"; sectionId: string; stepId: ContentStepId }
  | { kind: "review"; sectionId: string; stepId: JoinApplicationStepId }
  | { kind: "support"; section: JoinFieldSection; sectionId: string; stepId: ContentStepId };

function isApplicationContentStep(value: JoinApplicationStepId): value is ContentStepId {
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
  /**
   * USA-191: committed support and other household income are deliberately not
   * added together. Committed support is what partners have pledged, and it is
   * the only thing that reduces what is still to be raised. Other household
   * income is context for Operations, not support already in hand. Summing them
   * into one "already covered" figure made a household look further along than
   * it was and understated the fundraising target.
   */
  const covered = committed;

  return {
    budgetTotal,
    committed,
    covered,
    gap: Math.max(0, proposedNeed - committed),
    household,
    ministry,
    otherIncome,
    proposedNeed,
    requestedGoal: moneyNumber(draft.answers.supportRequestedGoal),
  };
}

/**
 * Compiles the step and section model into pages.
 *
 * The rule is one thought per screen. A long answer is a thought on its own and
 * gets the screen to itself, with the question set as the heading so nothing
 * competes with it. A run of short factual fields inside one section is a
 * single thought too, so an address is not dealt out over four screens just to
 * imitate a guided form.
 */
function buildPages(draft: JoinApplicationDraft): Page[] {
  const pages: Page[] = [];

  for (const step of joinApplicationSteps) {
    if (step.id === "start") {
      continue;
    }

    if (step.id === "review") {
      pages.push({ kind: "review", sectionId: "review", stepId: "review" });
      continue;
    }

    // Captured into a const so the narrowing survives into the closure below.
    // Narrowing a property access does not.
    const stepId = step.id;

    if (!isApplicationContentStep(stepId)) {
      continue;
    }

    const sections =
      stepId === "support" ? supportSectionsForDraft(draft) : joinApplicationSections[stepId];

    for (const section of sections) {
      if (stepId === "support") {
        pages.push({ kind: "support", section, sectionId: section.id, stepId });
        continue;
      }

      if (stepId === "about" && section.id === "identity") {
        pages.push({ kind: "identity", sectionId: section.id, stepId });
        continue;
      }

      if (stepId === "profile" && section.id === "photos") {
        pages.push({ kind: "photos", sectionId: section.id, stepId });
        continue;
      }

      const fields = visibleFieldsForSection(stepId, section.id, draft.applyingAsCouple);
      let run: JoinField[] = [];

      const flushRun = () => {
        if (run.length > 0) {
          pages.push({ fields: run, kind: "fields", sectionId: section.id, solo: false, stepId });
          run = [];
        }
      };

      for (const field of fields) {
        if (field.kind === "long") {
          flushRun();
          pages.push({ fields: [field], kind: "fields", sectionId: section.id, solo: true, stepId });
          continue;
        }

        run.push(field);
      }

      flushRun();
    }
  }

  return pages;
}

function sectionTitle(page: Page) {
  if (page.kind === "support") {
    return { intro: page.section.intro, title: page.section.title };
  }

  if (page.stepId === "review") {
    return { intro: "Check your answers, then submit.", title: "Review and submit" };
  }

  const sections = joinApplicationSections[page.stepId as ContentStepId] ?? [];
  const section = sections.find((candidate) => candidate.id === page.sectionId);

  return { intro: section?.intro ?? "", title: section?.title ?? "" };
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

/**
 * Wayfinding labels for the rail.
 *
 * The full step titles are what the screen heading says; in the rail they
 * overflowed seven across and were chopped mid word at the container edge.
 * These are the short forms. The full title stays the accessible name.
 */
const railLabels: Partial<Record<JoinApplicationStepId, string>> = {
  about: "About you",
  calling: "Calling",
  experience: "Experience",
  mission: "Mission",
  profile: "Profile",
  story: "Your story",
  support: "Support",
};

/**
 * The required marker.
 *
 * Preceded by a word joiner (U+2060), which is a zero width character that
 * forbids a line break at that point. Without it the asterisk wraps onto a
 * line of its own after a long question, which reads as a typo.
 */
function RequiredMark() {
  return (
    <>
      {"\u2060"}
      <span className="join-field-req">*</span>
    </>
  );
}

function ArrowRight() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M4 12h15m0 0-6-6m6 6-6 6" stroke="currentColor" strokeLinecap="square" strokeWidth="1.7" />
    </svg>
  );
}

export function UsamApplicationClient({ initialDraft, initialStep, resumeState, resumeToken }: Props) {
  const [draft, setDraft] = useState<JoinApplicationDraft>(initialDraft);
  const [token, setToken] = useState<string | null>(resumeToken);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [emailNotice, setEmailNotice] = useState("");
  const [started, setStarted] = useState(initialStep !== "start");
  const [submitState, setSubmitState] = useState<"error" | "idle" | "submitted" | "submitting">("idle");
  const [submitError, setSubmitError] = useState("");
  const [applicationId, setApplicationId] = useState("");
  /** Drives which way the transition plays, so back does not read as forward. */
  const [direction, setDirection] = useState<"back" | "forward">("forward");

  const pages = useMemo(() => buildPages(draft), [draft]);

  const [pageIndex, setPageIndex] = useState(() => {
    const built = buildPages(initialDraft);
    const found = built.findIndex((page) => page.stepId === initialStep);

    return found >= 0 ? found : 0;
  });

  // One intentional click owns one stable request ID. It survives an
  // ambiguous network failure so a retry cannot create a second email, while
  // a successful later click starts a new intentional send.
  const resumeEmailAttemptRef = useRef<{ id: string; inFlight: boolean } | null>(null);

  // Skips the autosave that would otherwise fire immediately on mount and
  // create an empty draft row for anyone who merely opened the page.
  const dirtyRef = useRef(false);

  // Answering the support branch adds or removes pages behind the current one,
  // so the index is clamped rather than trusted.
  const safeIndex = Math.min(pageIndex, pages.length - 1);
  const page = pages[safeIndex];
  const stepId = page.stepId;
  const stepIndex = joinApplicationStepIndex(stepId);
  const step = joinApplicationSteps[stepIndex];
  const heading = sectionTitle(page);
  const supportPathForGate = supportPathFromDraft(draft);
  /**
   * USA-191: the overflow acknowledgement is a condition of applying, not a
   * detail to notice at review, so it holds the page it is asked on.
   */
  const continueBlocked =
    (page.kind === "support" && page.sectionId === "path" && !supportPathForGate) ||
    (page.kind === "support" &&
      page.sectionId === "readiness" &&
      (supportPathForGate === "yes" || supportPathForGate === "unsure") &&
      draft.disclosures.excessSupportAgreement !== true);

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
  }, [draft, persist, started, safeIndex]);

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

  const moveTo = (index: number, how: "back" | "forward") => {
    const clamped = Math.max(0, Math.min(pages.length - 1, index));

    setDirection(how);
    setPageIndex(clamped);
    dirtyRef.current = true;
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  const goTo = (nextStep: JoinApplicationStepId, sectionId?: string) => {
    const target = pages.findIndex(
      (candidate) =>
        candidate.stepId === nextStep && (!sectionId || candidate.sectionId === sectionId),
    );
    const fallback = pages.findIndex((candidate) => candidate.stepId === nextStep);
    const index = target >= 0 ? target : fallback;

    if (index >= 0) {
      moveTo(index, index < safeIndex ? "back" : "forward");
    }
  };

  const goRelative = (offset: number) => moveTo(safeIndex + offset, offset < 0 ? "back" : "forward");

  /**
   * Keyboard pacing.
   *
   * Enter advances from a single line field, the way a guided flow is expected
   * to behave. Inside a textarea Enter has to stay a newline, because these are
   * the long answers the whole application is asking for, so those advance on
   * the modifier instead. Number keys answer a choice screen. Nothing here is
   * the only way to move: the footer control does the same job for anyone using
   * a pointer or a touch screen.
   */
  useEffect(() => {
    if (!started || submitState === "submitted") {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextarea = target?.tagName === "TEXTAREA";
      const isInput = target?.tagName === "INPUT";
      const modified = event.metaKey || event.ctrlKey;

      if (page.kind === "support" && page.sectionId === "path" && !isTextarea && !isInput) {
        const choice = { 1: "yes", 2: "unsure", 3: "no" }[Number(event.key)];

        if (choice) {
          event.preventDefault();
          setAnswer("supportPath", choice);

          return;
        }
      }

      if (event.key !== "Enter" || continueBlocked || page.kind === "review") {
        return;
      }

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
          <div aria-hidden="true" className="join-landscape" />
          <SubmittedScreen applicationId={applicationId} name={applicantDisplayName(draft)} />
        </div>
      </main>
    );
  }

  if (!started) {
    return (
      <main aria-label="Apply to become a USA Missionary" className="join">
        <WelcomeExperience
          onStart={() => {
            setStarted(true);
            setDirection("forward");
            dirtyRef.current = true;
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

  const railSteps = joinApplicationSteps.slice(1, -1);
  const progress = Math.round((safeIndex / Math.max(1, pages.length - 1)) * 100);
  const questionSteps = joinApplicationSteps.length - 2;

  return (
    <main aria-label="Apply to become a USA Missionary" className="join">
      <header className="join-chrome">
        <div className="join-chrome-inner">
          {/* No app tile here. The approved reference removed that treatment
              from the opening, and the application chrome carries the wordmark
              alone for the same reason. */}
          <p className="join-chrome-mark">USA Missionaries</p>

          <ol className="join-rail">
            {railSteps.map((railStep, index) => {
              const position = index + 1;
              const state = position === stepIndex ? "current" : position < stepIndex ? "done" : "todo";

              return (
                <li key={railStep.id}>
                  <button
                    aria-current={state === "current" ? "step" : undefined}
                    aria-label={railStep.title}
                    data-state={state}
                    onClick={() => goTo(railStep.id)}
                    type="button"
                  >
                    <span className="join-rail-label">
                      {railLabels[railStep.id] ?? railStep.title}
                    </span>
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
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="join-stage">
        {notice ? <p className="join-notice">{notice}</p> : null}
        {emailNotice ? <p className="join-notice">{emailNotice}</p> : null}

        <div className="join-transition" data-direction={direction} key={safeIndex}>
          <PageView
            addPhoto={addPhoto}
            draft={draft}
            heading={heading}
            missing={requiredMissing}
            onAnswer={setAnswer}
            onDisclosure={setDisclosure}
            onIdentityChange={setIdentity}
            onJump={goTo}
            onSubmit={() => void submitApplication()}
            onToggleCouple={(value) => {
              dirtyRef.current = true;
              setDraft((current) => ({ ...current, applyingAsCouple: value }));
            }}
            page={page}
            pageIndex={safeIndex}
            pageTotal={pages.length}
            questionSteps={questionSteps}
            removePhoto={removePhoto}
            step={step}
            stepIndex={stepIndex}
            submitError={submitError}
            submitState={submitState}
          />
        </div>
      </div>

      <div className="join-footer">
        <div className="join-footer-inner">
          <button
            className="join-button join-button-secondary"
            disabled={safeIndex === 0}
            onClick={() => goRelative(-1)}
            type="button"
          >
            Back
          </button>

          {page.kind === "review" ? (
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
                {continueBlocked ? "Choose an option" : "Continue"}
                <ArrowRight />
              </button>

              {/* A long answer needs Enter for newlines, so that screen asks
                  for the modifier instead. One instruction, never both. */}
              {page.kind === "fields" && page.solo ? (
                <p className="join-footer-hint">
                  Press <span className="join-key">Cmd</span>
                  <span aria-hidden="true">+</span>
                  <span className="join-key">Enter</span>
                </p>
              ) : (
                <p className="join-footer-hint">
                  Press <span className="join-key">Enter</span>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/** The index line, set as a system value rather than as prose. */
function QuestionIndex({
  pageIndex,
  pageTotal,
  stepIndex,
  stepTitle,
  questionSteps,
}: {
  pageIndex: number;
  pageTotal: number;
  questionSteps: number;
  stepIndex: number;
  stepTitle: string;
}) {
  return (
    <p className="join-q-index">
      <b>
        Step {Math.min(stepIndex, questionSteps)} of {questionSteps}
      </b>
      {/* Each separator travels with the label it introduces, so a wrap can
          never strand a slash at the end of a line. */}
      <span className="join-q-seg">
        <i aria-hidden="true">/</i> {stepTitle}
      </span>
      <span className="join-q-seg">
        <i aria-hidden="true">/</i> {String(pageIndex + 1).padStart(2, "0")} of {pageTotal}
      </span>
    </p>
  );
}

function PageView({
  addPhoto,
  draft,
  heading,
  missing,
  onAnswer,
  onDisclosure,
  onIdentityChange,
  onJump,
  onSubmit,
  onToggleCouple,
  page,
  pageIndex,
  pageTotal,
  questionSteps,
  removePhoto,
  step,
  stepIndex,
  submitError,
  submitState,
}: {
  addPhoto: (photo: JoinApplicationPhoto) => void;
  draft: JoinApplicationDraft;
  heading: { intro: string; title: string };
  missing: { label: string; sectionId?: string; stepId: JoinApplicationStepId }[];
  onAnswer: (id: string, value: string) => void;
  onDisclosure: (id: string, value: boolean) => void;
  onIdentityChange: (person: "applicant" | "spouse", key: keyof JoinApplicantIdentity, value: string) => void;
  onJump: (id: JoinApplicationStepId, sectionId?: string) => void;
  onSubmit: () => void;
  onToggleCouple: (value: boolean) => void;
  page: Page;
  pageIndex: number;
  pageTotal: number;
  questionSteps: number;
  removePhoto: (path: string) => void;
  step: { title: string };
  stepIndex: number;
  submitError: string;
  submitState: "error" | "idle" | "submitted" | "submitting";
}) {
  const index = (
    <QuestionIndex
      pageIndex={pageIndex}
      pageTotal={pageTotal}
      questionSteps={questionSteps}
      stepIndex={stepIndex}
      stepTitle={step.title}
    />
  );

  /*
   * A single long answer is presented as the question itself: the field label
   * becomes the heading and the box carries no second label, because repeating
   * the question directly above the box is exactly the form clutter this
   * redesign exists to remove.
   */
  if (page.kind === "fields" && page.solo) {
    const field = page.fields[0];
    const isNarrative = /story|testimony|journey|narrative|vision|describe|why/i.test(field.id);

    return (
      <div className="join-q join-solo">
        {index}
        <h1 className="join-q-title">
          {field.label}
          {field.required ? <RequiredMark /> : null}
        </h1>
        {field.help ? <p className="join-q-help">{field.help}</p> : null}

        <div className="join-answer">
          <label className="join-sr" htmlFor={field.id}>
            {field.label}
          </label>
          <textarea
            className={`join-textarea${isNarrative ? " join-textarea-tall" : ""}`}
            id={field.id}
            onChange={(event) => onAnswer(field.id, event.target.value)}
            value={draft.answers[field.id] ?? ""}
          />
        </div>
      </div>
    );
  }

  if (page.kind === "fields") {
    return (
      <div className="join-q">
        {index}
        <h1 className="join-q-title">{heading.title}</h1>
        {heading.intro ? <p className="join-q-help">{heading.intro}</p> : null}

        <div className="join-answer">
          <FieldGroup fields={page.fields} onAnswer={onAnswer} values={draft.answers} />
        </div>
      </div>
    );
  }

  if (page.kind === "identity") {
    return (
      <div className="join-q">
        {index}
        <h1 className="join-q-title">{heading.title}</h1>
        {heading.intro ? <p className="join-q-help">{heading.intro}</p> : null}

        <div className="join-answer">
          <IdentitySection
            draft={draft}
            onIdentityChange={onIdentityChange}
            onToggleCouple={onToggleCouple}
          />
        </div>
      </div>
    );
  }

  if (page.kind === "photos") {
    return (
      <div className="join-q join-q-wide">
        {index}
        <h1 className="join-q-title">{heading.title}</h1>
        {heading.intro ? <p className="join-q-help">{heading.intro}</p> : null}

        <div className="join-answer">
          <PhotoSection draft={draft} onRemove={removePhoto} onUploaded={addPhoto} />
        </div>
      </div>
    );
  }

  if (page.kind === "support") {
    const wide = page.sectionId === "budget" || page.sectionId === "picture";

    return (
      <div className={`join-q${wide ? " join-q-wide" : ""}`}>
        {index}
        <h1 className="join-q-title">{heading.title}</h1>
        {heading.intro ? <p className="join-q-help">{heading.intro}</p> : null}

        <div className="join-answer">
          <SupportSection
            draft={draft}
            onAnswer={onAnswer}
            onDisclosure={onDisclosure}
            section={page.section}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="join-q join-q-wide">
      {index}
      <h1 className="join-q-title">{heading.title}</h1>

      <div className="join-answer">
        <ReviewSection
          draft={draft}
          missing={missing}
          onJump={onJump}
          onSubmit={onSubmit}
          onToggleDisclosure={onDisclosure}
          submitError={submitError}
          submitState={submitState}
        />
      </div>
    </div>
  );
}

/**
 * Short fields that belong to one thought. Two sit side by side once there is
 * room, unless one of them carries help text, in which case it takes the full
 * measure so the help is not squeezed into a column.
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

    if (last && last.length === 1 && !last[0].help && !field.help) {
      last.push(field);
      continue;
    }

    rows.push([field]);
  }

  return (
    <div className="join-fields join-stagger">
      {rows.map((row, rowIndex) => (
        <div
          className={row.length > 1 ? "join-pair join-pair-2" : undefined}
          key={row.map((field) => field.id).join("-")}
          style={{ "--i": rowIndex } as CSSProperties}
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
  hotkey,
  onSelect,
  selected,
  title,
}: {
  description: string;
  hotkey: string;
  onSelect: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <button aria-pressed={selected} className="join-choice" onClick={onSelect} type="button">
      <span aria-hidden="true" className="join-choice-key">
        {hotkey}
      </span>
      <span>
        <span className="join-choice-title">{title}</span>
        <span className="join-choice-note">{description}</span>
      </span>
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
        {required ? <RequiredMark /> : null}
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

function SupportMetric({
  help,
  label,
  value,
  tone = "default",
}: { help?: string; label: string; value: number; tone?: "accent" | "default" }) {
  return (
    <div className="join-metric" data-tone={tone}>
      <p className="join-metric-label">{label}</p>
      <p className="join-metric-value">{formatMoney(value)}</p>
      {help ? <p className="join-metric-help">{help}</p> : null}
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
            {/* No whitespace before the marker: a JSX newline here would
                become a space, which is exactly the break the joiner exists
                to prevent. */}
            Do you expect to raise monthly support?<RequiredMark />
          </legend>
          <p className="join-field-help">Your answer controls which financial questions come next.</p>

          <div className="join-choices join-choices-3" style={{ marginTop: 16 }}>
            <SupportChoice
              description="I expect monthly partners to help sustain this ministry."
              hotkey="1"
              onSelect={() => onAnswer("supportPath", "yes")}
              selected={path === "yes"}
              title="Yes"
            />
            <SupportChoice
              description="I need help discerning the right support model."
              hotkey="2"
              onSelect={() => onAnswer("supportPath", "unsure")}
              selected={path === "unsure"}
              title="Not sure yet"
            />
            <SupportChoice
              description="My household and ministry are already funded."
              hotkey="3"
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
      <div className="join-fields">
        {(["household", "ministry"] as const).map((group) => {
          const categories = supportBudgetCategories.filter((category) => category.group === group);
          const subtotal = group === "household" ? summary.household : summary.ministry;

          return (
            <section key={group}>
              <div className="join-worksheet-head">
                <div>
                  <p className="join-eyebrow">{group === "household" ? "Household" : "Ministry"}</p>
                  <p className="join-panel-title" style={{ marginTop: 4 }}>
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
          <p className="join-metric-label">Estimated monthly budget</p>
          <p className="join-metric-value" style={{ fontSize: "1.9rem", color: "var(--gold-ink)" }}>
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
      <div className="join-fields">
        <div className="join-metrics">
          <SupportMetric help="From your worksheet" label="Budget total" value={summary.budgetTotal} />
          <SupportMetric help="What you are asking for" label="Proposed need" value={summary.proposedNeed} />
          <SupportMetric help="Already pledged" label="Committed support" value={summary.committed} />
          <SupportMetric help="Proposed need less committed" label="Still to raise" tone="accent" value={summary.gap} />
        </div>

        <div className="join-money-group">
          <p className="join-money-group-title">What you need</p>
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
              help="Choose the amount you want Operations to review. It is never calculated automatically."
              id="supportRequestedGoal"
              label="Requested fundraising goal"
              onChange={(value) => onAnswer("supportRequestedGoal", value)}
              value={draft.answers.supportRequestedGoal ?? ""}
            />
          </div>
        </div>

        <div className="join-money-group">
          <p className="join-money-group-title">What you already have</p>
          <div className="join-pair join-pair-2">
            <SupportMoneyField
              help="Recurring support partners have already pledged. This is what reduces the amount still to raise."
              id="supportCommittedAmount"
              label="Committed monthly support"
              onChange={(value) => onAnswer("supportCommittedAmount", value)}
              value={draft.answers.supportCommittedAmount ?? ""}
            />
            <SupportMoneyField
              help="Wages or other income your household lives on. Context for Operations, not counted against your support goal."
              id="supportOtherMonthlyIncome"
              label="Other monthly household income"
              onChange={(value) => onAnswer("supportOtherMonthlyIncome", value)}
              value={draft.answers.supportOtherMonthlyIncome ?? ""}
            />
          </div>
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
            <strong>
              Support overflow acknowledgement
              <RequiredMark />
            </strong>
            I understand USA Missionaries leadership approves the public monthly goal. Support above that approved goal is not automatically assigned to my household and may be stewarded by USA Missionaries for ministry needs and approved support priorities.
          </span>
        </label>
      ) : null}
    </div>
  );
}

/**
 * USA-191: a repeating answer, one row per person.
 *
 * These were single free-text boxes that asked for several people at once, so
 * what came back was inconsistent and hard to read in Operations. Each person
 * now gets their own row. The value is still stored as text (see field-list.ts)
 * so nothing behind the form had to change.
 */
function ListField({
  addLabel,
  columns,
  onChange,
  value,
}: {
  addLabel?: string;
  columns: JoinListColumn[];
  onChange: (value: string) => void;
  value: string;
}) {
  const rows = parseListValue(value, columns.length);

  const write = (next: string[][]) => onChange(serializeListValue(next));

  return (
    <div className="join-list">
      {rows.map((row, rowIndex) => (
        // Rows have no identity of their own, and reordering is not offered,
        // so the index is a stable enough key here.
        <div className="join-list-row" key={rowIndex}>
          <div className="join-list-cells">
            {columns.map((column, cellIndex) => (
              <label
                className={`join-list-cell${column.narrow ? " join-list-cell-narrow" : ""}`}
                key={column.id}
              >
                <span className="join-list-cell-label">{column.label}</span>
                <input
                  className="join-input"
                  onChange={(event) => {
                    const next = rows.map((existing) => [...existing]);

                    next[rowIndex][cellIndex] = event.target.value;
                    write(next);
                  }}
                  type="text"
                  value={row[cellIndex] ?? ""}
                />
              </label>
            ))}
          </div>

          {rows.length > 1 ? (
            <button
              aria-label={`Remove person ${rowIndex + 1}`}
              className="join-list-remove"
              onClick={() => write(rows.filter((_unused, index) => index !== rowIndex))}
              type="button"
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}

      <button
        className="join-list-add"
        onClick={() => write([...rows, columns.map(() => "")])}
        type="button"
      >
        <span aria-hidden="true">+</span> {addLabel ?? "Add another"}
      </button>
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
  const isNarrative = /story|testimony|journey|narrative|vision|describe|why/i.test(field.id);

  return (
    <div>
      <label className="join-field-label" htmlFor={field.id}>
        {field.label}
        {field.required ? <RequiredMark /> : null}
      </label>

      {field.help ? <p className="join-field-help">{field.help}</p> : null}

      {field.kind === "list" && field.columns ? (
        <ListField columns={field.columns} addLabel={field.addLabel} onChange={onChange} value={value} />
      ) : field.kind === "long" ? (
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
  labelled,
  name,
  onChange,
}: {
  heading: string;
  identity: JoinApplicantIdentity;
  labelled: boolean;
  name: "applicant" | "spouse";
  onChange: (key: keyof JoinApplicantIdentity, value: string) => void;
}) {
  return (
    <fieldset>
      {/* Only labelled when there is a second person to tell it apart from.
          On a single applicant the screen heading already says whose details
          these are, and the label was repeating the step name. */}
      {labelled ? <legend className="join-eyebrow join-eyebrow-quiet">{heading}</legend> : null}

      <div className="join-pair join-pair-2" style={{ marginTop: labelled ? 14 : 0 }}>
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
        labelled={draft.applyingAsCouple}
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
          labelled
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
    <div className="join-fields">
      <p className="join-q-help" style={{ marginTop: 0 }}>
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
        <p className="join-eyebrow join-eyebrow-quiet">Before you submit</p>
        <ul className="join-review-list">
          <li>
            <p className="join-review-note">Submitting does not guarantee acceptance.</p>
          </li>
          <li>
            <p className="join-review-note">
              Nothing you have written becomes public because you submitted it.
            </p>
          </li>
          <li>
            <p className="join-review-note">
              If you are accepted, we would use some of this to prepare your missionary profile, and you would review it
              before anything is published.
            </p>
          </li>
          <li>
            <p className="join-review-note">
              USA Missionaries reviews beliefs and ministry expectations with every applicant before acceptance, and we
              will walk through ours with you as part of that conversation.
            </p>
          </li>
        </ul>
      </section>

      <fieldset>
        <legend className="join-eyebrow join-eyebrow-quiet">Please confirm</legend>

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
          <span style={{ color: "var(--gold-ink)" }}>stepping forward.</span>
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
    <div className="join-fields">
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
