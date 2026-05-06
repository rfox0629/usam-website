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

// Permission model placeholder: this editor is currently master-admin-first, so
// all loaded profile fields remain editable for authorized admins. Future roles
// can layer workflow permissions around this surface without adding field-level
// locks yet: master_admin, admin, reviewer, missionary_user, prayer_team,
// support_team.
export type AdminEncounterStatus = "raw" | "reviewed" | "approved" | "hidden" | "archived";
export type AdminEncounterSource = "manual" | "public_form" | "dos";
export type AdminEncounterSubmissionType = "full_testimony" | "quick_response";
export type AdminOutcomeTag =
  | "Baptism"
  | "Church Connection"
  | "Deliverance"
  | "Discipleship"
  | "Healing"
  | "Other"
  | "Prayer Answered"
  | "Salvation";
export type AdminTableType = "coffee" | "group" | "kitchen_table" | "other" | "phone" | "zoom";
export type AdminFieldPersonStatus = "active" | "archived" | "discipleship" | "follow_up" | "new" | "paused";
export type AdminMovementStep =
  | "Begin discipleship"
  | "Connect to church"
  | "Connect to ministry"
  | "Continue meeting"
  | "Hand off"
  | "Invite to group"
  | "Other"
  | "Pray and wait"
  | "Send follow up";
export type AdminTeachingUsed = "Are You Really a Disciple" | "Commands of Jesus" | "Kitchen Table Gospel" | "Other";
export type AdminReadiness = "Actively following" | "Curious" | "Not ready" | "Open" | "Ready to follow";
export type AdminAssessmentFollowUpArea = "Baptism" | "Community" | "Obedience" | "Prayer" | "Repentance" | "Scripture";
export type AdminConnectionType = "Coffee" | "Discipleship" | "Other" | "Phone call" | "Prayer" | "Text" | "Zoom";
export type AdminFruitStatus = "approved" | "draft" | "private";
export type AdminTeamMemberStatus = "active" | "hidden" | "archived";
export type AdminTeamMemberSource = "website_admin" | "dos" | "public_form";

// Profiles (PF) public read model. These fields control public profile
// content: Profile, Features, Team roster, Media, Story, Support, and Prayer.
// Command Center owns review and publishing; public pages display only
// approved profile content.
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
  original_story?: string | null;
  public_story?: string | null;
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

// Tables are the meeting layer for ministry activity. Command Center manages
// them now; future Field (FD) can create them quickly during daily work.
export type AdminMissionaryTable = {
  created_at: string;
  field_person_ids: string[];
  household_id: string;
  id: string;
  notes: string | null;
  participant_names: string[];
  source: "command_center" | "field";
  table_date: string;
  table_type: AdminTableType;
  updated_at: string | null;
};

// Your Field (People) is the internal relationship map shared by Command
// Center and future Field. These records are not public Profile Team members.
export type AdminFieldPerson = {
  church: string | null;
  created_at: string;
  created_by: string | null;
  email: string | null;
  engagement_level: string | null;
  household_id: string;
  id: string;
  last_activity_at: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationship_type: string | null;
  source: "command_center" | "field";
  status: AdminFieldPersonStatus;
  updated_at: string | null;
};

// Encounters are the raw intake layer for testimonies, forms, reviews, and
// story material. Field (FD) can create these later; Command Center reviews
// them before any approved Fruit is derived.
export type AdminEncounterSubmission = {
  created_at: string;
  do_not_publish: boolean;
  encounter_date: string | null;
  id: string;
  internal_notes: string | null;
  missionary_household_id: string | null;
  missionary_profile_id: string | null;
  original_testimony: string;
  outcome_tags: AdminOutcomeTag[];
  permission_to_share: boolean;
  public_summary: string | null;
  source: AdminEncounterSource;
  status: AdminEncounterStatus;
  submission_type: AdminEncounterSubmissionType;
  submitter_email: string | null;
  submitter_name: string | null;
  submitter_phone: string | null;
  table_id: string | null;
  updated_at: string | null;
};

export type AdminTableReview = {
  assessment_notes: string | null;
  breakthroughs_or_concerns: string | null;
  created_at: string;
  follow_up_areas: AdminAssessmentFollowUpArea[];
  follow_up_needed: string | null;
  household_id: string;
  how_meeting_went: string | null;
  id: string;
  key_observations: string | null;
  movement_step: AdminMovementStep | null;
  questions_covered: string | null;
  readiness: AdminReadiness | null;
  table_id: string;
  teaching_used: AdminTeachingUsed | null;
  updated_at: string | null;
};

export type AdminFruitItem = {
  created_at: string;
  encounter_id: string | null;
  field_person_id: string | null;
  household_id: string;
  id: string;
  internal_notes: string | null;
  outcome_tags: AdminOutcomeTag[];
  status: AdminFruitStatus;
  summary: string;
  table_id: string | null;
  testimony_date: string | null;
  updated_at: string | null;
};

export type AdminConnectionLog = {
  connection_date: string;
  created_at: string;
  duration_minutes: number | null;
  field_person_id: string | null;
  follow_up_needed: string | null;
  household_id: string;
  id: string;
  interaction_type: AdminConnectionType;
  movement_step: AdminMovementStep | null;
  notes: string | null;
  updated_at: string | null;
};

export type AdminLibraryItem = {
  category: string | null;
  content_notes: string | null;
  created_at: string;
  description: string | null;
  household_id: string;
  id: string;
  title: string;
  updated_at: string | null;
};

export type AdminInSeasonFocus = {
  active_people_note: string | null;
  active_tables_note: string | null;
  current_focus: string | null;
  household_id: string;
  id: string;
  prayer_emphasis: string | null;
  updated_at: string | null;
};

// Team is a public-facing roster surface only. Do not use it to store
// disciples, follow-up contacts, or ministry relationships; those belong in
// future People/Tables relationship models.
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
  connectionLogs?: AdminConnectionLog[];
  encounterSubmissions?: AdminEncounterSubmission[];
  fieldPeople?: AdminFieldPerson[];
  fruitItems?: AdminFruitItem[];
  inSeasonFocus?: AdminInSeasonFocus;
  libraryItems?: AdminLibraryItem[];
  prayerPartnerCount?: number;
  publicFruitItemCount?: number;
  support?: AdminSupportSettings;
  tables?: AdminMissionaryTable[];
  tableReviews?: AdminTableReview[];
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
  editMode: "conservative" | "stylized";
  keepFacesNatural: boolean;
  removeBackground: boolean;
  styleReferenceImageDataUrl: string | null;
  styleReferenceImageName: string | null;
};

type CutoutGenerationState = {
  message?: string;
  modelLabel?: string;
  path?: string;
  previewUrl?: string;
  status: "idle" | "generating" | "success" | "error";
};

type StoryRefinementState = {
  message?: string;
  status: "idle" | "refining" | "success" | "error";
};

type TableDraft = {
  fieldPersonIds: string[];
  notes: string;
  participantNamesText: string;
  tableDate: string;
  tableType: AdminTableType;
};

type QuickEncounterDraft = {
  email: string;
  length: "long" | "short";
  name: string;
  text: string;
};

type FieldPersonDraft = {
  church: string;
  email: string;
  engagementLevel: string;
  name: string;
  notes: string;
  phone: string;
  relationshipType: string;
  status: AdminFieldPersonStatus;
};

type ConnectionDraft = {
  connectionDate: string;
  durationMinutes: string;
  fieldPersonId: string;
  followUpNeeded: string;
  interactionType: AdminConnectionType;
  movementStep: AdminMovementStep | "";
  notes: string;
};

type LibraryItemDraft = {
  category: string;
  contentNotes: string;
  description: string;
  title: string;
};

type FruitDraft = {
  encounterId: string;
  fieldPersonId: string;
  internalNotes: string;
  outcomeTags: AdminOutcomeTag[];
  status: AdminFruitStatus;
  summary: string;
  tableId: string;
  testimonyDate: string;
};

const defaultCutoutGenerationSettings: CutoutGenerationSettings = {
  addCamoFatigues: true,
  addFacePaint: false,
  addHats: false,
  addUsamPatch: true,
  blurFaces: false,
  editMode: "conservative",
  keepFacesNatural: true,
  removeBackground: true,
  styleReferenceImageDataUrl: null,
  styleReferenceImageName: null,
};

type TargetHouseholdOption = {
  display_name: string;
  id: string;
  slug: string;
};

type TargetHouseholdLoadState = "error" | "idle" | "loading" | "success";

type EditorTab =
  | "overview"
  | "people"
  | "tables"
  | "connections"
  | "fruit"
  | "library"
  | "in-season"
  | "profile"
  | "features"
  | "team"
  | "media"
  | "story"
  | "support"
  | "prayer";
type SupportSubsection = "advanced" | "buttons" | "giving" | "gifts" | "progress";
type PrayerSubsection = "content" | "cta" | "preview" | "team" | "visibility";

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

const outcomeTagOptions: AdminOutcomeTag[] = [
  "Salvation",
  "Baptism",
  "Healing",
  "Deliverance",
  "Church Connection",
  "Discipleship",
  "Prayer Answered",
  "Other",
];

const movementStepOptions: AdminMovementStep[] = [
  "Continue meeting",
  "Begin discipleship",
  "Send follow up",
  "Invite to group",
  "Connect to church",
  "Connect to ministry",
  "Hand off",
  "Pray and wait",
  "Other",
];

const movementStepSelectOptions: Array<{ label: string; value: string }> = [
  { label: "Select next step", value: "" },
  ...movementStepOptions.map((step) => ({ label: step, value: step })),
];

const teachingUsedOptions: Array<{ label: string; value: string }> = [
  { label: "Select teaching", value: "" },
  { label: "Kitchen Table Gospel", value: "Kitchen Table Gospel" },
  { label: "Are You Really a Disciple", value: "Are You Really a Disciple" },
  { label: "Commands of Jesus", value: "Commands of Jesus" },
  { label: "Other", value: "Other" },
];

const readinessOptions: Array<{ label: string; value: string }> = [
  { label: "Select readiness", value: "" },
  { label: "Not ready", value: "Not ready" },
  { label: "Curious", value: "Curious" },
  { label: "Open", value: "Open" },
  { label: "Ready to follow", value: "Ready to follow" },
  { label: "Actively following", value: "Actively following" },
];

const assessmentFollowUpAreaOptions: AdminAssessmentFollowUpArea[] = [
  "Repentance",
  "Baptism",
  "Scripture",
  "Prayer",
  "Community",
  "Obedience",
];

const connectionTypeOptions: Array<{ label: string; value: AdminConnectionType }> = [
  { label: "Phone call", value: "Phone call" },
  { label: "Zoom", value: "Zoom" },
  { label: "Text", value: "Text" },
  { label: "Coffee", value: "Coffee" },
  { label: "Prayer", value: "Prayer" },
  { label: "Discipleship", value: "Discipleship" },
  { label: "Other", value: "Other" },
];

const fruitStatusOptions: Array<{ label: string; value: AdminFruitStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Approved", value: "approved" },
  { label: "Private", value: "private" },
];

const tableTypeOptions: Array<{ label: string; value: AdminTableType }> = [
  { label: "Kitchen Table", value: "kitchen_table" },
  { label: "Coffee", value: "coffee" },
  { label: "Phone", value: "phone" },
  { label: "Zoom", value: "zoom" },
  { label: "Group", value: "group" },
  { label: "Other", value: "other" },
];

