"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  dosAccessRequestStepIds,
  dosAccessRequestTypeLabel,
  emptyDosAccessRequestAnswers,
  expectedUserOptions,
  firstInvalidStep,
  heardAboutOptions,
  individualRoleOptions,
  normalizeDosAccessRequestAnswers,
  organizationTypeOptions,
  primaryUseOptions,
  validateDosAccessRequestStep,
  type DosAccessRequestAnswers,
  type DosAccessRequestFieldErrors,
  type DosAccessRequestStepId,
} from "@/src/lib/dos/access-request-model";

/**
 * USA-289: /dos/setup is the DOS access request.
 *
 * Two paths live here, and only two: DOS for an individual, and DOS for an
 * organization. USA Missionaries missionary applications are a different
 * process with a different record and review; they continue at /join, and
 * this page only points there.
 *
 * Nothing here creates an account. Submitting records a request for review;
 * access is set up only when Operations approves it, and the person is emailed
 * then.
 *
 * Drafts save to this device as the visitor types. Drafts from the earlier
 * version of this page (dos-unified-setup-*-v1) are read, never deleted:
 * an unfinished organization request is carried over, and an unfinished
 * missionary application is shown and pointed to /join.
 */

const draftStorageKey = "dos-access-request-draft-v2";
const submittedStorageKey = "dos-access-request-submitted-v2";
const legacyDraftStorageKey = "dos-unified-setup-draft-v1";
const legacySubmittedStorageKey = "dos-unified-setup-submitted-v1";
const legacyImportedStorageKey = "dos-access-request-legacy-imported-v2";

type Stage = "flow" | "submitted" | "welcome";
type SaveState = "idle" | "saved" | "saving";

type StoredDraft = {
  answers: DosAccessRequestAnswers;
  stepId: DosAccessRequestStepId;
  submissionKey: string;
  updatedAt: string;
};

type StoredSubmission = {
  email: string;
  outcome: "created" | "open_request_exists" | "same_submission";
  referenceCode: string | null;
  requestType: string;
  submittedAt: string;
};

type LegacyNotice =
  | { kind: "missionary_draft"; savedAnswers: Array<{ label: string; value: string }> }
  | { kind: "missionary_submitted"; submittedAt: string | null }
  | { kind: "organization_imported"; wasOnlyLocal: boolean };

const stepMeta: Record<DosAccessRequestStepId, { label: string; title: string }> = {
  contact: { label: "About you", title: "Who should we contact?" },
  details: { label: "Where you serve", title: "Tell us where you serve." },
  path: { label: "Who it's for", title: "Who is DOS for?" },
  review: { label: "Review", title: "Review and send your request." },
  use: { label: "How you'll use it", title: "How do you plan to use DOS?" },
};

