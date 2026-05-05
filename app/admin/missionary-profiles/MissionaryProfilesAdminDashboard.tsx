"use client";

import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MISSIONARY_IMAGE_MAX_BYTES,
  missionaryImageMimeTypes,
  uploadMissionaryProfileImage,
  validateMissionaryImageFile,
  type MissionaryImageSlot,
} from "@/src/lib/missionaries/profile-image-upload";
import {
  normalizeSupportRoutingMode,
  supportRoutingModeDetails,
  type SupportRoutingMode,
} from "@/src/lib/missionaries/support-routing";
import {
  locationVisibilityOptions,
  ministryRegionOptions,
  normalizeLocationVisibility,
  normalizeMinistryRegion,
  normalizePrimaryState,
  normalizeRoleType,
  normalizeServingScope,
  roleTypeOptions,
  servingScopeOptions,
  usStates,
  type LocationVisibility,
  type MinistryRegion,
  type RoleType,
  type ServingScope,
} from "@/src/lib/missionaries/location";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

export type AdminSupportMode = SupportRoutingMode;

export type AdminFruitSource = "website_admin" | "dos" | "public_form";
export type AdminFruitStatus = "draft" | "published" | "hidden" | "archived";
export type AdminFruitVisibility = "private" | "internal" | "public";
export type AdminTeamMemberStatus = "active" | "hidden" | "archived";
export type AdminTeamMemberSource = "website_admin" | "dos" | "public_form";

export type AdminHousehold = {
  id: string;
  slug: string;
  display_name: string;
  location: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  short_mission: string | null;
  story: string | null;
  public_visible: boolean | null;
  sort_order: number | null;
  updated_at?: string | null;
  primary_state?: string | null;
  serving_scope?: ServingScope | string | null;
  secondary_states?: string[] | null;
  region?: MinistryRegion | string | null;
  role_type?: RoleType | string | null;
  custom_serving_label?: string | null;
  location_visibility?: LocationVisibility | string | null;
  show_household?: boolean | null;
  show_photos?: boolean | null;
  show_team?: boolean | null;
  show_story?: boolean | null;
  show_fruit?: boolean | null;
  show_support?: boolean | null;
  show_prayer?: boolean | null;
  fruit_from_field?: string | null;
  support_mode?: AdminSupportMode | string | null;
  support_target_household_id?: string | null;
  support_target_fund?: string | null;
  support_public_label?: string | null;
  support_button_label?: string | null;
  support_explanation?: string | null;
  prayer_cta_label?: string | null;
  prayer_destination?: string | null;
  enable_prayer_team?: boolean | null;
  prayer_section_headline?: string | null;
  prayer_section_description?: string | null;
};

export type AdminSupportSettings = {
  household_id: string;
  show_support: boolean | null;
  annual_goal: number | null;
  monthly_goal: number | null;
  monthly_committed: number | null;
  monthly_received: number | null;
  general_fund_percentage: number | null;
  goal_basis: string | null;
  updated_at?: string | null;
  monthly_giving_url?: string | null;
  one_time_giving_url?: string | null;
  monthly_button_label?: string | null;
  one_time_button_label?: string | null;
  major_gift_button_label?: string | null;
  enable_major_gift_inquiry?: boolean | null;
  major_gift_notify_email?: string | null;
  major_gift_public_description?: string | null;
};

export type AdminFruitItem = {
  id: string;
  household_id: string;
  source: AdminFruitSource;
  source_app: string | null;
  source_external_id: string | null;
  title: string | null;
  body: string;
  category: string | null;
  testimony_date: string | null;
  submitted_by_name: string | null;
  submitted_by_user_id: string | null;
  permission_to_share: boolean | null;
  missionary_public_approved: boolean | null;
  visibility: AdminFruitVisibility;
  status: AdminFruitStatus;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string | null;
};

export type AdminTeamMember = {
  created_at: string;
  display_name: string;
  dos_user_id: string | null;
  household_id: string;
  id: string;
  is_public: boolean | null;
  public_number: string | null;
  role_title: string | null;
  short_description: string | null;
  sort_order: number | null;
  source: AdminTeamMemberSource;
  status: AdminTeamMemberStatus;
  updated_at: string | null;
};

export type AdminProfile = AdminHousehold & {
  activePrayerRequestCount?: number;
  fruitItems?: AdminFruitItem[];
  prayerPartnerCount?: number;
  support?: AdminSupportSettings;
  teamMembers?: AdminTeamMember[];
};

type MissionaryProfilesAdminDashboardProps = {
  initialProfiles: AdminProfile[];
};

type StatusMessage = {
  tone: "error" | "success";
  text: string;
} | null;

type UploadState = {
  message?: string;
  status: "idle" | "uploading" | "success" | "error";
};

type TargetHouseholdOption = {
  display_name: string;
  id: string;
  slug: string;
};

type TargetHouseholdLoadState = "error" | "idle" | "loading" | "success";

type ControlSection = "profile" | "media" | "team" | "story" | "fruit" | "support" | "prayer";

const emptySupport = (householdId: string): AdminSupportSettings => ({
  annual_goal: 0,
  general_fund_percentage: 10,
  goal_basis: "",
  household_id: householdId,
  monthly_committed: 0,
  monthly_goal: 0,
  monthly_received: 0,
  monthly_button_label: "Support Monthly",
  monthly_giving_url: "",
  one_time_button_label: "Give One Time",
  one_time_giving_url: "",
  major_gift_button_label: "Contact About Major Gift",
  enable_major_gift_inquiry: true,
  major_gift_notify_email: "ryan@usamissionaries.org",
  major_gift_public_description: "",
  show_support: true,
});

const supportModeOptions: Array<{ description: string; label: string; value: AdminSupportMode }> = [
  {
    description: "Public giving is tied directly to this household.",
    label: "Fundraising for this household",
    value: "household",
  },
  {
    description: "Send support toward the broader USA Missionaries mission fund.",
    label: "Route support to General Fund",
    value: "general_fund",
  },
  {
    description: "Route support through the state leadership fund.",
    label: "Route support to State Leader",
    value: "state_leader",
  },
  {
    description: "Route support through the regional leadership fund.",
    label: "Route support to Regional Leader",
    value: "regional_leader",
  },
  {
    description: "Route support through national leadership.",
    label: "Route support to National Leadership",
    value: "national_leadership",
  },
  {
    description: "Invite support toward another missionary household.",
    label: "Nominate another missionary / household",
    value: "household_nomination",
  },
  {
    description: "Remove the support section from the public page.",
    label: "Hide support section",
    value: "hidden",
  },
];

const fruitStatusOptions: Array<{ label: string; value: AdminFruitStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Hidden", value: "hidden" },
  { label: "Archived", value: "archived" },
];

const fruitVisibilityOptions: Array<{ label: string; value: AdminFruitVisibility }> = [
  { label: "Private", value: "private" },
  { label: "Internal", value: "internal" },
  { label: "Public", value: "public" },
];

const teamMemberStatusOptions: Array<{ label: string; value: AdminTeamMemberStatus }> = [
  { label: "Active", value: "active" },
  { label: "Hidden", value: "hidden" },
  { label: "Archived", value: "archived" },
];

const featureDescriptions = {
  show_household: "Controls whether this profile appears publicly in the directory and can be viewed.",
  show_photos: "Shows public profile media including images and future assets. Turn off for a more discreet profile.",
  show_team: "Shows public team or household members connected to this profile.",
  show_story: "Shows the public Our Story section.",
  show_fruit: "Shows testimonies, reviews, updates, and field fruit.",
  show_support: "Shows giving and support invitations.",
  show_prayer: "Shows the prayer invitation and prayer team call to action.",
} as const;

const profileControlSections: Array<{
  description: string;
  featureField: keyof typeof featureDescriptions;
  label: string;
  value: ControlSection;
}> = [
  {
    description: "Hero identity, location display, role, slug, and short mission statement.",
    featureField: "show_household",
    label: "Profile",
    value: "profile",
  },
  {
    description: "Directory image, hero family image, and public media visibility.",
    featureField: "show_photos",
    label: "Media",
    value: "media",
  },
  {
    description: "Public team or household members connected to this profile.",
    featureField: "show_team",
    label: "Team",
    value: "team",
  },
  {
    description: "Our Story content shown below the hero when public and populated.",
    featureField: "show_story",
    label: "Story",
    value: "story",
  },
  {
    description: "Testimonies, reviews, updates, DOS fruit, and public featured items.",
    featureField: "show_fruit",
    label: "Fruit",
    value: "fruit",
  },
  {
    description: "Support routing, donor-facing explanation, giving links, and major gift settings.",
    featureField: "show_support",
    label: "Support",
    value: "support",
  },
  {
    description: "Prayer invitation, prayer team CTA, and prayer request settings.",
    featureField: "show_prayer",
    label: "Prayer",
    value: "prayer",
  },
];