const fieldPersonStatusOptions: Array<{ label: string; value: AdminFieldPersonStatus }> = [
  { label: "New", value: "new" },
  { label: "Active", value: "active" },
  { label: "Follow Up", value: "follow_up" },
  { label: "Discipleship", value: "discipleship" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
];

const encounterStatusOptions: Array<{ label: string; value: AdminEncounterStatus }> = [
  { label: "RAW", value: "raw" },
  { label: "REVIEWED", value: "reviewed" },
  { label: "APPROVED", value: "approved" },
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

const editorTabGroups: Array<{
  label: "Operations" | "Profile";
  tabs: Array<{ label: string; value: EditorTab }>;
}> = [
  {
    label: "Operations",
    tabs: [
      { label: "Overview", value: "overview" },
      { label: "People", value: "people" },
      { label: "Tables", value: "tables" },
      { label: "Connections", value: "connections" },
      { label: "Fruit", value: "fruit" },
      { label: "Library", value: "library" },
      { label: "In Season", value: "in-season" },
    ],
  },
  {
    label: "Profile",
    tabs: [
      { label: "Profile", value: "profile" },
      { label: "Features", value: "features" },
      { label: "Team", value: "team" },
      { label: "Media", value: "media" },
      { label: "Story", value: "story" },
      { label: "Support", value: "support" },
      { label: "Prayer", value: "prayer" },
    ],
  },
];

const supportSubsectionOptions: Array<{ label: string; value: SupportSubsection }> = [
  { label: "Fundraising Progress", value: "progress" },
  { label: "Giving Routing", value: "giving" },
  { label: "Button Labels", value: "buttons" },
  { label: "Major Gift Settings", value: "gifts" },
  { label: "Advanced Settings", value: "advanced" },
];

const prayerSubsectionOptions: Array<{ label: string; value: PrayerSubsection }> = [
  { label: "Visibility", value: "visibility" },
  { label: "Call To Action", value: "cta" },
  { label: "Public Content", value: "content" },
  { label: "Prayer Team", value: "team" },
  { label: "Preview", value: "preview" },
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

function newClientId() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function newTeamMember(householdId: string, publicNumber = ""): AdminTeamMember {
  const timestamp = new Date().toISOString();

  return {
    created_at: timestamp,
    display_name: "",
    dos_user_id: "",
    household_id: householdId,
    id: newClientId(),
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

function newEncounter(householdId: string, table?: Pick<AdminMissionaryTable, "id" | "table_date">): AdminEncounterSubmission {
  const timestamp = new Date().toISOString();

  return {
    created_at: timestamp,
    do_not_publish: false,
    encounter_date: table?.table_date ?? todayDateValue(),
    id: newClientId(),
    internal_notes: "",
    missionary_household_id: householdId,
    missionary_profile_id: householdId,
    original_testimony: "",
    outcome_tags: [],
    permission_to_share: false,
    public_summary: "",
    source: "manual",
    status: "raw",
    submission_type: "full_testimony",
    submitter_email: "",
    submitter_name: "",
    submitter_phone: "",
    table_id: table?.id ?? null,
    updated_at: timestamp,
  };
}

function newTableReview(householdId: string, tableId: string): AdminTableReview {
  const timestamp = new Date().toISOString();

  return {
    assessment_notes: "",
    breakthroughs_or_concerns: "",
    created_at: timestamp,
    follow_up_areas: [],
    follow_up_needed: "",
    household_id: householdId,
    how_meeting_went: "",
    id: newClientId(),
    key_observations: "",
    movement_step: null,
    questions_covered: "",
    readiness: null,
    table_id: tableId,
    teaching_used: null,
    updated_at: timestamp,
  };
}

function newConnectionLog(householdId: string, draft: ConnectionDraft): AdminConnectionLog {
  const timestamp = new Date().toISOString();

  return {
    connection_date: draft.connectionDate || todayDateValue(),
    created_at: timestamp,
    duration_minutes: Number.isFinite(Number(draft.durationMinutes)) ? Number(draft.durationMinutes) : null,
    field_person_id: draft.fieldPersonId || null,
    follow_up_needed: draft.followUpNeeded,
    household_id: householdId,
    id: newClientId(),
    interaction_type: draft.interactionType,
    movement_step: draft.movementStep || null,
    notes: draft.notes,
    updated_at: timestamp,
  };
}

function newLibraryItem(householdId: string, draft: LibraryItemDraft): AdminLibraryItem {
  const timestamp = new Date().toISOString();

  return {
    category: draft.category,
    content_notes: draft.contentNotes,
    created_at: timestamp,
    description: draft.description,
    household_id: householdId,
    id: newClientId(),
    title: draft.title,
    updated_at: timestamp,
  };
}

function emptyInSeasonFocus(householdId: string): AdminInSeasonFocus {
  return {
    active_people_note: "",
    active_tables_note: "",
    current_focus: "",
    household_id: householdId,
    id: newClientId(),
    prayer_emphasis: "",
    updated_at: new Date().toISOString(),
  };
}

function newFruitItem(householdId: string, draft: FruitDraft, table?: AdminMissionaryTable | null): AdminFruitItem {
  const timestamp = new Date().toISOString();

  return {
    created_at: timestamp,
    encounter_id: draft.encounterId || null,
    field_person_id: draft.fieldPersonId || null,
    household_id: householdId,
    id: newClientId(),
    internal_notes: draft.internalNotes,
    outcome_tags: draft.outcomeTags,
    status: draft.status,
    summary: draft.summary,
    table_id: draft.tableId || null,
    testimony_date: draft.testimonyDate || table?.table_date || todayDateValue(),
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
  isConfigured,
  isReviewConfirmed,
  onClose,
  onGenerate,
  onReviewConfirmedChange,
  onSettingsChange,
  onUse,
  settings,
  sourceImageUrl,
}: {
  generationState: CutoutGenerationState;
  householdName: string;
  isConfigured: boolean | null;
  isReviewConfirmed: boolean;
  onClose: () => void;
  onGenerate: () => void;
  onReviewConfirmedChange: (confirmed: boolean) => void;
  onSettingsChange: (settings: CutoutGenerationSettings) => void;
  onUse: () => void;
  settings: CutoutGenerationSettings;
  sourceImageUrl: string;
}) {
  const isGenerating = generationState.status === "generating";
  const [styleReferenceError, setStyleReferenceError] = useState("");

  function updateSetting<K extends keyof CutoutGenerationSettings>(key: K, value: CutoutGenerationSettings[K]) {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  }

  function handleStyleReferenceUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!missionaryImageMimeTypes.includes(file.type as typeof missionaryImageMimeTypes[number])) {
      setStyleReferenceError("Use a JPG, PNG, or WebP style reference image.");
      return;
    }

    if (file.size > MISSIONARY_IMAGE_MAX_BYTES) {
      setStyleReferenceError("Style reference image must be 5MB or smaller.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (!result.startsWith("data:image/")) {
        setStyleReferenceError("Unable to read the selected style reference image.");
        return;
      }

      setStyleReferenceError("");
      onSettingsChange({
        ...settings,
        styleReferenceImageDataUrl: result,
        styleReferenceImageName: file.name,
      });
    };
    reader.onerror = () => {
      setStyleReferenceError("Unable to read the selected style reference image.");
    };
    reader.readAsDataURL(file);
  }

  function clearStyleReferenceImage() {
    setStyleReferenceError("");
    onSettingsChange({
      ...settings,
      styleReferenceImageDataUrl: null,
      styleReferenceImageName: null,
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
            <p className="mt-3 max-w-2xl rounded-xl border border-[#d7d2c8] bg-white p-3 text-xs leading-5 text-[#6f6658]">
              AI drafts may alter likeness. Review carefully before publishing. If likeness is inaccurate, regenerate or upload a professionally edited cutout.
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
            <div className="mt-4 rounded-xl border border-[#d7d2c8] bg-white p-4">
              <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Optional Style Reference Image
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7b746a]">
                Use an approved hero image to guide clothing, patch, crop, and cutout style. The source family photo still controls identity.
              </p>
              {settings.styleReferenceImageDataUrl ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-[#e2ded5] bg-[#f8f6f1] p-3">
                  <img
                    alt="Style reference preview"
                    className="max-h-48 w-full object-contain"
                    src={settings.styleReferenceImageDataUrl}
                  />
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label
                  className={`${lightSecondaryButtonClass} cursor-pointer`}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  Upload Style Reference
                  <input
                    accept={missionaryImageMimeTypes.join(",")}
                    className="sr-only"
                    onChange={handleStyleReferenceUpload}
                    type="file"
                  />
                </label>
                {settings.styleReferenceImageDataUrl ? (
                  <button
                    className={lightSecondaryButtonClass}
                    onClick={clearStyleReferenceImage}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    Remove Reference
                  </button>
                ) : null}
              </div>
              {settings.styleReferenceImageName ? (
                <p className="mt-2 text-xs leading-5 text-[#7b746a]">
                  Using {settings.styleReferenceImageName}
                </p>
              ) : null}
              {styleReferenceError ? (
                <p className="mt-2 text-xs leading-5 text-red-700">
                  {styleReferenceError}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Generation Settings
            </p>
            <div className="mt-3 rounded-xl border border-[#d7d2c8] bg-white p-4">
              <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Edit Mode
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  {
                    description: "Minimal changes. Prioritizes exact family likeness and original arrangement.",
                    label: "Conservative edit",
                    value: "conservative" as const,
                  },
                  {
                    description: "More style, still using the original photo as the identity reference.",
                    label: "Stylized edit",
                    value: "stylized" as const,
                  },
                ].map((option) => (
                  <label
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                      settings.editMode === option.value
                        ? "border-[#c8952d] bg-[#fff7e3]"
                        : "border-[#e2ded5] bg-[#f8f6f1] hover:border-[#c8952d]"
                    }`}
                    key={option.value}
                  >
                    <input
                      checked={settings.editMode === option.value}
                      className="sr-only"
                      name="cutout_edit_mode"
                      onChange={() => updateSetting("editMode", option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="block text-sm font-semibold text-[#111111]">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[#7b746a]">
                      {option.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>
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
                  {generationState.modelLabel ? (
                    <span className="mt-2 inline-flex rounded-full border border-[#d7d2c8] bg-[#f8f6f1] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Generated with {generationState.modelLabel}
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex rounded-full border border-[#d7d2c8] bg-[#f8f6f1] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Model: GPT 5.5
                    </span>
                  )}
                  <p className="mt-1 text-xs leading-5 text-[#7b746a]">
                    Transparent PNG previews appear here after generation.
                  </p>
                </div>
                <button
                  className={lightPrimaryButtonClass}
                  disabled={isGenerating || isConfigured === false}
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
                    {generationState.message || "Generating image..."}
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

              {generationState.previewUrl ? (
                <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#d7d2c8] bg-white p-3 text-sm leading-6 text-[#4b443b]">
                  <input
                    checked={isReviewConfirmed}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#D4A63D]"
                    onChange={(event) => onReviewConfirmedChange(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    I reviewed this image and confirm the people look accurate.
                  </span>
                </label>
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
                  disabled={!generationState.previewUrl || isGenerating || !isReviewConfirmed}
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

function DataFlowLabels({ items }: { items: string[] }) {
  return (
    <div className="my-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          className="rounded-full border border-[#e2ded5] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#6f6658]"
          key={item}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function WorkspaceOverview({ profile }: { profile: AdminProfile }) {
  return (
    <div className="space-y-5">
      <DataFlowLabels items={["Operations managed in Command Center", "Profiles show approved public content", "Field app is future"]} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatPreview label="Your Field" tone="light" value={String(profile.fieldPeople?.length ?? 0)} />
        <StatPreview label="Tables" tone="light" value={String(profile.tables?.length ?? 0)} />
        <StatPreview label="Encounters" tone="light" value={String(profile.encounterSubmissions?.length ?? 0)} />
        <StatPreview label="Approved Fruit" tone="light" value={String(profile.fruitItems?.filter((fruit) => fruit.status === "approved").length ?? 0)} />
        <StatPreview label="Public Team" tone="light" value={String(profile.teamMembers?.filter((member) => member.status === "active" && member.is_public !== false).length ?? 0)} />
        <StatPreview label="Prayer Requests" tone="light" value={String(profile.activePrayerRequestCount ?? 0)} />
      </div>
      <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#4b443b]">
        This workspace separates operational ministry activity from public profile content. Operations prepare People, Tables, Encounters, Fruit, Library, and In Season for future Field use; Profile tabs control what can appear publicly.
      </div>
    </div>
  );
}

function WorkspacePlanningState({
  description,
  labels,
  title,
}: {
  description: string;
  labels: string[];
  title: string;
}) {
  return (
    <div className="rounded-xl border border-[#e2ded5] bg-white p-5 text-sm leading-6 text-[#4b443b]">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {title}
      </p>
      <p className="mt-2">
        {description}
      </p>
      <DataFlowLabels items={labels} />
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
  return hasTextContent(profile.story) || hasTextContent(profile.public_story);
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
    case "approved":
      return "Approved";
    case "reviewed":
      return "Reviewed";
    case "hidden":
      return "Hidden";
    case "archived":
      return "Archived";
    case "raw":
    default:
      return "Raw";
  }
}

function truncateText(value: string, maxLength = 120) {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

function EncounterStatusBadge({ status }: { status: AdminEncounterStatus }) {
  const className = {
    approved: "border-green-200 bg-green-50 text-green-800",
    archived: "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]",
    hidden: "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]",
    raw: "border-[#e6c777] bg-[#fff8e8] text-[#8a5a00]",
    reviewed: "border-green-200 bg-green-50 text-green-800",
  }[status];

  return (
    <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {encounterStatusLabel(status)}
    </span>
  );
}

function fruitStatusLabel(value: AdminFruitStatus) {
  switch (value) {
    case "approved":
      return "Approved";
    case "private":
      return "Private";
    case "draft":
    default:
      return "Draft";
  }
}

function FruitStatusBadge({ status }: { status: AdminFruitStatus }) {
  const className = {
    approved: "border-green-200 bg-green-50 text-green-800",
    draft: "border-[#e6c777] bg-[#fff8e8] text-[#8a5a00]",
    private: "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]",
  }[status];

  return (
    <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {fruitStatusLabel(status)}
    </span>
  );
}

function personNameById(people: readonly AdminFieldPerson[], personId: string | null | undefined) {
  return people.find((person) => person.id === personId)?.name ?? "Not linked";
}

function tableNameById(tables: readonly AdminMissionaryTable[], tableId: string | null | undefined) {
  const table = tables.find((item) => item.id === tableId);

  return table ? tableLabel(table) : "Not linked";
}

function formatDurationMinutes(value: number | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return `${value} min`;
}

function encounterSourceLabel(value: AdminEncounterSource) {
  switch (value) {
    case "dos":
      return "DOS";
    case "public_form":
      return "Public Form";
    case "manual":
    default:
      return "Manual";
  }
}

function submissionTypeLabel(value: AdminEncounterSubmissionType) {
  return value === "quick_response" ? "Quick Response" : "Full Testimony";
}

function tableTypeLabel(value: AdminTableType | string | null | undefined) {
  return tableTypeOptions.find((option) => option.value === value)?.label ?? "Kitchen Table";
}

function tableLabel(table: AdminMissionaryTable) {
  return `${tableTypeLabel(table.table_type)} - ${formatProfileUpdatedDate(table.table_date)}`;
}

function parseParticipantNames(value: string) {
  return value
    .split(/[\n,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function participantNamesText(names: readonly string[]) {
  return names.join(", ");
}

function tableLinkedPeople(table: AdminMissionaryTable, people: readonly AdminFieldPerson[]) {
  const peopleById = new Map(people.map((person) => [person.id, person.name]));
  const linkedNames = table.field_person_ids
    .map((personId) => peopleById.get(personId))
    .filter((name): name is string => Boolean(name?.trim()));
  const quickNames = table.participant_names.filter((name) => !linkedNames.some((linkedName) => linkedName.toLowerCase() === name.toLowerCase()));

  return [...linkedNames, ...quickNames];
}

function notesPreview(value: string | null | undefined) {
  const text = value?.trim();

  return text ? truncateText(text, 72) : "No notes";
}

function tableDateValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function fieldPersonStatusLabel(value: AdminFieldPersonStatus | string | null | undefined) {
  switch (value) {
    case "active":
      return "Active";
    case "archived":
      return "Archived";
    case "discipleship":
      return "Discipleship";
    case "follow_up":
      return "Follow Up";
    case "paused":
      return "Paused";
    case "new":
    default:
      return "New";
  }
}

function FieldPersonStatusBadge({ status }: { status: AdminFieldPersonStatus }) {
  const className = {
    active: "border-green-200 bg-green-50 text-green-800",
    archived: "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]",
    discipleship: "border-green-200 bg-green-50 text-green-800",
    follow_up: "border-[#e6c777] bg-[#fff8e8] text-[#8a5a00]",
    new: "border-[#e6c777] bg-[#fff8e8] text-[#8a5a00]",
    paused: "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]",
  }[status];

  return (
    <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {fieldPersonStatusLabel(status)}
    </span>
  );
}

function personLastActivityLabel(person: AdminFieldPerson) {
  return formatProfileUpdatedDate(person.last_activity_at ?? person.updated_at ?? person.created_at);
}

function PeopleManager({
  items,
  onSave,
}: {
  items: readonly AdminFieldPerson[];
  onSave: (draft: FieldPersonDraft, personId?: string) => Promise<boolean>;
}) {
  const sortedPeople = useMemo(
    () => [...items].sort((first, second) => (
      (new Date(second.last_activity_at ?? second.updated_at ?? second.created_at).getTime() || 0)
      - (new Date(first.last_activity_at ?? first.updated_at ?? first.created_at).getTime() || 0)
      || first.name.localeCompare(second.name)
    )),
    [items],
  );
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const editingPerson = sortedPeople.find((person) => person.id === editingPersonId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
            Your Field
          </h3>
          <p className="text-sm leading-6 text-[#7b746a]">
            Internal people connected to this missionary household. Add only the basics now, then enrich the record after real interactions.
          </p>
        </div>
        <button
          className={lightPrimaryButtonClass}
          onClick={() => setIsAddPersonOpen(true)}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          + Add Person
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e2ded5] bg-[#fbfaf7]">
                {["Name", "Phone", "Church", "Relationship", "Engagement", "Last Activity", "Actions"].map((heading) => (
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
              {sortedPeople.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm leading-6 text-[#7b746a]" colSpan={7}>
                    No people added yet. Start building Your Field by adding a name and phone number.
                  </td>
                </tr>
              ) : null}
              {sortedPeople.map((person) => (
                <tr className="border-b border-[#e2ded5] transition-colors last:border-b-0 hover:bg-[#fbfaf7]" key={person.id}>
                  <td className="border-r border-[#e2ded5] px-4 py-3 align-middle">
                    <span className="block text-sm font-semibold text-[#111111]">
                      {person.name}
                    </span>
                  </td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                    {person.phone}
                  </td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                    {person.church?.trim() || "Not set"}
                  </td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                    {person.relationship_type?.trim() || "Not set"}
                  </td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                    {person.engagement_level?.trim() || "Not set"}
                  </td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                    {personLastActivityLabel(person)}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-wrap gap-2">
                      <button className={lightSecondaryButtonClass} onClick={() => setEditingPersonId(person.id)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                        View
                      </button>
                      <button className={lightSecondaryButtonClass} onClick={() => setEditingPersonId(person.id)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddPersonOpen ? (
        <PersonEditorModal
          mode="add"
          onClose={() => setIsAddPersonOpen(false)}
          onSave={async (draft) => {
            const saved = await onSave(draft);

            if (saved) {
              setIsAddPersonOpen(false);
            }

            return saved;
          }}
        />
      ) : null}

      {editingPerson ? (
        <PersonEditorModal
          mode="edit"
          onClose={() => setEditingPersonId(null)}
          onSave={async (draft) => {
            const saved = await onSave(draft, editingPerson.id);

            if (saved) {
              setEditingPersonId(null);
            }

            return saved;
          }}
          person={editingPerson}
        />
      ) : null}
    </div>
  );
}

function PersonEditorModal({
  mode,
  onClose,
  onSave,
  person,
}: {
  mode: "add" | "edit";
  onClose: () => void;
  onSave: (draft: FieldPersonDraft) => Promise<boolean>;
  person?: AdminFieldPerson;
}) {
  const [draft, setDraft] = useState<FieldPersonDraft>({
    church: person?.church ?? "",
    email: person?.email ?? "",
    engagementLevel: person?.engagement_level ?? "",
    name: person?.name ?? "",
    notes: person?.notes ?? "",
    phone: person?.phone ?? "",
    relationshipType: person?.relationship_type ?? "",
    status: person?.status ?? "new",
  });
  const [isSaving, setIsSaving] = useState(false);
  const canSave = Boolean(draft.name.trim() && draft.phone.trim());

  async function savePerson() {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    const saved = await onSave(draft);

    if (!saved) {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-2xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Your Field
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              {mode === "add" ? "Add Person" : `Edit ${person?.name || "Person"}`}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#4b443b]">
              Name and phone are enough to save. More detail can be added after meetings and follow-up.
            </p>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="Name"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, name: value }))}
            value={draft.name}
          />
          <Field
            label="Phone"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, phone: value }))}
            value={draft.phone}
          />
        </div>

        <div className="mt-5 space-y-4">
          <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Optional Details
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {mode === "edit" ? (
              <SelectField
                label="Status"
                onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, status: value as AdminFieldPersonStatus }))}
                options={fieldPersonStatusOptions}
                value={draft.status}
              />
            ) : null}
            <Field
              label="Email"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, email: value }))}
              value={draft.email}
            />
            <Field
              label="Church / Spiritual Community"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, church: value }))}
              value={draft.church}
            />
            <Field
              label="Relationship Type"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, relationshipType: value }))}
              value={draft.relationshipType}
            />
            <Field
              label="Engagement Level"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, engagementLevel: value }))}
              value={draft.engagementLevel}
            />
          </div>
          <TextArea
            helperText="Internal notes only. Not public by default."
            label="Notes"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, notes: value }))}
            rows={4}
            value={draft.notes}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className={lightSecondaryButtonClass} onClick={onClose} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Cancel
          </button>
          <button className={lightPrimaryButtonClass} disabled={!canSave || isSaving} onClick={savePerson} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            {isSaving ? "Saving" : "Save Person"}
          </button>
        </div>
      </div>
    </div>
  );
}

function tableTimeGroup(table: AdminMissionaryTable): "earlier" | "this-week" | "today" {
  const tableDate = tableDateValue(table.table_date);

  if (!tableDate) {
    return "earlier";
  }

  const today = tableDateValue(todayDateValue()) ?? new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfWeek = new Date(startOfToday);

  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

  if (tableDate.getTime() === startOfToday.getTime()) {
    return "today";
  }

  return tableDate >= startOfWeek ? "this-week" : "earlier";
}

function tablePeopleLabel(table: AdminMissionaryTable, encounters: readonly AdminEncounterSubmission[], people: readonly AdminFieldPerson[]) {
  const tablePeople = tableLinkedPeople(table, people);

  if (tablePeople.length > 0) {
    return tablePeople.length <= 3
      ? tablePeople.join(", ")
      : `${tablePeople.slice(0, 3).join(", ")} +${tablePeople.length - 3}`;
  }

  const encounterNames = encounters
    .filter((encounter) => encounter.table_id === table.id && encounter.submitter_name?.trim())
    .map((encounter) => encounter.submitter_name?.trim())
    .filter((name): name is string => Boolean(name));

  if (encounterNames.length > 0) {
    return encounterNames.length <= 2
      ? encounterNames.join(", ")
      : `${encounterNames.length} people`;
  }

  const encounterCount = encounters.filter((encounter) => encounter.table_id === table.id).length;

  return encounterCount > 0 ? `${encounterCount} people` : "People optional";
}

function TablesManager({
  encounters,
  fieldPeople,
  fruitItems,
  items,
  onAddEncounter,
  onCreateFruit,
  onCreate,
  onUpdateFruit,
  onUpdatePersonProfile,
  onUpdateReview,
  onUpdate,
  tableReviews,
}: {
  encounters: readonly AdminEncounterSubmission[];
  fieldPeople: readonly AdminFieldPerson[];
  fruitItems: readonly AdminFruitItem[];
  items: readonly AdminMissionaryTable[];
  onAddEncounter: (table: AdminMissionaryTable, draft: QuickEncounterDraft) => void;
  onCreateFruit: (draft: FruitDraft, table?: AdminMissionaryTable | null) => void;
  onCreate: (draft: TableDraft) => AdminMissionaryTable | null;
  onUpdateFruit: (fruitId: string, patch: Partial<AdminFruitItem>) => void;
  onUpdatePersonProfile: (person: AdminFieldPerson, patch: Partial<Pick<AdminFieldPerson, "church" | "engagement_level" | "relationship_type">>) => void;
  onUpdateReview: (tableId: string, patch: Partial<AdminTableReview>) => void;
  onUpdate: (tableId: string, draft: TableDraft) => AdminMissionaryTable | null;
  tableReviews: readonly AdminTableReview[];
}) {
  const sortedTables = useMemo(
    () => [...items].sort((first, second) => (
      (tableDateValue(second.table_date)?.getTime() ?? 0) - (tableDateValue(first.table_date)?.getTime() ?? 0)
    )),
    [items],
  );
  const groupedTables = [
    { items: sortedTables.filter((table) => tableTimeGroup(table) === "today"), label: "Today" },
    { items: sortedTables.filter((table) => tableTimeGroup(table) === "this-week"), label: "This Week" },
    { items: sortedTables.filter((table) => tableTimeGroup(table) === "earlier").slice(0, 6), label: "Earlier" },
  ];
  const [editingTable, setEditingTable] = useState<AdminMissionaryTable | null>(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [quickEncounterTable, setQuickEncounterTable] = useState<AdminMissionaryTable | null>(null);
  const [selectedTableId, setSelectedTableId] = useState(sortedTables[0]?.id ?? "");
  const selectedTable = sortedTables.find((table) => table.id === selectedTableId) ?? sortedTables[0] ?? null;

  useEffect(() => {
    if (selectedTableId && sortedTables.some((table) => table.id === selectedTableId)) {
      return;
    }

    setSelectedTableId(sortedTables[0]?.id ?? "");
  }, [selectedTableId, sortedTables]);

  function saveTable(draft: TableDraft, addEncounter: boolean, tableId?: string) {
    const table = tableId ? onUpdate(tableId, draft) : onCreate(draft);

    if (!table) {
      return;
    }

    setSelectedTableId(table.id);
    setIsAddTableOpen(false);
    setEditingTable(null);

    if (addEncounter) {
      setQuickEncounterTable(table);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm leading-6 text-[#7b746a]">
            Log a table quickly, then add raw encounters from that meeting. People are optional for now and stay internal.
          </p>
          <DataFlowLabels items={["People -> Table -> Encounter", "Nested review later", "Under 30 seconds"]} />
        </div>
        <button className={lightPrimaryButtonClass} onClick={() => setIsAddTableOpen(true)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          + Add Table
        </button>
      </div>

      {sortedTables.length === 0 ? (
        <p className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
          No tables have been added yet.
        </p>
      ) : null}

      {sortedTables.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {groupedTables.map((group) => (
              <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white" key={group.label}>
                <div className="border-b border-[#e2ded5] bg-[#fbfaf7] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {group.label}
                  </p>
                </div>
                {group.items.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-[#7b746a]">
                    No tables logged.
                  </p>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="min-w-[860px] w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#e2ded5] bg-[#fbfaf7]">
                        {["Date", "Type", "People", "Notes", "Actions"].map((heading) => (
                          <th className="border-r border-[#e2ded5] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658] last:border-r-0" key={heading} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((table) => {
                        const selected = selectedTable?.id === table.id;

                        return (
                          <tr className={`border-b border-[#e2ded5] transition-colors last:border-b-0 hover:bg-[#fbfaf7] ${selected ? "bg-[#fff8e8]" : ""}`} key={table.id}>
                            <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                              {formatProfileUpdatedDate(table.table_date)}
                            </td>
                            <td className="border-r border-[#e2ded5] px-4 py-3 align-middle">
                              <span className="block text-sm font-semibold text-[#111111]">
                                {tableTypeLabel(table.table_type)}
                              </span>
                              <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-[#7b746a]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                                {encounters.filter((encounter) => encounter.table_id === table.id).length} Encounters
                              </span>
                            </td>
                            <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm text-[#4b443b]">
                              {tablePeopleLabel(table, encounters, fieldPeople)}
                            </td>
                            <td className="border-r border-[#e2ded5] px-4 py-3 align-middle text-sm leading-5 text-[#4b443b]">
                              {notesPreview(table.notes)}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <div className="flex flex-wrap gap-2">
                                <button className={lightSecondaryButtonClass} onClick={() => setSelectedTableId(table.id)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                                  View
                                </button>
                                <button className={lightSecondaryButtonClass} onClick={() => setEditingTable(table)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <TableDetailPanel
            encounters={encounters.filter((encounter) => encounter.table_id === selectedTable?.id)}
            fieldPeople={fieldPeople}
            fruitItems={fruitItems.filter((fruit) => fruit.table_id === selectedTable?.id)}
            onAddEncounter={(table) => setQuickEncounterTable(table)}
            onCreateFruit={onCreateFruit}
            onUpdateFruit={onUpdateFruit}
            onUpdatePersonProfile={onUpdatePersonProfile}
            onUpdateReview={onUpdateReview}
            review={tableReviews.find((item) => item.table_id === selectedTable?.id) ?? null}
            table={selectedTable}
          />
        </div>
      ) : null}

      {isAddTableOpen ? (
        <AddTableModal
          fieldPeople={fieldPeople}
          onClose={() => setIsAddTableOpen(false)}
          onSave={saveTable}
        />
      ) : null}

      {editingTable ? (
        <AddTableModal
          fieldPeople={fieldPeople}
          onClose={() => setEditingTable(null)}
          onSave={(draft, addEncounter) => saveTable(draft, addEncounter, editingTable.id)}
          table={editingTable}
        />
      ) : null}

      {quickEncounterTable ? (
        <QuickEncounterModal
          onClose={() => setQuickEncounterTable(null)}
          onSave={(draft) => {
            onAddEncounter(quickEncounterTable, draft);
            setQuickEncounterTable(null);
          }}
          table={quickEncounterTable}
        />
      ) : null}
    </div>
  );
}

function TableDetailPanel({
  encounters,
  fieldPeople,
  fruitItems,
  onAddEncounter,
  onCreateFruit,
  onUpdateFruit,
  onUpdatePersonProfile,
  onUpdateReview,
  review,
  table,
}: {
  encounters: readonly AdminEncounterSubmission[];
  fieldPeople: readonly AdminFieldPerson[];
  fruitItems: readonly AdminFruitItem[];
  onAddEncounter: (table: AdminMissionaryTable) => void;
  onCreateFruit: (draft: FruitDraft, table?: AdminMissionaryTable | null) => void;
  onUpdateFruit: (fruitId: string, patch: Partial<AdminFruitItem>) => void;
  onUpdatePersonProfile: (person: AdminFieldPerson, patch: Partial<Pick<AdminFieldPerson, "church" | "engagement_level" | "relationship_type">>) => void;
  onUpdateReview: (tableId: string, patch: Partial<AdminTableReview>) => void;
  review: AdminTableReview | null;
  table: AdminMissionaryTable | null;
}) {
  const [editingFruit, setEditingFruit] = useState<AdminFruitItem | null>(null);
  const [isFruitModalOpen, setIsFruitModalOpen] = useState(false);

  if (!table) {
    return (
      <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
        Select a table to view details.
      </div>
    );
  }

  const activeTable = table;
  const peopleLabel = tableLinkedPeople(activeTable, fieldPeople).length > 0
    ? participantNamesText(tableLinkedPeople(activeTable, fieldPeople))
    : "Not added";
  const linkedPeople = fieldPeople.filter((person) => activeTable.field_person_ids.includes(person.id));
  const activeReview = review ?? newTableReview(activeTable.household_id, activeTable.id);

  function updateReview(patch: Partial<AdminTableReview>) {
    onUpdateReview(activeTable.id, patch);
  }

  function toggleAssessmentArea(area: AdminAssessmentFollowUpArea) {
    const currentAreas = new Set(activeReview.follow_up_areas);

    if (currentAreas.has(area)) {
      currentAreas.delete(area);
    } else {
      currentAreas.add(area);
    }

    updateReview({
      follow_up_areas: assessmentFollowUpAreaOptions.filter((option) => currentAreas.has(option)),
    });
  }

  return (
    <aside className="space-y-4 rounded-xl border border-[#e2ded5] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Table Detail
          </p>
          <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
            {tableTypeLabel(table.table_type)}
          </h3>
        </div>
        <button className={lightSecondaryButtonClass} onClick={() => onAddEncounter(table)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          Add Encounter
        </button>
      </div>

      <div className="grid gap-4 text-sm leading-6 text-[#4b443b]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <DetailText label="Date" value={formatProfileUpdatedDate(table.table_date)} />
          <DetailText label="People" value={peopleLabel} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Notes
          </p>
          <p className="mt-2 text-sm leading-6 text-[#111111]">
            {table.notes?.trim() || "No notes added."}
          </p>
        </div>
      </div>

      <div className="border-t border-[#e2ded5] pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Encounters
            </p>
            <p className="mt-1 text-xs leading-5 text-[#7b746a]">
              Raw responses tied to this Table.
            </p>
          </div>
          <button className={lightSecondaryButtonClass} onClick={() => onAddEncounter(table)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            + Add Encounter
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {encounters.length === 0 ? (
            <p className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3 text-sm text-[#7b746a]">
              No encounters logged yet.
            </p>
          ) : null}
          {encounters.map((encounter) => (
            <div className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3" key={encounter.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#111111]">
                    {encounter.submitter_name?.trim() || "Unnamed"}
                  </p>
                  <p className="mt-1 text-xs text-[#7b746a]">
                    {encounter.submitter_email?.trim() || "No email"}
                  </p>
                </div>
                <EncounterStatusBadge status={encounter.status} />
              </div>
              <p className="mt-2 text-sm leading-5 text-[#4b443b]">
                {truncateText(encounter.original_testimony || "No response text.", 96)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 border-t border-[#e2ded5] pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Missionary Review
          </p>
          <p className="mt-1 text-xs leading-5 text-[#7b746a]">
            Internal interpretation of this meeting. This stays in Command Center unless it becomes approved Fruit.
          </p>
        </div>
        <TextArea
          label="How did the meeting go?"
          onChange={(value) => updateReview({ how_meeting_went: value })}
          rows={3}
          value={activeReview.how_meeting_went}
        />
        <TextArea
          label="Key observations"
          onChange={(value) => updateReview({ key_observations: value })}
          rows={3}
          value={activeReview.key_observations}
        />
        <TextArea
          label="Breakthroughs or concerns"
          onChange={(value) => updateReview({ breakthroughs_or_concerns: value })}
          rows={3}
          value={activeReview.breakthroughs_or_concerns}
        />
        <TextArea
          label="Follow up needed"
          onChange={(value) => updateReview({ follow_up_needed: value })}
          rows={3}
          value={activeReview.follow_up_needed}
        />
        <SelectField
          label="Movement Step"
          onChange={(value) => updateReview({ movement_step: value ? value as AdminMovementStep : null })}
          options={movementStepSelectOptions}
          value={activeReview.movement_step ?? ""}
        />
      </div>

      <div className="space-y-4 border-t border-[#e2ded5] pt-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Discipleship Assessment
          </p>
          <p className="mt-1 text-xs leading-5 text-[#7b746a]">
            Structured spiritual insight for this meeting only. Assessment data is not stored on People.
          </p>
        </div>
        <SelectField
          label="Teaching Used"
          onChange={(value) => updateReview({ teaching_used: value ? value as AdminTeachingUsed : null })}
          options={teachingUsedOptions}
          value={activeReview.teaching_used ?? ""}
        />
        <TextArea
          label="Questions Covered"
          onChange={(value) => updateReview({ questions_covered: value })}
          rows={3}
          value={activeReview.questions_covered}
        />
        <TextArea
          label="Responses / Notes"
          onChange={(value) => updateReview({ assessment_notes: value })}
          rows={3}
          value={activeReview.assessment_notes}
        />
        <SelectField
          label="Readiness"
          onChange={(value) => updateReview({ readiness: value ? value as AdminReadiness : null })}
          options={readinessOptions}
          value={activeReview.readiness ?? ""}
        />
        <div>
          <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Areas Needing Follow Up
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {assessmentFollowUpAreaOptions.map((area) => {
              const selected = activeReview.follow_up_areas.includes(area);

              return (
                <button
                  className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    selected
                      ? "border-[#D4A63D] bg-[#fff8e8] text-[#8a5a00]"
                      : "border-[#e2ded5] bg-[#f8f6f1] text-[#6f6658] hover:border-[#c8952d]"
                  }`}
                  key={area}
                  onClick={() => toggleAssessmentArea(area)}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {linkedPeople.length > 0 ? (
        <div className="space-y-4 border-t border-[#e2ded5] pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              What did you learn about this person?
            </p>
            <p className="mt-1 text-xs leading-5 text-[#7b746a]">
              Update missing Person profile fields only. These changes save to Your Field, not this Table or Encounter.
            </p>
          </div>
          {linkedPeople.map((person) => (
            <ProfileUpdatePromptCard
              key={person.id}
              onSave={onUpdatePersonProfile}
              person={person}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-4 border-t border-[#e2ded5] pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Fruit
            </p>
            <p className="mt-1 text-xs leading-5 text-[#7b746a]">
              Create public-safe summaries from Encounter, Review, and Assessment. Raw text and internal notes stay internal.
            </p>
          </div>
          <button className={lightPrimaryButtonClass} onClick={() => setIsFruitModalOpen(true)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Create Fruit Summary
          </button>
        </div>
        <div className="space-y-2">
          {fruitItems.length === 0 ? (
            <p className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3 text-sm text-[#7b746a]">
              No Fruit summary has been created for this Table yet.
            </p>
          ) : null}
          {fruitItems.map((fruit) => (
            <div className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3" key={fruit.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm leading-5 text-[#111111]">
                  {truncateText(fruit.summary || "Summary needed.", 100)}
                </p>
                <FruitStatusBadge status={fruit.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {fruit.outcome_tags.length > 0 ? fruit.outcome_tags.map((tag) => (
                  <span className="rounded-full border border-[#e2ded5] bg-white px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#6f6658]" key={tag} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {tag}
                  </span>
                )) : (
                  <span className="text-xs text-[#7b746a]">No outcome tags.</span>
                )}
              </div>
              <button className={`${lightSecondaryButtonClass} mt-3`} onClick={() => setEditingFruit(fruit)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                Edit Fruit
              </button>
            </div>
          ))}
        </div>
      </div>

      {isFruitModalOpen ? (
        <FruitEditorModal
          encounters={encounters}
          fieldPeople={fieldPeople}
          initialTable={table}
          onClose={() => setIsFruitModalOpen(false)}
          onSave={(draft) => {
            onCreateFruit(draft, table);
            setIsFruitModalOpen(false);
          }}
          tables={[table]}
        />
      ) : null}

      {editingFruit ? (
        <FruitEditorModal
          encounters={encounters}
          fieldPeople={fieldPeople}
          fruit={editingFruit}
          initialTable={table}
          onClose={() => setEditingFruit(null)}
          onSave={(draft) => {
            onUpdateFruit(editingFruit.id, {
              encounter_id: draft.encounterId || null,
              field_person_id: draft.fieldPersonId || null,
              internal_notes: draft.internalNotes,
              outcome_tags: draft.outcomeTags,
              status: draft.status,
              summary: draft.summary,
              table_id: draft.tableId || null,
              testimony_date: draft.testimonyDate || table.table_date,
              updated_at: new Date().toISOString(),
            });
            setEditingFruit(null);
          }}
          tables={[table]}
        />
      ) : null}
    </aside>
  );
}

function ProfileUpdatePromptCard({
  onSave,
  person,
}: {
  onSave: (person: AdminFieldPerson, patch: Partial<Pick<AdminFieldPerson, "church" | "engagement_level" | "relationship_type">>) => void | Promise<void>;
  person: AdminFieldPerson;
}) {
  const missingRelationship = !person.relationship_type?.trim();
  const missingEngagement = !person.engagement_level?.trim();
  const missingChurch = !person.church?.trim();
  const showPromptFields = missingRelationship || missingEngagement || missingChurch;
  const [church, setChurch] = useState(person.church ?? "");
  const [engagementLevel, setEngagementLevel] = useState(person.engagement_level ?? "");
  const [relationshipType, setRelationshipType] = useState(person.relationship_type ?? "");

  useEffect(() => {
    setChurch(person.church ?? "");
    setEngagementLevel(person.engagement_level ?? "");
    setRelationshipType(person.relationship_type ?? "");
  }, [person.church, person.engagement_level, person.relationship_type]);

  const hasChanges = church !== (person.church ?? "")
    || engagementLevel !== (person.engagement_level ?? "")
    || relationshipType !== (person.relationship_type ?? "");

  return (
    <div className="rounded-xl border border-[#e2ded5] bg-[#f8f6f1] p-3">
      <p className="text-sm font-semibold text-[#111111]">
        {person.name}
      </p>
      {showPromptFields ? (
        <div className="mt-3 grid gap-3">
          {missingRelationship ? (
            <Field
              label="Relationship Type"
              onChange={setRelationshipType}
              value={relationshipType}
            />
          ) : null}
          {missingEngagement ? (
            <Field
              label="Engagement Level"
              onChange={setEngagementLevel}
              value={engagementLevel}
            />
          ) : null}
          {missingChurch ? (
            <Field
              label="Church / Spiritual Community"
              onChange={setChurch}
              value={church}
            />
          ) : null}
          <div>
            <button
              className={lightSecondaryButtonClass}
              disabled={!hasChanges}
              onClick={() => onSave(person, {
                church,
                engagement_level: engagementLevel,
                relationship_type: relationshipType,
              })}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              Save Person Updates
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-[#7b746a]">
          Relationship type, engagement level, and church/community are already filled.
        </p>
      )}
    </div>
  );
}

function FruitEditorModal({
  encounters,
  fieldPeople,
  fruit,
  initialTable,
  onClose,
  onSave,
  tables,
}: {
  encounters: readonly AdminEncounterSubmission[];
  fieldPeople: readonly AdminFieldPerson[];
  fruit?: AdminFruitItem | null;
  initialTable?: AdminMissionaryTable | null;
  onClose: () => void;
  onSave: (draft: FruitDraft) => void;
  tables: readonly AdminMissionaryTable[];
}) {
  const [draft, setDraft] = useState<FruitDraft>({
    encounterId: fruit?.encounter_id ?? "",
    fieldPersonId: fruit?.field_person_id ?? initialTable?.field_person_ids[0] ?? "",
    internalNotes: fruit?.internal_notes ?? "",
    outcomeTags: fruit?.outcome_tags ?? [],
    status: fruit?.status ?? "draft",
    summary: fruit?.summary ?? "",
    tableId: fruit?.table_id ?? initialTable?.id ?? "",
    testimonyDate: fruit?.testimony_date ?? initialTable?.table_date ?? todayDateValue(),
  });
  const tableOptions = [
    { label: "No linked table", value: "" },
    ...tables.map((table) => ({ label: tableLabel(table), value: table.id })),
  ];
  const personOptions = [
    { label: "No linked person", value: "" },
    ...fieldPeople.map((person) => ({ label: person.name, value: person.id })),
  ];
  const encounterOptions = [
    { label: "No linked encounter", value: "" },
    ...encounters.map((encounter) => ({
      label: `${encounter.submitter_name?.trim() || "Unnamed"} - ${submissionTypeLabel(encounter.submission_type)}`,
      value: encounter.id,
    })),
  ];

  function toggleOutcomeTag(tag: AdminOutcomeTag) {
    const currentTags = new Set(draft.outcomeTags);

    if (currentTags.has(tag)) {
      currentTags.delete(tag);
    } else {
      currentTags.add(tag);
    }

    setDraft((currentDraft) => ({
      ...currentDraft,
      outcomeTags: outcomeTagOptions.filter((option) => currentTags.has(option)),
    }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-3xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {fruit ? "Edit Fruit" : "Create Fruit Summary"}
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              Fruit Summary
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b443b]">
              Approved Fruit is the public-safe outcome layer. Raw Encounter text and internal notes stay in Command Center.
            </p>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectField
            label="Linked Table"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, tableId: value }))}
            options={tableOptions}
            value={draft.tableId}
          />
          <SelectField
            label="Linked Person"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, fieldPersonId: value }))}
            options={personOptions}
            value={draft.fieldPersonId}
          />
          <SelectField
            label="Linked Encounter"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, encounterId: value }))}
            options={encounterOptions}
            value={draft.encounterId}
          />
          <Field
            label="Date"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, testimonyDate: value }))}
            type="date"
            value={draft.testimonyDate}
          />
        </div>

        <div className="mt-5 space-y-4">
          <TextArea
            helperText="Public-safe language only. This is the summary that can later feed Profile and Field after approval."
            label="Public Fruit Summary"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, summary: value }))}
            rows={5}
            value={draft.summary}
          />
          <TextArea
            helperText="Internal Command Center notes. Not public and not shown in future Field summaries."
            label="Internal Notes"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, internalNotes: value }))}
            rows={4}
            value={draft.internalNotes}
          />
          <div>
            <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Outcome Tags
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {outcomeTagOptions.map((tag) => {
                const selected = draft.outcomeTags.includes(tag);

                return (
                  <button
                    className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                      selected
                        ? "border-[#D4A63D] bg-[#fff8e8] text-[#8a5a00]"
                        : "border-[#e2ded5] bg-white text-[#6f6658] hover:border-[#c8952d]"
                    }`}
                    key={tag}
                    onClick={() => toggleOutcomeTag(tag)}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
          <SelectField
            label="Fruit Status"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, status: value as AdminFruitStatus }))}
            options={fruitStatusOptions}
            value={draft.status}
          />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className={lightSecondaryButtonClass} onClick={onClose} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Cancel
          </button>
          <button className={lightPrimaryButtonClass} disabled={!draft.summary.trim()} onClick={() => onSave(draft)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Save Fruit
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTableModal({
  fieldPeople,
  onClose,
  onSave,
  table,
}: {
  fieldPeople: readonly AdminFieldPerson[];
  onClose: () => void;
  onSave: (draft: TableDraft, addEncounter: boolean) => void;
  table?: AdminMissionaryTable;
}) {
  const [draft, setDraft] = useState<TableDraft>({
    fieldPersonIds: table?.field_person_ids ?? [],
    notes: table?.notes ?? "",
    participantNamesText: table ? participantNamesText(table.participant_names) : "",
    tableDate: table?.table_date ?? todayDateValue(),
    tableType: table?.table_type ?? "kitchen_table",
  });

  function toggleFieldPerson(personId: string) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      fieldPersonIds: currentDraft.fieldPersonIds.includes(personId)
        ? currentDraft.fieldPersonIds.filter((id) => id !== personId)
        : [...currentDraft.fieldPersonIds, personId],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-2xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {table ? "Edit Table" : "Add Table"}
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              Quick Table Log
            </h3>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectField
            label="Type"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, tableType: value as AdminTableType }))}
            options={tableTypeOptions}
            value={draft.tableType}
          />
          <Field
            label="Date"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, tableDate: value }))}
            type="date"
            value={draft.tableDate}
          />
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              People
            </p>
            {fieldPeople.length > 0 ? (
              <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#d7d2c8] bg-white p-3">
                {fieldPeople.map((person) => {
                  const selected = draft.fieldPersonIds.includes(person.id);

                  return (
                    <button
                      className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                        selected
                          ? "border-[#D4A63D] bg-[#fff8e8] text-[#8a5a00]"
                          : "border-[#e2ded5] bg-[#f8f6f1] text-[#6f6658] hover:border-[#c8952d]"
                      }`}
                      key={person.id}
                      onClick={() => toggleFieldPerson(person.id)}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      {person.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 rounded-xl border border-[#e2ded5] bg-white p-3 text-sm leading-6 text-[#7b746a]">
                Add people in Your Field first, or use quick names below.
              </p>
            )}
            <span className={lightHelperClass}>
              Optional. Links this meeting to Your Field without publishing anything.
            </span>
          </div>
          <Field
            helperText="Optional quick names if someone is not in Your Field yet. Separate names with commas."
            label="Quick Names"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, participantNamesText: value }))}
            value={draft.participantNamesText}
          />
          <TextArea
            helperText="Optional internal notes."
            label="Notes"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, notes: value }))}
            rows={4}
            value={draft.notes}
          />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className={lightSecondaryButtonClass} onClick={() => onSave(draft, false)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Save Table
          </button>
          <button className={lightPrimaryButtonClass} onClick={() => onSave(draft, true)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Save + Add Encounter
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickEncounterModal({
  onClose,
  onSave,
  table,
}: {
  onClose: () => void;
  onSave: (draft: QuickEncounterDraft) => void;
  table: AdminMissionaryTable;
}) {
  const [draft, setDraft] = useState<QuickEncounterDraft>({
    email: "",
    length: "short",
    name: "",
    text: "",
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-2xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Add Encounter
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              {tableTypeLabel(table.table_type)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#4b443b]">
              {formatProfileUpdatedDate(table.table_date)}
            </p>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field
            label="Name"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, name: value }))}
            value={draft.name}
          />
          <Field
            label="Email"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, email: value }))}
            value={draft.email}
          />
        </div>

        <div className="mt-5">
          <TextArea
            helperText="Saved as RAW and tied to this Table."
            label="Response Text"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, text: value }))}
            rows={5}
            value={draft.text}
          />
        </div>

        <div className="mt-4">
          <EncounterStatusBadge status="raw" />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button className={lightPrimaryButtonClass} disabled={!draft.text.trim()} onClick={() => onSave(draft)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Save Encounter
          </button>
        </div>
      </div>
    </div>
  );
}
function EncounterSubmissionManager({
  editingEncounterId,
  items,
  onAdd,
  onEditingEncounterIdChange,
  onQuickStatus,
  onUpdate,
  tables,
}: {
  editingEncounterId?: string | null;
  items: readonly AdminEncounterSubmission[];
  onAdd: (table?: AdminMissionaryTable) => string | null;
  onEditingEncounterIdChange?: (encounterId: string | null) => void;
  onQuickStatus: (submissionId: string, status: AdminEncounterStatus) => void;
  onUpdate: (submissionId: string, patch: Partial<AdminEncounterSubmission>) => void;
  tables: readonly AdminMissionaryTable[];
}) {
  const [localEditingEncounterId, setLocalEditingEncounterId] = useState<string | null>(null);
  const activeEditingEncounterId = editingEncounterId !== undefined ? editingEncounterId : localEditingEncounterId;
  const editingEncounter = items.find((item) => item.id === activeEditingEncounterId) ?? null;

  function setEditingEncounterId(nextEncounterId: string | null) {
    if (onEditingEncounterIdChange) {
      onEditingEncounterIdChange(nextEncounterId);
      return;
    }

    setLocalEditingEncounterId(nextEncounterId);
  }

  useEffect(() => {
    if (activeEditingEncounterId && !items.some((item) => item.id === activeEditingEncounterId)) {
      setEditingEncounterId(null);
    }
  }, [activeEditingEncounterId, items]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm leading-6 text-[#7b746a]">
            Encounters are raw testimony records from ministry tables. Review the original, add a clean summary and outcome tags, then approve it into Fruit.
          </p>
          <DataFlowLabels items={["RAW -> REVIEWED -> APPROVED", "Stored in Command Center", "Approved Fruit feeds Field"]} />
        </div>
        <button
          className={lightPrimaryButtonClass}
          onClick={() => {
            const newEncounterId = onAdd();

            if (newEncounterId) {
              setEditingEncounterId(newEncounterId);
            }
          }}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Add Encounter
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
          No encounters have been added or submitted for this profile yet.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e2ded5] bg-[#fbfaf7]">
              {["Person", "Type", "Table", "Original Text", "Fruit Summary", "Status", "Date", "Actions"].map((heading) => (
                <th
                  className="border-r border-[#e2ded5] px-3 py-3 text-[9px] uppercase tracking-[0.16em] text-[#6f6658] last:border-r-0"
                  key={heading}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const itemTable = tables.find((table) => table.id === item.table_id);

              return (
              <tr className="border-b border-[#e2ded5] transition-colors last:border-b-0 hover:bg-[#fbfaf7]" key={item.id}>
                <td className="border-r border-[#e2ded5] px-3 py-3 align-middle">
                  <span className="block truncate text-sm font-semibold text-[#111111]">
                    {item.submitter_name || "Unknown"}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#7b746a]">
                    {item.submitter_email || "No email"}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-[#7b746a]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {encounterSourceLabel(item.source)}
                  </span>
                </td>
                <td className="border-r border-[#e2ded5] px-3 py-3 align-middle text-sm text-[#4b443b]">
                  {submissionTypeLabel(item.submission_type)}
                </td>
                <td className="border-r border-[#e2ded5] px-3 py-3 align-middle text-sm text-[#4b443b]">
                  {itemTable ? tableLabel(itemTable) : "No table"}
                </td>
                <td className="border-r border-[#e2ded5] px-3 py-3 align-middle text-sm leading-5 text-[#4b443b]">
                  {truncateText(item.original_testimony || "No testimony entered.", 96)}
                </td>
                <td className="border-r border-[#e2ded5] px-3 py-3 align-middle text-sm leading-5 text-[#4b443b]">
                  {truncateText(item.public_summary || "Not summarized yet.", 96)}
                </td>
                <td className="border-r border-[#e2ded5] px-3 py-3 align-middle">
                  <div className="flex flex-wrap gap-2">
                    <EncounterStatusBadge status={item.status} />
                    {item.do_not_publish ? (
                      <span className="inline-flex min-h-6 items-center border border-red-200 bg-red-50 px-2 text-[9px] uppercase tracking-[0.16em] text-red-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Private
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="border-r border-[#e2ded5] px-3 py-3 align-middle text-sm text-[#4b443b]">
                  {item.encounter_date ? formatProfileUpdatedDate(item.encounter_date) : formatProfileUpdatedDate(item.created_at)}
                </td>
                <td className="px-3 py-3 align-middle">
                  <div className="flex flex-wrap gap-2">
                    <button className={lightSecondaryButtonClass} onClick={() => setEditingEncounterId(item.id)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">Review</button>
                    <button className={lightSecondaryButtonClass} disabled={!item.public_summary?.trim() || item.do_not_publish} onClick={() => onQuickStatus(item.id, "approved")} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">Approve</button>
                    <button className="rounded-md border border-red-200 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-red-700 hover:border-red-400 hover:text-red-800" onClick={() => onUpdate(item.id, { do_not_publish: true, permission_to_share: false, status: item.status === "approved" ? "reviewed" : item.status })} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">Private</button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingEncounter ? (
        <EncounterEditorModal
          encounter={editingEncounter}
          onClose={() => setEditingEncounterId(null)}
          onUpdate={onUpdate}
          tables={tables}
        />
      ) : null}
    </div>
  );
}

function EncounterEditorModal({
  encounter,
  onClose,
  onUpdate,
  tables,
}: {
  encounter: AdminEncounterSubmission;
  onClose: () => void;
  onUpdate: (submissionId: string, patch: Partial<AdminEncounterSubmission>) => void;
  tables: readonly AdminMissionaryTable[];
}) {
  const selectedTable = tables.find((table) => table.id === encounter.table_id);

  function toggleOutcomeTag(tag: AdminOutcomeTag) {
    const currentTags = new Set(encounter.outcome_tags);

    if (currentTags.has(tag)) {
      currentTags.delete(tag);
    } else {
      currentTags.add(tag);
    }

    onUpdate(encounter.id, { outcome_tags: outcomeTagOptions.filter((option) => currentTags.has(option)) });
  }

  function saveReview() {
    onUpdate(encounter.id, {
      status: encounter.status === "approved" ? "approved" : "reviewed",
    });
  }

  function approveAsFruit() {
    onUpdate(encounter.id, {
      do_not_publish: false,
      permission_to_share: true,
      status: "approved",
    });
  }

  function markPrivate() {
    onUpdate(encounter.id, {
      do_not_publish: true,
      permission_to_share: false,
      status: encounter.status === "raw" || encounter.status === "approved" ? "reviewed" : encounter.status,
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Encounter Review
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              {encounter.submitter_name?.trim() || "Unnamed Encounter"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b443b]">
              Review raw Encounter intake, write a public-safe Fruit summary, then approve only what should feed Profile and future Field.
            </p>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
            <DetailText label="Submitted Name" value={encounter.submitter_name?.trim() || "Unknown"} />
          </div>
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
            <DetailText label="Submitted Email" value={encounter.submitter_email?.trim() || "Not provided"} />
          </div>
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
            <DetailText label="Submission Type" value={submissionTypeLabel(encounter.submission_type)} />
          </div>
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Status
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <EncounterStatusBadge status={encounter.status} />
              {encounter.do_not_publish ? (
                <span className="inline-flex min-h-6 items-center border border-red-200 bg-red-50 px-2 text-[9px] uppercase tracking-[0.16em] text-red-700" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Private
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4 md:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Linked Table
            </p>
            {selectedTable ? (
              <button className={`${lightSecondaryButtonClass} mt-2`} type="button" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                {tableLabel(selectedTable)}
              </button>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#111111]">
                No table linked.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
            <TextArea
              helperText="Raw Encounter text stays internal and is never published directly."
              label="Original Encounter Text"
              onChange={(value) => onUpdate(encounter.id, { original_testimony: value })}
              rows={16}
              value={encounter.original_testimony}
            />
          </div>
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
            <p className="text-sm font-semibold text-[#111111]">
              Review Panel
            </p>
            <p className="mt-1 text-xs leading-5 text-[#7b746a]">
              Write only what can become approved Fruit. Internal notes stay inside Command Center.
            </p>
            <TextArea
              helperText="This is the only text that can publish after approval."
              label="Public Fruit Summary"
              onChange={(value) => onUpdate(encounter.id, { public_summary: value })}
              rows={7}
              value={encounter.public_summary}
            />
            <div className="mt-4">
              <TextArea
                helperText="Command Center only. Not synced to public Profile or future Field summaries."
                label="Internal Notes"
                onChange={(value) => onUpdate(encounter.id, { internal_notes: value })}
                rows={5}
                value={encounter.internal_notes}
              />
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#e2ded5] bg-[#f8f6f1] p-3">
              <input
                checked={encounter.do_not_publish}
                className="mt-1 h-4 w-4 accent-[#D4A63D]"
                onChange={(event) => onUpdate(encounter.id, {
                  do_not_publish: event.target.checked,
                  permission_to_share: event.target.checked ? false : encounter.permission_to_share,
                  status: event.target.checked && encounter.status === "approved" ? "reviewed" : encounter.status,
                })}
                type="checkbox"
              />
              <span>
                <span className="block text-[10px] uppercase tracking-[0.16em] text-[#111111]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Sensitive / Do Not Publish
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#7b746a]">
                  Keeps this Encounter out of approved Fruit, Profiles, and future Field summaries.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[#e2ded5] bg-white p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Outcome Tags
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {outcomeTagOptions.map((tag) => {
              const selected = encounter.outcome_tags.includes(tag);

              return (
                <button
                  className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    selected
                      ? "border-[#D4A63D] bg-[#fff8e8] text-[#8a5a00]"
                      : "border-[#e2ded5] bg-[#f8f6f1] text-[#6f6658] hover:border-[#c8952d]"
                  }`}
                  key={tag}
                  onClick={() => toggleOutcomeTag(tag)}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            className={lightSecondaryButtonClass}
            onClick={saveReview}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Save Review
          </button>
          <button
            className={lightPrimaryButtonClass}
            disabled={!encounter.public_summary?.trim() || encounter.do_not_publish}
            onClick={approveAsFruit}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Approve As Fruit
          </button>
          <button className="rounded-md border border-red-200 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-red-700 hover:border-red-400 hover:text-red-800" onClick={markPrivate} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Mark Private
          </button>
          <button className={lightSecondaryButtonClass} onClick={onClose} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function FruitManager({
  encounters,
  fieldPeople,
  fruitItems,
  onUpdateFruit,
  tables,
}: {
  encounters: readonly AdminEncounterSubmission[];
  fieldPeople: readonly AdminFieldPerson[];
  fruitItems: readonly AdminFruitItem[];
  onUpdateFruit: (fruitId: string, patch: Partial<AdminFruitItem>) => void;
  tables: readonly AdminMissionaryTable[];
}) {
  const [editingFruit, setEditingFruit] = useState<AdminFruitItem | null>(null);
  const approvedFruit = fruitItems.filter((fruit) => fruit.status === "approved");
  const visibleFruit = fruitItems.filter((fruit) => fruit.status !== "private");
  const outcomeCounts = outcomeTagOptions.map((tag) => ({
    count: approvedFruit.filter((fruit) => fruit.outcome_tags.includes(tag)).length,
    tag,
  }));

  return (
    <div className="space-y-5">
      <div className="max-w-3xl">
        <p className="text-sm leading-7 text-[#7b746a]">
          Fruit is the approved output layer created from Encounters, Review, and Discipleship Assessment. Raw responses and internal notes stay in Command Center.
        </p>
        <DataFlowLabels items={["Draft -> Approved", "Updates Profile later", "Feeds Field later"]} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatPreview label="Approved Fruit" tone="light" value={String(approvedFruit.length)} />
        <StatPreview label="Draft Fruit" tone="light" value={String(fruitItems.filter((fruit) => fruit.status === "draft").length)} />
        <StatPreview label="Outcome Tags" tone="light" value={String(approvedFruit.reduce((total, fruit) => total + fruit.outcome_tags.length, 0))} />
      </div>

      <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Outcome Counts
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {outcomeCounts.map((outcome) => (
            <span className="rounded-full border border-[#e2ded5] bg-[#f8f6f1] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#6f6658]" key={outcome.tag} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {outcome.tag}: {outcome.count}
            </span>
          ))}
        </div>
      </div>

      {fruitItems.length === 0 ? (
        <div className="rounded-xl border border-[#e2ded5] bg-white p-5 text-sm leading-6 text-[#7b746a]">
          No Fruit has been approved yet. Review a Table and create a Fruit Summary to begin tracking outcomes.
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {visibleFruit.map((fruit) => (
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4" key={fruit.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm leading-6 text-[#111111]">
                  {fruit.summary || "Summary needed."}
                </p>
                <div className="mt-3 grid gap-2 text-xs leading-5 text-[#7b746a]">
                  <span>Person: {personNameById(fieldPeople, fruit.field_person_id)}</span>
                  <span>Table: {tableNameById(tables, fruit.table_id)}</span>
                  <span>Date: {fruit.testimony_date ? formatProfileUpdatedDate(fruit.testimony_date) : formatProfileUpdatedDate(fruit.created_at)}</span>
                </div>
              </div>
              <FruitStatusBadge status={fruit.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {fruit.outcome_tags.length > 0 ? fruit.outcome_tags.map((tag) => (
                <span className="rounded-full border border-[#e2ded5] bg-[#f8f6f1] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#6f6658]" key={tag} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {tag}
                </span>
              )) : (
                <span className="text-xs text-[#7b746a]">No outcome tags yet.</span>
              )}
            </div>
            <button className={`${lightSecondaryButtonClass} mt-4`} onClick={() => setEditingFruit(fruit)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
              View / Edit
            </button>
          </div>
        ))}
      </div>

      {editingFruit ? (
        <FruitEditorModal
          encounters={encounters}
          fieldPeople={fieldPeople}
          fruit={editingFruit}
          initialTable={tables.find((table) => table.id === editingFruit.table_id)}
          onClose={() => setEditingFruit(null)}
          onSave={(draft) => {
            onUpdateFruit(editingFruit.id, {
              encounter_id: draft.encounterId || null,
              field_person_id: draft.fieldPersonId || null,
              internal_notes: draft.internalNotes,
              outcome_tags: draft.outcomeTags,
              status: draft.status,
              summary: draft.summary,
              table_id: draft.tableId || null,
              testimony_date: draft.testimonyDate || null,
              updated_at: new Date().toISOString(),
            });
            setEditingFruit(null);
          }}
          tables={tables}
        />
      ) : null}
    </div>
  );
}

function ConnectionsManager({
  fieldPeople,
  items,
  onAdd,
  onUpdate,
}: {
  fieldPeople: readonly AdminFieldPerson[];
  items: readonly AdminConnectionLog[];
  onAdd: (draft: ConnectionDraft) => void;
  onUpdate: (connectionId: string, draft: ConnectionDraft) => void;
}) {
  const [editingConnection, setEditingConnection] = useState<AdminConnectionLog | null>(null);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const sortedItems = [...items].sort((first, second) => (
    (tableDateValue(second.connection_date)?.getTime() ?? 0) - (tableDateValue(first.connection_date)?.getTime() ?? 0)
  ));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm leading-6 text-[#7b746a]">
            Track ongoing discipleship outside formal Tables: calls, texts, Zoom, prayer, coffee, and follow-up.
          </p>
          <DataFlowLabels items={["Feeds People insights", "Feeds Field later", "Fast log"]} />
        </div>
        <button className={lightPrimaryButtonClass} onClick={() => setIsAddingConnection(true)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          + Log Connection
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e2ded5] bg-[#fbfaf7]">
                {["Date", "Person", "Duration", "Type", "Movement Step", "Actions"].map((heading) => (
                  <th className="border-r border-[#e2ded5] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658] last:border-r-0" key={heading} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedItems.length > 0 ? sortedItems.map((connection) => (
                <tr className="border-b border-[#e2ded5] transition-colors last:border-b-0 hover:bg-[#fbfaf7]" key={connection.id}>
                  <td className="border-r border-[#e2ded5] px-4 py-3 text-sm text-[#4b443b]">{formatProfileUpdatedDate(connection.connection_date)}</td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 text-sm font-semibold text-[#111111]">{personNameById(fieldPeople, connection.field_person_id)}</td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 text-sm text-[#4b443b]">{formatDurationMinutes(connection.duration_minutes)}</td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 text-sm text-[#4b443b]">{connection.interaction_type}</td>
                  <td className="border-r border-[#e2ded5] px-4 py-3 text-sm text-[#4b443b]">{connection.movement_step ?? "Not set"}</td>
                  <td className="px-4 py-3">
                    <button className={lightSecondaryButtonClass} onClick={() => setEditingConnection(connection)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                      View / Edit
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-[#7b746a]" colSpan={6}>
                    No connections logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingConnection ? (
        <ConnectionEditorModal
          fieldPeople={fieldPeople}
          onClose={() => setIsAddingConnection(false)}
          onSave={(draft) => {
            onAdd(draft);
            setIsAddingConnection(false);
          }}
        />
      ) : null}

      {editingConnection ? (
        <ConnectionEditorModal
          connection={editingConnection}
          fieldPeople={fieldPeople}
          onClose={() => setEditingConnection(null)}
          onSave={(draft) => {
            onUpdate(editingConnection.id, draft);
            setEditingConnection(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ConnectionEditorModal({
  connection,
  fieldPeople,
  onClose,
  onSave,
}: {
  connection?: AdminConnectionLog | null;
  fieldPeople: readonly AdminFieldPerson[];
  onClose: () => void;
  onSave: (draft: ConnectionDraft) => void;
}) {
  const [draft, setDraft] = useState<ConnectionDraft>({
    connectionDate: connection?.connection_date ?? todayDateValue(),
    durationMinutes: connection?.duration_minutes ? String(connection.duration_minutes) : "",
    fieldPersonId: connection?.field_person_id ?? "",
    followUpNeeded: connection?.follow_up_needed ?? "",
    interactionType: connection?.interaction_type ?? "Phone call",
    movementStep: connection?.movement_step ?? "",
    notes: connection?.notes ?? "",
  });
  const personOptions = [
    { label: "Select person", value: "" },
    ...fieldPeople.map((person) => ({ label: person.name, value: person.id })),
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-2xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {connection ? "Edit Connection" : "Log Connection"}
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              Ongoing Discipleship
            </h3>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectField
            label="Person"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, fieldPersonId: value }))}
            options={personOptions}
            value={draft.fieldPersonId}
          />
          <Field
            label="Date"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, connectionDate: value }))}
            type="date"
            value={draft.connectionDate}
          />
          <Field
            label="Duration"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, durationMinutes: value }))}
            type="number"
            value={draft.durationMinutes}
          />
          <SelectField
            label="Interaction Type"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, interactionType: value as AdminConnectionType }))}
            options={connectionTypeOptions}
            value={draft.interactionType}
          />
        </div>

        <div className="mt-5 space-y-4">
          <TextArea
            label="Notes"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, notes: value }))}
            rows={4}
            value={draft.notes}
          />
          <SelectField
            label="Movement Step"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, movementStep: value as AdminMovementStep | "" }))}
            options={movementStepSelectOptions}
            value={draft.movementStep}
          />
          <TextArea
            label="Follow up needed"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, followUpNeeded: value }))}
            rows={3}
            value={draft.followUpNeeded}
          />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className={lightSecondaryButtonClass} onClick={onClose} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Cancel
          </button>
          <button className={lightPrimaryButtonClass} onClick={() => onSave(draft)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Save Connection
          </button>
        </div>
      </div>
    </div>
  );
}

function LibraryManager({
  items,
  onAdd,
  onUpdate,
}: {
  items: readonly AdminLibraryItem[];
  onAdd: (draft: LibraryItemDraft) => void;
  onUpdate: (itemId: string, draft: LibraryItemDraft) => void;
}) {
  const [editingItem, setEditingItem] = useState<AdminLibraryItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-[#7b746a]">
          Light teaching framework storage for Command Center now and future Table references later.
        </p>
        <button className={lightPrimaryButtonClass} onClick={() => setIsAddingItem(true)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          + Add Library Item
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.length > 0 ? items.map((item) => (
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4" key={item.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111111]">{item.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7b746a]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {item.category || "Uncategorized"}
                </p>
              </div>
              <button className={lightSecondaryButtonClass} onClick={() => setEditingItem(item)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                Edit
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4b443b]">
              {item.description || "No description added."}
            </p>
          </div>
        )) : (
          <p className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
            No library items yet.
          </p>
        )}
      </div>

      {isAddingItem ? (
        <LibraryEditorModal
          onClose={() => setIsAddingItem(false)}
          onSave={(draft) => {
            onAdd(draft);
            setIsAddingItem(false);
          }}
        />
      ) : null}

      {editingItem ? (
        <LibraryEditorModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(draft) => {
            onUpdate(editingItem.id, draft);
            setEditingItem(null);
          }}
        />
      ) : null}
    </div>
  );
}

function LibraryEditorModal({
  item,
  onClose,
  onSave,
}: {
  item?: AdminLibraryItem | null;
  onClose: () => void;
  onSave: (draft: LibraryItemDraft) => void;
}) {
  const [draft, setDraft] = useState<LibraryItemDraft>({
    category: item?.category ?? "",
    contentNotes: item?.content_notes ?? "",
    description: item?.description ?? "",
    title: item?.title ?? "",
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-2xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {item ? "Edit Library Item" : "Add Library Item"}
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              Teaching Framework
            </h3>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Title" onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, title: value }))} value={draft.title} />
          <Field label="Category" onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, category: value }))} value={draft.category} />
        </div>
        <div className="mt-5 space-y-4">
          <TextArea label="Description" onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, description: value }))} rows={4} value={draft.description} />
          <TextArea label="Content notes" onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, contentNotes: value }))} rows={6} value={draft.contentNotes} />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className={lightSecondaryButtonClass} onClick={onClose} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Cancel
          </button>
          <button className={lightPrimaryButtonClass} disabled={!draft.title.trim()} onClick={() => onSave(draft)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Save Library Item
          </button>
        </div>
      </div>
    </div>
  );
}