const setupCss = `
.dsr{
  --black:#070D14;--navy:#0A1622;--blue:#378ADD;--blue-hi:#6FB2F0;--blue-ink:#1E6FBF;--blue-deep:#255F97;
  --blue-tint:#EDF5FC;--ink:#0E1822;--muted:#5E6B78;--line:#E6EAEE;--field:#C9D2DA;--red:#B42318;--red-tint:#FEF3F2;
  --green:#067647;--green-tint:#ECFDF3;
  background:#fff;color:var(--ink);font-family:'Inter',system-ui,sans-serif;font-size:1rem;line-height:1.6;
  min-height:100vh;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased;
}
.dsr *{box-sizing:border-box}
.dsr a{color:inherit}
.dsr :focus-visible{outline:2px solid var(--blue);outline-offset:2px}
/* Headings take focus on each screen change for screen readers; they are not controls. */
.dsr h1[tabindex="-1"]:focus{outline:none}
.dsr .wrap{width:100%;max-width:720px;margin:0 auto;padding:0 1.25rem}
@media (min-width:768px){.dsr .wrap{padding:0 2rem}}
.dsr .eyebrow{display:inline-flex;align-items:center;gap:.7rem;font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:var(--blue-ink)}
.dsr .eyebrow::before{content:"";height:1px;width:1.75rem;background:currentColor;opacity:.55;flex:none}
.dsr .on-dark .eyebrow{color:var(--blue-hi)}
.dsr h1,.dsr h2{font-family:'Oswald',sans-serif;font-weight:700;letter-spacing:-.005em;line-height:1.08;margin:0}
.dsr p{margin:0}
/* app/globals.css gives bare p, li, dd a pale site color; this page is on white. */
.dsr p,.dsr li,.dsr dd,.dsr label,.dsr span{color:inherit}
.dsr h1,.dsr h2,.dsr h3{color:var(--ink)}
.dsr .on-dark h1{color:#fff}
.dsr .intro{color:var(--muted)}

/* Header, matching the public DOS page */
.dsr .top{background:#000;border-bottom:1px solid rgba(255,255,255,.12)}
.dsr .top .wrap{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:.9rem;padding-bottom:.9rem}
.dsr .ident{display:flex;align-items:center;gap:.7rem;min-width:0}
.dsr .ident svg{flex:none}
.dsr .ident .word{font-family:'Oswald',sans-serif;font-weight:700;color:#fff;font-size:.95rem;letter-spacing:.06em;text-transform:uppercase;line-height:1.1}
.dsr .ident .attrib{display:block;font-family:'Rajdhani',sans-serif;font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#8FA3B6}
.dsr .ident .short{display:none}
@media (max-width:479px){.dsr .ident .word{display:none}.dsr .ident .short{display:block;font-family:'Oswald',sans-serif;font-weight:700;color:#fff;font-size:1.1rem;letter-spacing:.08em;line-height:1.1}}
@media (min-width:640px){.dsr .ident .word{font-size:1.15rem}}
.dsr .signin{font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff;text-decoration:none;border:1px solid rgba(55,138,221,.55);padding:.5rem .8rem;white-space:nowrap;text-align:center}
@media (max-width:479px){.dsr .signin{font-size:11px;letter-spacing:.1em;padding:.45rem .6rem;white-space:normal;max-width:9.5rem;line-height:1.25}}
.dsr .signin:hover{background:rgba(55,138,221,.14);border-color:var(--blue)}

/* Buttons: square, Rajdhani, uppercase */
.dsr .btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:52px;padding:.85rem 1.4rem;border:1px solid transparent;border-radius:0;cursor:pointer;
  font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;white-space:nowrap;transition:background .2s,border-color .2s,color .2s}
.dsr .btn-primary{background:var(--blue-ink);border-color:var(--blue-ink);color:#fff}
.dsr .btn-primary:hover{background:var(--blue-deep);border-color:var(--blue-deep)}
.dsr .btn-primary[disabled]{opacity:.6;cursor:progress}
.dsr .btn-outline{background:#fff;border-color:var(--field);color:var(--ink)}
.dsr .btn-outline:hover{border-color:var(--blue-ink);color:var(--blue-ink)}
.dsr .btn-ghost-dark{background:transparent;border-color:rgba(111,178,240,.55);color:#fff}
.dsr .btn-ghost-dark:hover{background:rgba(55,138,221,.14);border-color:var(--blue-hi)}
.dsr .textlink{color:var(--blue-ink);font-weight:600;text-decoration:underline;text-underline-offset:3px}

/* Welcome hero */
.dsr .hero{background:var(--navy);color:#fff;padding:3rem 0 3.25rem}
.dsr .hero h1{font-size:clamp(2.2rem,6.4vw,3.25rem);margin-top:1rem;max-width:20ch;line-height:1.05}
.dsr .hero .lede{margin-top:1.1rem;color:#C3D0DC;font-size:1.08rem;max-width:36rem}
.dsr .hero .actions{margin-top:1.75rem;display:flex;flex-wrap:wrap;gap:.75rem}
.dsr .hero .micro{margin-top:1.1rem;font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#8FA3B6}
.dsr .steps3{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);margin-top:2rem}
@media (min-width:640px){.dsr .steps3{grid-template-columns:repeat(3,1fr)}}
.dsr .steps3{padding:0}
.dsr .steps3 li{list-style:none;background:#fff;padding:1.1rem 1.1rem 1.2rem}
.dsr .steps3 .n{font-family:'Oswald',sans-serif;font-size:1.6rem;color:var(--blue-ink);line-height:1}
.dsr .steps3 h3{margin:.5rem 0 .25rem;font-size:1rem;font-weight:600;color:var(--ink)}
.dsr .steps3 p{font-size:.93rem;color:var(--muted)}
.dsr .section{padding:2.25rem 0 3rem}

/* Notices */
.dsr .notice{border:1px solid var(--line);border-left:4px solid var(--blue-ink);background:var(--blue-tint);padding:1rem 1.1rem;margin-top:1.25rem;font-size:.95rem;color:var(--ink)}
.dsr .notice strong{display:block;margin-bottom:.2rem}
.dsr .notice details{margin-top:.6rem}
.dsr .notice summary{cursor:pointer;color:var(--blue-ink);font-weight:600}
.dsr .notice dl{margin:.6rem 0 0;display:grid;gap:.45rem}
.dsr .notice dt{font-size:.8rem;font-weight:600;color:var(--muted)}
.dsr .notice dd{margin:0;white-space:pre-wrap;word-break:break-word}
.dsr .notice.error{border-left-color:var(--red);background:var(--red-tint)}

/* Progress */
.dsr .progress{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);border-bottom:1px solid var(--line)}
.dsr .progress .wrap{padding-top:.8rem;padding-bottom:.8rem}
.dsr .progress-row{display:flex;align-items:baseline;justify-content:space-between;gap:1rem}
.dsr .progress-label{font-family:'Rajdhani',sans-serif;font-size:12.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--blue-ink)}
.dsr .saved{font-size:.8rem;color:var(--muted);white-space:nowrap}
.dsr .bars{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;margin-top:.55rem}
.dsr .bars span{height:4px;background:var(--line)}
.dsr .bars span.on{background:var(--blue-ink)}

/* Step */
.dsr .step{padding:2rem 0 8.5rem}
.dsr .step h1{font-size:clamp(1.85rem,6vw,2.4rem);color:var(--ink)}
.dsr .step .intro{margin-top:.6rem;max-width:38rem}
.dsr .fields{display:grid;gap:1.1rem;margin-top:1.6rem}
@media (min-width:640px){.dsr .fields.two{grid-template-columns:1fr 1fr}.dsr .fields .full{grid-column:1/-1}}
.dsr .field label,.dsr .legend{display:flex;justify-content:space-between;gap:.75rem;font-size:.92rem;font-weight:600;color:var(--ink);margin-bottom:.4rem}
.dsr .field .opt{font-weight:500;color:var(--muted);font-size:.82rem}
.dsr .req{color:var(--red);margin-left:.15rem}
.dsr .control{width:100%;min-height:50px;border:1px solid var(--field);border-radius:0;background:#fff;padding:.7rem .85rem;font:inherit;font-size:1rem;color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s}
.dsr textarea.control{min-height:120px;resize:vertical;line-height:1.5}
.dsr select.control{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);background-position:calc(100% - 20px) 50%,calc(100% - 14px) 50%;background-size:6px 6px;background-repeat:no-repeat;padding-right:2.4rem}
.dsr select.control.placeholder{color:var(--muted)}
.dsr select.control option{color:var(--ink)}
.dsr .control:focus{border-color:var(--blue-ink);box-shadow:0 0 0 3px rgba(55,138,221,.22)}
.dsr .control[aria-invalid="true"]{border-color:var(--red);box-shadow:0 0 0 3px rgba(180,35,24,.12)}
.dsr .help{margin-top:.35rem;font-size:.84rem;color:var(--muted)}
.dsr .err{margin-top:.35rem;font-size:.86rem;font-weight:600;color:var(--red)}
.dsr .choices{display:grid;gap:.75rem;margin-top:1.6rem}
@media (min-width:640px){.dsr .choices.two{grid-template-columns:1fr 1fr}}
.dsr .choice{display:flex;flex-direction:column;justify-content:flex-start;align-items:flex-start;width:100%;text-align:left;border:1px solid var(--field);background:#fff;padding:1.1rem 1.15rem 1.15rem;cursor:pointer;font:inherit;color:inherit;position:relative;transition:border-color .15s,background .15s}
.dsr .choice:hover{border-color:var(--blue-ink)}
.dsr .choice[aria-pressed="true"]{border-color:var(--blue-ink);background:var(--blue-tint);box-shadow:inset 0 0 0 1px var(--blue-ink)}
.dsr .choice .t{display:block;font-weight:700;font-size:1.05rem;padding-right:2rem}
.dsr .choice .d{display:block;margin-top:.3rem;color:var(--muted);font-size:.93rem}
.dsr .choice .dot{position:absolute;top:1.1rem;right:1.1rem;width:20px;height:20px;border:1.5px solid var(--field);border-radius:50%;background:#fff}
.dsr .choice[aria-pressed="true"] .dot{border-color:var(--blue-ink);background:radial-gradient(circle,var(--blue-ink) 0 5px,#fff 6px)}
.dsr .checks{display:grid;gap:.5rem}
@media (min-width:640px){.dsr .checks{grid-template-columns:1fr 1fr}}
.dsr .check{display:flex;align-items:center;gap:.75rem;width:100%;min-height:52px;border:1px solid var(--field);background:#fff;padding:.7rem .9rem;font:inherit;font-size:.97rem;color:var(--ink);cursor:pointer;text-align:left;line-height:1.35}
.dsr .check:hover{border-color:var(--blue-ink)}
.dsr .check .box{flex:none;width:20px;height:20px;border:1.5px solid var(--field);background:#fff;display:grid;place-items:center}
.dsr .check[aria-pressed="true"]{border-color:var(--blue-ink);background:var(--blue-tint);box-shadow:inset 0 0 0 1px var(--blue-ink)}
.dsr .check[aria-pressed="true"] .box{border-color:var(--blue-ink);background:var(--blue-ink)}
.dsr .check[aria-pressed="true"] .box::after{content:"";width:6px;height:11px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}
.dsr .aside{margin-top:1.4rem;border-top:1px solid var(--line);padding-top:1.1rem;font-size:.95rem;color:var(--muted)}
.dsr .review{margin-top:1.6rem;border:1px solid var(--line)}
.dsr .review section{padding:1rem 1.1rem;border-bottom:1px solid var(--line)}
.dsr .review section:last-child{border-bottom:0}
.dsr .review header{display:flex;justify-content:space-between;align-items:center;gap:1rem}
.dsr .review h2{font-family:'Rajdhani',sans-serif;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--blue-ink)}
.dsr .review .edit{border:1px solid var(--field);background:#fff;color:var(--blue-ink);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;padding:.35rem .75rem;min-height:36px}
.dsr .review .edit:hover{border-color:var(--blue-ink)}
.dsr .review dl{margin:.5rem 0 0;display:grid;gap:.35rem}
@media (min-width:640px){.dsr .review dl{grid-template-columns:170px 1fr;column-gap:1rem}}
.dsr .review dt{font-size:.86rem;color:var(--muted)}
.dsr .review dd{margin:0 0 .25rem;word-break:break-word;white-space:pre-wrap}
.dsr .ack{color:var(--ink);display:flex;gap:.75rem;align-items:flex-start;margin-top:1.25rem;border:1px solid var(--field);padding:1rem;cursor:pointer}
.dsr .ack input{width:22px;height:22px;margin-top:.1rem;accent-color:var(--blue-ink);flex:none}
.dsr .ack[data-invalid="true"]{border-color:var(--red)}
.dsr .next-steps{margin-top:1.25rem;background:var(--blue-tint);padding:1rem 1.1rem;font-size:.95rem}
.dsr .next-steps ol{margin:.5rem 0 0;padding-left:1.1rem}
.dsr .next-steps strong{display:block;font-weight:700}
.dsr .next-steps li{margin:.2rem 0}

/* Action bar */
.dsr .bar{position:fixed;left:0;right:0;bottom:0;z-index:30;background:#fff;border-top:1px solid var(--line);padding:.75rem 0 calc(env(safe-area-inset-bottom) + .75rem)}
.dsr .bar .wrap{display:grid;grid-template-columns:1fr 1.6fr;gap:.75rem}
@media (min-width:640px){.dsr .bar .wrap{display:flex;justify-content:space-between}.dsr .bar .btn{min-width:180px}}
.dsr .aside{line-height:1.6}

/* Confirmation */
.dsr .done{padding:2.5rem 0 4rem}
.dsr .done h1{font-size:clamp(2rem,6.5vw,2.8rem);margin-top:.75rem}
.dsr .status{display:inline-flex;align-items:center;gap:.5rem;margin-top:1rem;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--blue-ink);background:var(--blue-tint);padding:.4rem .7rem}
.dsr .status::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--blue-ink)}
.dsr .ref{margin-top:1.25rem;border:1px solid var(--line);padding:1rem 1.1rem;display:grid;gap:.3rem}
.dsr .ref .code{font-family:'Oswald',sans-serif;font-size:1.6rem;letter-spacing:.06em}
.dsr .foot{margin-top:auto;background:var(--navy);border-top:1px solid rgba(255,255,255,.12);padding:1.25rem 0}
.dsr .foot .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem 1.5rem;font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#8FA3B6}
.dsr .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.dsr .hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
`;

