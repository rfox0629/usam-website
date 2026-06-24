"use client";

import Link from "next/link";
import { Children, isValidElement, useEffect, useId, useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, Eye, EyeOff, Plus, Save, Trash2, Upload, Video } from "lucide-react";
import { relationshipContextOptions, roleInMyLifeOptions, type RelationshipContextValue, type RoleInMyLifeValue } from "@/src/lib/dos/relationship-model";

type DependentStatus = "dependent" | "independent";
type PrayerVisibility = "prayer_team";
type StoryVersionKey = "original" | "polished" | "profile" | "short";
type DonationLinkChoice = "general_usam" | "missionary_support" | "none";
type SetupPath = "" | "organization" | "personal" | "usam";
type SupportNeed = "no" | "yes";
type SupportGoalOption = "1000" | "2500" | "3500" | "5000" | "custom";
type PhotoKind = "family" | "profile";

type UploadedJoinPhoto = {
  bucket: string;
  contentType: string;
  fileName: string;
  kind: PhotoKind;
  path: string;
  size: number;
  uploadedAt?: string;
};

type SupportBudgetDraft = {
  childrenEducation: string;
  communicationsSoftware: string;
  debtPayments: string;
  eventsGatherings: string;
  foodHousehold: string;
  givingTithe: string;
  hospitalityMeals: string;
  housing: string;
  insuranceMedical: string;
  localTravel: string;
  otherMinistryNeeds: string;
  otherPersonalNeeds: string;
  retirement: string;
  savings: string;
  trainingResources: string;
  transportation: string;
  utilities: string;
};

type SupportBudgetKey = keyof SupportBudgetDraft;

type My3PersonDraft = {
  email: string;
  id: string;
  name: string;
  phone: string;
  relationshipContext: RelationshipContextValue;
  roleInMyLife: RoleInMyLifeValue;
};

type FamilyMemberDraft = {
  age: string;
  dependentStatus: DependentStatus;
  firstName: string;
  id: string;
  lastName: string;
  relationship: string;
};

type PrayerRequestDraft = {
  id: string;
  text: string;
  visibility: PrayerVisibility;
};

type PrayerPartnerDraft = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
  relationship: string;
};

type ReferenceDraft = {
  churchOrganization: string;
  description: string;
  email: string;
  firstName: string;
  id: string;
  lastName: string;
  phone: string;
  relationship: string;
};

type ApplicationDraft = {
  accountEmail: string;
  addressLine1: string;
  addressLine2: string;
  agreement: boolean;
  basedIn: string;
  callingFocus: string;
  cellPhone: string;
  city: string;
  confirmPassword: string;
  contactEmail: string;
  country: string;
  currentlyRaisingSupport: string;
  donationLinkPreference: DonationLinkChoice;
  familyMembers: FamilyMemberDraft[];
  familyPhotoName: string;
  familyPhotoPreviewUrl: string;
  familyPhotoUpload: UploadedJoinPhoto | null;
  firstName: string;
  fullAddress: string;
  lastName: string;
  my3People: My3PersonDraft[];
  organizationContactEmail: string;
  organizationContactPerson: string;
  organizationMessage: string;
  organizationName: string;
  organizationType: string;
  password: string;
  prayerPartners: PrayerPartnerDraft[];
  prayerRequests: PrayerRequestDraft[];
  profilePhotoName: string;
  profilePhotoPreviewUrl: string;
  profilePhotoUpload: UploadedJoinPhoto | null;
  polishedStoryDraft: string;
  references: ReferenceDraft[];
  selectedStoryVersion: StoryVersionKey;
  spouseEmail: string;
  spouseFirstName: string;
  spouseLastName: string;
  spouseName: string;
  spousePhone: string;
  state: string;
  storyCallingToward: string;
  storyDraftAccepted: boolean;
  storyImpact: string;
  storyJesus: string;
  storyRecentTeaching: string;
  storyTestimony: string;
  storyWhyUsam: string;
  supportBudget: SupportBudgetDraft;
  supportCoverage: string;
  supportCommittedAmount: string;
  supportGoal: string;
  supportGoalOption: SupportGoalOption;
  supportMonthlyNeed: string;
  supportNeed: SupportNeed;
  supportOtherMonthlyIncome: string;
  setupPath: SetupPath;
  workspaceName: string;
  zip: string;
};

type PersistedApplicationDraft = Omit<ApplicationDraft, "confirmPassword" | "password">;
type ApplicationSubmitDraft = Omit<ApplicationDraft, "familyPhotoPreviewUrl" | "profilePhotoPreviewUrl">;

type JoinSubmitResponse = {
  applicationId?: string;
  emailSent?: boolean;
  emails?: {
    admin?: boolean;
    applicant?: boolean;
  };
  error?: string;
  photoStorage?: string;
  status?: string;
  workspaceHref?: string;
  workspaceId?: string;
  workspaceSlug?: string;
};

type JoinPhotoUploadResponse = {
  error?: string;
  photo?: UploadedJoinPhoto;
  storageConfigured?: boolean;
};

type StepId =
  | "account"
  | "calling"
  | "contact"
  | "household"
  | "my3"
  | "organization_interest"
  | "path"
  | "personal_finish"
  | "phone"
  | "photos"
  | "prayer"
  | "references"
  | "review"
  | "story"
  | "support"
  | "workspace";

type FlowStage = "flow" | "submitted" | "welcome";
type SaveState = "idle" | "saved" | "saving";

const draftStorageKey = "dos-unified-setup-draft-v1";
const stepStorageKey = "dos-unified-setup-step-v1";
const submittedStorageKey = "dos-unified-setup-submitted-v1";
const maxJoinPhotoSize = 5 * 1024 * 1024;
const allowedJoinPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const baseStepDefinitions: ReadonlyArray<{ id: StepId; label: string; title: string }> = [
  { id: "account", label: "Account", title: "Create your account." },
  { id: "workspace", label: "Workspace", title: "Set up your workspace." },
  { id: "path", label: "Path", title: "What are you setting up?" },
];

const usamStepDefinitions: ReadonlyArray<{ id: StepId; label: string; title: string }> = [
  { id: "story", label: "Testimony", title: "Share your story." },
  { id: "photos", label: "Photos", title: "Add profile photos." },
  { id: "prayer", label: "Prayer", title: "Prayer partners and requests." },
  { id: "support", label: "Support", title: "Monthly support." },
  { id: "references", label: "References", title: "Character References." },
  { id: "review", label: "Review", title: "Review your application." },
];

const personalStepDefinitions: ReadonlyArray<{ id: StepId; label: string; title: string }> = [
  { id: "personal_finish", label: "Finish", title: "Begin using DOS." },
];

const organizationStepDefinitions: ReadonlyArray<{ id: StepId; label: string; title: string }> = [
  { id: "organization_interest", label: "Organization", title: "Tell us about your organization." },
];

function stepDefinitionsFor(path: SetupPath) {
  if (path === "usam") {
    return [...baseStepDefinitions, ...usamStepDefinitions];
  }

  if (path === "organization") {
    return [...baseStepDefinitions, ...organizationStepDefinitions];
  }

  if (path === "personal") {
    return [...baseStepDefinitions, ...personalStepDefinitions];
  }

  return baseStepDefinitions;
}

const inputClassName = "mt-2 h-11 w-full rounded-[16px] border border-[#DCEBFF] bg-[#F8FBFF] px-3.5 text-sm font-semibold text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white";
const supportInputClassName = "mt-1.5 h-10 w-full rounded-[14px] border border-[#DCEBFF] bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-[#F8FBFF]";
const textareaClassName = "mt-2 min-h-32 w-full rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] p-3.5 text-sm leading-6 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white";
const storyTextareaClassName = "mt-2 min-h-[84px] w-full rounded-[16px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-sm leading-6 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white";
const pageShellClassName = "mx-auto flex min-h-screen w-full max-w-[960px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8";
const contentWidthClassName = "mx-auto w-full max-w-[920px]";
const joinDawnShellClassName = "bg-[radial-gradient(circle_at_78%_8%,rgba(219,234,254,0.92),transparent_34%),radial-gradient(circle_at_86%_92%,rgba(254,215,170,0.54),transparent_36%),radial-gradient(circle_at_48%_62%,rgba(221,214,254,0.48),transparent_42%),linear-gradient(135deg,#F8FBFF_0%,#F6F8FF_48%,#FFF4EC_100%)]";

type OptionElementProps = {
  children?: ReactNode;
  disabled?: boolean;
  value?: number | string;
};

function optionText(value: ReactNode) {
  return Children.toArray(value).join("");
}

const initialMy3People: My3PersonDraft[] = [];

const initialDraft: ApplicationDraft = {
  accountEmail: "",
  addressLine1: "",
  addressLine2: "",
  agreement: false,
  basedIn: "",
  callingFocus: "",
  cellPhone: "",
  city: "",
  confirmPassword: "",
  contactEmail: "",
  country: "",
  currentlyRaisingSupport: "",
  donationLinkPreference: "missionary_support",
  familyMembers: [
    {
      age: "",
      dependentStatus: "dependent",
      firstName: "",
      id: "family-initial",
      lastName: "",
      relationship: "",
    },
  ],
  familyPhotoName: "",
  familyPhotoPreviewUrl: "",
  familyPhotoUpload: null,
  firstName: "",
  fullAddress: "",
  lastName: "",
  my3People: initialMy3People,
  organizationContactEmail: "",
  organizationContactPerson: "",
  organizationMessage: "",
  organizationName: "",
  organizationType: "",
  password: "",
  prayerPartners: [
    {
      email: "",
      firstName: "",
      id: "prayer-partner-initial",
      lastName: "",
      phone: "",
      relationship: "",
    },
  ],
  polishedStoryDraft: "",
  prayerRequests: [
    {
      id: "prayer-request-initial",
      text: "",
      visibility: "prayer_team",
    },
  ],
  profilePhotoName: "",
  profilePhotoPreviewUrl: "",
  profilePhotoUpload: null,
  references: [
    {
      churchOrganization: "",
      description: "",
      email: "",
      firstName: "",
      id: "reference-initial",
      lastName: "",
      phone: "",
      relationship: "",
    },
  ],
  selectedStoryVersion: "polished",
  spouseEmail: "",
  spouseFirstName: "",
  spouseLastName: "",
  spouseName: "",
  spousePhone: "",
  state: "",
  storyCallingToward: "",
  storyDraftAccepted: false,
  storyImpact: "",
  storyJesus: "",
  storyRecentTeaching: "",
  storyTestimony: "",
  storyWhyUsam: "",
  supportBudget: {
    childrenEducation: "",
    communicationsSoftware: "",
    debtPayments: "",
    eventsGatherings: "",
    foodHousehold: "",
    givingTithe: "",
    hospitalityMeals: "",
    housing: "",
    insuranceMedical: "",
    localTravel: "",
    otherMinistryNeeds: "",
    otherPersonalNeeds: "",
    retirement: "",
    savings: "",
    trainingResources: "",
    transportation: "",
    utilities: "",
  },
  supportCoverage: "",
  supportCommittedAmount: "",
  supportGoal: "",
  supportGoalOption: "custom",
  supportMonthlyNeed: "",
  supportNeed: "yes",
  supportOtherMonthlyIncome: "",
  setupPath: "usam",
  workspaceName: "",
  zip: "",
};

function draftForPersistence(draft: ApplicationDraft): PersistedApplicationDraft {
  const { confirmPassword: _confirmPassword, password: _password, ...persistedDraft } = draft;

  // Regression guard: account passwords are intentionally excluded from every localStorage draft/submission payload.
  return persistedDraft;
}

function draftForSubmit(draft: ApplicationDraft): ApplicationSubmitDraft {
  const { familyPhotoPreviewUrl: _familyPhotoPreviewUrl, profilePhotoPreviewUrl: _profilePhotoPreviewUrl, ...submitDraft } = draft;

  return submitDraft;
}