const stateOptions = [
  { label: "Select state", value: "" },
  ...usStates.map((state) => ({ label: state, value: state })),
];

const regionOptions = [
  { label: "Select region", value: "" },
  ...ministryRegionOptions,
];

function toNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function fruitSourceLabel(source: AdminFruitSource | string | null | undefined) {
  switch (source) {
    case "dos":
      return "DOS";
    case "public_form":
      return "Public Form";
    case "website_admin":
    default:
      return "Website Admin";
  }
}

function fruitDateValue(item: AdminFruitItem) {
  const date = new Date(item.testimony_date ?? item.created_at);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getTopFruitItems(items: readonly AdminFruitItem[]) {
  const featured = items
    .filter((item) => item.status === "published" && item.visibility === "public" && item.permission_to_share === true && item.missionary_public_approved === true && item.is_featured === true)
    .sort((first, second) => toNumber(first.sort_order) - toNumber(second.sort_order) || fruitDateValue(second) - fruitDateValue(first));
  const featuredIds = new Set(featured.map((item) => item.id));
  const newest = items
    .filter((item) => item.status === "published" && item.visibility === "public" && item.permission_to_share === true && item.missionary_public_approved === true && !featuredIds.has(item.id))
    .sort((first, second) => fruitDateValue(second) - fruitDateValue(first));

  return [...featured, ...newest].slice(0, 3);
}

function newFruitItem(householdId: string): AdminFruitItem {
  const timestamp = new Date().toISOString();

  return {
    body: "",
    category: "",
    created_at: timestamp,
    household_id: householdId,
    id: `new-${Date.now()}`,
    is_featured: false,
    missionary_public_approved: false,
    permission_to_share: false,
    sort_order: 0,
    source: "website_admin",
    source_app: null,
    source_external_id: null,
    status: "draft",
    submitted_by_name: "",
    submitted_by_user_id: null,
    testimony_date: null,
    title: "",
    updated_at: timestamp,
    visibility: "private",
  };
}

function normalizePublicRosterNumber(value: string | null | undefined) {
  const trimmedValue = value?.trim().replace(/^#/, "") ?? "";

  if (!trimmedValue) {
    return "";
  }

  return /^\d{1,4}$/.test(trimmedValue)
    ? trimmedValue.padStart(4, "0")
    : trimmedValue;
}

function publicRosterNumberValue(value: string | null | undefined) {
  const normalizedValue = normalizePublicRosterNumber(value);

  return /^\d{4}$/.test(normalizedValue) ? normalizedValue : "";
}

function nextPublicRosterNumber(profiles: readonly AdminProfile[]) {
  const usedNumbers = new Set(
    profiles
      .flatMap((profile) => profile.teamMembers ?? [])
      .map((member) => publicRosterNumberValue(member.public_number))
      .filter(Boolean),
  );
  let nextNumber = 1;

  while (usedNumbers.has(String(nextNumber).padStart(4, "0"))) {
    nextNumber += 1;
  }

  return String(nextNumber).padStart(4, "0");
}

function newTeamMember(householdId: string, publicNumber = ""): AdminTeamMember {
  const timestamp = new Date().toISOString();

  return {
    created_at: timestamp,
    display_name: "",
    dos_user_id: "",
    household_id: householdId,
    id: `new-${Date.now()}`,
    is_public: true,
    public_number: publicNumber,
    role_title: "",
    short_description: "",
    sort_order: 0,
    source: "website_admin",
    status: "active",
    updated_at: timestamp,
  };
}

function Field({
  helperText,
  label,
  onChange,
  type = "text",
  value,
  warningText,
}: {
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: number | string | null | undefined;
  warningText?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <input
        className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value ?? ""}
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-stone-500">
          {helperText}
        </span>
      ) : null}
      {warningText ? (
        <span className="mt-2 block text-xs leading-5 text-[#F5B942]">
          {warningText}
        </span>
      ) : null}
    </label>
  );
}

function ImageUploadField({
  helperText,
  label,
  onChange,
  onUpload,
  slot,
  uploadState,
  value,
}: {
  helperText: string;
  label: string;
  onChange: (value: string) => void;
  onUpload: (slot: MissionaryImageSlot, file: File) => void;
  slot: MissionaryImageSlot;
  uploadState: UploadState;
  value: string | null | undefined;
}) {
  const imageUrl = value?.trim();
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const inputId = `missionary-${slot}-image-upload`;
  const isUploading = uploadState.status === "uploading";
  const imageTypeLabel = missionaryImageMimeTypes.map((type) => type.replace("image/", "").replace("jpeg", "jpg")).join(", ");

  useEffect(() => {
    setPreviewFailed(false);
  }, [imageUrl]);

  function uploadFile(file?: File) {
    if (!file || isUploading) {
      return;
    }

    onUpload(slot, file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    uploadFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    uploadFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div>
      <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <p className="mt-2 text-xs leading-5 text-stone-400">
        {helperText}
      </p>

      <div className="relative mt-3 overflow-hidden border border-stone-800 bg-[#050505]">
        {imageUrl ? (
          <div className="flex h-56 items-center justify-center p-3 md:h-64">
            <img
              alt={`${label} preview`}
              className="max-h-full w-full object-contain"
              onError={() => setPreviewFailed(true)}
              onLoad={() => setPreviewFailed(false)}
              src={imageUrl}
            />
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center px-4 text-center text-xs uppercase tracking-[0.18em] text-stone-500 md:h-64" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            No image selected
          </div>
        )}
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs uppercase tracking-[0.24em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Uploading
          </div>
        ) : null}
        {previewFailed ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 px-4 text-center text-xs uppercase tracking-[0.2em] text-red-200" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Image preview could not load
          </div>
        ) : null}
      </div>

      <div
        className={`mt-3 border border-dashed p-4 transition-colors ${
          isDragActive
            ? "border-[#D4A63D] bg-[#D4A63D]/10"
            : "border-stone-700 bg-[#050505]"
        }`}
        onDragLeave={() => setIsDragActive(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDrop={handleDrop}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-100">
              Upload or replace image
            </p>
            <p className="mt-1 text-xs leading-5 text-stone-400">
              {imageTypeLabel}. Max {MISSIONARY_IMAGE_MAX_BYTES / 1024 / 1024}MB.
            </p>
          </div>
          <label
            className={`inline-flex min-h-10 cursor-pointer items-center justify-center border px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors ${
              isUploading
                ? "border-stone-700 text-stone-500"
                : "border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
            }`}
            htmlFor={inputId}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            {isUploading ? "Uploading" : "Upload"}
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isUploading}
            id={inputId}
            onChange={handleFileChange}
            type="file"
          />
        </div>
        {uploadState.message ? (
          <p className={`mt-3 text-xs leading-5 ${
            uploadState.status === "error" ? "text-red-200" : "text-[#F5B942]"
          }`}>
            {uploadState.message}
          </p>
        ) : null}
      </div>

      <details className="mt-3 border border-stone-800 bg-black/20">
        <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Manual URL fallback
        </summary>
        <div className="border-t border-stone-800 p-3">
          <Field
            helperText="Dev fallback. Uploaded images save the full Supabase public URL here automatically."
            label="Image URL"
            onChange={onChange}
            value={value}
          />
        </div>
      </details>
    </div>
  );
}