function DosMark({ size = 28 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 52 52" width={size}>
      <circle cx="26" cy="26" fill="#378ADD" r="4.5" />
      <circle cx="26" cy="26" fill="none" r="11" stroke="#FFFFFF" strokeWidth="3.5" />
      <path d="M40.7 36.3 A18 18 0 1 1 40.7 15.7" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="3.5" />
    </svg>
  );
}

function newSubmissionKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);

    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private windows; nothing to clean up then.
  }
}

function isStepId(value: unknown): value is DosAccessRequestStepId {
  return typeof value === "string" && (dosAccessRequestStepIds as readonly string[]).includes(value);
}

function hasAnswers(answers: DosAccessRequestAnswers) {
  return Boolean(
    answers.requestType
      || answers.firstName
      || answers.lastName
      || answers.email
      || answers.organizationName
      || answers.primaryUses.length,
  );
}

/* ------------------------------------------------------------ legacy drafts */

type LegacyDraft = Record<string, unknown> & { setupPath?: string };

function legacyText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function legacyOrganizationType(value: string) {
  const map: Record<string, string> = {
    "Church / ministry": "Church",
    "Mission organization": "Mission organization",
    "Nonprofit": "Ministry or nonprofit",
    "Other": "Other",
    "Small group network": "Small group network",
  };

  return map[value] ?? "";
}

