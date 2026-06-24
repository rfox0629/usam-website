"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, FileText, Image as ImageIcon, Layers, Upload, Users, Workflow, X } from "lucide-react";
import { adminFont } from "../../_components/AdminUI";
import type {
  OrganizationApplicationPhotoSummary,
  OrganizationApplicationSummary,
  OrganizationApprovedProfileSummary,
  OrganizationDetail,
  OrganizationWorkspaceSummary,
} from "@/src/lib/admin/organization-shared";

type HubTab = "applications" | "approved-profiles" | "members" | "overview" | "settings" | "workspaces";
type ApplicationWorkflowAction = "approve" | "decline" | "request_more_info" | "review";
type ReviewSectionId =
  | "applicant-info"
  | "calling-focus"
  | "household"
  | "internal-notes"
  | "application-status"
  | "photo-builder"
  | "prayer-needs"
  | "references"
  | "support-budget"
  | "testimony-story";
type SectionReviewValue = "Missing" | "Needs Info" | "Not Public" | "OK";
type ApplicationSectionRow = {
  content: ReactNode;
  id: ReviewSectionId;
  review: SectionReviewValue;
  summary: string;
  title: string;
  visibility: string;
};

const hubTabs: Array<{ label: string; value: HubTab }> = [
  { label: "Overview", value: "overview" },
  { label: "Applications", value: "applications" },
  { label: "Approved Profiles", value: "approved-profiles" },
  { label: "Members", value: "members" },
  { label: "Workspaces", value: "workspaces" },
  { label: "Settings", value: "settings" },
];

const applicationSections: Array<{ id: ReviewSectionId; title: string }> = [
  { id: "applicant-info", title: "Applicant Info" },
  { id: "household", title: "Household" },
  { id: "calling-focus", title: "Calling / Focus" },
  { id: "testimony-story", title: "Testimony / Story" },
  { id: "prayer-needs", title: "Prayer Partners / Requests" },
  { id: "support-budget", title: "Support / Budget" },
  { id: "references", title: "References" },
  { id: "application-status", title: "Application Status" },
  { id: "internal-notes", title: "Internal Notes" },
];

const needsInfoSectionOptions: Array<{ id: ReviewSectionId; title: string }> = [
  { id: "photo-builder", title: "Photo Builder" },
  ...applicationSections,
];
const usamOrganizationWorkspacesHref = "/admin/organizations/usa-missionaries?tab=workspaces";

// TODO: Add these visibility preference questions to the USA Missionaries onboarding/application flow.
const usamPhotoPromptConcept = "Create a USA Missionaries public profile photo using the submitted person/family photo. Add coordinated USA Missionaries military-style ministry attire and hat. Keep faces natural and recognizable.";

