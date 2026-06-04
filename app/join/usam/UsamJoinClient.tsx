"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, Home, Plus, Save, ShieldCheck, Smartphone, Sparkles, Trash2, Upload, Video } from "lucide-react";
import { relationshipContextOptions, roleInMyLifeOptions, type RelationshipContextValue, type RoleInMyLifeValue } from "@/src/lib/dos/relationship-model";

type DependentStatus = "dependent" | "independent";
type PrayerCategory = "Family" | "Financial" | "Health" | "Ministry" | "Other" | "Personal";
type PrayerVisibility = "prayer_team" | "private" | "public_profile";
type StoryVersionKey = "original" | "polished" | "profile" | "short";
type DonationLinkChoice = "general_usam" | "missionary_support" | "none";
type SetupPath = "" | "organization" | "personal" | "usam";
type SupportNeed = "no" | "not_sure" | "yes";
type SupportGoalOption = "1000" | "2500" | "3500" | "5000" | "custom";

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
  category: PrayerCategory;
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
  familyPhotoId: string;
  familyPhotoName: string;
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
  profilePhotoId: string;
  profilePhotoName: string;
  polishedStoryDraft: string;
  references: ReferenceDraft[];
  selectedPublicPhotoId: string;
  selectedStoryVersion: StoryVersionKey;
  spouseEmail: string;
  spouseFirstName: string;
  spouseLastName: string;
  spouseName: string;
  spousePhone: string;
  state: string;
  storyTestimony: string;
  supportCoverage: string;
  supportCommittedAmount: string;
  supportGoal: string;
  supportGoalOption: SupportGoalOption;
  supportMonthlyNeed: string;
  supportNeed: SupportNeed;
  setupPath: SetupPath;
  workspaceName: string;
  zip: string;
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

const baseStepDefinitions: ReadonlyArray<{ id: StepId; label: string; title: string }> = [
  { id: "account", label: "Login", title: "Create your login." },
  { id: "workspace", label: "Workspace", title: "Set up your workspace." },
  { id: "path", label: "Path", title: "Choose your path." },
];

