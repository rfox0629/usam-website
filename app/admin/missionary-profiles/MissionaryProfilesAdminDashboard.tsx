"use client";

import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MISSIONARY_IMAGE_MAX_BYTES,
  missionaryImageMimeTypes,
  saveGeneratedMissionaryHeroImage,
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
const lightPanelClass = "max-w-[900px] rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-7 text-[#111111] shadow-[0_22px_60px_rgba(0,0,0,0.28)] md:p-8";
const lightInputClass = "mt-2 min-h-12 w-full rounded-xl border border-[#d7d2c8] bg-white px-3.5 py-3 text-sm text-[#111111] outline-none transition-all placeholder:text-[#9a9488] focus:border-[#c8952d] focus:shadow-[0_0_0_3px_rgba(200,149,45,0.16)]";
const lightLabelClass = "text-[11px] uppercase tracking-[0.16em] text-[#6f6658]";
const lightHelperClass = "mt-2 block text-[12px] leading-5 text-[#7b746a]";
const lightPrimaryButtonClass = "inline-flex items-center justify-center rounded-md bg-[#D4A63D] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60";
const lightSecondaryButtonClass = "inline-flex items-center justify-center rounded-md border border-[#d7d2c8] bg-white px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]";
const lightDividerClass = "border-[#e2ded5]";

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
  publicFruitItemCount?: number;
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

type CutoutGenerationSettings = {
  addCamoFatigues: boolean;
  addFacePaint: boolean;
  addHats: boolean;
  addUsamPatch: boolean;
  blurFaces: boolean;
  keepFacesNatural: boolean;
  removeBackground: boolean;
};

type CutoutGenerationState = {
  message?: string;
  path?: string;
  previewUrl?: string;
  status: "idle" | "generating" | "success" | "error";
};

const defaultCutoutGenerationSettings: CutoutGenerationSettings = {
  addCamoFatigues: true,
  addFacePaint: false,
  addHats: false,
  addUsamPatch: true,
  blurFaces: false,
  keepFacesNatural: true,
  removeBackground: true,
};

type TargetHouseholdOption = {
  display_name: string;
  id: string;
  slug: string;
};

type TargetHouseholdLoadState = "error" | "idle" | "loading" | "success";

type EditorTab = "profile" | "features" | "media" | "team" | "story" | "encounters" | "fruit" | "support" | "prayer";
type SupportSubsection = "advanced" | "buttons" | "giving" | "gifts" | "progress";

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

const supportSubsectionOptions: Array<{ label: string; value: SupportSubsection }> = [
  { label: "Fundraising Progress", value: "progress" },
  { label: "Giving Links", value: "giving" },
  { label: "Button Labels", value: "buttons" },
  { label: "Major Gift Settings", value: "gifts" },
  { label: "Advanced Settings", value: "advanced" },
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

function calculateMonthlyGoal(annualGoal: number | null | undefined) {
  const goal = toNumber(annualGoal);

  return goal > 0 ? Math.round(goal / 12) : 0;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  }).format(toNumber(value));
}

function getSupportProgressPercentage(monthlyCommitted: number | null | undefined, monthlyGoal: number | null | undefined) {
  const goal = toNumber(monthlyGoal);

  if (goal <= 0) {
    return 0;
  }

  return Math.round((toNumber(monthlyCommitted) / goal) * 100);
}