async function createJoinPhotoPreview(file: File) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "";
  }

  const objectUrl = window.URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const previewImage = new window.Image();
      previewImage.onload = () => resolve(previewImage);
      previewImage.onerror = reject;
      previewImage.src = objectUrl;
    });
    const maxPreviewSize = 520;
    const scale = Math.min(1, maxPreviewSize / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      return "";
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } catch {
    return "";
  } finally {
    window.URL.revokeObjectURL(objectUrl);
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function normalizeSupportNeed(value: unknown): SupportNeed {
  return value === "no" ? "no" : "yes";
}

function normalizeSetupPath(value: unknown): SetupPath {
  return value === "organization" ? "organization" : "usam";
}

function donationLinkForSupportNeed(supportNeed: SupportNeed, currentChoice: unknown): DonationLinkChoice {
  if (supportNeed === "yes") {
    return "missionary_support";
  }

  return currentChoice === "none" || currentChoice === "general_usam"
    ? currentChoice
    : "general_usam";
}

function normalizePrayerRequests(value: unknown): PrayerRequestDraft[] {
  if (!Array.isArray(value) || !value.length) {
    return initialDraft.prayerRequests;
  }

  return value.map((request, index) => {
    const draftRequest = request as Partial<PrayerRequestDraft>;

    return {
      id: typeof draftRequest.id === "string" && draftRequest.id ? draftRequest.id : createId(`prayer-request-${index}`),
      text: typeof draftRequest.text === "string" ? draftRequest.text : "",
      visibility: "prayer_team",
    };
  });
}

function normalizeUploadedPhoto(value: unknown, expectedKind: PhotoKind): UploadedJoinPhoto | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Partial<UploadedJoinPhoto>;
  const size = typeof record.size === "number" && Number.isFinite(record.size) ? record.size : 0;

  if (
    record.kind !== expectedKind
    || typeof record.bucket !== "string"
    || typeof record.contentType !== "string"
    || typeof record.fileName !== "string"
    || typeof record.path !== "string"
    || size <= 0
  ) {
    return null;
  }

  return {
    bucket: record.bucket,
    contentType: record.contentType,
    fileName: record.fileName,
    kind: expectedKind,
    path: record.path,
    size,
    uploadedAt: typeof record.uploadedAt === "string" ? record.uploadedAt : undefined,
  };
}

function mergeDraft(value: Partial<ApplicationDraft> | null): ApplicationDraft {
  if (!value) {
    return initialDraft;
  }

  const { confirmPassword: _confirmPassword, password: _password, ...persistedValue } = value;
  const supportNeed = normalizeSupportNeed(value.supportNeed);
  const supportBudget = {
    ...initialDraft.supportBudget,
    ...(persistedValue.supportBudget ?? {}),
  };

  if (!supportBudget.savings && supportBudget.retirement) {
    supportBudget.savings = supportBudget.retirement;
  }

  return {
    ...initialDraft,
    ...persistedValue,
    confirmPassword: "",
    donationLinkPreference: donationLinkForSupportNeed(supportNeed, value.donationLinkPreference),
    familyMembers: Array.isArray(value.familyMembers) ? value.familyMembers : initialDraft.familyMembers,
    familyPhotoPreviewUrl: typeof value.familyPhotoPreviewUrl === "string" ? value.familyPhotoPreviewUrl : "",
    familyPhotoUpload: normalizeUploadedPhoto(value.familyPhotoUpload, "family"),
    my3People: Array.isArray(value.my3People) ? value.my3People : initialDraft.my3People,
    password: "",
    prayerPartners: Array.isArray(value.prayerPartners) && value.prayerPartners.length ? value.prayerPartners : initialDraft.prayerPartners,
    prayerRequests: normalizePrayerRequests(value.prayerRequests),
    profilePhotoPreviewUrl: typeof value.profilePhotoPreviewUrl === "string" ? value.profilePhotoPreviewUrl : "",
    profilePhotoUpload: normalizeUploadedPhoto(value.profilePhotoUpload, "profile"),
    references: Array.isArray(value.references) && value.references.length ? value.references : initialDraft.references,
    setupPath: normalizeSetupPath(value.setupPath),
    supportBudget,
    supportNeed,
  };
}

function progressPercent(stepIndex: number, totalSteps: number) {
  return Math.round(((stepIndex + 1) / totalSteps) * 100);
}

function cleanMoney(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function passwordRequirements(password: string) {
  return [
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "Includes a number",
      met: /\d/.test(password),
    },
    {
      label: "Includes uppercase or symbol",
      met: /[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password),
    },
  ];
}

function passwordStrength(password: string) {
  const score = passwordRequirements(password).filter((requirement) => requirement.met).length;

  if (score >= 3 && password.length >= 12) {
    return {
      barClassName: "bg-[#16A34A]",
      label: "Strong",
      width: "100%",
    };
  }

  if (score >= 3) {
    return {
      barClassName: "bg-[#2563EB]",
      label: "Good",
      width: "76%",
    };
  }

  if (score >= 2) {
    return {
      barClassName: "bg-[#F59E0B]",
      label: "Fair",
      width: "52%",
    };
  }

  return {
    barClassName: "bg-[#EF4444]",
    label: "Weak",
    width: password ? "28%" : "0%",
  };
}

function moneyNumber(value: string) {
  return Number(cleanMoney(value)) || 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  }).format(value);
}

const householdBudgetFields: ReadonlyArray<{ key: SupportBudgetKey; label: string }> = [
  { key: "housing", label: "Housing" },
  { key: "foodHousehold", label: "Food / household" },
  { key: "utilities", label: "Utilities" },
  { key: "transportation", label: "Transportation" },
  { key: "insuranceMedical", label: "Insurance / medical" },
  { key: "childrenEducation", label: "Children / education" },
  { key: "savings", label: "Savings / retirement" },
  { key: "otherPersonalNeeds", label: "Other" },
];

const ministryBudgetFields: ReadonlyArray<{ key: SupportBudgetKey; label: string }> = [
  { key: "hospitalityMeals", label: "Hospitality / meals" },
  { key: "localTravel", label: "Travel" },
  { key: "trainingResources", label: "Training / resources" },
  { key: "eventsGatherings", label: "Events / gatherings" },
  { key: "otherMinistryNeeds", label: "Other ministry" },
];

function supportBudgetTotal(budget: SupportBudgetDraft, fields: ReadonlyArray<{ key: SupportBudgetKey }>) {
  return fields.reduce((total, field) => total + moneyNumber(budget[field.key]), 0);
}

function supportSummary(draft: ApplicationDraft) {
  const personalTotal = supportBudgetTotal(draft.supportBudget, householdBudgetFields);
  const ministryTotal = supportBudgetTotal(draft.supportBudget, ministryBudgetFields);
  const currentCommittedSupport = moneyNumber(draft.supportCommittedAmount);
  const otherMonthlyIncome = moneyNumber(draft.supportOtherMonthlyIncome);
  const currentSupportAndIncome = currentCommittedSupport + otherMonthlyIncome;
  const estimatedGap = Math.max(0, personalTotal + ministryTotal - currentCommittedSupport - otherMonthlyIncome);
  const roundedGoal = estimatedGap > 0 ? Math.ceil(estimatedGap / 500) * 500 : 0;
  const selectedGoal = moneyNumber(draft.supportGoal);
  const suggestedGoal = selectedGoal || roundedGoal;

  return {
    currentCommittedSupport,
    currentSupportAndIncome,
    estimatedGap,
    ministryTotal,
    otherMonthlyIncome,
    personalTotal,
    roundedGoal,
    selectedGoal,
    suggestedGoal,
  };
}

function generatedWorkspaceName(draft: ApplicationDraft) {
  const firstName = draft.firstName.trim();
  const lastName = draft.lastName.trim();
  const personName = [firstName, lastName].filter(Boolean).join(" ");

  return personName || "Your DOS workspace";
}

function fieldLabel(value: string) {
  return <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#2563EB]">{value}</span>;
}

function supportFieldLabel(value: string) {
  return <span className="text-xs font-bold text-[#334155]">{value}</span>;
}