function answersFromLegacy(legacy: LegacyDraft, includeOrganization: boolean): DosAccessRequestAnswers {
  const email = legacyText(legacy.contactEmail) || legacyText(legacy.accountEmail) || legacyText(legacy.organizationContactEmail);
  const contactPerson = legacyText(legacy.organizationContactPerson);
  const [contactFirst, ...contactRest] = contactPerson.split(/\s+/);

  return normalizeDosAccessRequestAnswers({
    ...emptyDosAccessRequestAnswers,
    city: legacyText(legacy.city),
    email,
    firstName: legacyText(legacy.firstName) || (includeOrganization ? contactFirst ?? "" : ""),
    goals: includeOrganization ? legacyText(legacy.organizationMessage) : "",
    lastName: legacyText(legacy.lastName) || (includeOrganization ? contactRest.join(" ") : ""),
    organizationName: includeOrganization ? legacyText(legacy.organizationName) : "",
    organizationType: includeOrganization ? legacyOrganizationType(legacyText(legacy.organizationType)) : "",
    phone: legacyText(legacy.cellPhone),
    region: legacyText(legacy.state),
    requestType: includeOrganization ? "organization" : "",
  });
}

function legacyMissionarySavedAnswers(legacy: LegacyDraft) {
  const firstReference = Array.isArray(legacy.references) ? legacy.references[0] as Record<string, unknown> | undefined : undefined;
  const firstPartner = Array.isArray(legacy.prayerPartners) ? legacy.prayerPartners[0] as Record<string, unknown> | undefined : undefined;
  const prayerRequests = Array.isArray(legacy.prayerRequests)
    ? (legacy.prayerRequests as Array<Record<string, unknown>>).map((request) => legacyText(request?.text)).filter(Boolean).join("\n")
    : "";
  const entries: Array<[string, string]> = [
    ["Name", [legacyText(legacy.firstName), legacyText(legacy.lastName)].filter(Boolean).join(" ")],
    ["Email", legacyText(legacy.contactEmail) || legacyText(legacy.accountEmail)],
    ["Phone", legacyText(legacy.cellPhone)],
    ["City / State", [legacyText(legacy.city), legacyText(legacy.state)].filter(Boolean).join(", ")],
    ["How you came to know Jesus", legacyText(legacy.storyJesus)],
    ["Your testimony", legacyText(legacy.storyTestimony)],
    ["What you feel called toward", legacyText(legacy.storyCallingToward)],
    ["Why USA Missionaries", legacyText(legacy.storyWhyUsam)],
    ["Ministry impact", legacyText(legacy.storyImpact)],
    ["Calling", legacyText(legacy.callingFocus)],
    ["Prayer requests", prayerRequests],
    ["Prayer partner", firstPartner ? [legacyText(firstPartner.firstName), legacyText(firstPartner.lastName), legacyText(firstPartner.email)].filter(Boolean).join(" · ") : ""],
    ["Reference", firstReference ? [legacyText(firstReference.firstName), legacyText(firstReference.lastName), legacyText(firstReference.email)].filter(Boolean).join(" · ") : ""],
  ];

  return entries.filter(([, value]) => value).map(([label, value]) => ({ label, value }));
}

function hasMissionaryContent(legacy: LegacyDraft) {
  return legacyMissionarySavedAnswers(legacy).some((entry) => !["Name", "Email", "Phone", "City / State"].includes(entry.label));
}

/* --------------------------------------------------------------- field bits */

function TextField({
  autoComplete,
  error,
  help,
  id,
  inputMode,
  label,
  multiline = false,
  onChange,
  optional = false,
  type = "text",
  value,
  wide = false,
}: {
  autoComplete?: string;
  error?: string;
  help?: string;
  id: keyof DosAccessRequestAnswers;
  inputMode?: "email" | "tel" | "text" | "url";
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  optional?: boolean;
  type?: "email" | "tel" | "text" | "url";
  value: string;
  wide?: boolean;
}) {
  const fieldId = `dsr-${id}`;
  const describedBy = error ? `${fieldId}-error` : help ? `${fieldId}-help` : undefined;

  return (
    <div className={`field${wide ? " full" : ""}`}>
      <label htmlFor={fieldId}>
        <span>
          {label}
          {optional ? null : <span aria-hidden="true" className="req">*</span>}
        </span>
        {optional ? <span className="opt">Optional</span> : null}
      </label>
      {multiline ? (
        <textarea
          aria-describedby={describedBy}
          aria-invalid={error ? "true" : undefined}
          className="control"
          id={fieldId}
          maxLength={1500}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      ) : (
        <input
          aria-describedby={describedBy}
          aria-invalid={error ? "true" : undefined}
          aria-required={optional ? undefined : "true"}
          autoComplete={autoComplete}
          className="control"
          id={fieldId}
          inputMode={inputMode}
          maxLength={200}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          value={value}
        />
      )}
      {error ? <p className="err" id={`${fieldId}-error`}>{error}</p> : help ? <p className="help" id={`${fieldId}-help`}>{help}</p> : null}
    </div>
  );
}

function SelectField({
  error,
  id,
  label,
  onChange,
  optional = false,
  options,
  value,
  wide = false,
}: {
  error?: string;
  id: keyof DosAccessRequestAnswers;
  label: string;
  onChange: (value: string) => void;
  optional?: boolean;
  options: readonly string[];
  value: string;
  wide?: boolean;
}) {
  const fieldId = `dsr-${id}`;

  return (
    <div className={`field${wide ? " full" : ""}`}>
      <label htmlFor={fieldId}>
        <span>
          {label}
          {optional ? null : <span aria-hidden="true" className="req">*</span>}
        </span>
        {optional ? <span className="opt">Optional</span> : null}
      </label>
      <select
        aria-describedby={error ? `${fieldId}-error` : undefined}
        aria-invalid={error ? "true" : undefined}
        className={`control${value ? "" : " placeholder"}`}
        id={fieldId}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Choose one</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {error ? <p className="err" id={`${fieldId}-error`}>{error}</p> : null}
    </div>
  );
}

function ReviewBlock({ children, onEdit, title }: { children: ReactNode; onEdit: () => void; title: string }) {
  return (
    <section>
      <header>
        <h2>{title}</h2>
        <button className="edit" onClick={onEdit} type="button">Edit<span className="sr-only"> {title}</span></button>
      </header>
      <dl>{children}</dl>
    </section>
  );
}