function isHubTab(value: string | null | undefined): value is HubTab {
  return hubTabs.some((tab) => tab.value === value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "None";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: number | null) {
  if (!value) {
    return "None";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatStatus(value: string | null | undefined) {
  return (value ?? "unknown")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatOrganizationKind(organization: OrganizationDetail) {
  if (organization.brandingMode === "usam" || organization.slug === "usa-missionaries") {
    return "Primary Ministry";
  }

  return {
    church: "Church",
    ministry: "Ministry",
    other: "Other",
    partner: "Partner",
  }[organization.type];
}

function publicPrivateStatus(organization: OrganizationDetail) {
  return organization.brandingMode === "usam" ? "Private admin / public ministry" : "Private admin";
}

function badgeClass(status?: string | null) {
  if (status === "active" || status === "approved" || status === "published" || status === "Live") {
    return "border-emerald-500/30 bg-emerald-950/25 text-emerald-200";
  }

  if (status === "declined" || status === "rejected" || status === "archived" || status === "Archived") {
    return "border-red-500/35 bg-red-950/25 text-red-200";
  }

  if (status === "pending_review" || status === "application_submitted" || status === "more_info_requested" || status === "needs_info") {
    return "border-[#C2A14E]/35 bg-[#C2A14E]/10 text-[#E4C465]";
  }

  return "border-stone-700 bg-stone-900/70 text-stone-300";
}

function SmallBadge({ children, status }: { children: string; status?: string | null }) {
  return (
    <span className={`inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${badgeClass(status)}`}>
      {children}
    </span>
  );
}

function previewText(value: string | null, fallback: string) {
  const text = value?.replace(/\s+/g, " ").trim();

  if (!text) {
    return fallback;
  }

  return text.length > 88 ? `${text.slice(0, 88).trim()}...` : text;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-stone-800/75 bg-[#080808]/90 p-3">
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-[10px] uppercase tracking-[0.15em] text-stone-500"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-[#C2A14E]" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none text-stone-50">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex min-h-8 items-center rounded-md border px-2.5 text-[10px] uppercase tracking-[0.13em] transition-colors ${
        active
          ? "border-[#C2A14E] bg-[#C2A14E] text-black"
          : "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700 hover:text-stone-100"
      }`}
      onClick={onClick}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      type="button"
    >
      {label}
    </button>
  );
}

function TextAction({ href, label }: { href: string; label: string }) {
  const className = "inline-flex min-h-7 items-center justify-center rounded-md border border-stone-700 px-2.5 text-[10px] uppercase tracking-[0.12em] text-stone-200 transition-colors hover:border-[#C2A14E] hover:text-[#E4C465]";
  const style = { fontFamily: adminFont.rajdhani, fontWeight: 700 };

  if (href.startsWith("http")) {
    return (
      <a
        className={className}
        href={href}
        rel="noreferrer"
        style={style}
        target="_blank"
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      className={className}
      href={href}
      style={style}
    >
      {label}
    </Link>
  );
}

function InlineButton({
  disabled,
  label,
  onClick,
  title,
  tone = "secondary",
}: {
  disabled?: boolean;
  label: string;
  onClick?: () => void;
  title?: string;
  tone?: "danger" | "primary" | "secondary";
}) {
  const toneClass = tone === "primary"
    ? "border-[#C2A14E] bg-[#C2A14E] text-black hover:bg-[#D2B260]"
    : tone === "danger"
      ? "border-red-500/40 bg-red-950/25 text-red-200 hover:border-red-400"
      : "border-stone-700 text-stone-200 hover:border-[#C2A14E] hover:text-[#E4C465]";

  return (
    <button
      className={`inline-flex min-h-7 items-center justify-center rounded-md border px-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${toneClass}`}
      disabled={disabled}
      onClick={onClick}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      title={title}
      type="button"
    >
      {label}
    </button>
  );
}

function workspaceActionHref(workspace: OrganizationWorkspaceSummary) {
  if (workspace.viewHref) {
    return workspace.viewHref;
  }

  if (workspace.kind === "workspace" && workspace.slug) {
    return `/dos/app?workspace=${encodeURIComponent(workspace.slug)}`;
  }

  return usamOrganizationWorkspacesHref;
}

function SectionShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90">
      <div className="border-b border-stone-800/75 px-3 py-2.5">
        <p className="text-sm font-semibold text-stone-50">{title}</p>
      </div>
      {children}
    </section>
  );
}

function DetailLabel({
  breakWords,
  label,
  value,
}: {
  breakWords?: boolean;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p
        className="text-[10px] uppercase tracking-[0.15em] text-stone-500"
        style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
      >
        {label}
      </p>
      <div className={`mt-1 text-sm leading-6 text-stone-100 ${breakWords ? "break-all" : ""}`}>{value || "None"}</div>
    </div>
  );
}

function DetailList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: Array<{ label: string; value: string }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-stone-500">{emptyText}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <DetailLabel breakWords key={`${item.label}:${item.value}`} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function TextList({ emptyText, items }: { emptyText: string; items: string[] }) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-stone-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <p className="rounded-lg border border-stone-800 bg-black/35 px-3 py-2 text-sm leading-6 text-stone-300" key={`${item}:${index}`}>
          {item}
        </p>
      ))}
    </div>
  );
}

function ContactList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: Array<{ email: string | null; name: string; phone: string | null; relationship: string | null }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-stone-500">{emptyText}</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item, index) => (
        <div className="rounded-lg border border-stone-800 bg-black/35 p-3" key={`${item.name}:${index}`}>
          <p className="text-sm font-semibold text-stone-100">{item.name}</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {[item.relationship, item.email, item.phone].filter(Boolean).join(" · ") || "No details submitted"}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReferenceList({
  emptyText,
  items,
}: {
  emptyText: string;
  items: Array<{ description: string | null; email: string | null; name: string; organization: string | null; phone: string | null; relationship: string | null }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm leading-6 text-stone-500">{emptyText}</p>;
  }

  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div className="rounded-lg border border-stone-800 bg-black/35 p-3" key={`${item.name}:${index}`}>
          <p className="text-sm font-semibold text-stone-100">{item.name}</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            {[item.relationship, item.organization, item.email, item.phone].filter(Boolean).join(" · ") || "No details submitted"}
          </p>
          {item.description ? <p className="mt-2 text-sm leading-6 text-stone-300">{item.description}</p> : null}
        </div>
      ))}
    </div>
  );
}

function ModalShell({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl rounded-xl border border-stone-800 bg-[#0b0b0b] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-stone-800 px-4 py-3">
          <p className="text-sm font-semibold text-stone-50">{title}</p>
          <button
            className="rounded-md border border-stone-800 p-1.5 text-stone-400 transition-colors hover:border-[#C2A14E] hover:text-[#E4C465]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function NeedsInfoModal({
  initialMessage,
  initialReason,
  initialSection,
  onClose,
  onSave,
}: {
  initialMessage: string;
  initialReason: string;
  initialSection: ReviewSectionId;
  onClose: () => void;
  onSave: (section: ReviewSectionId, reason: string, message: string) => void;
}) {
  const [selectedSection, setSelectedSection] = useState<ReviewSectionId>(initialSection);
  const [reason, setReason] = useState(initialReason);
  const [message, setMessage] = useState(initialMessage);

  return (
    <ModalShell onClose={onClose} title="Needs Info Request">
      <div className="space-y-3">
        <label className="block">
          <p
            className="text-[10px] uppercase tracking-[0.15em] text-stone-500"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Section Needing Info
          </p>
          <select
            className="mt-1 min-h-10 w-full rounded-lg border border-stone-800 bg-black px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#C2A14E]"
            onChange={(event) => setSelectedSection(event.target.value as ReviewSectionId)}
            value={selectedSection}
          >
            {needsInfoSectionOptions.map((section) => (
              <option key={section.id} value={section.id}>{section.title}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span
            className="text-[10px] uppercase tracking-[0.15em] text-stone-500"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Reason
          </span>
          <input
            className="mt-1 min-h-10 w-full rounded-lg border border-stone-800 bg-black px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#C2A14E]"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Missing detail, unclear answer, replacement needed..."
            value={reason}
          />
        </label>
        <label className="block">
          <span
            className="text-[10px] uppercase tracking-[0.15em] text-stone-500"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Note
          </span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-lg border border-stone-800 bg-black px-3 py-2 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#C2A14E]"
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What needs clarification?"
            value={message}
          />
        </label>
        <SmallBadge status="needs_info">Applicant email will be sent if Resend is configured.</SmallBadge>
        <div className="flex flex-wrap justify-end gap-2">
          <InlineButton label="Cancel" onClick={onClose} />
          <InlineButton
            disabled={!reason.trim() && !message.trim()}
            label="Save Needs Info"
            onClick={() => onSave(selectedSection, reason, message)}
            tone="primary"
          />
        </div>
      </div>
    </ModalShell>
  );
}

function RejectConfirmModal({
  onClose,
  onReject,
}: {
  onClose: () => void;
  onReject: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <ModalShell onClose={onClose} title="Decline Application">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-stone-300">
          Declining this application will keep the membership and public profile from moving forward. Add an optional note before confirming.
        </p>
        <textarea
          className="min-h-24 w-full rounded-lg border border-stone-800 bg-black px-3 py-2 text-sm leading-6 text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#C2A14E]"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Decline note"
          value={note}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <InlineButton label="Cancel" onClick={onClose} />
          <InlineButton label="Confirm Decline" onClick={() => onReject(note)} tone="danger" />
        </div>
      </div>
    </ModalShell>
  );
}

function ApprovalWarningModal({
  onCancel,
  onContinue,
  unresolvedLabels,
}: {
  onCancel: () => void;
  onContinue: () => void;
  unresolvedLabels: string[];
}) {
  return (
    <ModalShell onClose={onCancel} title="Unresolved Review Items">
      <div className="space-y-4">
        <div className="rounded-lg border border-[#C2A14E]/30 bg-[#C2A14E]/10 p-3">
          <p className="text-sm font-semibold text-[#E4C465]">Approve with unresolved items?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unresolvedLabels.map((label) => (
              <SmallBadge key={label} status="needs_info">{label}</SmallBadge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <InlineButton label="Cancel" onClick={onCancel} />
          <InlineButton label="Continue Approval" onClick={onContinue} tone="primary" />
        </div>
      </div>
    </ModalShell>
  );
}

function submittedPhotoLabel(photo: OrganizationApplicationPhotoSummary) {
  if (photo.kind === "Family") {
    return "Family Photo";
  }

  if (photo.kind === "Profile") {
    return "Individual Photo";
  }

  return "Submitted Photo";
}

function ApplicationPhotoCard({
  isSelected,
  onSelect,
  photo,
}: {
  isSelected: boolean;
  onSelect: () => void;
  photo: OrganizationApplicationPhotoSummary;
}) {
  return (
    <article className={`rounded-lg border bg-stone-950/55 p-2.5 transition-colors ${isSelected ? "border-[#C2A14E]/70" : "border-stone-800"}`}>
      <div className="flex aspect-[4/3] max-w-[180px] items-center justify-center overflow-hidden rounded-md border border-stone-800 bg-black">
        {photo.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`${submittedPhotoLabel(photo)} submitted by applicant`} className="h-full w-full object-cover" src={photo.thumbnailUrl} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-stone-500">
            <ImageIcon className="h-8 w-8" aria-hidden="true" />
            <span className="px-4 text-center text-xs">Preview unavailable</span>
          </div>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="text-sm font-medium text-stone-100">{submittedPhotoLabel(photo)}</p>
        <p className="mt-0.5 truncate text-xs text-stone-500">{photo.fileName}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {photo.thumbnailUrl ? <TextAction href={photo.thumbnailUrl} label="View" /> : <InlineButton disabled label="View" />}
        <InlineButton label={isSelected ? "Selected" : "Use for USAM Photo"} onClick={onSelect} tone={isSelected ? "primary" : "secondary"} />
      </div>
    </article>
  );
}

function ReviewValueBadge({ value }: { value: SectionReviewValue }) {
  const status = value === "OK"
    ? "approved"
    : value === "Needs Info" || value === "Missing"
      ? "needs_info"
      : undefined;

  return <SmallBadge status={status}>{value}</SmallBadge>;
}

function SectionViewModal({
  onClose,
  row,
}: {
  onClose: () => void;
  row: ApplicationSectionRow;
}) {
  return (
    <ModalShell onClose={onClose} title={row.title}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SmallBadge status={row.review === "OK" ? "approved" : row.review === "Needs Info" || row.review === "Missing" ? "needs_info" : undefined}>{row.review}</SmallBadge>
          <SmallBadge>Editing coming soon</SmallBadge>
        </div>
        <div className="rounded-lg border border-stone-800 bg-black/45 p-3">
          {row.content}
        </div>
      </div>
    </ModalShell>
  );
}

function ApplicationReviewDetail({
  actionKey,
  application,
  onBack,
  onWorkflowAction,
}: {
  actionKey: string;
  application: OrganizationApplicationSummary;
  onBack: () => void;
  onWorkflowAction: (application: OrganizationApplicationSummary, action: ApplicationWorkflowAction, successLabel: string, adminNotes?: string) => void;
}) {
  const [needsInfoOpen, setNeedsInfoOpen] = useState(false);
  const [needsInfoSection, setNeedsInfoSection] = useState<ReviewSectionId>("photo-builder");
  const [needsInfoRequest, setNeedsInfoRequest] = useState<{ message: string; reason: string; savedAt: string; section: ReviewSectionId } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approvalWarningOpen, setApprovalWarningOpen] = useState(false);
  const [editedPhoto, setEditedPhoto] = useState<{ fileName: string; previewUrl: string; size: number } | null>(null);
  const [editedPhotoStatus, setEditedPhotoStatus] = useState<"Approved" | "Not Created" | "Uploaded">("Not Created");
  const [useEditedPhotoOnProfile, setUseEditedPhotoOnProfile] = useState(false);
  const [selectedSubmittedPhotoId, setSelectedSubmittedPhotoId] = useState(application.photos[0]?.id ?? "");
  const [selectedSectionRow, setSelectedSectionRow] = useState<ApplicationSectionRow | null>(null);
  const [sectionNeedsInfo, setSectionNeedsInfo] = useState<Partial<Record<ReviewSectionId, boolean>>>({});
  const selectedSubmittedPhoto = application.photos.find((photo) => photo.id === selectedSubmittedPhotoId) ?? application.photos[0] ?? null;
  const editedPhotoUploaded = Boolean(editedPhoto);
  const editedPhotoApproved = editedPhotoStatus === "Approved";
  const readyForPublicProfile = editedPhotoUploaded && editedPhotoApproved && useEditedPhotoOnProfile;

  useEffect(() => {
    setNeedsInfoOpen(false);
    setNeedsInfoSection("photo-builder");
    setNeedsInfoRequest(null);
    setRejectOpen(false);
    setApprovalWarningOpen(false);
    setEditedPhoto(null);
    setEditedPhotoStatus("Not Created");
    setUseEditedPhotoOnProfile(false);
    setSelectedSubmittedPhotoId(application.photos[0]?.id ?? "");
    setSelectedSectionRow(null);
    setSectionNeedsInfo({});
  }, [application.id]);

  useEffect(() => {
    return () => {
      if (editedPhoto?.previewUrl) {
        URL.revokeObjectURL(editedPhoto.previewUrl);
      }
    };
  }, [editedPhoto?.previewUrl]);

  function openNeedsInfo(sectionId: ReviewSectionId = "photo-builder") {
    setNeedsInfoSection(sectionId);
    setNeedsInfoOpen(true);
  }

  function saveNeedsInfoRequest(sectionId: ReviewSectionId, reason: string, message: string) {
    const sectionLabel = needsInfoSectionOptions.find((section) => section.id === sectionId)?.title ?? sectionId;
    const cleanReason = reason.trim();
    const cleanMessage = message.trim();
    const adminNotes = [
      "[More information requested]",
      `Section: ${sectionLabel}`,
      cleanReason ? `Reason: ${cleanReason}` : "",
      cleanMessage ? `Message: ${cleanMessage}` : "",
    ].filter(Boolean).join("\n");

    setNeedsInfoRequest({
      message: cleanMessage || "No message added.",
      reason: cleanReason || "Needs information",
      savedAt: new Date().toISOString(),
      section: sectionId,
    });
    setSectionNeedsInfo((current) => ({ ...current, [sectionId]: true }));
    setNeedsInfoOpen(false);
    onWorkflowAction(application, "request_more_info", "requested more information", adminNotes);
  }

  function approveApplication() {
    const unresolvedLabels = unresolvedReviewLabels();

    if (unresolvedLabels.length > 0) {
      setApprovalWarningOpen(true);
      return;
    }

    onWorkflowAction(application, "approve", "approved");
  }

  function continueApproval() {
    setApprovalWarningOpen(false);
    onWorkflowAction(application, "approve", "approved");
  }

  function rejectApplication(note: string) {
    setRejectOpen(false);
    onWorkflowAction(application, "decline", "declined", note.trim() || undefined);
  }

  function handleEditedPhotoChange(file: File | undefined) {
    if (!file) {
      return;
    }

    setEditedPhoto((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        fileName: file.name,
        previewUrl: URL.createObjectURL(file),
        size: file.size,
      };
    });
    setEditedPhotoStatus("Uploaded");
    setUseEditedPhotoOnProfile(false);
  }

  function sectionHasContent(sectionId: ReviewSectionId) {
    if (sectionId === "applicant-info") {
      return Boolean(application.applicantName || application.applicantEmail || application.applicantPhone || application.location);
    }

    if (sectionId === "household") {
      return application.householdDetails.length > 0 || application.householdMembers.length > 0;
    }

    if (sectionId === "calling-focus") {
      return Boolean(application.callingFocus?.trim());
    }

    if (sectionId === "testimony-story") {
      return Boolean(application.storyTestimony?.trim()) || application.storyAnswers.length > 0;
    }

    if (sectionId === "support-budget") {
      return Boolean(application.monthlyBudget || application.supportGoal || application.supportDetails.length > 0);
    }

    if (sectionId === "prayer-needs") {
      return Boolean(application.prayerNeeds?.trim()) || application.prayerPartners.length > 0 || application.prayerRequests.length > 0;
    }

    if (sectionId === "references") {
      return Boolean(application.referencesText?.trim()) || application.references.length > 0;
    }

    if (sectionId === "application-status") {
      return true;
    }

    return Boolean(application.adminNotes?.trim());
  }

  function sectionReview(sectionId: ReviewSectionId): SectionReviewValue {
    if (sectionNeedsInfo[sectionId]) {
      return "Needs Info";
    }

    if (sectionId === "references" || sectionId === "internal-notes") {
      return sectionHasContent(sectionId) ? "Not Public" : "Missing";
    }

    return sectionHasContent(sectionId) ? "OK" : "Missing";
  }

  function renderSectionContent(sectionId: ReviewSectionId) {
    if (sectionId === "applicant-info") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailLabel label="Name" value={application.applicantName} />
          <DetailLabel breakWords label="Email" value={application.applicantEmail ?? "None"} />
          <DetailLabel label="Phone" value={application.applicantPhone ?? "None"} />
          <DetailLabel label="Location" value={application.location ?? "None"} />
        </div>
      );
    }

    if (sectionId === "household") {
      return (
        <div className="space-y-4">
          <DetailList emptyText="No household details submitted." items={application.householdDetails} />
          {application.householdMembers.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {application.householdMembers.map((member, index) => (
                <div className="rounded-lg border border-stone-800 bg-black/35 p-3" key={`${member.name}:${index}`}>
                  <p className="text-sm font-semibold text-stone-100">{member.name}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">
                    {[member.relationship, member.age ? `Age ${member.age}` : "", member.status].filter(Boolean).join(" · ") || "Household member"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      );
    }

    if (sectionId === "calling-focus") {
      return <p className="text-sm leading-6 text-stone-300">{application.callingFocus || "No calling focus submitted."}</p>;
    }

    if (sectionId === "testimony-story") {
      return (
        <div className="space-y-4">
          <DetailList emptyText="No guided story answers submitted." items={application.storyAnswers} />
          <div className="max-h-80 overflow-y-auto rounded-lg border border-stone-800 bg-black/45 p-3">
            <p className="whitespace-pre-wrap text-sm leading-6 text-stone-300">{application.storyTestimony || "No accepted missionary story draft submitted."}</p>
          </div>
        </div>
      );
    }

    if (sectionId === "support-budget") {
      return <DetailList emptyText="No support details submitted." items={application.supportDetails} />;
    }

    if (sectionId === "prayer-needs") {
      return (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-stone-100">Prayer Partners</p>
            <ContactList emptyText="No prayer partners submitted." items={application.prayerPartners} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-stone-100">Prayer Requests</p>
            <TextList emptyText="No prayer requests submitted." items={application.prayerRequests} />
          </div>
        </div>
      );
    }

    if (sectionId === "references") {
      return <ReferenceList emptyText="No references submitted." items={application.references} />;
    }

    if (sectionId === "application-status") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailLabel label="Status" value={formatStatus(application.status)} />
          <DetailLabel label="Assigned Admin" value={application.assignedAdmin || "Unassigned"} />
          <DetailLabel label="Submitted" value={formatDate(application.submittedAt)} />
          <DetailLabel label="Photos" value={application.hasPhotos ? "Uploaded" : "Missing"} />
        </div>
      );
    }

    if (sectionId === "internal-notes") {
      return <p className="whitespace-pre-wrap text-sm leading-6 text-stone-300">{application.adminNotes || "No internal notes yet."}</p>;
    }

    return null;
  }

  function sectionSummary(sectionId: ReviewSectionId) {
    if (sectionId === "applicant-info") {
      return `${application.applicantEmail || "No email"} · ${application.location || "No location"}`;
    }

    if (sectionId === "household") {
      return application.householdDetails.length || application.householdMembers.length
        ? `${application.householdDetails.length} details · ${application.householdMembers.length} household members`
        : "No household details submitted.";
    }

    if (sectionId === "calling-focus") {
      return previewText(application.callingFocus, "No calling focus submitted.");
    }

    if (sectionId === "testimony-story") {
      return previewText(application.storyTestimony, "No testimony submitted.");
    }

    if (sectionId === "support-budget") {
      return application.supportDetails.length
        ? `${application.supportDetails.length} support details`
        : `${formatMoney(application.monthlyBudget)} monthly budget · ${formatMoney(application.supportGoal)} support goal`;
    }

    if (sectionId === "prayer-needs") {
      return `${application.prayerPartners.length} prayer partners · ${application.prayerRequests.length} prayer requests`;
    }

    if (sectionId === "references") {
      return application.references.length ? `${application.references.length} references` : previewText(application.referencesText, "No references submitted.");
    }

    if (sectionId === "internal-notes") {
      return previewText(application.adminNotes, "No internal notes yet.");
    }

    if (sectionId === "application-status") {
      return `${formatStatus(application.status)} · ${application.assignedAdmin || "Unassigned"}`;
    }

    return "Review applicant contact, location, and household basics.";
  }

  function sectionVisibility(sectionId: ReviewSectionId) {
    if (sectionId === "testimony-story") {
      return "Application review";
    }

    if (sectionId === "prayer-needs") {
      return "Prayer team only";
    }

    if (sectionId === "support-budget") {
      return "Internal review";
    }

    if (sectionId === "applicant-info") {
      return "Internal review";
    }

    if (sectionId === "household" || sectionId === "internal-notes" || sectionId === "references" || sectionId === "application-status") {
      return "Not public";
    }

    return "Internal review";
  }

  const sectionRows: ApplicationSectionRow[] = applicationSections.map((section) => ({
    content: renderSectionContent(section.id),
    id: section.id,
    review: sectionReview(section.id),
    summary: sectionSummary(section.id),
    title: section.title,
    visibility: sectionVisibility(section.id),
  }));

  function unresolvedReviewLabels() {
    return [
      ...(!readyForPublicProfile ? ["USAM Public Photo"] : []),
      ...sectionRows
        .filter((row) => row.review === "Missing" || row.review === "Needs Info")
        .map((row) => row.title),
    ];
  }

  return (
    <div className="space-y-3 p-2">
      <section className="rounded-lg border border-stone-800 bg-[#0f0f0f] p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <button
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-stone-400 transition-colors hover:text-[#E4C465]"
              onClick={onBack}
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              type="button"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Applications
            </button>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-stone-50">{application.applicantName}</h3>
              <span className="text-sm text-stone-500">· Submitted {formatDate(application.submittedAt)}</span>
              <span className="text-sm text-stone-500">· {application.location || "No location"}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <InlineButton
              disabled={Boolean(actionKey)}
              label="Approve"
              onClick={approveApplication}
              tone="primary"
            />
            <InlineButton
              disabled={Boolean(actionKey)}
              label="Needs Info"
              onClick={() => openNeedsInfo("photo-builder")}
            />
            <InlineButton
              disabled={Boolean(actionKey)}
              label="Decline"
              onClick={() => setRejectOpen(true)}
              tone="danger"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-stone-800 bg-[#0f0f0f] p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p
            className="text-[10px] uppercase tracking-[0.15em] text-stone-500"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            Photo Builder
          </p>
          <SmallBadge status={readyForPublicProfile ? "approved" : "pending_review"}>{readyForPublicProfile ? "Ready for public profile" : "Public photo not ready"}</SmallBadge>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <article className="rounded-lg border border-stone-800 bg-stone-950/45 p-3">
            <p className="mb-2 text-sm font-semibold text-stone-50">Submitted Photos</p>
            {application.photos.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {application.photos.map((photo) => (
                  <ApplicationPhotoCard
                    isSelected={selectedSubmittedPhoto?.id === photo.id}
                    key={photo.id}
                    onSelect={() => setSelectedSubmittedPhotoId(photo.id)}
                    photo={photo}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-stone-800 bg-black/40 p-3 text-sm text-stone-500">No submitted photo found.</div>
            )}
          </article>

          <article className="rounded-lg border border-[#C2A14E]/25 bg-[#C2A14E]/5 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-50">USAM Public Photo</p>
              <SmallBadge status={editedPhotoApproved ? "approved" : editedPhotoUploaded ? "pending_review" : undefined}>{editedPhotoStatus}</SmallBadge>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(160px,220px)_minmax(0,1fr)]">
              <div className="flex aspect-[4/3] max-w-[220px] items-center justify-center overflow-hidden rounded-md border border-stone-800 bg-black">
                {editedPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="USAM public photo preview" className="h-full w-full object-cover" src={editedPhoto.previewUrl} />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-stone-500">
                    <ImageIcon className="h-8 w-8" aria-hidden="true" />
                    <span className="text-xs">Not created</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-2">
                {editedPhoto ? (
                  <div>
                    <p className="truncate text-sm font-medium text-stone-100">{editedPhoto.fileName}</p>
                    <p className="text-xs text-stone-500">Local preview only — not stored yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-sm text-stone-500">
                    <p>Selected: {selectedSubmittedPhoto ? submittedPhotoLabel(selectedSubmittedPhoto) : "No submitted photo selected"}</p>
                    <p className="text-xs leading-5">{usamPhotoPromptConcept}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <InlineButton disabled label="Generate USAM Photo — Coming Soon" title="Coming Soon" tone="primary" />
                  <label
                    className="inline-flex min-h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-stone-700 px-2.5 text-[10px] uppercase tracking-[0.12em] text-stone-200 transition-colors hover:border-[#C2A14E] hover:text-[#E4C465]"
                    style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    Upload Manual Edit
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => handleEditedPhotoChange(event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                  {editedPhoto ? (
                    <InlineButton
                      label={useEditedPhotoOnProfile ? "Approved for Public Profile" : "Approve for Public Profile"}
                      onClick={() => {
                        setEditedPhotoStatus("Approved");
                        setUseEditedPhotoOnProfile(true);
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-lg border border-stone-800 bg-[#0f0f0f] p-3">
        <p
          className="mb-3 text-[10px] uppercase tracking-[0.15em] text-stone-500"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          Application Sections
        </p>
        <div className="overflow-hidden rounded-lg border border-stone-800">
          <div className="hidden bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 xl:grid xl:grid-cols-[150px_minmax(0,1.35fr)_170px_105px_155px] xl:items-center xl:gap-3" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            <span>Section</span>
            <span>Summary</span>
            <span>Visibility</span>
            <span>Review</span>
            <span className="text-right">Actions</span>
          </div>
          {sectionRows.map((row) => (
            <article className="border-t border-stone-800 first:border-t-0 px-3 py-2.5" key={row.id}>
              <div className="grid gap-2 xl:grid-cols-[150px_minmax(0,1.35fr)_170px_105px_155px] xl:items-center xl:gap-3">
                <p className="text-sm font-medium text-stone-100">{row.title}</p>
                <p className="line-clamp-1 text-sm text-stone-400">{row.summary}</p>
                <p className="text-sm text-stone-300">{row.visibility}</p>
                <ReviewValueBadge value={row.review} />
                <div className="flex flex-wrap gap-1.5 xl:justify-end">
                  <InlineButton label="View / Edit" onClick={() => setSelectedSectionRow(row)} />
                  <InlineButton label="Needs Info" onClick={() => openNeedsInfo(row.id)} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedSectionRow ? (
        <SectionViewModal onClose={() => setSelectedSectionRow(null)} row={selectedSectionRow} />
      ) : null}

      {needsInfoOpen ? (
        <NeedsInfoModal
          initialMessage={needsInfoRequest?.message ?? ""}
          initialReason={needsInfoRequest?.reason ?? ""}
          initialSection={needsInfoSection}
          onClose={() => setNeedsInfoOpen(false)}
          onSave={saveNeedsInfoRequest}
        />
      ) : null}

      {rejectOpen ? (
        <RejectConfirmModal
          onClose={() => setRejectOpen(false)}
          onReject={rejectApplication}
        />
      ) : null}

      {approvalWarningOpen ? (
        <ApprovalWarningModal
          onCancel={() => setApprovalWarningOpen(false)}
          onContinue={continueApproval}
          unresolvedLabels={unresolvedReviewLabels()}
        />
      ) : null}
    </div>
  );
}

function ApprovedProfileActions({
  onCopy,
  onVisibilityAction,
  profile,
}: {
  onCopy: (profile: OrganizationApprovedProfileSummary) => void;
  onVisibilityAction: (profile: OrganizationApprovedProfileSummary, action: "hide" | "publish") => void;
  profile: OrganizationApprovedProfileSummary;
}) {
  const nextAction = profile.visibility === "Live" ? "hide" : "publish";

  return (
    <div className="flex flex-wrap justify-start gap-1.5 xl:justify-end">
      <InlineButton disabled label="Edit" />
      <TextAction href={profile.publicUrl} label="View" />
      <InlineButton label="Copy Link" onClick={() => onCopy(profile)} />
      <InlineButton disabled={!profile.applicationId} label={nextAction === "hide" ? "Hide" : "Publish"} onClick={() => onVisibilityAction(profile, nextAction)} />
    </div>
  );
}

export function UsamOrganizationHubClient({
  initialApplicationId,
  initialTab,
  organization,
}: {
  initialApplicationId?: string;
  initialTab?: string;
  organization: OrganizationDetail;
}) {
  const [activeTab, setActiveTab] = useState<HubTab>(initialApplicationId ? "applications" : isHubTab(initialTab) ? initialTab : "overview");
  const [applications, setApplications] = useState(organization.applications);
  const [approvedProfiles, setApprovedProfiles] = useState(organization.approvedProfiles);
  const [statusMessage, setStatusMessage] = useState("");
  const [actionKey, setActionKey] = useState("");
  const [selectedApplicationId, setSelectedApplicationId] = useState(initialApplicationId ?? "");
  const [copyMessage, setCopyMessage] = useState("");
  const pendingApplications = applications.filter((application) => (
    application.status === "application_submitted" || application.status === "pending_review" || application.status === "more_info_requested"
  )).length;
  const selectedApplication = applications.find((application) => application.id === selectedApplicationId) ?? null;

  function handleWorkflowAction(application: OrganizationApplicationSummary, action: ApplicationWorkflowAction, successLabel: string, adminNotes?: string) {
    setActionKey(`${application.id}:${action}`);
    setStatusMessage("");

    void (async () => {
      try {
        const response = await fetch(`/api/admin/missionary-profiles/applications/${application.id}/status`, {
          body: JSON.stringify({
            action,
            adminNotes,
          }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
        const result = await response.json().catch(() => ({})) as { emailSent?: boolean; error?: string; status?: string };

        if (!response.ok) {
          throw new Error(result.error || "Unable to update application.");
        }

        const nextStatus = result.status ?? (action === "approve" ? "approved" : action === "decline" ? "declined" : action === "request_more_info" ? "more_info_requested" : application.status);

        setApplications((current) => current.map((currentApplication) => (
          currentApplication.id === application.id
            ? { ...currentApplication, status: nextStatus }
            : currentApplication
        )));
        if (adminNotes !== undefined) {
          setApplications((current) => current.map((currentApplication) => (
            currentApplication.id === application.id
              ? { ...currentApplication, adminNotes }
              : currentApplication
          )));
        }
        setStatusMessage(`${application.applicantName} ${successLabel}.${["approve", "decline", "request_more_info"].includes(action) ? ` Email ${result.emailSent ? "sent" : "not sent"}.` : ""}`);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Unable to update application.");
      } finally {
        setActionKey("");
      }
    })();
  }

  function copyProfileLink(profile: OrganizationApprovedProfileSummary) {
    const href = `${window.location.origin}${profile.publicUrl}`;

    void navigator.clipboard.writeText(href).then(() => {
      setCopyMessage(`${profile.publicName} link copied.`);
    }).catch(() => {
      setCopyMessage("Unable to copy link.");
    });
  }

  function handleProfileVisibilityAction(profile: OrganizationApprovedProfileSummary, action: "hide" | "publish") {
    if (!profile.applicationId) {
      setCopyMessage("This profile does not have an application workflow record yet.");
      return;
    }

    setActionKey(`${profile.id}:${action}`);
    setCopyMessage("");

    void (async () => {
      try {
        const response = await fetch(`/api/admin/missionary-profiles/applications/${profile.applicationId}/status`, {
          body: JSON.stringify({ action }),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
        const result = await response.json().catch(() => ({})) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error || "Unable to update profile visibility.");
        }

        setApprovedProfiles((current) => current.map((currentProfile) => (
          currentProfile.id === profile.id
            ? { ...currentProfile, visibility: action === "publish" ? "Live" : "Hidden" }
            : currentProfile
        )));
        setCopyMessage(`${profile.publicName} ${action === "publish" ? "published" : "hidden"}.`);
      } catch (error) {
        setCopyMessage(error instanceof Error ? error.message : "Unable to update profile visibility.");
      } finally {
        setActionKey("");
      }
    })();
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <Link
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-stone-400 transition-colors hover:text-[#E4C465]"
          href="/admin/organizations"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Organizations
        </Link>

        <div className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4">
          <div>
            <h2 className="text-2xl font-semibold text-stone-50">{organization.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <SmallBadge>{formatOrganizationKind(organization)}</SmallBadge>
              <SmallBadge status={organization.status}>{formatStatus(organization.status)}</SmallBadge>
            </div>
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-2.5" aria-label="Organization sections">
        {hubTabs.map((tab) => (
          <TabButton
            active={activeTab === tab.value}
            key={tab.value}
            label={tab.label}
            onClick={() => {
              setActiveTab(tab.value);
              if (tab.value !== "applications") {
                setSelectedApplicationId("");
              }
            }}
          />
        ))}
      </nav>

      {activeTab === "overview" ? (
        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Users} label="Members" value={organization.memberCount} />
          <MetricCard icon={Layers} label="Workspaces" value={organization.workspaceCount} />
          <MetricCard icon={Workflow} label="Pending Applications" value={pendingApplications} />
          <MetricCard icon={FileText} label="Approved Profiles" value={approvedProfiles.length} />
        </section>
      ) : null}

      {activeTab === "applications" ? (
        <SectionShell title={selectedApplication ? "Application Review" : "Applications"}>
          {statusMessage ? (
            <p className="mx-3 mt-3 rounded-lg border border-stone-800 bg-stone-950/70 p-2.5 text-sm text-stone-300">{statusMessage}</p>
          ) : null}
          {selectedApplication ? (
            <ApplicationReviewDetail
              actionKey={actionKey}
              application={selectedApplication}
              onBack={() => setSelectedApplicationId("")}
              onWorkflowAction={handleWorkflowAction}
            />
          ) : applications.length > 0 ? (
            <div className="space-y-2 p-2">
              <div className="hidden rounded-lg border border-stone-800 bg-[#0f0f0f] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 xl:grid xl:grid-cols-[minmax(0,1.15fr)_130px_115px_105px_155px_70px_80px] xl:items-center xl:gap-3" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                <span>Applicant</span>
                <span>Location</span>
                <span>Submitted</span>
                <span>Status</span>
                <span>Assigned Admin</span>
                <span>Photos</span>
                <span className="text-right">Review</span>
              </div>
              {applications.map((application) => (
                <article className="rounded-lg border border-stone-800 bg-[#0f0f0f] px-3 py-2.5 transition-colors hover:border-[#C2A14E]/35" key={application.id}>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_130px_115px_105px_155px_70px_80px] xl:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-100">{application.applicantName}</p>
                      <p className="mt-0.5 truncate text-xs text-stone-500">{application.applicantEmail || "No email"}</p>
                    </div>
                    <p className="truncate text-sm text-stone-300">{application.location || "None"}</p>
                    <p className="text-sm text-stone-400">{formatDate(application.submittedAt)}</p>
                    <SmallBadge status={application.status}>{formatStatus(application.status)}</SmallBadge>
                    <p className="truncate text-sm text-stone-300">{application.assignedAdmin || "Unassigned"}</p>
                    <p className="text-sm text-stone-300">{application.hasPhotos ? "Yes" : "No"}</p>
                    <div className="flex justify-start xl:justify-end">
                      <InlineButton label="Review" onClick={() => setSelectedApplicationId(application.id)} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm leading-6 text-stone-400">No application records are connected to this organization yet.</div>
          )}
        </SectionShell>
      ) : null}

      {activeTab === "approved-profiles" ? (
        <SectionShell title="Approved Profiles">
          {copyMessage ? (
            <p className="mx-3 mt-3 rounded-lg border border-stone-800 bg-stone-950/70 p-2.5 text-sm text-stone-300">{copyMessage}</p>
          ) : null}
          {approvedProfiles.length > 0 ? (
            <div className="space-y-2 p-2">
              <div className="hidden rounded-lg border border-stone-800 bg-[#0f0f0f] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 xl:grid xl:grid-cols-[minmax(0,1fr)_150px_95px_110px_115px_290px] xl:items-center xl:gap-3" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                <span>Public Name</span>
                <span>Location</span>
                <span>Visibility</span>
                <span>Support Goal</span>
                <span>Last Updated</span>
                <span className="text-right">Actions</span>
              </div>
              {approvedProfiles.map((profile) => (
                <article className="rounded-lg border border-stone-800 bg-[#0f0f0f] px-3 py-2.5" key={profile.id}>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_150px_95px_110px_115px_290px] xl:items-center">
                    <p className="truncate text-sm font-medium text-stone-100">{profile.publicName}</p>
                    <p className="truncate text-sm text-stone-300">{profile.location || "None"}</p>
                    <SmallBadge status={profile.visibility}>{profile.visibility}</SmallBadge>
                    <p className="text-sm text-stone-300">{formatMoney(profile.supportGoal)}</p>
                    <p className="text-sm text-stone-400">{formatDate(profile.lastUpdated)}</p>
                    <ApprovedProfileActions onCopy={copyProfileLink} onVisibilityAction={handleProfileVisibilityAction} profile={profile} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm leading-6 text-stone-400">No approved public profiles are connected to this organization yet.</div>
          )}
        </SectionShell>
      ) : null}

      {activeTab === "members" ? (
        <SectionShell title="Members">
          {organization.members.length > 0 ? (
            <div className="space-y-2 p-2">
              <div className="hidden rounded-lg border border-stone-800 bg-[#0f0f0f] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(160px,0.8fr)_110px_90px_minmax(160px,0.75fr)_115px_90px] xl:items-center xl:gap-3" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Workspace</span>
                <span>Last Active</span>
                <span className="text-right">Actions</span>
              </div>
              {organization.members.map((member) => (
                <article className="rounded-lg border border-stone-800 bg-[#0f0f0f] px-3 py-2.5" key={member.id}>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(160px,0.8fr)_110px_90px_minmax(160px,0.75fr)_115px_90px] xl:items-center">
                    <p className="truncate text-sm font-medium text-stone-100">{member.name}</p>
                    <p className="truncate text-sm text-stone-400">{member.email || "No email"}</p>
                    <p className="truncate text-sm text-stone-300">{member.role || "Member"}</p>
                    <SmallBadge status={member.status}>{formatStatus(member.status)}</SmallBadge>
                    <p className="truncate text-sm text-stone-300">{member.workspaceName || "Organization"}</p>
                    <p className="text-sm text-stone-400">{formatDate(member.lastActiveAt)}</p>
                    <div className="flex justify-start xl:justify-end">
                      {member.workspaceId ? <TextAction href={usamOrganizationWorkspacesHref} label="View" /> : <span className="text-xs text-stone-600">None</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm leading-6 text-stone-400">No members are connected to this organization yet.</div>
          )}
        </SectionShell>
      ) : null}

      {activeTab === "workspaces" ? (
        <SectionShell title="Workspaces">
          {organization.workspaces.length > 0 ? (
            <div className="space-y-2 p-2">
              <div className="hidden rounded-lg border border-stone-800 bg-[#0f0f0f] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-stone-500 xl:grid xl:grid-cols-[minmax(0,1fr)_130px_minmax(160px,0.75fr)_minmax(190px,0.9fr)_115px_145px] xl:items-center xl:gap-3" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                <span>Workspace</span>
                <span>Owner</span>
                <span>Household</span>
                <span>Activity</span>
                <span>Last Active</span>
                <span className="text-right">Actions</span>
              </div>
              {organization.workspaces.map((workspace) => (
                <article className="rounded-lg border border-stone-800 bg-[#0f0f0f] px-3 py-2.5" key={workspace.id}>
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_130px_minmax(160px,0.75fr)_minmax(190px,0.9fr)_115px_145px] xl:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-100">{workspace.name}</p>
                      <p className="mt-0.5 truncate text-xs text-stone-500">{workspace.sourceLabel}</p>
                    </div>
                    <p className="truncate text-sm text-stone-300">{workspace.ownerName || "Unassigned"}</p>
                    <p className="truncate text-sm text-stone-300">{workspace.householdName || "Not linked"}</p>
                    <p className="truncate text-sm text-stone-400">{workspace.activitySummary}</p>
                    <p className="text-sm text-stone-400">{formatDate(workspace.lastActivityAt)}</p>
                    <div className="flex justify-start xl:justify-end">
                      <TextAction href={workspaceActionHref(workspace)} label="View Intelligence" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm leading-6 text-stone-400">No DOS workspaces are connected to this organization yet.</div>
          )}
        </SectionShell>
      ) : null}

      {activeTab === "settings" ? (
        <SectionShell title="Settings">
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
            <DetailLabel label="Organization Name" value={organization.name} />
            <DetailLabel label="Type" value={formatOrganizationKind(organization)} />
            <DetailLabel label="Status" value={formatStatus(organization.status)} />
            <DetailLabel label="Public / Private" value={publicPrivateStatus(organization)} />
            <DetailLabel label="Applicant Flow Enabled" value={organization.brandingMode === "usam" ? "Yes" : "No"} />
          </div>
        </SectionShell>
      ) : null}
    </div>
  );
}