function getSupportProgressFillClass(progressPercentage: number) {
  if (progressPercentage >= 100) {
    return "bg-green-600";
  }

  if (progressPercentage >= 50) {
    return "bg-gradient-to-r from-[#D4A63D] to-green-500";
  }

  return "bg-[#D4A63D]";
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
  const highestAssignedNumber = profiles
    .flatMap((profile) => profile.teamMembers ?? [])
    .map((member) => Number.parseInt(publicRosterNumberValue(member.public_number), 10))
    .filter((value) => Number.isFinite(value) && value > 1)
    .reduce((highest, value) => Math.max(highest, value), 1);

  return String(Math.max(2, highestAssignedNumber + 1)).padStart(4, "0");
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
      <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <input
        className={lightInputClass}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value ?? ""}
      />
      {helperText ? (
        <span className={lightHelperClass}>
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
      <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <input
        className={lightInputClass}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value ?? ""}
      />
      {helperText ? (
        <span className={lightHelperClass}>
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
      <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <select
        className={lightInputClass}
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
        <span className={lightHelperClass}>
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
      <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <textarea
        className={`${lightInputClass} leading-6`}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value ?? ""}
      />
      {helperText ? (
        <span className={lightHelperClass}>
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
      <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <p className="mt-2 text-[12px] leading-5 text-[#7b746a]">
        {helperText}
      </p>

      <div className="relative mt-3 overflow-hidden rounded-xl border border-[#d7d2c8] bg-white">
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
          <div className="flex h-56 items-center justify-center px-4 text-center text-xs uppercase tracking-[0.18em] text-[#7b746a] md:h-64" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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
            ? "border-[#c8952d] bg-[#fff8ea]"
            : "border-[#d7d2c8] bg-white"
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
            <p className="text-sm font-medium text-[#111111]">
              Upload or replace image
            </p>
            <p className="mt-1 text-xs leading-5 text-[#7b746a]">
              {imageTypeLabel}. Max {MISSIONARY_IMAGE_MAX_BYTES / 1024 / 1024}MB.
            </p>
          </div>
          <label
            className={`inline-flex min-h-10 cursor-pointer items-center justify-center border px-4 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors ${
              isUploading
                ? "border-[#d7d2c8] text-[#9a9488]"
                : "border-[#d7d2c8] bg-white text-[#111111] hover:border-[#c8952d] hover:text-[#8a5a00]"
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
            uploadState.status === "error" ? "text-red-700" : "text-[#8a5a00]"
          }`}>
            {uploadState.message}
          </p>
        ) : null}
      </div>

      <details className="mt-3 rounded-xl border border-[#d7d2c8] bg-white">
        <summary className="cursor-pointer px-3.5 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Manual URL fallback
        </summary>
        <div className="border-t border-[#e2ded5] p-3.5">
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

function CutoutSettingToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[#e2ded5] bg-white p-3">
      <input
        checked={checked}
        className="mt-1 h-4 w-4 accent-[#D4A63D]"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-semibold text-[#111111]">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#7b746a]">
          {description}
        </span>
      </span>
    </label>
  );
}

function MissionaryCutoutGenerationModal({
  generationState,
  householdName,
  onClose,
  onGenerate,
  onSettingsChange,
  onUse,
  settings,
  sourceImageUrl,
}: {
  generationState: CutoutGenerationState;
  householdName: string;
  onClose: () => void;
  onGenerate: () => void;
  onSettingsChange: (settings: CutoutGenerationSettings) => void;
  onUse: () => void;
  settings: CutoutGenerationSettings;
  sourceImageUrl: string;
}) {
  const isGenerating = generationState.status === "generating";

  function updateSetting(key: keyof CutoutGenerationSettings, value: boolean) {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-4xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              AI Media
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              Generate Missionary Cutout
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b443b]">
              Use the uploaded directory photo for {householdName} to create a transparent hero family image. Review the preview before replacing the current hero image.
            </p>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Source Photo
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-[#d7d2c8] bg-white p-3">
              <img
                alt="Directory source preview"
                className="max-h-72 w-full object-contain"
                src={sourceImageUrl}
              />
            </div>
            <p className="mt-3 rounded-xl border border-[#e2ded5] bg-white p-3 text-xs leading-5 text-[#6f6658]">
              This does not auto-replace your hero image. Generated files are stored as previews until you choose “Use as Hero Image.”
            </p>
          </div>

          <div>
            <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Generation Settings
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <CutoutSettingToggle
                checked={settings.addCamoFatigues}
                description="Dress subjects in black/white field uniforms."
                label="Add camo fatigues"
                onChange={(checked) => updateSetting("addCamoFatigues", checked)}
              />
              <CutoutSettingToggle
                checked={settings.addHats}
                description="Optional matching hats where natural."
                label="Add hats"
                onChange={(checked) => updateSetting("addHats", checked)}
              />
              <CutoutSettingToggle
                checked={settings.addUsamPatch}
                description="Add a small USAM patch where appropriate."
                label="Add USAM patch"
                onChange={(checked) => updateSetting("addUsamPatch", checked)}
              />
              <CutoutSettingToggle
                checked={settings.addFacePaint}
                description="Optional subtle field styling."
                label="Add face paint"
                onChange={(checked) => updateSetting("addFacePaint", checked)}
              />
              <CutoutSettingToggle
                checked={settings.blurFaces}
                description="Use for more discreet public profiles."
                label="Blur faces"
                onChange={(checked) => updateSetting("blurFaces", checked)}
              />
              <CutoutSettingToggle
                checked={settings.removeBackground}
                description="Create a transparent PNG cutout."
                label="Remove background"
                onChange={(checked) => updateSetting("removeBackground", checked)}
              />
              <CutoutSettingToggle
                checked={settings.keepFacesNatural}
                description="Preserve family likeness and natural faces."
                label="Keep faces natural"
                onChange={(checked) => updateSetting("keepFacesNatural", checked)}
              />
            </div>

            <div className="mt-5 rounded-xl border border-[#d7d2c8] bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#111111]">
                    Generated Preview
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#7b746a]">
                    Transparent PNG previews appear here after generation.
                  </p>
                </div>
                <button
                  className={lightPrimaryButtonClass}
                  disabled={isGenerating}
                  onClick={onGenerate}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  {generationState.previewUrl ? "Regenerate" : "Generate Preview"}
                </button>
              </div>

              <div className="relative mt-4 flex min-h-72 items-center justify-center overflow-hidden rounded-xl border border-[#e2ded5] bg-[linear-gradient(45deg,#f1eee7_25%,transparent_25%),linear-gradient(-45deg,#f1eee7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1eee7_75%),linear-gradient(-45deg,transparent_75%,#f1eee7_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]">
                {generationState.previewUrl ? (
                  <img
                    alt="Generated missionary cutout preview"
                    className="max-h-80 w-full object-contain p-3"
                    src={generationState.previewUrl}
                  />
                ) : (
                  <p className="px-4 text-center text-xs uppercase tracking-[0.18em] text-[#7b746a]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    No preview generated yet
                  </p>
                )}
                {isGenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/85 px-4 text-center text-xs uppercase tracking-[0.2em] text-[#8a5a00]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {generationState.message || "Generating image. This may take a moment."}
                  </div>
                ) : null}
              </div>

              {generationState.message ? (
                <p className={`mt-3 text-sm leading-6 ${
                  generationState.status === "error" ? "text-red-700" : "text-[#6f6658]"
                }`}>
                  {generationState.message}
                </p>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  className={lightSecondaryButtonClass}
                  onClick={onClose}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={lightPrimaryButtonClass}
                  disabled={!generationState.previewUrl || isGenerating}
                  onClick={onUse}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  Use as Hero Image
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <textarea
        className={`${lightInputClass} leading-6`}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value ?? ""}
      />
      {helperText ? (
        <span className={lightHelperClass}>
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
      <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <select
        className={`${lightInputClass} disabled:cursor-not-allowed disabled:opacity-60`}
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
        <span className={lightHelperClass}>
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

function CurrencyField({
  helperText,
  label,
  onChange,
  readOnly = false,
  value,
}: {
  helperText?: string;
  label: string;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  value: number | null | undefined;
}) {
  return (
    <label className="block">
      <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </span>
      <span className="relative mt-2 block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#7b746a]">
          $
        </span>
        <input
          className={`${lightInputClass} mt-0 pl-8 ${readOnly ? "bg-[#fbfaf7] text-[#4b443b]" : ""}`}
          inputMode="decimal"
          min="0"
          onChange={(event) => onChange?.(Number(event.target.value))}
          readOnly={readOnly}
          type="number"
          value={toNumber(value)}
        />
      </span>
      {helperText ? (
        <span className={lightHelperClass}>
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
    <div className={lightPanelClass}>
      <div className="mb-6 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {title}
        </p>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-[#5f574c]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
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

function getServingLabelPreview(profile: AdminProfile) {
  const customServingLabel = profile.custom_serving_label?.trim();

  if (customServingLabel) {
    return customServingLabel;
  }

  const primaryState = getProfilePrimaryState(profile);
  const region = getProfileRegion(profile);

  switch (getProfileServingScope(profile)) {
    case "local":
      return "Serving Locally";
    case "statewide":
      return primaryState ? `Serving in ${primaryState}` : "Serving Statewide";
    case "regional": {
      const regionLabel = ministryRegionOptions.find((option) => option.value === region)?.label;
      return region && region !== "other" && regionLabel ? `Serving the ${regionLabel}` : "Serving Regionally";
    }
    case "global":
      return "Serving Globally";
    case "nationwide":
    default:
      return "Serving Nationwide";
  }
}

function getSupportMode(profile: AdminProfile): AdminSupportMode {
  return normalizeSupportRoutingMode(typeof profile.support_mode === "string" ? profile.support_mode : null);
}

type FeaturePublicPageStatus = "hidden" | "missing" | "showing";

type FeatureVisibilityRow = {
  checked: boolean;
  description: string;
  label: string;
  onChange: (checked: boolean) => void;
  publicStatus: FeaturePublicPageStatus;
  statusMessage: string;
};

function hasTextContent(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasRenderableMedia(profile: AdminProfile) {
  return hasTextContent(profile.hero_image_url) || hasTextContent(profile.profile_image_url);
}

function hasRenderableTeam(profile: AdminProfile) {
  return (profile.teamMembers ?? []).some((member) => member.status === "active" && member.is_public !== false);
}

function hasRenderableStory(profile: AdminProfile) {
  return hasTextContent(profile.story);
}

function hasRenderableFruit(profile: AdminProfile) {
  return (profile.publicFruitItemCount ?? 0) > 0;
}

function hasRenderablePrayer(profile: AdminProfile) {
  return profile.enable_prayer_team === true
    || hasTextContent(profile.prayer_cta_label)
    || hasTextContent(profile.prayer_destination)
    || hasTextContent(profile.prayer_section_headline)
    || hasTextContent(profile.prayer_section_description)
    || (profile.activePrayerRequestCount ?? 0) > 0;
}

function getFeaturePublicStatus({
  enabled,
  hiddenMessage,
  hasContent = true,
  missingMessage,
  showingMessage,
}: {
  enabled: boolean;
  hiddenMessage: string;
  hasContent?: boolean;
  missingMessage: string;
  showingMessage: string;
}): { message: string; status: FeaturePublicPageStatus } {
  if (!enabled) {
    return { message: hiddenMessage, status: "hidden" };
  }

  if (!hasContent) {
    return { message: missingMessage, status: "missing" };
  }

  return { message: showingMessage, status: "showing" };
}

function getFeatureStatusBadgeClasses(status: FeaturePublicPageStatus) {
  switch (status) {
    case "showing":
      return "border-green-200 bg-green-50 text-green-800";
    case "missing":
      return "border-[#e6c777] bg-[#fff8e8] text-[#8a5a00]";
    case "hidden":
    default:
      return "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]";
  }
}

function getFeatureStatusLabel(status: FeaturePublicPageStatus) {
  switch (status) {
    case "showing":
      return "Showing";
    case "missing":
      return "Missing Content";
    case "hidden":
    default:
      return "Hidden";
  }
}

function FeatureVisibilityTable({ rows }: { rows: FeatureVisibilityRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="border-b border-[#e2ded5] bg-[#fbfaf7]">
            <th className="w-[58%] border-r border-[#e2ded5] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Section
            </th>
            <th className="w-[22%] border-r border-[#e2ded5] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Toggle
            </th>
            <th className="w-[20%] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-[#e2ded5] transition-colors last:border-b-0 hover:bg-[#fbfaf7]" key={row.label}>
              <td className="border-r border-[#e2ded5] px-4 py-2.5 align-middle">
                <span className="block text-sm font-bold uppercase leading-5 text-[#111111]" style={{ fontFamily: font.oswald }}>
                  {row.label}
                </span>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-[#7b746a]">
                  {row.description}
                </p>
              </td>
              <td className="border-r border-[#e2ded5] px-4 py-2.5 align-middle">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#111111]">
                  <input
                    checked={row.checked}
                    className="sr-only"
                    onChange={(event) => row.onChange(event.target.checked)}
                    type="checkbox"
                  />
                  <span className={`relative h-5 w-9 rounded-full border transition-colors ${
                    row.checked
                      ? "border-[#D4A63D]/70 bg-[#D4A63D]/25"
                      : "border-[#d7d2c8] bg-[#f1eee7]"
                  }`}>
                    <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${
                      row.checked
                        ? "translate-x-4 bg-[#F5B942]"
                        : "translate-x-1 bg-[#9a9488]"
                    }`} />
                  </span>
                  <span className={`text-[10px] uppercase tracking-[0.16em] ${
                    row.checked ? "text-[#8a5a00]" : "text-[#7b746a]"
                  }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {row.checked ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </td>
              <td className="px-4 py-2.5 align-middle">
                <span
                  className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[9px] uppercase tracking-[0.16em] ${getFeatureStatusBadgeClasses(row.publicStatus)}`}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  title={row.statusMessage}
                >
                  {getFeatureStatusLabel(row.publicStatus)}
                </span>
                <span className="sr-only">
                  {row.statusMessage}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
    archived: "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]",
    hidden: "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]",
    new: "border-[#e6c777] bg-[#fff8e8] text-[#8a5a00]",
    reviewed: "border-green-200 bg-green-50 text-green-800",
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
        <p className="text-sm leading-6 text-[#7b746a]">
          No reviews or testimonies have been submitted for this profile yet.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
        <div className="overflow-x-auto">
        <table className="min-w-[1040px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e2ded5] bg-[#fbfaf7]">
              {["Name", "Email", "Submitted Text", "Permission to Share", "Status", "Date", "Actions"].map((heading) => (
                <th
                  className="border-r border-[#e2ded5] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658] last:border-r-0"
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
                className={`border-b border-[#e2ded5] transition-colors last:border-b-0 hover:bg-[#fbfaf7] ${selectedSubmissionId === item.id ? "bg-[#fbfaf7]" : ""}`}
                key={item.id}
              >
                <td className="border-r border-[#e2ded5] px-4 py-3 align-middle">
                  <span className="text-sm font-semibold text-[#111111]">
                    {item.submitter_name || "Unknown"}
                  </span>
                </td>
                <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                  {item.email || "Not provided"}
                </td>
                <td className="max-w-[300px] border-r border-[#e2ded5] px-4 py-3 align-middle text-sm leading-6 text-[#4b443b]">
                  {truncateText(item.review_text || item.message || "No testimony text submitted.")}
                </td>
                <td className="border-r border-[#e2ded5] px-4 py-3 align-middle">
                  <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${
                    item.permission_to_share
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]"
                  }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {item.permission_to_share ? "Yes" : "No"}
                  </span>
                </td>
                <td className="border-r border-[#e2ded5] px-4 py-3 align-middle">
                  <EncounterStatusBadge status={item.status} />
                </td>
                <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                  {formatProfileUpdatedDate(item.created_at)}
                </td>
                <td className="px-4 py-3 align-middle">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={lightSecondaryButtonClass}
                      onClick={() => setSelectedSubmissionId(item.id)}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      View
                    </button>
                    <button
                      className={lightSecondaryButtonClass}
                      onClick={() => onQuickAction(item.id, "review")}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      className={lightSecondaryButtonClass}
                      onClick={() => onQuickAction(item.id, "hide")}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      Hide
                    </button>
                    <button
                      className="rounded-md border border-red-200 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-red-700 hover:border-red-400 hover:text-red-800"
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
        <div className="rounded-xl border border-[#e2ded5] bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Encounter
              </p>
              <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
                {selectedSubmission.submitter_name || "Submitted Review"}
              </h3>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <DetailText label="Email" value={selectedSubmission.email || "Not provided"} />
            <DetailText label="Permission to Share" value={selectedSubmission.permission_to_share ? "Yes" : "No"} />
            <DetailText label="Status" value={encounterStatusLabel(selectedSubmission.status)} />
          </div>
          <div className="mt-4 rounded-xl border border-[#e2ded5] bg-[#fbfaf7] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Submitted Text
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#111111]">
              {selectedSubmission.review_text || selectedSubmission.message || "No testimony text submitted."}
            </p>
          </div>
          <div className="mt-4">
            <DetailText label="Source Page" value={selectedSubmission.source_page || "Not tracked"} />
          </div>
          <details className="mt-4 rounded-xl border border-[#e2ded5] bg-[#fbfaf7]">
            <summary className="cursor-pointer px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Full Payload
            </summary>
            <pre className="max-h-72 overflow-auto border-t border-[#e2ded5] p-3 text-xs leading-5 text-[#4b443b]">
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
        <h3 className="text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
          Fruit
        </h3>
        <p className="mt-3 text-sm leading-7 text-[#7b746a]">
          Fruit will summarize reviewed encounters into public outcomes, testimonies, and reports connected to this profile.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4" key={section}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {section}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#7b746a]">
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
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#111111]">
        {value}
      </p>
    </div>
  );
}

function SupportModeSummary({ mode }: { mode: AdminSupportMode }) {
  const detail = supportRoutingModeDetails[mode];

  return (
    <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Mode Behavior
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Public Page Says
          </p>
          <p className="mt-2 text-sm leading-6 text-[#111111]">
            {detail.publicMeaning}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Giving Buttons Route
          </p>
          <p className="mt-2 text-sm leading-6 text-[#111111]">
            {detail.adminRouting}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Missing Target
          </p>
          <p className="mt-2 text-sm leading-6 text-[#111111]">
            {detail.adminFallback}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Admin Saves
          </p>
          <p className="mt-2 text-sm leading-6 text-[#111111]">
            {detail.adminSavedFields}
          </p>
        </div>
      </div>
    </div>
  );
}

function FundraisingProgressControls({
  monthlyGoal,
  onAnnualGoalChange,
  onMonthlyCommittedChange,
  support,
}: {
  monthlyGoal: number;
  onAnnualGoalChange: (value: number) => void;
  onMonthlyCommittedChange: (value: number) => void;
  support: AdminSupportSettings;
}) {
  const monthlyCommitted = toNumber(support.monthly_committed);
  const progressPercentage = getSupportProgressPercentage(monthlyCommitted, monthlyGoal);
  const visualProgressPercentage = Math.min(Math.max(progressPercentage, 0), 100);

  return (
    <div className="space-y-5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Fundraising Progress
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <CurrencyField
          helperText="Annual fundraising goal for this household."
          label="Annual Goal"
          onChange={onAnnualGoalChange}
          value={support.annual_goal}
        />
        <CurrencyField
          helperText="Calculated from Annual Goal divided by 12."
          label="Monthly Goal"
          readOnly
          value={monthlyGoal}
        />
        <CurrencyField
          helperText="Current monthly support already committed."
          label="Monthly Committed"
          onChange={onMonthlyCommittedChange}
          value={support.monthly_committed}
        />
      </div>

      <div className="mt-5 rounded-xl border border-[#e2ded5] bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Raised Progress
            </p>
            <p className="mt-2 text-sm font-semibold text-[#111111]">
              {formatCurrency(monthlyCommitted)} / {formatCurrency(monthlyGoal)} monthly committed
            </p>
          </div>
          <p className="text-sm font-semibold text-[#111111]">
            {progressPercentage}% raised
          </p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e9e3d8]">
          <div
            className={`h-full rounded-full transition-all ${getSupportProgressFillClass(progressPercentage)}`}
            style={{ width: `${visualProgressPercentage}%` }}
          />
        </div>
        {monthlyGoal <= 0 ? (
          <p className="mt-3 text-xs leading-5 text-[#7b746a]">
            Enter an annual goal to calculate the monthly progress percentage.
          </p>
        ) : null}
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
        <p className="max-w-3xl text-sm leading-6 text-[#7b746a]">
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
        <p className="text-sm leading-6 text-[#7b746a]">
          No team members yet. Add household or ministry team members connected to this profile.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
        <div className="overflow-x-auto">
        <table className="min-w-[840px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e2ded5] bg-[#fbfaf7]">
              {["Name", "Role", "Location", "Status", "Public", "Actions"].map((heading) => (
                <th
                  className="border-r border-[#e2ded5] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658] last:border-r-0"
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
    <tr className={`border-b border-[#e2ded5] transition-colors last:border-b-0 hover:bg-[#fbfaf7] ${isEditing ? "bg-[#fbfaf7]" : ""}`}>
      <td className="border-r border-[#e2ded5] px-4 py-3 align-middle">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-[#111111]">
            {member.display_name || "Name required"}
          </span>
          {member.public_number ? (
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#7b746a]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              #{normalizePublicRosterNumber(member.public_number)}
            </span>
          ) : null}
        </div>
      </td>
      <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
        {member.role_title || "Not set"}
      </td>
      <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
        {locationLabel || "Not set"}
      </td>
      <td className="border-r border-[#e2ded5] px-4 py-3 align-middle">
        <TeamStatusBadge isActive={isActive} />
      </td>
      <td className="border-r border-[#e2ded5] px-4 py-3 align-middle">
        <label className="inline-flex cursor-pointer items-center gap-3 text-xs text-[#4b443b]">
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
              : "border-[#d7d2c8] bg-[#f1eee7]"
          }`}>
            <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform ${
              isPublic
                ? "translate-x-4 bg-[#F5B942]"
                : "translate-x-1 bg-[#9a9488]"
            }`} />
          </span>
          <span className={`text-[10px] uppercase tracking-[0.16em] ${
            isPublic ? "text-[#8a5a00]" : "text-[#7b746a]"
          }`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {isPublic ? "On" : "Off"}
          </span>
        </label>
      </td>
      <td className="px-4 py-3 align-middle">
        <button
          className={lightSecondaryButtonClass}
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
          ? "border-green-200 bg-green-50 text-green-800"
          : "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]"
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
  const numberWarning = publicNumber === "0001"
    ? "0001 is permanently reserved and cannot be assigned to a team member."
    : publicNumber && !/^\d{4}$/.test(publicNumber)
      ? "Use a 4-digit global roster number, like 0009."
      : duplicateOwner
        ? `Duplicate public number. Already used by ${duplicateOwner.display_name || "another team member"}.`
        : undefined;

  return (
    <div className="rounded-xl border border-[#e2ded5] bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {member.source === "dos" ? "DOS" : "Website Admin"}
          </p>
          <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
            Edit {member.display_name || "Team Member"}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {member.id.startsWith("new-") ? (
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-red-200 bg-white px-3 text-[10px] uppercase tracking-[0.18em] text-red-700 transition-colors hover:border-red-400 hover:text-red-800"
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
            className={lightSecondaryButtonClass}
            onClick={() => onArchive(member.id)}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Archive
          </button>
          <button
            className={lightSecondaryButtonClass}
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
        <div>
          <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Public Number
          </span>
          <div className={`${lightInputClass} flex items-center font-semibold`} aria-readonly="true">
            {publicNumber ? `#${publicNumber}` : "Assigned on add"}
          </div>
          <span className={lightHelperClass}>
            System assigned globally. #0001 is reserved and cannot be assigned to a person.
          </span>
          {numberWarning ? (
            <span className="mt-2 block text-[12px] leading-5 text-red-700">
              {numberWarning}
            </span>
          ) : null}
        </div>
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

      <label className="mt-4 inline-flex items-center gap-3 text-sm text-[#4b443b]">
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

function StatPreview({ label, tone = "dark", value }: { label: string; tone?: "dark" | "light"; value: string }) {
  const isLight = tone === "light";

  return (
    <div className={`rounded-xl border p-4 ${isLight ? "border-[#e2ded5] bg-white" : "border-[#222222] bg-[#111111]"}`}>
      <p className={`text-[10px] uppercase tracking-[0.22em] ${isLight ? "text-[#6f6658]" : "text-stone-300"}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold uppercase ${isLight ? "text-[#111111]" : "text-stone-100"}`} style={{ fontFamily: font.oswald }}>
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
  const [supportSubsection, setSupportSubsection] = useState<SupportSubsection>("progress");
  const [profileQuery, setProfileQuery] = useState("");
  const [profileVisibilityFilter, setProfileVisibilityFilter] = useState("");
  const [status, setStatus] = useState<StatusMessage>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<MissionaryImageSlot, UploadState>>({
    directory: { status: "idle" },
    hero: { status: "idle" },
  });
  const [isCutoutModalOpen, setIsCutoutModalOpen] = useState(false);
  const [cutoutSettings, setCutoutSettings] = useState<CutoutGenerationSettings>(defaultCutoutGenerationSettings);
  const [cutoutGenerationState, setCutoutGenerationState] = useState<CutoutGenerationState>({
    status: "idle",
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

  useEffect(() => {
    setIsCutoutModalOpen(false);
    setCutoutSettings(defaultCutoutGenerationSettings);
    setCutoutGenerationState({ status: "idle" });
  }, [selectedId]);

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

  function changeEditorTab(tab: EditorTab) {
    setActiveTab(tab);

    if (tab === "support") {
      setSupportSubsection("progress");
    }
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

  function updateAnnualGoal(value: number) {
    if (!selectedProfile) {
      return;
    }

    const annualGoal = Math.max(0, toNumber(value));
    const currentSupport = selectedProfile.support ?? emptySupport(selectedProfile.id);

    updateSelected({
      ...selectedProfile,
      support: {
        ...currentSupport,
        annual_goal: annualGoal,
        monthly_goal: calculateMonthlyGoal(annualGoal),
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

  function openCutoutModal() {
    if (!selectedProfile?.profile_image_url?.trim()) {
      setUploadStates((currentState) => ({
        ...currentState,
        directory: {
          message: "Upload a directory image before generating a cutout.",
          status: "error",
        },
      }));
      return;
    }

    setCutoutSettings(defaultCutoutGenerationSettings);
    setCutoutGenerationState({ status: "idle" });
    setIsCutoutModalOpen(true);
  }

  async function generateMissionaryCutout() {
    if (!selectedProfile?.profile_image_url?.trim()) {
      setCutoutGenerationState({
        message: "Upload a directory image before generating a cutout.",
        status: "error",
      });
      return;
    }

    setCutoutGenerationState({
      message: "Generating image. This may take a moment.",
      status: "generating",
    });

    try {
      const response = await fetch("/api/admin/missionary-profiles/generate-cutout", {
        body: JSON.stringify({
          householdId: selectedProfile.id,
          settings: cutoutSettings,
          slug: selectedProfile.slug,
          sourceImageUrl: selectedProfile.profile_image_url,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as {
        error?: string;
        path?: string;
        publicUrl?: string;
      };

      if (!response.ok || !result.publicUrl) {
        throw new Error(result.error || "We could not generate the image. Please try again or upload manually.");
      }

      setCutoutGenerationState({
        message: "Preview generated. Review it before using it as the hero image.",
        path: result.path,
        previewUrl: result.publicUrl,
        status: "success",
      });
    } catch (error) {
      setCutoutGenerationState({
        message: error instanceof Error ? error.message : "We could not generate the image. Please try again or upload manually.",
        status: "error",
      });
    }
  }

  async function useGeneratedHeroImage() {
    if (!selectedProfile || !cutoutGenerationState.previewUrl) {
      return;
    }

    setCutoutGenerationState((currentState) => ({
      ...currentState,
      message: "Saving generated image as hero image...",
      status: "generating",
    }));

    try {
      await saveGeneratedMissionaryHeroImage({
        householdId: selectedProfile.id,
        publicUrl: cutoutGenerationState.previewUrl,
      });
      updateSelected({
        ...selectedProfile,
        hero_image_url: cutoutGenerationState.previewUrl,
      });
      setUploadStates((currentState) => ({
        ...currentState,
        hero: {
          message: "Generated cutout saved as Hero Family Image.",
          status: "success",
        },
      }));
      setIsCutoutModalOpen(false);
      setCutoutGenerationState({ status: "idle" });
      router.refresh();
    } catch (error) {
      setCutoutGenerationState((currentState) => ({
        ...currentState,
        message: error instanceof Error ? error.message : "Generated image could not be saved.",
        status: "error",
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
    const supportPayload = selectedProfile.support ?? emptySupport(selectedProfile.id);
    const supportWithCalculatedMonthlyGoal = {
      ...supportPayload,
      monthly_goal: calculateMonthlyGoal(supportPayload.annual_goal),
    };

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
        support: supportWithCalculatedMonthlyGoal,
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
  const calculatedMonthlyGoal = calculateMonthlyGoal(support.annual_goal);
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
  const prayerBehavior = selectedProfile.enable_prayer_team === false ? "link" : "modal";
  const prayerButtonLabel = selectedProfile.prayer_cta_label || "Join The Prayer Team";
  const prayerHeadline = selectedProfile.prayer_section_headline || "Prayer Requests";
  const prayerDescription = selectedProfile.prayer_section_description || "Stand with this household in prayer as they reach, disciple, and serve across the mission field.";
  const profileVisibilityEnabled = getFeatureValue(selectedProfile, "show_household");
  const profileVisibilityStatus = !profileVisibilityEnabled
    ? {
      message: "Disabled profiles do not appear in the directory and cannot be viewed publicly.",
      status: "hidden" as const,
    }
    : selectedProfile.public_visible === true
      ? {
        message: "This profile can appear in the directory and can be viewed publicly.",
        status: "showing" as const,
      }
      : {
        message: "Profile visibility is enabled, but the public visibility flag is not synced. Save updates to make it viewable.",
        status: "hidden" as const,
      };
  const mediaStatus = getFeaturePublicStatus({
    enabled: getFeatureValue(selectedProfile, "show_photos"),
    hasContent: hasRenderableMedia(selectedProfile),
    hiddenMessage: "Media is disabled for a more discreet public profile.",
    missingMessage: "Upload media to show this section.",
    showingMessage: "Public media is available for this profile.",
  });
  const teamStatus = getFeaturePublicStatus({
    enabled: getFeatureValue(selectedProfile, "show_team"),
    hasContent: hasRenderableTeam(selectedProfile),
    hiddenMessage: "The Team section is disabled.",
    missingMessage: "Add team members to show this section.",
    showingMessage: "The Team section has active public members.",
  });
  const storyStatus = getFeaturePublicStatus({
    enabled: getFeatureValue(selectedProfile, "show_story"),
    hasContent: hasRenderableStory(selectedProfile),
    hiddenMessage: "The Our Story section is disabled.",
    missingMessage: "Add story content to show this section.",
    showingMessage: "The Our Story section has content.",
  });
  const fruitStatus = getFeaturePublicStatus({
    enabled: getFeatureValue(selectedProfile, "show_fruit"),
    hasContent: hasRenderableFruit(selectedProfile),
    hiddenMessage: "The Fruit section is disabled.",
    missingMessage: "Add published fruit items to show this section.",
    showingMessage: "Published public fruit is available for this profile.",
  });
  const supportStatus = supportMode === "hidden"
    ? {
      message: "Support mode is set to Hide support section.",
      status: "hidden" as const,
    }
    : getFeaturePublicStatus({
      enabled: getFeatureValue(selectedProfile, "show_support"),
      hiddenMessage: "The Support section is disabled.",
      missingMessage: "Configure support settings to show this section.",
      showingMessage: "The Support section can render publicly.",
    });
  const prayerStatus = getFeaturePublicStatus({
    enabled: getFeatureValue(selectedProfile, "show_prayer"),
    hasContent: hasRenderablePrayer(selectedProfile),
    hiddenMessage: "The Prayer section is disabled.",
    missingMessage: "Configure prayer settings to show this section.",
    showingMessage: "The Prayer section has a CTA, prayer settings, or active requests.",
  });
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
                onClick={() => changeEditorTab(tab.value)}
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
                  publicStatus: profileVisibilityStatus.status,
                  statusMessage: profileVisibilityStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_photos"),
                  description: featureDescriptions.show_photos,
                  label: "Media",
                  onChange: (value) => updateFeatureField("show_photos", value),
                  publicStatus: mediaStatus.status,
                  statusMessage: mediaStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_team"),
                  description: featureDescriptions.show_team,
                  label: "Team",
                  onChange: (value) => updateFeatureField("show_team", value),
                  publicStatus: teamStatus.status,
                  statusMessage: teamStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_story"),
                  description: featureDescriptions.show_story,
                  label: "Our Story",
                  onChange: (value) => updateFeatureField("show_story", value),
                  publicStatus: storyStatus.status,
                  statusMessage: storyStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_fruit"),
                  description: featureDescriptions.show_fruit,
                  label: "Fruit",
                  onChange: (value) => updateFeatureField("show_fruit", value),
                  publicStatus: fruitStatus.status,
                  statusMessage: fruitStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_support"),
                  description: featureDescriptions.show_support,
                  label: "Support",
                  onChange: (value) => updateSupportMode(value ? "household" : "hidden"),
                  publicStatus: supportStatus.status,
                  statusMessage: supportStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_prayer"),
                  description: featureDescriptions.show_prayer,
                  label: "Prayer",
                  onChange: (value) => updateFeatureField("show_prayer", value),
                  publicStatus: prayerStatus.status,
                  statusMessage: prayerStatus.message,
                },
              ]}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "profile" ? (
          <div className="max-w-[900px]">
            <div className={lightPanelClass}>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Profile
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7b746a]">
                Controls the public hero section, location display, and short mission statement.
              </p>

              <div className="mt-6 grid gap-x-4 gap-y-6 md:grid-cols-2">
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
                <div>
                  <ProfileField
                    helperText="Optional. Overrides the default 'Serving in [Location]' text shown on the public profile."
                    label="Custom Serving Label"
                    onChange={(value) => updateHouseholdField("custom_serving_label", value)}
                    value={selectedProfile.custom_serving_label}
                  />
                  <div className="mt-3 rounded-xl border border-[#e2ded5] bg-white p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Public Preview
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#111111]">
                      {getServingLabelPreview(selectedProfile)}
                    </p>
                  </div>
                </div>
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
              <div>
                <ImageUploadField
                  helperText="Normal uploaded family/couple photo used on /missionaries cards."
                  label="Directory Card Image"
                  onChange={(value) => updateHouseholdField("profile_image_url", value)}
                  onUpload={uploadImage}
                  slot="directory"
                  uploadState={uploadStates.directory}
                  value={selectedProfile.profile_image_url}
                />
                <div className="mt-4 rounded-xl border border-[#e2ded5] bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">
                        AI hero cutout
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#7b746a]">
                        Generate a transparent PNG from the directory image. You review before it replaces the hero image.
                      </p>
                    </div>
                    <button
                      className={lightPrimaryButtonClass}
                      disabled={!selectedProfile.profile_image_url?.trim()}
                      onClick={openCutoutModal}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      Generate Missionary Cutout
                    </button>
                  </div>
                </div>
              </div>
              <ImageUploadField
                helperText="Generated transparent PNG/cutout image. This appears on top of the shared profile background."
                label="Hero Family Image"
                onChange={(value) => updateHouseholdField("hero_image_url", value)}
                onUpload={uploadImage}
                slot="hero"
                uploadState={uploadStates.hero}
                value={selectedProfile.hero_image_url}
              />
            </div>
            {isCutoutModalOpen && selectedProfile.profile_image_url?.trim() ? (
              <MissionaryCutoutGenerationModal
                generationState={cutoutGenerationState}
                householdName={selectedProfile.display_name}
                onClose={() => setIsCutoutModalOpen(false)}
                onGenerate={generateMissionaryCutout}
                onSettingsChange={setCutoutSettings}
                onUse={useGeneratedHeroImage}
                settings={cutoutSettings}
                sourceImageUrl={selectedProfile.profile_image_url}
              />
            ) : null}
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
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 border-b border-[#e2ded5] pb-3">
                {supportSubsectionOptions.map((option) => (
                  <button
                    aria-pressed={supportSubsection === option.value}
                    className={`rounded-md border px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                      supportSubsection === option.value
                        ? "border-[#D4A63D] bg-[#D4A63D] text-black"
                        : "border-[#d7d2c8] bg-white text-[#4b443b] hover:border-[#c8952d] hover:text-[#8a5a00]"
                    }`}
                    key={option.value}
                    onClick={() => setSupportSubsection(option.value)}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {supportSubsection === "progress" ? (
                <div className="space-y-5">
                  <FundraisingProgressControls
                    monthlyGoal={calculatedMonthlyGoal}
                    onAnnualGoalChange={updateAnnualGoal}
                    onMonthlyCommittedChange={(value) => updateSupportField("monthly_committed", Math.max(0, toNumber(value)))}
                    support={support}
                  />
                  <div className={`border-t ${lightDividerClass} pt-5`}>
                    <TextArea
                      helperText="Public donor-facing explanation shown in the Support This Mission section."
                      label="Support Explanation"
                      onChange={(value) => updateHouseholdField("support_explanation", value)}
                      rows={4}
                      value={selectedProfile.support_explanation}
                    />
                  </div>
                </div>
              ) : null}

              {supportSubsection === "giving" ? (
                <div>
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

              {supportSubsection === "buttons" ? (
                <div>
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

              {supportSubsection === "gifts" ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Major Gift Settings
                  </p>
                  <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-[#4b443b]">
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

              {supportSubsection === "advanced" ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Advanced Settings
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7b746a]">
                      Control support routing, target fallbacks, and admin-only behavior for this profile.
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
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
                        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
                          {targetHouseholdError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {showLeadershipPlaceholder ? (
                    <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#4b443b]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        {supportMode === "state_leader" ? "State Leader Target" : "Regional Leader Target"}
                      </p>
                      <p className="mt-2">
                        Leadership target dropdowns are future-ready. Until a leader target exists, public giving falls back to the General Fund.
                      </p>
                    </div>
                  ) : null}

                  {supportMode === "general_fund" || supportMode === "national_leadership" ? (
                    <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#4b443b]">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Routing Note
                      </p>
                      <p className="mt-2">
                        This mode uses the default Church Center giving link. Internal allocation can be handled in the giving platform.
                      </p>
                    </div>
                  ) : null}
                </div>

                  <SupportModeSummary mode={supportMode} />
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
                  <label className="flex items-start justify-between gap-4 rounded-xl border border-[#e2ded5] bg-white p-4 text-sm text-[#111111]">
                    <span>
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Show Prayer Section
                      </span>
                      <span className="mt-2 block leading-6 text-[#7b746a]">
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
                  <label className="flex items-start justify-between gap-4 rounded-xl border border-[#e2ded5] bg-white p-4 text-sm text-[#111111]">
                    <span>
                      <span className="block text-[11px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Enable Join Prayer Team
                      </span>
                      <span className="mt-2 block leading-6 text-[#7b746a]">
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

              <div className={`border-t ${lightDividerClass} pt-6`}>
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

              <div className={`border-t ${lightDividerClass} pt-6`}>
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

              <div className={`border-t ${lightDividerClass} pt-6`}>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Preview
                    </p>
                    <div className="mt-4 rounded-xl border border-[#e2ded5] bg-white p-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Button
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#111111]">
                        {prayerButtonLabel}
                      </p>
                      <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Headline
                      </p>
                      <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
                        {prayerHeadline}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-[#4b443b]">
                        {prayerDescription}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Prayer Team
                    </p>
                    <div className="mt-4 grid gap-3">
                      <StatPreview label="Recruited Partners" tone="light" value={String(selectedProfile.prayerPartnerCount ?? 0)} />
                      <StatPreview label="Active Requests" tone="light" value={String(selectedProfile.activePrayerRequestCount ?? 0)} />
                      <Link
                        className={`${lightSecondaryButtonClass} min-h-10 w-full`}
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