function InSeasonManager({
  focus,
  onUpdate,
}: {
  focus: AdminInSeasonFocus;
  onUpdate: (patch: Partial<AdminInSeasonFocus>) => void;
}) {
  return (
    <div className="max-w-[900px] space-y-5">
      <p className="text-sm leading-6 text-[#7b746a]">
        Simple current focus notes for what this missionary household is carrying right now.
      </p>
      <div className="rounded-xl border border-[#e2ded5] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <TextArea label="Current focus" onChange={(value) => onUpdate({ current_focus: value })} rows={5} value={focus.current_focus} />
          <TextArea label="Prayer emphasis" onChange={(value) => onUpdate({ prayer_emphasis: value })} rows={5} value={focus.prayer_emphasis} />
          <TextArea label="Active people note" onChange={(value) => onUpdate({ active_people_note: value })} rows={5} value={focus.active_people_note} />
          <TextArea label="Active tables note" onChange={(value) => onUpdate({ active_tables_note: value })} rows={5} value={focus.active_tables_note} />
        </div>
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
  const [activeTab, setActiveTab] = useState<EditorTab>("overview");
  const [supportSubsection, setSupportSubsection] = useState<SupportSubsection>("progress");
  const [prayerSubsection, setPrayerSubsection] = useState<PrayerSubsection>("visibility");
  const [profileQuery, setProfileQuery] = useState("");
  const [profileVisibilityFilter, setProfileVisibilityFilter] = useState("");
  const [status, setStatus] = useState<StatusMessage>(null);
  const [saving, setSaving] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<MissionaryImageSlot, UploadState>>({
    directory: { status: "idle" },
    hero: { status: "idle" },
  });
  const [isCutoutModalOpen, setIsCutoutModalOpen] = useState(false);
  const [isCutoutGenerationConfigured, setIsCutoutGenerationConfigured] = useState<boolean | null>(null);
  const [cutoutSettings, setCutoutSettings] = useState<CutoutGenerationSettings>(defaultCutoutGenerationSettings);
  const [cutoutGenerationState, setCutoutGenerationState] = useState<CutoutGenerationState>({
    status: "idle",
  });
  const [isCutoutReviewConfirmed, setIsCutoutReviewConfirmed] = useState(false);
  const [storyRefinementState, setStoryRefinementState] = useState<StoryRefinementState>({
    status: "idle",
  });
  const [focusedEncounterId, setFocusedEncounterId] = useState<string | null>(null);
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

  useEffect(() => {
    if (!isCutoutModalOpen) {
      return;
    }

    let ignore = false;

    setIsCutoutGenerationConfigured(null);

    async function checkCutoutConfiguration() {
      try {
        const response = await fetch("/api/admin/missionary-profiles/generate-cutout", {
          method: "GET",
        });
        const result = await response.json().catch(() => ({})) as {
          configured?: boolean;
          error?: string;
        };

        if (ignore) {
          return;
        }

        if (!response.ok) {
          setIsCutoutGenerationConfigured(false);
          setCutoutGenerationState({
            message: result.error || "Unable to check image generation configuration.",
            status: "error",
          });
          return;
        }

        setIsCutoutGenerationConfigured(result.configured === true);

        if (result.configured !== true) {
          setCutoutGenerationState({
            message: "OpenAI GPT 5.5 image generation is not configured. Add OPENAI_API_KEY and restart the server to enable image generation.",
            status: "error",
          });
        } else {
          setCutoutGenerationState((currentState) => (
            currentState.status === "error" && currentState.message?.includes("OPENAI_API_KEY")
              ? { status: "idle" }
              : currentState
          ));
        }
      } catch {
        if (!ignore) {
          setIsCutoutGenerationConfigured(false);
          setCutoutGenerationState({
            message: "Unable to check image generation configuration.",
            status: "error",
          });
        }
      }
    }

    checkCutoutConfiguration();

    return () => {
      ignore = true;
    };
  }, [isCutoutModalOpen]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId),
    [profiles, selectedId],
  );

  useEffect(() => {
    setIsCutoutModalOpen(false);
    setCutoutSettings(defaultCutoutGenerationSettings);
    setIsCutoutReviewConfirmed(false);
    setCutoutGenerationState({ status: "idle" });
    setStoryRefinementState({ status: "idle" });
    setFocusedEncounterId(null);
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

  async function saveFieldPerson(draft: FieldPersonDraft, personId?: string) {
    if (!selectedProfile) {
      return false;
    }

    const response = await fetch("/api/admin/missionary-profiles/people", {
      body: JSON.stringify({
        church: draft.church,
        email: draft.email,
        engagement_level: draft.engagementLevel,
        householdId: selectedProfile.id,
        id: personId,
        name: draft.name,
        notes: draft.notes,
        phone: draft.phone,
        relationship_type: draft.relationshipType,
        status: draft.status,
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: personId ? "PATCH" : "POST",
    });
    const result = await response.json().catch(() => ({})) as {
      error?: string;
      person?: AdminFieldPerson;
    };

    if (!response.ok || !result.person) {
      setStatus({
        text: typeof result.error === "string" ? result.error : "Unable to save person.",
        tone: "error",
      });
      return false;
    }

    updateSelected({
      ...selectedProfile,
      fieldPeople: personId
        ? (selectedProfile.fieldPeople ?? []).map((person) => (person.id === result.person?.id ? result.person : person))
        : [result.person, ...(selectedProfile.fieldPeople ?? [])],
    });
    setStatus({
      text: personId ? "Person updated." : "Person added to Your Field.",
      tone: "success",
    });

    return true;
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
    setActiveTab("overview");
    resetTransientEditorState();
  }

  function closeProfile() {
    setSelectedId("");
    setActiveTab("overview");
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

  function updateRefinedStory(value: string) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      public_story: value,
      story: value,
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

    if (tab === "prayer") {
      setPrayerSubsection("visibility");
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

  function createMissionaryTable(draft: TableDraft) {
    if (!selectedProfile) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const table: AdminMissionaryTable = {
      created_at: timestamp,
      field_person_ids: draft.fieldPersonIds,
      household_id: selectedProfile.id,
      id: newClientId(),
      notes: draft.notes,
      participant_names: parseParticipantNames(draft.participantNamesText),
      source: "command_center",
      table_date: draft.tableDate || todayDateValue(),
      table_type: draft.tableType,
      updated_at: timestamp,
    };

    updateSelected({
      ...selectedProfile,
      tables: [
        table,
        ...(selectedProfile.tables ?? []),
      ],
    });

    setStatus({
      text: "Table added. Click Save Updates to persist this workspace.",
      tone: "success",
    });

    return table;
  }

  function updateMissionaryTable(tableId: string, draft: TableDraft) {
    if (!selectedProfile) {
      return null;
    }

    let updatedTable: AdminMissionaryTable | null = null;
    const timestamp = new Date().toISOString();
    const tables = (selectedProfile.tables ?? []).map((table) => {
      if (table.id !== tableId) {
        return table;
      }

      updatedTable = {
        ...table,
        field_person_ids: draft.fieldPersonIds,
        notes: draft.notes,
        participant_names: parseParticipantNames(draft.participantNamesText),
        table_date: draft.tableDate || todayDateValue(),
        table_type: draft.tableType,
        updated_at: timestamp,
      };

      return updatedTable;
    });

    if (!updatedTable) {
      return null;
    }

    updateSelected({
      ...selectedProfile,
      tables,
    });
    setStatus({
      text: "Table updated. Click Save Updates to persist this workspace.",
      tone: "success",
    });

    return updatedTable;
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

  function addEncounter(table?: AdminMissionaryTable) {
    if (!selectedProfile) {
      return null;
    }

    const encounter = newEncounter(selectedProfile.id, table);

    updateSelected({
      ...selectedProfile,
      encounterSubmissions: [
        encounter,
        ...(selectedProfile.encounterSubmissions ?? []),
      ],
    });

    return encounter.id;
  }

  function addEncounterFromTable(table: AdminMissionaryTable, draft: QuickEncounterDraft) {
    if (!selectedProfile) {
      return;
    }

    const encounter = {
      ...newEncounter(selectedProfile.id, table),
      original_testimony: draft.text,
      submission_type: draft.length === "short" ? "quick_response" as const : "full_testimony" as const,
      submitter_email: draft.email,
      submitter_name: draft.name,
    };

    updateSelected({
      ...selectedProfile,
      encounterSubmissions: [
        encounter,
        ...(selectedProfile.encounterSubmissions ?? []),
      ],
    });

    setStatus({
      text: "Encounter added as RAW. Click Save Updates to persist this workspace.",
      tone: "success",
    });
  }

  function quickUpdateEncounterStatus(submissionId: string, status: AdminEncounterStatus) {
    updateEncounterSubmission(
      submissionId,
      status === "approved" ? { do_not_publish: false, permission_to_share: true, status } : { status },
    );
  }

  function updateTableReview(tableId: string, patch: Partial<AdminTableReview>) {
    if (!selectedProfile) {
      return;
    }

    const currentReviews = selectedProfile.tableReviews ?? [];
    const existingReview = currentReviews.find((review) => review.table_id === tableId);
    const updatedReview: AdminTableReview = {
      ...(existingReview ?? newTableReview(selectedProfile.id, tableId)),
      ...patch,
      updated_at: new Date().toISOString(),
    };

    updateSelected({
      ...selectedProfile,
      tableReviews: existingReview
        ? currentReviews.map((review) => (review.table_id === tableId ? updatedReview : review))
        : [updatedReview, ...currentReviews],
    });
  }

  function createFruitSummary(draft: FruitDraft, table?: AdminMissionaryTable | null) {
    if (!selectedProfile) {
      return;
    }

    const selectedTable = table ?? (selectedProfile.tables ?? []).find((item) => item.id === draft.tableId) ?? null;
    const fruit = newFruitItem(selectedProfile.id, draft, selectedTable);

    updateSelected({
      ...selectedProfile,
      fruitItems: [
        fruit,
        ...(selectedProfile.fruitItems ?? []),
      ],
    });
    setStatus({
      text: "Fruit summary added. Click Save Updates to persist this workspace.",
      tone: "success",
    });
  }

  function updateFruitItem(fruitId: string, patch: Partial<AdminFruitItem>) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      fruitItems: (selectedProfile.fruitItems ?? []).map((fruit) => (
        fruit.id === fruitId
          ? {
            ...fruit,
            ...patch,
            updated_at: new Date().toISOString(),
          }
          : fruit
      )),
    });
    setStatus({
      text: "Fruit updated. Click Save Updates to persist this workspace.",
      tone: "success",
    });
  }

  function addConnectionLog(draft: ConnectionDraft) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      connectionLogs: [
        newConnectionLog(selectedProfile.id, draft),
        ...(selectedProfile.connectionLogs ?? []),
      ],
    });
    setStatus({
      text: "Connection logged. Click Save Updates to persist this workspace.",
      tone: "success",
    });
  }

  function updateConnectionLog(connectionId: string, draft: ConnectionDraft) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      connectionLogs: (selectedProfile.connectionLogs ?? []).map((connection) => (
        connection.id === connectionId
          ? {
            ...connection,
            connection_date: draft.connectionDate || todayDateValue(),
            duration_minutes: Number.isFinite(Number(draft.durationMinutes)) && draft.durationMinutes !== "" ? Number(draft.durationMinutes) : null,
            field_person_id: draft.fieldPersonId || null,
            follow_up_needed: draft.followUpNeeded,
            interaction_type: draft.interactionType,
            movement_step: draft.movementStep || null,
            notes: draft.notes,
            updated_at: new Date().toISOString(),
          }
          : connection
      )),
    });
    setStatus({
      text: "Connection updated. Click Save Updates to persist this workspace.",
      tone: "success",
    });
  }

  function addLibraryItem(draft: LibraryItemDraft) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      libraryItems: [
        ...(selectedProfile.libraryItems ?? []),
        newLibraryItem(selectedProfile.id, draft),
      ],
    });
    setStatus({
      text: "Library item added. Click Save Updates to persist this workspace.",
      tone: "success",
    });
  }

  function updateLibraryItem(itemId: string, draft: LibraryItemDraft) {
    if (!selectedProfile) {
      return;
    }

    updateSelected({
      ...selectedProfile,
      libraryItems: (selectedProfile.libraryItems ?? []).map((item) => (
        item.id === itemId
          ? {
            ...item,
            category: draft.category,
            content_notes: draft.contentNotes,
            description: draft.description,
            title: draft.title,
            updated_at: new Date().toISOString(),
          }
          : item
      )),
    });
    setStatus({
      text: "Library item updated. Click Save Updates to persist this workspace.",
      tone: "success",
    });
  }

  function updateInSeasonFocus(patch: Partial<AdminInSeasonFocus>) {
    if (!selectedProfile) {
      return;
    }

    const currentFocus = selectedProfile.inSeasonFocus ?? emptyInSeasonFocus(selectedProfile.id);

    updateSelected({
      ...selectedProfile,
      inSeasonFocus: {
        ...currentFocus,
        ...patch,
        updated_at: new Date().toISOString(),
      },
    });
  }

  async function updatePersonFromReview(person: AdminFieldPerson, patch: Partial<Pick<AdminFieldPerson, "church" | "engagement_level" | "relationship_type">>) {
    if (!selectedProfile) {
      return;
    }

    const optimisticPerson: AdminFieldPerson = {
      ...person,
      ...patch,
      updated_at: new Date().toISOString(),
    };

    updateSelected({
      ...selectedProfile,
      fieldPeople: (selectedProfile.fieldPeople ?? []).map((item) => (item.id === person.id ? optimisticPerson : item)),
    });

    const response = await fetch("/api/admin/missionary-profiles/people", {
      body: JSON.stringify({
        church: optimisticPerson.church,
        email: optimisticPerson.email,
        engagement_level: optimisticPerson.engagement_level,
        householdId: selectedProfile.id,
        id: optimisticPerson.id,
        name: optimisticPerson.name,
        notes: optimisticPerson.notes,
        phone: optimisticPerson.phone,
        relationship_type: optimisticPerson.relationship_type,
        status: optimisticPerson.status,
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
    const result = await response.json().catch(() => ({})) as {
      error?: string;
      person?: AdminFieldPerson;
    };

    if (!response.ok || !result.person) {
      setStatus({
        text: typeof result.error === "string" ? result.error : "Unable to update person from review.",
        tone: "error",
      });
      return;
    }

    updateSelected({
      ...selectedProfile,
      fieldPeople: (selectedProfile.fieldPeople ?? []).map((item) => (item.id === result.person?.id ? result.person : item)),
    });
    setStatus({
      text: "Person profile updated from review.",
      tone: "success",
    });
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
    setIsCutoutReviewConfirmed(false);
    setIsCutoutGenerationConfigured(null);
    setIsCutoutModalOpen(true);
  }

  async function generateMissionaryCutout() {
    if (isCutoutGenerationConfigured === false) {
      setCutoutGenerationState({
        message: "OpenAI GPT 5.5 image generation is not configured. Add OPENAI_API_KEY and restart the server to enable image generation.",
        status: "error",
      });
      return;
    }

    if (!selectedProfile?.profile_image_url?.trim()) {
      setCutoutGenerationState({
        message: "Upload a directory image before generating a cutout.",
        status: "error",
      });
      return;
    }

    setCutoutGenerationState({
      message: "Generating image...",
      status: "generating",
    });
    setIsCutoutReviewConfirmed(false);

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
        modelLabel?: string;
        path?: string;
        publicUrl?: string;
      };

      if (!response.ok || !result.publicUrl) {
        throw new Error(result.error || "We could not generate the image. Please try again or upload manually.");
      }

      setCutoutGenerationState({
        message: `Preview generated${result.modelLabel ? ` with ${result.modelLabel}` : ""}. Review it before using it as the hero image.`,
        modelLabel: result.modelLabel,
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

    if (!isCutoutReviewConfirmed) {
      setCutoutGenerationState((currentState) => ({
        ...currentState,
        message: "Review and confirm the people look accurate before using this image.",
        status: "error",
      }));
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
      setIsCutoutReviewConfirmed(false);
      router.refresh();
    } catch (error) {
      setCutoutGenerationState((currentState) => ({
        ...currentState,
        message: error instanceof Error ? error.message : "Generated image could not be saved.",
        status: "error",
      }));
    }
  }

  async function refineStoryWithAI() {
    if (!selectedProfile) {
      return;
    }

    const originalStory = selectedProfile.original_story?.trim();

    if (!originalStory) {
      setStoryRefinementState({
        message: "Add an Original Story before refining.",
        status: "error",
      });
      return;
    }

    setStoryRefinementState({
      message: "Refining story with AI...",
      status: "refining",
    });

    try {
      const response = await fetch("/api/admin/missionary-profiles/refine-story", {
        body: JSON.stringify({
          householdName: selectedProfile.display_name,
          originalStory,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as {
        error?: string;
        refinedStory?: string;
      };

      if (!response.ok || !result.refinedStory) {
        throw new Error(result.error || "We could not refine the story. Please try again.");
      }

      updateRefinedStory(result.refinedStory);
      setStoryRefinementState({
        message: "Refined story generated. Review it, then click Save Updates.",
        status: "success",
      });
    } catch (error) {
      setStoryRefinementState({
        message: error instanceof Error ? error.message : "We could not refine the story. Please try again.",
        status: "error",
      });
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
        connectionLogs: selectedProfile.connectionLogs ?? [],
        fruitItems: selectedProfile.fruitItems ?? [],
        household: {
          display_name: selectedProfile.display_name,
          fruit_from_field: selectedProfile.fruit_from_field,
          hero_image_url: selectedProfile.hero_image_url,
          enable_prayer_team: selectedProfile.enable_prayer_team,
          location: primaryState,
          custom_serving_label: selectedProfile.custom_serving_label,
          location_visibility: locationVisibility,
          original_story: selectedProfile.original_story,
          primary_state: primaryState,
          profile_image_url: selectedProfile.profile_image_url,
          prayer_cta_label: selectedProfile.prayer_cta_label,
          prayer_destination: selectedProfile.prayer_destination,
          prayer_section_description: selectedProfile.prayer_section_description,
          prayer_section_headline: selectedProfile.prayer_section_headline,
          public_story: selectedProfile.public_story ?? selectedProfile.story,
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
        inSeasonFocus: selectedProfile.inSeasonFocus ?? emptyInSeasonFocus(selectedProfile.id),
        libraryItems: selectedProfile.libraryItems ?? [],
        originalSlug: initialProfiles.find((profile) => profile.id === selectedProfile.id)?.slug,
        support: supportWithCalculatedMonthlyGoal,
        tableReviews: selectedProfile.tableReviews ?? [],
        tables: selectedProfile.tables ?? [],
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
        text: typeof result.error === "string" ? result.error : "Unable to save missionary workspace.",
        tone: "error",
      });
      setSaving(false);
      return;
    }

    setStatus({
      text: typeof result.message === "string" ? result.message : "Missionary workspace saved.",
      tone: "success",
    });
    setSaving(false);
    router.refresh();
  }

  if (!selectedProfile) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <StatPreview label="Total Workspaces" value={String(profiles.length)} />
          <StatPreview label="Live Profiles" value={String(liveProfiles)} />
          <StatPreview label="Hidden Profiles" value={String(hiddenProfiles)} />
        </div>

        <div className="grid gap-3 rounded-lg border border-[#222222] bg-[#0a0a0a] p-4 md:grid-cols-[minmax(240px,1fr)_220px_auto]">
          <label className="block">
            <span className="sr-only">Search missionary workspaces</span>
            <input
              className="min-h-12 w-full rounded-md border border-[#333333] bg-[#111111] px-3.5 py-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-500 focus:border-[#D4A63D]"
              onChange={(event) => setProfileQuery(event.target.value)}
              placeholder="Search workspaces, slugs, states, or mission"
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
                    <th className="w-[34%] border-r border-[#222222] px-4 py-3 font-bold">Missionary Workspace</th>
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
                        No missionary workspaces match these filters.
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
  const selectedTargetHousehold = targetHouseholds.find((household) => household.id === selectedProfile.support_target_household_id);
  const givingRoutingDestination = supportMode === "household"
    ? selectedProfile.display_name
    : supportMode === "household_nomination"
      ? selectedTargetHousehold?.display_name ?? "Selected missionary household"
      : supportMode === "general_fund"
        ? "USA Missionaries General Fund"
        : supportMode === "state_leader"
          ? "State Leadership Fund"
          : supportMode === "regional_leader"
            ? "Regional Leadership Fund"
            : supportMode === "national_leadership"
              ? "National Leadership and Expansion"
              : "No public giving destination while support is hidden";
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
    missingMessage: "Approve Fruit items to show this section.",
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

        <div className="mt-6 space-y-4 border-b border-stone-800/80 pb-4">
          {editorTabGroups.map((group) => (
            <div key={group.label}>
              <p className="px-1 text-[10px] uppercase tracking-[0.18em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                {group.label}
              </p>
              <div className="mt-2 overflow-x-auto">
                <div className="flex min-w-max gap-2" role="tablist" aria-label={`${group.label} tabs`}>
                  {group.tabs.map((tab) => (
                    <button
                      aria-selected={activeTab === tab.value}
                      className={`rounded-md border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                        activeTab === tab.value
                          ? "border-[#D4A63D] bg-[#D4A63D] text-black"
                          : "border-stone-700 bg-stone-900/70 text-stone-200 hover:border-[#D4A63D] hover:text-[#F5B942]"
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
            </div>
          ))}
        </div>

        <div className="mt-8">
          {activeTab === "overview" ? (
          <SectionIntro
            description="CC Only. Workspace summary for missionary operations and public profile publishing."
            title="Overview"
          >
            <WorkspaceOverview profile={selectedProfile} />
          </SectionIntro>
          ) : null}

          {activeTab === "people" ? (
          <SectionIntro
            description="Feeds Field. Internal people connected to this missionary household. These records power Tables, prayer follow-up, Fruit, and future Field activity. Not public by default."
            title="People"
          >
            <PeopleManager
              items={selectedProfile.fieldPeople ?? []}
              onSave={saveFieldPerson}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "tables" ? (
          <SectionIntro
            description="Feeds Field. Internal table meetings and ministry gatherings connected to this missionary household."
            title="Tables"
          >
            <TablesManager
              encounters={selectedProfile.encounterSubmissions ?? []}
              fieldPeople={selectedProfile.fieldPeople ?? []}
              fruitItems={selectedProfile.fruitItems ?? []}
              items={selectedProfile.tables ?? []}
              onAddEncounter={addEncounterFromTable}
              onCreateFruit={createFruitSummary}
              onCreate={createMissionaryTable}
              onUpdateFruit={updateFruitItem}
              onUpdatePersonProfile={updatePersonFromReview}
              onUpdateReview={updateTableReview}
              onUpdate={updateMissionaryTable}
              tableReviews={selectedProfile.tableReviews ?? []}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "features" ? (
          <SectionIntro
            description="Updates Profile. Turn public profile sections on or off without deleting their content."
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
                  checked: getFeatureValue(selectedProfile, "show_team"),
                  description: featureDescriptions.show_team,
                  label: "Team",
                  onChange: (value) => updateFeatureField("show_team", value),
                  publicStatus: teamStatus.status,
                  statusMessage: teamStatus.message,
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
                Updates Profile. Controls the public hero section, location display, and short mission statement.
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
            description="Updates Profile. Media used on the directory card and as the household overlay on the shared profile hero background. Managed in Command Center and visible on Profile after save."
            title="Media"
          >
            <DataFlowLabels items={["Raw upload -> Reviewed -> Published", "Managed in Command Center", "Visible on Profile"]} />
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
                isConfigured={isCutoutGenerationConfigured}
                isReviewConfirmed={isCutoutReviewConfirmed}
                onClose={() => setIsCutoutModalOpen(false)}
                onGenerate={generateMissionaryCutout}
                onReviewConfirmedChange={setIsCutoutReviewConfirmed}
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
            description="Updates Profile. Public team or household members displayed on the missionary Profile. Do not use this section for discipleship contacts or private ministry relationships."
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
            description="Updates Profile. Use the left side for the original submitted story. Use the right side for the edited public version."
            title="Story"
          >
            <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#4b443b]">
              Use the left side for the original submitted story. Use the right side for the edited public version.
              <DataFlowLabels items={["Raw -> Reviewed -> Published", "Stored in Command Center", "Published to Profile"]} />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e2ded5] bg-white p-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Raw Intake
                  </p>
                  <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
                    Original Story
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#6f6658]">
                    Raw story or form response from the missionary household.
                  </p>
                </div>
                <div className="mt-4">
                  <TextArea
                    helperText="Preserve the raw story exactly as submitted or pasted. Future intake form submissions will populate this field."
                    label="Original Story"
                    onChange={(value) => updateHouseholdField("original_story", value)}
                    rows={14}
                    value={selectedProfile.original_story}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#e2ded5] bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Public Version
                    </p>
                    <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
                      Refined Public Story
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#6f6658]">
                      AI assisted version used on the public profile.
                    </p>
                  </div>
                  <button
                    className={lightPrimaryButtonClass}
                    disabled={storyRefinementState.status === "refining"}
                    onClick={refineStoryWithAI}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    {storyRefinementState.status === "refining" ? "Refining" : "Refine With AI"}
                  </button>
                </div>

                {storyRefinementState.message ? (
                  <p className={`mt-4 rounded-xl border p-3 text-sm leading-6 ${
                    storyRefinementState.status === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-[#e2ded5] bg-[#f8f6f1] text-[#6f6658]"
                  }`}>
                    {storyRefinementState.message}
                  </p>
                ) : null}

                <div className="mt-4">
                  <TextArea
                    helperText="Separate paragraphs with a blank line. This version appears publicly in the Our Story section after you save."
                    label="Refined Story"
                    onChange={updateRefinedStory}
                    rows={14}
                    value={selectedProfile.public_story ?? selectedProfile.story}
                  />
                </div>
              </div>
            </div>
          </SectionIntro>
          ) : null}

          {activeTab === "connections" ? (
          <SectionIntro
            description="Feeds Field. Ongoing interactions outside formal Tables: calls, texts, Zoom, prayer, and discipleship."
            title="Connections"
          >
            <ConnectionsManager
              fieldPeople={selectedProfile.fieldPeople ?? []}
              items={selectedProfile.connectionLogs ?? []}
              onAdd={addConnectionLog}
              onUpdate={updateConnectionLog}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "fruit" ? (
          <SectionIntro
            description="Updates Profile + Feeds Field. Approved summaries and outcome tags derived from Encounters. Raw testimony stays internal."
            title="Fruit"
          >
            <FruitManager
              encounters={selectedProfile.encounterSubmissions ?? []}
              fieldPeople={selectedProfile.fieldPeople ?? []}
              fruitItems={selectedProfile.fruitItems ?? []}
              onUpdateFruit={updateFruitItem}
              tables={selectedProfile.tables ?? []}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "library" ? (
          <SectionIntro
            description="Feeds Field. Internal resources, notes, and ministry materials connected to this missionary household."
            title="Library"
          >
            <LibraryManager
              items={selectedProfile.libraryItems ?? []}
              onAdd={addLibraryItem}
              onUpdate={updateLibraryItem}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "in-season" ? (
          <SectionIntro
            description="Feeds Field. Timely focus, follow-up priorities, and current ministry activity for this missionary household."
            title="In Season"
          >
            <InSeasonManager
              focus={selectedProfile.inSeasonFocus ?? emptyInSeasonFocus(selectedProfile.id)}
              onUpdate={updateInSeasonFocus}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "support" ? (
          <SectionIntro
            description="Updates Profile. Configure public support routing, donor-facing copy, centralized giving routing, and major gift options."
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
                    Giving Routing
                  </p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7b746a]">
                    Giving URLs are centrally controlled by USA Missionaries. Profile admins can review routing here but cannot paste external links.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Source
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#111111]">
                        Master Giving System (USA Missionaries)
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Status
                      </p>
                      <p className="mt-2 text-sm font-semibold text-green-700">
                        Active
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e2ded5] bg-white p-4 md:col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Routing Description
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#111111]">
                        This profile&apos;s support is connected to the centralized giving system managed by USA Missionaries.
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#e2ded5] bg-white p-4 md:col-span-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Destination
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#111111]">
                        {givingRoutingDestination}
                      </p>
                    </div>
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
            description="Updates Profile + Feeds Field. Control the public prayer section and the Join The Prayer Team flow."
            title="Prayer"
          >
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 border-b border-[#e2ded5] pb-3">
                {prayerSubsectionOptions.map((option) => (
                  <button
                    aria-pressed={prayerSubsection === option.value}
                    className={`rounded-md border px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                      prayerSubsection === option.value
                        ? "border-[#D4A63D] bg-[#D4A63D] text-black"
                        : "border-[#d7d2c8] bg-white text-[#4b443b] hover:border-[#c8952d] hover:text-[#8a5a00]"
                    }`}
                    key={option.value}
                    onClick={() => setPrayerSubsection(option.value)}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {prayerSubsection === "visibility" ? (
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
              ) : null}

              {prayerSubsection === "cta" ? (
                <div>
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
              ) : null}

              {prayerSubsection === "content" ? (
                <div>
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
              ) : null}

              {prayerSubsection === "team" ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Prayer Team
                  </p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7b746a]">
                    Prayer partners and active requests are managed from the Prayer Team admin hub. This profile view only shows the connected totals.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <StatPreview label="Recruited Partners" tone="light" value={String(selectedProfile.prayerPartnerCount ?? 0)} />
                    <StatPreview label="Active Requests" tone="light" value={String(selectedProfile.activePrayerRequestCount ?? 0)} />
                  </div>
                  <Link
                    className={`${lightSecondaryButtonClass} mt-4 min-h-10 w-full sm:w-auto`}
                    href={`/admin/prayer-team?tab=requests&household=${selectedProfile.id}`}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  >
                    Manage In Prayer Team
                  </Link>
                </div>
              ) : null}

              {prayerSubsection === "preview" ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Preview
                  </p>
                  <div className="mt-4 rounded-xl border border-[#e2ded5] bg-white p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                          Button
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#111111]">
                          {prayerButtonLabel}
                        </p>
                      </div>
                      <div className="rounded-full border border-[#e2ded5] bg-[#f8f6f1] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Opens {prayerBehavior === "link" ? "Link" : "Modal"}
                      </div>
                    </div>
                    {prayerBehavior === "link" ? (
                      <p className="mt-3 text-xs leading-5 text-[#7b746a]">
                        Fallback URL: {selectedProfile.prayer_destination || "/prayer"}
                      </p>
                    ) : null}
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
              ) : null}
            </div>
          </SectionIntro>
          ) : null}
        </div>
      </section>
    </div>
  );
}
