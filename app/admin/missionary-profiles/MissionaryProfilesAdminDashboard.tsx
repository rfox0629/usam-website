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

export type AdminEncounterStatus = "new" | "reviewed" | "hidden" | "archived";
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
  monthly_giving_url?: string | null;
  one_time_giving_url?: string | null;
  monthly_button_label?: string | null;
  one_time_button_label?: string | null;
  major_gift_button_label?: string | null;
  enable_major_gift_inquiry?: boolean | null;
  major_gift_notify_email?: string | null;
  major_gift_public_description?: string | null;
};

export type AdminEncounterSubmission = {
  created_at: string;
  email: string | null;
  first_name: string | null;
  form_type: "missionary_profile_review";
  id: string;
  last_name: string | null;
  message: string | null;
  permission_to_share: boolean;
  payload: Record<string, unknown>;
  review_text: string;
  source_page: string | null;
  status: AdminEncounterStatus;
  submitter_name: string;
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
  encounterSubmissions?: AdminEncounterSubmission[];
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

type EditorTab = "profile" | "features" | "media" | "team" | "story" | "encounters" | "fruit" | "support" | "prayer";

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

const editorTabs: Array<{ label: string; value: EditorTab }> = [
  { label: "Profile", value: "profile" },
  { label: "Features", value: "features" },
  { label: "Team", value: "team" },
  { label: "Media", value: "media" },
  { label: "Story", value: "story" },
  { label: "Encounters", value: "encounters" },
  { label: "Fruit", value: "fruit" },
  { label: "Support", value: "support" },
  { label: "Prayer", value: "prayer" },
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
      <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <input
        className="mt-2 min-h-12 w-full rounded-md border border-[#333333] bg-[#111111] px-3.5 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value ?? ""}
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-stone-400">
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

function ProfileField({
  helperText,
  label,
  onChange,
  type = "text",
  value,
}: {
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: number | string | null | undefined;
}) {
  return (
    <label className="mb-0 block">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[#cccccc]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <input
        className="mt-2 w-full rounded-md border border-[#333333] bg-[#111111] p-3 text-sm text-white outline-none transition-colors placeholder:text-stone-500 focus:border-[#d4a62a]"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value ?? ""}
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-[#888888]">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function ProfileSelectField({
  helperText,
  label,
  onChange,
  options,
  value,
}: {
  helperText?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string | null | undefined;
}) {
  return (
    <label className="mb-0 block">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[#cccccc]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <select
        className="mt-2 w-full rounded-md border border-[#333333] bg-[#111111] p-3 text-sm text-white outline-none transition-colors focus:border-[#d4a62a]"
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
        <span className="mt-2 block text-xs leading-5 text-[#888888]">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function ProfileTextArea({
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
    <label className="mb-0 block">
      <span className="text-[11px] uppercase tracking-[0.08em] text-[#cccccc]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <textarea
        className="mt-2 w-full rounded-md border border-[#333333] bg-[#111111] p-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-stone-500 focus:border-[#d4a62a]"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value ?? ""}
      />
      {helperText ? (
        <span className="mt-2 block text-xs leading-5 text-[#888888]">
          {helperText}
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

      <div className="relative mt-3 overflow-hidden rounded-lg border border-[#333333] bg-[#111111]">
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
          <div className="flex h-56 items-center justify-center px-4 text-center text-xs uppercase tracking-[0.18em] text-stone-400 md:h-64" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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
        className={`mt-3 rounded-lg border border-dashed p-4 transition-colors ${
          isDragActive
            ? "border-[#D4A63D] bg-[#D4A63D]/10"
            : "border-[#333333] bg-[#111111]"
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

      <details className="mt-3 rounded-md border border-[#333333] bg-[#111111]">
        <summary className="cursor-pointer px-3.5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Manual URL fallback
        </summary>
        <div className="border-t border-[#333333] p-3.5">
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
      <span className="text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <textarea
        className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3.5 py-3 text-sm leading-6 text-stone-950 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
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
        className="mt-2 min-h-12 w-full rounded-md border border-[#333333] bg-[#111111] px-3.5 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D] disabled:cursor-not-allowed disabled:opacity-60"
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

function SectionIntro({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <div className="max-w-[900px]">
      <div className="mb-5 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {title}
        </p>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-stone-300">
            {description}
          </p>
        ) : null}
      </div>
      <div className="rounded-lg border border-[#222222] bg-[#0a0a0a] p-5 md:p-6">
        {children}
      </div>
    </div>
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

function FeatureVisibilityTable({
  rows,
}: {
  rows: Array<{
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
  }>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#222222] bg-[#0f0f0f]">
      <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#222222]">
            <th className="w-[24%] border-r border-[#222222] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Section
            </th>
            <th className="border-r border-[#222222] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Description
            </th>
            <th className="w-[170px] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Visible
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-[#222222] transition-colors last:border-b-0 hover:bg-[#151515]" key={row.label}>
              <td className="border-r border-[#222222] px-4 py-3 align-middle">
                <span className="text-sm font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
                  {row.label}
                </span>
              </td>
              <td className="border-r border-[#222222] px-4 py-3 align-middle">
                <p className="max-w-3xl text-sm leading-5 text-stone-300">
                  {row.description}
                </p>
              </td>
              <td className="px-4 py-3 align-middle">
                <label className="inline-flex cursor-pointer items-center gap-3 text-xs text-stone-200">
                  <input
                    checked={row.checked}
                    className="sr-only"
                    onChange={(event) => row.onChange(event.target.checked)}
                    type="checkbox"
                  />
                  <span className={`relative h-5 w-9 rounded-full border transition-colors ${
                    row.checked
                      ? "border-[#D4A63D]/70 bg-[#D4A63D]/25"
                      : "border-stone-700 bg-stone-900"
                  }`}>
                    <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${
                      row.checked
                        ? "translate-x-4 bg-[#F5B942]"
                        : "translate-x-1 bg-stone-500"
                    }`} />
                  </span>
                  <span className={`text-[10px] uppercase tracking-[0.16em] ${
                    row.checked ? "text-[#F5B942]" : "text-stone-500"
                  }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {row.checked ? "Visible" : "Hidden"}
                  </span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function encounterStatusLabel(value: AdminEncounterStatus) {
  switch (value) {
    case "reviewed":
      return "Reviewed";
    case "hidden":
      return "Hidden";
    case "archived":
      return "Archived";
    case "new":
    default:
      return "New";
  }
}

function truncateText(value: string, maxLength = 120) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function EncounterStatusBadge({ status }: { status: AdminEncounterStatus }) {
  const className = {
    archived: "border-stone-700 bg-stone-900/70 text-stone-400",
    hidden: "border-stone-700 bg-stone-900/70 text-stone-300",
    new: "border-[#D4A63D]/35 bg-[#D4A63D]/10 text-[#F5B942]",
    reviewed: "border-green-500/25 bg-green-950/30 text-green-300",
  }[status];

  return (
    <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {encounterStatusLabel(status)}
    </span>
  );
}

function EncounterSubmissionManager({
  items,
  onQuickAction,
}: {
  items: readonly AdminEncounterSubmission[];
  onQuickAction: (submissionId: string, action: "archive" | "hide" | "review") => void;
}) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(items[0]?.id ?? null);
  const selectedSubmission = items.find((item) => item.id === selectedSubmissionId) ?? null;

  useEffect(() => {
    if (items.length === 0) {
      setSelectedSubmissionId(null);
      return;
    }

    if (!selectedSubmissionId || !items.some((item) => item.id === selectedSubmissionId)) {
      setSelectedSubmissionId(items[0].id);
    }
  }, [items, selectedSubmissionId]);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm leading-6 text-stone-400">
          No reviews or testimonies have been submitted for this profile yet.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-[#222222] bg-[#0f0f0f]">
        <div className="overflow-x-auto">
        <table className="min-w-[1040px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#222222]">
              {["Name", "Email", "Submitted Text", "Permission to Share", "Status", "Date", "Actions"].map((heading) => (
                <th
                  className="border-r border-[#222222] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-300 last:border-r-0"
                  key={heading}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                className={`border-b border-[#222222] transition-colors last:border-b-0 hover:bg-[#151515] ${selectedSubmissionId === item.id ? "bg-[#151515]" : ""}`}
                key={item.id}
              >
                <td className="border-r border-[#222222] px-4 py-3 align-middle">
                  <span className="text-sm font-semibold text-stone-100">
                    {item.submitter_name || "Unknown"}
                  </span>
                </td>
                <td className="border-r border-[#222222] px-4 py-3 align-middle text-sm text-stone-300">
                  {item.email || "Not provided"}
                </td>
                <td className="max-w-[300px] border-r border-[#222222] px-4 py-3 align-middle text-sm leading-6 text-stone-300">
                  {truncateText(item.review_text || item.message || "No testimony text submitted.")}
                </td>
                <td className="border-r border-[#222222] px-4 py-3 align-middle">
                  <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${
                    item.permission_to_share
                      ? "border-green-500/25 bg-green-950/30 text-green-300"
                      : "border-stone-700 bg-stone-900/70 text-stone-400"
                  }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {item.permission_to_share ? "Yes" : "No"}
                  </span>
                </td>
                <td className="border-r border-[#222222] px-4 py-3 align-middle">
                  <EncounterStatusBadge status={item.status} />
                </td>
                <td className="border-r border-[#222222] px-4 py-3 align-middle text-sm text-stone-300">
                  {formatProfileUpdatedDate(item.created_at)}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="border border-stone-700 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
                      onClick={() => setSelectedSubmissionId(item.id)}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      View
                    </button>
                    <button
                      className="border border-stone-700 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
                      onClick={() => onQuickAction(item.id, "review")}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      Mark Reviewed
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {selectedSubmission ? (
        <div className="rounded-lg border border-[#222222] bg-[#0f0f0f] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Encounter
              </p>
              <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                {selectedSubmission.submitter_name || "Submitted Review"}
              </h3>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <DetailText label="Email" value={selectedSubmission.email || "Not provided"} />
            <DetailText label="Permission to Share" value={selectedSubmission.permission_to_share ? "Yes" : "No"} />
            <DetailText label="Status" value={encounterStatusLabel(selectedSubmission.status)} />
          </div>
          <div className="mt-4 rounded-md border border-[#222222] bg-[#111111] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Submitted Text
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-200">
              {selectedSubmission.review_text || selectedSubmission.message || "No testimony text submitted."}
            </p>
          </div>
          <div className="mt-4">
            <DetailText label="Source Page" value={selectedSubmission.source_page || "Not tracked"} />
          </div>
          <details className="mt-4 rounded-md border border-[#222222] bg-[#111111]">
            <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Full Payload
            </summary>
            <pre className="max-h-72 overflow-auto border-t border-[#222222] p-3 text-xs leading-5 text-stone-300">
              {JSON.stringify(selectedSubmission.payload, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}

function FruitPlanningState() {
  const sections = ["Featured Fruit", "Public Testimonies", "Ministry Outcomes", "DOS Submitted Fruit"];

  return (
    <div className="space-y-5">
      <div className="max-w-3xl">
        <h3 className="text-2xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
          Fruit
        </h3>
        <p className="mt-3 text-sm leading-7 text-stone-400">
          Fruit will summarize reviewed encounters into public outcomes, testimonies, and reports connected to this profile.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <div className="rounded-lg border border-[#222222] bg-[#111111] p-4" key={section}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {section}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              Planned for the curated fruit workflow.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-200">
        {value}
      </p>
    </div>
  );
}

function SupportModeSummary({ mode }: { mode: AdminSupportMode }) {
  const detail = supportRoutingModeDetails[mode];

  return (
    <div className="rounded-lg border border-[#222222] bg-[#111111] p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Mode Behavior
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Public Page Says
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-200">
            {detail.publicMeaning}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Giving Buttons Route
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-200">
            {detail.adminRouting}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Missing Target
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-200">
            {detail.adminFallback}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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


function TeamMemberManager({
  allItems,
  items,
  locationLabel,
  onAdd,
  onArchive,
  onRemove,
  onUpdate,
}: {
  allItems: readonly AdminTeamMember[];
  items: readonly AdminTeamMember[];
  locationLabel: string;
  onAdd: () => void;
  onArchive: (memberId: string) => void;
  onRemove: (memberId: string) => void;
  onUpdate: (memberId: string, patch: Partial<AdminTeamMember>) => void;
}) {
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [shouldEditNewestMember, setShouldEditNewestMember] = useState(false);
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
  const editingMember = sortedItems.find((member) => member.id === editingMemberId);

  useEffect(() => {
    if (!shouldEditNewestMember || sortedItems.length === 0) {
      return;
    }

    const newestDraft = [...sortedItems].reverse().find((member) => member.id.startsWith("new-"));
    setEditingMemberId((newestDraft ?? sortedItems[sortedItems.length - 1]).id);
    setShouldEditNewestMember(false);
  }, [shouldEditNewestMember, sortedItems]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="max-w-3xl text-sm leading-6 text-stone-400">
          Public numbers are global across USA Missionaries. The UUID stays as the real database ID; this number is only the public roster display.
        </p>
        <button
          className="inline-flex min-h-11 items-center justify-center bg-[#D4A63D] px-5 py-3 text-xs uppercase tracking-[0.22em] text-black transition-all hover:bg-[#F5B942]"
          onClick={() => {
            setShouldEditNewestMember(true);
            onAdd();
          }}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Add Team Member
        </button>
      </div>

      {sortedItems.length === 0 ? (
        <p className="text-sm leading-6 text-stone-400">
          No team members yet. Add household or ministry team members connected to this profile.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-[#222222] bg-[#0f0f0f]">
        <div className="overflow-x-auto">
        <table className="min-w-[840px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#222222]">
              {["Name", "Role", "Location", "Status", "Public", "Actions"].map((heading) => (
                <th
                  className="border-r border-[#222222] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone-300 last:border-r-0"
                  key={heading}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((member) => (
              <TeamMemberRow
                key={member.id}
                isEditing={editingMemberId === member.id}
                locationLabel={locationLabel}
                member={member}
                onEdit={() => setEditingMemberId(member.id)}
                onUpdate={onUpdate}
              />
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {editingMember ? (
        <TeamMemberEditor
          member={editingMember}
          numberOwners={numberOwners}
          onArchive={onArchive}
          onClose={() => setEditingMemberId(null)}
          onRemove={onRemove}
          onUpdate={onUpdate}
        />
      ) : null}
    </div>
  );
}

function TeamMemberRow({
  isEditing,
  locationLabel,
  member,
  onEdit,
  onUpdate,
}: {
  isEditing: boolean;
  locationLabel: string;
  member: AdminTeamMember;
  onEdit: () => void;
  onUpdate: (memberId: string, patch: Partial<AdminTeamMember>) => void;
}) {
  const isActive = member.status === "active";
  const isPublic = member.is_public !== false && isActive;

  return (
    <tr className={`border-b border-[#222222] transition-colors last:border-b-0 hover:bg-[#151515] ${isEditing ? "bg-[#151515]" : ""}`}>
      <td className="border-r border-[#222222] px-4 py-3 align-middle">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-stone-100">
            {member.display_name || "New Team Member"}
          </span>
          {member.public_number ? (
            <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              #{normalizePublicRosterNumber(member.public_number)}
            </span>
          ) : null}
        </div>
      </td>
      <td className="border-r border-[#222222] px-4 py-3 align-middle text-sm text-stone-300">
        {member.role_title || "Not set"}
      </td>
      <td className="border-r border-[#222222] px-4 py-3 align-middle text-sm text-stone-300">
        {locationLabel || "Not set"}
      </td>
      <td className="border-r border-[#222222] px-4 py-3 align-middle">
        <TeamStatusBadge isActive={isActive} />
      </td>
      <td className="border-r border-[#222222] px-4 py-3 align-middle">
        <label className="inline-flex cursor-pointer items-center gap-3 text-xs text-stone-200">
          <input
            checked={isPublic}
            className="sr-only"
            onChange={(event) => onUpdate(member.id, {
              is_public: event.target.checked,
              status: event.target.checked ? "active" : "hidden",
            })}
            type="checkbox"
          />
          <span className={`relative h-5 w-9 rounded-full border transition-colors ${
            isPublic
              ? "border-[#D4A63D]/70 bg-[#D4A63D]/25"
              : "border-stone-700 bg-stone-900"
          }`}>
            <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${
              isPublic
                ? "translate-x-4 bg-[#F5B942]"
                : "translate-x-1 bg-stone-500"
            }`} />
          </span>
          <span className={`text-[10px] uppercase tracking-[0.16em] ${
            isPublic ? "text-[#F5B942]" : "text-stone-500"
          }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {isPublic ? "On" : "Off"}
          </span>
        </label>
      </td>
      <td className="px-4 py-3 align-middle">
        <button
          className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
          onClick={onEdit}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

function TeamStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${
        isActive
          ? "border-green-500/25 bg-green-950/30 text-green-300"
          : "border-stone-700 bg-stone-900/70 text-stone-400"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function TeamMemberEditor({
  member,
  numberOwners,
  onArchive,
  onClose,
  onRemove,
  onUpdate,
}: {
  member: AdminTeamMember;
  numberOwners: Map<string, AdminTeamMember[]>;
  onArchive: (memberId: string) => void;
  onClose: () => void;
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
    <div className="rounded-lg border border-[#222222] bg-[#0f0f0f] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {member.source === "dos" ? "DOS" : "Website Admin"}
          </p>
          <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
            Edit {member.display_name || "New Team Member"}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {member.id.startsWith("new-") ? (
            <button
              className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-red-400 hover:text-red-200"
              onClick={() => {
                onRemove(member.id);
                onClose();
              }}
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
          <button
            className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
            onClick={onClose}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Close
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
    <div className="rounded-lg border border-[#222222] bg-[#111111] p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold uppercase text-stone-100" style={{ fontFamily: font.oswald }}>
        {value}
      </p>
    </div>
  );
}

function formatProfileUpdatedDate(value: string | null | undefined) {
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

function ProfileVisibilityBadge({ profile }: { profile: AdminProfile }) {
  const isPublic = isProfilePublic(profile);

  return (
    <span
      className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${
        isPublic
          ? "border-green-500/25 bg-green-950/30 text-green-300"
          : "border-stone-700 bg-stone-900/70 text-stone-400"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {isPublic ? "Live" : "Hidden"}
    </span>
  );
}

export function MissionaryProfilesAdminDashboard({ initialProfiles }: MissionaryProfilesAdminDashboardProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState<EditorTab>("profile");
  const [profileQuery, setProfileQuery] = useState("");
  const [profileVisibilityFilter, setProfileVisibilityFilter] = useState("");
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
  }, [initialProfiles, selectedId]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId),
    [profiles, selectedId],
  );
  const selectedProfileSupportMode = selectedProfile ? getSupportMode(selectedProfile) : "household";
  const filteredProfiles = useMemo(() => {
    const normalizedQuery = profileQuery.trim().toLowerCase();

    return profiles.filter((profile) => {
      const publicProfile = isProfilePublic(profile);
      const searchable = [
        profile.display_name,
        profile.slug,
        profile.short_mission,
        getProfilePrimaryState(profile),
        getProfileServingScope(profile),
        getProfileRegion(profile),
      ].filter(Boolean).join(" ").toLowerCase();

      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (!profileVisibilityFilter
          || (profileVisibilityFilter === "live" && publicProfile)
          || (profileVisibilityFilter === "hidden" && !publicProfile));
    });
  }, [profileQuery, profileVisibilityFilter, profiles]);
  const liveProfiles = profiles.filter((profile) => isProfilePublic(profile)).length;
  const hiddenProfiles = profiles.length - liveProfiles;

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
    setActiveTab("profile");
    resetTransientEditorState();
  }

  function closeProfile() {
    setSelectedId("");
    setActiveTab("profile");
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

  function updateEncounterSubmission(submissionId: string, patch: Partial<AdminEncounterSubmission>) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      encounterSubmissions: (selectedProfile.encounterSubmissions ?? []).map((item) => (
        item.id === submissionId
          ? {
            ...item,
            ...patch,
            updated_at: new Date().toISOString(),
          }
          : item
      )),
    });
  }

  function quickUpdateEncounterSubmission(submissionId: string, action: "archive" | "hide" | "review") {
    const patch = {
      archive: { status: "archived" },
      hide: { status: "hidden" },
      review: { status: "reviewed" },
    }[action] as Partial<AdminEncounterSubmission>;

    updateEncounterSubmission(submissionId, patch);
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
      setActiveTab("profile");
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
        encounterSubmissions: selectedProfile.encounterSubmissions ?? [],
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

  if (!selectedProfile) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <StatPreview label="Total Profiles" value={String(profiles.length)} />
          <StatPreview label="Live Profiles" value={String(liveProfiles)} />
          <StatPreview label="Hidden Profiles" value={String(hiddenProfiles)} />
        </div>

        <div className="grid gap-3 rounded-lg border border-[#222222] bg-[#0a0a0a] p-4 md:grid-cols-[minmax(240px,1fr)_220px_auto]">
          <label className="block">
            <span className="sr-only">Search missionary profiles</span>
            <input
              className="min-h-12 w-full rounded-md border border-[#333333] bg-[#111111] px-3.5 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
              onChange={(event) => setProfileQuery(event.target.value)}
              placeholder="Search profiles, slugs, states, or mission"
              value={profileQuery}
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter by visibility</span>
            <select
              className="min-h-12 w-full rounded-md border border-[#333333] bg-[#111111] px-3.5 py-3 text-sm text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
              onChange={(event) => setProfileVisibilityFilter(event.target.value)}
              value={profileVisibilityFilter}
            >
              <option value="">All Visibility</option>
              <option value="live">Live</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-5 text-xs uppercase tracking-[0.22em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
            disabled={isRefreshing}
            onClick={refreshProfiles}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            {isRefreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-lg border border-[#222222] bg-[#0a0a0a] p-8 text-stone-300">
            No missionary households found yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#222222] bg-[#0f0f0f]">
            <div className="overflow-x-auto">
              <table className="min-w-[820px] w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#222222] text-[10px] uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    <th className="w-[34%] border-r border-[#222222] px-4 py-3 font-bold">Missionary Profile</th>
                    <th className="border-r border-[#222222] px-4 py-3 font-bold">Visible</th>
                    <th className="border-r border-[#222222] px-4 py-3 font-bold">Location</th>
                    <th className="border-r border-[#222222] px-4 py-3 font-bold">Last Updated</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.length > 0 ? filteredProfiles.map((profile) => (
                    <tr className="border-b border-[#222222] transition-colors last:border-b-0 hover:bg-[#151515]" key={profile.id}>
                      <td className="border-r border-[#222222] px-4 py-4">
                        <p className="font-medium text-stone-100">{profile.display_name}</p>
                      </td>
                      <td className="border-r border-[#222222] px-4 py-4">
                        <ProfileVisibilityBadge profile={profile} />
                      </td>
                      <td className="border-r border-[#222222] px-4 py-4 text-sm text-stone-300">
                        {getProfileLocationVisibility(profile) === "hidden"
                          ? "Undisclosed"
                          : getProfilePrimaryState(profile) || "Not set"}
                      </td>
                      <td className="border-r border-[#222222] px-4 py-4 text-sm text-stone-300">
                        {formatProfileUpdatedDate(profile.updated_at)}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          className="inline-flex min-h-8 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                          onClick={() => openProfile(profile.id)}
                          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                          type="button"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="px-4 py-8 text-sm text-stone-400" colSpan={5}>
                        No missionary profiles match these filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
  const prayerBehavior = selectedProfile.enable_prayer_team === false ? "link" : "modal";
  const prayerButtonLabel = selectedProfile.prayer_cta_label || "Join The Prayer Team";
  const prayerHeadline = selectedProfile.prayer_section_headline || "Prayer Requests";
  const prayerDescription = selectedProfile.prayer_section_description || "Stand with this household in prayer as they reach, disciple, and serve across the mission field.";
  return (
    <div className="space-y-6">
      <section className="bg-stone-950/35 p-5 md:p-7">
        <div className="flex flex-col gap-4 border-b border-stone-800/80 pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <button
              className="inline-flex min-h-10 items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.22em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
              onClick={closeProfile}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              Back
            </button>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Editing Household
              </p>
              <h2 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
                {selectedProfile.display_name}
              </h2>
              <p className="mt-2 text-sm text-stone-300">/{selectedProfile.slug}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="inline-flex min-h-11 items-center justify-center bg-[#D4A63D] px-5 py-3 text-xs uppercase tracking-[0.22em] text-black transition-all hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"
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
          <p className={`mt-5 border p-4 text-sm ${
            status.tone === "success"
              ? "border-[#D4A63D]/30 bg-[#D4A63D]/10 text-stone-100"
              : "border-red-500/30 bg-red-950/20 text-red-200"
          }`}>
            {status.text}
          </p>
        ) : null}

        <div className="mt-6 overflow-x-auto border-b border-stone-800/80">
          <div className="flex min-w-max gap-2" role="tablist">
            {editorTabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.value}
                className={`border-b-2 px-4 py-3 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                  activeTab === tab.value
                    ? "border-[#D4A63D] text-[#F5B942]"
                    : "border-transparent text-stone-300 hover:text-stone-100"
                }`}
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                role="tab"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {activeTab === "features" ? (
          <SectionIntro
            description="Turn public profile sections on or off without deleting their content."
            title="Profile Features"
          >
            <FeatureVisibilityTable
              rows={[
                {
                  checked: getFeatureValue(selectedProfile, "show_household"),
                  description: featureDescriptions.show_household,
                  label: "Profile Visibility",
                  onChange: (value) => updateFeatureField("show_household", value),
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_photos"),
                  description: featureDescriptions.show_photos,
                  label: "Media",
                  onChange: (value) => updateFeatureField("show_photos", value),
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_team"),
                  description: featureDescriptions.show_team,
                  label: "Team",
                  onChange: (value) => updateFeatureField("show_team", value),
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_story"),
                  description: featureDescriptions.show_story,
                  label: "Our Story",
                  onChange: (value) => updateFeatureField("show_story", value),
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_fruit"),
                  description: featureDescriptions.show_fruit,
                  label: "Fruit",
                  onChange: (value) => updateFeatureField("show_fruit", value),
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_support") && supportMode !== "hidden",
                  description: featureDescriptions.show_support,
                  label: "Support",
                  onChange: (value) => updateSupportMode(value ? "household" : "hidden"),
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_prayer"),
                  description: featureDescriptions.show_prayer,
                  label: "Prayer",
                  onChange: (value) => updateFeatureField("show_prayer", value),
                },
              ]}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "profile" ? (
          <div className="max-w-[900px]">
            <div className="mb-5 max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Profile
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                Controls the public hero section, location display, and short mission statement.
              </p>
            </div>
            <div className="mt-5 max-w-[900px] rounded-lg border border-[#222222] bg-[#0a0a0a] p-6">
              <div className="grid gap-x-4 gap-y-6 md:grid-cols-2">
                <ProfileField label="Display Name" onChange={(value) => updateHouseholdField("display_name", value)} value={selectedProfile.display_name} />
                <ProfileField label="Slug" onChange={(value) => updateHouseholdField("slug", value)} value={selectedProfile.slug} />
                <ProfileSelectField
                helperText="Required unless location visibility is hidden."
                label="Primary State"
                onChange={updatePrimaryState}
                options={stateOptions}
                value={getProfilePrimaryState(selectedProfile)}
              />
                <ProfileSelectField
                helperText="Controls the public serving line."
                label="Serving Scope"
                onChange={updateServingScope}
                options={servingScopeOptions}
                value={getProfileServingScope(selectedProfile)}
              />
                <ProfileSelectField
                helperText="Used when serving scope is regional."
                label="Region"
                onChange={updateRegion}
                options={regionOptions}
                value={getProfileRegion(selectedProfile)}
              />
                <ProfileSelectField
                helperText="Prepares profiles for state, regional, and national leadership views."
                label="Role Type"
                onChange={updateRoleType}
                options={roleTypeOptions}
                value={getProfileRoleType(selectedProfile)}
              />
                <ProfileSelectField
                helperText="Hidden keeps the actual state off public profile and directory displays."
                label="Location Visibility"
                onChange={updateLocationVisibility}
                options={locationVisibilityOptions}
                value={getProfileLocationVisibility(selectedProfile)}
              />
                <ProfileField
                helperText="Optional. If filled, this replaces the generated serving text."
                label="Custom Serving Label"
                onChange={(value) => updateHouseholdField("custom_serving_label", value)}
                value={selectedProfile.custom_serving_label}
              />
              </div>
              <div className="mt-6">
                <ProfileTextArea
                helperText="Shown in the public hero."
                label="Short Mission"
                onChange={(value) => updateHouseholdField("short_mission", value)}
                rows={3}
                value={selectedProfile.short_mission}
              />
              </div>
            </div>
          </div>
          ) : null}

          {activeTab === "media" ? (
          <SectionIntro
            description="Media used on the directory card and as the household overlay on the shared profile hero background."
            title="Media"
          >
            <div className="grid gap-4 md:grid-cols-2">
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
          </SectionIntro>
          ) : null}

          {activeTab === "team" ? (
          <SectionIntro
            description="Manage public team and household members connected to this profile. Future DOS user connections can attach here."
            title="Team"
          >
            <TeamMemberManager
              allItems={profiles.flatMap((profile) => profile.teamMembers ?? [])}
              items={selectedProfile.teamMembers ?? []}
              locationLabel={getProfilePrimaryState(selectedProfile) || selectedProfile.location || ""}
              onAdd={addTeamMember}
              onArchive={archiveTeamMember}
              onRemove={removeTeamMember}
              onUpdate={updateTeamMember}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "story" ? (
          <SectionIntro
            description="Story content remains editable even when the section is hidden."
            title="Story"
          >
            <TextArea
              helperText="Separate paragraphs with a blank line. If empty, the public Our Story section hides automatically."
              label="Our Story"
              onChange={(value) => updateHouseholdField("story", value)}
              rows={10}
              value={selectedProfile.story}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "encounters" ? (
          <SectionIntro
            description="Raw submitted reviews, testimonies, and profile forms exactly as people submitted them."
            title="Encounters"
          >
            <EncounterSubmissionManager
              items={selectedProfile.encounterSubmissions ?? []}
              onQuickAction={quickUpdateEncounterSubmission}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "fruit" ? (
          <SectionIntro
            description="Curated public outcomes, testimonies, and reports will be built from reviewed encounters later."
            title="Fruit"
          >
            <FruitPlanningState />
          </SectionIntro>
          ) : null}

          {activeTab === "support" ? (
          <SectionIntro
            description="Configure public support routing, donor-facing copy, giving links, and major gift options."
            title="Support"
          >
            <div className="space-y-7">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Support Routing
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
                    <div className="rounded-lg border border-[#222222] bg-[#111111] p-4 text-sm leading-6 text-stone-300">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-200" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        {supportMode === "state_leader" ? "State Leader Target" : "Regional Leader Target"}
                      </p>
                      <p className="mt-2">
                        Leadership target dropdowns are future-ready. Until a leader target exists, public giving falls back to the General Fund.
                      </p>
                    </div>
                  ) : null}

                  {supportMode === "general_fund" || supportMode === "national_leadership" ? (
                    <div className="rounded-lg border border-[#222222] bg-[#111111] p-4 text-sm leading-6 text-stone-300">
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
              <div className="border-t border-[#222222] pt-6">
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
              <div className="border-t border-[#222222] pt-6">
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
              <div className="border-t border-[#222222] pt-6">
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
          </SectionIntro>
          ) : null}

          {activeTab === "prayer" ? (
          <SectionIntro
            description="Control the public prayer section and the Join The Prayer Team flow."
            title="Prayer"
          >
            <div className="space-y-7">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Visibility
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="flex items-start justify-between gap-4 rounded-lg border border-[#222222] bg-[#111111] p-4 text-sm text-stone-100">
                    <span>
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Show Prayer Section
                      </span>
                      <span className="mt-2 block leading-6 text-stone-400">
                        Controls whether the prayer section renders on the public profile.
                      </span>
                    </span>
                    <input
                      checked={selectedProfile.show_prayer !== false}
                      className="mt-1 h-4 w-4 accent-[#D4A63D]"
                      onChange={(event) => updateFeatureField("show_prayer", event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                  <label className="flex items-start justify-between gap-4 rounded-lg border border-[#222222] bg-[#111111] p-4 text-sm text-stone-100">
                    <span>
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Enable Join Prayer Team
                      </span>
                      <span className="mt-2 block leading-6 text-stone-400">
                        Enables the prayer-team modal entry point. Disable when the CTA should use a fallback link.
                      </span>
                    </span>
                    <input
                      checked={selectedProfile.enable_prayer_team !== false}
                      className="mt-1 h-4 w-4 accent-[#D4A63D]"
                      onChange={(event) => updateHouseholdField("enable_prayer_team", event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-[#222222] pt-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Call To Action
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    helperText="Defaults to Join The Prayer Team."
                    label="Button Label"
                    onChange={(value) => updateHouseholdField("prayer_cta_label", value)}
                    value={selectedProfile.prayer_cta_label}
                  />
                  <SelectField
                    helperText="Modal opens the profile-aware prayer team signup. Link uses the fallback URL."
                    label="Behavior"
                    onChange={(value) => updateHouseholdField("enable_prayer_team", value !== "link")}
                    options={[
                      { label: "Modal", value: "modal" },
                      { label: "Link", value: "link" },
                    ]}
                    value={prayerBehavior}
                  />
                  {prayerBehavior === "link" ? (
                    <Field
                      helperText="Used when Behavior is Link. Defaults to /prayer if blank."
                      label="Fallback URL"
                      onChange={(value) => updateHouseholdField("prayer_destination", value)}
                      value={selectedProfile.prayer_destination}
                    />
                  ) : null}
                </div>
              </div>

              <div className="border-t border-[#222222] pt-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Public Content
                </p>
                <div className="mt-4 grid gap-4">
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
                </div>
              </div>

              <div className="border-t border-[#222222] pt-6">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Preview
                    </p>
                    <div className="mt-4 rounded-lg border border-[#222222] bg-[#111111] p-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Button
                      </p>
                      <p className="mt-2 text-sm font-semibold text-stone-100">
                        {prayerButtonLabel}
                      </p>
                      <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Headline
                      </p>
                      <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                        {prayerHeadline}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-stone-300">
                        {prayerDescription}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Prayer Team
                    </p>
                    <div className="mt-4 grid gap-3">
                      <StatPreview label="Recruited Partners" value={String(selectedProfile.prayerPartnerCount ?? 0)} />
                      <StatPreview label="Active Requests" value={String(selectedProfile.activePrayerRequestCount ?? 0)} />
                      <Link
                        className="inline-flex min-h-10 w-full items-center justify-center border border-stone-700 px-4 text-[11px] uppercase tracking-[0.18em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                        href={`/admin/prayer-team?tab=requests&household=${selectedProfile.id}`}
                        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      >
                        Manage In Prayer Team
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionIntro>
          ) : null}
        </div>
      </section>
    </div>
  );
}