const usamStepDefinitions: ReadonlyArray<{ id: StepId; label: string; title: string }> = [
  { id: "story", label: "Testimony", title: "Share your story." },
  { id: "photos", label: "Photos", title: "Add profile photos." },
  { id: "prayer", label: "Prayer", title: "Prayer partners and requests." },
  { id: "support", label: "Support", title: "Monthly support." },
  { id: "references", label: "References", title: "Character references." },
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

const inputClassName = "mt-2 h-12 w-full rounded-[18px] border border-[#DCEBFF] bg-[#F8FBFF] px-4 text-sm font-semibold text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white";
const textareaClassName = "mt-2 min-h-36 w-full rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-4 text-sm leading-7 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white";
const selectClassName = `${inputClassName} appearance-none bg-white pr-11`;

const initialMy3People: My3PersonDraft[] = [
  {
    email: "",
    id: "my3-seed-1",
    name: "",
    phone: "",
    relationshipContext: "friend",
    roleInMyLife: "walking_with_them",
  },
  {
    email: "",
    id: "my3-seed-2",
    name: "",
    phone: "",
    relationshipContext: "family",
    roleInMyLife: "walking_with_them",
  },
  {
    email: "",
    id: "my3-seed-3",
    name: "",
    phone: "",
    relationshipContext: "church",
    roleInMyLife: "mentoring_me",
  },
];

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
  country: "United States",
  currentlyRaisingSupport: "starting",
  donationLinkPreference: "none",
  familyMembers: [],
  familyPhotoId: "family-public-photo",
  familyPhotoName: "",
  firstName: "",
  fullAddress: "",
  lastName: "",
  my3People: initialMy3People,
  organizationContactEmail: "",
  organizationContactPerson: "",
  organizationMessage: "",
  organizationName: "",
  organizationType: "Church / ministry",
  password: "",
  prayerPartners: [
    {
      email: "",
      firstName: "",
      id: "prayer-partner-1",
      lastName: "",
      phone: "",
      relationship: "",
    },
    {
      email: "",
      firstName: "",
      id: "prayer-partner-2",
      lastName: "",
      phone: "",
      relationship: "",
    },
  ],
  polishedStoryDraft: "",
  prayerRequests: [
    {
      category: "Personal",
      id: "prayer-request-primary",
      text: "",
      visibility: "prayer_team",
    },
  ],
  profilePhotoId: "profile-photo",
  profilePhotoName: "",
  references: [
    {
      churchOrganization: "",
      description: "",
      email: "",
      firstName: "",
      id: "reference-primary",
      lastName: "",
      phone: "",
      relationship: "",
    },
  ],
  selectedPublicPhotoId: "profile-photo",
  selectedStoryVersion: "original",
  spouseEmail: "",
  spouseFirstName: "",
  spouseLastName: "",
  spouseName: "",
  spousePhone: "",
  state: "",
  storyTestimony: "",
  supportCoverage: "",
  supportCommittedAmount: "",
  supportGoal: "",
  supportGoalOption: "custom",
  supportMonthlyNeed: "",
  supportNeed: "not_sure",
  setupPath: "",
  workspaceName: "",
  zip: "",
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

function mergeDraft(value: Partial<ApplicationDraft> | null): ApplicationDraft {
  if (!value) {
    return initialDraft;
  }

  return {
    ...initialDraft,
    ...value,
    familyMembers: Array.isArray(value.familyMembers) ? value.familyMembers : initialDraft.familyMembers,
    my3People: Array.isArray(value.my3People) ? value.my3People : initialDraft.my3People,
    prayerPartners: Array.isArray(value.prayerPartners) && value.prayerPartners.length >= 2 ? value.prayerPartners : initialDraft.prayerPartners,
    prayerRequests: Array.isArray(value.prayerRequests) && value.prayerRequests.length ? value.prayerRequests : initialDraft.prayerRequests,
    references: Array.isArray(value.references) && value.references.length ? value.references : initialDraft.references,
  };
}

function progressPercent(stepIndex: number, totalSteps: number) {
  return Math.round(((stepIndex + 1) / totalSteps) * 100);
}

function cleanMoney(value: string) {
  return value.replace(/[^\d.]/g, "");
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

function fieldLabel(value: string) {
  return <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#2563EB]">{value}</span>;
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
  return (
    <label className="block">
      {label ? fieldLabel(label) : null}
      <span className="relative block">
        <select className={selectClassName} onChange={(event) => onChange(event.target.value)} value={value}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" aria-hidden="true" />
      </span>
    </label>
  );
}

function storyVersions(story: string) {
  const cleanStory = story.trim() || "";
  const shortStory = cleanStory.length > 210 ? `${cleanStory.slice(0, 210).trim()}...` : cleanStory;
  const polishedStory = cleanStory
    ? `Improved story draft: ${cleanStory}`
    : "";

  return {
    original: cleanStory,
    polished: polishedStory,
    profile: shortStory,
    short: shortStory,
  } satisfies Record<StoryVersionKey, string>;
}

function selectedStoryText(draft: ApplicationDraft, versions: Record<StoryVersionKey, string>) {
  return draft.polishedStoryDraft.trim() || versions.original;
}

function supportNeedLabel(value: SupportNeed) {
  return {
    no: "No, I am fully funded / do not need personal support",
    not_sure: "Not sure yet",
    yes: "Yes, I need monthly support",
  }[value];
}

function donationLinkLabel(value: DonationLinkChoice) {
  return {
    general_usam: "Yes, but direct gifts to USA Missionaries / underfunded missionaries",
    missionary_support: "Yes, for my missionary support",
    none: "No donation link for now",
  }[value];
}

function prayerVisibilityLabel(value: PrayerVisibility) {
  return {
    prayer_team: "Prayer team only",
    private: "Private",
    public_profile: "Public profile if approved",
  }[value];
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

function ProgressStatusCard({
  label,
  lastSavedAt,
  percent,
  saveState,
  subtitle,
}: {
  label: string;
  lastSavedAt: Date | null;
  percent: number;
  saveState: SaveState;
  subtitle: string;
}) {
  return (
    <div className="rounded-[28px] border border-[#DCEBFF] bg-white p-4 shadow-[0_18px_50px_rgba(37,99,235,0.07)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2563EB]">
            {percent}% complete · {label}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#F8FBFF] px-3 py-2 text-xs font-bold text-[#64748B]">
          <Save className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" />
          {autosaveLabel(saveState, lastSavedAt)}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EBF2FF]">
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

    if (draft.password.length < 6) {
      return "Use at least 6 characters for your password.";
    }

    if (draft.password !== draft.confirmPassword) {
      return "Password and confirmation must match.";
    }
  }

  if (stepId === "workspace") {
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.contactEmail.trim() || !draft.cellPhone.trim() || !draft.workspaceName.trim()) {
      return "Add your name, email, phone, and workspace name.";
    }

    if (!draft.city.trim() || !draft.state.trim()) {
      return "Add your city and state.";
    }
  }

  if (stepId === "path" && !draft.setupPath) {
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

  if (stepId === "story" && !draft.storyTestimony.trim()) {
    return "Share at least a few sentences of your story.";
  }

  if (stepId === "prayer") {
    const primaryPartner = draft.prayerPartners[0];

    if (!primaryPartner?.firstName.trim() || !primaryPartner.lastName.trim() || !primaryPartner.email.trim()) {
      return "Add prayer partner 1 with first name, last name, and email.";
    }

    if (!draft.prayerRequests.some((request) => request.text.trim())) {
      return "Add a prayer request.";
    }
  }

  if (stepId === "support") {
    if (draft.supportNeed === "yes" && !draft.supportGoal.trim()) {
      return "Add your suggested monthly support goal.";
    }
  }

  if (stepId === "references") {
    const primaryReference = draft.references[0];

    if (!primaryReference?.firstName.trim() || !primaryReference.lastName.trim() || !primaryReference.email.trim() || !primaryReference.phone.trim() || !primaryReference.relationship.trim() || !primaryReference.description.trim()) {
      return "Add reference 1 with name, email, phone, relationship, and a brief description.";
    }
  }

  if (stepId === "review" && !draft.agreement) {
    return "Confirm that USA Missionaries will review this application before anything goes public.";
  }

  return "";
}

function SectionCard({ children, eyebrow, title }: { children: ReactNode; eyebrow?: string; title: string }) {
  return (
    <section className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
      {eyebrow ? <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2563EB]">{eyebrow}</p> : null}
      <h2 className={`${eyebrow ? "mt-2" : ""} text-2xl font-black tracking-[-0.035em] text-[#020617]`}>{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function UploadPlaceholder({
  helper,
  label,
  name,
  onChange,
  onSelectPublic,
  photoId,
  selectedPublicPhotoId,
}: {
  helper: string;
  label: string;
  name: string;
  onChange: (name: string) => void;
  onSelectPublic: () => void;
  photoId: string;
  selectedPublicPhotoId: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
      <label className="block">
        <span className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.08)]">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-black text-[#0F172A]">{label}</span>
            <span className="mt-1 block text-xs leading-5 text-[#64748B]">{helper}</span>
          </span>
        </span>
        <input
          accept="image/*"
          className="sr-only"
          onChange={(event) => onChange(event.target.files?.[0]?.name ?? "")}
          type="file"
        />
        <span className="mt-4 flex min-h-32 items-center justify-center rounded-[20px] border border-dashed border-[#BFDBFE] bg-white px-3 py-4 text-center text-sm font-semibold text-[#64748B]">
          {name ? (
            <span>
              <span className="block font-black text-[#0F172A]">Selected</span>
              <span className="mt-1 block break-all text-xs">{name}</span>
            </span>
          ) : (
            <span>Choose image file</span>
          )}
        </span>
      </label>
      <button
        className={`mt-auto inline-flex min-h-10 w-full items-center justify-center rounded-full border px-4 text-xs font-black ${
          selectedPublicPhotoId === photoId
            ? "border-[#2563EB] bg-[#2563EB] text-white"
            : "border-[#BFDBFE] bg-white text-[#2563EB]"
        }`}
        onClick={onSelectPublic}
        type="button"
      >
        {selectedPublicPhotoId === photoId ? "Selected for public profile" : "Use for public profile"}
      </button>
    </div>
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
    <section className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
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
  const [stepIndex, setStepIndex] = useState(0);
  const [stage, setStage] = useState<FlowStage>("welcome");
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [showImprovedStory, setShowImprovedStory] = useState(false);
  const stepDefinitions = useMemo(() => stepDefinitionsFor(draft.setupPath), [draft.setupPath]);
  const currentStep = stepDefinitions[stepIndex] ?? stepDefinitions[0];
  const currentProgress = progressPercent(Math.min(stepIndex, stepDefinitions.length - 1), stepDefinitions.length);
  const versions = useMemo(() => storyVersions(draft.storyTestimony), [draft.storyTestimony]);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftStorageKey);
    const savedStepId = window.localStorage.getItem(stepStorageKey);
    const submittedDraft = window.localStorage.getItem(submittedStorageKey);

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
      setStage("submitted");
    }

    setHasLoadedDraft(true);
  }, []);

  useEffect(() => {
    setStepIndex((current) => Math.min(current, stepDefinitions.length - 1));
  }, [stepDefinitions.length]);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      window.localStorage.setItem(stepStorageKey, currentStep.id);
      setHasSavedDraft(true);
      setSaveState("saved");
      setLastSavedAt(new Date());
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentStep.id, draft, hasLoadedDraft]);

  function updateDraft(patch: Partial<ApplicationDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
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
    setStepIndex((current) => Math.max(current - 1, 0));
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

  function updatePrayerRequest(id: string, patch: Partial<PrayerRequestDraft>) {
    updateDraft({
      prayerRequests: draft.prayerRequests.map((request) => request.id === id ? { ...request, ...patch } : request),
    });
  }

  function addReference() {
    if (draft.references.length >= 2) {
      return;
    }

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

  function submit() {
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

    const submittedDraft = {
      application: draft,
      persistence: {
        fallback: "localStorage",
        futureSupabaseTable: draft.setupPath === "organization" ? "organization_interests" : draft.setupPath === "usam" ? "usam_applications" : "dos_workspace_setups",
        schemaVersion: 1,
      },
      status: submittedStatus,
      submittedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    window.localStorage.setItem(submittedStorageKey, JSON.stringify(submittedDraft));
    window.localStorage.setItem(stepStorageKey, currentStep.id);
    setStage("submitted");
    setError("");
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  function renderStep() {
    if (currentStep.id === "account") {
      return (
        <SectionCard eyebrow="Login" title="Create your DOS login">
          <div className="grid gap-4">
            <label className="block">
              {fieldLabel("Email")}
              <input className={inputClassName} onChange={(event) => updateDraft({ accountEmail: event.target.value, contactEmail: event.target.value })} required type="email" value={draft.accountEmail} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                {fieldLabel("Password")}
                <input className={inputClassName} onChange={(event) => updateDraft({ password: event.target.value })} required type="password" value={draft.password} />
              </label>
              <label className="block">
                {fieldLabel("Confirm password")}
                <input className={inputClassName} onChange={(event) => updateDraft({ confirmPassword: event.target.value })} required type="password" value={draft.confirmPassword} />
              </label>
            </div>
            <div className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-4 text-sm leading-7 text-[#475569]">
              <p className="font-bold text-[#0F172A]">One login. One DOS workspace.</p>
              <p className="mt-1">Organizations and USA Missionaries can connect later as optional paths inside DOS.</p>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "workspace") {
      return (
        <SectionCard eyebrow="Workspace" title="Create your DOS workspace">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                {fieldLabel("First name")}
                <input className={inputClassName} onChange={(event) => updateDraft({ firstName: event.target.value })} required value={draft.firstName} />
              </label>
              <label className="block">
                {fieldLabel("Last name")}
                <input className={inputClassName} onChange={(event) => updateDraft({ lastName: event.target.value })} required value={draft.lastName} />
              </label>
              <label className="block sm:col-span-2">
                {fieldLabel("Workspace name")}
                <input className={inputClassName} onChange={(event) => updateDraft({ workspaceName: event.target.value })} required value={draft.workspaceName} />
              </label>
              <label className="block">
                {fieldLabel("Email")}
                <input className={inputClassName} onChange={(event) => updateDraft({ contactEmail: event.target.value, accountEmail: event.target.value })} required type="email" value={draft.contactEmail} />
              </label>
              <label className="block">
                {fieldLabel("Phone")}
                <input className={inputClassName} onChange={(event) => updateDraft({ cellPhone: event.target.value })} required type="tel" value={draft.cellPhone} />
              </label>
              <label className="block sm:col-span-2">
                {fieldLabel("Street address optional")}
                <input className={inputClassName} onChange={(event) => updateDraft({ addressLine1: event.target.value, fullAddress: event.target.value })} value={draft.addressLine1 || draft.fullAddress} />
              </label>
              <label className="block">
                {fieldLabel("City")}
                <input className={inputClassName} onChange={(event) => updateDraft({ city: event.target.value })} required value={draft.city} />
              </label>
              <label className="block">
                {fieldLabel("State")}
                <input className={inputClassName} maxLength={2} onChange={(event) => updateDraft({ state: event.target.value.toUpperCase() })} required value={draft.state} />
              </label>
              <label className="block">
                {fieldLabel("ZIP optional")}
                <input className={inputClassName} onChange={(event) => updateDraft({ zip: event.target.value })} value={draft.zip} />
              </label>
            </div>

            <div className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
              <p className="text-sm font-black text-[#0F172A]">Spouse optional</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  className={inputClassName}
                  onChange={(event) => updateDraft({
                    spouseFirstName: event.target.value,
                    spouseName: [event.target.value, draft.spouseLastName].filter(Boolean).join(" "),
                  })}
                  placeholder="First name"
                  value={draft.spouseFirstName}
                />
                <input
                  className={inputClassName}
                  onChange={(event) => updateDraft({
                    spouseLastName: event.target.value,
                    spouseName: [draft.spouseFirstName, event.target.value].filter(Boolean).join(" "),
                  })}
                  placeholder="Last name"
                  value={draft.spouseLastName}
                />
                <input className={inputClassName} onChange={(event) => updateDraft({ spouseEmail: event.target.value })} placeholder="Email optional" type="email" value={draft.spouseEmail} />
                <input className={inputClassName} onChange={(event) => updateDraft({ spousePhone: event.target.value })} placeholder="Phone optional" type="tel" value={draft.spousePhone} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[#0F172A]">Children / dependents optional</p>
                <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-black text-[#2563EB]" onClick={addFamilyMember} type="button">
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add
                </button>
              </div>
              {draft.familyMembers.length ? (
                <div className="space-y-3">
                  {draft.familyMembers.map((member, index) => (
                    <div className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4" key={member.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-[#0F172A]">Child / dependent {index + 1}</p>
                        <button aria-label="Remove child or dependent" className="rounded-full p-2 text-[#64748B] hover:bg-white hover:text-red-600" onClick={() => removeFamilyMember(member.id)} type="button">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              ) : (
                <p className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#64748B]">
                  You can skip this and add household members later.
                </p>
              )}
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
              <div className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4" key={person.id}>
                <p className="text-sm font-black text-[#0F172A]">Person {index + 1}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
          description: "For individuals or households who want to steward relationships, prayer, meetings, and follow-up.",
          label: "Use DOS Personally",
          value: "personal",
        },
        {
          description: "For people joining USA Missionaries as missionary disciple makers. Includes application, support, prayer, and profile review.",
          label: "Apply with USA Missionaries",
          value: "usam",
        },
        {
          description: "For churches, ministries, and teams interested in using DOS across their people.",
          label: "Bring DOS to an Organization",
          value: "organization",
        },
      ];

      return (
        <SectionCard eyebrow="Path" title="Choose your path.">
          <div className="grid gap-3">
            {pathOptions.map((option) => (
              <button
                className={`rounded-[24px] border p-4 text-left transition-colors ${draft.setupPath === option.value ? "border-[#2563EB] bg-[#EBF2FF]" : "border-[#DCEBFF] bg-white hover:border-[#BFDBFE]"}`}
                key={option.value}
                onClick={() => updateDraft({ setupPath: option.value })}
                type="button"
              >
                <span className="block text-base font-black text-[#0F172A]">{option.label}</span>
                <span className="mt-2 block text-sm leading-6 text-[#64748B]">{option.description}</span>
              </button>
            ))}
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "personal_finish") {
      return (
        <SectionCard eyebrow="DOS" title="Your DOS setup is ready">
          <div className="space-y-3 text-sm leading-7 text-[#475569]">
            <p>Your workspace is ready. DOS will help you identify relationships, choose circles, pray, meet, and follow up once you enter.</p>
            <div className="grid gap-2">
              <div className="rounded-2xl bg-[#F8FBFF] px-3 py-2"><span className="font-black text-[#0F172A]">Workspace:</span> {draft.workspaceName}</div>
              <div className="rounded-2xl bg-[#F8FBFF] px-3 py-2"><span className="font-black text-[#0F172A]">Path:</span> Use DOS personally</div>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "organization_interest") {
      return (
        <SectionCard eyebrow="Organization Interest" title="Tell us about your organization">
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
          <div className="space-y-5">
            <p className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-4 text-sm leading-7 text-[#475569]">
              Your family is part of your field. These people can be added to your DOS contacts and organized into your discipleship circles later: My 3, My 12, My 70, or My 120.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4" key={member.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#0F172A]">Family member {index + 1}</p>
                    <button aria-label="Remove family member" className="rounded-full p-2 text-[#64748B] hover:bg-white hover:text-red-600" onClick={() => removeFamilyMember(member.id)} type="button">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-4 text-sm font-black text-[#2563EB]" onClick={addFamilyMember} type="button">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add another family member
            </button>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "phone") {
      return (
        <SectionCard eyebrow="Web app" title="Save DOS to your phone">
          <div className="space-y-4">
            <div className="flex min-h-44 items-center justify-center rounded-[24px] border border-dashed border-[#BFDBFE] bg-[#F8FBFF] text-center">
              <div>
                <Video className="mx-auto h-8 w-8 text-[#2563EB]" aria-hidden="true" />
                <p className="mt-3 text-sm font-black text-[#0F172A]">Tutorial: How to save DOS to your phone</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
                <p className="font-black text-[#0F172A]">Apple</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#475569]">
                  <li>Open this page in Safari</li>
                  <li>Tap the Share button</li>
                  <li>Tap Add to Home Screen</li>
                  <li>Tap Add</li>
                </ol>
              </div>
              <div className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
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
          <textarea className={`${textareaClassName} min-h-56`} onChange={(event) => updateDraft({ callingFocus: event.target.value })} value={draft.callingFocus} />
        </SectionCard>
      );
    }

    if (currentStep.id === "story") {
      return (
        <SectionCard eyebrow="Testimony" title="Start with what God has done">
          <div className="space-y-4">
            <p className="text-sm leading-7 text-[#64748B]">
              Do not worry about making this perfect. Start with what God has done in your life. You can improve and review your story before submitting.
            </p>
            <textarea className={`${textareaClassName} min-h-64`} onChange={(event) => updateDraft({ storyTestimony: event.target.value })} placeholder="Share your story or testimony..." value={draft.storyTestimony} />
            <div className="grid gap-2 sm:grid-cols-3">
              <button className="cursor-not-allowed rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-4 py-3 text-sm font-black text-[#94A3B8]" disabled type="button">Record coming soon</button>
              <label className="rounded-full border border-[#DCEBFF] bg-white px-4 py-3 text-center text-sm font-black text-[#0F172A]">
                Upload written testimony
                <input
                  accept=".txt,.md,text/plain"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      updateDraft({ storyTestimony: await file.text() });
                    }
                  }}
                  type="file"
                />
              </label>
              <button
                className="rounded-full bg-[#0F172A] px-4 py-3 text-sm font-black text-white"
                onClick={() => {
                  updateDraft({ polishedStoryDraft: draft.polishedStoryDraft || versions.polished, selectedStoryVersion: "polished" });
                  setShowImprovedStory(true);
                }}
                type="button"
              >
                Improve Story
              </button>
            </div>
            {showImprovedStory ? (
              <div className="grid gap-3">
                <div className="rounded-[22px] border border-[#BFDBFE] bg-[#EBF2FF] p-4">
                  <p className="text-sm font-black text-[#0F172A]">Improved Story Draft</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">Review or edit this draft before continuing.</p>
                  <textarea
                    className={`${textareaClassName} min-h-44 bg-white`}
                    onChange={(event) => updateDraft({ polishedStoryDraft: event.target.value, selectedStoryVersion: "polished" })}
                    value={draft.polishedStoryDraft || versions.polished}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "photos") {
      return (
        <SectionCard eyebrow="Photos" title="Add your profile photos">
          <div className="grid gap-4 sm:grid-cols-2">
            <UploadPlaceholder
              helper="Used inside DOS, Command Center, and profile review screens."
              label="Profile Photo / Headshot"
              name={draft.profilePhotoName}
              onChange={(name) => updateDraft({ profilePhotoName: name })}
              onSelectPublic={() => updateDraft({ selectedPublicPhotoId: draft.profilePhotoId })}
              photoId={draft.profilePhotoId}
              selectedPublicPhotoId={draft.selectedPublicPhotoId}
            />
            <UploadPlaceholder
              helper="Used for the public/fundraising profile if approved."
              label="Family / Public Profile Photo"
              name={draft.familyPhotoName}
              onChange={(name) => updateDraft({ familyPhotoName: name })}
              onSelectPublic={() => updateDraft({ selectedPublicPhotoId: draft.familyPhotoId })}
              photoId={draft.familyPhotoId}
              selectedPublicPhotoId={draft.selectedPublicPhotoId}
            />
          </div>
          <p className="mt-4 rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#64748B]">
            Selected public photo ID: <span className="font-black text-[#0F172A]">{draft.selectedPublicPhotoId}</span>. Public publishing still requires USA Missionaries approval.
          </p>
        </SectionCard>
      );
    }

    if (currentStep.id === "prayer") {
      const primaryPrayerRequest = draft.prayerRequests[0] ?? initialDraft.prayerRequests[0];

      return (
        <SectionCard eyebrow="Prayer" title="Prayer partners and requests">
          <div className="space-y-4">
            {draft.prayerPartners.slice(0, 2).map((partner, index) => (
              <div className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4" key={partner.id}>
                <p className="text-sm font-black text-[#0F172A]">Prayer Partner {index + 1}{index === 0 ? " required" : " optional"}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { firstName: event.target.value })} placeholder="First name" value={partner.firstName} />
                  <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { lastName: event.target.value })} placeholder="Last name" value={partner.lastName} />
                  <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { email: event.target.value })} placeholder="Email" type="email" value={partner.email} />
                  <input className={inputClassName} onChange={(event) => updatePrayerPartner(partner.id, { phone: event.target.value })} placeholder="Phone optional" type="tel" value={partner.phone} />
                  <input className={`${inputClassName} sm:col-span-2`} onChange={(event) => updatePrayerPartner(partner.id, { relationship: event.target.value })} placeholder="Relationship optional" value={partner.relationship} />
                </div>
              </div>
            ))}

            <div className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
              <p className="text-sm font-black text-[#0F172A]">Prayer Request</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <SelectField label="Category optional" onChange={(value) => updatePrayerRequest(primaryPrayerRequest.id, { category: value as PrayerCategory })} value={primaryPrayerRequest.category}>
                  {["Personal", "Family", "Financial", "Ministry", "Health", "Other"].map((category) => <option key={category} value={category}>{category}</option>)}
                </SelectField>
                <SelectField label="Visibility" onChange={(value) => updatePrayerRequest(primaryPrayerRequest.id, { visibility: value as PrayerVisibility })} value={primaryPrayerRequest.visibility}>
                  <option value="prayer_team">Prayer team only</option>
                  <option value="public_profile">Public profile if approved</option>
                  <option value="private">Private</option>
                </SelectField>
                <textarea className={`${textareaClassName} sm:col-span-2`} onChange={(event) => updatePrayerRequest(primaryPrayerRequest.id, { text: event.target.value })} placeholder="How can people be praying for you?" value={primaryPrayerRequest.text} />
              </div>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "support") {
      const supportGap = Math.max(0, moneyNumber(draft.supportMonthlyNeed) - moneyNumber(draft.supportCommittedAmount));
      const donationOptions: Array<[DonationLinkChoice, string]> = draft.supportNeed === "yes"
        ? [
            ["missionary_support", "Personal support"],
            ["general_usam", "USA Missionaries / underfunded missionaries"],
            ["none", "No donation link for now"],
          ]
        : [
            ["general_usam", "USA Missionaries / underfunded missionaries"],
            ["none", "No donation link for now"],
          ];

      return (
        <SectionCard eyebrow="Support" title="Will you need to raise monthly support?">
          <div className="space-y-5">
            <div className="grid gap-2">
              {[
                ["yes", "Yes, I need monthly support"],
                ["no", "No, I am fully funded / do not need personal support"],
                ["not_sure", "Not sure yet"],
              ].map(([value, label]) => (
                <button
                  className={`rounded-[18px] border px-4 py-3 text-left text-sm font-black ${draft.supportNeed === value ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#DCEBFF] bg-white text-[#0F172A]"}`}
                  key={value}
                  onClick={() => updateDraft({
                    donationLinkPreference: value === "yes" ? draft.donationLinkPreference : draft.donationLinkPreference === "missionary_support" ? "none" : draft.donationLinkPreference,
                    supportNeed: value as SupportNeed,
                  })}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            {draft.supportNeed === "yes" ? (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    {fieldLabel("Monthly household / ministry need")}
                    <input className={inputClassName} onChange={(event) => updateDraft({ supportMonthlyNeed: cleanMoney(event.target.value) })} placeholder="$5,000" value={draft.supportMonthlyNeed} />
                  </label>
                  <label className="block">
                    {fieldLabel("Current committed support")}
                    <input className={inputClassName} onChange={(event) => updateDraft({ supportCommittedAmount: cleanMoney(event.target.value) })} placeholder="$1,250" value={draft.supportCommittedAmount} />
                  </label>
                  <div className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-4 sm:col-span-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#2563EB]">Estimated gap</p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.035em] text-[#0F172A]">{formatMoney(supportGap)}/mo</p>
                  </div>
                </div>
                <div>
                  {fieldLabel("Suggested monthly support goal")}
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {[
                      ["1000", "$1,000/mo"],
                      ["2500", "$2,500/mo"],
                      ["3500", "$3,500/mo"],
                      ["5000", "$5,000/mo"],
                      ["custom", "Custom amount"],
                    ].map(([value, label]) => (
                      <button
                        className={`rounded-[18px] border px-4 py-3 text-sm font-black ${draft.supportGoalOption === value ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#DCEBFF] bg-white text-[#0F172A]"}`}
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
                    <input className={inputClassName} onChange={(event) => updateDraft({ supportGoal: cleanMoney(event.target.value) })} placeholder="Custom monthly amount" value={draft.supportGoal} />
                  ) : null}
                </div>
                <SelectField label="Are you currently raising support?" onChange={(value) => updateDraft({ currentlyRaisingSupport: value })} value={draft.currentlyRaisingSupport}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="starting">Starting soon</option>
                </SelectField>
                <p className="rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#64748B]">
                  10% of donations are allocated to USA Missionaries operational overhead / general fund.
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-sm font-black text-[#0F172A]">Donation link preference</p>
              <div className="mt-3 grid gap-2">
                {donationOptions.map(([value, label]) => (
                  <button
                    className={`rounded-[18px] border px-4 py-3 text-left text-sm font-black ${draft.donationLinkPreference === value ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#DCEBFF] bg-white text-[#0F172A]"}`}
                    key={value}
                    onClick={() => updateDraft({ donationLinkPreference: value as DonationLinkChoice })}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FBFF] p-3 text-xs leading-5 text-[#64748B]">
                A public giving page or donation link can only be activated after USA Missionaries approval.
              </p>
            </div>
          </div>
        </SectionCard>
      );
    }

    if (currentStep.id === "references") {
      return (
        <SectionCard eyebrow="References" title="Character References">
          <div className="space-y-3">
            <p className="text-sm leading-7 text-[#64748B]">
              If we reached out, who could speak into your life, character, and calling?
            </p>
            {draft.references.map((reference, index) => (
              <div className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4" key={reference.id}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-[#0F172A]">Reference {index + 1}{index === 0 ? " required" : " optional"}</p>
                  {index > 0 ? (
                    <button aria-label="Remove reference" className="rounded-full p-2 text-[#64748B] hover:bg-white hover:text-red-600" onClick={() => removeReference(reference.id)} type="button">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input className={inputClassName} onChange={(event) => updateReference(reference.id, { firstName: event.target.value })} placeholder="First name" value={reference.firstName} />
                  <input className={inputClassName} onChange={(event) => updateReference(reference.id, { lastName: event.target.value })} placeholder="Last name" value={reference.lastName} />
                  <input className={inputClassName} onChange={(event) => updateReference(reference.id, { email: event.target.value })} placeholder="Email" type="email" value={reference.email} />
                  <input className={inputClassName} onChange={(event) => updateReference(reference.id, { phone: event.target.value })} placeholder="Phone" value={reference.phone} />
                  <input className={inputClassName} onChange={(event) => updateReference(reference.id, { relationship: event.target.value })} placeholder="Relationship" value={reference.relationship} />
                  <input className={inputClassName} onChange={(event) => updateReference(reference.id, { churchOrganization: event.target.value })} placeholder="Church / org optional" value={reference.churchOrganization} />
                  <textarea className={`${textareaClassName} sm:col-span-2`} onChange={(event) => updateReference(reference.id, { description: event.target.value })} placeholder="Why can they speak into your life?" value={reference.description} />
                </div>
              </div>
            ))}
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-white px-4 text-sm font-black text-[#2563EB] disabled:opacity-45" disabled={draft.references.length >= 2} onClick={addReference} type="button">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add optional second reference
            </button>
          </div>
        </SectionCard>
      );
    }

    return (
      <SectionCard eyebrow="Review" title="Confirm before submitting">
        <div className="space-y-3">
          <ReviewSection onEdit={() => goToStep("account")} title="Account">
            {draft.accountEmail}
            <br />
            One login for your DOS workspace.
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("workspace")} title="Workspace / Household">
            Workspace: {draft.workspaceName || "Not added"}
            <br />
            {draft.firstName} {draft.lastName}
            <br />
            {draft.cellPhone} · {draft.contactEmail}
            <br />
            {[draft.addressLine1 || draft.fullAddress, draft.city, draft.state, draft.zip].filter(Boolean).join(", ")}
            <br />
            Spouse: {draft.spouseName || [draft.spouseFirstName, draft.spouseLastName].filter(Boolean).join(" ") || "Not added"}
            <br />
            Children / dependents: {draft.familyMembers.length}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("path")} title="Selected path">
            {draft.setupPath === "usam" ? "Apply with USA Missionaries" : draft.setupPath === "organization" ? "Bring DOS to an Organization" : "Use DOS Personally"}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("story")} title="Testimony">
            {selectedStoryText(draft, versions)}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("photos")} title="Photos">
            Profile Photo / Headshot: {draft.profilePhotoName || "Not uploaded"}
            <br />
            Family / Public Profile Photo: {draft.familyPhotoName || "Not uploaded"}
            <br />
            Selected public photo: {draft.selectedPublicPhotoId}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("prayer")} title="Prayer">
            Prayer Partner 1: {[draft.prayerPartners[0]?.firstName, draft.prayerPartners[0]?.lastName].filter(Boolean).join(" ") || "Not added"} · {draft.prayerPartners[0]?.email || "No email"}
            {draft.prayerPartners[1]?.firstName || draft.prayerPartners[1]?.lastName || draft.prayerPartners[1]?.email ? (
              <>
                <br />
                Prayer Partner 2: {[draft.prayerPartners[1]?.firstName, draft.prayerPartners[1]?.lastName].filter(Boolean).join(" ")} · {draft.prayerPartners[1]?.email}
              </>
            ) : null}
            <br />
            {draft.prayerRequests.filter((request) => request.text.trim()).map((request) => `${request.category}: ${request.text} (${prayerVisibilityLabel(request.visibility)})`).join(" / ") || "No prayer request added"}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("support")} title="Support">
            Need support: {supportNeedLabel(draft.supportNeed)}
            {draft.supportNeed === "yes" ? ` · Goal: $${draft.supportGoal}/mo` : ""}
            <br />
            {draft.supportNeed === "yes" ? (
              <>
                Monthly need: {draft.supportMonthlyNeed ? `$${draft.supportMonthlyNeed}` : "Not added"} · Current support: {draft.supportCommittedAmount ? `$${draft.supportCommittedAmount}` : "Not added"}
                <br />
              </>
            ) : null}
            Donation link: {donationLinkLabel(draft.donationLinkPreference)}
          </ReviewSection>
          <ReviewSection onEdit={() => goToStep("references")} title="References">
            {draft.references.filter((reference) => reference.firstName.trim() || reference.lastName.trim() || reference.email.trim()).map((reference, index) => `Reference ${index + 1}: ${reference.firstName} ${reference.lastName} · ${reference.relationship} · ${reference.email}${reference.phone ? ` · ${reference.phone}` : ""}`).join(" / ")}
          </ReviewSection>
          <label className="flex items-start gap-3 rounded-[24px] border border-[#DCEBFF] bg-white p-4 text-sm leading-6 text-[#475569]">
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
    ? "/dos/app?workspace=ryan-brooke-fox&walkthrough=usam"
    : "/dos/app?workspace=ryan-brooke-fox";
  const isSubmitStep = currentStep.id === "review" || currentStep.id === "organization_interest" || currentStep.id === "personal_finish";
  const submitLabel = currentStep.id === "review"
    ? "Submit Application"
    : currentStep.id === "organization_interest"
      ? "Submit organization interest"
      : "Finish Setup";

  return (
    <main className="usam-join-route min-h-screen bg-[#F8FBFF] text-[#0F172A]">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(.usam-join-route) {
              background: #F8FBFF !important;
              color: #0F172A;
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }

            body:has(.usam-join-route) > footer {
              display: none !important;
            }
          `,
        }}
      />
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link className="text-[18px] font-black tracking-[-0.035em] text-[#2563EB]" href="/join">
            DOS
          </Link>
          <span className="rounded-full border border-[#DCEBFF] bg-white px-3 py-1.5 text-[11px] font-black text-[#2563EB]">
            Powered by USA Missionaries
          </span>
        </header>

        {stage !== "flow" ? (
          <div className="mt-5">
            <ProgressStatusCard
              label={stage === "submitted" ? "Submitted" : "Welcome"}
              lastSavedAt={lastSavedAt}
              percent={stage === "submitted" ? 100 : 0}
              saveState={saveState}
              subtitle={stage === "submitted" ? "Saved locally for review handoff." : "Progress autosaves in this browser and can be continued later."}
            />
          </div>
        ) : null}

        {stage === "welcome" ? (
          <section className="my-auto grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
            <div className="rounded-[34px] border border-[#DCEBFF] bg-white p-6 shadow-[0_24px_70px_rgba(37,99,235,0.11)] sm:p-8">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2563EB]">DOS</p>
              <h1 className="mt-4 text-[46px] font-black leading-[0.92] tracking-[-0.055em] text-[#020617] sm:text-[68px]">
                Discipleship on the go.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#475569]">
                DOS helps you identify who God has placed in front of you, walk with them faithfully, and keep discipleship simple enough to practice in real life.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ["Identify", "Name the first few people you are called to steward."],
                  ["Walk", "Pray, meet, follow up, and keep the relationship warm."],
                  ["Disciple", "Track fruit without turning people into a database."],
                ].map(([title, text]) => (
                  <article className="rounded-[22px] border border-[#EAF2FF] bg-[#F8FBFF] p-4" key={title}>
                    <h2 className="text-sm font-black uppercase tracking-[0.13em] text-[#2563EB]">{title}</h2>
                    <p className="mt-2 text-xs leading-5 text-[#64748B]">{text}</p>
                  </article>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-black text-white shadow-[0_18px_36px_rgba(37,99,235,0.32)]" onClick={() => startFlow("account")} type="button">
                  Start Setup
                </button>
              </div>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F8FBFF] px-3 py-2 text-xs font-semibold text-[#64748B]">
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                Your setup autosaves and can be continued later.
              </p>
            </div>
            <div className="rounded-[34px] border border-[#DCEBFF] bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.11)]">
              <div className="flex min-h-72 items-center justify-center rounded-[26px] border border-dashed border-[#BFDBFE] bg-[#F8FBFF] text-center">
                <div>
                  <Video className="mx-auto h-10 w-10 text-[#2563EB]" aria-hidden="true" />
                  <p className="mt-4 text-lg font-black text-[#0F172A]">Watch the 2-minute welcome</p>
                  <p className="mt-2 text-sm text-[#64748B]">Ryan / USA Missionaries video placeholder</p>
                </div>
              </div>
              {hasSavedDraft ? (
                <button className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-5 text-sm font-black text-[#2563EB]" onClick={() => startFlow(currentStep.id)} type="button">
                  Continue saved draft
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {stage === "submitted" ? (
          <section className="my-auto rounded-[32px] border border-[#DCEBFF] bg-white p-6 shadow-[0_24px_70px_rgba(37,99,235,0.11)] sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB]">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-6 text-[42px] font-black leading-[0.95] tracking-[-0.045em] text-[#020617] sm:text-[58px]">
              {submittedTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#475569]">
              {submittedMessage}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)]"
                href={dosEntryHref}
              >
                Enter DOS and Begin
              </Link>
            </div>
          </section>
        ) : null}

        {stage === "flow" ? (
          <div className="my-auto py-8">
            <div className="mb-5">
              <ProgressStatusCard
                label={currentStep.label}
                lastSavedAt={lastSavedAt}
                percent={currentProgress}
                saveState={saveState}
                subtitle="You can leave and come back anytime."
              />
            </div>

            <div className="mb-4 flex items-center gap-2 text-[#64748B]">
              {currentStep.id === "phone" ? <Smartphone className="h-5 w-5 text-[#2563EB]" aria-hidden="true" /> : currentStep.id === "review" ? <ShieldCheck className="h-5 w-5 text-[#2563EB]" aria-hidden="true" /> : currentStep.id === "story" ? <Sparkles className="h-5 w-5 text-[#2563EB]" aria-hidden="true" /> : <Home className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />}
              <h1 className="text-[36px] font-black leading-[0.95] tracking-[-0.045em] text-[#020617] sm:text-[50px]">{currentStep.title}</h1>
            </div>

            {renderStep()}

            {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-5 text-sm font-black text-[#0F172A] disabled:opacity-40"
                disabled={stepIndex === 0}
                onClick={back}
                type="button"
              >
                Back
              </button>
              {isSubmitStep ? (
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)]"
                  onClick={submit}
                  type="button"
                >
                  {submitLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-6 text-sm font-black text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)]"
                  onClick={next}
                  type="button"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
