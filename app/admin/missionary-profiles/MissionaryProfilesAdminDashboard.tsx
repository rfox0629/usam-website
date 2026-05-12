"use client";

import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Copy, ExternalLink, FileText, Smartphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MISSIONARY_IMAGE_MAX_BYTES,
  missionaryImageMimeTypes,
  uploadMissionaryProfileImage,
  validateMissionaryImageFile,
  type MissionaryImageSlot,
} from "@/src/lib/missionaries/profile-image-upload";
import {
  normalizeSupportRoutingMode,
  type SupportRoutingMode,
} from "@/src/lib/missionaries/support-routing";
import { getPublicMissionaryProfileUrl } from "@/src/lib/missionaries/public-origin";
import {
  locationVisibilityOptions,
  ministryRegionOptions,
  normalizeLocationVisibility,
  normalizeMinistryRegion,
  normalizePrimaryState,
  normalizeRoleType,
  normalizeServingScope,
  roleTypeLabel,
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
const lightTertiaryButtonClass = "inline-flex items-center justify-center gap-1.5 rounded-md border border-[#e2ded5] bg-transparent px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#6f6658] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]";
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
export type AdminTableType = "coffee" | "discipleship" | "group" | "kitchen_table" | "other" | "phone" | "prayer" | "text" | "zoom";
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
// The Missionary Workspace owns review and publishing; public pages display
// only approved profile content.
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
  flyer_headline?: string | null;
  flyer_note?: string | null;
  flyer_prayer_ask?: string | null;
  flyer_support_appeal?: string | null;
};

export type AdminSupportCommitmentStatus =
  | "active"
  | "cancelled"
  | "incomplete"
  | "needs_follow_up"
  | "pending_giving_setup";

export type AdminSupportCommitment = {
  admin_notes: string | null;
  allocation_preference: string | null;
  completed_at: string | null;
  created_at: string;
  email: string;
  first_name: string;
  gift_type: "monthly" | "one_time";
  household_id: string | null;
  id: string;
  last_name: string;
  message: string | null;
  other_amount: number | null;
  phone: string | null;
  redirect_giving_url: string | null;
  selected_amount: string | null;
  status: AdminSupportCommitmentStatus;
  submitted_at: string | null;
  updated_at: string | null;
};

export type AdminMajorGiftInquiryStatus =
  | "archived"
  | "closed"
  | "contacted"
  | "needs_follow_up"
  | "new";

export type AdminMajorGiftInquiry = {
  best_time_to_contact: string | null;
  created_at: string;
  donation_types: string[] | null;
  email: string;
  first_name: string;
  household_id: string | null;
  household_name: string | null;
  id: string;
  intended_for: string | null;
  last_name: string;
  message: string | null;
  phone: string | null;
  profile_slug: string | null;
  projected_amount_range: string | null;
  status: AdminMajorGiftInquiryStatus;
  updated_at: string | null;
};

// Tables are the meeting layer for ministry activity. The Missionary Workspace
// manages them now; future Field (FD) can create them quickly during daily work.
export type AdminMissionaryTable = {
  created_at: string;
  field_person_ids: string[];
  household_id?: string | null;
  id: string;
  notes: string | null;
  participant_names: string[];
  source: "command_center" | "field";
  table_date: string;
  table_type: AdminTableType;
  updated_at: string | null;
  workspace_id: string;
};

// Your Field (People) is the internal relationship map shared by the Missionary
// Workspace and future Field. These records are not public Profile Team members.
export type AdminFieldPerson = {
  church: string | null;
  created_at: string;
  created_by: string | null;
  email: string | null;
  engagement_level: string | null;
  household_id?: string | null;
  id: string;
  last_activity_at: string | null;
  name: string;
  notes: string | null;
  phone: string;
  relationship_type: string | null;
  source: "command_center" | "field";
  status: AdminFieldPersonStatus;
  updated_at: string | null;
  workspace_id: string;
};

// Encounters are the raw intake layer for testimonies, forms, reviews, and
// story material. Field (FD) can create these later; the Missionary Workspace
// reviews them before any approved Fruit is derived.
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
  workspace_id: string | null;
};

export type AdminTableReview = {
  assessment_notes: string | null;
  breakthroughs_or_concerns: string | null;
  created_at: string;
  follow_up_areas: AdminAssessmentFollowUpArea[];
  follow_up_needed: string | null;
  household_id?: string | null;
  how_meeting_went: string | null;
  id: string;
  key_observations: string | null;
  movement_step: AdminMovementStep | null;
  questions_covered: string | null;
  readiness: AdminReadiness | null;
  table_id: string;
  teaching_used: AdminTeachingUsed | null;
  updated_at: string | null;
  workspace_id: string;
};

export type AdminFruitItem = {
  created_at: string;
  encounter_id: string | null;
  field_person_id: string | null;
  household_id?: string | null;
  id: string;
  internal_notes: string | null;
  outcome_tags: AdminOutcomeTag[];
  status: AdminFruitStatus;
  summary: string;
  table_id: string | null;
  testimony_date: string | null;
  updated_at: string | null;
  workspace_id: string;
};

export type AdminConnectionLog = {
  connection_date: string;
  created_at: string;
  duration_minutes: number | null;
  field_person_id: string | null;
  follow_up_needed: string | null;
  household_id?: string | null;
  id: string;
  interaction_type: AdminConnectionType;
  movement_step: AdminMovementStep | null;
  notes: string | null;
  updated_at: string | null;
  workspace_id: string;
};

export type AdminLibraryItem = {
  category: string | null;
  content_notes: string | null;
  created_at: string;
  description: string | null;
  household_id?: string | null;
  id: string;
  title: string;
  updated_at: string | null;
  workspace_id: string;
};

export type AdminInSeasonFocus = {
  active_people_note: string | null;
  active_tables_note: string | null;
  current_focus: string | null;
  household_id?: string | null;
  id: string;
  prayer_emphasis: string | null;
  updated_at: string | null;
  workspace_id: string;
};