function OptionCard({
  description,
  onClick,
  selected,
  title,
}: {
  description: string;
  onClick: () => void;
  selected: boolean;
  title: string;
}) {
  return (
    <button
      className={`min-h-[78px] rounded-[18px] border p-3 text-left transition-colors sm:p-3.5 ${
        selected
          ? "border-[#2563EB] bg-[#EBF2FF] shadow-[0_16px_34px_rgba(37,99,235,0.10)] ring-2 ring-[#BFDBFE]"
          : "border-[#DCEBFF] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-black leading-5 text-[#0F172A]">{title}</span>
          <span className="mt-2 block text-xs leading-5 text-[#64748B]">{description}</span>
        </span>
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
          selected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#BFDBFE] bg-white text-transparent"
        }`}>
          ✓
        </span>
      </span>
    </button>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  label?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = useId();
  const options = Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionElementProps>(child) || child.props.value === undefined) {
      return [];
    }

    return [{
      disabled: Boolean(child.props.disabled),
      label: optionText(child.props.children) || String(child.props.value),
      value: String(child.props.value),
    }];
  });
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className="relative block"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      {label ? fieldLabel(label) : null}
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        className={`${inputClassName} flex items-center justify-between bg-white pr-4 text-left shadow-[0_8px_20px_rgba(37,99,235,0.04)]`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{selectedOption?.label ?? "Select"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#2563EB] transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[22px] border border-[#BFDBFE] bg-white p-2 shadow-[0_24px_60px_rgba(37,99,235,0.18)]"
          id={listboxId}
          role="listbox"
        >
          <div className="max-h-64 overflow-y-auto pr-1">
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  aria-selected={isSelected}
                  className={`flex min-h-11 w-full items-center justify-between rounded-[16px] px-3 text-left text-sm font-bold transition-colors ${
                    isSelected
                      ? "bg-[#EBF2FF] text-[#1D4ED8]"
                      : "text-[#0F172A] hover:bg-[#F8FBFF]"
                  } ${option.disabled ? "cursor-not-allowed opacity-45" : ""}`}
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span>{option.label}</span>
                  {isSelected ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-black text-white">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function selectedStoryText(draft: ApplicationDraft) {
  return draft.storyTestimony.trim() || draft.polishedStoryDraft.trim();
}

function sentence(value: string) {
  const trimmed = value.trim();

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function createMissionaryStoryDraft(draft: ApplicationDraft) {
  const storyJesus = draft.storyJesus.trim() || "Jesus met me through faithful people who helped me see the gospel clearly.";
  const recentTeaching = draft.storyRecentTeaching.trim() || "God has been teaching me to walk faithfully with people in ordinary, consistent ways.";
  const whyUsam = draft.storyWhyUsam.trim() || "I want to join USA Missionaries because I believe in meeting, ministering, multiplying, and making disciples.";
  const impact = draft.storyImpact.trim() || "I hope to impact the people God has placed in front of me.";
  const calling = draft.storyCallingToward.trim() || "I believe God is calling me toward deeper discipleship, prayer, and mission.";

  return [
    `My story with Jesus began here: ${storyJesus}`,
    `Recently, God has been teaching me this: ${recentTeaching}`,
    `I want to join USA Missionaries because ${whyUsam}`,
    `The people I hope to impact are ${impact}`,
    `I believe God is calling me toward this next step: ${sentence(calling)} This is the story I want my life, ministry, public profile, and support page to tell: Jesus is still meeting people, forming disciples, and sending ordinary followers to keep the mission moving.`,
  ].join("\n\n");
}

function supportNeedLabel(value: SupportNeed) {
  return {
    no: "No, I do not need personal support",
    yes: "Yes, help me estimate support",
  }[value];
}

function donationLinkLabel(value: DonationLinkChoice) {
  return {
    general_usam: "Support USA Missionaries",
    missionary_support: "Yes, for my missionary support",
    none: "No Giving Link",
  }[value];
}

const supportNeedOptions: ReadonlyArray<{ description: string; title: string; value: SupportNeed }> = [
  {
    description: "I want to estimate a monthly goal for household needs and ministry expenses.",
    title: "Yes, help me estimate support",
    value: "yes",
  },
  {
    description: "I do not need a personal support goal right now.",
    title: "No, I do not need personal support",
    value: "no",
  },
];

function donationLinkOptionsForNoSupport() {
  return [
    {
      description: "Help direct supporters toward the broader mission and underfunded missionaries.",
      title: "Support USA Missionaries",
      value: "general_usam" as const,
    },
    {
      description: "Do not display a giving option on your profile.",
      title: "No Giving Link",
      value: "none" as const,
    },
  ];
}

function autosaveLabel(saveState: SaveState, lastSavedAt: Date | null) {
  if (saveState === "saving") {
    return "Saving...";
  }

  if (!lastSavedAt) {
    return "Saved just now";
  }

  return Date.now() - lastSavedAt.getTime() < 15_000 ? "Saved just now" : "All changes saved";
}

function shouldRestartJoinFlow() {
  const searchParams = new URLSearchParams(window.location.search);

  return searchParams.has("restart") || searchParams.has("reset") || searchParams.has("fresh") || searchParams.get("demo") === "1";
}

function isSeededDraftPayload(value: string) {
  try {
    const parsed = JSON.parse(value) as { application?: Partial<ApplicationDraft> } & Partial<ApplicationDraft>;
    const possibleDraft = parsed.application ?? parsed;
    const serialized = JSON.stringify(possibleDraft).toLowerCase();
    const emailFields = [
      possibleDraft.accountEmail,
      possibleDraft.contactEmail,
      possibleDraft.organizationContactEmail,
    ].filter((field): field is string => typeof field === "string");
    const hasExampleEmail = emailFields.some((email) => email.toLowerCase().endsWith("@example.com"));
    const hasLegacySeedIds = ["my3-seed-", "family-demo-", "reference-primary", "prayer-partner-1"].some((token) => serialized.includes(token));
    const hasLegacyDemoUploads = ["-headshot.jpg", "-public-photo.jpg"].some((token) => serialized.includes(token));

    return hasExampleEmail || hasLegacySeedIds || hasLegacyDemoUploads;
  } catch {
    const normalized = value.toLowerCase();

    return normalized.includes("@example.com") || normalized.includes("my3-seed-") || normalized.includes("family-demo-");
  }
}

function ProgressStatusCard({
  compact = false,
  label,
  lastSavedAt,
  percent,
  saveState,
  subtitle,
}: {
  compact?: boolean;
  label: string;
  lastSavedAt: Date | null;
  percent: number;
  saveState: SaveState;
  subtitle: string;
}) {
  return (
    <div className={`rounded-[22px] border border-[#DCEBFF] bg-white shadow-[0_14px_40px_rgba(37,99,235,0.06)] sm:rounded-[24px] ${compact ? "p-3 sm:p-3.5" : "p-3.5 sm:p-4"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
            {percent}% complete · {label}
          </p>
          <p className={`${compact ? "mt-0.5" : "mt-1"} text-xs leading-5 text-[#64748B]`}>{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#F8FBFF] px-3 py-1.5 text-xs font-bold text-[#64748B]">
          <Save className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
          {autosaveLabel(saveState, lastSavedAt)}
        </span>
      </div>
      <div className={`${compact ? "mt-2" : "mt-3"} h-1.5 overflow-hidden rounded-full bg-[#EBF2FF]`}>
        <div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function validateStep(stepId: StepId, draft: ApplicationDraft) {
  if (stepId === "account") {
    if (!draft.accountEmail.trim()) {
      return "Add the email you will use to sign in.";
    }

    if (!draft.password.trim()) {
      return "Create a password.";
    }

    if (passwordRequirements(draft.password).some((requirement) => !requirement.met)) {
      return "Use at least 8 characters, include a number, and include uppercase or a symbol.";
    }

    if (!draft.confirmPassword.trim()) {
      return "Confirm your password.";
    }

    if (draft.password !== draft.confirmPassword) {
      return "Passwords do not match yet.";
    }
  }

  if (stepId === "workspace") {
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.contactEmail.trim() || !draft.cellPhone.trim()) {
      return "Add your name, email, and phone.";
    }

    if (!draft.city.trim() || !draft.state.trim()) {
      return "Add your city and state.";
    }
  }

  if (stepId === "path" && draft.setupPath !== "usam" && draft.setupPath !== "organization") {
    return "Choose what you are setting up.";
  }

  if (stepId === "organization_interest") {
    if (!draft.organizationName.trim() || !draft.organizationContactPerson.trim() || !draft.organizationContactEmail.trim() || !draft.organizationType.trim()) {
      return "Add the organization name, contact person, email, and type.";
    }
  }

  if (stepId === "contact") {
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      return "Add your first and last name.";
    }

    if (!draft.cellPhone.trim() || !draft.contactEmail.trim()) {
      return "Add your phone number and email.";
    }

    if (!draft.city.trim() || !draft.state.trim()) {
      return "Add your city and state.";
    }
  }

  if (stepId === "calling" && !draft.callingFocus.trim()) {
    return "Share why you feel called to USA Missionaries.";
  }

  if (stepId === "story" && (!draft.storyDraftAccepted || !draft.storyTestimony.trim())) {
    return "Create and accept your missionary story draft.";
  }

  if (stepId === "photos") {
    if (!draft.profilePhotoName.trim() || !draft.familyPhotoName.trim() || !draft.profilePhotoUpload?.path || !draft.familyPhotoUpload?.path) {
      return "Upload both a profile photo and a family / public profile photo.";
    }
  }

  if (stepId === "prayer") {
    const primaryPartner = draft.prayerPartners[0];

    if (!primaryPartner?.firstName.trim() || !primaryPartner.lastName.trim() || !primaryPartner.email.trim()) {
      return "Add at least one prayer partner with first name, last name, and email.";
    }

    if (!draft.prayerRequests.some((request) => request.text.trim())) {
      return "Add at least one prayer request.";
    }
  }

  if (stepId === "support") {
    const summary = supportSummary(draft);

    if (draft.supportNeed === "yes" && summary.selectedGoal <= 0 && summary.roundedGoal <= 0) {
      return "Add budget amounts or choose a monthly support goal.";
    }
  }

  if (stepId === "references") {
    const primaryReference = draft.references[0];

    if (!primaryReference?.firstName.trim() || !primaryReference.lastName.trim() || !primaryReference.email.trim() || !primaryReference.phone.trim() || !primaryReference.relationship.trim() || !primaryReference.description.trim()) {
      return "Add one character reference with name, email, phone, relationship, and a brief description.";
    }
  }

  if (stepId === "review" && !draft.agreement) {
    return "Confirm that USA Missionaries will review this application before anything goes public.";
  }

  return "";
}

function SectionCard({ children, eyebrow, title }: { children: ReactNode; eyebrow?: string; title?: string }) {
  return (
    <section className="rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_16px_42px_rgba(37,99,235,0.07)] sm:rounded-[24px] sm:p-4">
      {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2563EB]">{eyebrow}</p> : null}
      {title ? <h2 className={`${eyebrow ? "mt-2" : ""} text-[22px] font-black leading-tight tracking-[-0.035em] text-[#020617] sm:text-2xl`}>{title}</h2> : null}
      <div className={title || eyebrow ? "mt-3.5" : ""}>{children}</div>
    </section>
  );
}

function OnboardingFooter() {
  return (
    <footer className={`${contentWidthClassName} mt-auto py-4 text-center text-xs font-bold text-[#64748B] sm:py-5`}>
      DOS <span className="px-1.5 text-[#93C5FD]">·</span> Powered by USA Missionaries
    </footer>
  );
}

function OnboardingActionBar({
  backLabel = "Back",
  onBack,
  onPrimary,
  primaryDisabled = false,
  primaryHref,
  primaryLabel,
}: {
  backLabel?: string;
  onBack: () => void;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryHref?: string;
  primaryLabel: string;
}) {
  const primaryClassName = "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] sm:w-48";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#DCEBFF] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-18px_42px_rgba(37,99,235,0.08)] backdrop-blur sm:px-6">
      <div className={`${contentWidthClassName} grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between`}>
        <button
          className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-5 text-sm font-black text-[#0F172A] sm:w-48"
          onClick={onBack}
          type="button"
        >
          {backLabel}
        </button>
        {primaryHref ? (
          <Link className={primaryClassName} href={primaryHref}>
            {primaryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <button className={`${primaryClassName} disabled:cursor-not-allowed disabled:opacity-60`} disabled={primaryDisabled} onClick={onPrimary} type="button">
            {primaryLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

function WelcomeActionBar({
  hasSavedDraft,
  onContinueDraft,
  onStart,
}: {
  hasSavedDraft: boolean;
  onContinueDraft: () => void;
  onStart: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#DCEBFF] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-18px_42px_rgba(37,99,235,0.08)] backdrop-blur sm:px-6">
      <div className={`${contentWidthClassName} grid gap-3 ${hasSavedDraft ? "grid-cols-2 sm:flex sm:items-center sm:justify-between" : "sm:flex sm:justify-end"}`}>
        {hasSavedDraft ? (
          <button
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-5 text-sm font-black text-[#2563EB] sm:w-48"
            onClick={onContinueDraft}
            type="button"
          >
            Continue saved draft
          </button>
        ) : null}
        <button
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] sm:w-48"
          onClick={onStart}
          type="button"
        >
          Start Setup
        </button>
      </div>
    </div>
  );
}

function OnboardingFlowShell({
  backLabel,
  children,
  error,
  label,
  lastSavedAt,
  onBack,
  onPrimary,
  percent,
  primaryDisabled,
  primaryHref,
  primaryLabel,
  saveState,
  subtitle,
  title,
}: {
  backLabel?: string;
  children: ReactNode;
  error?: string;
  label: string;
  lastSavedAt: Date | null;
  onBack: () => void;
  onPrimary?: () => void;
  percent: number;
  primaryDisabled?: boolean;
  primaryHref?: string;
  primaryLabel: string;
  saveState: SaveState;
  subtitle: string;
  title?: string;
}) {
  return (
    <section className={`${contentWidthClassName} flex flex-1 flex-col pb-32`}>
      <div className="sticky top-0 z-40 bg-white/45 pb-3 pt-3 backdrop-blur-md">
        <ProgressStatusCard
          compact
          label={label}
          lastSavedAt={lastSavedAt}
          percent={percent}
          saveState={saveState}
          subtitle={subtitle}
        />
      </div>
      <div className="py-4 sm:py-5">
        {title ? (
          <div className="mb-4">
            <h1 className="text-[30px] font-black leading-[0.95] tracking-[-0.045em] text-[#020617] max-[360px]:text-[26px] sm:text-[40px]">{title}</h1>
          </div>
        ) : null}
        {children}
        {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>
      <OnboardingActionBar
        backLabel={backLabel}
        onBack={onBack}
        onPrimary={onPrimary}
        primaryDisabled={primaryDisabled}
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
      />
    </section>
  );
}

function UploadPlaceholder({
  error,
  helper,
  isUploading = false,
  label,
  name,
  onChange,
  previewUrl,
  upload,
}: {
  error?: string;
  helper?: string;
  isUploading?: boolean;
  label: string;
  name: string;
  onChange: (file: File | null) => void;
  previewUrl?: string;
  upload?: UploadedJoinPhoto | null;
}) {
  const displayName = upload?.fileName || name;

  return (
    <label className="flex h-full min-h-[252px] cursor-pointer flex-col rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-3.5 transition-colors hover:border-[#BFDBFE] hover:bg-white">
        <span className={`grid grid-cols-[44px_1fr] items-start gap-3 ${helper ? "min-h-[78px]" : ""}`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.08)]">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 pt-0.5">
            <span className="block text-sm font-black text-[#0F172A]">{label}</span>
            {helper ? <span className="mt-1 block text-xs leading-5 text-[#64748B]">{helper}</span> : null}
          </span>
        </span>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            onChange(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
          type="file"
        />
        <span className="mt-3.5 flex h-32 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-dashed border-[#BFDBFE] bg-white px-3 py-4 text-center text-sm font-semibold text-[#64748B]">
          {isUploading ? (
            <span className="font-black text-[#2563EB]">Uploading...</span>
          ) : displayName ? (
            previewUrl ? (
              <span
                aria-hidden="true"
                className="block h-full w-full rounded-[16px] bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url("${previewUrl}")` }}
              />
            ) : (
              <span>Photo selected</span>
            )
          ) : (
            <span>Choose JPG, PNG, or WebP</span>
          )}
        </span>
        {error ? (
          <span className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-2 text-xs font-bold leading-5 text-red-700">
            {error}
          </span>
        ) : null}
      </label>
  );
}

function ReviewSection({
  children,
  onEdit,
  title,
}: {
  children: ReactNode;
  onEdit: () => void;
  title: string;
}) {
  return (
    <section className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-[#0F172A]">{title}</h3>
        <button className="rounded-full border border-[#BFDBFE] bg-white px-3 py-1.5 text-xs font-black text-[#2563EB]" onClick={onEdit} type="button">
          Edit
        </button>
      </div>
      <div className="mt-3 text-sm leading-7 text-[#475569]">{children}</div>
    </section>
  );
}

export function UsamJoinClient() {
  const [draft, setDraft] = useState<ApplicationDraft>(initialDraft);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [stage, setStage] = useState<FlowStage>("welcome");
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [submittedWorkspaceHref, setSubmittedWorkspaceHref] = useState("");
  const [photoUploadState, setPhotoUploadState] = useState<Record<PhotoKind, { error: string; isUploading: boolean }>>({
    family: { error: "", isUploading: false },
    profile: { error: "", isUploading: false },
  });
  const stepDefinitions = useMemo(() => stepDefinitionsFor(draft.setupPath), [draft.setupPath]);
  const currentStep = stepDefinitions[stepIndex] ?? stepDefinitions[0];
  const currentProgress = progressPercent(Math.min(stepIndex, stepDefinitions.length - 1), stepDefinitions.length);

  function resetJoinFlow() {
    window.localStorage.removeItem(draftStorageKey);
    window.localStorage.removeItem(stepStorageKey);
    window.localStorage.removeItem(submittedStorageKey);
    window.history.replaceState(null, "", "/join");
    setDraft(initialDraft);
    setStepIndex(0);
    setStage("welcome");
    setHasSavedDraft(false);
    setSaveState("saved");
    setLastSavedAt(new Date());
    setSubmittedWorkspaceHref("");
    setError("");
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  useEffect(() => {
    if (shouldRestartJoinFlow()) {
      window.localStorage.removeItem(draftStorageKey);
      window.localStorage.removeItem(stepStorageKey);
      window.localStorage.removeItem(submittedStorageKey);
      window.history.replaceState(null, "", "/join");
      setDraft(initialDraft);
      setStepIndex(0);
      setStage("welcome");
      setHasSavedDraft(false);
      setSaveState("saved");
      setLastSavedAt(new Date());
      setHasLoadedDraft(true);
      setSubmittedWorkspaceHref("");

      return;
    }

    const savedDraft = window.localStorage.getItem(draftStorageKey);
    const savedStepId = window.localStorage.getItem(stepStorageKey);
    const submittedDraft = window.localStorage.getItem(submittedStorageKey);

    if ((savedDraft && isSeededDraftPayload(savedDraft)) || (submittedDraft && isSeededDraftPayload(submittedDraft))) {
      window.localStorage.removeItem(draftStorageKey);
      window.localStorage.removeItem(stepStorageKey);
      window.localStorage.removeItem(submittedStorageKey);
      setDraft(initialDraft);
      setStepIndex(0);
      setStage("welcome");
      setHasSavedDraft(false);
      setSaveState("saved");
      setLastSavedAt(new Date());
      setHasLoadedDraft(true);
      setSubmittedWorkspaceHref("");

      return;
    }

    let loadedDraft = initialDraft;

    if (savedDraft) {
      try {
        loadedDraft = mergeDraft(JSON.parse(savedDraft) as Partial<ApplicationDraft>);
        setDraft(loadedDraft);
        setHasSavedDraft(true);
      } catch {
        setDraft(initialDraft);
      }
    }

    if (savedStepId) {
      const savedSteps = stepDefinitionsFor(loadedDraft.setupPath);
      const savedIndex = savedSteps.findIndex((step) => step.id === savedStepId);

      if (savedIndex >= 0) {
        setStepIndex(savedIndex);
        setStage(submittedDraft ? "submitted" : "flow");
      }
    }

    if (submittedDraft) {
      try {
        const submitted = JSON.parse(submittedDraft) as { workspaceHref?: string };

        setSubmittedWorkspaceHref(typeof submitted.workspaceHref === "string" ? submitted.workspaceHref : "");
      } catch {
        setSubmittedWorkspaceHref("");
      }

      setStage("submitted");
    }

    setHasLoadedDraft(true);
  }, []);

  useEffect(() => {
    setStepIndex((current) => Math.min(current, stepDefinitions.length - 1));
  }, [stepDefinitions.length]);

  useEffect(() => {
    if (!hasLoadedDraft || stage === "welcome") {
      return;
    }

    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draftForPersistence(draft)));
      window.localStorage.setItem(stepStorageKey, currentStep.id);
      setHasSavedDraft(true);
      setSaveState("saved");
      setLastSavedAt(new Date());
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentStep.id, draft, hasLoadedDraft, stage]);

  function updateDraft(patch: Partial<ApplicationDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function uploadJoinPhoto(kind: PhotoKind, file: File | null) {
    if (!file) {
      return;
    }

    if (!allowedJoinPhotoTypes.has(file.type)) {
      setPhotoUploadState((current) => ({
        ...current,
        [kind]: { error: "Use a JPG, PNG, or WebP image.", isUploading: false },
      }));
      return;
    }

    if (file.size <= 0 || file.size > maxJoinPhotoSize) {
      setPhotoUploadState((current) => ({
        ...current,
        [kind]: { error: "Use an image smaller than 5 MB.", isUploading: false },
      }));
      return;
    }

    setError("");
    setPhotoUploadState((current) => ({
      ...current,
      [kind]: { error: "", isUploading: true },
    }));

    const previewUrl = await createJoinPhotoPreview(file);
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    try {
      const response = await fetch("/api/join/photos", {
        body: formData,
        method: "POST",
      });
      const result = await response.json() as JoinPhotoUploadResponse;

      if (!response.ok || !result.photo) {
        setPhotoUploadState((current) => ({
          ...current,
          [kind]: { error: result.error ?? "Unable to upload that photo right now.", isUploading: false },
        }));
        return;
      }

      updateDraft(kind === "profile"
        ? {
          profilePhotoName: result.photo.fileName,
          profilePhotoPreviewUrl: previewUrl,
          profilePhotoUpload: result.photo,
        }
        : {
          familyPhotoName: result.photo.fileName,
          familyPhotoPreviewUrl: previewUrl,
          familyPhotoUpload: result.photo,
        });
      setPhotoUploadState((current) => ({
        ...current,
        [kind]: { error: "", isUploading: false },
      }));
    } catch {
      setPhotoUploadState((current) => ({
        ...current,
        [kind]: { error: "Unable to upload that photo right now.", isUploading: false },
      }));
    }
  }

  function startFlow(stepId: StepId = "account") {
    const targetIndex = stepDefinitions.findIndex((step) => step.id === stepId);

    setStage("flow");
    setError("");
    setStepIndex(targetIndex >= 0 ? targetIndex : 0);
  }

  function goToStep(stepId: StepId) {
    const targetIndex = stepDefinitions.findIndex((step) => step.id === stepId);

    if (targetIndex >= 0) {
      setStage("flow");
      setStepIndex(targetIndex);
      setError("");
      window.scrollTo({ behavior: "smooth", top: 0 });
    }
  }

  function next() {
    const validationError = validateStep(currentStep.id, draft);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStepIndex((current) => Math.min(current + 1, stepDefinitions.length - 1));
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function back() {
    setError("");

    if (stepIndex === 0) {
      setStage("welcome");
      window.scrollTo({ behavior: "smooth", top: 0 });
      return;
    }

    setStepIndex((current) => current - 1);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function backFromSubmitted() {
    setStage("flow");
    setError("");
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function updateMy3Person(id: string, patch: Partial<My3PersonDraft>) {
    updateDraft({
      my3People: draft.my3People.map((person) => person.id === id ? { ...person, ...patch } : person),
    });
  }

  function addFamilyMember() {
    updateDraft({
      familyMembers: [
        ...draft.familyMembers,
        {
          age: "",
          dependentStatus: "dependent",
          firstName: "",
          id: createId("family"),
          lastName: "",
          relationship: "",
        },
      ],
    });
  }

  function updateFamilyMember(id: string, patch: Partial<FamilyMemberDraft>) {
    updateDraft({
      familyMembers: draft.familyMembers.map((member) => member.id === id ? { ...member, ...patch } : member),
    });
  }

  function removeFamilyMember(id: string) {
    updateDraft({
      familyMembers: draft.familyMembers.filter((member) => member.id !== id),
    });
  }

  function updatePrayerPartner(id: string, patch: Partial<PrayerPartnerDraft>) {
    updateDraft({
      prayerPartners: draft.prayerPartners.map((partner) => partner.id === id ? { ...partner, ...patch } : partner),
    });
  }

  function addPrayerPartner() {
    updateDraft({
      prayerPartners: [
        ...draft.prayerPartners,
        {
          email: "",
          firstName: "",
          id: createId("prayer-partner"),
          lastName: "",
          phone: "",
          relationship: "",
        },
      ],
    });
  }

  function removePrayerPartner(id: string) {
    updateDraft({
      prayerPartners: draft.prayerPartners.filter((partner) => partner.id !== id),
    });
  }

  function updatePrayerRequest(id: string, patch: Partial<PrayerRequestDraft>) {
    updateDraft({
      prayerRequests: draft.prayerRequests.map((request) => request.id === id ? { ...request, ...patch, visibility: "prayer_team" } : request),
    });
  }

  function addPrayerRequest() {
    updateDraft({
      prayerRequests: [
        ...draft.prayerRequests,
        {
          id: createId("prayer-request"),
          text: "",
          visibility: "prayer_team",
        },
      ],
    });
  }

  function removePrayerRequest(id: string) {
    updateDraft({
      prayerRequests: draft.prayerRequests.filter((request) => request.id !== id),
    });
  }

  function updateSupportBudget(key: SupportBudgetKey, value: string) {
    const nextBudget = {
      ...draft.supportBudget,
      [key]: cleanMoney(value),
    };
    const nextMonthlyNeed = supportBudgetTotal(nextBudget, householdBudgetFields) + supportBudgetTotal(nextBudget, ministryBudgetFields);

    updateDraft({
      supportBudget: nextBudget,
      supportMonthlyNeed: String(nextMonthlyNeed),
    });
  }

  function selectSupportNeed(value: SupportNeed) {
    updateDraft(value === "yes"
      ? {
        donationLinkPreference: "missionary_support",
        supportNeed: "yes",
      }
      : {
        donationLinkPreference: donationLinkForSupportNeed("no", draft.donationLinkPreference),
        supportGoal: "",
        supportGoalOption: "custom",
        supportMonthlyNeed: "",
        supportNeed: "no",
      });
  }

  function addReference() {
    updateDraft({
      references: [
        ...draft.references,
        {
          churchOrganization: "",
          description: "",
          email: "",
          firstName: "",
          id: createId("reference"),
          lastName: "",
          phone: "",
          relationship: "",
        },
      ],
    });
  }

  function updateReference(id: string, patch: Partial<ReferenceDraft>) {
    updateDraft({
      references: draft.references.map((reference) => reference.id === id ? { ...reference, ...patch } : reference),
    });
  }

  function removeReference(id: string) {
    updateDraft({
      references: draft.references.filter((reference) => reference.id !== id),
    });
  }

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const validationError = validateStep(currentStep.id, draft);

    if (validationError) {
      setError(validationError);
      return;
    }

    const submittedStatus = draft.setupPath === "usam"
      ? "pending_review"
      : draft.setupPath === "organization"
        ? "organization_interest_submitted"
        : "dos_ready";
    const submittedSupportSummary = supportSummary(draft);
    const submittedSupportGoal = submittedSupportSummary.selectedGoal > 0
      ? draft.supportGoal.trim()
      : String(submittedSupportSummary.roundedGoal);
    const applicationDraft: ApplicationDraft = {
      ...draft,
      donationLinkPreference: donationLinkForSupportNeed(draft.supportNeed, draft.donationLinkPreference),
      prayerRequests: draft.prayerRequests.map((request) => ({
        ...request,
        visibility: "prayer_team" as const,
      })),
      supportGoal: draft.supportNeed === "yes" ? submittedSupportGoal : "",
      supportMonthlyNeed: draft.supportNeed === "yes" ? String(submittedSupportSummary.personalTotal + submittedSupportSummary.ministryTotal) : "",
      workspaceName: generatedWorkspaceName(draft),
    };
    const persistedApplicationDraft = draftForPersistence(applicationDraft);
    const applicationSubmitDraft = draftForSubmit(applicationDraft);

    if (applicationDraft.setupPath === "usam") {
      setIsSubmitting(true);
      setError("");

      try {
        const response = await fetch("/api/join/submit", {
          body: JSON.stringify({
            ...applicationSubmitDraft,
            selectedPath: "usam",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const result = await response.json() as JoinSubmitResponse;

        if (!response.ok) {
          setError(result.error ?? "Unable to submit the application right now.");
          return;
        }

        const submittedDraft = {
          application: persistedApplicationDraft,
          applicationId: result.applicationId ?? null,
          persistence: {
            apiEndpoint: "/api/join/submit",
            fallback: false,
            photoStorage: result.photoStorage ?? "supabase_storage",
            schemaVersion: 1,
            table: "usam_missionary_applications",
          },
          status: result.status ?? "pending_review",
          submittedAt: new Date().toISOString(),
          workspaceHref: result.workspaceHref ?? "",
          workspaceId: result.workspaceId ?? "",
          workspaceSlug: result.workspaceSlug ?? "",
        };

        window.localStorage.setItem(draftStorageKey, JSON.stringify(persistedApplicationDraft));
        window.localStorage.setItem(submittedStorageKey, JSON.stringify(submittedDraft));
        window.localStorage.setItem(stepStorageKey, currentStep.id);
        setDraft({ ...applicationDraft, confirmPassword: "", password: "" });
        setSubmittedWorkspaceHref(result.workspaceHref ?? "");
        setStage("submitted");
        setSaveState("saved");
        setLastSavedAt(new Date());
        setError("");
        window.scrollTo({ behavior: "smooth", top: 0 });
      } catch {
        setError("Unable to submit the application right now. Please try again.");
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const submittedDraft = {
      application: persistedApplicationDraft,
      persistence: {
        fallback: "localStorage",
        // TODO: Wire organization-interest persistence, applicant confirmation email, admin notification email, approval email, request-more-info email, and Supabase Storage uploads.
        futureSupabaseTable: applicationDraft.setupPath === "organization" ? "organization_interests" : "dos_workspace_setups",
        schemaVersion: 1,
      },
      status: submittedStatus,
      submittedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(draftStorageKey, JSON.stringify(persistedApplicationDraft));
    window.localStorage.setItem(submittedStorageKey, JSON.stringify(submittedDraft));
    window.localStorage.setItem(stepStorageKey, currentStep.id);
    setDraft({ ...applicationDraft, confirmPassword: "", password: "" });
    setStage("submitted");
    setError("");
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function renderStep() {
    if (currentStep.id === "account") {
      const requirements = passwordRequirements(draft.password);
      const strength = passwordStrength(draft.password);
      const hasPassword = draft.password.length > 0;
      const hasConfirmPassword = draft.confirmPassword.length > 0;
      const passwordsDoNotMatch = hasConfirmPassword && draft.password !== draft.confirmPassword;

      return (
        <SectionCard eyebrow="Account" title="Create your account">
          <div className="grid gap-3">
            <label className="block">
              {fieldLabel("Email")}
              <input className={inputClassName} onChange={(event) => updateDraft({ accountEmail: event.target.value, contactEmail: event.target.value })} required type="email" value={draft.accountEmail} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="block">
                {fieldLabel("Password")}
                <div className="relative">
                  <input
                    className={`${inputClassName} pr-20`}
                    onChange={(event) => updateDraft({ password: event.target.value })}
                    required
                    type={showPassword ? "text" : "password"}
                    value={draft.password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-full px-2.5 text-xs font-black text-[#2563EB] hover:bg-white"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="block">
                {fieldLabel("Confirm password")}
                <div className="relative">
                  <input
                    className={`${inputClassName} pr-20 ${passwordsDoNotMatch ? "border-red-300 bg-red-50 focus:border-red-400 focus:bg-white" : ""}`}
                    onChange={(event) => updateDraft({ confirmPassword: event.target.value })}
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    value={draft.confirmPassword}
                  />
                  <button
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-2 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1.5 rounded-full px-2.5 text-xs font-black text-[#2563EB] hover:bg-white"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    type="button"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {passwordsDoNotMatch ? (
                  <p className="mt-2 rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    Passwords do not match yet.
                  </p>
                ) : hasConfirmPassword && draft.password === draft.confirmPassword ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#166534]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
                    Passwords match.
                  </p>
                ) : null}
              </div>
            </div>
            {hasPassword ? (
              <div className="rounded-[18px] border border-[#EAF2FF] bg-[#F8FBFF] p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] sm:items-center">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black text-[#0F172A]">Strength: {strength.label}</p>
                      <p className="text-[11px] font-bold text-[#64748B]">{requirements.filter((requirement) => requirement.met).length}/3</p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
                      <div className={`h-full rounded-full transition-all ${strength.barClassName}`} style={{ width: strength.width }} />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    {requirements.map((requirement) => (
                      <div className={`flex items-center gap-2 text-xs font-bold ${requirement.met ? "text-[#166534]" : "text-[#64748B]"}`} key={requirement.label}>
                        <CheckCircle2 className={`h-3.5 w-3.5 ${requirement.met ? "text-[#16A34A]" : "text-[#CBD5E1]"}`} aria-hidden="true" />
                        {requirement.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-sm leading-6 text-[#334155]">
              <p className="font-bold text-[#0F172A]">Account setup pending activation.</p>
              <p className="mt-1 text-[#334155]">Your account will be activated after your application is submitted and reviewed.</p>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "workspace") {
      return (
        <SectionCard>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <label className="block lg:col-span-3">
                {fieldLabel("First name")}
                <input className={inputClassName} onChange={(event) => updateDraft({ firstName: event.target.value })} required value={draft.firstName} />
              </label>
              <label className="block lg:col-span-3">
                {fieldLabel("Last name")}
                <input className={inputClassName} onChange={(event) => updateDraft({ lastName: event.target.value })} required value={draft.lastName} />
              </label>
              <label className="block lg:col-span-3">
                {fieldLabel("Email")}
                <input className={inputClassName} onChange={(event) => updateDraft({ contactEmail: event.target.value, accountEmail: event.target.value })} required type="email" value={draft.contactEmail} />
              </label>
              <label className="block lg:col-span-3">
                {fieldLabel("Phone")}
                <input className={inputClassName} onChange={(event) => updateDraft({ cellPhone: event.target.value })} required type="tel" value={draft.cellPhone} />
              </label>
              <label className="block sm:col-span-2 lg:col-span-6">
                {fieldLabel("Street address optional")}
                <input className={inputClassName} onChange={(event) => updateDraft({ addressLine1: event.target.value, fullAddress: event.target.value })} value={draft.addressLine1 || draft.fullAddress} />
              </label>
              <label className="block lg:col-span-3">
                {fieldLabel("City")}
                <input className={inputClassName} onChange={(event) => updateDraft({ city: event.target.value })} required value={draft.city} />
              </label>
              <label className="block lg:col-span-1">
                {fieldLabel("State")}
                <input className={inputClassName} maxLength={2} onChange={(event) => updateDraft({ state: event.target.value.toUpperCase() })} required value={draft.state} />
              </label>
              <label className="block lg:col-span-2">
                {fieldLabel("ZIP optional")}
                <input className={inputClassName} onChange={(event) => updateDraft({ zip: event.target.value })} value={draft.zip} />
              </label>
            </div>

            <div className="space-y-2">
              {fieldLabel("Spouse")}
              <div className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3">
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    {fieldLabel("First name")}
                    <input
                      className={inputClassName}
                      onChange={(event) => updateDraft({
                        spouseFirstName: event.target.value,
                        spouseName: [event.target.value, draft.spouseLastName].filter(Boolean).join(" "),
                      })}
                      value={draft.spouseFirstName}
                    />
                  </label>
                  <label className="block">
                    {fieldLabel("Last name")}
                    <input
                      className={inputClassName}
                      onChange={(event) => updateDraft({
                        spouseLastName: event.target.value,
                        spouseName: [draft.spouseFirstName, event.target.value].filter(Boolean).join(" "),
                      })}
                      value={draft.spouseLastName}
                    />
                  </label>
                  <label className="block">
                    {fieldLabel("Email")}
                    <input className={inputClassName} onChange={(event) => updateDraft({ spouseEmail: event.target.value })} type="email" value={draft.spouseEmail} />
                  </label>
                  <label className="block">
                    {fieldLabel("Phone")}
                    <input className={inputClassName} onChange={(event) => updateDraft({ spousePhone: event.target.value })} type="tel" value={draft.spousePhone} />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {fieldLabel("Children")}
              {draft.familyMembers.length ? (
                <div className="space-y-2.5">
                  {draft.familyMembers.map((member, index) => (
                    <div className="relative rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] p-2.5 pr-9 sm:p-3 sm:pr-10" key={member.id}>
                      <button aria-label={`Remove child ${index + 1}`} className="absolute right-2 top-2 rounded-full p-1.5 text-[#94A3B8] hover:bg-white hover:text-red-600" onClick={() => removeFamilyMember(member.id)} type="button">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_74px_1fr_140px]">
                        <label className="block">
                          {fieldLabel("First name")}
                          <input className={inputClassName} onChange={(event) => updateFamilyMember(member.id, { firstName: event.target.value })} value={member.firstName} />
                        </label>
                        <label className="block">
                          {fieldLabel("Last name")}
                          <input className={inputClassName} onChange={(event) => updateFamilyMember(member.id, { lastName: event.target.value })} value={member.lastName} />
                        </label>
                        <label className="block">
                          {fieldLabel("Age")}
                          <input className={inputClassName} onChange={(event) => updateFamilyMember(member.id, { age: event.target.value })} value={member.age} />
                        </label>
                        <label className="block">
                          {fieldLabel("Relationship")}
                          <input className={inputClassName} onChange={(event) => updateFamilyMember(member.id, { relationship: event.target.value })} value={member.relationship} />
                        </label>
                        <SelectField label="Status" onChange={(value) => updateFamilyMember(member.id, { dependentStatus: value as DependentStatus })} value={member.dependentStatus}>
                          <option value="dependent">Dependent</option>
                          <option value="independent">Independent</option>
                        </SelectField>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#64748B]">
                  You can skip this and add children later.
                </p>
              )}
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-black text-[#2563EB]" onClick={addFamilyMember} type="button">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add child
              </button>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "my3") {
      return (
        <SectionCard eyebrow="My 3" title="Start with three people">
          <div className="space-y-3">
            <p className="text-sm leading-7 text-[#64748B]">
              Add the first three people you want to steward in DOS. You can edit these later.
            </p>
            {draft.my3People.map((person, index) => (
              <div className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3" key={person.id}>
                <p className="text-sm font-black text-[#0F172A]">Person {index + 1}</p>
                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    {fieldLabel("Name")}
                    <input className={inputClassName} onChange={(event) => updateMy3Person(person.id, { name: event.target.value })} value={person.name} />
                  </label>
                  <label className="block">
                    {fieldLabel("Phone optional")}
                    <input className={inputClassName} onChange={(event) => updateMy3Person(person.id, { phone: event.target.value })} type="tel" value={person.phone} />
                  </label>
                  <label className="block">
                    {fieldLabel("Email optional")}
                    <input className={inputClassName} onChange={(event) => updateMy3Person(person.id, { email: event.target.value })} type="email" value={person.email} />
                  </label>
                  <SelectField label="Relationship" onChange={(value) => updateMy3Person(person.id, { relationshipContext: value as RelationshipContextValue })} value={person.relationshipContext}>
                    {relationshipContextOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                  <SelectField label="Role" onChange={(value) => updateMy3Person(person.id, { roleInMyLife: value as RoleInMyLifeValue })} value={person.roleInMyLife}>
                    {roleInMyLifeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </SelectField>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "path") {
      const pathOptions: Array<{ description: string; label: string; value: SetupPath }> = [
        {
          description: "For invited missionary candidates completing their USA Missionaries onboarding, profile, prayer, support, and review process.",
          label: "Complete USA Missionaries Setup",
          value: "usam",
        },
        {
          description: "For church, ministry, or team leaders interested in setting up DOS for their organization.",
          label: "Bring DOS to My Organization",
          value: "organization",
        },
      ];

      return (
        <SectionCard eyebrow="Path" title="What are you setting up?">
          <div className="space-y-3">
            <p className="text-sm leading-6 text-[#475569]">Choose the path that matches your invitation.</p>
            <div className="grid gap-3 md:grid-cols-2">
            {pathOptions.map((option) => (
              <OptionCard
                description={option.description}
                key={option.value}
                onClick={() => updateDraft({ setupPath: option.value })}
                selected={draft.setupPath === option.value}
                title={option.label}
              />
            ))}
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "personal_finish") {
      return (
        <SectionCard eyebrow="DOS" title="Your DOS setup is ready">
          <div className="space-y-3 text-sm leading-6 text-[#475569]">
            <p>Your workspace is ready. DOS will help you identify relationships, choose circles, pray, meet, and follow up once you enter.</p>
            <div className="grid gap-2">
              <div className="rounded-2xl bg-[#F8FBFF] px-3 py-2"><span className="font-black text-[#0F172A]">Workspace:</span> {generatedWorkspaceName(draft)}</div>
              <div className="rounded-2xl bg-[#F8FBFF] px-3 py-2"><span className="font-black text-[#0F172A]">Path:</span> Use DOS personally</div>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "organization_interest") {
      return (
        <SectionCard eyebrow="Organization Interest" title="Tell us about your organization">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              {fieldLabel("Organization name")}
              <input className={inputClassName} onChange={(event) => updateDraft({ organizationName: event.target.value })} required value={draft.organizationName} />
            </label>
            <label className="block">
              {fieldLabel("Contact person")}
              <input className={inputClassName} onChange={(event) => updateDraft({ organizationContactPerson: event.target.value })} required value={draft.organizationContactPerson} />
            </label>
            <label className="block">
              {fieldLabel("Email")}
              <input className={inputClassName} onChange={(event) => updateDraft({ organizationContactEmail: event.target.value })} required type="email" value={draft.organizationContactEmail} />
            </label>
            <SelectField label="Church / ministry type" onChange={(value) => updateDraft({ organizationType: value })} value={draft.organizationType}>
              <option value="Church / ministry">Church / ministry</option>
              <option value="Mission organization">Mission organization</option>
              <option value="Small group network">Small group network</option>
              <option value="Nonprofit">Nonprofit</option>
              <option value="Other">Other</option>
            </SelectField>
            <label className="block sm:col-span-2">
              {fieldLabel("Message")}
              <textarea className={textareaClassName} onChange={(event) => updateDraft({ organizationMessage: event.target.value })} placeholder="Tell us what you are hoping to set up." value={draft.organizationMessage} />
            </label>
            <p className="sm:col-span-2 rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#64748B]">
              Organization setup is coming soon. This submits interest only and keeps your personal DOS setup ready.
            </p>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "contact") {
      return (
        <SectionCard eyebrow="Contact/Profile" title="Contact and profile information">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              {fieldLabel("First name")}
              <input className={inputClassName} onChange={(event) => updateDraft({ firstName: event.target.value })} required value={draft.firstName} />
            </label>
            <label className="block">
              {fieldLabel("Last name")}
              <input className={inputClassName} onChange={(event) => updateDraft({ lastName: event.target.value })} required value={draft.lastName} />
            </label>
            <label className="block">
              {fieldLabel("Cell phone")}
              <input className={inputClassName} onChange={(event) => updateDraft({ cellPhone: event.target.value })} required type="tel" value={draft.cellPhone} />
            </label>
            <label className="block">
              {fieldLabel("Email")}
              <input className={inputClassName} onChange={(event) => updateDraft({ contactEmail: event.target.value })} required type="email" value={draft.contactEmail} />
            </label>
            <label className="block sm:col-span-2">
              {fieldLabel("Spouse name if applicable")}
              <input className={inputClassName} onChange={(event) => updateDraft({ spouseName: event.target.value })} value={draft.spouseName} />
            </label>
            <label className="block sm:col-span-2">
              {fieldLabel("Street address optional")}
              <input className={inputClassName} onChange={(event) => updateDraft({ fullAddress: event.target.value })} value={draft.fullAddress} />
            </label>
            <label className="block">
              {fieldLabel("City")}
              <input className={inputClassName} onChange={(event) => updateDraft({ city: event.target.value })} required value={draft.city} />
            </label>
            <label className="block">
              {fieldLabel("State")}
              <input className={inputClassName} onChange={(event) => updateDraft({ state: event.target.value })} required value={draft.state} />
            </label>
            <label className="block">
              {fieldLabel("ZIP optional")}
              <input className={inputClassName} onChange={(event) => updateDraft({ zip: event.target.value })} value={draft.zip} />
            </label>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "household") {
      return (
        <SectionCard eyebrow="Household" title="Your family is part of your field">
          <div className="space-y-4">
            <p className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-sm leading-6 text-[#475569]">
              Your family is part of your field. These people can be added to your DOS contacts and organized into your discipleship circles later: My 3, My 12, My 70, or My 120.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                {fieldLabel("Spouse first name")}
                <input className={inputClassName} onChange={(event) => updateDraft({ spouseFirstName: event.target.value })} value={draft.spouseFirstName} />
              </label>
              <label className="block">
                {fieldLabel("Spouse last name")}
                <input className={inputClassName} onChange={(event) => updateDraft({ spouseLastName: event.target.value })} value={draft.spouseLastName} />
              </label>
              <label className="block">
                {fieldLabel("Spouse email optional")}
                <input className={inputClassName} onChange={(event) => updateDraft({ spouseEmail: event.target.value })} type="email" value={draft.spouseEmail} />
              </label>
              <label className="block">
                {fieldLabel("Spouse phone optional")}
                <input className={inputClassName} onChange={(event) => updateDraft({ spousePhone: event.target.value })} type="tel" value={draft.spousePhone} />
              </label>
            </div>
            <div className="space-y-3">
              {draft.familyMembers.map((member, index) => (
                <div className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3" key={member.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#0F172A]">Family member {index + 1}</p>
                    <button aria-label="Remove family member" className="rounded-full p-2 text-[#64748B] hover:bg-white hover:text-red-600" onClick={() => removeFamilyMember(member.id)} type="button">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                    <input className={inputClassName} onChange={(event) => updateFamilyMember(member.id, { firstName: event.target.value })} placeholder="First name" value={member.firstName} />
                    <input className={inputClassName} onChange={(event) => updateFamilyMember(member.id, { lastName: event.target.value })} placeholder="Last name" value={member.lastName} />
                    <input className={inputClassName} onChange={(event) => updateFamilyMember(member.id, { age: event.target.value })} placeholder="Age optional" value={member.age} />
                    <input className={inputClassName} onChange={(event) => updateFamilyMember(member.id, { relationship: event.target.value })} placeholder="Relationship" value={member.relationship} />
                    <SelectField onChange={(value) => updateFamilyMember(member.id, { dependentStatus: value as DependentStatus })} value={member.dependentStatus}>
                      <option value="dependent">Dependent</option>
                      <option value="independent">Independent</option>
                    </SelectField>
                  </div>
                </div>
              ))}
            </div>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-black text-[#2563EB]" onClick={addFamilyMember} type="button">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add another family member
            </button>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "phone") {
      return (
        <SectionCard eyebrow="Web app" title="Save DOS to your phone">
          <div className="space-y-3">
            <div className="flex min-h-36 items-center justify-center rounded-[22px] border border-dashed border-[#BFDBFE] bg-[#F8FBFF] text-center">
              <div>
                <Video className="mx-auto h-8 w-8 text-[#2563EB]" aria-hidden="true" />
                <p className="mt-3 text-sm font-black text-[#0F172A]">Tutorial: How to save DOS to your phone</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3">
                <p className="font-black text-[#0F172A]">Apple</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#475569]">
                  <li>Open this page in Safari</li>
                  <li>Tap the Share button</li>
                  <li>Tap Add to Home Screen</li>
                  <li>Tap Add</li>
                </ol>
              </div>
              <div className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3">
                <p className="font-black text-[#0F172A]">Android</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#475569]">
                  <li>Open this page in Chrome</li>
                  <li>Tap the three dot menu</li>
                  <li>Tap Add to Home screen</li>
                  <li>Tap Add</li>
                </ol>
              </div>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "calling") {
      return (
        <SectionCard eyebrow="Calling" title="Why do you feel called to USA Missionaries?">
          <p className="text-sm leading-7 text-[#64748B]">Keep this simple and honest. Tell us why this work feels timely and what field God has put on your heart.</p>
          <textarea className={`${textareaClassName} min-h-40`} onChange={(event) => updateDraft({ callingFocus: event.target.value })} value={draft.callingFocus} />
        </SectionCard>
      );
    }

    if (currentStep.id === "story") {
      return (
        <SectionCard>
          <div className="space-y-3.5">
            <p className="text-sm leading-6 text-[#334155]">
              Tell us a little about your journey. Answer a few simple questions and we&apos;ll help organize them into a clear missionary story.
            </p>

            <div className="space-y-3">
              {[
                {
                  key: "storyJesus",
                  onChange: (value: string) => updateDraft({ storyJesus: value, storyDraftAccepted: false }),
                  placeholder: "Tell us about your faith journey, salvation experience, or the people God used in your life.",
                  question: "How did you come to know Jesus?",
                  value: draft.storyJesus,
                },
                {
                  key: "storyRecentTeaching",
                  onChange: (value: string) => updateDraft({ storyRecentTeaching: value, storyDraftAccepted: false }),
                  placeholder: "Share a lesson, challenge, breakthrough, or season of growth.",
                  question: "What has God been teaching you recently?",
                  value: draft.storyRecentTeaching,
                },
                {
                  key: "storyWhyUsam",
                  onChange: (value: string) => updateDraft({ storyWhyUsam: value, storyDraftAccepted: false }),
                  placeholder: "What about the mission of meeting, ministering, multiplying, and making disciples resonates with you?",
                  question: "Why do you want to join USA Missionaries?",
                  value: draft.storyWhyUsam,
                },
                {
                  key: "storyImpact",
                  onChange: (value: string) => updateDraft({ storyImpact: value, storyDraftAccepted: false }),
                  placeholder: "Families, neighbors, young adults, church members, coworkers, a specific community, etc.",
                  question: "Who are you hoping to impact?",
                  value: draft.storyImpact,
                },
                {
                  key: "storyCallingToward",
                  onChange: (value: string) => updateDraft({ storyCallingToward: value, storyDraftAccepted: false }),
                  placeholder: "Describe any calling, burden, vision, or ministry direction you sense.",
                  question: "What do you believe God is calling you toward?",
                  value: draft.storyCallingToward,
                },
              ].map((prompt) => (
                <label className="block" key={prompt.key}>
                  <span className="block text-sm font-black text-[#0F172A]">{prompt.question}</span>
                  <textarea
                    className={storyTextareaClassName}
                    onChange={(event) => prompt.onChange(event.target.value)}
                    placeholder={prompt.placeholder}
                    value={prompt.value}
                  />
                </label>
              ))}
            </div>

            <div className="flex">
              <button
                className="h-11 w-full rounded-full bg-[#0F172A] px-5 text-sm font-black text-white sm:w-auto"
                onClick={() => updateDraft({
                  polishedStoryDraft: createMissionaryStoryDraft(draft),
                  storyDraftAccepted: false,
                  storyTestimony: "",
                })}
                type="button"
              >
                Create My Story
              </button>
            </div>

            {draft.polishedStoryDraft.trim() ? (
              <div className="space-y-2.5 border-t border-[#DCEBFF] pt-3.5">
                <p className="text-sm font-black text-[#0F172A]">Missionary Story Draft</p>
                <textarea
                  className={`${storyTextareaClassName} min-h-40 bg-white`}
                  onChange={(event) => updateDraft({
                    polishedStoryDraft: event.target.value,
                    storyDraftAccepted: false,
                  })}
                  value={draft.polishedStoryDraft}
                />
                <button
                  className="h-11 w-full rounded-full bg-[#2563EB] px-5 text-sm font-black text-white sm:w-auto"
                  onClick={() => updateDraft({
                    selectedStoryVersion: "polished",
                    storyDraftAccepted: true,
                    storyTestimony: draft.polishedStoryDraft,
                  })}
                  type="button"
                >
                  Accept Draft
                </button>
                {draft.storyDraftAccepted ? (
                  <p className="mt-2 text-xs font-bold text-[#2563EB]">Draft accepted and saved as your application story.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "photos") {
      return (
        <SectionCard eyebrow="Photos" title="Add your profile photos">
          <div className="grid gap-3 sm:grid-cols-2">
            <UploadPlaceholder
              error={photoUploadState.profile.error}
              isUploading={photoUploadState.profile.isUploading}
              label="Profile Photo"
              name={draft.profilePhotoName}
              onChange={(file) => uploadJoinPhoto("profile", file)}
              previewUrl={draft.profilePhotoPreviewUrl}
              upload={draft.profilePhotoUpload}
            />
            <UploadPlaceholder
              error={photoUploadState.family.error}
              helper="This image will be used on your public page."
              isUploading={photoUploadState.family.isUploading}
              label="Family / Public Profile Photo"
              name={draft.familyPhotoName}
              onChange={(file) => uploadJoinPhoto("family", file)}
              previewUrl={draft.familyPhotoPreviewUrl}
              upload={draft.familyPhotoUpload}
            />
          </div>
          <p className="mt-3.5 rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#64748B]">
            Photos are reviewed with your application before anything appears publicly.
          </p>
        </SectionCard>
      );
    }

    if (currentStep.id === "prayer") {
      return (
        <div className="space-y-3">
          <SectionCard>
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-black text-[#0F172A]">Add prayer partners</h2>
                <p className="mt-1 text-sm leading-6 text-[#475569]">Build the team that will pray with you as you begin.</p>
              </div>
              <div className="space-y-3">
                {draft.prayerPartners.map((partner, index) => (
                  <div className={`${index > 0 ? "border-t border-[#DCEBFF] pt-3" : ""}`} key={partner.id}>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block">
                        {fieldLabel("First name")}
                        <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { firstName: event.target.value })} value={partner.firstName} />
                      </label>
                      <label className="block">
                        {fieldLabel("Last name")}
                        <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { lastName: event.target.value })} value={partner.lastName} />
                      </label>
                      <label className="block">
                        {fieldLabel("Email")}
                        <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { email: event.target.value })} type="email" value={partner.email} />
                      </label>
                      <label className="block">
                        {fieldLabel("Phone")}
                        <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { phone: event.target.value })} type="tel" value={partner.phone} />
                      </label>
                      <label className="block sm:col-span-2 lg:col-span-4">
                        {fieldLabel("Relationship")}
                        <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { relationship: event.target.value })} value={partner.relationship} />
                      </label>
                      {index > 0 ? (
                        <div className="flex items-end sm:col-span-2 lg:col-span-4">
                          <button aria-label="Remove prayer partner" className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-black text-[#94A3B8] hover:bg-[#F8FBFF] hover:text-red-600" onClick={() => removePrayerPartner(partner.id)} type="button">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <button className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-black text-[#2563EB]" onClick={addPrayerPartner} type="button">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add prayer partner
              </button>
            </section>
          </SectionCard>

          <SectionCard>
            <section className="space-y-3">
              <div>
                <h2 className="text-base font-black text-[#0F172A]">Add prayer requests</h2>
                <p className="mt-1 text-sm leading-6 text-[#475569]">Start with the requests you want covered in prayer.</p>
              </div>
              <div className="space-y-3">
                {draft.prayerRequests.map((request, index) => (
                  <div className={`${index > 0 ? "border-t border-[#DCEBFF] pt-3" : ""}`} key={request.id}>
                    <div className="mt-2 grid gap-2">
                      <label className="block">
                        {fieldLabel("Prayer request")}
                        <textarea className={storyTextareaClassName} onChange={(event) => updatePrayerRequest(request.id, { text: event.target.value })} placeholder="How can people be praying for you?" value={request.text} />
                      </label>
                      {index > 0 ? (
                        <div className="flex items-end">
                          <button aria-label="Remove prayer request" className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-black text-[#94A3B8] hover:bg-[#F8FBFF] hover:text-red-600" onClick={() => removePrayerRequest(request.id)} type="button">
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <button className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-black text-[#2563EB]" onClick={addPrayerRequest} type="button">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add prayer request
              </button>
            </section>
          </SectionCard>
        </div>
      );
    }

    if (currentStep.id === "support") {
      const budgetSummary = supportSummary(draft);
      const donationOptions = donationLinkOptionsForNoSupport();
      const selectedDonationLink = donationLinkForSupportNeed(draft.supportNeed, draft.donationLinkPreference);

      return (
        <SectionCard title="Will you need to raise monthly support?">
          <div className="space-y-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {supportNeedOptions.map((option) => (
                <OptionCard
                  description={option.description}
                  key={option.value}
                  onClick={() => selectSupportNeed(option.value)}
                  selected={draft.supportNeed === option.value}
                  title={option.title}
                />
              ))}
            </div>
            {draft.supportNeed === "yes" ? (
              <div className="space-y-4 border-t border-[#EAF2FF] pt-4">
                <div>
                  <p className="text-sm font-black text-[#0F172A]">Budget Helper</p>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">Add simple monthly estimates. Round numbers are fine.</p>
                </div>

                <section className="space-y-2.5 rounded-[18px] border border-[#EAF2FF] bg-[#FBFDFF] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2563EB]">Step 1</p>
                    <p className="text-sm font-black text-[#0F172A]">Household needs</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {householdBudgetFields.map((field) => (
                      <label className="block" key={field.key}>
                        {supportFieldLabel(field.label)}
                        <input
                          className={supportInputClassName}
                          inputMode="decimal"
                          onChange={(event) => updateSupportBudget(field.key, event.target.value)}
                          placeholder="$0"
                          value={draft.supportBudget[field.key]}
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-2.5 rounded-[18px] border border-[#EAF2FF] bg-[#FBFDFF] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2563EB]">Step 2</p>
                    <p className="text-sm font-black text-[#0F172A]">Ministry needs</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ministryBudgetFields.map((field) => (
                      <label className="block" key={field.key}>
                        {supportFieldLabel(field.label)}
                        <input
                          className={supportInputClassName}
                          inputMode="decimal"
                          onChange={(event) => updateSupportBudget(field.key, event.target.value)}
                          placeholder="$0"
                          value={draft.supportBudget[field.key]}
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-2.5 rounded-[18px] border border-[#EAF2FF] bg-[#FBFDFF] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#2563EB]">Step 3</p>
                    <p className="text-sm font-black text-[#0F172A]">Current support</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      {supportFieldLabel("Current monthly committed support")}
                      <input className={supportInputClassName} inputMode="decimal" onChange={(event) => updateDraft({ supportCommittedAmount: cleanMoney(event.target.value) })} placeholder="$0" value={draft.supportCommittedAmount} />
                    </label>
                    <label className="block">
                      {supportFieldLabel("Other monthly income")}
                      <input className={supportInputClassName} inputMode="decimal" onChange={(event) => updateDraft({ supportOtherMonthlyIncome: cleanMoney(event.target.value) })} placeholder="$0" value={draft.supportOtherMonthlyIncome} />
                    </label>
                  </div>
                </section>

                <section className="rounded-[22px] border border-[#BFDBFE] bg-white p-4 shadow-[0_16px_34px_rgba(37,99,235,0.08)]">
                  <p className="text-sm font-black text-[#0F172A]">Estimated Monthly Support Goal</p>
                  <p className="mt-2 text-[34px] font-black tracking-[-0.045em] text-[#0F172A]">
                    {formatMoney(budgetSummary.suggestedGoal)}
                    <span className="text-base tracking-normal text-[#64748B]">/mo</span>
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-[#475569]">
                    <div className="flex items-center justify-between gap-3">
                      <span>Household needs</span>
                      <span className="font-bold text-[#0F172A]">{formatMoney(budgetSummary.personalTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Ministry needs</span>
                      <span className="font-bold text-[#0F172A]">{formatMoney(budgetSummary.ministryTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Current support/income</span>
                      <span className="font-bold text-[#0F172A]">-{formatMoney(budgetSummary.currentSupportAndIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#EAF2FF] pt-2">
                      <span>Estimated gap</span>
                      <span className="font-bold text-[#0F172A]">{formatMoney(budgetSummary.estimatedGap)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Suggested rounded goal</span>
                      <span className="font-black text-[#2563EB]">{formatMoney(budgetSummary.roundedGoal)}</span>
                    </div>
                  </div>
                </section>

                <section className="space-y-2.5">
                  <p className="text-sm font-black text-[#0F172A]">Choose a support goal to submit.</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[
                      ["1000", "$1,000"],
                      ["2500", "$2,500"],
                      ["3500", "$3,500"],
                      ["5000", "$5,000"],
                      ["custom", "Custom"],
                    ].map(([value, label]) => (
                      <button
                        className={`rounded-[14px] border px-3 py-2.5 text-xs font-black ${draft.supportGoalOption === value ? "border-[#2563EB] bg-[#2563EB] text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]" : "border-[#DCEBFF] bg-white text-[#0F172A]"}`}
                        key={value}
                        onClick={() => updateDraft({
                          supportGoal: value === "custom" ? draft.supportGoal : value,
                          supportGoalOption: value as SupportGoalOption,
                        })}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {draft.supportGoalOption === "custom" ? (
                    <label className="block">
                      {supportFieldLabel("Custom monthly support goal")}
                      <input className={supportInputClassName} inputMode="decimal" onChange={(event) => updateDraft({ supportGoal: cleanMoney(event.target.value) })} placeholder="Custom monthly amount" value={draft.supportGoal} />
                    </label>
                  ) : null}
                </section>

                <p className="rounded-[16px] border border-[#EAF2FF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#64748B]">
                  10% of donations are allocated to USA Missionaries operational overhead / general fund.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 border-t border-[#EAF2FF] pt-4">
                <div>
                  <p className="text-sm font-black text-[#0F172A]">No personal support needed.</p>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">
                    Since you are already funded, choose whether your public profile should include a giving option.
                  </p>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {donationOptions.map((option) => (
                    <OptionCard
                      description={option.description}
                      key={option.value}
                      onClick={() => updateDraft({ donationLinkPreference: option.value })}
                      selected={selectedDonationLink === option.value}
                      title={option.title}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "references") {
      return (
        <SectionCard>
          <div className="space-y-3">
            <p className="text-sm leading-6 text-[#475569]">
              If we reached out, who could speak into your life, character, calling, and discipleship?
            </p>
            {draft.references.map((reference, index) => (
              <div className={`${index > 0 ? "border-t border-[#DCEBFF] pt-3" : ""}`} key={reference.id}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    {fieldLabel("First Name")}
                    <input className={inputClassName} onChange={(event) => updateReference(reference.id, { firstName: event.target.value })} value={reference.firstName} />
                  </label>
                  <label className="block">
                    {fieldLabel("Last Name")}
                    <input className={inputClassName} onChange={(event) => updateReference(reference.id, { lastName: event.target.value })} value={reference.lastName} />
                  </label>
                  <label className="block">
                    {fieldLabel("Email")}
                    <input className={inputClassName} onChange={(event) => updateReference(reference.id, { email: event.target.value })} type="email" value={reference.email} />
                  </label>
                  <label className="block">
                    {fieldLabel("Phone")}
                    <input className={inputClassName} onChange={(event) => updateReference(reference.id, { phone: event.target.value })} value={reference.phone} />
                  </label>
                  <label className="block">
                    {fieldLabel("Relationship")}
                    <input className={inputClassName} onChange={(event) => updateReference(reference.id, { relationship: event.target.value })} value={reference.relationship} />
                  </label>
                  <label className="block">
                    {fieldLabel("Church / Organization")}
                    <input className={inputClassName} onChange={(event) => updateReference(reference.id, { churchOrganization: event.target.value })} value={reference.churchOrganization} />
                  </label>
                  <label className="block sm:col-span-2">
                    {fieldLabel("Why can this person speak into your life?")}
                    <textarea className={storyTextareaClassName} onChange={(event) => updateReference(reference.id, { description: event.target.value })} placeholder="Share the life, character, calling, or discipleship context they know." value={reference.description} />
                  </label>
                  {index > 0 ? (
                    <div className="flex items-end sm:col-span-2">
                      <button aria-label="Remove reference" className="inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-black text-[#94A3B8] hover:bg-[#F8FBFF] hover:text-red-600" onClick={() => removeReference(reference.id)} type="button">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            <button className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-black text-[#2563EB]" onClick={addReference} type="button">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add Reference
            </button>
          </div>
        </SectionCard>
      );
    }

    const reviewPrayerPartners = draft.prayerPartners.filter((partner) => (
      partner.firstName.trim() || partner.lastName.trim() || partner.email.trim() || partner.phone.trim() || partner.relationship.trim()
    ));
    const reviewPrayerRequests = draft.prayerRequests.filter((request) => request.text.trim());
    const reviewSupportSummary = supportSummary(draft);

    return (
      <SectionCard eyebrow="Review" title="Confirm before submitting">
        <div className="space-y-3">
          <ReviewSection onEdit={() => goToStep("account")} title="Account">
            {draft.accountEmail}
            <br />
            One login for your DOS workspace.
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("workspace")} title="Workspace / Household">
            Workspace: {generatedWorkspaceName(draft)}
            <br />
            {draft.firstName} {draft.lastName}
            <br />
            {draft.cellPhone} · {draft.contactEmail}
            <br />
            {[draft.addressLine1 || draft.fullAddress, draft.city, draft.state, draft.zip].filter(Boolean).join(", ")}
            <br />
            Spouse: {draft.spouseName || [draft.spouseFirstName, draft.spouseLastName].filter(Boolean).join(" ") || "Not added"}
            <br />
            Children: {draft.familyMembers.length}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("path")} title="Selected path">
            {draft.setupPath === "organization" ? "Bring DOS to My Organization" : "Complete USA Missionaries Setup"}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("story")} title="Testimony">
            {selectedStoryText(draft)}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("photos")} title="Photos">
            Profile Photo: {draft.profilePhotoUpload?.fileName || draft.profilePhotoName || "Not uploaded"}
            <br />
            Family / Public Profile Photo: {draft.familyPhotoUpload?.fileName || draft.familyPhotoName || "Not uploaded"}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("prayer")} title="Prayer">
            <p className="text-[#475569]">
              {reviewPrayerPartners.length
                ? reviewPrayerPartners.map((partner, index) => {
                  const partnerName = [partner.firstName, partner.lastName].filter(Boolean).join(" ") || "Unnamed partner";
                  return `Partner ${index + 1}: ${partnerName}${partner.relationship ? ` · ${partner.relationship}` : ""} · ${partner.email || "No email"}${partner.phone ? ` · ${partner.phone}` : ""}`;
                }).join(" / ")
                : "No prayer partner added"}
            </p>
            <p className="mt-2 text-[#475569]">
              {reviewPrayerRequests.length
                ? reviewPrayerRequests.map((request, index) => `Request ${index + 1}: ${request.text}`).join(" / ")
                : "No prayer request added"}
            </p>
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("support")} title="Support">
            Need support: {supportNeedLabel(draft.supportNeed)}
            {draft.supportNeed === "yes" ? ` · Goal: ${formatMoney(reviewSupportSummary.suggestedGoal)}/mo` : ""}
            <br />
            {draft.supportNeed === "yes" ? (
              <>
                Personal: {formatMoney(reviewSupportSummary.personalTotal)}/mo · Ministry: {formatMoney(reviewSupportSummary.ministryTotal)}/mo
                <br />
                Current committed support: {formatMoney(reviewSupportSummary.currentCommittedSupport)}/mo · Estimated gap: {formatMoney(reviewSupportSummary.estimatedGap)}/mo
                <br />
              </>
            ) : (
              <>Giving preference: {donationLinkLabel(draft.donationLinkPreference)}</>
            )}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("references")} title="References">
            {draft.references.filter((reference) => reference.firstName.trim() || reference.lastName.trim() || reference.email.trim()).map((reference, index) => `Reference ${index + 1}: ${reference.firstName} ${reference.lastName} · ${reference.relationship} · ${reference.email}${reference.phone ? ` · ${reference.phone}` : ""}`).join(" / ")}
          </ReviewSection>
          <label className="flex items-start gap-3 rounded-[22px] border border-[#DCEBFF] bg-white p-3 text-sm leading-6 text-[#475569]">
            <input checked={draft.agreement} className="mt-1 h-4 w-4 accent-[#2563EB]" onChange={(event) => updateDraft({ agreement: event.target.checked })} type="checkbox" />
            <span>I understand USA Missionaries will review this application, prepare a public profile preview, and let me review/request changes before anything is shared publicly.</span>
          </label>
        </div>
      </SectionCard>
    );
  }

  const submittedTitle = draft.setupPath === "usam"
    ? "Application Submitted"
    : draft.setupPath === "organization"
      ? "Organization Interest Submitted"
      : "DOS Setup Complete";
  const submittedMessage = draft.setupPath === "usam"
    ? "Your USA Missionaries application has been submitted and is under review."
    : draft.setupPath === "organization"
      ? "Your organization setup interest has been submitted. You can begin using DOS personally while the organization path is prepared."
      : "Your DOS setup is ready. Start stewarding the people God has placed in front of you.";
  const dosEntryHref = draft.setupPath === "usam"
    ? submittedWorkspaceHref || "/dos/app?workspace=ryan-brooke-fox&walkthrough=usam"
    : "/dos/app?workspace=ryan-brooke-fox";
  const isSubmitStep = currentStep.id === "review" || currentStep.id === "organization_interest" || currentStep.id === "personal_finish";
  const submitLabel = currentStep.id === "review"
    ? "Submit Application"
    : currentStep.id === "organization_interest"
      ? "Submit organization interest"
      : "Finish Setup";
  const primaryActionLabel = isSubmitting && isSubmitStep ? "Submitting..." : isSubmitStep ? submitLabel : "Continue";

  function handleOnboardingKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (stage !== "flow" || event.key !== "Enter" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName;

    if (!tagName || ["A", "BUTTON", "SELECT", "TEXTAREA"].includes(tagName)) {
      return;
    }

    event.preventDefault();

    if (isSubmitStep) {
      submit();
      return;
    }

    next();
  }

  return (
    <main className={`usam-join-route min-h-screen ${joinDawnShellClassName} text-[#0F172A]`} onKeyDown={handleOnboardingKeyDown}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.usam-join-route) {
              background:
                radial-gradient(circle at 78% 8%, rgba(219,234,254,0.92), transparent 34%),
                radial-gradient(circle at 86% 92%, rgba(254,215,170,0.54), transparent 36%),
                radial-gradient(circle at 48% 62%, rgba(221,214,254,0.48), transparent 42%),
                linear-gradient(135deg, #F8FBFF 0%, #F6F8FF 48%, #FFF4EC 100%) !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            body:has(.usam-join-route) > footer {
              display: none !important;
            }
          `,
        }}
      />
      <div className={pageShellClassName}>
        {stage === "welcome" ? (
          <section className={`${contentWidthClassName} flex flex-1 flex-col justify-center space-y-3 pb-32 pt-4 sm:pt-5`}>
            <div className="rounded-[30px] border border-[#DCEBFF] bg-white p-4 text-center shadow-[0_22px_62px_rgba(37,99,235,0.10)] sm:rounded-[34px] sm:p-6">
              <h1 className="mx-auto max-w-3xl text-[38px] font-black leading-[0.92] tracking-[-0.055em] text-[#020617] max-[360px]:text-[34px] sm:text-[54px]">
                Discipleship on the go.
              </h1>

              <div className="relative mt-4">
                <div className="relative grid gap-2.5 text-left sm:grid-cols-3">
                  {[
                    ["1", "Meet", "Begin with the people God has already placed in front of you."],
                    ["2", "Minister", "Pray, follow up, and walk with people in real relationship."],
                    ["3", "Multiply", "Track fruit, form discipleship rhythms, and keep the mission moving."],
                  ].map(([number, title, text], index) => (
                    <article className="relative flex items-start gap-3 rounded-[20px] border border-[#EAF2FF] bg-white p-3 shadow-[0_12px_34px_rgba(37,99,235,0.06)]" key={title}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-black text-white shadow-[0_10px_22px_rgba(37,99,235,0.18)]">{number}</span>
                      <span>
                        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#2563EB]">{title}</h2>
                        <p className="mt-1 text-xs leading-5 text-[#64748B]">{text}</p>
                      </span>
                      {index < 2 ? (
                        <span className="pointer-events-none absolute -right-[18px] top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#DCEBFF] bg-white text-[#93C5FD] shadow-[0_8px_20px_rgba(37,99,235,0.08)] sm:flex" aria-hidden="true">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <WelcomeActionBar
              hasSavedDraft={hasSavedDraft}
              onContinueDraft={() => startFlow(currentStep.id)}
              onStart={() => startFlow("account")}
            />
          </section>
        ) : null}

        {stage === "submitted" ? (
          <OnboardingFlowShell
            label="Submitted"
            lastSavedAt={lastSavedAt}
            onBack={backFromSubmitted}
            percent={100}
            primaryHref={dosEntryHref}
            primaryLabel="Enter DOS and Begin"
            saveState={saveState}
            subtitle={draft.setupPath === "usam" ? "Submitted for USA Missionaries review." : "Saved locally for review handoff."}
          >
            <section className="rounded-[30px] border border-[#DCEBFF] bg-white p-5 shadow-[0_22px_62px_rgba(37,99,235,0.10)] sm:rounded-[32px] sm:p-7">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB]">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-[34px] font-black leading-[0.95] tracking-[-0.045em] text-[#020617] max-[360px]:text-[30px] sm:text-[50px]">
                {submittedTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#475569]">
                {submittedMessage}
              </p>
            </section>
          </OnboardingFlowShell>
        ) : null}

        {stage === "flow" ? (
          <OnboardingFlowShell
            error={error}
            label={currentStep.label}
            lastSavedAt={lastSavedAt}
            onBack={back}
            onPrimary={isSubmitStep ? submit : next}
            percent={currentProgress}
            primaryDisabled={isSubmitting}
            primaryLabel={primaryActionLabel}
            saveState={saveState}
            subtitle="You can leave and come back anytime."
            title={currentStep.title}
          >
            {renderStep()}
          </OnboardingFlowShell>
        ) : null}
        <OnboardingFooter />
      </div>
    </main>
  );
}
