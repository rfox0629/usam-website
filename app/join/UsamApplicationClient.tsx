"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import "./join-experience.css";
import { incompleteReferences, listCellId, parseListValue, referenceRowGaps, serializeListValue } from "./field-list";
import {
  CURRENT_ORGANIZATIONAL_SUPPORT_RATE,
  planningFundraisingTarget,
  planningOrganizationalSupport,
} from "@/src/lib/organizational-support";
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

/** One thing Review says is still to do, and where to go to do it. */
type MissingItem = {
  /** The page holding this question, when one section has several pages. */
  fieldId?: string;
  /** The control to put the cursor in on arrival. */
  focusId?: string;
  label: string;
  sectionId?: string;
  stepId: JoinApplicationStepId;
};


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

  /*
   * The proposed need is a ministry budget: what the household needs available
   * for ministry. USA Missionaries allocates 10% of contributions received to
   * organizational support, so the amount to raise is the grossed-up target,
   * and the gap is measured against that rather than against the budget.
   */
  const target = planningFundraisingTarget(proposedNeed);

  return {
    budgetTotal,
    committed,
    covered,
    gap: Math.max(0, target - committed),
    organizationalSupport: planningOrganizationalSupport(proposedNeed),
    target,
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

/**
 * A stable name for one screen, saved with the draft so a resume reopens the
 * exact question. Built from the step, the section and the first question on
 * it, never from the page's position: pages come and go as the couple and
 * support answers change, so an index saved today can point somewhere else
 * tomorrow.
 */
function pageKey(page: Page) {
  const leaf = page.kind === "fields" ? page.fields[0]?.id ?? "fields" : page.kind;

  return `${page.stepId}/${page.sectionId}/${leaf}`;
}

/**
 * Where a restored draft opens.
 *
 * Exact when the saved page key still exists. A draft saved before page keys
 * existed, or whose page has since gone (the support branch changed, say),
 * opens at the start of the step it was on, and the notice says so rather than
 * claiming it is exactly where the applicant left off.
 */
function initialPosition(draft: JoinApplicationDraft, step: JoinApplicationStepId) {
  const built = buildPages(draft);
  const exact = draft.position ? built.findIndex((candidate) => pageKey(candidate) === draft.position) : -1;

  if (exact >= 0) {
    return { exact: true, index: exact };
  }

  const found = built.findIndex((candidate) => candidate.stepId === step);

  return { exact: false, index: found >= 0 ? found : 0 };
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

function resumeNotice(state: ResumeState, exact: boolean) {
  switch (state) {
    case "expired":
      return "That link has expired. Your answers are safe, so contact us and we will send a fresh one.";
    case "restored":
      return exact
        ? "Welcome back. Your answers are saved, and this is the question you stopped on."
        : "Welcome back. Your answers are saved. We have opened the part of the application you were working on.";
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

  // Read once: where the restored draft opens, and whether that is the exact
  // question, which decides what the welcome-back notice may claim.
  const [initial] = useState(() => initialPosition(initialDraft, initialStep));
  const [pageIndex, setPageIndex] = useState(initial.index);

  /*
   * The welcome-back notice belongs to the moment of return. It used to sit
   * above every page for the rest of the session. It now shows on the page the
   * applicant lands on, can be dismissed, and goes once they move on.
   */
  const [noticeVisible, setNoticeVisible] = useState(true);

  /*
   * Set when the applicant jumps from Review to a question, so the footer can
   * offer the way straight back and a reference Review flagged can be marked
   * on the page. Cleared when they return.
   */
  const [fromReview, setFromReview] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  // One intentional click owns one stable request ID. It survives an
  // ambiguous network failure so a retry cannot create a second email, while
  // a successful later click starts a new intentional send.
  const resumeEmailAttemptRef = useRef<{ id: string; inFlight: boolean } | null>(null);

  // The draft object the last successful save sent, so leaving the page only
  // re-sends when something has changed since.
  const lastSavedDraftRef = useRef<JoinApplicationDraft | null>(null);
  const lastSavedPositionRef = useRef<string | null>(null);

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
  const currentPageKey = pageKey(page);
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
            draft: { ...draft, position: currentPageKey },
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

        lastSavedDraftRef.current = draft;
        lastSavedPositionRef.current = currentPageKey;
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
    [currentPageKey, draft, stepId, token],
  );

  /*
   * Keep the resume token in the address bar once the first save mints it.
   *
   * The token used to live only in component state, so a refresh, an
   * accidental back swipe, or a phone reclaiming the tab reopened a blank
   * application: the draft was safe on the server but nothing on the page
   * could find it again unless the applicant had emailed themselves a link.
   * With ?resume= in the URL, reloading goes through the same server restore
   * the emailed link uses. replaceState, so no history entry is added.
   */
  useEffect(() => {
    if (!token || submitState === "submitted") {
      return;
    }

    const url = new URL(window.location.href);

    if (url.searchParams.get("resume") !== token) {
      url.searchParams.set("resume", token);
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, [submitState, token]);

  /*
   * The debounced autosave can still be waiting when the tab is closed, or
   * when a phone puts the browser in the background and later discards it,
   * which would drop the last few keystrokes. When the page is hidden, send
   * the current draft once more with keepalive so the request outlives the
   * page. Only once a token exists: without one, the save would create a
   * second draft that nothing could ever reopen.
   */
  const latestSaveRef = useRef({ currentStep: stepId, draft, position: currentPageKey, token });
  latestSaveRef.current = { currentStep: stepId, draft, position: currentPageKey, token };

  useEffect(() => {
    const flush = () => {
      const latest = latestSaveRef.current;

      if (
        !latest.token ||
        !dirtyRef.current ||
        (lastSavedDraftRef.current === latest.draft && lastSavedPositionRef.current === latest.position) ||
        submitState === "submitted"
      ) {
        return;
      }

      lastSavedDraftRef.current = latest.draft;
      lastSavedPositionRef.current = latest.position;

      void fetch("/api/join/draft", {
        body: JSON.stringify({
          currentStep: latest.currentStep,
          draft: { ...latest.draft, position: latest.position },
          resumeToken: latest.token,
        }),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      }).catch(() => undefined);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [submitState]);

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
    const missing: MissingItem[] = [];
    const supportPath = supportPathFromDraft(draft);
    const expectsFundraising = supportPath === "yes" || supportPath === "unsure";

    if (!draft.applicant.firstName.trim() || !draft.applicant.lastName.trim() || !draft.applicant.email.trim()) {
      const first = !draft.applicant.firstName.trim() ? "firstName" : !draft.applicant.lastName.trim() ? "lastName" : "email";

      missing.push({ focusId: `applicant-${first}`, label: "Your name and email", sectionId: "identity", stepId: "about" });
    }

    if (draft.applyingAsCouple && (!draft.spouse.firstName.trim() || !draft.spouse.lastName.trim())) {
      const first = !draft.spouse.firstName.trim() ? "firstName" : "lastName";

      missing.push({ focusId: `spouse-${first}`, label: "Your spouse's name", sectionId: "identity", stepId: "about" });
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
          missing.push({ fieldId: field.id, focusId: field.id, label: field.label, sectionId: field.section, stepId: candidate.id });
        }
      }
    }

    // A reference Operations cannot reach is not a reference. Each incomplete
    // row is named with what it lacks, and its jump lands in the empty cell.
    for (const reference of incompleteReferences(draft.answers.references)) {
      missing.push({
        focusId: listCellId("references", reference.rowIndex, reference.cellIndex),
        label: reference.label,
        sectionId: "references",
        stepId: "experience",
      });
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

    if (clamped !== safeIndex) {
      setNoticeVisible(false);
      setEmailNotice("");
    }

    if (pages[clamped]?.kind === "review") {
      setFromReview(false);
    }

    setDirection(how);
    setPageIndex(clamped);
    dirtyRef.current = true;
    window.scrollTo({ behavior: "smooth", top: 0 });
  };

  /**
   * Jumps to a step, optionally a section, optionally the page holding one
   * question, and optionally puts the cursor in one control on it.
   */
  const goTo = (
    nextStep: JoinApplicationStepId,
    sectionId?: string,
    options: { fieldId?: string; focusId?: string; fromReview?: boolean } = {},
  ) => {
    const inStep = (candidate: Page) => candidate.stepId === nextStep;
    const inSection = (candidate: Page) => inStep(candidate) && (!sectionId || candidate.sectionId === sectionId);
    const holdsField = (candidate: Page) =>
      inSection(candidate) &&
      Boolean(options.fieldId) &&
      candidate.kind === "fields" &&
      candidate.fields.some((field) => field.id === options.fieldId);
    const index = [holdsField, inSection, inStep]
      .map((match) => pages.findIndex(match))
      .find((found) => found >= 0);

    if (index === undefined) {
      return;
    }

    moveTo(index, index < safeIndex ? "back" : "forward");
    setFromReview(options.fromReview === true);
    setFocusTarget(options.focusId ?? null);
  };

  const reviewIndex = pages.findIndex((candidate) => candidate.kind === "review");

  // Puts the cursor in the control a Review jump was about, once its page has
  // rendered. preventScroll, then a scroll that leaves it clear of the footer.
  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    const timer = window.setTimeout(() => {
      const element = document.getElementById(focusTarget);

      if (element instanceof HTMLElement) {
        element.focus({ preventScroll: true });
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [focusTarget, safeIndex]);

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

      // Inside a repeating answer (references, household, prayer partners)
      // Enter, or Return on a phone keyboard, was taking the applicant off the
      // page halfway through entering a person. It stays on the page there;
      // Continue and the modifier shortcut still advance.
      if (target?.closest(".join-list") && !modified) {
        return;
      }

      event.preventDefault();
      goRelative(1);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const notice = noticeVisible ? resumeNotice(resumeState, initial.exact) : "";

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
        {notice ? (
          <div className="join-notice" role="status">
            <p>{notice}</p>
            <button
              aria-label="Dismiss this message"
              className="join-notice-close"
              onClick={() => setNoticeVisible(false)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : null}
        {emailNotice ? (
          <div className="join-notice" role="status">
            <p>{emailNotice}</p>
            <button
              aria-label="Dismiss this message"
              className="join-notice-close"
              onClick={() => setEmailNotice("")}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ) : null}

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
            revealIssues={fromReview}
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

          {fromReview && page.kind !== "review" && reviewIndex >= 0 ? (
            <button
              className="join-button join-button-secondary join-button-return"
              onClick={() => moveTo(reviewIndex, "forward")}
              type="button"
            >
              <span className="join-return-long">Back to review</span>
              <span className="join-return-short">Review</span>
            </button>
          ) : null}

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
  revealIssues,
  step,
  stepIndex,
  submitError,
  submitState,
}: {
  addPhoto: (photo: JoinApplicationPhoto) => void;
  draft: JoinApplicationDraft;
  heading: { intro: string; title: string };
  missing: MissingItem[];
  onAnswer: (id: string, value: string) => void;
  onDisclosure: (id: string, value: boolean) => void;
  onIdentityChange: (person: "applicant" | "spouse", key: keyof JoinApplicantIdentity, value: string) => void;
  onJump: (id: JoinApplicationStepId, sectionId?: string, options?: { fieldId?: string; focusId?: string; fromReview?: boolean }) => void;
  onSubmit: () => void;
  onToggleCouple: (value: boolean) => void;
  page: Page;
  pageIndex: number;
  pageTotal: number;
  questionSteps: number;
  removePhoto: (path: string) => void;
  revealIssues: boolean;
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
    // A page with a repeating answer gets the wider measure, so a row of
    // name, relationship and contact is not squeezed into the reading column.
    const hasList = page.fields.some((field) => field.kind === "list");

    return (
      <div className={`join-q${hasList ? " join-q-wide" : ""}`}>
        {index}
        <h1 className="join-q-title">{heading.title}</h1>
        {heading.intro ? <p className="join-q-help">{heading.intro}</p> : null}

        <div className="join-answer">
          <FieldGroup fields={page.fields} onAnswer={onAnswer} revealIssues={revealIssues} values={draft.answers} />
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
  revealIssues = false,
  values,
}: {
  fields: JoinField[];
  onAnswer: (id: string, value: string) => void;
  revealIssues?: boolean;
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
              revealIssues={revealIssues}
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
          <SupportMetric help="Available for ministry" label="Ministry budget" value={summary.proposedNeed} />
          <SupportMetric help="Already pledged" label="Committed support" value={summary.committed} />
          <SupportMetric help="Target less committed" label="Still to raise" tone="accent" value={summary.gap} />
        </div>

        {summary.proposedNeed > 0 ? (
          <div className="join-plan">
            <p className="join-plan-title">Monthly funding plan</p>

            <dl className="join-plan-rows">
              <div className="join-plan-row">
                <dt>Ministry budget</dt>
                <dd>{formatMoney(summary.proposedNeed)}</dd>
              </div>
              <div className="join-plan-row">
                <dt>Organizational support</dt>
                <dd>{formatMoney(summary.organizationalSupport)}</dd>
              </div>
              <div className="join-plan-row join-plan-row-total">
                <dt>Fundraising target</dt>
                <dd>{formatMoney(summary.target)}</dd>
              </div>
            </dl>

            <p className="join-plan-note">
              USA Missionaries allocates {Math.round(CURRENT_ORGANIZATIONAL_SUPPORT_RATE * 100)}% of the contributions
              designated for your ministry to organizational support: administration, financial management,
              donation processing and receipting, technology, training, missionary support, and organizational
              oversight.
            </p>
            <p className="join-plan-note">
              That allocation comes out of what is actually received, whether or not you have reached your
              target. Your target is set so that the ministry budget above is what remains after it, which is
              why it is a little more than the budget plus ten percent. You do not need to work this out
              yourself.
            </p>
          </div>
        ) : null}

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
/**
 * Column widths for a repeating answer. A name or an email needs far more room
 * than an age; equal thirds cut names off mid word at desktop width.
 */
function listColumnTemplate(columns: JoinListColumn[]) {
  return columns
    .map((column) => (column.narrow ? "88px" : `minmax(0, ${column.weight ?? 1}fr)`))
    .join(" ");
}

function ListField({
  addLabel,
  columns,
  id,
  onChange,
  revealIssues = false,
  validate,
  value,
}: {
  addLabel?: string;
  columns: JoinListColumn[];
  id: string;
  onChange: (value: string) => void;
  /** Marks rows that fail `validate`. Only after Review has pointed here. */
  revealIssues?: boolean;
  /** For references: which cells of a row are missing. */
  validate?: (row: string[]) => number[];
  value: string;
}) {
  /*
   * The rows being edited are held here, not re-derived from the stored text on
   * every render. The stored text drops blank rows and trims each cell, which is
   * right for what gets saved but wrong for what is on screen: re-deriving from
   * it swallowed the space typed between a first and last name, and threw away
   * the blank row "Add another" had just appended, so a second reference could
   * never be added. `source` is the stored text these rows were last in step
   * with; when the stored value changes from outside (a restored draft), the
   * rows are rebuilt from it.
   */
  const [editing, setEditing] = useState(() => ({ rows: parseListValue(value, columns.length), source: value }));
  let rows = editing.rows;

  if (value !== editing.source) {
    rows = parseListValue(value, columns.length);
    setEditing({ rows, source: value });
  }

  const write = (next: string[][]) => {
    const serialized = serializeListValue(next);

    setEditing({ rows: next, source: serialized });
    onChange(serialized);
  };

  return (
    <div className="join-list" style={{ "--join-list-columns": listColumnTemplate(columns) } as CSSProperties}>
      {rows.map((row, rowIndex) => {
        const missingCells = revealIssues && validate ? validate(row) : [];

        return (
        // Rows have no identity of their own, and reordering is not offered,
        // so the index is a stable enough key here.
        <div className="join-list-row" data-incomplete={missingCells.length > 0 ? "true" : undefined} key={rowIndex}>
          <div className="join-list-cells">
            {columns.map((column, cellIndex) => (
              <label
                className={`join-list-cell${column.narrow ? " join-list-cell-narrow" : ""}`}
                key={column.id}
              >
                <span className="join-list-cell-label">{column.label}</span>
                <input
                  aria-invalid={missingCells.includes(cellIndex) ? true : undefined}
                  className="join-input"
                  // The first cell carries the question's own id, so the
                  // question label points at it; every other cell has its own
                  // id so Review can send the cursor to the one that is empty.
                  id={listCellId(id, rowIndex, cellIndex)}
                  onChange={(event) => {
                    const next = rows.map((existing) => [...existing]);

                    next[rowIndex][cellIndex] = event.target.value;
                    write(next);
                  }}
                  title={row[cellIndex] || undefined}
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

          {missingCells.length > 0 ? (
            <p className="join-list-issue">
              Add {missingCells.map((cell) => (cell === 0 ? "a name" : "a phone or email")).join(" and ")}.
            </p>
          ) : null}
        </div>
        );
      })}

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
  revealIssues = false,
  value,
}: {
  field: JoinField;
  onChange: (value: string) => void;
  revealIssues?: boolean;
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
        <ListField
          addLabel={field.addLabel}
          columns={field.columns}
          id={field.id}
          onChange={onChange}
          revealIssues={revealIssues}
          validate={field.id === "references" ? referenceRowGaps : undefined}
          value={value}
        />
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

type SummaryRow = {
  fieldId?: string;
  focusId?: string;
  label: string;
  sectionId: string;
  value: string;
};

const supportPathLabels: Record<SupportPath, string> = {
  no: "No, the household and ministry are already funded",
  unsure: "Not sure yet",
  yes: "Yes, monthly partners",
};

/** One line per person in a repeating answer, cells joined the way they read. */
function listSummary(field: JoinField, value: string) {
  const columns = field.columns ?? [];

  return parseListValue(value, columns.length)
    .map((row) => {
      if (field.id === "familyMembers") {
        const [name, age, relationship] = row;

        return [name, relationship, age ? `age ${age}` : ""].filter(Boolean).join(", ");
      }

      if (field.id === "prayerPartners") {
        return row.filter(Boolean).join(" ");
      }

      return row.filter(Boolean).join(" · ");
    })
    .filter(Boolean)
    .join("\n");
}

function identitySummary(identity: JoinApplicantIdentity) {
  return [[identity.firstName, identity.lastName].filter(Boolean).join(" "), identity.email, identity.phone]
    .filter(Boolean)
    .join("\n");
}

/**
 * Everything the applicant has answered, grouped by step in the order it was
 * asked, for the Review screen. Read from the same field list as the form, so
 * a question cannot appear on one and not the other. Unanswered optional
 * questions are left out; unanswered required ones are already listed above
 * the summary with a way to fix them.
 */
function reviewSummary(draft: JoinApplicationDraft) {
  const groups: { rows: SummaryRow[]; stepId: ContentStepId; title: string }[] = [];
  const path = supportPathFromDraft(draft);
  const expectsFundraising = path === "yes" || path === "unsure";
  const summary = supportBudgetSummary(draft);

  for (const step of joinApplicationSteps) {
    const stepId = step.id;

    if (!isApplicationContentStep(stepId)) {
      continue;
    }

    const rows: SummaryRow[] = [];

    if (stepId === "about") {
      rows.push({ focusId: "applicant-firstName", label: draft.applyingAsCouple ? "Applicant" : "You", sectionId: "identity", value: identitySummary(draft.applicant) });

      if (draft.applyingAsCouple) {
        rows.push({ focusId: "spouse-firstName", label: "Spouse", sectionId: "identity", value: identitySummary(draft.spouse) });
      }
    }

    if (stepId === "support") {
      const money = (value: number) => formatMoney(value);
      const answer = (id: string) => (draft.answers[id] ?? "").trim();

      rows.push({ label: "Expect to raise monthly support", sectionId: "path", value: path ? supportPathLabels[path] : "" });
      rows.push({ focusId: "supportEmploymentContext", label: "Current work and income", sectionId: "path", value: answer("supportEmploymentContext") });

      if (expectsFundraising) {
        rows.push({
          label: "Monthly budget",
          sectionId: "budget",
          value: summary.budgetTotal > 0
            ? `Household ${money(summary.household)}\nMinistry ${money(summary.ministry)}\nTotal ${money(summary.budgetTotal)}`
            : "",
        });
        rows.push({ focusId: "supportBudget", label: "Budget context", sectionId: "budget", value: answer("supportBudget") });
        rows.push({ focusId: "supportMonthlyNeed", label: "Proposed monthly need", sectionId: "picture", value: summary.proposedNeed > 0 ? money(summary.proposedNeed) : "" });

        if (summary.proposedNeed > 0) {
          rows.push({
            label: "Funding plan",
            sectionId: "picture",
            value: `Organizational support ${money(summary.organizationalSupport)}\nFundraising target ${money(summary.target)}\nStill to raise ${money(summary.gap)}`,
          });
        }

        rows.push({ focusId: "supportRequestedGoal", label: "Requested fundraising goal", sectionId: "picture", value: summary.requestedGoal > 0 ? money(summary.requestedGoal) : "" });
        rows.push({ focusId: "supportCommittedAmount", label: "Committed monthly support", sectionId: "picture", value: summary.committed > 0 ? money(summary.committed) : "" });
        rows.push({ focusId: "supportOtherMonthlyIncome", label: "Other monthly household income", sectionId: "picture", value: summary.otherIncome > 0 ? money(summary.otherIncome) : "" });
        rows.push({ focusId: "fundraisingApproachPlan", label: "Who you expect to approach", sectionId: "readiness", value: answer("fundraisingApproachPlan") });
        rows.push({ focusId: "fundraisingReadiness", label: "Readiness to raise support", sectionId: "readiness", value: answer("fundraisingReadiness") });
      }

      rows.push({ focusId: "supportImmediateNeeds", label: "Immediate needs", sectionId: "readiness", value: answer("supportImmediateNeeds") });

      if (expectsFundraising) {
        rows.push({
          label: "Support overflow acknowledgement",
          sectionId: "readiness",
          value: draft.disclosures.excessSupportAgreement === true ? "Confirmed" : "",
        });
      }
    } else {
      for (const field of visibleFieldsForStep(stepId, draft.applyingAsCouple)) {
        const raw = (draft.answers[field.id] ?? "").trim();
        const value = field.kind === "list" ? listSummary(field, raw) : raw;

        rows.push({ fieldId: field.id, focusId: field.id, label: field.label, sectionId: field.section, value });
      }
    }

    if (stepId === "profile" && draft.photos.length > 0) {
      rows.push({
        label: "Photos",
        sectionId: "photos",
        value: draft.photos
          .map((photo) => `${photo.kind === "profile" ? "Your photo" : "Family photo"}: ${photo.fileName}`)
          .join("\n"),
      });
    }

    const answered = rows.filter((row) => row.value.trim());

    if (answered.length > 0) {
      groups.push({ rows: answered, stepId, title: step.title });
    }
  }

  return groups;
}

function ReviewSummary({
  draft,
  onJump,
}: {
  draft: JoinApplicationDraft;
  onJump: (id: JoinApplicationStepId, sectionId?: string, options?: { fieldId?: string; focusId?: string; fromReview?: boolean }) => void;
}) {
  const groups = reviewSummary(draft);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="join-summary">
      <p className="join-eyebrow join-eyebrow-quiet">Your answers</p>

      {groups.map((group) => (
        <section aria-label={group.title} className="join-summary-group" key={group.stepId}>
          <h2 className="join-summary-title">{group.title}</h2>

          <dl className="join-summary-rows">
            {group.rows.map((row) => (
              <div className="join-summary-row" key={`${row.sectionId}-${row.label}`}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
                <button
                  aria-label={`Edit ${row.label}`}
                  className="join-summary-edit"
                  onClick={() =>
                    onJump(group.stepId, row.sectionId, { fieldId: row.fieldId, focusId: row.focusId, fromReview: true })
                  }
                  type="button"
                >
                  Edit
                </button>
              </div>
            ))}
          </dl>
        </section>
      ))}
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
  missing: MissingItem[];
  onJump: (id: JoinApplicationStepId, sectionId?: string, options?: { fieldId?: string; focusId?: string; fromReview?: boolean }) => void;
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
                  onClick={() =>
                    onJump(item.stepId, item.sectionId, { fieldId: item.fieldId, focusId: item.focusId, fromReview: true })
                  }
                  type="button"
                >
                  <span>{item.label}</span>
                  <span>Fix</span>
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

      <ReviewSummary draft={draft} onJump={onJump} />

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