export type AdminPrayerRequest = {
  category: string | null;
  created_at: string;
  field_person_id: string | null;
  household_id?: string | null;
  id: string;
  request: string;
  status: "answered" | "archived" | "covered" | "open";
  title: string;
  updated_at: string | null;
  urgency: "important" | "normal" | "urgent";
  visibility: "private" | "public" | "team";
  workspace_id: string;
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
  majorGiftInquiries?: AdminMajorGiftInquiry[];
  prayerPartnerCount?: number;
  prayerRequests?: AdminPrayerRequest[];
  publicFruitItemCount?: number;
  support?: AdminSupportSettings;
  supportCommitments?: AdminSupportCommitment[];
  tables?: AdminMissionaryTable[];
  tableReviews?: AdminTableReview[];
  teamMembers?: AdminTeamMember[];
  schemaStatus?: {
    hasPublishingFeatureColumns: boolean;
    hasStoryVersionColumns: boolean;
  };
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

type PersonSaveResult = {
  error?: string;
  ok: boolean;
};

type PeopleCsvImportRow = {
  church: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  sourceRowNumber: number;
};

type PeopleCsvImportResult = {
  importedCount: number;
  people: AdminFieldPerson[];
  skippedCount: number;
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

type AdminMeetingType =
  | "coffee"
  | "discipleship"
  | "group"
  | "kitchen_table"
  | "other"
  | "phone"
  | "prayer"
  | "text"
  | "zoom";
type AdminMeetingDepth = "intentional_meeting" | "quick_touch";
type AdminMeetingStatus = "canceled" | "completed" | "fruit_created" | "reviewed" | "scheduled";
type MeetingSource = "connection" | "table";

type MeetingDraft = {
  date: string;
  depth: AdminMeetingDepth;
  durationMinutes: string;
  fieldPersonIds: string[];
  locationChannel: string;
  meetingType: AdminMeetingType;
  movementStep: AdminMovementStep | "";
  notes: string;
  status: AdminMeetingStatus;
  time: string;
};

type MeetingMeta = {
  depth?: AdminMeetingDepth;
  durationMinutes?: string;
  fieldPersonIds?: string[];
  locationChannel?: string;
  meetingType?: AdminMeetingType;
  movementStep?: AdminMovementStep | "";
  status?: AdminMeetingStatus;
  time?: string;
};

type MeetingListItem = {
  connection?: AdminConnectionLog;
  date: string;
  depth: AdminMeetingDepth;
  fieldPersonIds: string[];
  id: string;
  meetingType: AdminMeetingType;
  nextStep: string;
  notes: string;
  source: MeetingSource;
  status: AdminMeetingStatus;
  table?: AdminMissionaryTable;
  time: string;
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

type PrayerRequestDraft = {
  category: string;
  fieldPersonId: string;
  request: string;
  title: string;
  urgency: AdminPrayerRequest["urgency"];
  visibility: AdminPrayerRequest["visibility"];
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
  | "meetings"
  | "reviews"
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
type LegacyEditorTab = "connections" | "tables";
type RawEditorTab = EditorTab | LegacyEditorTab;
type SupportSubsection = "commitments" | "giving-page" | "overview" | "settings" | "share-tools";
type PrayerSubsection = "content" | "cta" | "preview" | "requests" | "team" | "visibility";
type PrimaryNavKey = "dashboard" | "field" | "publishing" | "resources";

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
  flyer_headline: "",
  flyer_note: "",
  flyer_prayer_ask: "",
  flyer_support_appeal: "",
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

const meetingTypeOptions: Array<{ label: string; value: AdminMeetingType }> = [
  { label: "Kitchen Table", value: "kitchen_table" },
  { label: "Coffee", value: "coffee" },
  { label: "Phone", value: "phone" },
  { label: "Zoom", value: "zoom" },
  { label: "Text", value: "text" },
  { label: "Prayer", value: "prayer" },
  { label: "Group", value: "group" },
  { label: "Discipleship", value: "discipleship" },
  { label: "Other", value: "other" },
];

const prayerUrgencyOptions: Array<{ label: string; value: AdminPrayerRequest["urgency"] }> = [
  { label: "Normal", value: "normal" },
  { label: "Important", value: "important" },
  { label: "Urgent", value: "urgent" },
];

const prayerRequestStatusOptions: Array<{ label: string; value: AdminPrayerRequest["status"] }> = [
  { label: "Open", value: "open" },
  { label: "Covered", value: "covered" },
  { label: "Answered", value: "answered" },
  { label: "Archived", value: "archived" },
];

const meetingDepthOptions: Array<{ label: string; value: AdminMeetingDepth }> = [
  { label: "Quick Touch", value: "quick_touch" },
  { label: "Intentional Meeting", value: "intentional_meeting" },
];

const meetingStatusOptions: Array<{ label: string; value: AdminMeetingStatus }> = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Reviewed", value: "reviewed" },
  { label: "Fruit Created", value: "fruit_created" },
  { label: "Canceled", value: "canceled" },
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
  { label: "Text", value: "text" },
  { label: "Prayer", value: "prayer" },
  { label: "Group", value: "group" },
  { label: "Discipleship", value: "discipleship" },
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

const relationshipTypeOptions: Array<{ label: string; value: string }> = [
  { label: "Select relationship", value: "" },
  { label: "Family", value: "Family" },
  { label: "Friend", value: "Friend" },
  { label: "Neighbor", value: "Neighbor" },
  { label: "Coworker", value: "Coworker" },
  { label: "Church Connection", value: "Church Connection" },
  { label: "Ministry Leader", value: "Ministry Leader" },
  { label: "New Contact", value: "New Contact" },
  { label: "Disciple", value: "Disciple" },
  { label: "Disciple Maker", value: "Disciple Maker" },
  { label: "Mentor", value: "Mentor" },
  { label: "Other", value: "Other" },
];

const engagementLevelOptions: Array<{ label: string; value: string }> = [
  { label: "Select engagement", value: "" },
  { label: "Unknown", value: "Unknown" },
  { label: "Resistant", value: "Resistant" },
  { label: "Closed", value: "Closed" },
  { label: "Hesitant", value: "Hesitant" },
  { label: "Open", value: "Open" },
  { label: "Engaged", value: "Engaged" },
  { label: "Ready to Follow", value: "Ready to Follow" },
  { label: "Actively Following", value: "Actively Following" },
  { label: "Multiplying", value: "Multiplying" },
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

type PublishingFeatureField =
  | "show_fruit"
  | "show_household"
  | "show_photos"
  | "show_prayer"
  | "show_story"
  | "show_support"
  | "show_team";

const primaryNavGroups: Array<{
  helper: string;
  key: PrimaryNavKey;
  label: "Dashboard" | "Field" | "Publishing" | "Resources";
  tabs: Array<{ id?: string; label: string; value: EditorTab }>;
}> = [
  {
    helper: "Activity",
    key: "dashboard",
    label: "Dashboard",
    tabs: [],
  },
  {
    helper: "Public page",
    key: "publishing",
    label: "Publishing",
    tabs: [
      { label: "Profile", value: "profile" },
      { label: "Features", value: "features" },
      { label: "Team", value: "team" },
      { label: "Profile Photos", value: "media" },
      { label: "Story", value: "story" },
      { label: "Support", value: "support" },
      { label: "Prayer", value: "prayer" },
    ],
  },
  {
    helper: "Discipleship",
    key: "field",
    label: "Field",
    tabs: [
      { label: "People", value: "people" },
      { label: "Meetings", value: "meetings" },
      { label: "Reviews", value: "reviews" },
      { label: "Fruit", value: "fruit" },
      { label: "Prayer", value: "prayer" },
    ],
  },
  {
    helper: "Library",
    key: "resources",
    label: "Resources",
    tabs: [
      { label: "Library", value: "library" },
      { label: "In Season", value: "in-season" },
    ],
  },
];

const publishingEnabledByDefault = true;

function normalizeEditorTab(tab: RawEditorTab): EditorTab {
  return tab === "tables" || tab === "connections" ? "meetings" : tab;
}

function isEditorTab(value: string | null): value is EditorTab {
  return value === "overview" || primaryNavGroups.some((group) => group.tabs.some((tab) => tab.value === value));
}

function getPrimaryNavForTab(tab: EditorTab, currentPrimary: PrimaryNavKey = "dashboard"): PrimaryNavKey {
  if (tab === "overview") {
    return "dashboard";
  }

  if (tab === "library" || tab === "in-season") {
    return "resources";
  }

  if (["profile", "features", "team", "media", "story", "support"].includes(tab)) {
    return "publishing";
  }

  if (tab === "prayer" && currentPrimary === "publishing") {
    return "publishing";
  }

  return "field";
}

function getDefaultTabForPrimaryNav(primaryNav: PrimaryNavKey): { id: string; value: EditorTab } {
  if (primaryNav === "dashboard") {
    return {
      id: "",
      value: "overview",
    };
  }

  const group = primaryNavGroups.find((item) => item.key === primaryNav);
  const firstTab = group?.tabs[0];

  return {
    id: firstTab?.id ?? firstTab?.value ?? "overview",
    value: firstTab?.value ?? "overview",
  };
}

function getSubnavIdForTab(tab: EditorTab, primaryNav: PrimaryNavKey) {
  return tab === "overview" && primaryNav === "dashboard" ? "" : tab;
}

const supportSubsectionOptions: Array<{ label: string; value: SupportSubsection }> = [
  { label: "Overview", value: "overview" },
  { label: "Giving Page", value: "giving-page" },
  { label: "Share Tools", value: "share-tools" },
  { label: "Commitments", value: "commitments" },
  { label: "Settings", value: "settings" },
];

const prayerSubsectionOptions: Array<{ label: string; value: PrayerSubsection }> = [
  { label: "Visibility", value: "visibility" },
  { label: "Requests", value: "requests" },
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

function memberNameKey(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function householdNameCandidates(profile: AdminProfile) {
  const displayName = profile.display_name.trim();
  const parts = displayName.split(/\s*&\s*/).map((part) => part.trim()).filter(Boolean);

  if (parts.length < 2) {
    return displayName ? [displayName] : [];
  }

  const lastName = parts[parts.length - 1].split(/\s+/).at(-1) ?? "";

  return parts.map((part, index) => {
    if (index === parts.length - 1 || !lastName) {
      return part;
    }

    return /\s/.test(part) ? part : `${part} ${lastName}`;
  });
}

function nextHouseholdTeamMemberName(profile: AdminProfile) {
  const existingNames = new Set((profile.teamMembers ?? []).map((member) => memberNameKey(member.display_name)));

  return householdNameCandidates(profile).find((name) => !existingNames.has(memberNameKey(name))) ?? "New Team Member";
}

function teamMemberRoleTitle(profile: AdminProfile) {
  const roleType = getProfileRoleType(profile);

  return roleType === "missionary_household"
    ? "Missionary"
    : roleTypeLabel(roleType);
}

function nextTeamSortOrder(items: readonly AdminTeamMember[]) {
  return items.reduce((highest, member) => Math.max(highest, toNumber(member.sort_order)), 0) + 1;
}

function newTeamMember(
  householdId: string,
  publicNumber = "",
  defaults: Partial<Pick<AdminTeamMember, "display_name" | "dos_user_id" | "role_title" | "short_description" | "sort_order">> = {},
): AdminTeamMember {
  const timestamp = new Date().toISOString();

  return {
    created_at: timestamp,
    display_name: defaults.display_name ?? "",
    dos_user_id: defaults.dos_user_id ?? "",
    household_id: householdId,
    id: newClientId(),
    is_public: true,
    public_number: publicNumber,
    role_title: defaults.role_title ?? "",
    short_description: defaults.short_description ?? "",
    sort_order: defaults.sort_order ?? 0,
    source: "website_admin",
    status: "active",
    updated_at: timestamp,
  };
}

function newEncounter(workspaceId: string, table?: Pick<AdminMissionaryTable, "id" | "table_date">): AdminEncounterSubmission {
  const timestamp = new Date().toISOString();

  return {
    created_at: timestamp,
    do_not_publish: false,
    encounter_date: table?.table_date ?? todayDateValue(),
    id: newClientId(),
    internal_notes: "",
    missionary_household_id: workspaceId,
    missionary_profile_id: workspaceId,
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
    workspace_id: workspaceId,
  };
}

function newTableReview(workspaceId: string, tableId: string): AdminTableReview {
  const timestamp = new Date().toISOString();

  return {
    assessment_notes: "",
    breakthroughs_or_concerns: "",
    created_at: timestamp,
    follow_up_areas: [],
    follow_up_needed: "",
    household_id: workspaceId,
    how_meeting_went: "",
    id: newClientId(),
    key_observations: "",
    movement_step: null,
    questions_covered: "",
    readiness: null,
    table_id: tableId,
    teaching_used: null,
    updated_at: timestamp,
    workspace_id: workspaceId,
  };
}

function newConnectionLog(workspaceId: string, draft: ConnectionDraft): AdminConnectionLog {
  const timestamp = new Date().toISOString();

  return {
    connection_date: draft.connectionDate || todayDateValue(),
    created_at: timestamp,
    duration_minutes: Number.isFinite(Number(draft.durationMinutes)) ? Number(draft.durationMinutes) : null,
    field_person_id: draft.fieldPersonId || null,
    follow_up_needed: draft.followUpNeeded,
    household_id: workspaceId,
    id: newClientId(),
    interaction_type: draft.interactionType,
    movement_step: draft.movementStep || null,
    notes: draft.notes,
    updated_at: timestamp,
    workspace_id: workspaceId,
  };
}

function newLibraryItem(workspaceId: string, draft: LibraryItemDraft): AdminLibraryItem {
  const timestamp = new Date().toISOString();

  return {
    category: draft.category,
    content_notes: draft.contentNotes,
    created_at: timestamp,
    description: draft.description,
    household_id: workspaceId,
    id: newClientId(),
    title: draft.title,
    updated_at: timestamp,
    workspace_id: workspaceId,
  };
}

function emptyInSeasonFocus(workspaceId: string): AdminInSeasonFocus {
  return {
    active_people_note: "",
    active_tables_note: "",
    current_focus: "",
    household_id: workspaceId,
    id: newClientId(),
    prayer_emphasis: "",
    updated_at: new Date().toISOString(),
    workspace_id: workspaceId,
  };
}

function newFruitItem(workspaceId: string, draft: FruitDraft, table?: AdminMissionaryTable | null): AdminFruitItem {
  const timestamp = new Date().toISOString();

  return {
    created_at: timestamp,
    encounter_id: draft.encounterId || null,
    field_person_id: draft.fieldPersonId || null,
    household_id: workspaceId,
    id: newClientId(),
    internal_notes: draft.internalNotes,
    outcome_tags: draft.outcomeTags,
    status: draft.status,
    summary: draft.summary,
    table_id: draft.tableId || null,
    testimony_date: draft.testimonyDate || table?.table_date || todayDateValue(),
    updated_at: timestamp,
    workspace_id: workspaceId,
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
  showManualUrlFallback = true,
  slot,
  uploadState,
  value,
}: {
  helperText: string;
  label: string;
  onChange: (value: string) => void;
  onUpload: (slot: MissionaryImageSlot, file: File) => void;
  showManualUrlFallback?: boolean;
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
      <p className="mt-1.5 text-[12px] leading-5 text-[#7b746a]">
        {helperText}
      </p>

      <div className="relative mt-2.5 overflow-hidden rounded-xl border border-[#d7d2c8] bg-white">
        {imageUrl ? (
          <div className="flex h-48 items-center justify-center p-2.5 md:h-56">
            <img
              alt={`${label} preview`}
              className="max-h-full w-full object-contain"
              onError={() => setPreviewFailed(true)}
              onLoad={() => setPreviewFailed(false)}
              src={imageUrl}
            />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center px-4 text-center text-xs uppercase tracking-[0.18em] text-[#7b746a] md:h-56" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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
        className={`mt-2.5 rounded-lg border border-dashed p-3 transition-colors ${
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
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#111111]">
              Upload / replace image
            </p>
            <p className="mt-1 text-xs leading-5 text-[#7b746a]">
              {imageTypeLabel}. Max {MISSIONARY_IMAGE_MAX_BYTES / 1024 / 1024}MB.
            </p>
          </div>
          <label
            className={`inline-flex min-h-9 cursor-pointer items-center justify-center rounded-md border px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${
              isUploading
                ? "border-[#d7d2c8] text-[#9a9488]"
                : "border-[#d7d2c8] bg-white text-[#111111] hover:border-[#c8952d] hover:text-[#8a5a00]"
            }`}
            htmlFor={inputId}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          >
            {isUploading ? "Uploading" : imageUrl ? "Replace" : "Upload"}
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

      {showManualUrlFallback ? (
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
      ) : null}
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
  onRequest,
  onSettingsChange,
  settings,
  sourceImageUrl,
}: {
  generationState: CutoutGenerationState;
  householdName: string;
  onClose: () => void;
  onRequest: () => void;
  onSettingsChange: (settings: CutoutGenerationSettings) => void;
  settings: CutoutGenerationSettings;
  sourceImageUrl: string;
}) {
  const isGenerating = generationState.status === "generating";

  function updateSetting<K extends keyof CutoutGenerationSettings>(key: K, value: CutoutGenerationSettings[K]) {
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
              Admin-Assisted Media
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              Request USAM Hero Image
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b443b]">
              Send your uploaded primary profile photo to USA Missionaries Admin for a reviewed USAM-style public hero cutout.
            </p>
            <p className="mt-3 max-w-2xl rounded-xl border border-[#d7d2c8] bg-white p-3 text-xs leading-5 text-[#6f6658]">
              This protects likeness and brand consistency while masked image editing is being evaluated. Approved hero images can be uploaded and applied from Advanced Settings.
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
              This photo remains the public-profile default until an approved USAM hero image is uploaded and selected.
            </p>
            <div className="mt-4 rounded-xl border border-[#d7d2c8] bg-white p-4">
              <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Example USAM Hero Style
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7b746a]">
                Example reference image only. Your requested hero image will use your uploaded family/team photo.
              </p>
              <div className="mt-3 overflow-hidden rounded-xl border border-[#e2ded5] bg-[#f8f6f1] p-3">
                <span className="mb-3 inline-flex rounded-full border border-[#d7d2c8] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Example Reference Photo
                </span>
                <img
                  alt="USAM standard military family cutout style reference"
                  className="max-h-56 w-full object-contain"
                  src="/fox-family-no-background.png"
                />
              </div>
              <p className="mt-3 rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3 text-[10px] uppercase tracking-[0.18em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Managed by USA Missionaries Admin
              </p>
            </div>
          </div>

          <div>
            <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Request Details
            </p>
            <div className="mt-3 rounded-xl border border-[#d7d2c8] bg-white p-4">
              <p className="text-sm font-semibold text-[#111111]">
                Optional Styling
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7b746a]">
                Optional additions must match the approved example style exactly and preserve likeness.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <CutoutSettingToggle
                  checked={settings.addHats}
                  description="Dark tactical/military-style hats with the same scale, placement, and USAM patch treatment as the example."
                  label="Add matching military-style hats"
                  onChange={(checked) => updateSetting("addHats", checked)}
                />
                <CutoutSettingToggle
                  checked={settings.addFacePaint}
                  description="Subtle dark charcoal/gray field camo only. No bright colors, heavy marks, or facial distortion."
                  label="Add subtle face paint"
                  onChange={(checked) => updateSetting("addFacePaint", checked)}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#d7d2c8] bg-white p-4">
              <p className="text-sm font-semibold text-[#111111]">
                Admin Review Request
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7b746a]">
                USA Missionaries Admin will review the source photo, preserve likeness, and prepare an approved hero image before it can be used publicly.
              </p>
              <div className="relative mt-4 rounded-xl border border-[#e2ded5] bg-[#f8f6f1] p-4">
                <p className="text-xs leading-5 text-[#6f6658]">
                  Automated whole-image generation is paused for this MVP because it can alter faces, age, body structure, patches, and camo details. This request flow keeps the public profile on the uploaded photo until a reviewed hero image is uploaded.
                </p>
                {isGenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/85 px-4 text-center text-xs uppercase tracking-[0.2em] text-[#8a5a00]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {generationState.message || "Sending request..."}
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
                  disabled={isGenerating || generationState.status === "success"}
                  onClick={onRequest}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  {generationState.status === "success" ? "Request Sent" : "Submit Request"}
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
  hideLabel = false,
  label,
  onChange,
  rows = 4,
  value,
}: {
  helperText?: string;
  hideLabel?: boolean;
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string | null | undefined;
}) {
  return (
    <label className="block">
      <span className={hideLabel ? "sr-only" : lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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
    <div className="my-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          className="rounded-full border border-[#e2ded5] bg-white px-2.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#6f6658]"
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
  const peopleCount = profile.fieldPeople?.length ?? 0;
  const meetingCount = (profile.tables?.length ?? 0) + (profile.connectionLogs?.length ?? 0);
  const reviewedTableIds = new Set((profile.tableReviews ?? []).map((review) => review.table_id));
  const reviewsPending = (profile.tables ?? []).filter((table) => !reviewedTableIds.has(table.id)).length;
  const prayerRequests = profile.prayerRequests ?? [];
  const openPrayerRequests = prayerRequests.filter((request) => request.status === "open").length || profile.activePrayerRequestCount || 0;
  const fruitLogged = profile.fruitItems?.length ?? 0;
  const followUpsNeeded = [
    ...(profile.tableReviews ?? []).filter((review) => Boolean(review.follow_up_needed?.trim())),
    ...(profile.connectionLogs ?? []).filter((connection) => Boolean(connection.follow_up_needed?.trim())),
  ].length;
  const publishingStatus = isProfilePublic(profile) ? "Live" : "Hidden";
  const recentActivity = [
    ...(profile.tables ?? []).slice(0, 3).map((table) => ({
      date: table.table_date,
      label: tableTypeLabel(table.table_type),
      meta: table.participant_names.length ? table.participant_names.join(", ") : "Meeting logged",
    })),
    ...(profile.connectionLogs ?? []).slice(0, 3).map((connection) => ({
      date: connection.connection_date,
      label: connection.interaction_type,
      meta: connection.follow_up_needed || "Connection logged",
    })),
    ...(profile.fruitItems ?? []).slice(0, 2).map((fruit) => ({
      date: fruit.testimony_date ?? fruit.created_at,
      label: "Fruit logged",
      meta: fruit.summary || "Summary needed",
    })),
  ]
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatPreview label="People in Field" tone="light" value={String(peopleCount)} />
        <StatPreview label="Meetings" tone="light" value={String(meetingCount)} />
        <StatPreview label="Reviews Pending" tone="light" value={String(reviewsPending)} />
        <StatPreview label="Prayer Requests" tone="light" value={String(openPrayerRequests)} />
        <StatPreview label="Fruit Logged" tone="light" value={String(fruitLogged)} />
        <StatPreview label="Follow Ups Needed" tone="light" value={String(followUpsNeeded)} />
        <StatPreview label="Publishing Status" tone="light" value={publishingStatus} />
        <StatPreview label="Approved Fruit" tone="light" value={String(profile.fruitItems?.filter((fruit) => fruit.status === "approved").length ?? 0)} />
      </div>

      <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Recent Activity
        </p>
        <div className="mt-4 divide-y divide-[#e2ded5]">
          {recentActivity.length > 0 ? recentActivity.map((activity) => (
            <div className="py-3 first:pt-0 last:pb-0" key={`${activity.label}-${activity.date}-${activity.meta}`}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-[#111111]">{activity.label}</p>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {formatProfileUpdatedDate(activity.date)}
                </p>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#5f574c]">{activity.meta}</p>
            </div>
          )) : (
            <p className="text-sm leading-6 text-[#7b746a]">No field activity has been logged yet.</p>
          )}
        </div>
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

function getFeatureValue(profile: AdminProfile, field: PublishingFeatureField) {
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

type FeaturePublicPageStatus = "hidden" | "missing" | "migration" | "showing" | "waiting";

type FeatureVisibilityRow = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  publicStatus: FeaturePublicPageStatus;
  statusLabel?: string;
  statusMessage: string;
};

function hasTextContent(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasRenderableMedia(profile: AdminProfile) {
  return hasTextContent(profile.hero_image_url) || hasTextContent(profile.profile_image_url);
}

function getGeneratedHeroImageUrl(value: string | null | undefined) {
  const imageUrl = value?.trim();

  if (!imageUrl || imageUrl.endsWith("/fox-family-no-background.png")) {
    return "";
  }

  return imageUrl;
}

function hasRenderableTeam(profile: AdminProfile) {
  return (profile.teamMembers ?? []).some((member) => member.status === "active" && member.is_public !== false);
}

function hasRenderableStory(profile: AdminProfile) {
  return hasTextContent(profile.public_story);
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
    case "migration":
      return "border-red-200 bg-red-50 text-red-800";
    case "waiting":
      return "border-blue-200 bg-blue-50 text-blue-800";
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
    case "migration":
      return "Incomplete";
    case "waiting":
      return "Incomplete";
    case "missing":
      return "Empty";
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
            <th className="w-[54%] border-r border-[#e2ded5] px-3.5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Section
            </th>
            <th className="w-[22%] border-r border-[#e2ded5] px-3.5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Toggle
            </th>
            <th className="w-[24%] px-3.5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-[#e2ded5] transition-colors last:border-b-0 hover:bg-[#fbfaf7]" key={row.label}>
              <td className="border-r border-[#e2ded5] px-3.5 py-2 align-middle">
                <span className="block text-[15px] font-bold uppercase leading-5 text-[#111111]" style={{ fontFamily: font.oswald }}>
                  {row.label}
                </span>
              </td>
              <td className="border-r border-[#e2ded5] px-3.5 py-2 align-middle">
                <label className={`inline-flex items-center text-xs text-[#111111] ${row.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`} title={row.disabled ? row.statusMessage : row.label}>
                  <input
                    checked={row.checked}
                    className="sr-only"
                    disabled={row.disabled}
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
                </label>
              </td>
              <td className="px-3.5 py-2 align-middle">
                <span
                  className={`inline-flex min-h-6 items-center rounded-full border px-2.5 text-[9px] uppercase tracking-[0.14em] ${getFeatureStatusBadgeClasses(row.publicStatus)}`}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  title={row.statusMessage}
                >
                  {row.statusLabel ?? getFeatureStatusLabel(row.publicStatus)}
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

const meetingMetaPattern = /\[cc-meeting\]([\s\S]*?)\[\/cc-meeting\]\s*/;

function meetingTypeLabel(value: AdminMeetingType | string | null | undefined) {
  return meetingTypeOptions.find((option) => option.value === value)?.label ?? "Other";
}

function meetingDepthLabel(value: AdminMeetingDepth) {
  return meetingDepthOptions.find((option) => option.value === value)?.label ?? "Intentional Meeting";
}

function meetingStatusLabel(value: AdminMeetingStatus) {
  return meetingStatusOptions.find((option) => option.value === value)?.label ?? "Completed";
}

function isMeetingType(value: unknown): value is AdminMeetingType {
  return typeof value === "string" && meetingTypeOptions.some((option) => option.value === value);
}

function isMeetingDepth(value: unknown): value is AdminMeetingDepth {
  return value === "quick_touch" || value === "intentional_meeting";
}

function isMeetingStatus(value: unknown): value is AdminMeetingStatus {
  return meetingStatusOptions.some((option) => option.value === value);
}

function parseMeetingNotes(value: string | null | undefined): { meta: MeetingMeta; notes: string } {
  const rawValue = value ?? "";
  const match = rawValue.match(meetingMetaPattern);

  if (!match) {
    return { meta: {}, notes: rawValue };
  }

  let meta: MeetingMeta = {};

  try {
    const parsedMeta = JSON.parse(match[1] ?? "{}") as Record<string, unknown>;
    const fieldPersonIds = Array.isArray(parsedMeta.fieldPersonIds)
      ? parsedMeta.fieldPersonIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined;

    meta = {
      depth: isMeetingDepth(parsedMeta.depth) ? parsedMeta.depth : undefined,
      durationMinutes: typeof parsedMeta.durationMinutes === "string" ? parsedMeta.durationMinutes : undefined,
      fieldPersonIds,
      locationChannel: typeof parsedMeta.locationChannel === "string" ? parsedMeta.locationChannel : undefined,
      meetingType: isMeetingType(parsedMeta.meetingType) ? parsedMeta.meetingType : undefined,
      movementStep: movementStepOptions.includes(parsedMeta.movementStep as AdminMovementStep) ? parsedMeta.movementStep as AdminMovementStep : undefined,
      status: isMeetingStatus(parsedMeta.status) ? parsedMeta.status : undefined,
      time: typeof parsedMeta.time === "string" ? parsedMeta.time : undefined,
    };
  } catch {
    meta = {};
  }

  return {
    meta,
    notes: rawValue.replace(meetingMetaPattern, "").trim(),
  };
}

function composeMeetingNotes(notes: string, meta: MeetingMeta) {
  const compactMeta = Object.fromEntries(
    Object.entries(meta).filter(([, value]) => (
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    )),
  );

  return `[cc-meeting]${JSON.stringify(compactMeta)}[/cc-meeting]\n${notes.trim()}`.trim();
}

function tableTypeFromMeetingType(value: AdminMeetingType): AdminTableType {
  return value;
}

function connectionTypeFromMeetingType(value: AdminMeetingType): AdminConnectionType {
  switch (value) {
    case "coffee":
      return "Coffee";
    case "discipleship":
      return "Discipleship";
    case "phone":
      return "Phone call";
    case "prayer":
      return "Prayer";
    case "text":
      return "Text";
    case "zoom":
      return "Zoom";
    default:
      return "Other";
  }
}

function meetingTypeFromConnection(value: AdminConnectionType | string | null | undefined): AdminMeetingType {
  switch (value) {
    case "Coffee":
      return "coffee";
    case "Discipleship":
      return "discipleship";
    case "Phone call":
      return "phone";
    case "Prayer":
      return "prayer";
    case "Text":
      return "text";
    case "Zoom":
      return "zoom";
    default:
      return "other";
  }
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

function optionsWithCurrentValue(options: Array<{ label: string; value: string }>, value: string | null | undefined) {
  const nextValue = value?.trim();

  if (!nextValue || options.some((option) => option.value === nextValue)) {
    return options;
  }

  return [
    ...options,
    { label: nextValue, value: nextValue },
  ];
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

function normalizeCsvHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvText(text: string) {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (isQuoted && nextCharacter === "\"") {
        currentField += "\"";
        index += 1;
      } else {
        isQuoted = !isQuoted;
      }
      continue;
    }

    if (character === "," && !isQuoted) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isQuoted) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += character;
  }

  currentRow.push(currentField);
  rows.push(currentRow);

  const cleanedRows = rows
    .map((row) => row.map((field) => field.trim()))
    .filter((row) => row.some((field) => field.trim()));
  const headers = cleanedRows[0] ?? [];

  return {
    headers,
    rows: cleanedRows.slice(1),
  };
}

function csvValue(headers: readonly string[], row: readonly string[], aliases: readonly string[]) {
  const normalizedAliases = aliases.map(normalizeCsvHeader);
  const index = headers.findIndex((header) => normalizedAliases.includes(normalizeCsvHeader(header)));

  return index >= 0 ? row[index]?.trim() ?? "" : "";
}

function mapPeopleCsvRow(headers: readonly string[], row: readonly string[], rowIndex: number): PeopleCsvImportRow {
  const firstName = csvValue(headers, row, ["First Name"]);
  const lastName = csvValue(headers, row, ["Last Name"]);
  const fallbackName = csvValue(headers, row, ["Name", "Full Name"]);

  return {
    church: csvValue(headers, row, ["Church Attending", "Church"]),
    email: csvValue(headers, row, ["Home Email", "Email"]),
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || fallbackName,
    phone: csvValue(headers, row, ["Mobile Phone Number", "Mobile Phone", "Phone"]),
    sourceRowNumber: rowIndex + 2,
  };
}

function peopleImportPhoneKey(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function emptyFieldPersonDraft(person?: AdminFieldPerson): FieldPersonDraft {
  return {
    church: person?.church ?? "",
    email: person?.email ?? "",
    engagementLevel: person?.engagement_level ?? "",
    name: person?.name ?? "",
    notes: person?.notes ?? "",
    phone: person?.phone ?? "",
    relationshipType: person?.relationship_type ?? "",
    status: person?.status ?? "new",
  };
}

function PeopleManager({
  items,
  onImport,
  onSave,
}: {
  items: readonly AdminFieldPerson[];
  onImport: (rows: PeopleCsvImportRow[]) => Promise<PeopleCsvImportResult>;
  onSave: (draft: FieldPersonDraft, personId?: string) => Promise<PersonSaveResult>;
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const editingPerson = sortedPeople.find((person) => person.id === editingPersonId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
            Your Field
          </h3>
          <p className="text-sm leading-5 text-[#7b746a]">
            People connected to this workspace
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={lightSecondaryButtonClass}
            onClick={() => setIsImportOpen(true)}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Import CSV
          </button>
          <button
            className={lightPrimaryButtonClass}
            onClick={() => setIsAddPersonOpen(true)}
            style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
            type="button"
          >
            + Add Person
          </button>
        </div>
      </div>

      {saveMessage ? (
        <p className={`rounded-xl border p-3 text-sm leading-6 ${
          saveMessage.tone === "success"
            ? "border-green-200 bg-green-50 text-green-900"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {saveMessage.text}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
        <div className="hidden grid-cols-[minmax(0,1.3fr)_110px_minmax(0,1fr)_minmax(0,0.9fr)_92px_92px_110px_62px] gap-3 border-b border-[#e2ded5] bg-[#fbfaf7] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#6f6658] lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          <span>Name</span>
          <span>Phone</span>
          <span>Email</span>
          <span>Church</span>
          <span>Relationship</span>
          <span>Engagement</span>
          <span>Last Activity</span>
          <span className="text-right">Actions</span>
        </div>
        {sortedPeople.length === 0 ? (
          <p className="px-3 py-4 text-sm leading-6 text-[#7b746a]">
            No people yet
          </p>
        ) : null}
        <div className="divide-y divide-[#e2ded5]">
          {sortedPeople.map((person) => (
            <div className="grid gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#fbfaf7] lg:grid-cols-[minmax(0,1.3fr)_110px_minmax(0,1fr)_minmax(0,0.9fr)_92px_92px_110px_62px] lg:items-center" key={person.id}>
              <div className="min-w-0">
                <span className="block truncate text-base font-semibold text-[#111111]">
                  {person.name}
                </span>
              </div>
              {[
                ["Phone", person.phone],
                ["Email", person.email?.trim() || "Not set"],
                ["Church", person.church?.trim() || "Not set"],
                ["Relationship", person.relationship_type?.trim() || "Not set"],
                ["Engagement", person.engagement_level?.trim() || "Not set"],
                ["Last Activity", personLastActivityLabel(person)],
              ].map(([label, value]) => (
                <div className="flex items-center justify-between gap-3 lg:block" key={label}>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8174] lg:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    {label}
                  </span>
                  <span className={`${label === "Relationship" || label === "Engagement" ? "text-xs" : "text-sm"} text-[#4b443b]`}>
                    {value}
                  </span>
                </div>
              ))}
              <div className="flex justify-end">
                <button className={lightSecondaryButtonClass} onClick={() => setEditingPersonId(person.id)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAddPersonOpen ? (
        <PersonEditorModal
          mode="add"
          onClose={() => setIsAddPersonOpen(false)}
          onSave={async (draft) => {
            setSaveMessage(null);
            const saved = await onSave(draft);

            if (saved.ok) {
              setIsAddPersonOpen(false);
              setSaveMessage({ text: "Person added to Your Field", tone: "success" });
            } else if (saved.error) {
              setSaveMessage({ text: saved.error, tone: "error" });
            }

            return saved;
          }}
        />
      ) : null}

      {isImportOpen ? (
        <PeopleCsvImportModal
          existingPeople={items}
          onClose={() => setIsImportOpen(false)}
          onImport={onImport}
        />
      ) : null}

      {editingPerson ? (
        <PersonEditorModal
          mode="edit"
          onClose={() => setEditingPersonId(null)}
          onSave={async (draft) => {
            setSaveMessage(null);
            const saved = await onSave(draft, editingPerson.id);

            if (saved.ok) {
              setEditingPersonId(null);
              setSaveMessage({ text: "Person updated.", tone: "success" });
            } else if (saved.error) {
              setSaveMessage({ text: saved.error, tone: "error" });
            }

            return saved;
          }}
          person={editingPerson}
        />
      ) : null}
    </div>
  );
}

function PeopleCsvImportModal({
  existingPeople,
  onClose,
  onImport,
}: {
  existingPeople: readonly AdminFieldPerson[];
  onClose: () => void;
  onImport: (rows: PeopleCsvImportRow[]) => Promise<PeopleCsvImportResult>;
}) {
  const [fileName, setFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<PeopleCsvImportResult | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<PeopleCsvImportRow[]>([]);
  const existingPhones = useMemo(
    () => new Set(existingPeople.map((person) => peopleImportPhoneKey(person.phone)).filter(Boolean)),
    [existingPeople],
  );
  const importableRows = rows.filter((row) => row.name.trim() && row.phone.trim());
  const invalidRows = rows.length - importableRows.length;
  const matchedRows = importableRows.filter((row) => existingPhones.has(peopleImportPhoneKey(row.phone)));
  const previewRows = rows.slice(0, 10);
  const canImport = importableRows.length > 0 && isConfirmed && !isImporting;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setFileName(file?.name ?? "");
    setImportError("");
    setImportResult(null);
    setIsConfirmed(false);
    setParseError("");
    setRows([]);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Choose a .csv file.");
      return;
    }

    try {
      const text = await file.text();
      const parsedCsv = parseCsvText(text);

      if (parsedCsv.headers.length === 0 || parsedCsv.rows.length === 0) {
        setParseError("The CSV does not contain header and data rows.");
        return;
      }

      setRows(parsedCsv.rows.map((row, index) => mapPeopleCsvRow(parsedCsv.headers, row, index)));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to parse CSV.");
    }
  }

  async function confirmImport() {
    if (!canImport) {
      return;
    }

    setImportError("");
    setImportResult(null);
    setIsImporting(true);

    try {
      const result = await onImport(importableRows);

      setImportResult(result);
      setIsConfirmed(false);
    } catch (error) {
      const nextError = error instanceof Error ? error.message : "Unable to import CSV.";

      console.error("People CSV import failed:", error);
      setImportError(nextError);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm md:py-12">
      <div className="mx-auto max-w-5xl rounded-[18px] border border-[#e2ded5] bg-[#f8f6f1] p-5 text-[#111111] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Your Field Import
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              Import PCO CSV
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b443b]">
              Preview the mapped People rows, then confirm before creating records in this workspace.
            </p>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <label className="block rounded-xl border border-dashed border-[#d7d2c8] bg-white p-4">
              <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                CSV File
              </span>
              <input
                accept=".csv,text/csv"
                className="mt-3 block w-full text-sm text-[#4b443b] file:mr-4 file:rounded-md file:border-0 file:bg-[#D4A63D] file:px-4 file:py-2 file:text-[10px] file:uppercase file:tracking-[0.18em] file:text-black"
                onChange={handleFileChange}
                type="file"
              />
              {fileName ? (
                <span className={lightHelperClass}>
                  Loaded {fileName}
                </span>
              ) : null}
            </label>

            {parseError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                {parseError}
              </p>
            ) : null}

            {importError ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                {importError}
              </p>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
              <div className="border-b border-[#e2ded5] bg-[#fbfaf7] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Preview First 10 Rows
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#e2ded5] bg-[#fbfaf7]">
                      {["Name", "Phone", "Email", "Church"].map((heading) => (
                        <th className="border-r border-[#e2ded5] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658] last:border-r-0" key={heading} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-sm leading-6 text-[#7b746a]" colSpan={4}>
                          Upload a CSV to preview mapped People rows.
                        </td>
                      </tr>
                    ) : null}
                    {previewRows.map((row) => (
                      <tr className="border-b border-[#e2ded5] last:border-b-0" key={row.sourceRowNumber}>
                        <td className="border-r border-[#e2ded5] px-4 py-3 text-sm font-semibold text-[#111111]">
                          {row.name || "Missing name"}
                        </td>
                        <td className="border-r border-[#e2ded5] px-4 py-3 text-sm text-[#4b443b]">
                          {row.phone || "Missing phone"}
                        </td>
                        <td className="border-r border-[#e2ded5] px-4 py-3 text-sm text-[#4b443b]">
                          {row.email || "Not provided"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#4b443b]">
                          {row.church || "Not provided"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-4 rounded-xl border border-[#e2ded5] bg-white p-4">
            <div>
              <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Auto Mapping
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-5 text-[#4b443b]">
                <li>First + Last Name → name</li>
                <li>Mobile Phone Number → phone</li>
                <li>Home Email → email</li>
                <li>Church Attending → church</li>
              </ul>
            </div>

            <div className="rounded-xl border border-[#e2ded5] bg-[#fbfaf7] p-3 text-sm leading-6 text-[#4b443b]">
              <p>{rows.length} total CSV rows</p>
              <p>{importableRows.length} importable rows</p>
              <p>{matchedRows.length} existing phone matches</p>
              <p>{invalidRows} rows missing name or phone</p>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-[#e2ded5] bg-[#fff8e8] p-3 text-sm leading-6 text-[#4b443b]">
              <input
                checked={isConfirmed}
                className="mt-1"
                disabled={importableRows.length === 0}
                onChange={(event) => setIsConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>
                I confirm this import should create scoped records for this missionary workspace. Existing data will not be overwritten automatically.
              </span>
            </label>

            <button
              className={lightPrimaryButtonClass}
              disabled={!canImport}
              onClick={confirmImport}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              {isImporting ? "Importing" : "Confirm Import"}
            </button>

            {importResult ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-900">
                <p className="font-semibold">Import complete.</p>
                <p>Imported {importResult.importedCount} people</p>
                {importResult.skippedCount > 0 ? (
                  <p>{importResult.skippedCount} rows skipped</p>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className={lightSecondaryButtonClass} onClick={onClose} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Close
          </button>
        </div>
      </div>
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
  onSave: (draft: FieldPersonDraft) => Promise<PersonSaveResult>;
  person?: AdminFieldPerson;
}) {
  const [draft, setDraft] = useState<FieldPersonDraft>(() => emptyFieldPersonDraft(person));
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canSave = Boolean(draft.name.trim() && draft.phone.trim());

  async function savePerson() {
    if (!canSave || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const saved = await onSave(draft);

      if (saved.ok) {
        if (mode === "add") {
          setDraft(emptyFieldPersonDraft());
        }

        return;
      }

      const nextError = saved.error || "Unable to save person.";

      console.error("Save Person failed:", nextError);
      setErrorMessage(nextError);
      setIsSaving(false);
    } catch (error) {
      const nextError = error instanceof Error ? error.message : "Unable to save person.";

      console.error("Save Person failed:", error);
      setErrorMessage(nextError);
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
            <SelectField
              label="Relationship Type"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, relationshipType: value }))}
              options={optionsWithCurrentValue(relationshipTypeOptions, draft.relationshipType)}
              value={draft.relationshipType}
            />
            <SelectField
              label="Engagement Level"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, engagementLevel: value }))}
              options={optionsWithCurrentValue(engagementLevelOptions, draft.engagementLevel)}
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

        {errorMessage ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button className={lightSecondaryButtonClass} onClick={onClose} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Cancel
          </button>
          <button className={lightPrimaryButtonClass} disabled={!canSave || isSaving} onClick={savePerson} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            {isSaving ? "Saving..." : "Save Person"}
          </button>
        </div>
      </div>
    </div>
  );
}

function meetingPeopleLabel(meeting: MeetingListItem, fieldPeople: readonly AdminFieldPerson[]) {
  const peopleById = new Map(fieldPeople.map((person) => [person.id, person.name]));
  const linkedNames = meeting.fieldPersonIds
    .map((personId) => peopleById.get(personId))
    .filter((name): name is string => Boolean(name?.trim()));

  if (linkedNames.length > 0) {
    return linkedNames.length <= 3
      ? linkedNames.join(", ")
      : `${linkedNames.slice(0, 3).join(", ")} +${linkedNames.length - 3}`;
  }

  return "People optional";
}

function meetingDateTimeLabel(meeting: MeetingListItem) {
  return meeting.time
    ? `${formatProfileUpdatedDate(meeting.date)} at ${meeting.time}`
    : formatProfileUpdatedDate(meeting.date);
}

function deriveTableMeetingStatus(
  table: AdminMissionaryTable,
  meta: MeetingMeta,
  review: AdminTableReview | null,
  fruitItems: readonly AdminFruitItem[],
): AdminMeetingStatus {
  if (meta.status === "canceled") {
    return "canceled";
  }

  if (fruitItems.some((fruit) => fruit.table_id === table.id)) {
    return "fruit_created";
  }

  if (review && (
    review.how_meeting_went?.trim()
      || review.key_observations?.trim()
      || review.follow_up_needed?.trim()
      || review.movement_step
  )) {
    return "reviewed";
  }

  return meta.status ?? "completed";
}

function tableToMeetingListItem(
  table: AdminMissionaryTable,
  reviews: readonly AdminTableReview[],
  fruitItems: readonly AdminFruitItem[],
): MeetingListItem {
  const parsedNotes = parseMeetingNotes(table.notes);
  const review = reviews.find((item) => item.table_id === table.id) ?? null;

  return {
    date: table.table_date,
    depth: parsedNotes.meta.depth ?? "intentional_meeting",
    fieldPersonIds: table.field_person_ids,
    id: `table:${table.id}`,
    meetingType: parsedNotes.meta.meetingType ?? table.table_type,
    nextStep: review?.movement_step ?? parsedNotes.meta.movementStep ?? "Not set",
    notes: parsedNotes.notes,
    source: "table",
    status: deriveTableMeetingStatus(table, parsedNotes.meta, review, fruitItems),
    table,
    time: parsedNotes.meta.time ?? "",
  };
}

function connectionToMeetingListItem(connection: AdminConnectionLog): MeetingListItem {
  const parsedNotes = parseMeetingNotes(connection.notes);
  const fieldPersonIds = parsedNotes.meta.fieldPersonIds ?? (connection.field_person_id ? [connection.field_person_id] : []);

  return {
    connection,
    date: connection.connection_date,
    depth: parsedNotes.meta.depth ?? "quick_touch",
    fieldPersonIds,
    id: `connection:${connection.id}`,
    meetingType: parsedNotes.meta.meetingType ?? meetingTypeFromConnection(connection.interaction_type),
    nextStep: connection.movement_step ?? "Not set",
    notes: parsedNotes.notes,
    source: "connection",
    status: parsedNotes.meta.status ?? "completed",
    time: parsedNotes.meta.time ?? "",
  };
}

function emptyMeetingDraft(mode: "log" | "schedule"): MeetingDraft {
  return {
    date: todayDateValue(),
    depth: mode === "schedule" ? "intentional_meeting" : "quick_touch",
    durationMinutes: "",
    fieldPersonIds: [],
    locationChannel: "",
    meetingType: "kitchen_table",
    movementStep: "",
    notes: "",
    status: mode === "schedule" ? "scheduled" : "completed",
    time: "",
  };
}

function meetingDraftFromItem(meeting: MeetingListItem): MeetingDraft {
  const parsedNotes = parseMeetingNotes(meeting.source === "table" ? meeting.table?.notes : meeting.connection?.notes);

  return {
    date: meeting.date,
    depth: meeting.depth,
    durationMinutes: meeting.connection?.duration_minutes ? String(meeting.connection.duration_minutes) : parsedNotes.meta.durationMinutes ?? "",
    fieldPersonIds: meeting.fieldPersonIds,
    locationChannel: parsedNotes.meta.locationChannel ?? "",
    meetingType: meeting.meetingType,
    movementStep: meeting.connection?.movement_step ?? parsedNotes.meta.movementStep ?? "",
    notes: parsedNotes.notes,
    status: meeting.status,
    time: meeting.time,
  };
}

function meetingToTableDraft(draft: MeetingDraft): TableDraft {
  return {
    fieldPersonIds: draft.fieldPersonIds,
    notes: composeMeetingNotes(draft.notes, {
      depth: draft.depth,
      durationMinutes: draft.durationMinutes,
      fieldPersonIds: draft.fieldPersonIds,
      locationChannel: draft.locationChannel,
      meetingType: draft.meetingType,
      movementStep: draft.movementStep,
      status: draft.status,
      time: draft.time,
    }),
    participantNamesText: "",
    tableDate: draft.date,
    tableType: tableTypeFromMeetingType(draft.meetingType),
  };
}

function meetingToConnectionDraft(draft: MeetingDraft): ConnectionDraft {
  return {
    connectionDate: draft.date,
    durationMinutes: draft.durationMinutes,
    fieldPersonId: draft.fieldPersonIds[0] ?? "",
    followUpNeeded: "",
    interactionType: connectionTypeFromMeetingType(draft.meetingType),
    movementStep: draft.movementStep,
    notes: composeMeetingNotes(draft.notes, {
      depth: draft.depth,
      durationMinutes: draft.durationMinutes,
      fieldPersonIds: draft.fieldPersonIds,
      locationChannel: draft.locationChannel,
      meetingType: draft.meetingType,
      movementStep: draft.movementStep,
      status: draft.status,
      time: draft.time,
    }),
  };
}

function MeetingStatusBadge({ status }: { status: AdminMeetingStatus }) {
  const className = {
    canceled: "border-[#d7d2c8] bg-[#f1eee7] text-[#6f6658]",
    completed: "border-[#e6c777] bg-[#fff8e8] text-[#8a5a00]",
    fruit_created: "border-green-200 bg-green-50 text-green-800",
    reviewed: "border-green-200 bg-green-50 text-green-800",
    scheduled: "border-[#d7d2c8] bg-white text-[#6f6658]",
  }[status];

  return (
    <span className={`inline-flex min-h-6 items-center border px-2 text-[9px] uppercase tracking-[0.16em] ${className}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {meetingStatusLabel(status)}
    </span>
  );
}

function reviewHasContent(review: AdminTableReview | null | undefined) {
  return Boolean(
    review?.how_meeting_went?.trim()
      || review?.key_observations?.trim()
      || review?.breakthroughs_or_concerns?.trim()
      || review?.assessment_notes?.trim()
      || review?.follow_up_needed?.trim()
      || review?.movement_step
      || review?.readiness
      || review?.teaching_used
      || review?.questions_covered?.trim()
      || review?.follow_up_areas.length,
  );
}

function ReviewsManager({
  fieldPeople,
  fruitItems,
  onCreateFruit,
  tableReviews,
  tables,
}: {
  fieldPeople: readonly AdminFieldPerson[];
  fruitItems: readonly AdminFruitItem[];
  onCreateFruit: (draft: FruitDraft, table?: AdminMissionaryTable | null) => void;
  tableReviews: readonly AdminTableReview[];
  tables: readonly AdminMissionaryTable[];
}) {
  const reviewRows = useMemo(
    () => tables.map((table) => {
      const review = tableReviews.find((item) => item.table_id === table.id) ?? null;
      const fruitCount = fruitItems.filter((fruit) => fruit.table_id === table.id).length;

      return {
        fruitCount,
        isReviewed: reviewHasContent(review),
        review,
        table,
      };
    }).sort((first, second) => {
      if (first.isReviewed !== second.isReviewed) {
        return first.isReviewed ? 1 : -1;
      }

      return (tableDateValue(second.table.table_date)?.getTime() ?? 0) - (tableDateValue(first.table.table_date)?.getTime() ?? 0);
    }),
    [fruitItems, tableReviews, tables],
  );
  const pendingRows = reviewRows.filter((row) => !row.isReviewed);
  const reviewedRows = reviewRows.filter((row) => row.isReviewed);
  const [selectedTableId, setSelectedTableId] = useState(reviewRows[0]?.table.id ?? "");
  const selectedRow = reviewRows.find((row) => row.table.id === selectedTableId) ?? reviewRows[0] ?? null;

  useEffect(() => {
    if (selectedTableId && reviewRows.some((row) => row.table.id === selectedTableId)) {
      return;
    }

    setSelectedTableId(reviewRows[0]?.table.id ?? "");
  }, [reviewRows, selectedTableId]);

  function createFruitDraftFromReview(row: typeof reviewRows[number]) {
    const review = row.review;
    const summary = review?.key_observations?.trim()
      || review?.how_meeting_went?.trim()
      || review?.breakthroughs_or_concerns?.trim()
      || `Fruit follow-up from ${tableLabel(row.table)}`;

    onCreateFruit({
      encounterId: "",
      fieldPersonId: row.table.field_person_ids[0] ?? "",
      internalNotes: review?.assessment_notes ?? "",
      outcomeTags: [],
      status: "draft",
      summary,
      tableId: row.table.id,
      testimonyDate: row.table.table_date,
    }, row.table);
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Post-meeting review
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatPreview label="Reviews Pending" tone="light" value={String(pendingRows.length)} />
        <StatPreview label="Reviewed Meetings" tone="light" value={String(reviewedRows.length)} />
        <StatPreview label="Fruit From Reviews" tone="light" value={String(fruitItems.filter((fruit) => Boolean(fruit.table_id)).length)} />
      </div>

      {pendingRows.length === 0 ? (
        <p className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
          No reviews
        </p>
      ) : null}

      {reviewRows.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1fr)]">
          <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
            <div className="border-b border-[#e2ded5] bg-[#fbfaf7] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Meeting Reviews
              </p>
            </div>
            <div className="divide-y divide-[#e2ded5]">
              {reviewRows.map((row) => {
                const selected = selectedRow?.table.id === row.table.id;
                const people = tableLinkedPeople(row.table, fieldPeople);

                return (
                  <button
                    className={`block w-full px-3 py-2.5 text-left transition-colors hover:bg-[#fbfaf7] ${selected ? "bg-[#fff8e8]" : "bg-white"}`}
                    key={row.table.id}
                    onClick={() => setSelectedTableId(row.table.id)}
                    type="button"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-[#111111]">
                        {tableLabel(row.table)}
                      </p>
                      <span className={`w-fit rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${row.isReviewed ? "border-[#D4A63D]/40 bg-[#fff8e8] text-[#8a5a00]" : "border-stone-200 bg-stone-50 text-[#6f6658]"}`} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        {row.isReviewed ? "Reviewed" : "Pending"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#7b746a]">
                      {people.length > 0 ? participantNamesText(people) : "No people linked"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRow ? (
            <div className="rounded-xl border border-[#e2ded5] bg-white p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Selected Review
                  </p>
                  <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
                    {tableLabel(selectedRow.table)}
                  </h3>
                </div>
                <button
                  className={lightPrimaryButtonClass}
                  disabled={selectedRow.fruitCount > 0}
                  onClick={() => createFruitDraftFromReview(selectedRow)}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  {selectedRow.fruitCount > 0 ? "Fruit Created" : "Create Fruit Draft"}
                </button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { label: "How It Went", value: selectedRow.review?.how_meeting_went || "Not reviewed yet." },
                  { label: "Key Observations", value: selectedRow.review?.key_observations || "No observations added." },
                  { label: "Teaching Used", value: selectedRow.review?.teaching_used || "Not selected." },
                  { label: "Questions Covered", value: selectedRow.review?.questions_covered || "No questions logged." },
                  { label: "Readiness", value: selectedRow.review?.readiness || "Not selected." },
                  { label: "Movement Step", value: selectedRow.review?.movement_step || "Not selected." },
                  { label: "Follow Up Needed", value: selectedRow.review?.follow_up_needed || "No follow-up noted." },
                  { label: "Fruit Status", value: selectedRow.fruitCount > 0 ? `${selectedRow.fruitCount} fruit item${selectedRow.fruitCount === 1 ? "" : "s"}` : "Not created" },
                ].map((item) => (
                  <div className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-2.5" key={item.label}>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-[#111111]">
                      {truncateText(item.value, 140)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MeetingsManager({
  connections,
  encounters,
  fieldPeople,
  fruitItems,
  onAddConnection,
  onAddEncounter,
  onCreateFruit,
  onCreateTable,
  onUpdateConnection,
  onUpdateFruit,
  onUpdatePersonProfile,
  onUpdateReview,
  onUpdateTable,
  tableReviews,
  tables,
}: {
  connections: readonly AdminConnectionLog[];
  encounters: readonly AdminEncounterSubmission[];
  fieldPeople: readonly AdminFieldPerson[];
  fruitItems: readonly AdminFruitItem[];
  onAddConnection: (draft: ConnectionDraft) => void;
  onAddEncounter: (table: AdminMissionaryTable, draft: QuickEncounterDraft) => void;
  onCreateFruit: (draft: FruitDraft, table?: AdminMissionaryTable | null) => void;
  onCreateTable: (draft: TableDraft) => AdminMissionaryTable | null;
  onUpdateConnection: (connectionId: string, draft: ConnectionDraft) => void;
  onUpdateFruit: (fruitId: string, patch: Partial<AdminFruitItem>) => void;
  onUpdatePersonProfile: (person: AdminFieldPerson, patch: Partial<Pick<AdminFieldPerson, "church" | "engagement_level" | "relationship_type">>) => void;
  onUpdateReview: (tableId: string, patch: Partial<AdminTableReview>) => void;
  onUpdateTable: (tableId: string, draft: TableDraft) => AdminMissionaryTable | null;
  tableReviews: readonly AdminTableReview[];
  tables: readonly AdminMissionaryTable[];
}) {
  const meetings = useMemo(
    () => [
      ...tables.map((table) => tableToMeetingListItem(table, tableReviews, fruitItems)),
      ...connections.map(connectionToMeetingListItem),
    ].sort((first, second) => {
      const firstTime = tableDateValue(first.date)?.getTime() ?? 0;
      const secondTime = tableDateValue(second.date)?.getTime() ?? 0;

      return secondTime - firstTime || second.time.localeCompare(first.time);
    }),
    [connections, fruitItems, tableReviews, tables],
  );
  const [editingMeeting, setEditingMeeting] = useState<MeetingListItem | null>(null);
  const [isLoggingMeeting, setIsLoggingMeeting] = useState(false);
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);
  const [quickEncounterTable, setQuickEncounterTable] = useState<AdminMissionaryTable | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState(meetings[0]?.id ?? "");
  const selectedMeeting = meetings.find((meeting) => meeting.id === selectedMeetingId) ?? meetings[0] ?? null;
  const selectedTable = selectedMeeting?.table ?? null;
  const selectedConnection = selectedMeeting?.connection ?? null;

  useEffect(() => {
    if (selectedMeetingId && meetings.some((meeting) => meeting.id === selectedMeetingId)) {
      return;
    }

    setSelectedMeetingId(meetings[0]?.id ?? "");
  }, [meetings, selectedMeetingId]);

  function saveMeeting(draft: MeetingDraft, existingMeeting?: MeetingListItem | null) {
    if (existingMeeting?.source === "connection") {
      if (!existingMeeting.connection) {
        return;
      }

      onUpdateConnection(existingMeeting.connection.id, meetingToConnectionDraft(draft));
      return;
    }

    if (existingMeeting?.source === "table") {
      if (!existingMeeting.table) {
        return;
      }

      const updatedTable = onUpdateTable(existingMeeting.table.id, meetingToTableDraft(draft));

      if (updatedTable) {
        setSelectedMeetingId(`table:${updatedTable.id}`);
      }

      return;
    }

    if (draft.depth === "quick_touch") {
      onAddConnection(meetingToConnectionDraft(draft));
      setSelectedMeetingId("");
      return;
    }

    const table = onCreateTable(meetingToTableDraft(draft));

    if (table) {
      setSelectedMeetingId(`table:${table.id}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Meetings & follow-up
        </p>
        <div className="flex flex-wrap gap-2">
          <button className={lightSecondaryButtonClass} onClick={() => setIsSchedulingMeeting(true)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Schedule Meeting
          </button>
          <button className={lightPrimaryButtonClass} onClick={() => setIsLoggingMeeting(true)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Log Meeting
          </button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <p className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
          No meetings yet
        </p>
      ) : null}

      {meetings.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
          <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
            <div className="hidden grid-cols-[118px_minmax(0,0.8fr)_88px_minmax(0,1fr)_112px_minmax(0,1fr)_104px] gap-3 border-b border-[#e2ded5] bg-[#fbfaf7] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-[#6f6658] lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              <span>Date / Time</span>
              <span>Type</span>
              <span>Depth</span>
              <span>People</span>
              <span>Status</span>
              <span>Next Step</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-[#e2ded5]">
              {meetings.map((meeting) => {
                const selected = selectedMeeting?.id === meeting.id;

                return (
                  <div className={`grid gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#fbfaf7] lg:grid-cols-[118px_minmax(0,0.8fr)_88px_minmax(0,1fr)_112px_minmax(0,1fr)_104px] lg:items-center ${selected ? "bg-[#fff8e8]" : ""}`} key={meeting.id}>
                    {[
                      ["Date / Time", meetingDateTimeLabel(meeting), "text-sm text-[#4b443b]"],
                      ["Type", meetingTypeLabel(meeting.meetingType), "text-sm font-semibold text-[#111111]"],
                      ["Depth", meetingDepthLabel(meeting.depth), "text-sm text-[#4b443b]"],
                      ["People", meetingPeopleLabel(meeting, fieldPeople), "text-sm text-[#4b443b]"],
                    ].map(([label, value, className]) => (
                      <div className="flex items-center justify-between gap-3 lg:block" key={label}>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8174] lg:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                          {label}
                        </span>
                        <span className={className}>
                          {value}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8174] lg:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Status
                      </span>
                      <MeetingStatusBadge status={meeting.status} />
                    </div>
                    <div className="flex items-center justify-between gap-3 lg:block">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#8a8174] lg:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Next Step
                      </span>
                      <span className="text-sm text-[#4b443b]">{meeting.nextStep}</span>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button className={lightSecondaryButtonClass} onClick={() => setSelectedMeetingId(meeting.id)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                        View
                      </button>
                      <button className={lightSecondaryButtonClass} onClick={() => setEditingMeeting(meeting)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedTable ? (
            <TableDetailPanel
              encounters={encounters.filter((encounter) => encounter.table_id === selectedTable.id)}
              fieldPeople={fieldPeople}
              fruitItems={fruitItems.filter((fruit) => fruit.table_id === selectedTable.id)}
              onAddEncounter={(table) => setQuickEncounterTable(table)}
              onCreateFruit={onCreateFruit}
              onUpdateFruit={onUpdateFruit}
              onUpdatePersonProfile={onUpdatePersonProfile}
              onUpdateReview={onUpdateReview}
              review={tableReviews.find((item) => item.table_id === selectedTable.id) ?? null}
              table={selectedTable}
            />
          ) : selectedConnection && selectedMeeting ? (
            <QuickTouchDetailPanel
              fieldPeople={fieldPeople}
              meeting={selectedMeeting}
              onEdit={() => setEditingMeeting(selectedMeeting)}
            />
          ) : null}
        </div>
      ) : null}

      {isSchedulingMeeting ? (
        <MeetingEditorModal
          fieldPeople={fieldPeople}
          mode="schedule"
          onClose={() => setIsSchedulingMeeting(false)}
          onSave={(draft) => {
            saveMeeting(draft);
            setIsSchedulingMeeting(false);
          }}
        />
      ) : null}

      {isLoggingMeeting ? (
        <MeetingEditorModal
          fieldPeople={fieldPeople}
          mode="log"
          onClose={() => setIsLoggingMeeting(false)}
          onSave={(draft) => {
            saveMeeting(draft);
            setIsLoggingMeeting(false);
          }}
        />
      ) : null}

      {editingMeeting ? (
        <MeetingEditorModal
          fieldPeople={fieldPeople}
          meeting={editingMeeting}
          mode={editingMeeting.status === "scheduled" ? "schedule" : "log"}
          onClose={() => setEditingMeeting(null)}
          onSave={(draft) => {
            saveMeeting(draft, editingMeeting);
            setEditingMeeting(null);
          }}
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

function QuickTouchDetailPanel({
  fieldPeople,
  meeting,
  onEdit,
}: {
  fieldPeople: readonly AdminFieldPerson[];
  meeting: MeetingListItem;
  onEdit: () => void;
}) {
  const locationChannel = parseMeetingNotes(meeting.connection?.notes).meta.locationChannel ?? "";

  return (
    <aside className="self-start rounded-xl border border-[#e2ded5] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Quick Touch
          </p>
          <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
            {meetingTypeLabel(meeting.meetingType)}
          </h3>
        </div>
        <button className={lightSecondaryButtonClass} onClick={onEdit} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          Edit
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailText label="Date / Time" value={meetingDateTimeLabel(meeting)} />
        <DetailText label="People" value={meetingPeopleLabel(meeting, fieldPeople)} />
        <DetailText label="Status" value={meetingStatusLabel(meeting.status)} />
        <DetailText label="Next Step" value={meeting.nextStep} />
        <DetailText label="Duration" value={formatDurationMinutes(meeting.connection?.duration_minutes)} />
        <DetailText label="Location / Channel" value={locationChannel || "Not set"} />
      </div>

      <div className="mt-4 rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Notes
        </p>
        <p className="mt-1 text-sm leading-6 text-[#111111]">
          {meeting.notes || "No notes added."}
        </p>
      </div>

      <p className="mt-4 rounded-lg border border-[#e2ded5] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#7b746a]">
        Quick Touch meetings are fast relationship logs. They feed People insights without forcing Review, Assessment, or Fruit.
      </p>
    </aside>
  );
}

function MeetingEditorModal({
  fieldPeople,
  meeting,
  mode,
  onClose,
  onSave,
}: {
  fieldPeople: readonly AdminFieldPerson[];
  meeting?: MeetingListItem | null;
  mode: "log" | "schedule";
  onClose: () => void;
  onSave: (draft: MeetingDraft) => void;
}) {
  const [draft, setDraft] = useState<MeetingDraft>(() => (
    meeting ? meetingDraftFromItem(meeting) : emptyMeetingDraft(mode)
  ));

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
              {mode === "schedule" ? "Schedule Meeting" : "Log Meeting"}
            </p>
            <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
              {meeting ? "Edit Meeting" : mode === "schedule" ? "New Scheduled Meeting" : "Completed Meeting"}
            </h3>
          </div>
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7d2c8] bg-white text-lg leading-none text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]" onClick={onClose} type="button">
            ×
          </button>
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
                Add people in Your Field first, or save this meeting without linked people for now.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Meeting Type"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, meetingType: value as AdminMeetingType }))}
              options={meetingTypeOptions}
              value={draft.meetingType}
            />
            <SelectField
              label="Status"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, status: value as AdminMeetingStatus }))}
              options={meetingStatusOptions}
              value={draft.status}
            />
            {mode === "log" ? (
              <SelectField
                label="Meeting Depth"
                onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, depth: value as AdminMeetingDepth }))}
                options={meetingDepthOptions}
                value={draft.depth}
              />
            ) : null}
            <Field
              label="Date"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, date: value }))}
              type="date"
              value={draft.date}
            />
            {mode === "schedule" ? (
              <Field
                label="Time"
                onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, time: value }))}
                type="time"
                value={draft.time}
              />
            ) : (
              <Field
                label="Duration"
                onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, durationMinutes: value }))}
                type="number"
                value={draft.durationMinutes}
              />
            )}
            <Field
              label="Location / Channel"
              onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, locationChannel: value }))}
              value={draft.locationChannel}
            />
            {mode === "log" ? (
              <SelectField
                label="Next Step"
                onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, movementStep: value as AdminMovementStep | "" }))}
                options={movementStepSelectOptions}
                value={draft.movementStep}
              />
            ) : null}
          </div>

          <TextArea
            label="Notes"
            onChange={(value) => setDraft((currentDraft) => ({ ...currentDraft, notes: value }))}
            rows={4}
            value={draft.notes}
          />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className={lightSecondaryButtonClass} onClick={onClose} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            Cancel
          </button>
          <button className={lightPrimaryButtonClass} onClick={() => onSave(draft)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
            {mode === "schedule" ? "Save Scheduled Meeting" : "Save Meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}

type TableWorkflowSection = "assessment" | "fruit" | "responses" | "review" | "summary";

const tableWorkflowSections: Array<{ label: string; value: TableWorkflowSection }> = [
  { label: "Summary", value: "summary" },
  { label: "Responses", value: "responses" },
  { label: "Review", value: "review" },
  { label: "Assessment", value: "assessment" },
  { label: "Fruit", value: "fruit" },
];

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
  const [activeSection, setActiveSection] = useState<TableWorkflowSection>("summary");
  const [editingFruit, setEditingFruit] = useState<AdminFruitItem | null>(null);
  const [isFruitModalOpen, setIsFruitModalOpen] = useState(false);

  useEffect(() => {
    setActiveSection("summary");
    setEditingFruit(null);
    setIsFruitModalOpen(false);
  }, [table?.id]);

  if (!table) {
    return (
      <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
        Select a meeting to view details.
      </div>
    );
  }

  const activeTable = table;
  const parsedTableNotes = parseMeetingNotes(activeTable.notes);
  const tablePeople = tableLinkedPeople(activeTable, fieldPeople);
  const peopleLabel = tablePeople.length > 0 ? participantNamesText(tablePeople) : "Not added";
  const linkedPeople = fieldPeople.filter((person) => activeTable.field_person_ids.includes(person.id));
  const activeReview = review ?? newTableReview(activeTable.workspace_id, activeTable.id);
  const reviewStarted = Boolean(
    activeReview.how_meeting_went?.trim()
      || activeReview.key_observations?.trim()
      || activeReview.follow_up_needed?.trim()
      || activeReview.movement_step,
  );
  const fruitStatusText = fruitItems.length === 0
    ? "Not created"
    : fruitItems.some((fruit) => fruit.status === "approved")
      ? "Approved"
      : fruitItems.some((fruit) => fruit.status === "draft")
        ? "Draft"
        : "Private";
  const summaryItems = [
    { label: "Meeting", value: meetingTypeLabel(parsedTableNotes.meta.meetingType ?? activeTable.table_type) },
    { label: "Date", value: formatProfileUpdatedDate(activeTable.table_date) },
    { label: "People", value: peopleLabel },
    { label: "Notes", value: parsedTableNotes.notes || "No notes added." },
    { label: "Responses", value: String(encounters.length) },
    { label: "Review", value: reviewStarted ? "Started" : "Not started" },
    { label: "Fruit", value: fruitStatusText },
  ];

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

  function toggleFruitOutcomeTag(fruit: AdminFruitItem, tag: AdminOutcomeTag) {
    const currentTags = new Set(fruit.outcome_tags);

    if (currentTags.has(tag)) {
      currentTags.delete(tag);
    } else {
      currentTags.add(tag);
    }

    onUpdateFruit(fruit.id, {
      outcome_tags: outcomeTagOptions.filter((option) => currentTags.has(option)),
    });
  }

  function openFruitCreator() {
    setActiveSection("fruit");
    setIsFruitModalOpen(true);
  }

  return (
    <aside className="self-start rounded-xl border border-[#e2ded5] bg-white p-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Selected Meeting
        </p>
        <h3 className="mt-2 text-xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
          {meetingTypeLabel(parsedTableNotes.meta.meetingType ?? table.table_type)}
        </h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {summaryItems.map((item) => (
          <div className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3" key={item.label}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {item.label}
            </p>
            <p className="mt-1 text-sm leading-5 text-[#111111]">
              {item.label === "Notes" ? truncateText(item.value, 96) : item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e2ded5] pt-4">
        <button className={lightSecondaryButtonClass} onClick={() => onAddEncounter(table)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          Add Encounter
        </button>
        <button className={lightSecondaryButtonClass} onClick={() => setActiveSection("review")} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          Complete Review
        </button>
        <button className={lightPrimaryButtonClass} onClick={openFruitCreator} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          Create Fruit Summary
        </button>
      </div>

      <div className="mt-4 border-t border-[#e2ded5] pt-4">
        <div aria-label="Meeting workflow" className="flex flex-wrap gap-2" role="tablist">
          {tableWorkflowSections.map((section) => {
            const selected = activeSection === section.value;

            return (
              <button
                aria-selected={selected}
                className={`rounded-md border px-3 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                  selected
                    ? "border-[#D4A63D] bg-[#fff8e8] text-[#8a5a00]"
                    : "border-[#e2ded5] bg-[#f8f6f1] text-[#6f6658] hover:border-[#c8952d]"
                }`}
                key={section.value}
                onClick={() => setActiveSection(section.value)}
                role="tab"
                style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                type="button"
              >
                {section.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {activeSection === "summary" ? (
            <div className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-4 text-sm leading-6 text-[#4b443b]">
              <p className="font-semibold text-[#111111]">
                Meeting workflow
              </p>
              <p className="mt-1">
                Log Meeting -&gt; Add Response -&gt; Review -&gt; Assess -&gt; Create Fruit.
              </p>
              <p className="mt-2 text-xs leading-5 text-[#7b746a]">
                Use the tabs above to open one step at a time.
              </p>
            </div>
          ) : null}

          {activeSection === "responses" ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111111]">
                    Responses
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#7b746a]">
                    Encounters are raw participant responses from this meeting.
                  </p>
                </div>
                <button className={lightSecondaryButtonClass} onClick={() => onAddEncounter(table)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                  + Add Encounter
                </button>
              </div>
              {encounters.length === 0 ? (
                <p className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3 text-sm text-[#7b746a]">
                  No responses logged yet.
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
                        {encounter.submitter_email?.trim() || submissionTypeLabel(encounter.submission_type)}
                      </p>
                    </div>
                    <EncounterStatusBadge status={encounter.status} />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[#4b443b]">
                    {truncateText(encounter.original_testimony || "No response text.", 120)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {activeSection === "review" ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#111111]">
                  Review
                </p>
                <p className="mt-1 text-xs leading-5 text-[#7b746a]">
                  Internal notes about this meeting. These stay in the Missionary Workspace.
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
              <SelectField
                label="Movement Step"
                onChange={(value) => updateReview({ movement_step: value ? value as AdminMovementStep : null })}
                options={movementStepSelectOptions}
                value={activeReview.movement_step ?? ""}
              />
              <TextArea
                label="Follow up needed"
                onChange={(value) => updateReview({ follow_up_needed: value })}
                rows={3}
                value={activeReview.follow_up_needed}
              />
              {linkedPeople.length > 0 ? (
                <div className="space-y-3 border-t border-[#e2ded5] pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      What did you learn about this person?
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#7b746a]">
                      Update missing Person fields only. These save to Your Field, not this Table.
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
            </div>
          ) : null}

          {activeSection === "assessment" ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#111111]">
                  Assessment
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
          ) : null}

          {activeSection === "fruit" ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#111111]">
                    Fruit
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#7b746a]">
                    Fruit is the approved public-safe outcome. Raw notes stay internal.
                  </p>
                </div>
                <button className={lightPrimaryButtonClass} onClick={() => setIsFruitModalOpen(true)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                  Create Fruit Summary
                </button>
              </div>
              <div className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Fruit Summary Status
                </p>
                <p className="mt-1 text-sm leading-5 text-[#111111]">
                  {fruitStatusText}
                </p>
              </div>
              {fruitItems.length === 0 ? (
                <p className="rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3 text-sm text-[#7b746a]">
                  No Fruit summary has been created for this Table yet.
                </p>
              ) : null}
              {fruitItems.map((fruit) => (
                <div className="space-y-3 rounded-lg border border-[#e2ded5] bg-[#f8f6f1] p-3" key={fruit.id}>
                  <div className="flex items-start justify-between gap-2">
                    <FruitStatusBadge status={fruit.status} />
                    <button className={lightSecondaryButtonClass} onClick={() => setEditingFruit(fruit)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                      Edit Fruit
                    </button>
                  </div>
                  <label className="block">
                    <span className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Public Summary
                    </span>
                    <textarea
                      className={`${lightInputClass} leading-6`}
                      defaultValue={fruit.summary}
                      onBlur={(event) => {
                        const nextSummary = event.currentTarget.value;

                        if (nextSummary !== fruit.summary) {
                          onUpdateFruit(fruit.id, { summary: nextSummary });
                        }
                      }}
                      rows={3}
                    />
                  </label>
                  <div>
                    <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Outcome Tags
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {outcomeTagOptions.map((tag) => {
                        const selected = fruit.outcome_tags.includes(tag);

                        return (
                          <button
                            className={`rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                              selected
                                ? "border-[#D4A63D] bg-[#fff8e8] text-[#8a5a00]"
                                : "border-[#e2ded5] bg-white text-[#6f6658] hover:border-[#c8952d]"
                            }`}
                            key={tag}
                            onClick={() => toggleFruitOutcomeTag(fruit, tag)}
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
                    onChange={(value) => onUpdateFruit(fruit.id, { status: value as AdminFruitStatus })}
                    options={fruitStatusOptions}
                    value={fruit.status}
                  />
                </div>
              ))}
            </div>
          ) : null}
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
            <SelectField
              label="Relationship Type"
              onChange={setRelationshipType}
              options={optionsWithCurrentValue(relationshipTypeOptions, relationshipType)}
              value={relationshipType}
            />
          ) : null}
          {missingEngagement ? (
            <SelectField
              label="Engagement Level"
              onChange={setEngagementLevel}
              options={optionsWithCurrentValue(engagementLevelOptions, engagementLevel)}
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
              Approved Fruit is the public-safe outcome layer. Raw Encounter text and internal notes stay in the Missionary Workspace.
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
            helperText="Internal Missionary Workspace notes. Not public and not shown in future Field summaries."
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
          <DataFlowLabels items={["RAW -> REVIEWED -> APPROVED", "Stored in Missionary Workspace", "Approved Fruit feeds Field"]} />
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
              Write only what can become approved Fruit. Internal notes stay inside the Missionary Workspace.
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
                helperText="Missionary Workspace only. Not synced to public Profile or future Field summaries."
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
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Approved outcomes
        </p>
        <DataFlowLabels items={["Draft", "Profile", "Field"]} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatPreview label="Approved" tone="light" value={String(approvedFruit.length)} />
        <StatPreview label="Draft" tone="light" value={String(fruitItems.filter((fruit) => fruit.status === "draft").length)} />
        <StatPreview label="Outcome Tags" tone="light" value={String(approvedFruit.reduce((total, fruit) => total + fruit.outcome_tags.length, 0))} />
      </div>

      <div className="rounded-xl border border-[#e2ded5] bg-white p-3.5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Outcome Counts
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {outcomeCounts.map((outcome) => (
            <span className="rounded-full border border-[#e2ded5] bg-[#f8f6f1] px-2.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#6f6658]" key={outcome.tag} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {outcome.tag}: {outcome.count}
            </span>
          ))}
        </div>
      </div>

      {fruitItems.length === 0 ? (
        <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
          No approved fruit
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {visibleFruit.map((fruit) => (
          <div className="rounded-xl border border-[#e2ded5] bg-white p-3.5" key={fruit.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm leading-6 text-[#111111]">
                  {fruit.summary || "Summary needed."}
                </p>
                <div className="mt-2 grid gap-1 text-xs leading-5 text-[#7b746a]">
                  <span>Person: {personNameById(fieldPeople, fruit.field_person_id)}</span>
                  <span>Table: {tableNameById(tables, fruit.table_id)}</span>
                  <span>Date: {fruit.testimony_date ? formatProfileUpdatedDate(fruit.testimony_date) : formatProfileUpdatedDate(fruit.created_at)}</span>
                </div>
              </div>
              <FruitStatusBadge status={fruit.status} />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {fruit.outcome_tags.length > 0 ? fruit.outcome_tags.map((tag) => (
                <span className="rounded-full border border-[#e2ded5] bg-[#f8f6f1] px-2.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#6f6658]" key={tag} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
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
          Light teaching framework storage for the Missionary Workspace now and future Table references later.
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
        Simple current focus notes for what this missionary workspace is carrying right now.
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

function FundraisingProgressControls({
  monthlyGoal,
  onAnnualGoalChange,
  support,
}: {
  monthlyGoal: number;
  onAnnualGoalChange: (value: number) => void;
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
          helperText="Confirmed through admin reconciliation or giving system sync."
          label="Monthly Committed"
          readOnly
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

function supportCommitmentStatusLabel(status: AdminSupportCommitmentStatus | string) {
  switch (status) {
    case "active":
      return "Active";
    case "cancelled":
      return "Cancelled";
    case "incomplete":
      return "Incomplete";
    case "needs_follow_up":
      return "Needs Follow Up";
    case "pending_giving_setup":
    default:
      return "Pending Giving Setup";
  }
}

function majorGiftInquiryStatusLabel(status: AdminMajorGiftInquiryStatus | string) {
  switch (status) {
    case "archived":
      return "Archived";
    case "closed":
      return "Closed";
    case "contacted":
      return "Contacted";
    case "needs_follow_up":
      return "Needs Follow Up";
    case "reviewed":
      return "Needs Follow Up";
    case "new":
    default:
      return "New";
  }
}

function getSupportCommitmentAmount(commitment: AdminSupportCommitment) {
  if (commitment.selected_amount === "Other") {
    return toNumber(commitment.other_amount);
  }

  const amount = Number((commitment.selected_amount ?? "").replace(/[^0-9.]/g, ""));

  return Number.isFinite(amount) ? amount : 0;
}

function supportCommitmentGiftTypeLabel(giftType: AdminSupportCommitment["gift_type"]) {
  return giftType === "monthly" ? "Monthly" : "One Time";
}

function donorDisplayName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unnamed donor";
}

function majorGiftTypesLabel(types: string[] | null) {
  return types?.length ? types.join(", ") : "Not specified";
}

function countSupportCommitments(commitments: readonly AdminSupportCommitment[], status: AdminSupportCommitmentStatus) {
  return commitments.filter((commitment) => commitment.status === status).length;
}

function activeSupporterCount(commitments: readonly AdminSupportCommitment[]) {
  return new Set(
    commitments
      .filter((commitment) => commitment.status === "active")
      .map((commitment) => commitment.email.toLowerCase().trim() || commitment.id),
  ).size;
}

function SupportMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#e2ded5] bg-white p-3.5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[#111111]">
        {value}
      </p>
    </div>
  );
}

function SupportOverview({
  commitments,
  monthlyGoal,
  onAnnualGoalChange,
  support,
}: {
  commitments: readonly AdminSupportCommitment[];
  monthlyGoal: number;
  onAnnualGoalChange: (value: number) => void;
  support: AdminSupportSettings;
}) {
  const monthlyCommitted = toNumber(support.monthly_committed);
  const progressPercentage = getSupportProgressPercentage(monthlyCommitted, monthlyGoal);
  const visualProgressPercentage = Math.min(Math.max(progressPercentage, 0), 100);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Support overview
        </p>
      </div>

      <div className="rounded-2xl border border-[#e2ded5] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Monthly Support Progress
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#111111]">
              {formatCurrency(monthlyCommitted)}
              <span className="text-base font-normal text-[#7b746a]"> / {formatCurrency(monthlyGoal)}</span>
            </p>
          </div>
          <p className="text-sm font-semibold text-[#111111]">
            {progressPercentage}% funded
          </p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e9e3d8]">
          <div
            className={`h-full rounded-full transition-all ${getSupportProgressFillClass(progressPercentage)}`}
            style={{ width: `${visualProgressPercentage}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SupportMetricCard label="Annual Goal" value={formatCurrency(support.annual_goal)} />
        <SupportMetricCard label="Monthly Goal" value={formatCurrency(monthlyGoal)} />
        <SupportMetricCard label="Monthly Committed" value={formatCurrency(monthlyCommitted)} />
        <SupportMetricCard label="Pending Giving Setup" value={String(countSupportCommitments(commitments, "pending_giving_setup"))} />
        <SupportMetricCard label="Active Supporters" value={String(activeSupporterCount(commitments))} />
        <SupportMetricCard label="Needs Follow Up" value={String(countSupportCommitments(commitments, "needs_follow_up"))} />
      </div>

      <div className="rounded-2xl border border-[#e2ded5] bg-[#f8f6f1] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Goal Settings
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <CurrencyField
            label="Annual Goal"
            onChange={onAnnualGoalChange}
            value={support.annual_goal}
          />
          <CurrencyField
            label="Monthly Goal"
            readOnly
            value={monthlyGoal}
          />
          <CurrencyField
            label="Monthly Committed"
            readOnly
            value={support.monthly_committed}
          />
        </div>
      </div>
    </div>
  );
}

function ShareTemplateCard({
  body,
  description,
  onCopy,
  title,
}: {
  body: string;
  description?: string;
  onCopy: (value: string, label: string) => void;
  title: string;
}) {
  const previewParts = body.split(/({{[^}]+}})/g);

  return (
    <article className="rounded-2xl border border-[#dcd6ca] bg-white p-3.5 shadow-[0_8px_22px_rgba(17,17,17,0.035)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold leading-tight text-[#111111]">{title}</h4>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[#6f6658]">{description}</p>
          ) : null}
        </div>
        <button
          className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#d7d2c8] bg-[#fbfaf7] px-2.5 text-[10px] uppercase tracking-[0.16em] text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]"
          onClick={() => onCopy(body, title)}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy
        </button>
      </div>
      <div className="mt-3 max-h-[180px] overflow-auto rounded-xl border border-[#ece7dd] bg-[#fbfaf7] p-3 text-[13px] leading-6 text-[#3f3932]">
        {previewParts.map((part, index) => (
          part.startsWith("{{") && part.endsWith("}}") ? (
            <span className="rounded-md border border-[#d4a63d]/35 bg-[#fff2c6] px-1.5 py-0.5 text-[#7a5a12]" key={`${part}-${index}`}>
              {part}
            </span>
          ) : (
            <span className="whitespace-pre-line" key={`${part}-${index}`}>{part}</span>
          )
        ))}
      </div>
    </article>
  );
}

function SupportToolkitSection({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[#dcd6ca] bg-[#fdfbf7] p-3.5 md:p-4">
      <div className="border-b border-[#e8e1d4] pb-2.5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {title}
        </p>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f6658]">{description}</p>
        ) : null}
      </div>
      <div className="mt-3">
        {children}
      </div>
    </section>
  );
}

function SupportShareTools({
  annualGoal,
  flyerLink,
  missionStatement,
  missionaryName,
  onCopy,
  onSupportFieldChange,
  profileLink,
  support,
  supportLink,
}: {
  annualGoal: number;
  flyerLink: string;
  missionStatement: string;
  missionaryName: string;
  onCopy: (value: string, label: string) => void;
  onSupportFieldChange: (field: keyof AdminSupportSettings, value: boolean | number | string) => void;
  profileLink: string;
  support: AdminSupportSettings;
  supportLink: string;
}) {
  const monthlyGoal = calculateMonthlyGoal(annualGoal);
  const textTemplate = `Hey {{FirstName}}, we are raising support as USA Missionaries to reach the lost, make disciples, and multiply across America. Would you prayerfully consider partnering with us monthly? You can learn more or support here: ${supportLink}`;
  const emailTemplate = `Subject: Would you prayerfully consider partnering with ${missionaryName}?\n\nHi {{FirstName}},\n\nWe are serving with USA Missionaries and raising monthly support so we can keep saying yes to the mission God has put in front of us.\n\n${missionStatement}\n\nWould you prayerfully consider becoming a monthly support partner? You can learn more about our mission and give securely here:\n${supportLink}\n\nThank you for praying with us and considering partnership.\n\n${missionaryName}`;
  const socialTemplate = `${missionaryName} is raising support with USA Missionaries to reach the lost, make disciples, and multiply across America.\n\n${missionStatement}\n\nWould you prayerfully consider partnering monthly or sharing this with someone who may want to stand with the mission?\n${supportLink}`;
  const videoPrompt = `Record a 60-90 second video:\n1. Introduce yourself: ${missionaryName}.\n2. Share the mission in one sentence: ${missionStatement}\n3. Explain the current support goal: ${formatCurrency(annualGoal)} annually.\n4. Invite viewers to pray, share, or partner monthly.\n5. Close with the support link: ${supportLink}`;

  return (
    <div className="mx-auto max-w-[1120px] space-y-3.5">
      <div className="rounded-2xl border border-[#dcd6ca] bg-white p-3.5 shadow-[0_10px_28px_rgba(17,17,17,0.045)] md:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Support Toolkit
            </p>
            <h3 className="mt-1 text-xl font-semibold text-[#111111]">{missionaryName}</h3>
          </div>
        </div>
      </div>

      <SupportToolkitSection title="Public Links">
        <div className="grid gap-2 md:grid-cols-3">
          {[
            { label: "Public Profile Link", value: profileLink },
            { label: "Support Link", value: supportLink },
            { label: "Flyer Link", value: flyerLink },
          ].map((link) => (
            <div className="rounded-xl border border-[#e2ded5] bg-white p-2.5" key={link.label}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8174]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>{link.label}</p>
              <p className="mt-1 line-clamp-2 break-all text-xs leading-5 text-[#3f3932]">{link.value}</p>
              <button className="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[#8a5a00] hover:text-[#111111]" onClick={() => onCopy(link.value, link.label)} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                <Copy className="h-3 w-3" aria-hidden="true" />
                Copy
              </button>
            </div>
          ))}
        </div>
      </SupportToolkitSection>

      <SupportToolkitSection title="Flyer Builder">
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="grid gap-3">
            <Field
              label="Flyer Headline"
              onChange={(value) => onSupportFieldChange("flyer_headline", value)}
              value={support.flyer_headline ?? ""}
            />
            <Field
              label="Prayer / Support Ask"
              onChange={(value) => onSupportFieldChange("flyer_prayer_ask", value)}
              value={support.flyer_prayer_ask ?? ""}
            />
            <TextArea
              label="Short Support Appeal"
              onChange={(value) => onSupportFieldChange("flyer_support_appeal", value)}
              rows={3}
              value={support.flyer_support_appeal ?? ""}
            />
            <TextArea
              label="Optional Note"
              onChange={(value) => onSupportFieldChange("flyer_note", value)}
              rows={3}
              value={support.flyer_note ?? ""}
            />
          </div>
          <div className="rounded-2xl border border-[#dcd6ca] bg-white p-3.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Generated Asset
            </p>
            <h4 className="mt-1 text-lg font-semibold text-[#111111]">One-page flyer</h4>
            <div className="mt-3 grid gap-2">
              <a className={`${lightPrimaryButtonClass} min-h-10 gap-2 px-4`} href={`${flyerLink}?version=color`} rel="noopener noreferrer" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} target="_blank">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Preview Full Color
              </a>
              <a className={`${lightSecondaryButtonClass} min-h-10 gap-2 bg-[#111111] text-stone-100`} href={`${flyerLink}?version=print&print=1`} rel="noopener noreferrer" style={{ fontFamily: font.rajdhani, fontWeight: 700 }} target="_blank">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Print-Friendly PDF
              </a>
              <button className={lightTertiaryButtonClass} onClick={() => onCopy(flyerLink, "Flyer Link")} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy Flyer Link
              </button>
              <button className={lightTertiaryButtonClass} onClick={() => onCopy(supportLink, "Support Link")} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Copy Support Link
              </button>
            </div>
          </div>
        </div>
      </SupportToolkitSection>

      <SupportToolkitSection title="Message Templates">
        <div className="grid gap-3 lg:grid-cols-2">
          <ShareTemplateCard body={textTemplate} onCopy={onCopy} title="Text Message Template" />
          <ShareTemplateCard body={emailTemplate} onCopy={onCopy} title="Email Template" />
          <ShareTemplateCard body={socialTemplate} onCopy={onCopy} title="Facebook / Instagram Caption" />
          <ShareTemplateCard body={videoPrompt} onCopy={onCopy} title="YouTube / Video Script Prompt" />
        </div>
      </SupportToolkitSection>

      <SupportToolkitSection title="Support Tracking">
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-[#e2ded5] bg-white p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8174]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Annual Goal</p>
            <p className="mt-1 text-xl font-semibold text-[#111111]">{formatCurrency(annualGoal)}</p>
          </div>
          <div className="rounded-xl border border-[#e2ded5] bg-white p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8174]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Monthly Goal</p>
            <p className="mt-1 text-xl font-semibold text-[#111111]">{formatCurrency(monthlyGoal)}</p>
          </div>
          <div className="rounded-xl border border-[#e2ded5] bg-white p-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8174]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Monthly Committed</p>
            <p className="mt-1 text-xl font-semibold text-[#111111]">{formatCurrency(support.monthly_committed ?? 0)}</p>
          </div>
        </div>
      </SupportToolkitSection>
    </div>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#d7d2c8] bg-[#f8f6f1] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-[#4b443b]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e2ded5] bg-[#fbfaf7] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#8a8174]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-1 break-words text-sm leading-6 text-[#111111]">
        {value || "Not specified"}
      </div>
    </div>
  );
}

function DetailModalShell({
  children,
  eyebrow,
  onClose,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-3 py-4 backdrop-blur-sm transition-opacity sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90vh] w-full max-w-[720px] overflow-y-auto rounded-2xl border border-[#dcd6ca] bg-white p-4 text-[#111111] shadow-[0_24px_90px_rgba(0,0,0,0.35)] transition-transform sm:p-5">
        <div className="flex items-start justify-between gap-4 border-b border-[#e2ded5] pb-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[#9a6b12]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {eyebrow}
            </p>
            <h3 className="mt-1 text-xl font-semibold leading-tight text-[#111111]">
              {title}
            </h3>
          </div>
          <button
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d7d2c8] bg-[#fbfaf7] text-sm font-semibold text-[#4b443b] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]"
            onClick={onClose}
            type="button"
            aria-label="Close details"
          >
            ×
          </button>
        </div>
        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function SupportCommitmentDetailModal({
  commitment,
  onClose,
}: {
  commitment: AdminSupportCommitment;
  onClose: () => void;
}) {
  const donorName = donorDisplayName(commitment.first_name, commitment.last_name);
  const submittedDate = formatProfileUpdatedDate(commitment.submitted_at ?? commitment.created_at);
  const completedDate = commitment.completed_at ? formatProfileUpdatedDate(commitment.completed_at) : "Not completed";

  return (
    <DetailModalShell eyebrow="Support Commitment" onClose={onClose} title={donorName}>
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Email" value={commitment.email} />
        <DetailField label="Phone" value={commitment.phone} />
        <DetailField label="Amount" value={formatCurrency(getSupportCommitmentAmount(commitment))} />
        <DetailField label="Type" value={supportCommitmentGiftTypeLabel(commitment.gift_type)} />
        <DetailField label="Status" value={<StatusPill>{supportCommitmentStatusLabel(commitment.status)}</StatusPill>} />
        <DetailField label="Submitted" value={submittedDate} />
        <DetailField label="Allocation" value={commitment.allocation_preference} />
        <DetailField label="Completed" value={completedDate} />
      </div>

      <div className="mt-3 grid gap-3">
        <DetailField label="Support Notes" value={commitment.message} />
        <DetailField label="Admin Notes" value={commitment.admin_notes} />
        <DetailField
          label="Giving Destination"
          value={commitment.redirect_giving_url ? (
            <a className="text-[#8a5a00] underline-offset-4 hover:underline" href={commitment.redirect_giving_url} rel="noopener noreferrer" target="_blank">
              {commitment.redirect_giving_url}
            </a>
          ) : "Not recorded"}
        />
      </div>
    </DetailModalShell>
  );
}

function MajorGiftInquiryDetailModal({
  inquiry,
  onClose,
}: {
  inquiry: AdminMajorGiftInquiry;
  onClose: () => void;
}) {
  const donorName = donorDisplayName(inquiry.first_name, inquiry.last_name);

  return (
    <DetailModalShell eyebrow="Major Gift Inquiry" onClose={onClose} title={donorName}>
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailField label="Email" value={inquiry.email} />
        <DetailField label="Phone" value={inquiry.phone} />
        <DetailField label="Gift Type" value={majorGiftTypesLabel(inquiry.donation_types)} />
        <DetailField label="Estimated Range" value={inquiry.projected_amount_range} />
        <DetailField label="Status" value={<StatusPill>{majorGiftInquiryStatusLabel(inquiry.status)}</StatusPill>} />
        <DetailField label="Submitted" value={formatProfileUpdatedDate(inquiry.created_at)} />
        <DetailField label="Intended For" value={inquiry.intended_for} />
        <DetailField label="Best Time" value={inquiry.best_time_to_contact} />
      </div>

      <div className="mt-3 grid gap-3">
        <DetailField label="Message" value={inquiry.message} />
        <DetailField label="Household" value={inquiry.household_name || inquiry.profile_slug} />
      </div>
    </DetailModalShell>
  );
}

function SupportCommitmentsManager({
  commitments,
  majorGiftInquiries,
}: {
  commitments: readonly AdminSupportCommitment[];
  majorGiftInquiries: readonly AdminMajorGiftInquiry[];
}) {
  const [selectedCommitment, setSelectedCommitment] = useState<AdminSupportCommitment | null>(null);
  const [selectedMajorGiftInquiry, setSelectedMajorGiftInquiry] = useState<AdminMajorGiftInquiry | null>(null);
  const sortedCommitments = [...commitments].sort((a, b) => {
    const aTime = new Date(a.submitted_at ?? a.created_at).getTime();
    const bTime = new Date(b.submitted_at ?? b.created_at).getTime();

    return bTime - aTime;
  });
  const sortedMajorGiftInquiries = [...majorGiftInquiries].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();

    return bTime - aTime;
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Support Interest & Commitments
          </p>
        </div>

      {sortedCommitments.length > 0 ? (
        <div className="rounded-xl border border-[#e2ded5] bg-white">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_110px_92px_minmax(124px,0.8fr)_70px] gap-3 border-b border-[#e2ded5] bg-[#fbfaf7] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#6f6658] md:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            <span>Donor</span>
            <span>Amount</span>
            <span>Type</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-[#e2ded5]">
              {sortedCommitments.map((commitment) => (
                <div className="grid gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#fbfaf7] md:grid-cols-[minmax(0,1.4fr)_110px_92px_minmax(124px,0.8fr)_70px] md:items-center" key={commitment.id}>
                  <button
                    className="min-w-0 text-left text-base font-semibold text-[#111111] underline-offset-4 hover:text-[#8a5a00] hover:underline"
                    onClick={() => setSelectedCommitment(commitment)}
                    type="button"
                  >
                    {donorDisplayName(commitment.first_name, commitment.last_name)}
                  </button>
                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Amount</span>
                    <span className="font-semibold text-[#111111]">{formatCurrency(getSupportCommitmentAmount(commitment))}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Type</span>
                    <span className="text-sm text-[#4b443b]">{supportCommitmentGiftTypeLabel(commitment.gift_type)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 md:block">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Status</span>
                    <StatusPill>{supportCommitmentStatusLabel(commitment.status)}</StatusPill>
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="inline-flex min-h-7 items-center justify-center rounded-md border border-[#d7d2c8] bg-white px-2.5 text-[10px] uppercase tracking-[0.14em] text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]"
                      onClick={() => setSelectedCommitment(commitment)}
                      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                      type="button"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
          No support interest or commitment records yet.
        </div>
      )}
      </div>

      <div className="space-y-2.5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Major Gift Follow-Up
          </p>
        </div>

        {sortedMajorGiftInquiries.length > 0 ? (
          <div className="rounded-xl border border-[#e2ded5] bg-white">
            <div className="hidden grid-cols-[minmax(0,1.35fr)_minmax(0,1.2fr)_130px_minmax(120px,0.8fr)_70px] gap-3 border-b border-[#e2ded5] bg-[#fbfaf7] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#6f6658] md:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              <span>Donor</span>
              <span>Gift Type</span>
              <span>Estimated Range</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-[#e2ded5]">
                {sortedMajorGiftInquiries.map((inquiry) => (
                  <div className="grid gap-2.5 px-3 py-2.5 transition-colors hover:bg-[#fbfaf7] md:grid-cols-[minmax(0,1.35fr)_minmax(0,1.2fr)_130px_minmax(120px,0.8fr)_70px] md:items-center" key={inquiry.id}>
                    <button
                      className="min-w-0 text-left text-base font-semibold text-[#111111] underline-offset-4 hover:text-[#8a5a00] hover:underline"
                      onClick={() => setSelectedMajorGiftInquiry(inquiry)}
                      type="button"
                    >
                      {donorDisplayName(inquiry.first_name, inquiry.last_name)}
                    </button>
                    <div className="flex items-center justify-between gap-3 md:block">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Gift Type</span>
                      <span className="text-sm text-[#4b443b]">{majorGiftTypesLabel(inquiry.donation_types)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:block">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Range</span>
                      <span className="font-semibold text-[#111111]">{inquiry.projected_amount_range || "Not specified"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 md:block">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Status</span>
                      <StatusPill>{majorGiftInquiryStatusLabel(inquiry.status)}</StatusPill>
                    </div>
                    <div className="flex justify-end">
                      <button
                        className="inline-flex min-h-7 items-center justify-center rounded-md border border-[#d7d2c8] bg-white px-2.5 text-[10px] uppercase tracking-[0.14em] text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]"
                        onClick={() => setSelectedMajorGiftInquiry(inquiry)}
                        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                        type="button"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
            No major gift inquiries yet.
          </div>
        )}
      </div>

      {selectedCommitment ? (
        <SupportCommitmentDetailModal
          commitment={selectedCommitment}
          onClose={() => setSelectedCommitment(null)}
        />
      ) : null}

      {selectedMajorGiftInquiry ? (
        <MajorGiftInquiryDetailModal
          inquiry={selectedMajorGiftInquiry}
          onClose={() => setSelectedMajorGiftInquiry(null)}
        />
      ) : null}
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
      <div className="flex justify-end">
        <button
          className="inline-flex min-h-9 items-center justify-center rounded-md bg-[#D4A63D] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#F5B942]"
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
        <p className="rounded-xl border border-[#e2ded5] bg-white p-4 text-sm leading-6 text-[#7b746a]">
          No team members yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e2ded5] bg-white">
          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_92px_72px_70px] gap-3 border-b border-[#e2ded5] bg-[#fbfaf7] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#6f6658] md:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            <span>Name</span>
            <span>Role</span>
            <span>Location</span>
            <span>Status</span>
            <span>Public</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-[#e2ded5]">
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
          </div>
        </div>
      )}

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
    <div className={`grid gap-3 px-3 py-2.5 transition-colors hover:bg-[#fbfaf7] md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_92px_72px_70px] md:items-center ${isEditing ? "bg-[#fbfaf7]" : ""}`}>
      <div className="min-w-0">
        <span className="block truncate text-base font-semibold text-[#111111]">
          {member.display_name || "Name required"}
        </span>
        {member.public_number ? (
          <span className="mt-0.5 block text-[9px] uppercase tracking-[0.14em] text-[#8a8174]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            #{normalizePublicRosterNumber(member.public_number)}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Role</span>
        <span className="text-sm text-[#4b443b]">{member.role_title || "Not set"}</span>
      </div>
      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Location</span>
        <span className="text-sm text-[#4b443b]">{locationLabel || "Not set"}</span>
      </div>
      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Status</span>
        <TeamStatusBadge isActive={isActive} />
      </div>
      <div className="flex items-center justify-between gap-3 md:block">
        <span className="text-[10px] uppercase tracking-[0.16em] text-[#8a8174] md:hidden" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Public</span>
        <label className="inline-flex cursor-pointer items-center text-xs text-[#4b443b]">
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
        </label>
      </div>
      <div className="flex justify-end">
        <button
          className="inline-flex min-h-8 items-center justify-center rounded-md border border-[#d7d2c8] bg-white px-3 text-[10px] uppercase tracking-[0.16em] text-[#111111] transition-colors hover:border-[#c8952d] hover:text-[#8a5a00]"
          onClick={onEdit}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          Edit
        </button>
      </div>
    </div>
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

function PrayerRequestsWorkspace({
  fieldPeople,
  onCreate,
  onUpdateStatus,
  prayerRequests,
}: {
  fieldPeople: readonly AdminFieldPerson[];
  onCreate: (draft: PrayerRequestDraft) => void;
  onUpdateStatus: (prayerRequestId: string, status: AdminPrayerRequest["status"]) => void;
  prayerRequests: readonly AdminPrayerRequest[];
}) {
  const [draft, setDraft] = useState<PrayerRequestDraft>({
    category: "",
    fieldPersonId: "",
    request: "",
    title: "",
    urgency: "normal",
    visibility: "private",
  });
  const canSave = draft.title.trim() && draft.request.trim();

  function updateDraft(patch: Partial<PrayerRequestDraft>) {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }));
  }

  function saveDraft() {
    if (!canSave) {
      return;
    }

    onCreate(draft);
    setDraft({
      category: "",
      fieldPersonId: "",
      request: "",
      title: "",
      urgency: "normal",
      visibility: "private",
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#e2ded5] bg-white p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Private Prayer
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Title" onChange={(value) => updateDraft({ title: value })} value={draft.title} />
          <SelectField
            label="Person"
            onChange={(value) => updateDraft({ fieldPersonId: value })}
            options={[
              { label: "Missionary / household request", value: "" },
              ...fieldPeople.map((person) => ({ label: person.name, value: person.id })),
            ]}
            value={draft.fieldPersonId}
          />
          <Field label="Category" onChange={(value) => updateDraft({ category: value })} value={draft.category} />
          <SelectField label="Urgency" onChange={(value) => updateDraft({ urgency: value as AdminPrayerRequest["urgency"] })} options={prayerUrgencyOptions} value={draft.urgency} />
        </div>
        <TextArea
          helperText="Private by default. Public publishing can be added later after explicit review."
          label="Request"
          onChange={(value) => updateDraft({ request: value })}
          rows={4}
          value={draft.request}
        />
        <button className={`${lightPrimaryButtonClass} mt-4`} disabled={!canSave} onClick={saveDraft} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
          Save Prayer Request
        </button>
      </div>

      <div className="rounded-xl border border-[#e2ded5] bg-white">
        {prayerRequests.length === 0 ? (
          <p className="p-4 text-sm leading-6 text-[#7b746a]">No workspace prayer requests yet.</p>
        ) : (
          prayerRequests.map((request) => (
            <div className="border-b border-[#e2ded5] p-4 last:border-b-0" key={request.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-[#111111]">{request.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#4b443b]">{request.request}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    <span>{request.field_person_id ? personNameById(fieldPeople, request.field_person_id) : "Household"}</span>
                    <span>{request.urgency}</span>
                    <span>{request.visibility}</span>
                  </div>
                </div>
                <SelectField
                  label="Status"
                  onChange={(value) => onUpdateStatus(request.id, value as AdminPrayerRequest["status"])}
                  options={prayerRequestStatusOptions}
                  value={request.status}
                />
              </div>
            </div>
          ))
        )}
      </div>
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
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = isEditorTab(requestedTab) ? requestedTab : "overview";
  const initialPrimaryNav = getPrimaryNavForTab(normalizeEditorTab(initialTab));
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState<EditorTab>(normalizeEditorTab(initialTab));
  const [activePrimaryNav, setActivePrimaryNav] = useState<PrimaryNavKey>(initialPrimaryNav);
  const [activeSubnavId, setActiveSubnavId] = useState<string>(getSubnavIdForTab(normalizeEditorTab(initialTab), initialPrimaryNav));
  const [supportSubsection, setSupportSubsection] = useState<SupportSubsection>("overview");
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
  const [cutoutSettings, setCutoutSettings] = useState<CutoutGenerationSettings>(defaultCutoutGenerationSettings);
  const [cutoutGenerationState, setCutoutGenerationState] = useState<CutoutGenerationState>({
    status: "idle",
  });
  const [storyRefinementState, setStoryRefinementState] = useState<StoryRefinementState>({
    status: "idle",
  });
  const [focusedEncounterId, setFocusedEncounterId] = useState<string | null>(null);
  const [targetHouseholdError, setTargetHouseholdError] = useState("");
  const [targetHouseholdLoadState, setTargetHouseholdLoadState] = useState<TargetHouseholdLoadState>("idle");
  const [targetHouseholds, setTargetHouseholds] = useState<TargetHouseholdOption[]>([]);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [lastSavedProfiles, setLastSavedProfiles] = useState(initialProfiles);

  useEffect(() => {
    setActiveTab((currentTab) => normalizeEditorTab(currentTab));
  }, []);

  useEffect(() => {
    if (isEditorTab(requestedTab)) {
      changeEditorTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    setProfiles(initialProfiles);
    setLastSavedProfiles(initialProfiles);

    if (selectedId && !initialProfiles.some((profile) => profile.id === selectedId)) {
      setSelectedId("");
    }
  }, [initialProfiles, selectedId]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId),
    [profiles, selectedId],
  );
  const selectedLastSavedProfile = useMemo(
    () => lastSavedProfiles.find((profile) => profile.id === selectedId),
    [lastSavedProfiles, selectedId],
  );
  const hasUnsavedChanges = Boolean(
    selectedProfile
      && selectedLastSavedProfile
      && JSON.stringify(selectedProfile) !== JSON.stringify(selectedLastSavedProfile),
  );

  useEffect(() => {
    if (!selectedProfile || activeTab !== "team" || !getFeatureValue(selectedProfile, "show_team")) {
      return;
    }

    const currentMembers = selectedProfile.teamMembers ?? [];

    if (currentMembers.length > 0) {
      return;
    }

    const ownerName = nextHouseholdTeamMemberName(selectedProfile);

    updateSelected({
      ...selectedProfile,
      teamMembers: [
        newTeamMember(selectedProfile.id, nextPublicRosterNumber(profiles), {
          display_name: ownerName,
          role_title: teamMemberRoleTitle(selectedProfile),
          sort_order: nextTeamSortOrder(currentMembers),
        }),
      ],
    });
  }, [activeTab, profiles, selectedProfile]);

  useEffect(() => {
    setIsCutoutModalOpen(false);
    setCutoutSettings(defaultCutoutGenerationSettings);
    setCutoutGenerationState({ status: "idle" });
    setStoryRefinementState({ status: "idle" });
    setFocusedEncounterId(null);
  }, [selectedId]);

  const selectedProfileSupportMode = selectedProfile ? getSupportMode(selectedProfile) : "household";
  const selectedGeneratedHeroImageUrl = selectedProfile ? getGeneratedHeroImageUrl(selectedProfile.hero_image_url) : "";
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

  async function saveFieldPerson(draft: FieldPersonDraft, personId?: string): Promise<PersonSaveResult> {
    if (!selectedProfile) {
      return { error: "Select a missionary workspace before saving a person.", ok: false };
    }

    const method = personId ? "PATCH" : "POST";
    const payload = {
      church: draft.church,
      email: draft.email,
      engagement_level: draft.engagementLevel,
      household_id: selectedProfile.id,
      householdId: selectedProfile.id,
      id: personId,
      name: draft.name,
      notes: draft.notes,
      phone: draft.phone,
      relationship_type: draft.relationshipType,
      status: draft.status,
      workspace_id: selectedProfile.id,
      workspaceId: selectedProfile.id,
    };

    console.info(`[People] Calling ${method} /api/admin/missionary-profiles/people`);

    let response: Response;

    try {
      response = await fetch("/api/admin/missionary-profiles/people", {
        body: JSON.stringify(payload),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save person.";

      console.error("Save Person request failed:", error);
      setStatus({
        text: errorMessage,
        tone: "error",
      });
      return { error: errorMessage, ok: false };
    }

    const result = await response.json().catch(() => ({})) as {
      error?: string;
      person?: AdminFieldPerson;
    };
    const responseError = typeof result.error === "string"
      ? result.error
      : response.statusText || "Unable to save person.";
    const errorMessage = responseError.includes("missionary_field_people") && responseError.toLowerCase().includes("schema cache")
      ? "People table is missing. Apply the missionary_field_people migration."
      : responseError;

    if (!response.ok || !result.person) {
      console.error("Save Person failed:", errorMessage);
      setStatus({
        text: errorMessage,
        tone: "error",
      });
      return { error: errorMessage, ok: false };
    }

    updateSelected({
      ...selectedProfile,
      fieldPeople: personId
        ? (selectedProfile.fieldPeople ?? []).map((person) => (person.id === result.person?.id ? result.person : person))
        : [result.person, ...(selectedProfile.fieldPeople ?? [])],
    });
    setStatus({
      text: personId ? "Person updated." : "Person added to Your Field",
      tone: "success",
    });

    return { ok: true };
  }

  async function importPeopleCsv(rows: PeopleCsvImportRow[]) {
    if (!selectedProfile) {
      throw new Error("Select a missionary workspace before importing people.");
    }

    let response: Response;

    try {
      response = await fetch("/api/admin/missionary-profiles/people/import", {
        body: JSON.stringify({
          householdId: selectedProfile.id,
          rows,
          workspaceId: selectedProfile.id,
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to import CSV.";

      console.error("People CSV import request failed:", error);
      setStatus({
        text: errorMessage,
        tone: "error",
      });
      throw new Error(errorMessage);
    }

    const result = await response.json().catch(() => ({})) as Partial<PeopleCsvImportResult> & {
      error?: string;
    };

    if (!response.ok || typeof result.importedCount !== "number" || !Array.isArray(result.people)) {
      const errorMessage = typeof result.error === "string" ? result.error : "Unable to import CSV.";

      setStatus({
        text: errorMessage,
        tone: "error",
      });
      throw new Error(errorMessage);
    }

    const importResult = result as PeopleCsvImportResult;

    updateSelected({
      ...selectedProfile,
      fieldPeople: [...importResult.people, ...(selectedProfile.fieldPeople ?? [])],
    });
    setStatus({
      text: `Imported ${importResult.importedCount} people`,
      tone: "success",
    });

    return importResult;
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
    setActivePrimaryNav("dashboard");
    setActiveSubnavId("");
    resetTransientEditorState();
  }

  function closeProfile() {
    setSelectedId("");
    setActiveTab("overview");
    setActivePrimaryNav("dashboard");
    setActiveSubnavId("");
    resetTransientEditorState();
  }

  async function copySelectedProfileLink() {
    if (!selectedProfile || typeof window === "undefined") {
      return;
    }

    const profileUrl = getPublicMissionaryProfileUrl(selectedProfile.slug);

    copyTextToClipboard(profileUrl, "Public profile link");
  }

  async function copyTextToClipboard(value: string, label: string) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(value);
      setStatus({
        text: `${label} copied.`,
        tone: "success",
      });
    } catch {
      setStatus({
        text: value,
        tone: "success",
      });
    }
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

  function changeEditorTab(tab: RawEditorTab, primaryNav?: PrimaryNavKey, subnavId?: string) {
    const nextTab = normalizeEditorTab(tab);
    const nextPrimaryNav = primaryNav ?? getPrimaryNavForTab(nextTab, activePrimaryNav);

    setActiveTab(nextTab);
    setActivePrimaryNav(nextPrimaryNav);
    setActiveSubnavId(subnavId ?? getSubnavIdForTab(nextTab, nextPrimaryNav));

    if (nextTab === "support") {
      setSupportSubsection("overview");
    }

    if (nextTab === "prayer") {
      setPrayerSubsection("visibility");
    }
  }

  function updateFeatureField(field: PublishingFeatureField, value: boolean) {
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
      workspace_id: selectedProfile.id,
    };

    updateSelected({
      ...selectedProfile,
      tables: [
        table,
        ...(selectedProfile.tables ?? []),
      ],
    });

    setStatus({
      text: "Meeting added. Click Save Changes to persist this workspace.",
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
      text: "Meeting updated. Click Save Changes to persist this workspace.",
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
      text: "Encounter added as RAW. Click Save Changes to persist this workspace.",
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
      text: "Fruit summary added. Click Save Changes to persist this workspace.",
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
      text: "Fruit updated. Click Save Changes to persist this workspace.",
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
      text: "Meeting logged. Click Save Changes to persist this workspace.",
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
      text: "Meeting updated. Click Save Changes to persist this workspace.",
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
      text: "Library item added. Click Save Changes to persist this workspace.",
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
      text: "Library item updated. Click Save Changes to persist this workspace.",
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

  async function savePrayerRequest(draft: PrayerRequestDraft) {
    if (!selectedProfile) {
      return;
    }

    const response = await fetch("/api/admin/missionary-profiles/prayer-requests", {
      body: JSON.stringify({
        category: draft.category,
        fieldPersonId: draft.fieldPersonId,
        householdId: selectedProfile.id,
        request: draft.request,
        title: draft.title,
        urgency: draft.urgency,
        visibility: draft.visibility,
        workspaceId: selectedProfile.id,
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as {
      error?: string;
      prayerRequest?: AdminPrayerRequest;
    };

    if (!response.ok || !result.prayerRequest) {
      setStatus({
        text: typeof result.error === "string" ? result.error : "Unable to save prayer request.",
        tone: "error",
      });
      return;
    }

    updateSelected({
      ...selectedProfile,
      activePrayerRequestCount: (selectedProfile.activePrayerRequestCount ?? 0) + 1,
      prayerRequests: [result.prayerRequest, ...(selectedProfile.prayerRequests ?? [])],
    });
    setStatus({
      text: "Prayer request saved privately in this workspace.",
      tone: "success",
    });
  }

  async function updatePrayerRequestStatus(prayerRequestId: string, nextStatus: AdminPrayerRequest["status"]) {
    if (!selectedProfile) {
      return;
    }

    const previousRequests = selectedProfile.prayerRequests ?? [];
    const nextRequests = previousRequests.map((request) => (
      request.id === prayerRequestId
        ? { ...request, status: nextStatus, updated_at: new Date().toISOString() }
        : request
    ));

    updateSelected({
      ...selectedProfile,
      activePrayerRequestCount: nextRequests.filter((request) => request.status === "open").length,
      prayerRequests: nextRequests,
    });

    const response = await fetch("/api/admin/missionary-profiles/prayer-requests", {
      body: JSON.stringify({
        householdId: selectedProfile.id,
        id: prayerRequestId,
        status: nextStatus,
        workspaceId: selectedProfile.id,
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
    const result = await response.json().catch(() => ({})) as {
      error?: string;
      prayerRequest?: AdminPrayerRequest;
    };

    if (!response.ok || !result.prayerRequest) {
      updateSelected({
        ...selectedProfile,
        activePrayerRequestCount: previousRequests.filter((request) => request.status === "open").length,
        prayerRequests: previousRequests,
      });
      setStatus({
        text: typeof result.error === "string" ? result.error : "Unable to update prayer request.",
        tone: "error",
      });
      return;
    }

    updateSelected({
      ...selectedProfile,
      activePrayerRequestCount: (selectedProfile.prayerRequests ?? []).filter((request) => (
        request.id === prayerRequestId ? result.prayerRequest?.status === "open" : request.status === "open"
      )).length,
      prayerRequests: (selectedProfile.prayerRequests ?? []).map((request) => (
        request.id === result.prayerRequest?.id ? result.prayerRequest : request
      )),
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
        workspaceId: selectedProfile.id,
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

    const currentMembers = selectedProfile.teamMembers ?? [];
    const suggestedPublicNumber = nextPublicRosterNumber(profiles);
    const suggestedName = nextHouseholdTeamMemberName(selectedProfile);

    updateSelected({
      ...selectedProfile,
      teamMembers: [
        ...currentMembers,
        newTeamMember(selectedProfile.id, suggestedPublicNumber, {
          display_name: suggestedName,
          role_title: teamMemberRoleTitle(selectedProfile),
          sort_order: nextTeamSortOrder(currentMembers),
        }),
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
          message: "Upload a primary profile photo before generating an optional hero image.",
          status: "error",
        },
      }));
      return;
    }

    setCutoutSettings(defaultCutoutGenerationSettings);
    setCutoutGenerationState({ status: "idle" });
    setIsCutoutModalOpen(true);
  }

  async function requestMissionaryHeroImage() {
    if (!selectedProfile?.profile_image_url?.trim()) {
      setCutoutGenerationState({
        message: "Upload a primary profile photo before requesting an optional hero image.",
        status: "error",
      });
      return;
    }

    setCutoutGenerationState({
      message: "Sending request...",
      status: "generating",
    });

    try {
      const requestedOptions = [
        cutoutSettings.addHats ? "matching military-style hats that match the approved example photo exactly: dark tactical/military-style look, similar placement and scale, same USAM patch treatment, no colorful hats, and no unrelated logos" : "",
        cutoutSettings.addFacePaint ? "subtle field-style face paint that matches the approved example style: dark charcoal/gray tones only, no exaggerated war paint, no bright colors, no heavy facial distortion, and likeness preserved" : "",
      ].filter(Boolean).join(", ") || "none";
      const response = await fetch("/api/product-feedback", {
        body: JSON.stringify({
          category: "design_feedback",
          messageText: [
            `USAM hero image request for ${selectedProfile.display_name} (${selectedProfile.slug}).`,
            `Household ID: ${selectedProfile.id}.`,
            `Source photo: ${selectedProfile.profile_image_url}.`,
            `Optional styling requested: ${requestedOptions}.`,
            "Admin processing prompt: preserve source-photo identity, face structure, age, hair, skin, hands, body structure, pose, and composition; apply only approved USAM clothing/background treatment after human review.",
            "Optional styling requirements: any hats or face paint must use the approved example photo as the visual standard, not a new creative interpretation.",
            "Hat requirements: same dark tactical/military-style look as the reference, similar placement and scale, same USAM patch treatment, no colorful hats, and no unrelated logos.",
            "Face paint requirements: subtle field-style camo only, dark charcoal/gray tones consistent with the reference style, no exaggerated war paint, no bright colors, no heavy distortion of facial features, and likeness must be preserved.",
            "Automated whole-image generation is paused; please manually review/create an approved USAM hero image and upload it in Missionary Workspace > Publishing > Profile Photos > Advanced Settings.",
            "No revisedPrompt/outputPrompt metadata was produced because this request did not run automated generation.",
          ].join("\n"),
          pagePath: `/admin/missionary-profiles?tab=media&profile=${selectedProfile.slug}`,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "We could not submit the request. Please try again.");
      }

      setCutoutGenerationState({
        message: "Request sent to USA Missionaries Admin. Your uploaded photo remains live until an approved hero image is uploaded and selected.",
        status: "success",
      });
    } catch (error) {
      setCutoutGenerationState({
        message: error instanceof Error ? error.message : "We could not submit the request. Please try again.",
        status: "error",
      });
    }
  }

  async function refineStoryWithAI() {
    if (!selectedProfile) {
      return;
    }

    const originalStory = selectedProfile.original_story?.trim();

    if (!originalStory) {
      setStoryRefinementState({
        message: "Add an Internal Story before generating a public draft.",
        status: "error",
      });
      return;
    }

    setStoryRefinementState({
      message: "Generating public story draft...",
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
        message: "Refined story generated. Review it, then click Save Changes.",
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
      setActivePrimaryNav("publishing");
      setActiveSubnavId("profile");
      return;
    }

    setSaving(true);
    setStatus(null);
    const supportPayload = selectedProfile.support ?? emptySupport(selectedProfile.id);
    const supportWithCalculatedMonthlyGoal = {
      ...supportPayload,
      monthly_goal: calculateMonthlyGoal(supportPayload.annual_goal),
    };

    let response: Response;

    try {
      response = await fetch("/api/admin/missionary-profiles/update", {
        body: JSON.stringify({
          activeTab,
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
            public_story: selectedProfile.public_story,
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
            story: selectedProfile.public_story,
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
          workspaceId: selectedProfile.id,
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unable to save missionary workspace.";

      console.error("Missionary workspace save request failed:", error);
      setStatus({
        text: errorMessage,
        tone: "error",
      });
      setSaving(false);
      return;
    }

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
    setLastSavedProfiles((currentProfiles) => currentProfiles.map((profile) => (
      profile.id === selectedProfile.id ? selectedProfile : profile
    )));
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
  const publicProfileLink = getPublicMissionaryProfileUrl(selectedProfile.slug);
  const publicSupportLink = `${publicProfileLink}#support`;
  const publicFlyerLink = `${publicProfileLink}/flyer`;
  const selectedSupportModeLabel = supportModeOptions.find((option) => option.value === supportMode)?.label ?? supportModeOptions[0].label;
  const targetHouseholdOptions = targetHouseholdLoadState === "loading"
    ? [{ label: "Loading households...", value: "" }]
    : targetHouseholds.length > 0
      ? [
        { label: "Select a household", value: "" },
        ...targetHouseholds.map((household) => ({ label: household.display_name, value: household.id })),
      ]
      : [{ label: "No other missionary households available.", value: "" }];
  const targetHouseholdSelectDisabled = targetHouseholdLoadState !== "success" || targetHouseholds.length === 0;
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
  const hasStoryVersionColumns = selectedProfile.schemaStatus?.hasStoryVersionColumns !== false;
  const hasPublishingFeatureColumns = selectedProfile.schemaStatus?.hasPublishingFeatureColumns !== false;
  const storyPublishingAvailable = hasStoryVersionColumns && hasPublishingFeatureColumns;
  const hasInternalIntakeStory = hasTextContent(selectedProfile.original_story);
  const storyStatus = !storyPublishingAvailable
    ? {
      label: "Migration Required",
      message: "Story publishing unavailable until story schema migration is applied.",
      status: "migration" as const,
    }
    : !getFeatureValue(selectedProfile, "show_story")
      ? {
        label: "Hidden",
        message: "The Our Story section is disabled.",
        status: "hidden" as const,
      }
      : hasRenderableStory(selectedProfile)
        ? {
          label: "Published",
          message: "Public Story is ready and can render on the public profile.",
          status: "showing" as const,
        }
        : hasInternalIntakeStory
          ? {
            label: "Public Story Needed",
            message: "Internal Story has been received. Create a Public Story before this section can render publicly.",
            status: "waiting" as const,
          }
        : {
          label: "Missing Content",
          message: "Add an Internal Story, then create the Public Story for publishing.",
          status: "missing" as const,
        };
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
  const publishingEnabled = publishingEnabledByDefault;
  const visiblePrimaryNavGroups = primaryNavGroups.filter((group) => publishingEnabled || group.key !== "publishing");
  const activePrimaryGroup = visiblePrimaryNavGroups.find((group) => group.key === activePrimaryNav) ?? visiblePrimaryNavGroups[0] ?? primaryNavGroups[0];
  return (
    <div className="space-y-6">
      <section className="bg-stone-950/35 p-5 pb-24 md:p-7 md:pb-24">
        <div className="border-b border-stone-800/80 pb-7">
          <div className="mb-5">
            <button
              className="inline-flex items-center text-[11px] uppercase tracking-[0.2em] text-stone-400 transition-colors hover:text-[#F5B942]"
              onClick={closeProfile}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              ← All Missionary Workspaces
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)] lg:items-center">
            <div>
              <h2 className="text-4xl font-bold uppercase leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
                {selectedProfile.display_name}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                aria-label="Open mobile Field App for this workspace"
                className="flex min-h-20 rounded-xl border border-[#D4A63D] bg-[#D4A63D] p-3.5 text-black shadow-[0_10px_24px_rgba(212,166,61,0.12)] transition-colors hover:bg-[#e7b742]"
                href={`/dos/app?workspace=${encodeURIComponent(selectedProfile.slug)}`}
                title="Open mobile Field App for this workspace"
              >
                <div className="flex items-start gap-2.5">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Open DOS</p>
                    <p className="mt-1 text-xs leading-5 text-black/70">Field app</p>
                  </div>
                </div>
              </Link>
              <Link
                className="flex min-h-20 rounded-xl border border-[#D4A63D]/45 bg-[#101010] p-3.5 text-stone-100 transition-colors hover:border-[#D4A63D]/70 hover:text-[#F5B942]"
                href={`/missionaries/${selectedProfile.slug}`}
                target="_blank"
              >
                <div className="flex items-start gap-2.5">
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A63D]" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Public Profile</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">Donor page</p>
                  </div>
                </div>
              </Link>
              <button
                className="flex min-h-20 rounded-xl border border-stone-700 bg-stone-950/70 p-3.5 text-left text-stone-100 transition-colors hover:border-stone-500 hover:text-[#F5B942]"
                onClick={copySelectedProfileLink}
                type="button"
              >
                <div className="flex items-start gap-2.5">
                  <Copy className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A63D]" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>Copy Link</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">Share page</p>
                  </div>
                </div>
              </button>
            </div>
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

        <div className="mt-8 border-b border-stone-800/80 pb-5">
          <div className="grid gap-3 md:grid-cols-4" role="tablist" aria-label="Workspace primary sections">
            {visiblePrimaryNavGroups.map((group) => {
              const selected = activePrimaryNav === group.key;

              return (
                <button
                  aria-selected={selected}
                  className={`h-full min-h-20 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-[#D4A63D] bg-[#D4A63D] text-black"
                      : "border-stone-800 bg-[#0b0b0b] text-stone-200 hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100"
                  }`}
                  key={group.key}
                  onClick={() => {
                    const defaultTab = getDefaultTabForPrimaryNav(group.key);

                    setActivePrimaryNav(group.key);
                    changeEditorTab(defaultTab.value, group.key, defaultTab.id);
                  }}
                  role="tab"
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                  type="button"
                >
                  <span className="block text-sm uppercase tracking-[0.13em]">
                    {group.label}
                  </span>
                  <span className={`mt-1 block text-[11px] normal-case leading-5 tracking-normal ${selected ? "text-black/65" : "text-stone-500"}`} style={{ fontFamily: "inherit", fontWeight: 500 }}>
                    {group.helper}
                  </span>
                </button>
              );
            })}
          </div>

          {activePrimaryGroup.tabs.length > 0 ? (
          <div className="mt-6 overflow-x-auto border-t border-stone-800/70 pt-4">
            <div className="flex min-w-max gap-2" role="tablist" aria-label={`${activePrimaryGroup.label} submenu`}>
              {activePrimaryGroup.tabs.map((tab) => {
                const tabId = tab.id ?? tab.value;
                const selected = activeTab === tab.value && activeSubnavId === tabId && activePrimaryNav === activePrimaryGroup.key;

                return (
                  <button
                    aria-selected={selected}
                    className={`rounded-lg border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] transition-colors ${
                      selected
                        ? "border-[#D4A63D] bg-[#D4A63D] text-black"
                        : "border-stone-700 bg-stone-900/70 text-stone-200 hover:border-[#D4A63D] hover:text-[#F5B942]"
                    }`}
                    key={`${activePrimaryGroup.key}-${tabId}`}
                    onClick={() => changeEditorTab(tab.value, activePrimaryGroup.key, tabId)}
                    role="tab"
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          ) : null}
        </div>

        <div className="mt-10">
          {activeTab === "overview" ? (
          <SectionIntro
            description="Metrics, recent activity, pending actions, and operational visibility for this workspace."
            title="Dashboard"
          >
            <WorkspaceOverview profile={selectedProfile} />
          </SectionIntro>
          ) : null}

          {activeTab === "people" ? (
          <SectionIntro
            description="Internal contacts"
            title="People"
          >
            <PeopleManager
              items={selectedProfile.fieldPeople ?? []}
              onImport={importPeopleCsv}
              onSave={saveFieldPerson}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "meetings" ? (
          <SectionIntro
            description="Meetings & follow-up"
            title="Meetings"
          >
            <MeetingsManager
              connections={selectedProfile.connectionLogs ?? []}
              encounters={selectedProfile.encounterSubmissions ?? []}
              fieldPeople={selectedProfile.fieldPeople ?? []}
              fruitItems={selectedProfile.fruitItems ?? []}
              onAddConnection={addConnectionLog}
              onAddEncounter={addEncounterFromTable}
              onCreateFruit={createFruitSummary}
              onCreateTable={createMissionaryTable}
              onUpdateConnection={updateConnectionLog}
              onUpdateFruit={updateFruitItem}
              onUpdatePersonProfile={updatePersonFromReview}
              onUpdateReview={updateTableReview}
              onUpdateTable={updateMissionaryTable}
              tableReviews={selectedProfile.tableReviews ?? []}
              tables={selectedProfile.tables ?? []}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "reviews" ? (
          <SectionIntro
            description="Post-meeting review"
            title="Reviews"
          >
            <ReviewsManager
              fieldPeople={selectedProfile.fieldPeople ?? []}
              fruitItems={selectedProfile.fruitItems ?? []}
              onCreateFruit={createFruitSummary}
              tableReviews={selectedProfile.tableReviews ?? []}
              tables={selectedProfile.tables ?? []}
            />
          </SectionIntro>
          ) : null}

          {activeTab === "features" ? (
          <SectionIntro
            title="Profile Features"
          >
            <FeatureVisibilityTable
              rows={[
                {
                  checked: getFeatureValue(selectedProfile, "show_household"),
                  label: "Profile Visibility",
                  onChange: (value) => updateFeatureField("show_household", value),
                  publicStatus: profileVisibilityStatus.status,
                  statusMessage: profileVisibilityStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_team"),
                  label: "Team",
                  onChange: (value) => updateFeatureField("show_team", value),
                  publicStatus: teamStatus.status,
                  statusMessage: teamStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_photos"),
                  label: "Profile Photos",
                  onChange: (value) => updateFeatureField("show_photos", value),
                  publicStatus: mediaStatus.status,
                  statusMessage: mediaStatus.message,
                },
                {
                  checked: storyPublishingAvailable && getFeatureValue(selectedProfile, "show_story"),
                  disabled: !storyPublishingAvailable,
                  label: "Our Story",
                  onChange: (value) => updateFeatureField("show_story", value),
                  publicStatus: storyStatus.status,
                  statusMessage: storyStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_fruit"),
                  label: "Fruit",
                  onChange: (value) => updateFeatureField("show_fruit", value),
                  publicStatus: fruitStatus.status,
                  statusMessage: fruitStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_support"),
                  label: "Support",
                  onChange: (value) => updateSupportMode(value ? "household" : "hidden"),
                  publicStatus: supportStatus.status,
                  statusMessage: supportStatus.message,
                },
                {
                  checked: getFeatureValue(selectedProfile, "show_prayer"),
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
                Set up the public hero and the core details visitors see first.
              </p>

              <div className="mt-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Main Profile Fields
                </p>
                <div className="mt-3 grid gap-x-4 gap-y-6 md:grid-cols-2">
                  <ProfileField
                    helperText="Shown publicly."
                    label="Display Name"
                    onChange={(value) => updateHouseholdField("display_name", value)}
                    value={selectedProfile.display_name}
                  />
                  <ProfileField
                    helperText="Used for public URL."
                    label="Slug"
                    onChange={(value) => updateHouseholdField("slug", value)}
                    value={selectedProfile.slug}
                  />
                  <ProfileTextArea
                    helperText="Shown in hero section."
                    label="Short Mission"
                    onChange={(value) => updateHouseholdField("short_mission", value)}
                    rows={3}
                    value={selectedProfile.short_mission}
                  />
                  <ProfileSelectField
                    helperText="Shown publicly when location visibility allows it."
                    label="Primary State"
                    onChange={updatePrimaryState}
                    options={stateOptions}
                    value={getProfilePrimaryState(selectedProfile)}
                  />
                  <ProfileSelectField
                    helperText="Controls public serving line."
                    label="Serving Scope"
                    onChange={updateServingScope}
                    options={servingScopeOptions}
                    value={getProfileServingScope(selectedProfile)}
                  />
                  <div className="rounded-xl border border-[#e2ded5] bg-white p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Public Serving Line Preview
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#111111]">
                      {getServingLabelPreview(selectedProfile)}
                    </p>
                    <p className={lightHelperClass}>
                      Controls public serving line.
                    </p>
                  </div>
                </div>
              </div>

              <details className="mt-6 rounded-xl border border-[#e2ded5] bg-white p-4">
                <summary className="cursor-pointer text-[11px] uppercase tracking-[0.2em] text-[#111111]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Advanced Profile Settings
                </summary>
                <div className="mt-5 grid gap-x-4 gap-y-6 md:grid-cols-2">
                  <ProfileSelectField
                    helperText="Internal/admin classification unless used for regional serving views."
                    label="Region"
                    onChange={updateRegion}
                    options={regionOptions}
                    value={getProfileRegion(selectedProfile)}
                  />
                  <ProfileSelectField
                    helperText="Used for leadership/profile categorization."
                    label="Role Type"
                    onChange={updateRoleType}
                    options={roleTypeOptions}
                    value={getProfileRoleType(selectedProfile)}
                  />
                  <ProfileSelectField
                    helperText="Controls whether actual location is shown publicly."
                    label="Location Visibility"
                    onChange={updateLocationVisibility}
                    options={locationVisibilityOptions}
                    value={getProfileLocationVisibility(selectedProfile)}
                  />
                  <ProfileField
                    helperText="Optional override for the public serving line."
                    label="Custom Serving Label"
                    onChange={(value) => updateHouseholdField("custom_serving_label", value)}
                    value={selectedProfile.custom_serving_label}
                  />
                </div>
              </details>
            </div>
          </div>
          ) : null}

          {activeTab === "media" ? (
          <SectionIntro
            description="Profile images"
            title="Profile Photos"
          >
            <div className="space-y-3.5">
              <section className="rounded-2xl border border-[#e2ded5] bg-white p-3.5 md:p-4">
                <ImageUploadField
                  helperText="Public profile image"
                  label="Primary Profile Photo"
                  onChange={(value) => updateHouseholdField("profile_image_url", value)}
                  onUpload={uploadImage}
                  showManualUrlFallback={false}
                  slot="directory"
                  uploadState={uploadStates.directory}
                  value={selectedProfile.profile_image_url}
                />
              </section>

              <section className="rounded-2xl border border-[#e2ded5] bg-white p-4 md:p-5">
                <div>
                  <p className={lightLabelClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Optional USAM Hero Image
                  </p>
                  <p className="mt-1.5 text-sm leading-5 text-[#4b443b]">
                    Optional hero image
                  </p>
                </div>

                <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                  <div className="overflow-hidden rounded-[18px] bg-[#f8f6f1]">
                    {selectedGeneratedHeroImageUrl ? (
                      <div className="flex min-h-[240px] items-center justify-center p-3 md:min-h-[320px]">
                        <img
                          alt="Current USAM hero image preview"
                          className="max-h-full w-full object-contain"
                          src={selectedGeneratedHeroImageUrl}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center md:min-h-[320px]">
                        <div className="mb-4 h-12 w-12 rounded-full border border-[#d7d2c8] bg-white shadow-sm">
                          <div className="mx-auto mt-4 h-3.5 w-3.5 rotate-45 bg-[#D4A63D]" />
                        </div>
                        <p className="text-base font-semibold text-[#111111]">
                          No hero image
                        </p>
                        <p className="mt-2 max-w-sm text-xs leading-5 text-[#7b746a]">
                          Using uploaded photo
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <button
                        className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-[#c8952d] bg-[#D4A63D] px-5 py-3 text-center text-[11px] uppercase tracking-[0.2em] text-[#111111] shadow-[0_12px_26px_rgba(212,166,61,0.14)] transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:border-[#d7d2c8] disabled:bg-[#e2ded5] disabled:text-[#9a9488]"
                        disabled={!selectedProfile.profile_image_url?.trim()}
                        onClick={openCutoutModal}
                        style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                        type="button"
                      >
                        Request USAM Hero Image
                      </button>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Public Profile Hero
                      </p>
                      <div className="mt-2.5 space-y-2">
                        <label className="flex items-center gap-3 rounded-xl border border-[#e2ded5] bg-[#f8f6f1] p-2.5 text-sm leading-5 text-[#4b443b]">
                          <input
                            checked={!selectedGeneratedHeroImageUrl}
                            className="h-4 w-4 accent-[#D4A63D]"
                            name="profile_public_image_source"
                            onChange={() => updateHouseholdField("hero_image_url", "")}
                            type="radio"
                          />
                          <span className="font-semibold text-[#111111]">Use Uploaded Photo</span>
                        </label>
                        <label className="flex items-center gap-3 rounded-xl border border-[#e2ded5] bg-[#f8f6f1] p-2.5 text-sm leading-5 text-[#4b443b]">
                          <input
                            checked={Boolean(selectedGeneratedHeroImageUrl)}
                            className="h-4 w-4 accent-[#D4A63D]"
                            disabled={!selectedGeneratedHeroImageUrl}
                            name="profile_public_image_source"
                            onChange={() => undefined}
                            type="radio"
                          />
                          <span className="font-semibold text-[#111111]">Use USAM Hero Image</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <details className="rounded-2xl border border-[#e2ded5] bg-white">
                <summary className="cursor-pointer px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Advanced Settings
                </summary>
                <div className="border-t border-[#e2ded5] p-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Field
                      helperText="Manual fallback for the uploaded primary photo URL. Normal uploads fill this automatically."
                      label="Primary Photo URL"
                      onChange={(value) => updateHouseholdField("profile_image_url", value)}
                      value={selectedProfile.profile_image_url}
                    />
                    <Field
                      helperText="Manual fallback for the optional USAM hero image URL. Generated images fill this automatically."
                      label="USAM Hero Image URL"
                      onChange={(value) => updateHouseholdField("hero_image_url", value)}
                      value={selectedProfile.hero_image_url}
                    />
                  </div>
                  <div className="mt-4">
                    <ImageUploadField
                      helperText="Internal fallback for manually uploading an already-prepared USAM hero image."
                      label="Manual USAM Hero Upload"
                      onChange={(value) => updateHouseholdField("hero_image_url", value)}
                      onUpload={uploadImage}
                      slot="hero"
                      uploadState={uploadStates.hero}
                      value={selectedProfile.hero_image_url}
                    />
                  </div>
                </div>
              </details>
            </div>
            {isCutoutModalOpen && selectedProfile.profile_image_url?.trim() ? (
              <MissionaryCutoutGenerationModal
                generationState={cutoutGenerationState}
                householdName={selectedProfile.display_name}
                onClose={() => setIsCutoutModalOpen(false)}
                onRequest={requestMissionaryHeroImage}
                onSettingsChange={setCutoutSettings}
                settings={cutoutSettings}
                sourceImageUrl={selectedProfile.profile_image_url}
              />
            ) : null}
          </SectionIntro>
          ) : null}

          {activeTab === "team" ? (
          <SectionIntro
            description="Public team members"
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
            description="Profile story"
            title="Story"
          >
            <div className="flex flex-wrap gap-2 rounded-xl border border-[#e2ded5] bg-white px-4 py-3">
              {["Internal story is private", "Public story can publish"].map((item) => (
                <span
                  className="rounded-full border border-[#e2ded5] bg-[#f8f6f1] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[#6f6658]"
                  key={item}
                  style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#e2ded5] bg-white p-4 md:p-5">
                <div>
                  <h3 className="text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
                    Internal Story
                  </h3>
                </div>
                <div className="mt-3">
                  <TextArea
                    hideLabel
                    label="Internal Story"
                    onChange={(value) => updateHouseholdField("original_story", value)}
                    rows={14}
                    value={selectedProfile.original_story}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#e2ded5] bg-white p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
                      Public Story
                    </h3>
                  </div>
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#D4A63D] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:bg-[#d7d2c8] disabled:text-[#8a8174]"
                    disabled={storyRefinementState.status === "refining"}
                    onClick={refineStoryWithAI}
                    style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
                    type="button"
                  >
                    {storyRefinementState.status === "refining" ? "Generating" : "Generate Draft"}
                  </button>
                </div>

                {storyRefinementState.message ? (
                  <p className={`mt-3 rounded-xl border p-3 text-sm leading-6 ${
                    storyRefinementState.status === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-[#e2ded5] bg-[#f8f6f1] text-[#6f6658]"
                  }`}>
                    {storyRefinementState.message}
                  </p>
                ) : null}

                <div className="mt-3">
                  <TextArea
                    hideLabel
                    label="Public Story"
                    onChange={updateRefinedStory}
                    rows={14}
                    value={selectedProfile.public_story}
                  />
                </div>
              </div>
            </div>
          </SectionIntro>
          ) : null}

          {activeTab === "fruit" ? (
          <SectionIntro
            description="Approved outcomes"
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
            title="Support"
          >
            <div className="space-y-4">
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

              {supportSubsection === "overview" ? (
                <SupportOverview
                  commitments={selectedProfile.supportCommitments ?? []}
                  monthlyGoal={calculatedMonthlyGoal}
                  onAnnualGoalChange={updateAnnualGoal}
                  support={support}
                />
              ) : null}

              {supportSubsection === "giving-page" ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Giving Page
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-3.5">
                      <TextArea
                        label="Support Explanation"
                        onChange={(value) => updateHouseholdField("support_explanation", value)}
                        rows={5}
                        value={selectedProfile.support_explanation}
                      />
                      <div className="grid gap-4 md:grid-cols-3">
                        <Field label="Monthly Button" onChange={(value) => updateSupportField("monthly_button_label", value)} value={support.monthly_button_label ?? "Support Monthly"} />
                        <Field label="One-Time Button" onChange={(value) => updateSupportField("one_time_button_label", value)} value={support.one_time_button_label ?? "Give One Time"} />
                        <Field label="Major Gift Button" onChange={(value) => updateSupportField("major_gift_button_label", value)} value={support.major_gift_button_label ?? "Contact About Major Gift"} />
                      </div>
                      <TextArea
                        label="Major Gift Public Description"
                        onChange={(value) => updateSupportField("major_gift_public_description", value)}
                        rows={3}
                        value={support.major_gift_public_description}
                      />
                    </div>

                    <div className="rounded-2xl border border-[#e2ded5] bg-white p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Public Preview
                      </p>
                      <h3 className="mt-2 text-2xl font-bold uppercase leading-tight text-[#111111]" style={{ fontFamily: font.oswald }}>
                        Support This Mission
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[#4b443b]">
                        {selectedProfile.support_explanation || "Stand with this missionary household as they reach, disciple, and serve across the mission field."}
                      </p>
                      <div className="mt-4 space-y-2">
                        <button className={lightPrimaryButtonClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                          {support.monthly_button_label || "Support Monthly"}
                        </button>
                        <button className={lightSecondaryButtonClass} style={{ fontFamily: font.rajdhani, fontWeight: 700 }} type="button">
                          {support.one_time_button_label || "Give One Time"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {supportSubsection === "share-tools" ? (
                <SupportShareTools
                  annualGoal={toNumber(support.annual_goal)}
                  flyerLink={publicFlyerLink}
                  missionStatement={selectedProfile.short_mission || "We are serving with USA Missionaries to reach the lost, make disciples, and multiply across America."}
                  missionaryName={selectedProfile.display_name}
                  onCopy={copyTextToClipboard}
                  onSupportFieldChange={updateSupportField}
                  profileLink={publicProfileLink}
                  support={support}
                  supportLink={publicSupportLink}
                />
              ) : null}

              {supportSubsection === "commitments" ? (
                <SupportCommitmentsManager
                  commitments={selectedProfile.supportCommitments ?? []}
                  majorGiftInquiries={selectedProfile.majorGiftInquiries ?? []}
                />
              ) : null}

              {supportSubsection === "settings" ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#e2ded5] bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Giving Routing
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <StatusPill>Giving System: Active</StatusPill>
                        <StatusPill>Destination: {givingRoutingDestination}</StatusPill>
                        <StatusPill>Mode: {selectedSupportModeLabel}</StatusPill>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#e2ded5] bg-white p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Major Gift Settings
                    </p>
                    <label className="mt-3 flex items-center gap-3 text-sm font-semibold text-[#4b443b]">
                      <input
                        checked={support.enable_major_gift_inquiry !== false}
                        className="h-4 w-4 accent-[#D4A63D]"
                        onChange={(event) => updateSupportField("enable_major_gift_inquiry", event.target.checked)}
                        type="checkbox"
                      />
                      Enable Major Gift Inquiry
                    </label>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field
                        label="Notify Email"
                        onChange={(value) => updateSupportField("major_gift_notify_email", value)}
                        value={support.major_gift_notify_email ?? "ryan@usamissionaries.org"}
                      />
                      <TextArea
                        label="Optional Public Description"
                        onChange={(value) => updateSupportField("major_gift_public_description", value)}
                        rows={3}
                        value={support.major_gift_public_description}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#e2ded5] bg-white p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      Advanced Settings
                    </p>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <SelectField
                        label="Support Mode"
                        onChange={(value) => updateSupportMode(value as AdminSupportMode)}
                        options={supportModeOptions.map((option) => ({ label: option.label, value: option.value }))}
                        value={supportMode}
                      />

                      {supportMode === "household_nomination" ? (
                        <div>
                          <SelectField
                            disabled={targetHouseholdSelectDisabled}
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
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </SectionIntro>
          ) : null}

          {activeTab === "prayer" ? (
          <SectionIntro
            description="Prayer settings"
            title="Prayer"
          >
            <div className="space-y-4">
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

              {prayerSubsection === "requests" ? (
                <PrayerRequestsWorkspace
                  fieldPeople={selectedProfile.fieldPeople ?? []}
                  onCreate={savePrayerRequest}
                  onUpdateStatus={updatePrayerRequestStatus}
                  prayerRequests={selectedProfile.prayerRequests ?? []}
                />
              ) : null}

              {prayerSubsection === "visibility" ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    Visibility
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="flex items-center justify-between gap-4 rounded-xl border border-[#e2ded5] bg-white p-3 text-sm text-[#111111]">
                      <span className="min-w-0">
                        <span className="block text-[11px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                          Show Prayer Section
                        </span>
                      </span>
                      <input
                        checked={selectedProfile.show_prayer !== false}
                        className="h-4 w-4 accent-[#D4A63D]"
                        onChange={(event) => updateFeatureField("show_prayer", event.target.checked)}
                        type="checkbox"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-4 rounded-xl border border-[#e2ded5] bg-white p-3 text-sm text-[#111111]">
                      <span className="min-w-0">
                        <span className="block text-[11px] uppercase tracking-[0.2em] text-[#6f6658]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                          Join Prayer Team
                        </span>
                      </span>
                      <input
                        checked={selectedProfile.enable_prayer_team !== false}
                        className="h-4 w-4 accent-[#D4A63D]"
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
                      label="Button Label"
                      onChange={(value) => updateHouseholdField("prayer_cta_label", value)}
                      value={selectedProfile.prayer_cta_label}
                    />
                    <SelectField
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
                      label="Prayer Section Headline"
                      onChange={(value) => updateHouseholdField("prayer_section_headline", value)}
                      value={selectedProfile.prayer_section_headline}
                    />
                    <TextArea
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
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
      {hasUnsavedChanges ? (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-[720px] flex-col gap-3 rounded-2xl border border-[#D4A63D]/40 bg-[#0f0f0f]/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-5 text-stone-200">
            You have unsaved changes.
          </p>
          <div className="flex gap-2">
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md border border-stone-700 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942] md:flex-none"
              onClick={() => {
                if (selectedLastSavedProfile) {
                  updateSelected(selectedLastSavedProfile);
                }
              }}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              Discard
            </button>
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-[#D4A63D] px-5 py-2 text-[10px] uppercase tracking-[0.2em] text-black transition-all hover:bg-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60 md:flex-none"
              disabled={saving}
              onClick={saveSelectedProfile}
              style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
              type="button"
            >
              {saving ? "Saving" : "Save Changes"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