function TextArea({
  helperText,
  label,
  onChange,
  rows = 4,
  value,
}: {
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string | null | undefined;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <textarea
        className="mt-2 w-full border border-stone-800 bg-[#050505] px-3 py-3 text-sm leading-6 text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value ?? ""}
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-stone-400">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  disabled = false,
  helperText,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string | null | undefined;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <select
        className="mt-2 min-h-11 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value ?? ""}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-stone-400">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function getFeatureValue(profile: AdminProfile, field: keyof typeof featureDescriptions) {
  return profile[field] !== false;
}

function isProfilePublic(profile: AdminProfile) {
  return getFeatureValue(profile, "show_household");
}

function getProfilePrimaryState(profile: AdminProfile) {
  return normalizePrimaryState(profile.primary_state) ?? normalizePrimaryState(profile.location) ?? "";
}

function getProfileServingScope(profile: AdminProfile) {
  return normalizeServingScope(profile.serving_scope);
}

function getProfileRegion(profile: AdminProfile) {
  return normalizeMinistryRegion(profile.region) ?? "";
}

function getProfileRoleType(profile: AdminProfile) {
  return normalizeRoleType(profile.role_type);
}

function getProfileLocationVisibility(profile: AdminProfile) {
  return normalizeLocationVisibility(profile.location_visibility);
}

function getSupportMode(profile: AdminProfile): AdminSupportMode {
  return normalizeSupportRoutingMode(typeof profile.support_mode === "string" ? profile.support_mode : null);
}

function formatLastUpdated(value: string | null | undefined) {
  if (!value) {
    return "Not tracked";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not tracked";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function latestDate(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => {
      const date = new Date(value ?? "");

      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    })
    .filter(Boolean);

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function getControlSection(section: ControlSection) {
  return profileControlSections.find((controlSection) => controlSection.value === section) ?? profileControlSections[0];
}

function getSectionVisible(profile: AdminProfile, section: ControlSection) {
  if (section === "support") {
    return getFeatureValue(profile, "show_support") && getSupportMode(profile) !== "hidden";
  }

  return getFeatureValue(profile, getControlSection(section).featureField);
}

function getSectionLastUpdated(profile: AdminProfile, section: ControlSection) {
  switch (section) {
    case "fruit":
      return formatLastUpdated(latestDate((profile.fruitItems ?? []).map((item) => item.updated_at ?? item.created_at)));
    case "support":
      return formatLastUpdated(profile.support?.updated_at ?? profile.updated_at);
    case "team":
      return formatLastUpdated(latestDate((profile.teamMembers ?? []).map((member) => member.updated_at ?? member.created_at)));
    default:
      return formatLastUpdated(profile.updated_at);
  }
}

function VisibilityBadge({ visible }: { visible: boolean }) {
  return (
    <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${
      visible
        ? "border-green-500/25 bg-green-950/30 text-green-300"
        : "border-stone-700 bg-stone-900/70 text-stone-400"
    }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {visible ? "On" : "Off"}
    </span>
  );
}

function SectionControlTable({
  activeSection,
  onEdit,
  onToggle,
  profile,
}: {
  activeSection: ControlSection;
  onEdit: (section: ControlSection) => void;
  onToggle: (section: ControlSection, visible: boolean) => void;
  profile: AdminProfile;
}) {
  return (
    <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="hidden grid-cols-[0.8fr_0.45fr_minmax(0,1.7fr)_0.65fr_0.45fr] gap-4 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-stone-500 md:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        <span>Section</span>
        <span>Visible</span>
        <span>Description</span>
        <span>Last Updated</span>
        <span>Actions</span>
      </div>
      <div className="divide-y divide-stone-900">
        {profileControlSections.map((section) => {
          const visible = getSectionVisible(profile, section.value);
          const isActive = activeSection === section.value;

          return (
            <div
              className={`grid gap-3 px-4 py-3 text-left text-sm transition-colors md:grid-cols-[0.8fr_0.45fr_minmax(0,1.7fr)_0.65fr_0.45fr] md:items-center md:gap-4 ${
                isActive ? "bg-[#C9A24A]/5" : "hover:bg-stone-950/70"
              }`}
              key={section.value}
            >
              <button
                className="text-left font-semibold text-stone-100"
                onClick={() => onEdit(section.value)}
                type="button"
              >
                {section.label}
              </button>
              <button
                aria-label={`${visible ? "Hide" : "Show"} ${section.label}`}
                className="flex items-center"
                onClick={() => onToggle(section.value, !visible)}
                type="button"
              >
                <VisibilityBadge visible={visible} />
              </button>
              <p className="text-sm leading-6 text-stone-400">{section.description}</p>
              <p className="text-xs text-stone-500 md:text-sm">{getSectionLastUpdated(profile, section.value)}</p>
              <button
                className="inline-flex min-h-8 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                onClick={() => onEdit(section.value)}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                Edit
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FruitItemStatusBadge({ item }: { item: AdminFruitItem }) {
  const isPublic = item.status === "published"
    && item.visibility === "public"
    && item.permission_to_share === true
    && item.missionary_public_approved === true;

  return (
    <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${
      isPublic
        ? "border-[#D4A63D]/40 bg-[#D4A63D]/10 text-[#F5B942]"
        : "border-stone-700 bg-stone-900/70 text-stone-300"
    }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {isPublic ? "Public" : item.status}
    </span>
  );
}

function FruitItemCard({
  item,
  onQuickAction,
  onUpdate,
}: {
  item: AdminFruitItem;
  onQuickAction: (itemId: string, action: "archive" | "feature" | "hide" | "publish" | "unfeature") => void;
  onUpdate: (itemId: string, patch: Partial<AdminFruitItem>) => void;
}) {
  const isDosItem = item.source === "dos";

  return (
    <article className="border border-stone-800/75 bg-[#070707] p-4">
      <div className="flex flex-col gap-3 border-b border-stone-800/70 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FruitItemStatusBadge item={item} />
            <span className="border border-stone-700 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {fruitSourceLabel(item.source)}
            </span>
            {item.is_featured ? (
              <span className="border border-[#D4A63D]/40 bg-[#D4A63D]/10 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Featured
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-5 text-stone-400">
            {isDosItem
              ? "DOS submitted items can become public automatically when approval and visibility fields are set."
              : "Website admin item. Publish only after permission and missionary approval are confirmed."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="border border-stone-700 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
            onClick={() => onQuickAction(item.id, item.is_featured ? "unfeature" : "feature")}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            {item.is_featured ? "Unfeature" : "Feature"}
          </button>
          <button
            className="border border-stone-700 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
            onClick={() => onQuickAction(item.id, "publish")}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Publish
          </button>
          <button
            className="border border-stone-700 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
            onClick={() => onQuickAction(item.id, "hide")}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Hide
          </button>
          <button
            className="border border-stone-700 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-100 hover:border-red-400 hover:text-red-200"
            onClick={() => onQuickAction(item.id, "archive")}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Archive
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-4">
          <Field label="Title" onChange={(value) => onUpdate(item.id, { title: value })} value={item.title} />
          <TextArea label="Body / Testimony" onChange={(value) => onUpdate(item.id, { body: value })} rows={5} value={item.body} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Category" onChange={(value) => onUpdate(item.id, { category: value })} value={item.category} />
            <Field label="Testimony Date" onChange={(value) => onUpdate(item.id, { testimony_date: value || null })} type="date" value={item.testimony_date} />
            <Field label="Submitted By" onChange={(value) => onUpdate(item.id, { submitted_by_name: value })} value={item.submitted_by_name} />
          </div>
        </div>

        <div className="space-y-4 border-t border-stone-800 pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <SelectField
            label="Status"
            onChange={(value) => onUpdate(item.id, { status: value as AdminFruitStatus })}
            options={fruitStatusOptions}
            value={item.status}
          />
          <SelectField
            label="Visibility"
            onChange={(value) => onUpdate(item.id, { visibility: value as AdminFruitVisibility })}
            options={fruitVisibilityOptions}
            value={item.visibility}
          />
          <Field label="Sort Order" onChange={(value) => onUpdate(item.id, { sort_order: Number(value) })} type="number" value={item.sort_order ?? 0} />
          <label className="flex items-start gap-3 text-sm leading-6 text-stone-200">
            <input
              checked={item.is_featured === true}
              className="mt-1 h-4 w-4 accent-[#D4A63D]"
              onChange={(event) => onUpdate(item.id, { is_featured: event.target.checked })}
              type="checkbox"
            />
            Featured item
          </label>
          <label className="flex items-start gap-3 text-sm leading-6 text-stone-200">
            <input
              checked={item.permission_to_share === true}
              className="mt-1 h-4 w-4 accent-[#D4A63D]"
              onChange={(event) => onUpdate(item.id, { permission_to_share: event.target.checked })}
              type="checkbox"
            />
            Permission to share
          </label>
          <label className="flex items-start gap-3 text-sm leading-6 text-stone-200">
            <input
              checked={item.missionary_public_approved === true}
              className="mt-1 h-4 w-4 accent-[#D4A63D]"
              onChange={(event) => onUpdate(item.id, { missionary_public_approved: event.target.checked })}
              type="checkbox"
            />
            Missionary approved public display
          </label>
          <details className="border border-stone-800 bg-black/20">
            <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              View Source
            </summary>
            <div className="space-y-2 border-t border-stone-800 p-3 text-xs leading-5 text-stone-400">
              <p>Source: {fruitSourceLabel(item.source)}</p>
              <p>App: {item.source_app || "—"}</p>
              <p>External ID: {item.source_external_id || "—"}</p>
              <p>User ID: {item.submitted_by_user_id || "—"}</p>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function SupportModeSummary({ mode }: { mode: AdminSupportMode }) {
  const detail = supportRoutingModeDetails[mode];

  return (
    <div className="border border-stone-800/70 bg-[#070707] p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Mode Behavior
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Public Page Says
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-200">
            {detail.publicMeaning}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Giving Buttons Route
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-200">
            {detail.adminRouting}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Missing Target
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-200">
            {detail.adminFallback}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Admin Saves
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-200">
            {detail.adminSavedFields}
          </p>
        </div>
      </div>
    </div>
  );
}

function FruitItemSection({
  emptyText,
  items,
  onQuickAction,
  onUpdate,
  title,
}: {
  emptyText: string;
  items: readonly AdminFruitItem[];
  onQuickAction: (itemId: string, action: "archive" | "feature" | "hide" | "publish" | "unfeature") => void;
  onUpdate: (itemId: string, patch: Partial<AdminFruitItem>) => void;
  title: string;
}) {
  return (
    <section>
      <h3 className="text-xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
        {title}
      </h3>
      <div className="mt-4 space-y-4">
        {items.length > 0 ? items.map((item) => (
          <FruitItemCard item={item} key={item.id} onQuickAction={onQuickAction} onUpdate={onUpdate} />
        )) : (
          <p className="border border-stone-800 bg-[#070707] p-4 text-sm leading-6 text-stone-400">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

function FruitFeedManager({
  items,
  onAdd,
  onQuickAction,
  onUpdate,
}: {
  items: readonly AdminFruitItem[];
  onAdd: () => void;
  onQuickAction: (itemId: string, action: "archive" | "feature" | "hide" | "publish" | "unfeature") => void;
  onUpdate: (itemId: string, patch: Partial<AdminFruitItem>) => void;
}) {
  const topItems = getTopFruitItems(items);
  const publishedItems = items.filter((item) => item.status === "published");
  const hiddenItems = items.filter((item) => item.status === "draft" || item.status === "hidden" || item.status === "archived");
  const dosItems = items.filter((item) => item.source === "dos");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-3 sm:grid-cols-4">
          <StatPreview label="Featured / Top" value={String(topItems.length)} />
          <StatPreview label="Published" value={String(publishedItems.length)} />
          <StatPreview label="Draft Hidden Archived" value={String(hiddenItems.length)} />
          <StatPreview label="DOS Submitted" value={String(dosItems.length)} />
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center bg-[#D4A63D] px-5 py-3 text-xs uppercase tracking-[0.22em] text-black transition-all hover:bg-[#F5B942]"
          onClick={onAdd}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Add Testimony
        </button>
      </div>

      <FruitItemSection
        emptyText="No featured public items yet. Featured items appear first on the public profile."
        items={topItems}
        onQuickAction={onQuickAction}
        onUpdate={onUpdate}
        title="Featured / Top 3 Items"
      />
      <FruitItemSection
        emptyText="No published items yet."
        items={publishedItems}
        onQuickAction={onQuickAction}
        onUpdate={onUpdate}
        title="All Published Items"
      />
      <FruitItemSection
        emptyText="No draft, hidden, or archived items."
        items={hiddenItems}
        onQuickAction={onQuickAction}
        onUpdate={onUpdate}
        title="Draft / Hidden / Archived Items"
      />
      <FruitItemSection
        emptyText="DOS submitted items will appear here when DOS begins sending profile fruit."
        items={dosItems}
        onQuickAction={onQuickAction}
        onUpdate={onUpdate}
        title="DOS Submitted Items"
      />
    </div>
  );
}

function TeamMemberManager({
  allItems,
  items,
  onAdd,
  onArchive,
  onRemove,
  onUpdate,
}: {
  allItems: readonly AdminTeamMember[];
  items: readonly AdminTeamMember[];
  onAdd: () => void;
  onArchive: (memberId: string) => void;
  onRemove: (memberId: string) => void;
  onUpdate: (memberId: string, patch: Partial<AdminTeamMember>) => void;
}) {
  const numberOwners = allItems.reduce((owners, member) => {
    const publicNumber = publicRosterNumberValue(member.public_number);

    if (!publicNumber) {
      return owners;
    }

    owners.set(publicNumber, [...(owners.get(publicNumber) ?? []), member]);
    return owners;
  }, new Map<string, AdminTeamMember[]>());
  const sortedItems = [...items].sort((first, second) => (
    toNumber(first.sort_order) - toNumber(second.sort_order)
    || publicRosterNumberValue(first.public_number).localeCompare(publicRosterNumberValue(second.public_number), undefined, { numeric: true })
    || first.display_name.localeCompare(second.display_name)
  ));
  const publicCount = sortedItems.filter((member) => member.status === "active" && member.is_public !== false).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatPreview label="Public Members" value={String(publicCount)} />
          <StatPreview label="Total Managed" value={String(sortedItems.length)} />
          <StatPreview label="DOS Ready" value={String(sortedItems.filter((member) => member.dos_user_id).length)} />
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center bg-[#D4A63D] px-5 py-3 text-xs uppercase tracking-[0.22em] text-black transition-all hover:bg-[#F5B942]"
          onClick={onAdd}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Add Team Member
        </button>
      </div>

      <p className="max-w-3xl text-sm leading-6 text-stone-400">
        Public numbers are global across USA Missionaries. The UUID stays as the real database ID; this number is only the public roster display.
      </p>

      {sortedItems.length === 0 ? (
        <div className="border border-stone-800 bg-[#050505] p-5 text-sm leading-7 text-stone-400">
          No team members yet. Add public household or ministry team members connected to this profile.
        </div>
      ) : (
        <div className="space-y-4">
          {sortedItems.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              numberOwners={numberOwners}
              onArchive={onArchive}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamMemberRow({
  member,
  numberOwners,
  onArchive,
  onRemove,
  onUpdate,
}: {
  member: AdminTeamMember;
  numberOwners: Map<string, AdminTeamMember[]>;
  onArchive: (memberId: string) => void;
  onRemove: (memberId: string) => void;
  onUpdate: (memberId: string, patch: Partial<AdminTeamMember>) => void;
}) {
  const publicNumber = normalizePublicRosterNumber(member.public_number);
  const duplicateOwner = publicRosterNumberValue(member.public_number)
    ? (numberOwners.get(publicRosterNumberValue(member.public_number)) ?? []).find((owner) => owner.id !== member.id)
    : undefined;
  const numberWarning = publicNumber && !/^\d{4}$/.test(publicNumber)
    ? "Use a 4-digit global roster number, like 0009."
    : duplicateOwner
      ? `Duplicate public number. Already used by ${duplicateOwner.display_name || "another team member"}.`
      : undefined;

  return (
    <div className="border border-stone-800 bg-[#050505] p-4">
              <div className="flex flex-col gap-3 border-b border-stone-800/70 pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {member.source === "dos" ? "DOS" : "Website Admin"}
                  </p>
                  <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                    {member.display_name || "New Team Member"}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {member.id.startsWith("new-") ? (
                    <button
                      className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-red-400 hover:text-red-200"
                      onClick={() => onRemove(member.id)}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      Delete
                    </button>
                  ) : null}
                  <button
                    className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                    onClick={() => onArchive(member.id)}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    Archive
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field
                  label="Display Name"
                  onChange={(value) => onUpdate(member.id, { display_name: value })}
                  value={member.display_name}
                />
                <Field
                  helperText="Global 4-digit display number. Public pages show it as #0009."
                  label="Public Number"
                  onChange={(value) => onUpdate(member.id, { public_number: value })}
                  value={member.public_number}
                  warningText={numberWarning}
                />
                <Field
                  label="Role / Title"
                  onChange={(value) => onUpdate(member.id, { role_title: value })}
                  value={member.role_title}
                />
                <Field
                  label="Sort Order"
                  onChange={(value) => onUpdate(member.id, { sort_order: Number(value) })}
                  type="number"
                  value={member.sort_order ?? 0}
                />
                <SelectField
                  label="Status"
                  onChange={(value) => onUpdate(member.id, { status: value as AdminTeamMemberStatus, is_public: value === "active" })}
                  options={teamMemberStatusOptions}
                  value={member.status}
                />
                <Field
                  helperText="Future DOS connection placeholder."
                  label="DOS User ID"
                  onChange={(value) => onUpdate(member.id, { dos_user_id: value })}
                  value={member.dos_user_id}
                />
              </div>

              <div className="mt-4">
                <TextArea
                  helperText="Optional short public note for this team member."
                  label="Short Description"
                  onChange={(value) => onUpdate(member.id, { short_description: value })}
                  rows={3}
                  value={member.short_description}
                />
              </div>

              <label className="mt-4 inline-flex items-center gap-3 text-sm text-stone-200">
                <input
                  checked={member.is_public !== false && member.status === "active"}
                  className="h-4 w-4 accent-[#D4A63D]"
                  onChange={(event) => onUpdate(member.id, {
                    is_public: event.target.checked,
                    status: event.target.checked ? "active" : "hidden",
                  })}
                  type="checkbox"
                />
                Public visible
              </label>
            </div>
  );
}

function StatPreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-800 bg-black/35 p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
        {value}
      </p>
    </div>
  );
}

function profileSearchText(profile: AdminProfile) {
  return [
    profile.display_name,
    profile.slug,
    getProfilePrimaryState(profile),
    getProfileServingScope(profile),
    getProfileRegion(profile),
    getProfileRoleType(profile),
    profile.short_mission,
  ].filter(Boolean).join(" ").toLowerCase();
}

function ProfileVisibilityBadge({ profile }: { profile: AdminProfile }) {
  const isPublic = isProfilePublic(profile);

  return (
    <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${
      isPublic
        ? "border-green-500/25 bg-green-950/30 text-green-300"
        : "border-stone-700 bg-stone-900/70 text-stone-400"
    }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {isPublic ? "Live" : "Hidden"}
    </span>
  );
}

function ProfileSelectionTable({
  activeProfileId,
  onEdit,
  onPreview,
  profiles,
}: {
  activeProfileId: string;
  onEdit: (profileId: string) => void;
  onPreview: (profileId: string) => void;
  profiles: readonly AdminProfile[];
}) {
  return (
    <section className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
      <div className="hidden grid-cols-[1fr_0.75fr_0.65fr_0.8fr_0.65fr_0.65fr] gap-3 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {["Missionary Profile", "Slug", "Visible", "Location", "Last Updated", "Actions"].map((heading) => (
          <span key={heading}>{heading}</span>
        ))}
      </div>
      <div className="divide-y divide-stone-900">
        {profiles.length > 0 ? profiles.map((profile) => {
          const isActive = activeProfileId === profile.id;

          return (
            <div
              className={`grid w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-stone-950/80 lg:grid-cols-[1fr_0.75fr_0.65fr_0.8fr_0.65fr_0.65fr] lg:items-center ${
                isActive ? "bg-[#C9A24A]/5" : ""
              }`}
              key={profile.id}
              onClick={() => onPreview(profile.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPreview(profile.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-stone-100">{profile.display_name}</span>
                <span className="mt-1 line-clamp-1 text-xs text-stone-500">{profile.short_mission || "No short mission yet"}</span>
              </span>
              <span className="truncate text-stone-400">/{profile.slug}</span>
              <span><ProfileVisibilityBadge profile={profile} /></span>
              <span className="text-stone-400">{getProfilePrimaryState(profile) || "Undisclosed"}</span>
              <span className="text-stone-500">{formatLastUpdated(profile.updated_at)}</span>
              <span className="flex flex-wrap gap-2">
                <button
                  className="inline-flex min-h-8 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(profile.id);
                  }}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  Edit
                </button>
              </span>
            </div>
          );
        }) : (
          <div className="p-6 text-sm leading-7 text-stone-400">
            No missionary profiles match the current filters. Clear search or create a household record to begin.
          </div>
        )}
      </div>
    </section>
  );
}

function ProfileSelectionDrawer({
  onEdit,
  profile,
}: {
  onEdit: (profileId: string) => void;
  profile: AdminProfile | null;
}) {
  if (!profile) {
    return (
      <aside className="border border-stone-800/75 bg-[#080808]/85 p-6 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Profile Detail
        </p>
        <p className="mt-4 text-sm leading-7 text-stone-400">
          Select a missionary profile to review visibility, section readiness, and the next editing action.
        </p>
      </aside>
    );
  }

  const visibleSections = profileControlSections.filter((section) => getSectionVisible(profile, section.value)).length;
  const teamCount = profile.teamMembers?.length ?? 0;
  const fruitCount = profile.fruitItems?.length ?? 0;

  return (
    <aside className="border border-stone-800/75 bg-[#080808]/85 p-5 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
      <div className="border-b border-stone-800/70 pb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Profile Detail
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-100">{profile.display_name}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <ProfileVisibilityBadge profile={profile} />
          <span className="inline-flex min-h-6 items-center border border-stone-700 bg-stone-900/70 px-2 text-[9px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            /{profile.slug}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <StatPreview label="Visible Sections" value={`${visibleSections}/7`} />
        <StatPreview label="Team Members" value={String(teamCount)} />
        <StatPreview label="Fruit Items" value={String(fruitCount)} />
      </div>

      <div className="mt-5 space-y-4 text-sm leading-6 text-stone-300">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Location / Scope
          </p>
          <p className="mt-1">
            {[getProfilePrimaryState(profile) || "Undisclosed", getProfileServingScope(profile), getProfileRegion(profile)].filter(Boolean).join(" / ")}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Short Mission
          </p>
          <p className="mt-1">{profile.short_mission || "No short mission entered yet."}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Last Updated
          </p>
          <p className="mt-1">{formatLastUpdated(profile.updated_at)}</p>
        </div>
      </div>

      <button
        className="mt-6 inline-flex min-h-10 w-full items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942]"
        onClick={() => onEdit(profile.id)}
        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        type="button"
      >
        Edit Profile
      </button>
    </aside>
  );
}

export function MissionaryProfilesAdminDashboard({ initialProfiles }: MissionaryProfilesAdminDashboardProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [profilePreviewId, setProfilePreviewId] = useState(initialProfiles[0]?.id ?? "");
  const [profileQuery, setProfileQuery] = useState("");
  const [profileVisibilityFilter, setProfileVisibilityFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [activeSection, setActiveSection] = useState<ControlSection>("profile");
  const [status, setStatus] = useState<StatusMessage>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<MissionaryImageSlot, UploadState>>({
    directory: { status: "idle" },
    hero: { status: "idle" },
  });
  const [targetHouseholdError, setTargetHouseholdError] = useState("");
  const [targetHouseholdLoadState, setTargetHouseholdLoadState] = useState<TargetHouseholdLoadState>("idle");
  const [targetHouseholds, setTargetHouseholds] = useState<TargetHouseholdOption[]>([]);
  const [isRefreshing, startRefreshTransition] = useTransition();

  useEffect(() => {
    setProfiles(initialProfiles);

    if (selectedId && !initialProfiles.some((profile) => profile.id === selectedId)) {
      setSelectedId("");
    }

    if (profilePreviewId && !initialProfiles.some((profile) => profile.id === profilePreviewId)) {
      setProfilePreviewId(initialProfiles[0]?.id ?? "");
    }
  }, [initialProfiles, profilePreviewId, selectedId]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId),
    [profiles, selectedId],
  );
  const selectedProfileSupportMode = selectedProfile ? getSupportMode(selectedProfile) : "household";

  useEffect(() => {
    if (!selectedProfile || selectedProfileSupportMode !== "household_nomination") {
      setTargetHouseholdError("");
      setTargetHouseholdLoadState("idle");
      setTargetHouseholds([]);
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    setTargetHouseholdError("");
    setTargetHouseholdLoadState("loading");

    fetch(`/api/admin/missionary-profiles/households?exclude=${encodeURIComponent(selectedProfile.id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as {
          error?: string;
          households?: TargetHouseholdOption[];
        };

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load missionary households.");
        }

        if (!isActive) {
          return;
        }

        setTargetHouseholds(Array.isArray(result.households) ? result.households : []);
        setTargetHouseholdLoadState("success");
      })
      .catch((error: unknown) => {
        if (!isActive || controller.signal.aborted) {
          return;
        }

        setTargetHouseholds([]);
        setTargetHouseholdError(error instanceof Error ? error.message : "Unable to load missionary households.");
        setTargetHouseholdLoadState("error");
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [selectedProfile?.id, selectedProfileSupportMode]);

  function updateSelected(nextProfile: AdminProfile) {
    setProfiles((currentProfiles) => currentProfiles.map((profile) => (profile.id === nextProfile.id ? nextProfile : profile)));
  }

  function resetTransientEditorState() {
    setStatus(null);
    setUploadStates({
      directory: { status: "idle" },
      hero: { status: "idle" },
    });
  }

  function openProfile(profileId: string) {
    setSelectedId(profileId);
    setProfilePreviewId(profileId);
    setActiveSection("profile");
    resetTransientEditorState();
  }

  function closeProfile() {
    setSelectedId("");
    setActiveSection("profile");
    resetTransientEditorState();
  }

  function updateHouseholdField(field: keyof AdminHousehold, value: boolean | number | string | null) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      [field]: field === "sort_order" ? Number(value) : value,
    });
  }

  function updatePrimaryState(value: string) {
    if (!selectedProfile) {
      return;
    }

    const primaryState = normalizePrimaryState(value);

    updateSelected({
      ...selectedProfile,
      location: primaryState,
      primary_state: primaryState,
    });
  }

  function updateServingScope(value: string) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      serving_scope: normalizeServingScope(value),
    });
  }

  function updateRegion(value: string) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      region: normalizeMinistryRegion(value),
    });
  }

  function updateRoleType(value: string) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      role_type: normalizeRoleType(value),
    });
  }

  function updateLocationVisibility(value: string) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      location_visibility: normalizeLocationVisibility(value),
    });
  }

  function updateFeatureField(field: keyof typeof featureDescriptions, value: boolean) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      [field]: value,
      public_visible: field === "show_household" ? value : selectedProfile.public_visible,
      support: field === "show_support"
        ? {
          ...(selectedProfile.support ?? emptySupport(selectedProfile.id)),
          show_support: value,
        }
        : selectedProfile.support,
    });
  }

  function updateSupportMode(nextMode: AdminSupportMode) {
    if (!selectedProfile) {
      return;
    }

    const showSupport = nextMode !== "hidden";
    const targetFund = ["general_fund", "state_leader", "regional_leader", "national_leadership"].includes(nextMode)
      ? nextMode
      : null;

    updateSelected({
      ...selectedProfile,
      show_support: showSupport,
      support_mode: nextMode,
      support_target_fund: targetFund,
      support_target_household_id: nextMode === "household_nomination" ? selectedProfile.support_target_household_id : null,
      support: {
        ...(selectedProfile.support ?? emptySupport(selectedProfile.id)),
        show_support: showSupport,
      },
    });
  }

  function updateControlSectionVisibility(section: ControlSection, value: boolean) {
    if (section === "support") {
      updateSupportMode(value ? "household" : "hidden");
      return;
    }

    updateFeatureField(getControlSection(section).featureField, value);
  }

  function updateSupportField(field: keyof AdminSupportSettings, value: boolean | number | string) {
    if (!selectedProfile) {
      return;
    }

    const currentSupport = selectedProfile.support ?? emptySupport(selectedProfile.id);
    const numericFields: Array<keyof AdminSupportSettings> = [
      "annual_goal",
      "general_fund_percentage",
      "monthly_committed",
      "monthly_goal",
      "monthly_received",
    ];

    updateSelected({
      ...selectedProfile,
      support: {
        ...currentSupport,
        [field]: numericFields.includes(field) ? Number(value) : value,
      },
    });
  }

  function updateFruitItem(itemId: string, patch: Partial<AdminFruitItem>) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      fruitItems: (selectedProfile.fruitItems ?? []).map((item) => (
        item.id === itemId
          ? {
            ...item,
            ...patch,
            updated_at: new Date().toISOString(),
          }
          : item
      )),
    });
  }

  function addFruitItem() {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      fruitItems: [
        newFruitItem(selectedProfile.id),
        ...(selectedProfile.fruitItems ?? []),
      ],
    });
  }

  function quickUpdateFruitItem(itemId: string, action: "archive" | "feature" | "hide" | "publish" | "unfeature") {
    const patch = {
      archive: { status: "archived", is_featured: false },
      feature: { is_featured: true },
      hide: { status: "hidden", is_featured: false },
      publish: {
        missionary_public_approved: true,
        permission_to_share: true,
        status: "published",
        visibility: "public",
      },
      unfeature: { is_featured: false },
    }[action] as Partial<AdminFruitItem>;

    updateFruitItem(itemId, patch);
  }

  function updateTeamMember(memberId: string, patch: Partial<AdminTeamMember>) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      teamMembers: (selectedProfile.teamMembers ?? []).map((member) => (
        member.id === memberId
          ? {
            ...member,
            ...patch,
            updated_at: new Date().toISOString(),
          }
          : member
      )),
    });
  }

  function addTeamMember() {
    if (!selectedProfile) {
      return;
    }

    const suggestedPublicNumber = nextPublicRosterNumber(profiles);

    updateSelected({
      ...selectedProfile,
      teamMembers: [
        ...(selectedProfile.teamMembers ?? []),
        newTeamMember(selectedProfile.id, suggestedPublicNumber),
      ],
    });
  }

  function archiveTeamMember(memberId: string) {
    updateTeamMember(memberId, {
      is_public: false,
      status: "archived",
    });
  }

  function removeTeamMember(memberId: string) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      teamMembers: (selectedProfile.teamMembers ?? []).filter((member) => member.id !== memberId),
    });
  }

  async function uploadImage(slot: MissionaryImageSlot, file: File) {
    if (!selectedProfile) {
      return;
    }

    const validationError = validateMissionaryImageFile(file);

    if (validationError) {
      setUploadStates((currentState) => ({
        ...currentState,
        [slot]: { message: validationError, status: "error" },
      }));
      return;
    }

    setUploadStates((currentState) => ({
      ...currentState,
      [slot]: { message: "Uploading image...", status: "uploading" },
    }));

    try {
      const result = await uploadMissionaryProfileImage({
        file,
        householdId: selectedProfile.id,
        slot,
        slug: selectedProfile.slug,
      });
      const imageField = slot === "directory" ? "profile_image_url" : "hero_image_url";

      updateSelected({
        ...selectedProfile,
        [imageField]: result.publicUrl,
      });
      setUploadStates((currentState) => ({
        ...currentState,
        [slot]: { message: "Image uploaded, linked, and saved.", status: "success" },
      }));
      router.refresh();
    } catch (error) {
      setUploadStates((currentState) => ({
        ...currentState,
        [slot]: {
          message: error instanceof Error ? error.message : "Unable to upload image.",
          status: "error",
        },
      }));
    }
  }

  function refreshProfiles() {
    setStatus(null);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  async function saveSelectedProfile() {
    if (!selectedProfile) {
      return;
    }

    const primaryState = getProfilePrimaryState(selectedProfile);
    const locationVisibility = getProfileLocationVisibility(selectedProfile);

    if (!primaryState && locationVisibility === "public") {
      setStatus({
        text: "Choose a primary state before saving, or set location visibility to hidden.",
        tone: "error",
      });
      setActiveSection("profile");
      return;
    }

    setSaving(true);
    setStatus(null);

    const response = await fetch("/api/admin/missionary-profiles/update", {
      body: JSON.stringify({
        household: {
          display_name: selectedProfile.display_name,
          fruit_from_field: selectedProfile.fruit_from_field,
          hero_image_url: selectedProfile.hero_image_url,
          enable_prayer_team: selectedProfile.enable_prayer_team,
          location: primaryState,
          custom_serving_label: selectedProfile.custom_serving_label,
          location_visibility: locationVisibility,
          primary_state: primaryState,
          profile_image_url: selectedProfile.profile_image_url,
          prayer_cta_label: selectedProfile.prayer_cta_label,
          prayer_destination: selectedProfile.prayer_destination,
          prayer_section_description: selectedProfile.prayer_section_description,
          prayer_section_headline: selectedProfile.prayer_section_headline,
          public_visible: isProfilePublic(selectedProfile),
          secondary_states: selectedProfile.secondary_states ?? [],
          serving_scope: getProfileServingScope(selectedProfile),
          region: getProfileRegion(selectedProfile) || null,
          role_type: getProfileRoleType(selectedProfile),
          show_fruit: selectedProfile.show_fruit,
          show_household: selectedProfile.show_household,
          show_photos: selectedProfile.show_photos,
          show_team: selectedProfile.show_team,
          show_prayer: selectedProfile.show_prayer,
          show_story: selectedProfile.show_story,
          show_support: selectedProfile.show_support,
          short_mission: selectedProfile.short_mission,
          slug: selectedProfile.slug,
          sort_order: selectedProfile.sort_order,
          story: selectedProfile.story,
          support_button_label: selectedProfile.support_button_label,
          support_explanation: selectedProfile.support_explanation,
          support_mode: selectedProfile.support_mode,
          support_public_label: selectedProfile.support_public_label,
          support_target_fund: selectedProfile.support_target_fund,
          support_target_household_id: selectedProfile.support_target_household_id,
        },
        householdId: selectedProfile.id,
        fruitItems: selectedProfile.fruitItems ?? [],
        originalSlug: initialProfiles.find((profile) => profile.id === selectedProfile.id)?.slug,
        support: selectedProfile.support ?? emptySupport(selectedProfile.id),
        teamMembers: selectedProfile.teamMembers ?? [],
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus({
        text: typeof result.error === "string" ? result.error : "Unable to save missionary profile.",
        tone: "error",
      });
      setSaving(false);
      return;
    }

    setStatus({
      text: typeof result.message === "string" ? result.message : "Missionary profile saved.",
      tone: "success",
    });
    setSaving(false);
    router.refresh();
  }

  const normalizedProfileQuery = profileQuery.trim().toLowerCase();
  const visibleProfileCount = profiles.filter(isProfilePublic).length;
  const hiddenProfileCount = profiles.length - visibleProfileCount;
  const filteredProfiles = profiles.filter((profile) => (
    (!normalizedProfileQuery || profileSearchText(profile).includes(normalizedProfileQuery))
    && (
      !profileVisibilityFilter
      || (profileVisibilityFilter === "live" ? isProfilePublic(profile) : !isProfilePublic(profile))
    )
  ));
  const previewProfile = filteredProfiles.find((profile) => profile.id === profilePreviewId)
    ?? filteredProfiles[0]
    ?? profiles[0]
    ?? null;

  if (!selectedProfile) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <StatPreview label="Total Profiles" value={String(profiles.length)} />
          <StatPreview label="Live Profiles" value={String(visibleProfileCount)} />
          <StatPreview label="Hidden Profiles" value={String(hiddenProfileCount)} />
        </div>

        <div className="grid gap-3 border border-stone-800 bg-[#080808]/85 p-3 lg:grid-cols-[minmax(220px,1fr)_220px_auto]">
          <label className="block">
            <span className="sr-only">Search profiles</span>
            <input
              className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
              onChange={(event) => setProfileQuery(event.target.value)}
              placeholder="Search profiles, slugs, states, or mission"
              value={profileQuery}
            />
          </label>
          <label className="block">
            <span className="sr-only">Profile visibility</span>
            <select
              className="min-h-10 w-full border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
              onChange={(event) => setProfileVisibilityFilter(event.target.value)}
              value={profileVisibilityFilter}
            >
              <option value="">All Visibility</option>
              <option value="live">Live</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
            disabled={isRefreshing}
            onClick={refreshProfiles}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="border border-stone-800 bg-[#080808]/85 p-8 text-sm leading-7 text-stone-300">
            No missionary households found yet. Profiles will appear here after a household record exists in Supabase.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ProfileSelectionTable
              activeProfileId={previewProfile?.id ?? ""}
              onEdit={openProfile}
              onPreview={setProfilePreviewId}
              profiles={filteredProfiles}
            />
            <ProfileSelectionDrawer onEdit={openProfile} profile={previewProfile} />
          </div>
        )}
      </div>
    );
  }

  const support = selectedProfile.support ?? emptySupport(selectedProfile.id);
  const supportMode = selectedProfileSupportMode;
  const selectedSupportModeOption = supportModeOptions.find((option) => option.value === supportMode) ?? supportModeOptions[0];
  const targetHouseholdOptions = targetHouseholdLoadState === "loading"
    ? [{ label: "Loading households...", value: "" }]
    : targetHouseholds.length > 0
      ? [
        { label: "Select a household", value: "" },
        ...targetHouseholds.map((household) => ({ label: household.display_name, value: household.id })),
      ]
      : [{ label: "No other missionary households available.", value: "" }];
  const targetHouseholdSelectDisabled = targetHouseholdLoadState !== "success" || targetHouseholds.length === 0;
  const showLeadershipPlaceholder = supportMode === "state_leader" || supportMode === "regional_leader";
  const showSupportActions = supportMode !== "hidden";
  const showGivingSettings = showSupportActions;
  const activeControlSection = getControlSection(activeSection);
  const activeSectionVisible = getSectionVisible(selectedProfile, activeSection);

  return (
    <div className="space-y-4">
      <section className="border border-stone-800/75 bg-stone-950/35">
        <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <button
              className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
              onClick={closeProfile}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              Back
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Editing Household
              </p>
              <h2 className="mt-1 text-2xl font-bold uppercase leading-none text-stone-100 md:text-3xl" style={{ fontFamily: font.oswald }}>
                {selectedProfile.display_name}
              </h2>
              <p className="mt-1 text-sm text-stone-300">/{selectedProfile.slug}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-10 items-center justify-center bg-[#D4A63D] px-5 py-2 text-xs uppercase tracking-[0.2em] text-black transition-all hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={saveSelectedProfile}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              {saving ? "Saving" : "Save Updates"}
            </button>
          </div>
        </div>

        {status ? (
          <p className={`mx-4 mb-4 border p-3 text-sm ${
            status.tone === "success"
              ? "border-[#D4A63D]/30 bg-[#D4A63D]/10 text-stone-100"
              : "border-red-500/30 bg-red-950/20 text-red-200"
          }`}>
            {status.text}
          </p>
        ) : null}

        <div className="grid gap-4 border-t border-stone-800/80 p-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <SectionControlTable
            activeSection={activeSection}
            onEdit={setActiveSection}
            onToggle={updateControlSectionVisibility}
            profile={selectedProfile}
          />

          <aside className="border border-stone-800/75 bg-[#080808]/90 p-4 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
            <div className="border-b border-stone-800/70 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Edit Section
                  </p>
                  <h3 className="mt-2 text-2xl font-bold uppercase leading-none text-stone-100" style={{ fontFamily: font.oswald }}>
                    {activeControlSection.label}
                  </h3>
                </div>
                <VisibilityBadge visible={activeSectionVisible} />
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-400">
                {activeControlSection.description}
              </p>
              <label className="mt-4 flex items-center justify-between gap-4 border border-stone-800 bg-[#050505] px-3 py-3 text-sm text-stone-200">
                <span>Show on public profile</span>
                <input
                  checked={activeSectionVisible}
                  className="h-4 w-4 accent-[#D4A63D]"
                  onChange={(event) => updateControlSectionVisibility(activeSection, event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>

            <div className="mt-5">
              {activeSection === "profile" ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-stone-400">
                  Controls the public hero section, location display, and short mission statement.
                </p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Field label="Display Name" onChange={(value) => updateHouseholdField("display_name", value)} value={selectedProfile.display_name} />
              <Field label="Slug" onChange={(value) => updateHouseholdField("slug", value)} value={selectedProfile.slug} />
              <SelectField
                helperText="Required unless location visibility is hidden."
                label="Primary State"
                onChange={updatePrimaryState}
                options={stateOptions}
                value={getProfilePrimaryState(selectedProfile)}
              />
              <SelectField
                helperText="Controls the public serving line."
                label="Serving Scope"
                onChange={updateServingScope}
                options={servingScopeOptions}
                value={getProfileServingScope(selectedProfile)}
              />
              <SelectField
                helperText="Used when serving scope is regional."
                label="Region"
                onChange={updateRegion}
                options={regionOptions}
                value={getProfileRegion(selectedProfile)}
              />
              <SelectField
                helperText="Prepares profiles for state, regional, and national leadership views."
                label="Role Type"
                onChange={updateRoleType}
                options={roleTypeOptions}
                value={getProfileRoleType(selectedProfile)}
              />
              <SelectField
                helperText="Hidden keeps the actual state off public profile and directory displays."
                label="Location Visibility"
                onChange={updateLocationVisibility}
                options={locationVisibilityOptions}
                value={getProfileLocationVisibility(selectedProfile)}
              />
              <Field
                helperText="Optional. If filled, this replaces the generated serving text."
                label="Custom Serving Label"
                onChange={(value) => updateHouseholdField("custom_serving_label", value)}
                value={selectedProfile.custom_serving_label}
              />
            </div>
              <TextArea
                helperText="Shown in the public hero."
                label="Short Mission"
                onChange={(value) => updateHouseholdField("short_mission", value)}
                rows={3}
                value={selectedProfile.short_mission}
              />
              </div>
          ) : null}

              {activeSection === "media" ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-stone-400">
                  Media used on the directory card and as the household overlay on the shared profile hero background.
                </p>
              <ImageUploadField
                helperText="Used on /missionaries cards."
                label="Directory Card Image"
                onChange={(value) => updateHouseholdField("profile_image_url", value)}
                onUpload={uploadImage}
                slot="directory"
                uploadState={uploadStates.directory}
                value={selectedProfile.profile_image_url}
              />
              <ImageUploadField
                helperText="This image appears on top of the shared profile background."
                label="Hero Family Image"
                onChange={(value) => updateHouseholdField("hero_image_url", value)}
                onUpload={uploadImage}
                slot="hero"
                uploadState={uploadStates.hero}
                value={selectedProfile.hero_image_url}
              />
            </div>
          ) : null}

              {activeSection === "team" ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-stone-400">
                  Manage public team and household members connected to this profile. Future DOS user connections can attach here.
                </p>
            <TeamMemberManager
              allItems={profiles.flatMap((profile) => profile.teamMembers ?? [])}
              items={selectedProfile.teamMembers ?? []}
              onAdd={addTeamMember}
              onArchive={archiveTeamMember}
              onRemove={removeTeamMember}
              onUpdate={updateTeamMember}
            />
              </div>
          ) : null}

              {activeSection === "story" ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-stone-400">
                  Story content remains editable even when the section is hidden.
                </p>
            <TextArea
              helperText="Separate paragraphs with a blank line. If empty, the public Our Story section hides automatically."
              label="Our Story"
              onChange={(value) => updateHouseholdField("story", value)}
              rows={10}
              value={selectedProfile.story}
            />
              </div>
          ) : null}

              {activeSection === "fruit" ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-stone-400">
                  Fruit From The Field can include testimonies, reviews, ministry updates, and reports from DOS. Featured items appear on the public profile first.
                </p>
            <FruitFeedManager
              items={selectedProfile.fruitItems ?? []}
              onAdd={addFruitItem}
              onQuickAction={quickUpdateFruitItem}
              onUpdate={updateFruitItem}
            />
              </div>
          ) : null}

              {activeSection === "support" ? (
            <div className="space-y-7">
              <p className="text-sm leading-6 text-stone-400">
                Configure public support routing, donor-facing copy, giving links, and major gift options.
              </p>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Support Routing
                </p>
                <div className="mt-4 grid gap-4">
                  <SelectField
                    helperText={selectedSupportModeOption.description}
                    label="Support Mode"
                    onChange={(value) => updateSupportMode(value as AdminSupportMode)}
                    options={supportModeOptions.map((option) => ({ label: option.label, value: option.value }))}
                    value={supportMode}
                  />

                  {supportMode === "household_nomination" ? (
                    <div>
                      <SelectField
                        disabled={targetHouseholdSelectDisabled}
                        helperText="Select a missionary household to receive support from this profile."
                        label="Target Household"
                        onChange={(value) => updateHouseholdField("support_target_household_id", value || null)}
                        options={targetHouseholdOptions}
                        value={targetHouseholdSelectDisabled ? "" : selectedProfile.support_target_household_id}
                      />
                      {targetHouseholdError ? (
                        <p className="mt-2 border border-red-500/30 bg-red-950/20 p-3 text-xs leading-5 text-red-200">
                          {targetHouseholdError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {showLeadershipPlaceholder ? (
                    <div className="border border-stone-800 bg-[#050505] p-4 text-sm leading-6 text-stone-300">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-200" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        {supportMode === "state_leader" ? "State Leader Target" : "Regional Leader Target"}
                      </p>
                      <p className="mt-2">
                        Leadership target dropdowns are future-ready. Until a leader target exists, public giving falls back to the General Fund.
                      </p>
                    </div>
                  ) : null}

                  {supportMode === "general_fund" || supportMode === "national_leadership" ? (
                    <div className="border border-stone-800 bg-[#050505] p-4 text-sm leading-6 text-stone-300">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-200" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Routing Note
                      </p>
                      <p className="mt-2">
                        This mode uses the default Church Center giving link. Internal allocation can be handled in the giving platform.
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4">
                  <SupportModeSummary mode={supportMode} />
                </div>
                <div className="mt-4">
                  <TextArea
                    helperText="Public donor-facing explanation shown in the Support This Mission section."
                    label="Support Explanation"
                    onChange={(value) => updateHouseholdField("support_explanation", value)}
                    rows={4}
                    value={selectedProfile.support_explanation}
                  />
                </div>
              </div>

              {/* TODO: Reintroduce fundraising numbers when real data tracking and dashboard is built. */}

              {showGivingSettings ? (
              <div className="border-t border-stone-800/70 pt-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Giving Links
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    helperText="If blank, defaults to Church Center giving link with monthly selected."
                    label="Monthly Giving URL"
                    onChange={(value) => updateSupportField("monthly_giving_url", value)}
                    value={support.monthly_giving_url}
                  />
                  <Field
                    helperText="If blank, defaults to Church Center giving link with one-time selected."
                    label="One-Time Giving URL"
                    onChange={(value) => updateSupportField("one_time_giving_url", value)}
                    value={support.one_time_giving_url}
                  />
                </div>
              </div>
              ) : null}

              {showSupportActions ? (
              <div className="border-t border-stone-800/70 pt-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Button Labels
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Monthly Button Label" onChange={(value) => updateSupportField("monthly_button_label", value)} value={support.monthly_button_label ?? "Support Monthly"} />
                  <Field label="One-Time Button Label" onChange={(value) => updateSupportField("one_time_button_label", value)} value={support.one_time_button_label ?? "Give One Time"} />
                  <Field label="Major Gift Button Label" onChange={(value) => updateSupportField("major_gift_button_label", value)} value={support.major_gift_button_label ?? "Contact About Major Gift"} />
                </div>
              </div>
              ) : null}

              {showSupportActions ? (
              <div className="border-t border-stone-800/70 pt-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Major Gift Settings
                </p>
                <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-stone-200">
                  <input
                    checked={support.enable_major_gift_inquiry !== false}
                    className="mt-1 h-4 w-4 accent-[#D4A63D]"
                    onChange={(event) => updateSupportField("enable_major_gift_inquiry", event.target.checked)}
                    type="checkbox"
                  />
                  Enable major gift inquiry modal
                </label>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    helperText="Notification target when email is configured."
                    label="Major Gift Notify Email"
                    onChange={(value) => updateSupportField("major_gift_notify_email", value)}
                    value={support.major_gift_notify_email ?? "ryan@usamissionaries.org"}
                  />
                  <TextArea
                    helperText="Optional public description in the major gift modal."
                    label="Major Gift Public Description"
                    onChange={(value) => updateSupportField("major_gift_public_description", value)}
                    rows={3}
                    value={support.major_gift_public_description}
                  />
                </div>
              </div>
              ) : null}
            </div>
          ) : null}

              {activeSection === "prayer" ? (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-stone-400">
                Control the public prayer section and the Join The Prayer Team flow.
              </p>
              <div className="space-y-5">
                  <label className="flex min-h-24 items-start justify-between gap-4 border border-stone-800 bg-[#070707] p-4 text-sm text-stone-100">
                    <span>
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Show Prayer Section
                      </span>
                      <span className="mt-2 block leading-6 text-stone-400">
                        Controls whether the Prayer Requests section renders on the public profile.
                      </span>
                    </span>
                    <input
                      checked={selectedProfile.show_prayer !== false}
                      className="mt-1 h-4 w-4 accent-[#D4A63D]"
                      onChange={(event) => updateFeatureField("show_prayer", event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                  <label className="flex min-h-24 items-start justify-between gap-4 border border-stone-800 bg-[#070707] p-4 text-sm text-stone-100">
                    <span>
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Enable Join Prayer Team
                      </span>
                      <span className="mt-2 block leading-6 text-stone-400">
                        Shows the signup modal near the hero buttons and inside the prayer section.
                      </span>
                    </span>
                    <input
                      checked={selectedProfile.enable_prayer_team !== false}
                      className="mt-1 h-4 w-4 accent-[#D4A63D]"
                      onChange={(event) => updateHouseholdField("enable_prayer_team", event.target.checked)}
                      type="checkbox"
                    />
                  </label>

                  <Field
                    helperText="Defaults to Join The Prayer Team."
                    label="Prayer CTA Label"
                    onChange={(value) => updateHouseholdField("prayer_cta_label", value)}
                    value={selectedProfile.prayer_cta_label}
                  />
                  <Field
                    helperText="Fallback URL if the prayer team modal is disabled."
                    label="Prayer Destination"
                    onChange={(value) => updateHouseholdField("prayer_destination", value)}
                    value={selectedProfile.prayer_destination}
                  />
                </div>
                <Field
                  helperText="Optional public heading. Defaults to Prayer Requests."
                  label="Prayer Section Headline"
                  onChange={(value) => updateHouseholdField("prayer_section_headline", value)}
                  value={selectedProfile.prayer_section_headline}
                />
                <TextArea
                  helperText="Optional public description shown beside current prayer requests."
                  label="Prayer Section Description"
                  onChange={(value) => updateHouseholdField("prayer_section_description", value)}
                  rows={4}
                  value={selectedProfile.prayer_section_description}
                />
              <aside className="border border-stone-800 bg-[#070707] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Prayer Team Snapshot
                </p>
                <div className="mt-4 grid gap-3">
                  <StatPreview label="Recruited Partners" value={String(selectedProfile.prayerPartnerCount ?? 0)} />
                  <StatPreview label="Active Requests" value={String(selectedProfile.activePrayerRequestCount ?? 0)} />
                </div>
                <Link
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                  href={`/admin/prayer-team?tab=requests&household=${selectedProfile.id}`}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Manage In Prayer Team
                </Link>
              </aside>
            </div>
          ) : null}
            </div>

            <div className="mt-6 border-t border-stone-800/70 pt-4">
              <button
                className="inline-flex min-h-10 w-full items-center justify-center bg-[#D4A63D] px-5 py-2 text-xs uppercase tracking-[0.2em] text-black transition-all hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving}
                onClick={saveSelectedProfile}
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                {saving ? "Saving" : "Save Section"}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