/** Optional answers left blank are omitted, so the review lists only what will be sent. */
function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }

  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/* --------------------------------------------------------------- component */

export function DosOnboardingClient({ supportEmail }: { supportEmail: string }) {
  const [answers, setAnswers] = useState<DosAccessRequestAnswers>(emptyDosAccessRequestAnswers);
  const [stepId, setStepId] = useState<DosAccessRequestStepId>("path");
  const [stage, setStage] = useState<Stage>("welcome");
  const [submissionKey, setSubmissionKey] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [errors, setErrors] = useState<DosAccessRequestFieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<StoredSubmission | null>(null);
  const [legacyNotices, setLegacyNotices] = useState<LegacyNotice[]>([]);
  const [honeypot, setHoneypot] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submittingRef = useRef(false);

  const stepIndex = dosAccessRequestStepIds.indexOf(stepId);
  const meta = stepMeta[stepId];

  /* Load saved state once. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restart = params.has("restart") || params.has("fresh");
    const requestedPath = params.get("path");

    if (restart) {
      removeKey(draftStorageKey);
      removeKey(submittedStorageKey);
      window.history.replaceState(null, "", "/dos/setup");
    }

    const notices: LegacyNotice[] = [];
    const storedSubmission = restart ? null : readJson<StoredSubmission>(submittedStorageKey);
    const storedDraft = restart ? null : readJson<StoredDraft>(draftStorageKey);
    let loadedAnswers = storedDraft ? normalizeDosAccessRequestAnswers(storedDraft.answers) : emptyDosAccessRequestAnswers;
    let loadedKey = storedDraft && typeof storedDraft.submissionKey === "string" ? storedDraft.submissionKey : "";
    let loadedStep: DosAccessRequestStepId = storedDraft && isStepId(storedDraft.stepId) ? storedDraft.stepId : "path";

    // Earlier version of this page. Read only; never removed.
    const legacyDraft = readJson<LegacyDraft>(legacyDraftStorageKey);
    const legacySubmitted = readJson<{ application?: LegacyDraft; persistence?: { table?: string }; submittedAt?: string }>(legacySubmittedStorageKey);
    const alreadyImported = readJson<boolean>(legacyImportedStorageKey) === true;
    const legacyApplication = legacySubmitted?.application ?? legacyDraft;
    const legacyPath = legacyApplication?.setupPath === "organization" ? "organization" : legacyApplication ? "usam" : null;

    if (legacySubmitted && legacyPath === "usam" && legacySubmitted.persistence?.table === "usam_missionary_applications") {
      notices.push({ kind: "missionary_submitted", submittedAt: legacySubmitted.submittedAt ?? null });
    } else if (legacyApplication && legacyPath === "organization") {
      // Carried over until the visitor saves a draft of their own here, or
      // chooses Start over (which sets the imported flag).
      if (!storedDraft && !alreadyImported) {
        loadedAnswers = answersFromLegacy(legacyApplication, true);
        loadedStep = firstInvalidStep(loadedAnswers) ?? "review";
        notices.push({ kind: "organization_imported", wasOnlyLocal: Boolean(legacySubmitted) });
      }
    } else if (legacyDraft && legacyPath === "usam" && hasMissionaryContent(legacyDraft)) {
      notices.push({ kind: "missionary_draft", savedAnswers: legacyMissionarySavedAnswers(legacyDraft) });

      if (!storedDraft && !alreadyImported) {
        // Carry over contact details only; the missionary answers stay in the legacy draft.
        loadedAnswers = { ...answersFromLegacy(legacyDraft, false) };
      }
    }

    if (!loadedKey) {
      loadedKey = newSubmissionKey();
    }

    if (!storedDraft && (requestedPath === "organization" || requestedPath === "individual")) {
      loadedAnswers = { ...loadedAnswers, requestType: requestedPath };
    }

    const storageWorks = writeJson(`${draftStorageKey}-probe`, true);
    removeKey(`${draftStorageKey}-probe`);

    setStorageAvailable(storageWorks);
    setAnswers(loadedAnswers);
    setStepId(loadedStep);
    setSubmissionKey(loadedKey);
    setHasSavedDraft(Boolean(storedDraft && hasAnswers(loadedAnswers)) || (hasAnswers(loadedAnswers) && notices.some((notice) => notice.kind === "organization_imported")));
    setLegacyNotices(notices);

    if (storedSubmission) {
      setSubmission(storedSubmission);
      setStage("submitted");
    }

    setHasLoaded(true);
  }, []);

  /* Autosave. */
  useEffect(() => {
    if (!hasLoaded || stage !== "flow") {
      return;
    }

    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      const ok = writeJson(draftStorageKey, {
        answers,
        stepId,
        submissionKey,
        updatedAt: new Date().toISOString(),
      } satisfies StoredDraft);

      setStorageAvailable(ok);
      setHasSavedDraft(ok);
      setSaveState(ok ? "saved" : "idle");
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [answers, hasLoaded, stage, stepId, submissionKey]);

  /* Move focus to the step heading on every step change, for keyboard and screen reader users. */
  useEffect(() => {
    if (stage === "flow" || stage === "submitted") {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }, [stage, stepId]);

  const update = useCallback((patch: Partial<DosAccessRequestAnswers>) => {
    setAnswers((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };

      (Object.keys(patch) as Array<keyof DosAccessRequestAnswers>).forEach((key) => {
        delete next[key];
      });

      return next;
    });
  }, []);

  function focusFirstError(fieldErrors: DosAccessRequestFieldErrors) {
    const firstKey = Object.keys(fieldErrors)[0];

    if (!firstKey) {
      return;
    }

    window.requestAnimationFrame(() => {
      const element = document.getElementById(`dsr-${firstKey}`)
        ?? document.querySelector<HTMLElement>(`[data-field="${firstKey}"] button, [data-field="${firstKey}"] input`);

      element?.focus();
    });
  }

  function goTo(nextStep: DosAccessRequestStepId) {
    setErrors({});
    setSubmitError("");
    setStepId(nextStep);
    setStage("flow");
  }

  function next() {
    const stepErrors = validateDosAccessRequestStep(stepId, answers);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstError(stepErrors);
      return;
    }

    const nextStep = dosAccessRequestStepIds[stepIndex + 1];

    if (nextStep) {
      goTo(nextStep);
    }
  }

  function back() {
    setErrors({});
    setSubmitError("");

    if (stepIndex <= 0) {
      setStage("welcome");
      return;
    }

    setStepId(dosAccessRequestStepIds[stepIndex - 1]);
  }

  async function submit() {
    if (submittingRef.current) {
      return;
    }

    const invalidStep = firstInvalidStep(answers);

    if (invalidStep && invalidStep !== "review") {
      goTo(invalidStep);
      const stepErrors = validateDosAccessRequestStep(invalidStep, answers);
      setErrors(stepErrors);
      focusFirstError(stepErrors);
      return;
    }

    const reviewErrors = validateDosAccessRequestStep("review", answers);

    if (Object.keys(reviewErrors).length > 0) {
      setErrors(reviewErrors);
      focusFirstError(reviewErrors);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/dos/access-requests", {
        body: JSON.stringify({
          answers,
          sourcePage: "/dos/setup",
          submissionKey,
          website: honeypot,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as {
        error?: string;
        fieldErrors?: DosAccessRequestFieldErrors;
        outcome?: StoredSubmission["outcome"];
        referenceCode?: string | null;
        submittedAt?: string;
      };

      if (!response.ok) {
        if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
          const fieldErrors = result.fieldErrors;
          const stepWithError = dosAccessRequestStepIds.find((candidate) => (
            Object.keys(validateDosAccessRequestStep(candidate, answers)).some((key) => key in fieldErrors)
          )) ?? "review";
          goTo(stepWithError);
          setErrors(fieldErrors);
        }

        setSubmitError(result.error ?? "We could not send your request. Your answers are saved; please try again.");
        return;
      }

      const stored: StoredSubmission = {
        email: answers.email,
        outcome: result.outcome ?? "created",
        referenceCode: result.referenceCode ?? null,
        requestType: answers.requestType,
        submittedAt: result.submittedAt ?? new Date().toISOString(),
      };

      writeJson(submittedStorageKey, stored);
      removeKey(draftStorageKey);
      setSubmission(stored);
      setHasSavedDraft(false);
      setStage("submitted");
    } catch {
      setSubmitError("We could not reach the server. Your answers are saved on this device; check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function startNewRequest() {
    // Starting over also stops re-importing the earlier page's draft. The
    // legacy draft itself is left on the device.
    writeJson(legacyImportedStorageKey, true);
    removeKey(submittedStorageKey);
    removeKey(draftStorageKey);
    setSubmission(null);
    setAnswers(emptyDosAccessRequestAnswers);
    setSubmissionKey(newSubmissionKey());
    setStepId("path");
    setStage("welcome");
    setHasSavedDraft(false);
  }

  function onFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (stepId === "review") {
      void submit();
    } else {
      next();
    }
  }

  const savedLabel = !storageAvailable
    ? "Not saving on this device"
    : saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved on this device"
        : "";

  const legacyNoticeElements = useMemo(() => legacyNotices.map((notice) => {
    if (notice.kind === "missionary_submitted") {
      return (
        <div className="notice" key="missionary_submitted" role="note">
          <strong>Your USA Missionaries application was already sent.</strong>
          {notice.submittedAt ? `It was submitted from this device on ${formatDate(notice.submittedAt)} and is with our team. ` : "It is with our team. "}
          You do not need to send it again here. This page is only for DOS access.
        </div>
      );
    }

    if (notice.kind === "missionary_draft") {
      return (
        <div className="notice" key="missionary_draft" role="note">
          <strong>You have an unfinished USA Missionaries application on this device.</strong>
          Missionary applications now continue in the USA Missionaries application, using the link your invitation gave you. Your saved answers are still on this device; nothing was deleted.
          {" "}<Link className="textlink" href="/join">Go to the USA Missionaries application</Link>
          <details>
            <summary>Show my saved answers</summary>
            <dl>
              {notice.savedAnswers.map((entry) => (
                <div key={entry.label}>
                  <dt>{entry.label}</dt>
                  <dd>{entry.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      );
    }

    return (
      <div className="notice" key="organization_imported" role="note">
        <strong>We brought over the organization request you started.</strong>
        {notice.wasOnlyLocal
          ? "An earlier version of this page saved it only on this device, so it never reached our team. Review it and send it to be sure it is received."
          : "Pick up where you left off, then send it for review."}
      </div>
    );
  }), [legacyNotices]);

  function renderStep() {
    if (stepId === "path") {
      return (
        <>
          <p className="intro">Choose the option that fits. You can change it before you send.</p>
          <div className="choices two" data-field="requestType" role="group" aria-label="Who is DOS for?">
            {([
              {
                description: "I want DOS for my own discipleship relationships, prayer, meetings, and follow-up.",
                title: "For me",
                value: "individual",
              },
              {
                description: "I lead a church, ministry, or team and want DOS for the people we serve together.",
                title: "For my organization",
                value: "organization",
              },
            ] as const).map((option) => (
              <button
                aria-pressed={answers.requestType === option.value}
                className="choice"
                key={option.value}
                onClick={() => update({ requestType: option.value })}
                type="button"
              >
                <span aria-hidden="true" className="dot" />
                <span className="t">{option.title}</span>
                <span className="d">{option.description}</span>
              </button>
            ))}
          </div>
          {errors.requestType ? <p className="err" role="alert">{errors.requestType}</p> : null}
          <p className="aside">
            Applying to serve as a USA Missionaries missionary? That is a separate, invitation-only application with its own review. Use the link in your invitation instead of this form.
          </p>
        </>
      );
    }

    if (stepId === "contact") {
      return (
        <>
          <p className="intro">We use this to review your request and to send your access instructions. We will not share it.</p>
          <div className="fields two">
            <TextField autoComplete="given-name" error={errors.firstName} id="firstName" label="First name" onChange={(value) => update({ firstName: value })} value={answers.firstName} />
            <TextField autoComplete="family-name" error={errors.lastName} id="lastName" label="Last name" onChange={(value) => update({ lastName: value })} value={answers.lastName} />
            <TextField autoComplete="email" error={errors.email} help="Your DOS sign-in will use this address." id="email" inputMode="email" label="Email" onChange={(value) => update({ email: value })} type="email" value={answers.email} wide />
            <TextField autoComplete="tel" error={errors.phone} id="phone" inputMode="tel" label="Mobile phone" onChange={(value) => update({ phone: value })} optional type="tel" value={answers.phone} wide />
            <TextField autoComplete="address-level2" id="city" label="City" onChange={(value) => update({ city: value })} optional value={answers.city} />
            <TextField autoComplete="address-level1" id="region" label="State or region" onChange={(value) => update({ region: value })} optional value={answers.region} />
          </div>
        </>
      );
    }

    if (stepId === "details") {
      if (answers.requestType === "organization") {
        return (
          <>
            <p className="intro">This helps us set up the right workspace for your organization.</p>
            <div className="fields two">
              <TextField autoComplete="organization" error={errors.organizationName} id="organizationName" label="Organization name" onChange={(value) => update({ organizationName: value })} value={answers.organizationName} wide />
              <SelectField error={errors.organizationType} id="organizationType" label="Kind of organization" onChange={(value) => update({ organizationType: value })} options={organizationTypeOptions} value={answers.organizationType} />
              <TextField autoComplete="organization-title" error={errors.organizationRole} id="organizationRole" label="Your role" onChange={(value) => update({ organizationRole: value })} value={answers.organizationRole} />
              <SelectField error={errors.expectedUsers} id="expectedUsers" label="About how many people would use DOS?" onChange={(value) => update({ expectedUsers: value })} options={expectedUserOptions} value={answers.expectedUsers} />
              <TextField autoComplete="url" id="organizationWebsite" inputMode="url" label="Website" onChange={(value) => update({ organizationWebsite: value })} optional type="url" value={answers.organizationWebsite} />
            </div>
          </>
        );
      }

      return (
        <>
          <p className="intro">A little context helps us review your request.</p>
          <div className="fields">
            <SelectField error={errors.individualRole} id="individualRole" label="Which best describes you?" onChange={(value) => update({ individualRole: value })} options={individualRoleOptions} value={answers.individualRole} />
            <TextField id="churchOrCommunity" label="Church or community you serve with" onChange={(value) => update({ churchOrCommunity: value })} optional value={answers.churchOrCommunity} />
          </div>
        </>
      );
    }

    if (stepId === "use") {
      return (
        <>
          <p className="intro">Choose everything that applies.</p>
          <div className="fields">
            <div data-field="primaryUses">
              <p className="legend" id="dsr-primaryUses-legend">
                <span>I want DOS to help with<span aria-hidden="true" className="req">*</span></span>
              </p>
              <div aria-labelledby="dsr-primaryUses-legend" className="checks" role="group">
                {primaryUseOptions.map((option) => {
                  const selected = answers.primaryUses.includes(option);

                  return (
                    <button
                      aria-pressed={selected}
                      className="check"
                      key={option}
                      onClick={() => update({
                        primaryUses: selected
                          ? answers.primaryUses.filter((value) => value !== option)
                          : [...answers.primaryUses, option],
                      })}
                      type="button"
                    >
                      <span aria-hidden="true" className="box" />
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
              {errors.primaryUses ? <p className="err" role="alert">{errors.primaryUses}</p> : null}
            </div>
            <TextField help="For example, who you are discipling or what you hope DOS changes." id="goals" label="Anything else we should know?" multiline onChange={(value) => update({ goals: value })} optional value={answers.goals} />
            <div className="fields two" style={{ marginTop: 0 }}>
              <SelectField id="heardAbout" label="How did you hear about DOS?" onChange={(value) => update({ heardAbout: value })} optional options={heardAboutOptions} value={answers.heardAbout} />
              <TextField id="invitedBy" label="Who invited you?" onChange={(value) => update({ invitedBy: value })} optional value={answers.invitedBy} />
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <p className="intro">Check your answers. You can edit any section before you send.</p>
        <div className="review">
          <ReviewBlock onEdit={() => goTo("path")} title="Who it's for">
            <ReviewRow label="Request" value={answers.requestType === "organization" ? "DOS for my organization" : "DOS for me"} />
          </ReviewBlock>
          <ReviewBlock onEdit={() => goTo("contact")} title="About you">
            <ReviewRow label="Name" value={`${answers.firstName} ${answers.lastName}`.trim()} />
            <ReviewRow label="Email" value={answers.email} />
            <ReviewRow label="Mobile phone" value={answers.phone} />
            <ReviewRow label="Location" value={[answers.city, answers.region].filter(Boolean).join(", ")} />
          </ReviewBlock>
          <ReviewBlock onEdit={() => goTo("details")} title={answers.requestType === "organization" ? "Organization" : "Your context"}>
            {answers.requestType === "organization" ? (
              <>
                <ReviewRow label="Organization" value={answers.organizationName} />
                <ReviewRow label="Kind" value={answers.organizationType} />
                <ReviewRow label="Your role" value={answers.organizationRole} />
                <ReviewRow label="People using DOS" value={answers.expectedUsers} />
                <ReviewRow label="Website" value={answers.organizationWebsite} />
              </>
            ) : (
              <>
                <ReviewRow label="Describes you" value={answers.individualRole} />
                <ReviewRow label="Church or community" value={answers.churchOrCommunity} />
              </>
            )}
          </ReviewBlock>
          <ReviewBlock onEdit={() => goTo("use")} title="How you'll use DOS">
            <ReviewRow label="Help with" value={answers.primaryUses.join("\n")} />
            <ReviewRow label="Anything else" value={answers.goals} />
            <ReviewRow label="Heard about DOS" value={answers.heardAbout} />
            <ReviewRow label="Invited by" value={answers.invitedBy} />
          </ReviewBlock>
        </div>
        <div className="next-steps">
          <strong>What happens after you send</strong>
          <ol>
            <li>Your request goes to the DOS team for review.</li>
            <li>If it is approved, we set up your access and email {answers.email || "you"} with sign-in steps and how to add DOS to your phone.</li>
            <li>No account is created until then.</li>
          </ol>
        </div>
        <label className="ack" data-field="acknowledgement" data-invalid={errors.acknowledgement ? "true" : undefined}>
          <input
            aria-describedby={errors.acknowledgement ? "dsr-acknowledgement-error" : undefined}
            aria-invalid={errors.acknowledgement ? "true" : undefined}
            checked={answers.acknowledgement}
            id="dsr-acknowledgement"
            onChange={(event) => update({ acknowledgement: event.target.checked })}
            type="checkbox"
          />
          <span>I understand this is a request. DOS access starts only after it is reviewed and approved.</span>
        </label>
        {errors.acknowledgement ? <p className="err" id="dsr-acknowledgement-error">{errors.acknowledgement}</p> : null}
      </>
    );
  }

  return (
    <div className="dsr dos-setup-route" data-dos-setup="access-request">
      <style
        dangerouslySetInnerHTML={{
          __html: `${setupCss}
            body:has(.dos-setup-route){background:#fff !important;color:#0E1822}
            body:has(.dos-setup-route) > footer{display:none !important}`,
        }}
      />
      <header className="top">
        <div className="wrap">
          <div className="ident">
            <DosMark />
            <span>
              <span className="word">Discipleship Operating System</span>
              <span className="short">DOS</span>
              <span className="attrib">An initiative of USA Missionaries</span>
            </span>
          </div>
          {stage === "welcome" ? (
            <Link className="signin" href="/login?next=%2Fdos">Already have DOS? Sign in</Link>
          ) : null}
        </div>
      </header>

      {stage === "welcome" ? (
        <main>
          <section className="hero on-dark">
            <div className="wrap">
              <p className="eyebrow">Request DOS access</p>
              <h1>Start with the people God has placed in front of you.</h1>
              <p className="lede">Tell us who DOS is for and how you plan to use it. It takes about three minutes, and you do not need an account to start.</p>
              <div className="actions">
                {hasSavedDraft ? (
                  <>
                    <button className="btn btn-primary" onClick={() => setStage("flow")} type="button">Continue my request</button>
                    <button className="btn btn-ghost-dark" onClick={() => startNewRequest()} type="button">Start over</button>
                  </>
                ) : (
                  <button className="btn btn-primary" disabled={!hasLoaded} onClick={() => goTo(answers.requestType ? "contact" : "path")} type="button">Start my request</button>
                )}
              </div>
              <p className="micro">Reviewed by our team · No payment · Your progress saves on this device</p>
            </div>
          </section>
          <section className="section">
            <div className="wrap">
              <p className="eyebrow">How it works</p>
              <ol className="steps3">
                <li>
                  <span className="n">1</span>
                  <h3>Send your request</h3>
                  <p>A few questions about you and how you&apos;ll use DOS.</p>
                </li>
                <li>
                  <span className="n">2</span>
                  <h3>We review it</h3>
                  <p>A person on the DOS team reads every request. Nothing is set up automatically.</p>
                </li>
                <li>
                  <span className="n">3</span>
                  <h3>Get your access email</h3>
                  <p>If approved, we email sign-in steps and how to add DOS to your phone&apos;s home screen.</p>
                </li>
              </ol>
              {legacyNoticeElements}
              <p className="aside">
                Applying to serve as a USA Missionaries missionary? That is a separate, invitation-only application. Use the link in your invitation instead of this form.
              </p>
            </div>
          </section>
        </main>
      ) : null}

      {stage === "flow" ? (
        <form noValidate onSubmit={onFormSubmit}>
          <div className="progress">
            <div className="wrap">
              <div className="progress-row">
                <p className="progress-label">Step {stepIndex + 1} of {dosAccessRequestStepIds.length} · {meta.label}</p>
                <p aria-live="polite" className="saved">{savedLabel}</p>
              </div>
              <div aria-hidden="true" className="bars">
                {dosAccessRequestStepIds.map((id, index) => <span className={index <= stepIndex ? "on" : ""} key={id} />)}
              </div>
            </div>
          </div>
          <main className="step">
            <div className="wrap">
              <h1 ref={headingRef} tabIndex={-1}>{meta.title}</h1>
              {renderStep()}
              <div aria-hidden="true" className="hp">
                <label htmlFor="dsr-website">Website</label>
                <input autoComplete="off" id="dsr-website" onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} value={honeypot} />
              </div>
              {submitError ? <div className="notice error" role="alert">{submitError}</div> : null}
            </div>
          </main>
          <div className="bar">
            <div className="wrap">
              <button className="btn btn-outline" onClick={back} type="button">Back</button>
              <button className="btn btn-primary" disabled={isSubmitting} type="submit">
                {stepId === "review" ? (isSubmitting ? "Sending…" : "Send request") : "Continue"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {stage === "submitted" && submission ? (
        <main className="done">
          <div className="wrap">
            <p className="eyebrow">Request received</p>
            <h1 ref={headingRef} tabIndex={-1}>
              {submission.outcome === "open_request_exists" ? "You already have a request waiting." : "Thank you. Your request is in."}
            </h1>
            <p className="status">Awaiting review</p>
            {submission.outcome === "open_request_exists" ? (
              <p className="intro" style={{ marginTop: "1rem" }}>
                A DOS access request for {submission.email} is already with our team, so we did not add another. You do not need to do anything else.
              </p>
            ) : (
              <p className="intro" style={{ marginTop: "1rem" }}>
                Your {dosAccessRequestTypeLabel(submission.requestType as DosAccessRequestAnswers["requestType"]).toLowerCase()} request for DOS access has been received and is waiting for review. No account has been created yet.
              </p>
            )}
            {submission.referenceCode ? (
              <div className="ref">
                <span className="eyebrow">Reference</span>
                <span className="code">{submission.referenceCode}</span>
                <span className="help">Submitted {formatDate(submission.submittedAt)}. Keep this if you contact us.</span>
              </div>
            ) : null}
            <div className="next-steps">
              <strong>What happens next</strong>
              <ol>
                <li>A person on the DOS team reviews your request.</li>
                <li>If it is approved, we set up your access and email {submission.email} with sign-in steps and how to add DOS to your iPhone or Android home screen.</li>
                <li>If we need anything else, we will contact you.</li>
              </ol>
            </div>
            <p className="aside">
              Questions, or need to change something? Email <a className="textlink" href={`mailto:${supportEmail}`}>{supportEmail}</a> and include your reference.
            </p>
          </div>
        </main>
      ) : null}

      {stage === "flow" ? null : (
        <footer className="foot">
          <div className="wrap">
            <span>Discipleship Operating System</span>
            <span>An initiative of USA Missionaries</span>
          </div>
        </footer>
      )}
    </div>
  );
}
