"use client";

import Link from "next/link";
import { ArrowLeft, Bell, BookOpen, Briefcase, Cake, CalendarDays, Camera, CheckCircle2, ChevronRight, Church, Clock, Droplet, ExternalLink, Flame, Gift, GitBranch, Heart, HeartHandshake, HelpCircle, LogOut, Mail, MapPin, Megaphone, MessageCircle, Mic, Moon, Palette, Pencil, Phone, RefreshCw, Search, Send, Settings, Shield, Sparkles, StickyNote, User, UserPlus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ComponentProps, FormEvent, MouseEvent, ReactNode } from "react";
import {
  buildMeetingRecommendations,
  dosConversationFlowDefinitions,
  getConversationFlowDefinition,
  relationshipWithJesusTemperature,
  type DosConversationAnswer,
  type DosConversationFlowKey,
  type DosConversationQuestion,
  type DosConversationResponses,
  type DosConversationResponseValue,
  type DosRecommendedResource,
} from "@/src/lib/dos/meeting-engine";
import { formatDosMeetingSecondary, formatDosParticipantList, formatDosParticipantTitle, resolveDosMeetingParticipantNames } from "@/src/lib/dos/meeting-display";
import type { DosRelationshipScore } from "@/src/lib/dos/circle-scoring";
import type { DosAppCalendarConnection, DosAppData, DosAppExternalCalendarEvent, DosAppFruit, DosAppFruitEvent, DosAppLeaderReflection, DosAppMeeting, DosAppMeetingType, DosAppOrganizationConnection, DosAppParticipantReview, DosAppParticipantTestimony, DosAppPerson, DosAppPrayerLog, DosAppRelationshipReminder, DosAppReviewStatus, DosAppWorkspace } from "@/src/lib/dos/missionary-app";
import { selectPersonDetailFruitSummary, type PersonDetailFruitSummary } from "@/src/lib/dos/person-fruit-summary";
import { personNotesToPlainText, splitPersonNotesValue } from "@/src/lib/dos/person-notes";
import { dosPrayerResourceAttribution, dosPrayerResourceCategories, dosPrayerResources, getDosPrayerResourceBySlug, type DosPrayerResource, type DosPrayerResourceCategory } from "@/src/lib/dos/prayer-resources";
import {
  dosSendableResourceCategories,
  getDosResourcesByCategory,
  getSendableDosResources,
  type DosResource,
  type DosResourceIcon,
} from "@/src/lib/dos/resource-catalog";
import {
  defaultRelationshipModel,
  discipleshipStageLabel,
  relationshipContextLabel,
  relationshipContextOptions,
  relationshipModelFromRelationshipType,
  normalizeRelationshipType,
  relationshipScoreFromEngagementLevel,
  relationshipScoreLabel,
  relationshipTypeFromModel,
  relationshipTypeOptions,
  type DosRelationshipModel,
  type RelationshipScoreValue,
  type RelationshipTypeValue,
} from "@/src/lib/dos/relationship-model";
import { dosFollowUpGuideResources, dosTableTeachingResources } from "@/src/lib/dos/guide-resources";

const font = { oswald: "'Inter Tight', 'Inter', sans-serif", rajdhani: "'Inter', sans-serif" };
const dosRootShellClassName = "mx-auto min-h-[100dvh] w-full bg-white text-[#0F172A] md:bg-[#F8FBFF] md:px-0 md:py-0";
const dosPhoneShellClassName = "relative isolate mx-auto flex h-[100dvh] w-full max-w-[430px] overflow-hidden bg-white shadow-[0_18px_60px_rgba(42,37,29,0.08)] md:h-[100dvh] md:max-h-none md:max-w-none md:rounded-none md:border-0 md:bg-[#F8FBFF] md:shadow-none";
const dosDawnShellClassName = "bg-[radial-gradient(circle_at_78%_8%,rgba(219,234,254,0.92),transparent_34%),radial-gradient(circle_at_86%_92%,rgba(254,215,170,0.54),transparent_36%),radial-gradient(circle_at_48%_62%,rgba(221,214,254,0.48),transparent_42%),linear-gradient(135deg,#F8FBFF_0%,#F6F8FF_48%,#FFF4EC_100%)]";

type ActiveTab = "home" | "meetings" | "more" | "people";
type MoreAppView = "apps" | "fruit" | "in_season" | "library" | "missionary_profile" | "organizations" | "prayer" | "prayer_team" | "reports" | "settings" | "stewardship" | "support_team" | "table_flow";
type IconName = "add" | "apps" | "arrow" | "bell" | "calendar" | "fruit" | "home" | "library" | "log" | "meetings" | "more" | "people" | "prayer" | "search" | "send" | "settings" | "upload";

const mobileTabs: ReadonlyArray<{ icon: IconName; label: string; value: ActiveTab }> = [
  { icon: "home", label: "Home", value: "home" },
  { icon: "meetings", label: "Table", value: "meetings" },
  { icon: "apps", label: "Apps", value: "more" },
];


type DesktopNavItem =
  | { icon: IconName; label: string; type: "moreApp"; value: MoreAppView }
  | { icon: IconName; label: string; type: "settings" }
  | { icon: IconName; label: string; type: "tab"; value: ActiveTab };

const desktopDashboardNavItem: DesktopNavItem = { icon: "apps", label: "Dashboard", type: "tab", value: "home" };

const desktopNavGroups: ReadonlyArray<{ label: string; items: DesktopNavItem[] }> = [
  {
    label: "Core",
    items: [
      { icon: "prayer", label: "Prayer", type: "moreApp", value: "prayer" },
      { icon: "people", label: "Field", type: "tab", value: "people" },
      { icon: "meetings", label: "Table", type: "tab", value: "meetings" },
    ],
  },
  {
    label: "Apps",
    items: [
      { icon: "apps", label: "Apps", type: "moreApp", value: "apps" },
      { icon: "settings", label: "Settings", type: "settings" },
    ],
  },
];

const dosCommandResourceItems = getDosResourcesByCategory("Commands of Jesus");
const dosRelationshipResourceItems = getDosResourcesByCategory("Relationships");
const dosSendableResourceItems = getSendableDosResources();

const meetingTypeOptions: ReadonlyArray<{ helper: string; label: string; value: DosAppMeetingType }> = [
  { helper: "Around the table", label: "Kitchen Table", value: "kitchen_table" },
  { helper: "Coffee or meal", label: "Coffee", value: "coffee" },
  { helper: "Voice call", label: "Phone", value: "phone" },
  { helper: "Video call", label: "Zoom", value: "zoom" },
  { helper: "Message thread", label: "Text", value: "text" },
  { helper: "Prayer moment", label: "Prayer", value: "prayer" },
  { helper: "Several people", label: "Group", value: "group" },
  { helper: "Training rhythm", label: "Discipleship", value: "discipleship" },
  { helper: "Something else", label: "Other", value: "other" },
];

const conversationFlowOptions: ReadonlyArray<{ helper?: string; label: string; value: DosConversationFlowKey }> = [
  { label: "None", value: "none" },
  ...dosConversationFlowDefinitions.map((flow) => ({
    helper: flow.gatedTo === "usam" ? "USAM only" : undefined,
    label: flow.title,
    value: flow.id,
  })),
];

const commitmentLevelOptions: ReadonlyArray<{
  helper: string;
  label: string;
  value: RelationshipScoreValue;
}> = [
  { helper: "All in. No reservations. Has counted the cost.", label: "+3 Fully Committed", value: 3 },
  { helper: "Committed with some reservations. Currently counting the cost.", label: "+2 Committed", value: 2 },
  { helper: "Desires to follow Jesus but struggles with competing priorities and distractions.", label: "+1 Seeking Commitment", value: 1 },
  { helper: "Interested in spiritual things but not currently taking action.", label: "0 Interested", value: 0 },
  { helper: "Often seeks God's help during difficulties but repeatedly encounters roadblocks.", label: "-1 Crisis Driven", value: -1 },
  { helper: "Consumed by personal issues and rarely receptive to counsel or guidance.", label: "-2 Resistant", value: -2 },
  { helper: "Refuses counsel. Refuses responsibility. Unwilling to consider change.", label: "-3 Hardened", value: -3 },
];

function overviewEngagementLabel(value: RelationshipScoreValue) {
  switch (value) {
    case 3:
      return "Fully Committed";
    case 2:
      return "Committed";
    case 1:
      return "Seeking";
    case -1:
      return "Crisis Driven";
    case -2:
      return "Resistant";
    case -3:
      return "Hardened";
    case 0:
    default:
      return "Neutral";
  }
}

const conversationYesNoOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
] as const satisfies ReadonlyArray<{ label: string; value: DosConversationAnswer }>;

const conversationUnsureAnswerOptions = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Unsure", value: "unsure" },
] as const satisfies ReadonlyArray<{ label: string; value: DosConversationAnswer }>;

type FruitOutcomeGroupKey = "discipleship" | "relational" | "spiritual" | "testimony_processing";
type FruitOutcomeSourceKey = "leader_review" | "quick_review" | "testimony_review";
type FruitOutcomeDefinition = {
  aliases: readonly string[];
  formLabel?: string;
  group?: FruitOutcomeGroupKey;
  key: string;
  label: string;
  leaderLabel?: string;
  sources: readonly FruitOutcomeSourceKey[];
};

const fruitOutcomeConfig = [
  {
    aliases: ["closer to god", "feel closer to god", "i feel closer to god", "deeper trust", "nearer to god"],
    formLabel: "I feel closer to God",
    group: "spiritual",
    key: "closer_to_god",
    label: "Closer to God",
    sources: ["quick_review", "testimony_review"],
  },
  {
    aliases: ["surrendered something", "i surrendered something", "surrender", "repentance", "obedience"],
    formLabel: "I surrendered something",
    group: "spiritual",
    key: "surrendered_something",
    label: "Surrendered something",
    sources: ["quick_review", "testimony_review"],
  },
  {
    aliases: ["decision to follow jesus", "i made a decision to follow jesus", "follow jesus", "followed jesus"],
    formLabel: "I made a decision to follow Jesus",
    group: "spiritual",
    key: "decision_to_follow_jesus",
    label: "Decision to follow Jesus",
    sources: ["quick_review", "testimony_review"],
  },
  {
    aliases: ["baptism requested", "i requested baptism", "requested baptism", "baptism", "baptized"],
    formLabel: "I requested baptism",
    group: "spiritual",
    key: "baptism_requested",
    label: "Baptism requested",
    leaderLabel: "Baptized",
    sources: ["quick_review", "leader_review", "testimony_review"],
  },
  {
    aliases: ["answered prayer", "prayer answered", "answered prayers", "god answered prayer"],
    group: "spiritual",
    key: "answered_prayer",
    label: "Answered Prayer",
    sources: ["leader_review", "testimony_review"],
  },
  {
    aliases: ["encouraging", "felt encouraged", "encouragement", "felt heard", "felt cared for", "cared for"],
    formLabel: "Encouraging",
    group: "relational",
    key: "felt_encouraged",
    label: "Felt encouraged",
    sources: ["quick_review", "leader_review"],
  },
  {
    aliases: ["peaceful", "peace", "received peace"],
    group: "relational",
    key: "peaceful",
    label: "Peaceful",
    sources: ["quick_review", "testimony_review"],
  },
  {
    aliases: ["reconciled relationship", "i reconciled a relationship", "reconciliation", "restored relationship", "restored relationships", "forgiveness", "forgave"],
    formLabel: "I reconciled a relationship",
    group: "relational",
    key: "reconciled_relationship",
    label: "Reconciled relationship",
    leaderLabel: "Reconciliation",
    sources: ["quick_review", "leader_review", "testimony_review"],
  },
  {
    aliases: ["marriage restoration", "marriage restored", "marriage healing", "marriage healed", "restored marriage", "healed marriage"],
    group: "relational",
    key: "marriage_restoration",
    label: "Marriage restoration",
    leaderLabel: "Marriage Restoration",
    sources: ["leader_review", "testimony_review"],
  },
  {
    aliases: ["joined a group", "i joined a group", "joined discipleship", "church connection", "church visit"],
    formLabel: "I joined a group",
    group: "discipleship",
    key: "joined_group",
    label: "Joined a group",
    leaderLabel: "Joined Discipleship",
    sources: ["quick_review", "leader_review"],
  },
  {
    aliases: ["started discipling others", "disciple maker", "multiplying", "multiplication"],
    group: "discipleship",
    key: "started_discipling_others",
    label: "Started discipling others",
    leaderLabel: "Started Discipling Others",
    sources: ["leader_review", "testimony_review"],
  },
  {
    aliases: ["new believer", "new believers", "new birth", "born again", "salvation", "received christ", "gave their life"],
    group: "discipleship",
    key: "new_believer",
    label: "New believer",
    leaderLabel: "New Believers",
    sources: ["leader_review", "testimony_review"],
  },
  {
    aliases: ["discipling", "discipleship", "bible study started", "walking with", "disciple"],
    group: "discipleship",
    key: "discipling",
    label: "Discipling",
    sources: ["leader_review"],
  },
  {
    aliases: ["life giving", "life-giving"],
    group: "testimony_processing",
    key: "life_giving",
    label: "Life giving",
    sources: ["quick_review"],
  },
  {
    aliases: ["transformational", "transformation", "changed my life"],
    group: "testimony_processing",
    key: "transformational",
    label: "Transformational",
    sources: ["quick_review", "testimony_review"],
  },
  {
    aliases: ["challenging in a good way", "challenging good", "challenged in a good way"],
    group: "testimony_processing",
    key: "challenging_good",
    label: "Challenging in a good way",
    sources: ["quick_review"],
  },
  {
    aliases: ["still processing", "processing"],
    formLabel: "Still processing",
    group: "testimony_processing",
    key: "still_processing",
    label: "Still processing",
    sources: ["quick_review", "testimony_review"],
  },
  {
    aliases: ["other"],
    group: "testimony_processing",
    key: "other",
    label: "Other",
    sources: ["quick_review"],
  },
  {
    aliases: ["not sure yet", "not sure"],
    formLabel: "Not sure yet",
    group: "testimony_processing",
    key: "not_sure_yet",
    label: "Not sure yet",
    sources: ["quick_review"],
  },
  {
    aliases: ["gospel conversation"],
    key: "gospel_conversation",
    label: "Gospel Conversation",
    sources: ["leader_review"],
  },
  {
    aliases: ["prayer received"],
    key: "prayer_received",
    label: "Prayer Received",
    sources: ["leader_review"],
  },
  {
    aliases: ["testimony shared"],
    key: "testimony_shared",
    label: "Testimony Shared",
    sources: ["leader_review", "testimony_review"],
  },
  {
    aliases: ["prayer request"],
    key: "prayer_request",
    label: "Prayer Request",
    sources: ["leader_review"],
  },
  {
    aliases: ["serving"],
    key: "serving",
    label: "Serving",
    sources: ["leader_review"],
  },
] as const satisfies ReadonlyArray<FruitOutcomeDefinition>;
const fruitOutcomeDefinitions: readonly FruitOutcomeDefinition[] = fruitOutcomeConfig;

const quickReviewExperienceOutcomeKeys = [
  "life_giving",
  "felt_encouraged",
  "peaceful",
  "challenging_good",
  "transformational",
  "not_sure_yet",
] as const;
const quickReviewLifeChangeOutcomeKeys = [
  "closer_to_god",
  "reconciled_relationship",
  "surrendered_something",
  "decision_to_follow_jesus",
  "joined_group",
  "baptism_requested",
  "still_processing",
  "other",
] as const;
const fruitSnapshotOutcomeKeys = [
  "started_discipling_others",
  "discipling",
  "joined_group",
  "felt_encouraged",
  "reconciled_relationship",
  "baptism_requested",
  "new_believer",
  "marriage_restoration",
] as const;
const testimonyReviewSharingPermissionOptions = [
  "I give permission for USA Missionaries to share my testimony publicly (written or verbal) in an anonymized form.",
  "I give permission for USA Missionaries to share my testimony publicly with my name included.",
  "I do not give permission for my responses to be shared publicly.",
] as const;
const fruitImpactGroupConfig = [
  {
    key: "spiritual",
    sourceHint: "Quick Review · Leader Review",
    title: "Spiritual Fruit",
    outcomeKeys: ["closer_to_god", "surrendered_something", "decision_to_follow_jesus", "baptism_requested", "answered_prayer"],
  },
  {
    key: "relational",
    sourceHint: "Quick Review · Leader Review",
    title: "Relational Fruit",
    outcomeKeys: ["felt_encouraged", "peaceful", "reconciled_relationship", "marriage_restoration"],
  },
  {
    key: "discipleship",
    sourceHint: "Leader Review · Testimony Review",
    title: "Discipleship Fruit",
    outcomeKeys: ["joined_group", "started_discipling_others", "new_believer", "discipling"],
  },
  {
    key: "testimony_processing",
    sourceHint: "Quick Review · Testimony Review",
    title: "Testimony / Processing",
    outcomeKeys: ["transformational", "challenging_good", "still_processing", "not_sure_yet", "other"],
  },
] as const;

const fruitOutcomeByKey: ReadonlyMap<string, FruitOutcomeDefinition> = new Map(fruitOutcomeDefinitions.map((outcome) => [outcome.key, outcome]));
const outcomeTagOptions = fruitOutcomeDefinitions
  .filter((outcome) => outcome.sources.includes("leader_review"))
  .map((outcome) => outcome.leaderLabel ?? outcome.label);
const meetingObservedFruitOptions = outcomeTagOptions.map((label) => ({ label, value: label }));

function fruitOutcomeFormLabels(outcomeKeys: readonly string[]) {
  return outcomeKeys.map((key) => {
    const outcome = fruitOutcomeByKey.get(key);

    return outcome?.formLabel ?? outcome?.label ?? key;
  });
}

const reminderTypeOptions = [
  { helper: "Yearly", label: "Birthday", value: "birthday" },
  { helper: "Yearly", label: "Anniversary", value: "anniversary" },
  { helper: "Yearly", label: "Baptism", value: "baptism" },
  { helper: "Yearly", label: "Salvation", value: "salvation" },
  { helper: "One time", label: "Follow Up", value: "follow_up" },
  { helper: "One time", label: "Prayer", value: "prayer" },
  { helper: "Flexible", label: "Custom", value: "custom" },
] as const;
const reminderRecurrenceOptions = [
  { label: "None", value: "none" },
  { label: "Yearly", value: "yearly" },
  { label: "Monthly", value: "monthly" },
  { label: "Weekly", value: "weekly" },
] as const;

type ButtonTone = "black" | "soft" | "white";
type CircleFocusView = "my_120" | "seventy" | "three" | "twelve";
type PeopleCircleView = CircleFocusView;
type MeetingsView = "availability" | "calendar" | "history" | "upcoming";
type MobileMeetingsView = Exclude<MeetingsView, "availability">;
type FruitView = "activity" | "forms" | "impact";
type FruitActivitySource = "Answered Prayer" | "Prayer" | "Quick Review" | "Story" | "Testimony Review";
type FruitFormKey = "prayer_request" | "quick_review" | "testimony_review";
type FruitFormStatus = "coming_soon" | "live";
type PersonDetailTab = "activity" | "fruit" | "overview" | "prayer";
type PrayerRequestView = "answered" | "praying";
type PrayerWorkspaceTab = "meeting_covering" | "my_requests" | "partners" | "praying_for";
type MeetingCalendarFilter = "all" | "dos" | "google" | "reminders";
type FormMode = "editMeeting" | "editPerson" | "fruit" | "meeting" | "meetingNotes" | "person" | "reminder" | "scheduleMeeting" | null;
type MeetingReviewFollowUp = "none" | "quick_review" | "testimony_request";
type MeetingCalendarItemKind = "anniversary" | "birthday" | "follow_up" | "google" | "meeting" | "prayer";
type MeetingCalendarItem = {
  date: string;
  externalEvent?: DosAppExternalCalendarEvent;
  id: string;
  kind: MeetingCalendarItemKind;
  meeting?: DosAppMeeting;
  personId?: string | null;
  personName?: string | null;
  reminder?: DosAppRelationshipReminder;
  subtitle: string;
  syncLabel?: string;
  title: string;
};
type PendingMeetingSendAction = {
  meeting: DosAppMeeting;
  type: Exclude<MeetingReviewFollowUp, "none">;
};
type UsamApplicationDraft = {
  applicantEmail: string;
  applicantName: string;
  applicantPhone: string;
  callingReason: string;
  location: string;
  ministryFocus: string;
  monthlyBudget: string;
  prayerNeeds: string;
  profilePhotoUrl: string;
  referencesText: string;
  storyTestimony: string;
  supportGoal: string;
};
type FormPreviewSection = {
  choiceType?: "checkbox" | "pill" | "radio";
  copy?: string;
  fieldType?: "email" | "text" | "textarea";
  helper?: string;
  label: string;
  options?: readonly string[];
  placeholder?: string;
  required?: boolean;
  type: "choice" | "field" | "notice";
};
type SendableFormPreview = {
  intro?: string;
  sections: readonly FormPreviewSection[];
  title: string;
};
const quickReviewFormPreview: {
  title: string;
  sections: readonly FormPreviewSection[];
} = {
  title: "2 Minute Reflection",
  sections: [
    {
      fieldType: "text",
      label: "Your name",
      required: true,
      type: "field",
    },
    {
      fieldType: "text",
      label: "Last name",
      type: "field",
    },
    {
      fieldType: "email",
      label: "Email address",
      required: true,
      type: "field",
    },
    {
      label: "How would you describe your experience?",
      options: fruitOutcomeFormLabels(quickReviewExperienceOutcomeKeys),
      type: "choice",
    },
    {
      fieldType: "textarea",
      label: "What impact did this meeting have on you? Any encouragement you want to share with USA Missionaries?",
      type: "field",
    },
    {
      label: "Did anything change in your life because of this meeting?",
      options: fruitOutcomeFormLabels(quickReviewLifeChangeOutcomeKeys),
      type: "choice",
    },
    {
      copy: "Your responses to this reflection form are kept confidential and stewarded with care. We may use parts of what you share here to encourage others, but only with your permission.",
      label: "Your Reflection & Privacy",
      type: "notice",
    },
    {
      label: "May we share your testimony?",
      options: [
        "Yes, anonymously",
        "Yes, with my name included",
        "No, please keep my story private",
      ],
      type: "choice",
    },
  ],
};
const testimonyReviewFormPreview: SendableFormPreview = {
  intro: "Thank you for welcoming us into your home and allowing space for the Holy Spirit to move. Every table looks different, and we believe the Lord often continues His work long after our time together ends. Your reflections help us give glory to God and steward this ministry with humility and care.",
  title: "Kitchen Table Reflection",
  sections: [
    {
      fieldType: "text",
      label: "Your name",
      placeholder: "First name",
      required: true,
      type: "field",
    },
    {
      fieldType: "text",
      label: "Last name",
      type: "field",
    },
    {
      fieldType: "email",
      label: "Email address",
      placeholder: "name@example.com",
      required: true,
      type: "field",
    },
    {
      fieldType: "textarea",
      helper: "A moment, a word, a prayer, a conversation, or something the Lord impressed on your heart.",
      label: "What stood out to you most from our time together at the table?",
      type: "field",
    },
    {
      fieldType: "textarea",
      helper: "If so, what was it, and how did it impact you?",
      label: "Did you sense the Lord speaking, revealing, or stirring anything in you during or after our time together?",
      type: "field",
    },
    {
      fieldType: "textarea",
      helper: "This could be obedience, repentance, rest, prayer, reconciliation, or simply deeper trust.",
      label: "As you reflect on this meeting, is there anything you feel the Lord is inviting you to step into or respond to next?",
      type: "field",
    },
    {
      fieldType: "textarea",
      helper: "Please feel free to share any additional thoughts or feedback.",
      label: "Is there anything else you would like to share or that feels important to add?",
      type: "field",
    },
    {
      copy: "Your responses are shared in confidence and will be stewarded with care. What you share may be used internally for prayer, reflection, and to help us steward this ministry well. Any testimony or story shared publicly will only be done with your clear permission, and identifying details will be removed unless you explicitly approve otherwise. Our desire is to honor your trust, protect what the Lord is doing in your life, and give glory to God through stories that encourage others.",
      label: "Your Reflection and Privacy",
      type: "notice",
    },
    {
      choiceType: "checkbox",
      label: "Sharing Permission",
      options: testimonyReviewSharingPermissionOptions,
      type: "choice",
    },
  ],
};
type ScriptureReference = {
  reference: string;
  text: string;
};
type ScriptureQuickViewState = {
  scripture: ScriptureReference;
  top: number;
};
const scriptureReferences = {
  hebrews1025: {
    reference: "Hebrews 10:25",
    text: "Not forsaking the assembling of ourselves together, as the manner of some is; but exhorting one another: and so much the more, as ye see the day approaching.",
  },
  luke1610: {
    reference: "Luke 16:10",
    text: "He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much.",
  },
  matthew716: {
    reference: "Matthew 7:16",
    text: "Ye shall know them by their fruits. Do men gather grapes of thorns, or figs of thistles?",
  },
  secondPeter318: {
    reference: "2 Peter 3:18",
    text: "But grow in grace, and in the knowledge of our Lord and Saviour Jesus Christ. To him be glory both now and for ever. Amen.",
  },
} as const satisfies Record<string, ScriptureReference>;
type SegmentedTabOption<T extends string> = {
  label: string;
  value: T;
};
type PersonFormDefaults = {
  birthday?: string;
  childrenNames?: string;
  church?: string;
  city?: string;
  email?: string;
  engagementScore?: RelationshipScoreValue;
  homeAddress?: string;
  householdNotes?: string;
  name?: string;
  notes?: string;
  occupation?: string;
  phone?: string;
  spouseName?: string;
  state?: string;
  zip?: string;
};
type PersonChildDraft = {
  firstName: string;
  id: string;
  lastName: string;
};
type PersonHouseholdDraft = {
  children: PersonChildDraft[];
  spouseFirstName: string;
  spouseLastName: string;
};
type PeopleImportRow = {
  childrenNames: string;
  church: string;
  city: string;
  email: string;
  firstName: string;
  householdNotes: string;
  lastName: string;
  name: string;
  notes: string;
  phone: string;
  sourceRowNumber: number;
  spouseName: string;
  state: string;
};
type PeopleImportAnalysis = {
  duplicateRows: PeopleImportRow[];
  invalidRows: PeopleImportRow[];
  readyRows: PeopleImportRow[];
};
type PeopleImportResult = {
  duplicateCount: number;
  importedCount: number;
  invalidCount: number;
  skippedCount: number;
};

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const commonProps = {
    "aria-hidden": true,
    fill: "none",
    height: size,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
    width: size,
  };

  switch (name) {
    case "add":
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...commonProps}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "apps":
      return (
        <svg {...commonProps}>
          <rect height="5.5" rx="1.5" width="5.5" x="4" y="4" />
          <rect height="5.5" rx="1.5" width="5.5" x="14.5" y="4" />
          <rect height="5.5" rx="1.5" width="5.5" x="4" y="14.5" />
          <path d="M17.25 14.5v5.5" />
          <path d="M14.5 17.25h5.5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps}>
          <path d="M7 3v3" />
          <path d="M17 3v3" />
          <path d="M4 8h16" />
          <rect height="16" rx="3" width="16" x="4" y="5" />
        </svg>
      );
    case "fruit":
      return (
        <svg {...commonProps}>
          <path d="M12 21V10" />
          <path d="M12 13.5c-3.7 0-6.2-2.3-7-6.6 4 .1 6.5 2.2 7 6.6Z" />
          <path d="M12 11.5c.9-3.8 3.4-5.8 7.2-5.9-.4 4.3-3 6.4-7.2 5.9Z" />
          <path d="M12 18c2.3-.4 4-1.7 5.1-3.9" />
        </svg>
      );
    case "home":
      return (
        <svg {...commonProps}>
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M6.5 10.5V20h11v-9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "log":
      return (
        <svg {...commonProps}>
          <path d="M8 6h10" />
          <path d="M8 12h10" />
          <path d="M8 18h7" />
          <path d="M4 6h.01" />
          <path d="M4 12h.01" />
          <path d="M4 18h.01" />
        </svg>
      );
    case "meetings":
      return (
        <svg {...commonProps}>
          <rect height="7" rx="2" width="16" x="4" y="5" />
          <path d="M7 12v7" />
          <path d="M17 12v7" />
          <path d="M6 16h12" />
        </svg>
      );
    case "more":
      return (
        <svg {...commonProps}>
          <rect height="6" rx="1.5" width="6" x="4" y="4" />
          <rect height="6" rx="1.5" width="6" x="14" y="4" />
          <rect height="6" rx="1.5" width="6" x="4" y="14" />
          <rect height="6" rx="1.5" width="6" x="14" y="14" />
        </svg>
      );
    case "library":
      return (
        <svg {...commonProps}>
          <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12v16H7a2.5 2.5 0 0 0-2.5 2.5v-16Z" />
          <path d="M7 3v16" />
          <path d="M10 7h5.5" />
          <path d="M10 10h4" />
        </svg>
      );
    case "people":
      return (
        <svg {...commonProps}>
          <path d="M16 20v-1.5c0-1.7-1.8-3-4-3s-4 1.3-4 3V20" />
          <circle cx="12" cy="9" r="3" />
          <path d="M20 20v-1.2c0-1.2-1-2.2-2.5-2.7" />
          <path d="M17 6.2a2.5 2.5 0 0 1 0 4.6" />
        </svg>
      );
    case "prayer":
      return (
        <svg {...commonProps}>
          <path d="M12 20s-7-4.4-7-10.2A4.2 4.2 0 0 1 12 6a4.2 4.2 0 0 1 7 3.8C19 15.6 12 20 12 20Z" />
          <path d="M9 11h6" />
        </svg>
      );
    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="11" cy="11" r="6" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "send":
      return (
        <svg {...commonProps}>
          <path d="m4 12 16-7-7 16-2-7-7-2Z" />
          <path d="m13 11-4 4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="m4.2 4.2 1.4 1.4" />
          <path d="m18.4 18.4 1.4 1.4" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
          <path d="m4.2 19.8 1.4-1.4" />
          <path d="m18.4 5.6 1.4-1.4" />
        </svg>
      );
    case "upload":
      return (
        <svg {...commonProps}>
          <path d="M12 16V5" />
          <path d="m8 9 4-4 4 4" />
          <path d="M5 19h14" />
        </svg>
      );
    default:
      return null;
  }
}

function parseDisplayDate(value: string | null) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.includes("T") ? value : `${value}T12:00:00`;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null) {
  const date = parseDisplayDate(value);

  if (!date) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | null) {
  const date = parseDisplayDate(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMeetingTimeRange(meeting: DosAppMeeting) {
  const start = formatTime(meeting.scheduledStartAt ?? meeting.date);
  const end = formatTime(meeting.scheduledEndAt);

  return [formatDate(meeting.scheduledStartAt ?? meeting.date), start && end ? `${start} - ${end}` : start].filter(Boolean).join(" · ");
}

function formatExternalCalendarEventTimeRange(event: DosAppExternalCalendarEvent) {
  if (event.allDay) {
    return formatDate(event.startAt);
  }

  const start = formatTime(event.startAt);
  const end = formatTime(event.endAt);

  return [formatDate(event.startAt), start && end ? `${start} - ${end}` : start].filter(Boolean).join(" · ");
}

function formatDateTime(value: string | null | undefined) {
  const dateValue = value ?? null;
  const time = formatTime(dateValue);

  return [formatDate(dateValue), time].filter(Boolean).join(" · ");
}

function startOfDisplayDay(value: string | null | undefined) {
  const date = value ? parseDisplayDate(value) : null;

  if (!date) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isUpcomingDate(value: string | null | undefined) {
  const date = startOfDisplayDay(value);

  if (!date) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return date.getTime() >= todayStart;
}

function dayOffsetFromToday(value: string | null | undefined) {
  const date = startOfDisplayDay(value);

  if (!date) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return Math.round((date.getTime() - todayStart) / (24 * 60 * 60 * 1000));
}

function isTodayDate(value: string | null | undefined) {
  return dayOffsetFromToday(value) === 0;
}

function formatRelativeDate(value: string | null) {
  const date = parseDisplayDate(value);

  if (!date) {
    return "No contact yet";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const activityDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.round((today - activityDay) / (24 * 60 * 60 * 1000));

  if (daysAgo <= 0) {
    return "Today";
  }

  if (daysAgo === 1) {
    return "Yesterday";
  }

  return `${daysAgo} days ago`;
}

function isWithinLastDays(value: string | null | undefined, days: number) {
  const date = value ? parseDisplayDate(value) : null;

  if (!date) {
    return false;
  }

  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
}

function currentWeekRange(referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

function isDateWithinRange(value: string | null | undefined, start: Date, end: Date) {
  const date = value ? parseDisplayDate(value) : null;

  return Boolean(date && date.getTime() >= start.getTime() && date.getTime() <= end.getTime());
}

function dateSortValue(value: string | null | undefined) {
  return parseDisplayDate(value ?? null)?.getTime() ?? 0;
}

function formatWeekRangeCompact(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} · ${formatter.format(end)}`;
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateValueFromToday(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  return calendarDateKey(date);
}

function calendarDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromCalendarKey(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function calendarDateKeyFromValue(value: string | null | undefined) {
  const date = parseDisplayDate(value ?? null);

  return date ? calendarDateKey(date) : "";
}

function startOfCalendarMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addCalendarMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function daysInCalendarMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function isSameCalendarMonth(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function calendarMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function calendarSelectedDayLabel(value: string) {
  const date = dateFromCalendarKey(value);
  const label = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "long",
  }).format(date);

  return isTodayDate(value) ? `Today · ${label}` : label;
}

function localDateTimeIso(dateValue: string, timeValue: string) {
  const date = new Date(`${dateValue}T${timeValue || "00:00"}:00`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formDurationMinutes(value: FormDataEntryValue | null) {
  const minutes = Number(value);

  return Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
}

function meetingTypeLabel(value: string) {
  return meetingTypeOptions.find((option) => option.value === value)?.label ?? "Table";
}

function meetingActivityTitle(meeting: DosAppMeeting) {
  return meeting.source === "connection" ? meeting.title : meetingTypeLabel(meeting.type);
}

function reminderTypeLabel(value: DosAppRelationshipReminder["reminderType"]) {
  return reminderTypeOptions.find((option) => option.value === value)?.label ?? "Reminder";
}

function reminderDisplayTitle(reminder: DosAppRelationshipReminder, person?: DosAppPerson | null) {
  if (reminder.title?.trim()) {
    return reminder.title.trim();
  }

  const personName = person?.name ?? "Person";

  switch (reminder.reminderType) {
    case "anniversary":
      return `${personName} anniversary`;
    case "baptism":
      return `${personName} baptism`;
    case "birthday":
      return `${personName} birthday`;
    case "salvation":
      return `${personName} salvation`;
    case "follow_up":
      return `Follow up with ${personName}`;
    case "prayer":
      return `Pray for ${personName}`;
    case "custom":
    default:
      return `Reminder for ${personName}`;
  }
}

function nextReminderDate(reminder: DosAppRelationshipReminder) {
  const date = parseDisplayDate(reminder.reminderDate);

  if (!date || reminder.recurrence === "none") {
    return reminder.reminderDate;
  }

  const now = new Date();
  const nextDate = new Date(date);

  if (reminder.recurrence === "yearly") {
    nextDate.setFullYear(now.getFullYear());
    if (nextDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      nextDate.setFullYear(now.getFullYear() + 1);
    }
  }

  if (reminder.recurrence === "monthly") {
    nextDate.setFullYear(now.getFullYear(), now.getMonth());
    if (nextDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
  }

  if (reminder.recurrence === "weekly") {
    while (nextDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      nextDate.setDate(nextDate.getDate() + 7);
    }
  }

  return nextDate.toISOString();
}

function reminderSyncLabel(reminder: DosAppRelationshipReminder) {
  if (reminder.googleSyncStatus === "synced") {
    return "Synced";
  }

  if (reminder.googleSyncStatus === "failed") {
    return "Sync failed";
  }

  return "Local only";
}

function meetingSyncLabel(meeting: DosAppMeeting) {
  if (meeting.googleSyncStatus === "synced") {
    return "Synced";
  }

  if (meeting.googleSyncStatus === "failed") {
    return "Sync failed";
  }

  return "Local only";
}

function calendarKindForReminder(reminder: DosAppRelationshipReminder): MeetingCalendarItemKind | null {
  if (reminder.reminderType === "birthday") {
    return "birthday";
  }

  if (reminder.reminderType === "anniversary" || reminder.reminderType === "baptism" || reminder.reminderType === "salvation") {
    return "anniversary";
  }

  if (reminder.reminderType === "follow_up") {
    return "follow_up";
  }

  if (reminder.reminderType === "prayer") {
    return "prayer";
  }

  return null;
}

function reminderDatesForCalendarMonth(reminder: DosAppRelationshipReminder, month: Date) {
  const baseDate = parseDisplayDate(reminder.reminderDate);

  if (!baseDate) {
    return [];
  }

  const withBaseTime = (year: number, monthIndex: number, day: number) => (
    new Date(year, monthIndex, day, baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds())
  );

  if (reminder.recurrence === "none") {
    return isSameCalendarMonth(baseDate, month) ? [baseDate] : [];
  }

  if (reminder.recurrence === "yearly") {
    const occurrence = withBaseTime(month.getFullYear(), baseDate.getMonth(), baseDate.getDate());

    return isSameCalendarMonth(occurrence, month) ? [occurrence] : [];
  }

  if (reminder.recurrence === "monthly") {
    const occurrence = withBaseTime(month.getFullYear(), month.getMonth(), baseDate.getDate());

    return isSameCalendarMonth(occurrence, month) ? [occurrence] : [];
  }

  const dates: Date[] = [];
  const cursor = new Date(month.getFullYear(), month.getMonth(), 1, baseDate.getHours(), baseDate.getMinutes(), baseDate.getSeconds());
  const offset = (baseDate.getDay() - cursor.getDay() + 7) % 7;

  cursor.setDate(cursor.getDate() + offset);

  while (isSameCalendarMonth(cursor, month)) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return dates;
}

function buildMeetingCalendarItems({
  externalCalendarEvents,
  meetings,
  month,
  people,
  reminders,
}: {
  externalCalendarEvents: DosAppExternalCalendarEvent[];
  meetings: DosAppMeeting[];
  month: Date;
  people: DosAppPerson[];
  reminders: DosAppRelationshipReminder[];
}) {
  const meetingItems: MeetingCalendarItem[] = meetings
    .filter((meeting) => meeting.meetingStatus === "scheduled")
    .map((meeting) => {
      const date = meeting.scheduledStartAt ?? meeting.date;
      const parsedDate = parseDisplayDate(date);

      return { date, meeting, parsedDate };
    })
    .filter((item): item is { date: string; meeting: DosAppMeeting; parsedDate: Date } => Boolean(item.date && item.parsedDate && isSameCalendarMonth(item.parsedDate, month)))
    .map(({ date, meeting }) => {
      const linkedPerson = primaryMeetingPerson(meeting, people);

      return {
        date,
        id: `meeting-${meeting.id}`,
        kind: "meeting" as const,
        meeting,
        personId: linkedPerson?.id ?? meeting.fieldPersonIds[0] ?? null,
        personName: linkedPerson?.name ?? null,
        subtitle: formatMeetingTimeRange(meeting),
        syncLabel: meetingSyncLabel(meeting),
        title: meetingDisplayTitle(meeting, people),
      };
    });

  const reminderItems: MeetingCalendarItem[] = reminders.flatMap((reminder) => {
    const kind = calendarKindForReminder(reminder);

    if (!kind) {
      return [];
    }

    const linkedPerson = people.find((person) => person.id === reminder.personId) ?? null;

    return reminderDatesForCalendarMonth(reminder, month).map((date) => ({
      date: date.toISOString(),
      id: `reminder-${reminder.id}-${calendarDateKey(date)}`,
      kind,
      personId: reminder.personId,
      personName: linkedPerson?.name ?? null,
      reminder,
      subtitle: `${reminderTypeLabel(reminder.reminderType)} · ${linkedPerson?.name ?? "Person"}`,
      syncLabel: reminderSyncLabel(reminder),
      title: reminderDisplayTitle(reminder, linkedPerson),
    }));
  });

  const googleItems: MeetingCalendarItem[] = externalCalendarEvents
    .filter((event) => !event.importedMeetingId)
    .map((event) => {
      const date = event.startAt;
      const parsedDate = parseDisplayDate(date);

      return { date, event, parsedDate };
    })
    .filter((item): item is { date: string; event: DosAppExternalCalendarEvent; parsedDate: Date } => Boolean(item.date && item.parsedDate && isSameCalendarMonth(item.parsedDate, month)))
    .map(({ date, event }) => ({
      date,
      externalEvent: event,
      id: `google-${event.id}`,
      kind: "google" as const,
      subtitle: [formatExternalCalendarEventTimeRange(event), event.sourceName].filter(Boolean).join(" · "),
      syncLabel: "Read only",
      title: event.title,
    }));

  return [...meetingItems, ...reminderItems, ...googleItems].sort((first, second) => dateSortValue(first.date) - dateSortValue(second.date));
}

function isPrayerMeeting(meeting: DosAppMeeting) {
  const content = `${meetingActivityTitle(meeting)} ${meeting.notes ?? ""}`.toLowerCase();

  return meeting.type === "prayer" || content.includes("prayer") || content.includes("pray");
}

function conversationFlowLabel(value: DosConversationFlowKey) {
  return conversationFlowOptions.find((option) => option.value === value)?.label ?? "None";
}

function answerLabel(value: DosConversationAnswer | undefined) {
  if (!value) {
    return "Skipped";
  }

  return value === "unsure" ? "Unsure" : value.charAt(0).toUpperCase() + value.slice(1);
}

function meetingMetadataLine(meeting: DosAppMeeting) {
  const dateLine = meeting.meetingStatus === "scheduled" ? formatMeetingTimeRange(meeting) : formatDate(meeting.date);

  return formatDosMeetingSecondary(meetingActivityTitle(meeting), dateLine);
}

function reviewStatusLabel(value: DosAppReviewStatus) {
  return {
    approved: "Approved",
    not_sent: "Not Sent",
    pending: "Pending",
    private: "Private",
    submitted: "Submitted",
  }[value];
}

function reviewStatusClass(value: DosAppReviewStatus) {
  return value === "not_sent"
    ? "border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]"
    : "border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]";
}

function reviewSharePermissionLabel(value: string | null) {
  if (value === "with_name") {
    return "Name OK";
  }

  if (value === "anonymous") {
    return "Anonymous OK";
  }

  return "Private";
}

function fruitNarrative(event: DosAppFruitEvent) {
  if (event.description) {
    return event.description;
  }

  if (event.sourceType === "leader_reflection") {
    return "Observed in a Leader Reflection.";
  }

  if (event.sourceType === "participant_review") {
    return "Confirmed through a participant Review.";
  }

  if (event.sourceType === "testimony") {
    return "Confirmed through a shared story.";
  }

  if (event.sourceType === "system") {
    return "Verified from repeated engagement patterns.";
  }

  return "Recorded as structured Fruit.";
}

function fruitMultiplicationLabel(value: PersonDetailFruitSummary["multiplicationStatus"]) {
  if (value === "Not yet") {
    return "None Yet";
  }

  if (value === "Started") {
    return "Discipling Others";
  }

  return value;
}

const observableFruitOutcomeKeywords = [
  "gospel conversation",
  "good news",
  "prayer received",
  "requested prayer",
  "salvation",
  "new believer",
  "baptism",
  "baptized",
  "church connection",
  "church engagement",
  "joined discipleship",
  "began discipling others",
  "started discipling others",
  "disciple maker",
  "testimony shared",
] as const;

const signalStyleFruitKeywords = [
  "follow up engagement",
  "ongoing discipleship",
  "relationship signal",
  "circle signal",
  "engagement signal",
] as const;

function isObservableFruitOutcome(event: DosAppFruitEvent) {
  const titleAndType = fruitSearchText(event.title, event.fruitType);
  const text = fruitSearchText(event.title, event.fruitType, event.description);

  if (signalStyleFruitKeywords.some((keyword) => titleAndType.includes(keyword))) {
    return false;
  }

  return observableFruitOutcomeKeywords.some((keyword) => text.includes(keyword));
}

function fruitOutcomeLabel(event: DosAppFruitEvent | undefined) {
  if (!event) {
    return "None yet";
  }

  return event.title?.trim() || event.fruitType || "Fruit recorded";
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "";
}

function phoneDigitsOnly(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits.slice(0, 10);
}

function formatPhoneNumber(value: string | null | undefined) {
  const digits = phoneDigitsOnly(value);

  if (!digits) {
    return "";
  }

  if (digits.length < 4) {
    return `(${digits}`;
  }

  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function phoneActionHref(action: "sms" | "tel", value: string | null | undefined) {
  const digits = phoneDigitsOnly(value);

  return `${action}:${digits || normalizeText(value)}`;
}

function personRelationshipModel(person: DosAppPerson): DosRelationshipModel {
  return {
    discipleshipStage: person.discipleshipStage,
    relationshipType: normalizeRelationshipType(person.relationshipType, person.roleInMyLife, person.status),
    relationshipContext: person.relationshipContext,
    roleInMyLife: person.roleInMyLife,
  };
}

function relationshipModelForPerson(person: DosAppPerson): DosRelationshipModel {
  return personRelationshipModel(person);
}

function splitAdditionalInfo(notes: string | null | undefined) {
  const { additional, notes: baseNotes } = splitPersonNotesValue(notes);
  return {
    additional,
    notes: personNotesToPlainText(baseNotes),
  };
}

function parseAddress(value: string) {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const stateZip = parts[2] ?? "";
  const stateZipMatch = stateZip.match(/^([A-Za-z]{2})\s+(.+)$/);

  return {
    city: parts[1] ?? "",
    homeAddress: parts[0] ?? value,
    state: stateZipMatch?.[1] ?? "",
    zip: stateZipMatch?.[2] ?? "",
  };
}

function personFormDefaults(person?: DosAppPerson | null): PersonFormDefaults {
  if (!person) {
    return {};
  }

  const { additional, notes } = splitAdditionalInfo(person.notes);
  const defaults: PersonFormDefaults = {
    childrenNames: person.childrenNames ?? "",
    church: person.church ?? "",
    email: person.email ?? "",
    engagementScore: relationshipScoreFromEngagementLevel(person.engagementLevel),
    name: person.name,
    householdNotes: person.householdNotes ?? "",
    notes,
    phone: person.phone,
    spouseName: person.spouseName ?? "",
  };

  additional.split("\n").forEach((line) => {
    const [label = "", ...rest] = line.split(":");
    const value = rest.join(":").trim();

    if (!value) {
      return;
    }

    if (label === "Home address") {
      Object.assign(defaults, parseAddress(value));
    }

    if (label === "Occupation") {
      defaults.occupation = value;
    }

    if (label === "Birthday") {
      defaults.birthday = value;
    }
  });

  return defaults;
}

function personAddressLine(defaults: PersonFormDefaults) {
  const cityStateZip = [defaults.city, [defaults.state, defaults.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return [defaults.homeAddress, cityStateZip].filter(Boolean).join(", ");
}

function hasHouseholdDetails(person: DosAppPerson | PersonFormDefaults) {
  return Boolean(person.spouseName?.trim() || person.childrenNames?.trim() || person.householdNotes?.trim());
}

function compactNamePart(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function splitNameParts(value: string | null | undefined) {
  const normalized = compactNamePart(value);

  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName = "", ...lastNameParts] = normalized.split(" ");

  return {
    firstName,
    lastName: lastNameParts.join(" "),
  };
}

function blankChildDraft(index = 0): PersonChildDraft {
  return {
    firstName: "",
    id: `child-${index}`,
    lastName: "",
  };
}

function parseChildDrafts(value: string | null | undefined) {
  const children = (value ?? "")
    .split(/[,;\n]+/)
    .map((child) => compactNamePart(child))
    .filter(Boolean)
    .map((child, index) => {
      const nameParts = splitNameParts(child);

      return {
        ...nameParts,
        id: `existing-child-${index}`,
      };
    });

  return children.length ? children : [blankChildDraft()];
}

function householdDraftFromDefaults(defaults?: PersonFormDefaults): PersonHouseholdDraft {
  const spouse = splitNameParts(defaults?.spouseName);

  return {
    children: parseChildDrafts(defaults?.childrenNames),
    spouseFirstName: spouse.firstName,
    spouseLastName: spouse.lastName,
  };
}

function joinNameParts(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [compactNamePart(firstName), compactNamePart(lastName)].filter(Boolean).join(" ");
}

function householdDraftSpouseName(draft: PersonHouseholdDraft) {
  return joinNameParts(draft.spouseFirstName, draft.spouseLastName);
}

function householdDraftChildrenNames(draft: PersonHouseholdDraft) {
  return draft.children
    .map((child) => joinNameParts(child.firstName, child.lastName))
    .filter(Boolean)
    .join(", ");
}

function mapsHrefForAddress(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function preferredMapsHrefForAddress(address: string) {
  const encodedAddress = encodeURIComponent(address);
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;

  if (/iPad|iPhone|iPod|Macintosh/i.test(userAgent)) {
    return `https://maps.apple.com/?q=${encodedAddress}`;
  }

  if (/Android/i.test(userAgent)) {
    return `geo:0,0?q=${encodedAddress}`;
  }

  return mapsHrefForAddress(address);
}

function openAddressInMaps(address: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href = preferredMapsHrefForAddress(address);
}

function handleAddressMapClick(event: MouseEvent<HTMLAnchorElement>, address: string) {
  event.preventDefault();
  openAddressInMaps(address);
}

function statusLabel(value: string | null | undefined) {
  const status = normalizeText(value).replaceAll("_", " ");

  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "New";
}

function relationshipLine(person: DosAppPerson) {
  const model = personRelationshipModel(person);

  return [
    relationshipTypePillLabel(person),
    relationshipContextLabel(model.relationshipContext),
    discipleshipStageLabel(model.discipleshipStage),
  ].join(" · ");
}

function relationshipTypePillLabel(person: DosAppPerson) {
  const relationshipType = relationshipTypeFromModel(personRelationshipModel(person));

  return relationshipTypeOptions.find((option) => option.value === relationshipType)?.label ?? statusLabel(person.relationshipType);
}

function normalizedSignalText(...values: Array<null | string | string[] | undefined>) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSignal(value: string, signals: string[]) {
  return signals.some((signal) => value.includes(signal));
}

const multiplicationJourneySignals = [
  "disciple maker",
  "discipling others",
  "started discipling others",
  "multiplication",
  "multiplying",
  "reproducing",
  "reproduction",
];

const disciplingJourneySignals = [
  "discipling",
  "disciple",
  "testimony",
  "training",
  "leadership",
  "leader",
  "leading",
  "teaching",
  "helping others",
  "walking with another",
];

function isSubmittedStatus(status: string) {
  return ["approved", "reviewed", "submitted"].includes(status.toLowerCase());
}

function deriveSpiritualJourney({
  fruitEvents,
  fruitSummary,
  meetings,
  participantReviews,
  participantTestimonies,
  person,
  reflections,
}: {
  fruitEvents: DosAppFruitEvent[];
  fruitSummary: PersonDetailFruitSummary;
  meetings: DosAppMeeting[];
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  person: DosAppPerson;
  reflections: DosAppLeaderReflection[];
}) {
  const personFlags = person as DosAppPerson & { disciple_maker?: boolean; discipleMaker?: boolean };
  const approvedFruitText = fruitEvents
    .filter((event) => event.status === "approved")
    .map((event) => normalizedSignalText(event.fruitType, event.title, event.description))
    .join(" ");
  const reflectionText = reflections
    .map((reflection) => normalizedSignalText(reflection.observedFruit, reflection.whatHappened, reflection.nextStep))
    .join(" ");
  const testimonyText = participantTestimonies
    .filter((testimony) => isSubmittedStatus(testimony.status))
    .map((testimony) => normalizedSignalText(testimony.story, testimony.whatChanged, testimony.decisionMade, testimony.nextStep))
    .join(" ");
  const hasApprovedMultiplicationFruit = fruitSummary.multiplicationStatus !== "Not yet"
    || hasSignal(approvedFruitText, multiplicationJourneySignals);
  const hasDiscipleMakerSignal = Boolean(personFlags.disciple_maker || personFlags.discipleMaker)
    || person.discipleshipStage === "disciple_maker"
    || hasApprovedMultiplicationFruit;

  if (hasDiscipleMakerSignal) {
    return "Disciple Maker";
  }

  const disciplingText = [approvedFruitText, reflectionText, testimonyText].join(" ");
  const hasDisciplingSignal = person.discipleshipStage === "discipling"
    || hasSignal(disciplingText, disciplingJourneySignals)
    || participantTestimonies.some((testimony) => isSubmittedStatus(testimony.status) && Boolean(testimony.story?.trim() || testimony.whatChanged?.trim()));

  if (hasDisciplingSignal) {
    return "Discipling";
  }

  const hasMeaningfulGrowthSignal = person.discipleshipStage === "walking_with"
    || meetings.length >= 2
    || reflections.length > 0
    || participantReviews.some((review) => isSubmittedStatus(review.status))
    || fruitEvents.some((event) => isSubmittedStatus(event.status));

  return hasMeaningfulGrowthSignal ? "Growing" : "Exploring";
}

function relationshipStatusLabel(person: DosAppPerson) {
  const status = normalizeText(person.status).toLowerCase();

  if (status.includes("disciple")) {
    return "Discipling";
  }

  if (status.includes("new")) {
    return "New";
  }

  if (status.includes("follow")) {
    return "Follow up";
  }

  return "Walking with";
}

function engagementLevelTableLabel(person: DosAppPerson) {
  const score = relationshipScoreFromEngagementLevel(person.engagementLevel);

  return `${relationshipScoreLabel(score)} ${overviewEngagementLabel(score)}`;
}

function tableDurationMinutes(meeting: DosAppMeeting) {
  if (!meeting.scheduledStartAt || !meeting.scheduledEndAt) {
    return 0;
  }

  const startTime = new Date(meeting.scheduledStartAt).getTime();
  const endTime = new Date(meeting.scheduledEndAt).getTime();
  const duration = Math.round((endTime - startTime) / 60_000);

  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function formatLoggedTime(minutes: number) {
  if (!minutes) {
    return "—";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${remainingMinutes}m`;
  }

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

type PersonTableStats = {
  meetings: number;
  timeMinutes: number;
};

function circleLayerLabelForPerson(personId: string, circleGroups: CircleLayerGroups) {
  if (circleGroups.three.some((item) => item.person.id === personId)) {
    return "My 3";
  }

  if (circleGroups.twelve.some((item) => item.person.id === personId)) {
    return "My 12";
  }

  if (circleGroups.seventy.some((item) => item.person.id === personId)) {
    return "My 70";
  }

  if (circleGroups.my120.some((item) => item.person.id === personId)) {
    return "My 120";
  }

  return "Field";
}

function lastActivityLine(person: DosAppPerson) {
  return person.lastActivityAt ? `Last interaction · ${formatDate(person.lastActivityAt.slice(0, 10))}` : "No tables yet";
}

function recentActivityLine(person: DosAppPerson) {
  return `${relationshipStatusLabel(person)} · ${formatRelativeDate(person.lastActivityAt)}`;
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "D";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";

  return `${first}${second}`.toUpperCase();
}

function firstNameFromDisplayName(name: string) {
  const cleaned = name.split(/[,&+]/)[0]?.trim() ?? "";
  const first = cleaned.split(/\s+/)[0]?.trim();

  return first || "Ryan";
}

function cleanIdentitySegment(value: string | null | undefined) {
  const text = value?.trim();

  return text ? text : null;
}

function workspaceIdentityName(workspace: DosAppWorkspace) {
  const displayName = cleanIdentitySegment(workspace.displayName);
  const normalizedName = displayName?.toLowerCase().replace(/\s+/g, " ");

  if (normalizedName === "ryan & brooke fox" || normalizedName === "ryan and brooke fox") {
    return "Fox Family";
  }

  return displayName ?? "My DOS";
}

function workspaceIdentitySublabel(workspace: DosAppWorkspace) {
  return [
    cleanIdentitySegment(workspace.stateName),
    cleanIdentitySegment(workspace.organizationName),
  ].filter(Boolean).join(" · ");
}

function workspaceProfileName(workspace: DosAppWorkspace, fallbackFirstName: string) {
  const providedName = cleanIdentitySegment(workspace.userFullName);

  if (providedName) {
    return providedName;
  }

  const displayName = cleanIdentitySegment(workspace.displayName);
  const normalizedName = displayName?.toLowerCase().replace(/\s+/g, " ");

  if (normalizedName === "fox family" || normalizedName === "ryan & brooke fox" || normalizedName === "ryan and brooke fox") {
    return "Ryan Fox";
  }

  return fallbackFirstName;
}

function workspaceProfileEmail(workspace: DosAppWorkspace) {
  return cleanIdentitySegment(workspace.userEmail) ?? (workspace.isPreview ? "ryan@foxfamily.org" : "");
}

function workspaceProfilePhone(workspace: DosAppWorkspace) {
  return cleanIdentitySegment(workspace.userPhone) ?? "";
}

const currentRhythmDay = 14;

function getDayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();

  return Math.floor(diff / 86400000);
}

function homeDateSubtitle(date = new Date(), rhythmDay = currentRhythmDay) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(date);

  return `${formattedDate} · Day ${rhythmDay}`;
}

function avatarTone(index: number) {
  return ["bg-[#EBF2FF] text-[#1D4ED8]", "bg-[#EBF2FF] text-[#2563EB]", "bg-[#F1F5F9] text-[#64748B]", "bg-[#E2E8F0] text-[#0F172A]"][index % 4];
}

function personName(people: DosAppPerson[], id: string | null | undefined) {
  return people.find((person) => person.id === id)?.name ?? "Unlinked person";
}

function meetingParticipantNames(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return resolveDosMeetingParticipantNames({
    fieldPersonIds: meeting.fieldPersonIds,
    participantNames: meeting.participantNames,
    people,
  });
}

function meetingPeople(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return formatDosParticipantList(meetingParticipantNames(meeting, people));
}

function meetingPeopleTitle(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return formatDosParticipantTitle(meetingParticipantNames(meeting, people));
}

function meetingParticipantTitle(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return formatDosParticipantTitle(meetingParticipantNames(meeting, people), "");
}

function meetingFallbackTitle(meeting: DosAppMeeting) {
  const context = meetingActivityTitle(meeting);
  const normalizedContext = context.toLowerCase();

  if (normalizedContext.includes("table")) {
    return context;
  }

  return normalizedContext.includes("meeting") ? context.replace(/meeting/gi, "Table") : `${context} Table`;
}

function meetingDisplayTitle(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return meetingParticipantTitle(meeting, people) || meetingFallbackTitle(meeting);
}

type UpcomingTimelineGroup = "Later" | "This Week" | "Today" | "Tomorrow";
type UpcomingTimelineIcon = "anniversary" | "birthday" | "meeting" | "prayer" | "reminder";
type UpcomingTimelineItem = {
  date: string | null;
  group: UpcomingTimelineGroup;
  icon: UpcomingTimelineIcon;
  id: string;
  label: string;
  meeting?: DosAppMeeting;
  notes: string | null;
  personId: string | null;
  personName: string | null;
  reminder?: DosAppRelationshipReminder;
  syncLabel: string;
  title: string;
};

type HomeActivityItem = {
  date: string | null;
  icon: IconName;
  id: string;
  label: string;
  meetingId?: string;
  target: "fruit" | "meeting";
  title: string;
};

const upcomingTimelineGroupOrder: UpcomingTimelineGroup[] = ["Today", "Tomorrow", "This Week", "Later"];

function upcomingTimelineGroup(value: string | null | undefined): UpcomingTimelineGroup {
  const offset = dayOffsetFromToday(value);

  if (offset === 0) {
    return "Today";
  }

  if (offset === 1) {
    return "Tomorrow";
  }

  if (offset !== null && offset >= 2 && offset <= 6) {
    return "This Week";
  }

  return "Later";
}

function timelineIconForReminder(reminder: DosAppRelationshipReminder): UpcomingTimelineIcon {
  if (reminder.reminderType === "birthday") {
    return "birthday";
  }

  if (reminder.reminderType === "anniversary" || reminder.reminderType === "baptism" || reminder.reminderType === "salvation") {
    return "anniversary";
  }

  if (reminder.reminderType === "prayer") {
    return "prayer";
  }

  return "reminder";
}

function primaryMeetingPerson(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return meeting.fieldPersonIds
    .map((personId) => people.find((person) => person.id === personId) ?? null)
    .find((person): person is DosAppPerson => Boolean(person)) ?? null;
}

function buildUpcomingTimelineItems({
  meetings,
  people,
  person,
  reminders,
}: {
  meetings: DosAppMeeting[];
  people: DosAppPerson[];
  person?: DosAppPerson | null;
  reminders: DosAppRelationshipReminder[];
}) {
  const personFilterId = person?.id ?? null;
  const meetingItems: UpcomingTimelineItem[] = meetings
    .filter((meeting) => meeting.meetingStatus === "scheduled")
    .filter((meeting) => !personFilterId || meeting.fieldPersonIds.includes(personFilterId))
    .filter((meeting) => isUpcomingDate(meeting.scheduledStartAt ?? meeting.date))
    .map((meeting) => {
      const linkedPerson = person ?? primaryMeetingPerson(meeting, people);
      const date = meeting.scheduledStartAt ?? meeting.date;

      return {
        date,
        group: upcomingTimelineGroup(date),
        icon: "meeting" as const,
        id: `meeting-${meeting.id}`,
        label: `Scheduled · ${formatMeetingTimeRange(meeting)}`,
        meeting,
        notes: meeting.notes,
        personId: linkedPerson?.id ?? meeting.fieldPersonIds[0] ?? null,
        personName: linkedPerson?.name ?? null,
        syncLabel: meetingSyncLabel(meeting),
        title: meetingDisplayTitle(meeting, person ? [person] : people),
      };
    });
  const reminderItems: UpcomingTimelineItem[] = reminders
    .filter((reminder) => !personFilterId || reminder.personId === personFilterId)
    .map((reminder) => ({
      reminder,
      reminderDate: nextReminderDate(reminder),
    }))
    .filter((item) => isUpcomingDate(item.reminderDate))
    .map(({ reminder, reminderDate }) => {
      const linkedPerson = person ?? people.find((item) => item.id === reminder.personId) ?? null;

      return {
        date: reminderDate,
        group: upcomingTimelineGroup(reminderDate),
        icon: timelineIconForReminder(reminder),
        id: `reminder-${reminder.id}`,
        label: `${reminderTypeLabel(reminder.reminderType)} · ${formatDate(reminderDate)}`,
        notes: reminder.notes,
        personId: reminder.personId,
        personName: linkedPerson?.name ?? null,
        reminder,
        syncLabel: reminderSyncLabel(reminder),
        title: reminderDisplayTitle(reminder, linkedPerson),
      };
    });

  return [...meetingItems, ...reminderItems].sort((first, second) => dateSortValue(first.date) - dateSortValue(second.date));
}

function groupedUpcomingTimelineItems(items: UpcomingTimelineItem[]) {
  return upcomingTimelineGroupOrder
    .map((group) => ({
      group,
      items: items.filter((item) => item.group === group),
    }))
    .filter((group) => group.items.length);
}

function nextStepTitle(item: UpcomingTimelineItem) {
  if (item.meeting) {
    return item.personName ? `Meet with ${item.personName}` : item.title;
  }

  return item.personName ? `${item.title} · ${item.personName}` : item.title;
}

function meetingTestimonyRecipientTitle(meeting: DosAppMeeting, people: DosAppPerson[]) {
  const fieldPersonIds = Array.from(new Set(meeting.fieldPersonIds.filter(Boolean)));

  if (fieldPersonIds.length !== 1) {
    return "";
  }

  return people.find((person) => person.id === fieldPersonIds[0])?.name ?? "";
}

function canSendMeetingTestimonyRequest(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return Boolean(meetingTestimonyRecipientTitle(meeting, people));
}

function meetingAvatarNames(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return meetingParticipantNames(meeting, people).slice(0, 3);
}

function filteredPeople(people: DosAppPerson[], query: string) {
  const search = query.trim().toLowerCase();

  if (!search) {
    return people;
  }

  return people.filter((person) => (
    person.name.toLowerCase().includes(search)
    || normalizeText(person.phone).toLowerCase().includes(search)
    || formatPhoneNumber(person.phone).toLowerCase().includes(search)
    || normalizeText(person.relationshipType).toLowerCase().includes(search)
    || relationshipLine(person).toLowerCase().includes(search)
    || normalizeText(person.status).toLowerCase().includes(search)
  ));
}

function tableSearchText(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return [
    meetingDisplayTitle(meeting, people),
    meetingActivityTitle(meeting),
    meeting.notes,
    meeting.meetingStatus,
    formatMeetingTimeRange(meeting),
    formatDate(meeting.date),
    ...meetingParticipantNames(meeting, people),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filteredTables(meetings: DosAppMeeting[], people: DosAppPerson[], query: string) {
  const search = query.trim().toLowerCase();

  if (!search) {
    return meetings;
  }

  return meetings.filter((meeting) => tableSearchText(meeting, people).includes(search));
}

function filteredCalendarItems(items: MeetingCalendarItem[], query: string) {
  const search = query.trim().toLowerCase();

  if (!search) {
    return items;
  }

  return items.filter((item) => [
    item.title,
    item.subtitle,
    item.personName,
    item.syncLabel,
    calendarItemLabel(item.kind),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search));
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

function mapDosPeopleCsvRow(headers: readonly string[], row: readonly string[], rowIndex: number): PeopleImportRow {
  const firstName = csvValue(headers, row, ["first_name", "first name", "firstname"]);
  const lastName = csvValue(headers, row, ["last_name", "last name", "lastname"]);
  const fallbackName = csvValue(headers, row, ["name", "full_name", "full name", "display_name", "display name"]);

  return {
    childrenNames: csvValue(headers, row, ["children", "kids", "children_names", "children names"]),
    church: csvValue(headers, row, ["church", "church_attending", "church attending", "spiritual community", "community"]),
    city: csvValue(headers, row, ["city"]),
    email: csvValue(headers, row, ["email", "home email", "email address"]),
    firstName,
    householdNotes: csvValue(headers, row, ["household_notes", "household notes", "family_notes", "family notes"]),
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" ").trim() || fallbackName,
    notes: csvValue(headers, row, ["notes", "note", "comments", "comment"]),
    phone: csvValue(headers, row, ["phone", "phone number", "mobile phone", "mobile phone number", "cell", "cell phone"]),
    sourceRowNumber: rowIndex + 2,
    spouseName: csvValue(headers, row, ["spouse", "spouse_name", "spouse name", "wife", "husband"]),
    state: csvValue(headers, row, ["state", "province"]),
  };
}

function peopleImportPhoneKey(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? "";
}

function peopleImportEmailKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function peopleImportNameKey(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function peopleImportKeys(person: Pick<PeopleImportRow, "email" | "name" | "phone"> | Pick<DosAppPerson, "email" | "name" | "phone">) {
  return [
    peopleImportPhoneKey(person.phone) ? `phone:${peopleImportPhoneKey(person.phone)}` : "",
    peopleImportEmailKey(person.email) ? `email:${peopleImportEmailKey(person.email)}` : "",
    peopleImportNameKey(person.name) ? `name:${peopleImportNameKey(person.name)}` : "",
  ].filter(Boolean);
}

function analyzePeopleImportRows(rows: PeopleImportRow[], existingPeople: DosAppPerson[]): PeopleImportAnalysis {
  const duplicateKeySet = new Set<string>();
  const duplicateRows: PeopleImportRow[] = [];
  const invalidRows: PeopleImportRow[] = [];
  const readyRows: PeopleImportRow[] = [];

  existingPeople.forEach((person) => {
    peopleImportKeys(person).forEach((key) => duplicateKeySet.add(key));
  });

  rows.forEach((row) => {
    if (!row.name.trim()) {
      invalidRows.push(row);
      return;
    }

    const keys = peopleImportKeys(row);

    if (keys.some((key) => duplicateKeySet.has(key))) {
      duplicateRows.push(row);
      return;
    }

    keys.forEach((key) => duplicateKeySet.add(key));
    readyRows.push(row);
  });

  return { duplicateRows, invalidRows, readyRows };
}

function AppButton({
  children,
  disabled,
  icon,
  onClick,
  tone = "white",
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: IconName;
  onClick?: () => void;
  tone?: ButtonTone;
  type?: "button" | "submit";
}) {
  const toneClass = {
    black: "bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] hover:brightness-[0.98]",
    soft: "border border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A] hover:bg-white",
    white: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:border-[#BFDBFE]",
  }[tone];
  const sizeClass = tone === "black" ? "min-h-[54px] text-[15px]" : "min-h-11 text-xs sm:text-sm";

  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass} ${toneClass}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}

function MeetingActionRow({
  onLogMeeting,
  onScheduleMeeting,
}: {
  onLogMeeting: () => void;
  onScheduleMeeting: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-3 text-[12px] font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition-transform active:scale-[0.99] max-[350px]:text-[11px]"
        onClick={onLogMeeting}
        type="button"
      >
        <Icon name="log" size={14} />
        <span className="truncate">Log Table</span>
      </button>
      <button
        className="inline-flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-full border border-[#DCEBFF] bg-white px-3 text-[12px] font-bold text-[#0F172A] shadow-[0_8px_22px_rgba(37,99,235,0.05)] transition-colors hover:border-[#BFDBFE] active:scale-[0.99] max-[350px]:text-[11px]"
        onClick={onScheduleMeeting}
        type="button"
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
        <span className="truncate max-[350px]:hidden">Schedule Table</span>
        <span className="hidden max-[350px]:inline">Schedule</span>
      </button>
    </div>
  );
}

function CompactButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon?: IconName;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A] transition-colors hover:border-[#BFDBFE] max-[350px]:px-2 max-[350px]:text-[11px]"
      onClick={onClick}
      type="button"
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

function EmptyState({
  action,
  text,
  title,
}: {
  action?: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 text-sm leading-6 text-[#64748B]">
      <p className="font-semibold text-[#0F172A]">{title}</p>
      <p className="mt-1">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
      {children}
    </span>
  );
}

function FieldInputClass() {
  return "mt-2 min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]";
}

function FieldTextareaClass() {
  return "mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-3 text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]";
}

function StatTile({
  label,
  onClick,
  value,
}: {
  label: string;
  onClick?: () => void;
  value: number | string;
}) {
  const className = "rounded-xl bg-[#F1F5F9] px-3 py-3.5 text-center";
  const interactiveClassName = `${className} cursor-pointer transition-colors hover:bg-[#EBF2FF] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35`;
  const valueClassName = typeof value === "number"
    ? "text-[21px] font-bold leading-none text-[#0F172A]"
    : "text-[13px] font-bold leading-tight text-[#0F172A]";
  const content = (
    <>
      <p className={valueClassName}>{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button className={interactiveClassName} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={className}>
      {content}
    </div>
  );
}

type PersonOutcomeEntry =
  | {
    date: string | null;
    event: DosAppFruitEvent;
    id: string;
    type: "fruit";
  }
  | {
    date: string | null;
    id: string;
    testimony: DosAppParticipantTestimony;
    type: "testimony";
  };

function ActivityFilterCard({
  active,
  helper,
  icon,
  label,
  onClick,
  value,
}: {
  active?: boolean;
  helper?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  value: number;
}) {
  const className = `min-w-0 overflow-hidden rounded-[18px] border px-2.5 py-3 text-left transition-all max-[350px]:rounded-[16px] max-[350px]:px-2 ${
    active
      ? "border-[#2563EB] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_14px_30px_rgba(37,99,235,0.26)]"
      : "border-[#E2E8F0] bg-white text-[#0F172A] shadow-[0_8px_22px_rgba(37,99,235,0.045)]"
  }`;
  const content = (
    <>
      <span className="flex items-center justify-between gap-1.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? "bg-white/18 text-white ring-1 ring-white/30" : "bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]"} max-[350px]:h-7 max-[350px]:w-7`}>
          {icon}
        </span>
        <span className={`text-[24px] font-bold leading-none max-[350px]:text-[21px] ${active ? "text-white" : "text-[#0F172A]"}`}>{value}</span>
      </span>
      <span className={`mt-3 block truncate text-[8px] font-bold uppercase tracking-[0.1em] max-[350px]:tracking-[0.06em] ${active ? "text-white/82" : "text-[#64748B]"}`} style={{ fontFamily: font.rajdhani }}>
        {label}
      </span>
      {helper ? <span className={`mt-0.5 line-clamp-2 block text-[10px] font-semibold leading-3 ${active ? "text-white/72" : "text-[#94A3B8]"}`}>{helper}</span> : null}
    </>
  );

  if (!onClick) {
    return (
      <div className={className}>
        {content}
      </div>
    );
  }

  return (
    <button
      aria-pressed={active}
      className={`${className} active:scale-[0.98] hover:border-[#BFDBFE] hover:bg-[#F8FAFC]`}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  );
}

function FruitSummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const isShortValue = value.length <= 3;

  return (
    <div className="flex min-h-[108px] min-w-0 flex-col items-center justify-between rounded-[18px] border border-[#E2E8F0] bg-white px-2 py-3 text-center shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:min-h-[104px] max-[350px]:rounded-[16px] max-[350px]:px-1.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
        {icon}
      </span>
      <span className="mt-2 flex min-h-[34px] w-full min-w-0 items-center justify-center px-0.5">
        <span className={`max-w-full whitespace-normal text-center font-bold text-[#0F172A] ${
          isShortValue
            ? "text-[24px] leading-none max-[350px]:text-[21px]"
            : "text-[12px] leading-[0.95rem] max-[350px]:text-[10.5px] max-[350px]:leading-[0.85rem]"
        }`}>
          {value}
        </span>
      </span>
      <span className="mt-2 block w-full text-center text-[8px] font-bold uppercase leading-3 tracking-[0.08em] text-[#64748B] max-[350px]:tracking-[0.04em]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </span>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F1F5F9] px-3 py-3.5">
      <p className="line-clamp-2 text-sm font-bold leading-tight text-[#0F172A]">{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
    </div>
  );
}

function PersonSummaryTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  const isShortValue = value.length <= 3;

  return (
    <div className="min-w-0 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white px-2.5 py-3 text-left shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:rounded-[16px] max-[350px]:px-2">
      <span className="flex items-center justify-between gap-1.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
          {icon}
        </span>
        <span className={`min-w-0 text-right font-bold text-[#0F172A] ${isShortValue ? "text-[24px] leading-none max-[350px]:text-[21px]" : "line-clamp-2 text-[12px] leading-4 max-[350px]:text-[10px] max-[350px]:leading-[0.85rem]"}`}>
          {value}
        </span>
      </span>
      <span className="mt-3 block truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748B] max-[350px]:tracking-[0.06em]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </span>
    </div>
  );
}

function SnapshotMetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[104px] min-w-0 flex-col items-center justify-between overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white px-2.5 py-3 text-center shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:min-h-[96px] max-[350px]:rounded-[16px] max-[350px]:px-1.5 max-[350px]:py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
        {icon}
      </span>
      <span className="mt-2 flex min-h-[30px] min-w-0 items-center justify-center max-[350px]:mt-1.5 max-[350px]:min-h-[28px]">
        <span className="line-clamp-2 min-w-0 break-words text-[12px] font-bold leading-4 text-[#0F172A] max-[350px]:text-[10px] max-[350px]:leading-[0.85rem]">
          {value}
        </span>
      </span>
      <span className="mt-2 block w-full truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748B] max-[350px]:mt-1.5 max-[350px]:tracking-[0.06em]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </span>
    </div>
  );
}

function EngagementSnapshotTile({
  label,
  score,
}: {
  label: string;
  score: string;
}) {
  return (
    <div className="flex min-h-[104px] min-w-0 flex-col items-center justify-between overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white px-2.5 py-3 text-center shadow-[0_8px_22px_rgba(37,99,235,0.045)] max-[350px]:min-h-[96px] max-[350px]:rounded-[16px] max-[350px]:px-1.5 max-[350px]:py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
        <Droplet className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <span className="mt-2 flex min-h-[30px] min-w-0 items-center justify-center gap-1 max-[350px]:mt-1.5 max-[350px]:min-h-[28px] max-[350px]:gap-0.5">
        <span className="shrink-0 text-[16px] font-bold leading-none text-[#0F172A] max-[350px]:text-[14px]">{score}</span>
        <span className="line-clamp-1 min-w-0 text-[9px] font-bold leading-none text-[#64748B] max-[350px]:text-[7.5px]">
          {label}
        </span>
      </span>
      <span className="mt-2 block w-full truncate text-[8px] font-bold uppercase tracking-[0.1em] text-[#64748B] max-[350px]:mt-1.5 max-[350px]:tracking-[0.06em]" style={{ fontFamily: font.rajdhani }}>
        Engagement
      </span>
    </div>
  );
}

function DetailResultTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[78px] min-w-0 max-w-full items-center gap-2.5 overflow-hidden rounded-[18px] border border-[#D7F3DD] bg-white px-3 py-3 shadow-[0_8px_22px_rgba(22,163,74,0.05)] max-[350px]:gap-1.5 max-[350px]:rounded-[16px] max-[350px]:px-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ECFDF3] text-[#16A34A] ring-1 ring-[#BBF7D0] max-[350px]:h-8 max-[350px]:w-8">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-[8px] font-bold uppercase leading-3 tracking-[0.13em] text-[#94A3B8] max-[350px]:text-[7px] max-[350px]:leading-[0.8rem] max-[350px]:tracking-[0.08em]" style={{ fontFamily: font.rajdhani }}>
          {label}
        </span>
        <span className="mt-1 line-clamp-2 block break-words text-[13px] font-bold leading-[1.15] text-[#15803D] max-[350px]:text-[12px]">{value}</span>
      </span>
    </div>
  );
}

function SectionHeading({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
        {title}
      </h2>
      {action}
    </div>
  );
}

function TabPageHeader({
  action,
  title,
}: {
  action?: ReactNode;
  title: string;
}) {
  return (
    <header className="flex min-h-10 items-center justify-between gap-3">
      <h1 className="text-[18px] font-black uppercase tracking-[0.12em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
        {title}
      </h1>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

function TabHero({
  desktopCompact = false,
  icon,
  onScriptureClick,
  scripture,
  subtitle,
  title,
}: {
  desktopCompact?: boolean;
  icon: ReactNode;
  onScriptureClick: (scripture: ScriptureReference, event: MouseEvent<HTMLButtonElement>) => void;
  scripture?: ScriptureReference;
  subtitle?: string;
  title: string;
}) {
  const sectionClassName = desktopCompact
    ? "overflow-hidden rounded-[34px] bg-white px-5 py-5 shadow-[0_24px_70px_rgba(37,99,235,0.075)] md:rounded-[22px] md:px-4 md:py-3 md:shadow-[0_10px_26px_rgba(37,99,235,0.04)] xl:px-4"
    : "overflow-hidden rounded-[34px] bg-white px-5 py-5 shadow-[0_24px_70px_rgba(37,99,235,0.075)] md:rounded-[24px] md:px-4 md:py-3 md:shadow-[0_12px_34px_rgba(37,99,235,0.045)] xl:px-5";
  const titleClassName = desktopCompact
    ? "text-[24px] font-black leading-[1.02] tracking-[-0.035em] text-[#0F172A] max-[350px]:text-[22px] md:text-[19px]"
    : "text-[24px] font-black leading-[1.02] tracking-[-0.035em] text-[#0F172A] max-[350px]:text-[22px] md:text-[20px]";

  return (
    <section className={sectionClassName}>
      <div className="flex items-center gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#EFF6FF] text-[#2563EB] shadow-[inset_0_0_0_1px_#DCEBFF] md:h-10 md:w-10 md:rounded-[16px]">
          {icon}
        </span>
        <span className="min-w-0">
          <h2 className={titleClassName} style={{ fontFamily: font.oswald }}>{title}</h2>
          {subtitle ? <p className="mt-1 text-[13px] leading-5 text-[#64748B] md:line-clamp-1">{subtitle}</p> : null}
          {scripture ? (
            <button
              className="mt-3 inline-flex rounded-full text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB] transition-colors hover:text-[#1D4ED8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25 md:mt-1.5"
              onClick={(event) => onScriptureClick(scripture, event)}
              style={{ fontFamily: font.rajdhani }}
              type="button"
            >
              {scripture.reference}
            </button>
          ) : null}
        </span>
      </div>
    </section>
  );
}

function ScriptureQuickView({
  onClose,
  state,
}: {
  onClose: () => void;
  state: ScriptureQuickViewState;
}) {
  const touchStartYRef = useRef<number | null>(null);

  return (
    <div
      className="absolute inset-0 z-[92] bg-white/35 backdrop-blur-[1.5px]"
      onPointerDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="absolute left-4 right-4 rounded-[24px] border border-[#DCEBFF] bg-white/95 p-4 shadow-[0_18px_48px_rgba(37,99,235,0.16)] ring-1 ring-white/80 transition duration-150 ease-out"
        onPointerDown={(event) => event.stopPropagation()}
        onTouchEnd={(event) => {
          const startY = touchStartYRef.current;
          touchStartYRef.current = null;

          if (startY !== null && event.changedTouches[0] && event.changedTouches[0].clientY - startY > 34) {
            onClose();
          }
        }}
        onTouchStart={(event) => {
          touchStartYRef.current = event.touches[0]?.clientY ?? null;
        }}
        role="dialog"
        style={{ top: state.top }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#0F172A]">{state.scripture.reference}</h2>
            <p className="mt-2 text-[13px] font-medium leading-6 text-[#334155]">{state.scripture.text}</p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
              KJV
            </p>
          </div>
          <button
            aria-label="Close scripture"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-[#64748B] transition-colors hover:bg-[#EBF2FF] hover:text-[#1D4ED8]"
            onClick={onClose}
            type="button"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
          </button>
        </div>
      </section>
    </div>
  );
}

function LibrarySection({
  children,
  subtext,
  title,
}: {
  children: ReactNode;
  subtext?: string;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          {title}
        </h2>
        {subtext ? <p className="mt-1 text-xs leading-5 text-[#64748B]">{subtext}</p> : null}
      </div>
      {children}
    </section>
  );
}

function followUpResourceIcon(title: string) {
  switch (title) {
    case "Attending Church":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Church };
    case "Daily Bible Reading":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: BookOpen };
    case "Baptism":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Droplet };
    case "Biblical Giving":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Gift };
    case "Discipleship":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Users };
    case "Evangelism":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Megaphone };
    case "Prayer and Fasting":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Flame };
    case "Sabbath":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Moon };
    case "Spiritual Gifts":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Sparkles };
    default:
      return { className: "bg-[#F1F5F9] text-[#64748B]", IconComponent: BookOpen };
  }
}

function catalogResourceIcon(icon: DosResourceIcon) {
  switch (icon) {
    case "church":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Church };
    case "bible":
    case "book":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: BookOpen };
    case "baptism":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Droplet };
    case "giving":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Gift };
    case "discipleship":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Users };
    case "fasting":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Flame };
    case "sabbath":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Moon };
    case "sparkles":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Sparkles };
    case "heart":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Heart };
    case "relationship":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: HeartHandshake };
    case "prayer":
      return { className: "bg-[#EBF2FF] text-[#2563EB]", IconComponent: Heart };
    case "send":
      return { className: "bg-[#EBF2FF] text-[#1D4ED8]", IconComponent: Send };
    case "hospitality":
    default:
      return { className: "bg-[#F1F5F9] text-[#64748B]", IconComponent: BookOpen };
  }
}

function CatalogResourceRow({
  actionLabel = "Open",
  onClick,
  resource,
}: {
  actionLabel?: string;
  onClick?: () => void;
  resource: DosResource;
}) {
  const { className: iconClassName, IconComponent } = catalogResourceIcon(resource.icon);
  const typeLabel = resourceTypeLabel(resource);
  const rowContent = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        <IconComponent className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="block text-sm font-semibold leading-tight text-[#0F172A]">{resource.title}</span>
          <span className="shrink-0 rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            {typeLabel}
          </span>
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs leading-4 text-[#64748B]">{resource.description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
        {actionLabel}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        className="group flex min-h-[64px] w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#FFFFFF]"
        onClick={onClick}
        type="button"
      >
        {rowContent}
      </button>
    );
  }

  return (
    <a
      className="group flex min-h-[64px] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[#FFFFFF]"
      href={resource.path}
      rel={resource.path.endsWith(".pdf") ? "noopener noreferrer" : undefined}
      target={resource.path.endsWith(".pdf") ? "_blank" : undefined}
    >
      {rowContent}
    </a>
  );
}

function resourceTypeLabel(resource: DosResource) {
  switch (resource.type) {
    case "assessment":
      return "Assessment";
    case "prayer":
      return "Prayer";
    case "challenge":
      return "Challenge";
    case "guide":
    case "teaching":
    default:
      return "Teaching";
  }
}

function CatalogResourceList({
  actionLabel,
  resources,
}: {
  actionLabel?: string;
  resources: readonly DosResource[];
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
      <div className="divide-y divide-[#EBF2FF]">
        {resources.map((resource) => (
          <CatalogResourceRow actionLabel={actionLabel} key={resource.id} resource={resource} />
        ))}
      </div>
    </article>
  );
}

function FeaturedTeachingCard({
  description,
  href,
  title,
}: {
  description: string;
  href: string;
  title: string;
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-[#EAF2FF] bg-white shadow-[0_18px_48px_rgba(37,99,235,0.07)]">
      <div className="relative p-4 pb-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            Start here
          </span>
          <h3 className="mt-3 text-lg font-black leading-tight tracking-[-0.025em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>{title}</h3>
          <p className="mt-1 text-xs font-medium leading-4 text-[#64748B]">{description}</p>
        </div>
        <div className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-[inset_0_0_0_1px_#DCEBFF]">
          <BookOpen className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </div>
      </div>
      <div className="border-t border-[#EFF6FF] bg-white p-3">
        <a
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-[11px] font-bold text-white transition-colors hover:brightness-[0.98]"
          href={href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
          Open Teaching
        </a>
      </div>
    </article>
  );
}

function TableTeachingRow({
  description,
  href,
  title,
}: {
  description: string;
  href: string;
  title: string;
}) {
  const shortDescription = title === "Four Questions" ? "Honesty, help, surrender, and obedience." : description;

  return (
    <a
      className="flex min-h-[72px] items-center gap-2.5 rounded-[22px] border border-[#EAF2FF] bg-white px-3 py-2.5 shadow-[0_12px_30px_rgba(37,99,235,0.045)] transition-colors hover:border-[#BFDBFE]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#EBF2FF] text-[#1D4ED8]">
        <MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-[#0F172A]">{title}</span>
        <span className="mt-1 block line-clamp-2 text-xs leading-4 text-[#64748B]">{shortDescription}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
        Open
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
      </span>
    </a>
  );
}

function FollowUpGuideRow({
  description,
  href,
  title,
}: {
  description: string;
  href: string;
  title: string;
}) {
  const { className: iconClassName, IconComponent } = followUpResourceIcon(title);

  return (
    <a
      className="group flex min-h-[64px] items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[#FFFFFF]"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        <IconComponent className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight text-[#0F172A]">{title}</span>
        <span className="mt-0.5 block line-clamp-1 text-xs leading-4 text-[#64748B]">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-0.5" aria-hidden="true" strokeWidth={1.9} />
    </a>
  );
}

function FollowUpGuideList() {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
      <div className="divide-y divide-[#EBF2FF]">
        {dosFollowUpGuideResources.map((guide) => (
          <FollowUpGuideRow
            description={guide.description}
            href={guide.href}
            key={guide.href}
            title={guide.title}
          />
        ))}
      </div>
    </article>
  );
}

function usamStatusLabel(status: DosAppData["usamApplication"]["status"]) {
  switch (status) {
    case "active":
      return "Active";
    case "application_started":
      return "Started";
    case "application_submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "archived":
      return "Archived";
    case "independent":
      return "Independent";
    case "pending_review":
      return "Pending Review";
    case "rejected":
      return "Not Approved";
    case "not_connected":
    default:
      return "Independent";
  }
}

function usamProfileStatusLabel(status: DosAppData["usamApplication"]["profileStatus"]) {
  switch (status) {
    case "approved":
      return "Approved Draft";
    case "archived":
      return "Archived";
    case "hidden":
      return "Hidden";
    case "published":
      return "Published";
    case "under_review":
      return "Under Review";
    case "draft":
    default:
      return "Draft";
  }
}

function defaultUsamApplicationDraft(data: DosAppData): UsamApplicationDraft {
  return {
    applicantEmail: data.workspace.userEmail ?? "",
    applicantName: data.workspace.userFullName ?? data.workspace.displayName,
    applicantPhone: data.workspace.userPhone ?? "",
    callingReason: data.workspace.shortMission ?? "",
    location: data.workspace.stateName ?? "",
    ministryFocus: "",
    monthlyBudget: "",
    prayerNeeds: "",
    profilePhotoUrl: data.workspace.profileImageUrl ?? "",
    referencesText: "",
    storyTestimony: "",
    supportGoal: "",
  };
}

function buildUsamApplicationCallingFocus(draft: Pick<UsamApplicationDraft, "callingReason" | "ministryFocus">) {
  return [
    ["Calling", draft.callingReason],
    ["Ministry focus", draft.ministryFocus],
  ]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join("\n\n");
}

function OrganizationStatusCard({
  application,
  message,
  onApply,
  onCopyPublicLink,
  onViewStatus,
  publicProfileHref,
}: {
  application: DosAppData["usamApplication"];
  message: { text: string; tone: "error" | "success" } | null;
  onApply: () => void;
  onCopyPublicLink: () => void;
  onViewStatus: () => void;
  publicProfileHref: string;
}) {
  const isPending = application.status === "application_submitted" || application.status === "pending_review";
  const isActive = application.status === "active" || application.status === "approved";
  const canApply = !isPending && application.status !== "rejected" && application.status !== "archived";
  const applyButtonLabel = application.status === "active" || application.status === "approved"
    ? "Submit Update"
    : "Apply to USA Missionaries";

  return (
    <section className={`rounded-[28px] border p-4 ${
      isPending
        ? "border-[#E2E8F0] bg-[#F8FAFC] shadow-[0_12px_32px_rgba(15,23,42,0.04)]"
        : "border-[#DCEBFF] bg-white shadow-[0_18px_48px_rgba(37,99,235,0.07)]"
    }`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] ${
          isPending ? "bg-white text-[#64748B] ring-1 ring-[#E2E8F0]" : "bg-[#EBF2FF] text-[#2563EB]"
        }`}>
          <Briefcase className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-black leading-tight tracking-[-0.02em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
              Organization
            </h2>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
              isActive
                ? "bg-[#ECFDF3] text-[#15803D]"
                : isPending
                  ? "bg-[#FFF7ED] text-[#C2410C]"
                  : "bg-[#F1F5F9] text-[#64748B]"
            }`} style={{ fontFamily: font.rajdhani }}>
              {usamStatusLabel(application.status)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-[#64748B]">
            {isActive
              ? `Connected to ${application.organizationName}.`
              : isPending
                ? "Application submitted. Pending review."
                : "You are using DOS independently."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-2">
          <span className="text-xs font-semibold text-[#64748B]">Public profile</span>
          <span className="text-xs font-bold text-[#0F172A]">{usamProfileStatusLabel(application.profileStatus)}</span>
        </div>
        {application.appliedAt ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-2">
            <span className="text-xs font-semibold text-[#64748B]">Applied</span>
            <span className="text-xs font-bold text-[#0F172A]">{formatDate(application.appliedAt)}</span>
          </div>
        ) : null}
      </div>

      {message ? (
        <p className={`mt-3 rounded-2xl border px-3 py-2 text-sm ${
          message.tone === "success"
            ? "border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {message.text}
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        {canApply ? (
          <button
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition-colors hover:brightness-[0.98]"
            onClick={onApply}
            type="button"
          >
            {applyButtonLabel}
          </button>
        ) : null}
        {isPending ? (
          <button
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-bold text-[#475569] transition-colors hover:border-[#BFDBFE]"
            onClick={onViewStatus}
            type="button"
          >
            View application status
          </button>
        ) : null}
        {application.publicProfileLive ? (
          <div className="grid grid-cols-2 gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#0F172A] transition-colors hover:border-[#BFDBFE]"
              href={publicProfileHref}
            >
              View Profile
            </Link>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#0F172A] transition-colors hover:border-[#BFDBFE]"
              onClick={onCopyPublicLink}
              type="button"
            >
              Copy Link
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function UsamPendingHomeCard({ onViewStatus }: { onViewStatus: () => void }) {
  return (
    <section className="hidden rounded-[26px] border border-[#E2E8F0] bg-[#F8FAFC] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.04)] md:block">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#64748B] ring-1 ring-[#E2E8F0]">
          <Briefcase className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-tight text-[#0F172A]">USA Missionaries application pending</p>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">
            Your application has been submitted and is waiting for review.
          </p>
        </div>
      </div>
      <button
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-xs font-bold text-[#475569] transition-colors hover:border-[#BFDBFE]"
        onClick={onViewStatus}
        type="button"
      >
        View application status
      </button>
    </section>
  );
}

function DesktopPanel({
  action,
  children,
  className = "",
  compact = false,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className={`${compact ? "rounded-[22px] p-3.5 xl:p-4" : "rounded-[24px] p-4 xl:p-5"} border border-[#EAF2FF] bg-white shadow-[0_14px_34px_rgba(37,99,235,0.045)] ${className}`}>
      {eyebrow || title ? (
        <div className={`${compact ? "mb-2.5" : "mb-3"} flex items-start justify-between gap-3`}>
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
                {eyebrow}
              </p>
            ) : null}
            {title ? <h2 className="mt-0.5 text-base font-black leading-tight tracking-[-0.02em] text-[#0F172A] xl:text-lg">{title}</h2> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function DashboardHeaderAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-1.5 rounded-full px-1 text-xs font-bold text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
      onClick={onClick}
      type="button"
    >
      {children}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
    </button>
  );
}

function DesktopSettingsRow({
  description,
  href,
  icon,
  label,
  meta,
  onClick,
}: {
  description?: string;
  href?: string;
  icon: ReactNode;
  label: string;
  meta?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[#0F172A]">{label}</span>
        {description ? <span className="mt-0.5 block truncate text-xs font-medium text-[#64748B]">{description}</span> : null}
      </span>
      {meta ? <span className="shrink-0 text-xs font-bold text-[#64748B]">{meta}</span> : null}
      {onClick || href ? <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} /> : null}
    </>
  );
  const className = "flex min-h-[58px] min-w-0 items-center gap-3 rounded-[18px] border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2.5 text-left transition-colors hover:border-[#BFDBFE] hover:bg-white";

  if (href) {
    return (
      <Link className={className} href={href}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function DesktopSettingsProfileView({
  application,
  email,
  missionaryLayerStatus,
  name,
  onEditProfile,
  onOpenCircles,
  onOpenMissionaryProfile,
  onOpenPrayerTeam,
  onOpenSupportTeam,
  onViewApplicationStatus,
  organizationName,
  phone,
  photoUrl,
  publicProfileHref,
  stateName,
  workspaceName,
}: {
  application: DosAppData["usamApplication"];
  email: string;
  missionaryLayerStatus: string;
  name: string;
  onEditProfile: () => void;
  onOpenCircles: () => void;
  onOpenMissionaryProfile: () => void;
  onOpenPrayerTeam: () => void;
  onOpenSupportTeam: () => void;
  onViewApplicationStatus: () => void;
  organizationName?: string | null;
  phone: string;
  photoUrl?: string | null;
  publicProfileHref: string;
  stateName?: string | null;
  workspaceName: string;
}) {
  const formattedPhone = formatPhoneNumber(phone) || phone;
  const workspaceStateLabel = cleanIdentitySegment(stateName) ?? "Not set";
  const workspaceOrganizationLabel = cleanIdentitySegment(organizationName) ?? cleanIdentitySegment(application.organizationName) ?? "Not attached";
  const organizationDescription = application.organizationName
    ? `${application.organizationName} layer`
    : "Optional organization layer";

  return (
    <div className="hidden md:block">
      <TabPageHeader title="Settings" />

      <div className="mx-auto mt-4 grid max-w-[1100px] gap-3">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
          <DesktopPanel action={<DashboardHeaderAction onClick={onEditProfile}>Edit Profile</DashboardHeaderAction>} compact eyebrow="Profile">
            <div className="flex min-w-0 items-center gap-4 rounded-[18px] border border-[#EAF2FF] bg-[#F8FBFF] p-3">
              <UserProfileAvatar imageUrl={photoUrl} name={name} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[24px] font-black leading-tight tracking-[-0.035em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
                  {name}
                </h2>
                <p className="mt-1 truncate text-sm font-semibold text-[#64748B]">{email || "No email added"}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <DesktopSettingsRow
                description="DOS app profile photo."
                icon={<Camera className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Photo"
                meta={photoUrl ? "Added" : "Initials"}
                onClick={onEditProfile}
              />
              <DesktopSettingsRow
                description={name || "No name added"}
                icon={<User className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Name"
                onClick={onEditProfile}
              />
              <DesktopSettingsRow
                description={email || "No email added"}
                icon={<Mail className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Email"
                onClick={onEditProfile}
              />
              <DesktopSettingsRow
                description={formattedPhone || "No phone added"}
                icon={<Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Phone"
                onClick={onEditProfile}
              />
            </div>
          </DesktopPanel>

          <DesktopPanel compact eyebrow="Workspace">
            <div className="grid gap-2">
              <DesktopSettingsRow
                description="Workspace Name"
                icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label={workspaceName}
                meta="Current"
              />
              <DesktopSettingsRow
                description={workspaceStateLabel}
                icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="State"
              />
              <DesktopSettingsRow
                description={workspaceOrganizationLabel}
                icon={<Church className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Organization"
              />
              <DesktopSettingsRow
                description="View My 3, My 12, My 70, and My 120."
                icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Field & circles"
                onClick={onOpenCircles}
              />
              <DesktopSettingsRow
                description="Choose another DOS workspace."
                href="/dos"
                icon={<RefreshCw className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Switch Workspace"
              />
            </div>
          </DesktopPanel>
        </div>

        <div className="grid gap-3">
          {/* TODO: Later conditionally show this section only after USA Missionaries onboarding/application approval or organization attachment. */}
          <DesktopPanel compact eyebrow="USA Missionaries">
            <div className="grid gap-2">
              <DesktopSettingsRow
                description={organizationDescription}
                icon={<User className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Missionary Profile"
                meta={missionaryLayerStatus}
                onClick={onOpenMissionaryProfile}
              />
              <DesktopSettingsRow
                description="Prayer partners and public profile prayer needs."
                icon={<HeartHandshake className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Prayer Team"
                meta={application.publicProfileLive ? "Live" : "Layer"}
                onClick={onOpenPrayerTeam}
              />
              <DesktopSettingsRow
                description="Support partners, giving progress, and support status."
                icon={<Gift className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Support Team"
                meta={application.publicProfileLive ? "Live" : "Layer"}
                onClick={onOpenSupportTeam}
              />
              <DesktopSettingsRow
                description={application.appliedAt ? `Submitted ${formatDate(application.appliedAt)}` : "No application submitted yet."}
                icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Application Status"
                meta={usamStatusLabel(application.status)}
                onClick={onViewApplicationStatus}
              />
              {application.publicProfileLive ? (
                <DesktopSettingsRow
                  description="Open the public missionary profile."
                  href={publicProfileHref}
                  icon={<ExternalLink className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Public Profile"
                  meta={usamProfileStatusLabel(application.profileStatus)}
                />
              ) : null}
            </div>
          </DesktopPanel>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <DesktopPanel compact eyebrow="Preferences">
            <div className="grid gap-2">
              <DesktopSettingsRow
                description="Prayer, meeting, and follow-up nudges."
                icon={<Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Notifications"
                meta="On"
              />
              <DesktopSettingsRow
                description="Use system appearance."
                icon={<Palette className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Appearance"
                meta="System"
              />
            </div>
          </DesktopPanel>

          <DesktopPanel compact eyebrow="Account">
            <div className="grid gap-2">
              <DesktopSettingsRow
                description="End this DOS session."
                href="/api/access/logout"
                icon={<LogOut className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Sign out"
              />
              <DesktopSettingsRow
                description="Get help with your DOS workspace."
                icon={<HelpCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Help and Support"
                meta={<ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />}
              />
              <DesktopSettingsRow
                description="Review privacy and terms."
                icon={<Shield className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                label="Privacy & terms"
                meta={<ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />}
              />
            </div>
          </DesktopPanel>
        </div>
      </div>
    </div>
  );
}

function DesktopQuickActionButton({
  children,
  icon,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  icon: IconName;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors ${
        primary
          ? "bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] hover:brightness-[0.98]"
          : "border border-[#DCEBFF] bg-white text-[#1D4ED8] hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon name={icon} size={15} />
      <span className="truncate">{children}</span>
    </button>
  );
}

function DesktopUpcomingMeetingsCard({
  meetings,
  onOpenMeeting,
  onScheduleMeeting,
  people,
}: {
  meetings: DosAppMeeting[];
  onOpenMeeting: (meetingId: string) => void;
  onScheduleMeeting: () => void;
  people: DosAppPerson[];
}) {
  return (
    <DesktopPanel eyebrow="Table" title="Upcoming Tables">
      <div className="grid gap-2">
        {meetings.length ? meetings.map((meeting) => (
          <button
            className="flex min-w-0 items-center gap-3 rounded-[18px] bg-[#F8FAFC] px-3 py-2.5 text-left transition-colors hover:bg-[#EBF2FF]"
            key={meeting.id}
            onClick={() => onOpenMeeting(meeting.id)}
            type="button"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
              <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#0F172A]">{meetingDisplayTitle(meeting, people)}</span>
              <span className="mt-1 block truncate text-xs text-[#64748B]">{formatMeetingTimeRange(meeting)}</span>
            </span>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
              {meetingSyncLabel(meeting)}
            </span>
          </button>
        )) : (
          <div className="rounded-[20px] bg-[#F8FAFC] px-4 py-4 text-sm leading-6 text-[#64748B]">
            No tables scheduled yet.
          </div>
        )}
      </div>
      <button
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
        onClick={onScheduleMeeting}
        type="button"
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        Schedule Table
      </button>
    </DesktopPanel>
  );
}

function DesktopNextStepsPanel({
  items,
  onEditReminder,
  onLogMeetingForPerson,
  onOpenMeeting,
  onOpenPerson,
  onScheduleForPerson,
}: {
  items: UpcomingTimelineItem[];
  onEditReminder: (reminderId: string) => void;
  onLogMeetingForPerson: (personId: string) => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenPerson: (personId: string) => void;
  onScheduleForPerson: (personId?: string | string[]) => void;
}) {
  const primaryPersonId = items.find((item) => item.personId)?.personId ?? null;

  return (
    <DesktopPanel eyebrow="Next" title="Next Steps">
      <div className="grid gap-2">
        {items.length ? items.slice(0, 4).map((item) => (
          <button
            className="flex min-w-0 items-center gap-3 rounded-[18px] bg-[#F8FAFC] px-3 py-2.5 text-left transition-colors hover:bg-[#EBF2FF]"
            key={item.id}
            onClick={() => {
              if (item.meeting) {
                onOpenMeeting(item.meeting.id);
              } else if (item.reminder) {
                onEditReminder(item.reminder.id);
              }
            }}
            type="button"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
              <TimelineIcon icon={item.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#0F172A]">{nextStepTitle(item)}</span>
              <span className="mt-1 block truncate text-xs text-[#64748B]">{item.label}</span>
            </span>
          </button>
        )) : (
          <p className="rounded-[20px] bg-[#F8FAFC] px-4 py-4 text-sm leading-6 text-[#64748B]">
            No next steps queued. Ask the Lord who to encourage next.
          </p>
        )}
      </div>

      {primaryPersonId ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <DesktopQuickActionButton icon="people" onClick={() => onOpenPerson(primaryPersonId)}>View person</DesktopQuickActionButton>
          <DesktopQuickActionButton icon="log" onClick={() => onLogMeetingForPerson(primaryPersonId)}>Log Table</DesktopQuickActionButton>
          <DesktopQuickActionButton icon="calendar" onClick={() => onScheduleForPerson(primaryPersonId)}>Schedule Table</DesktopQuickActionButton>
        </div>
      ) : (
        <button
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
          onClick={() => onScheduleForPerson()}
          type="button"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          Schedule Table
        </button>
      )}
    </DesktopPanel>
  );
}

function DesktopCirclePanel({
  circleGroups,
  onSelectCircle,
  onViewCircles,
}: {
  circleGroups: CircleLayerGroups;
  onSelectCircle: (circle: CircleFocusView) => void;
  onViewCircles: () => void;
}) {
  const my3Count = circleGroups.three.length;
  const my12Count = circleGroups.three.length + circleGroups.twelve.length;
  const my70Count = circleGroups.three.length + circleGroups.twelve.length + circleGroups.seventy.length;
  const my120Count = my70Count + circleGroups.my120.length;

  return (
    <DesktopPanel eyebrow="Circle" title="Your Circle">
      <div className="flex justify-center overflow-hidden">
        <div className="-my-6 scale-[0.78] xl:scale-[0.82]">
          <CircleTarget
            my12Count={my12Count}
            my120Count={my120Count}
            my3Count={my3Count}
            my70Count={my70Count}
            onSelectCircle={onSelectCircle}
          />
        </div>
      </div>
      <button
        className="mt-1 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.20)] transition-colors hover:brightness-[0.98]"
        onClick={onViewCircles}
        type="button"
      >
        See who's inside
      </button>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ["3", my3Count],
          ["12", my12Count],
          ["70", my70Count],
          ["120", my120Count],
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-[#F8FAFC] px-2 py-2" key={label}>
            <p className="text-sm font-black text-[#0F172A]">{value}</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>My {label}</p>
          </div>
        ))}
      </div>
    </DesktopPanel>
  );
}

type DosAppCatalogSectionKey = "coming_soon" | "installed" | "missionary";

type DesktopMoreAppItem = {
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  section: DosAppCatalogSectionKey;
  status: string;
};

type DosAppCatalogSection = {
  description: string;
  items: DesktopMoreAppItem[];
  label: string;
};

function DesktopMoreAppCard({ item }: { item: DesktopMoreAppItem }) {
  return (
    <button
      className="flex min-h-[112px] min-w-0 flex-col justify-between rounded-[22px] border border-[#EAF2FF] bg-white p-3.5 text-left shadow-[0_10px_28px_rgba(37,99,235,0.045)] transition-colors hover:border-[#BFDBFE] hover:bg-[#FBFDFF]"
      onClick={item.onClick}
      type="button"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
          {item.icon}
        </span>
        <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
          {item.status}
        </span>
      </span>
      <span className="mt-3 min-w-0">
        <span className="block text-base font-black leading-tight tracking-[-0.02em] text-[#0F172A]">{item.label}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#64748B]">{item.description}</span>
      </span>
    </button>
  );
}

function DesktopMoreAppsPreview({ apps }: { apps: DesktopMoreAppItem[] }) {
  return (
    <DesktopPanel eyebrow="Apps" title="Installed Apps">
      <div className="grid gap-3 sm:grid-cols-2">
        {apps.map((item) => (
          <DesktopMoreAppCard item={item} key={item.label} />
        ))}
      </div>
    </DesktopPanel>
  );
}

function AppsCatalogSection({ section }: { section: DosAppCatalogSection }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          {section.label}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[#64748B]">{section.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {section.items.map((item) => (
          <DesktopMoreAppCard item={item} key={item.label} />
        ))}
      </div>
    </section>
  );
}

function DesktopRecentActivityPanel({
  latestFruitActivity,
  latestMeeting,
  latestPrayerActivity,
  onOpenFruit,
  onOpenMeeting,
  onOpenMeetings,
  people,
}: {
  latestFruitActivity: { label: string } | null;
  latestMeeting: DosAppMeeting | undefined;
  latestPrayerActivity: { label: string; meetingId: string } | null;
  onOpenFruit: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenMeetings: () => void;
  people: DosAppPerson[];
}) {
  return (
    <DesktopPanel eyebrow="Activity" title="Recent Activity / Fruit">
      <div className="grid gap-2 md:grid-cols-3">
        {latestMeeting ? (
          <RecentActivityRow icon="log" onClick={onOpenMeetings} title="Latest table">
            {meetingDisplayTitle(latestMeeting, people)} · {meetingActivityTitle(latestMeeting)} · {formatRelativeDate(latestMeeting.date)}
          </RecentActivityRow>
        ) : null}
        {latestPrayerActivity ? (
          <RecentActivityRow icon="bell" onClick={() => onOpenMeeting(latestPrayerActivity.meetingId)} title="Latest prayer">
            {latestPrayerActivity.label}
          </RecentActivityRow>
        ) : null}
        {latestFruitActivity ? (
          <RecentActivityRow icon="fruit" onClick={onOpenFruit} title="Latest fruit">
            {latestFruitActivity.label}
          </RecentActivityRow>
        ) : null}
        {!latestMeeting && !latestPrayerActivity && !latestFruitActivity ? (
          <p className="rounded-[20px] bg-[#F8FAFC] px-4 py-4 text-sm text-[#64748B]">Log a table to begin your activity rhythm.</p>
        ) : null}
      </div>
    </DesktopPanel>
  );
}

function currentMonthRange(referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);

  return { end, start };
}

function monthKey(value: string | null | undefined) {
  const date = value ? parseDisplayDate(value) : null;

  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : null;
}

function monthShortLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(year, month - 1, 1));
}

function formatDashboardDuration(minutes: number) {
  if (!minutes) {
    return "0h";
  }

  return formatLoggedTime(minutes);
}

function dashboardTrendMonths(count = 12) {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    return {
      key,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    };
  });
}

type DashboardFruitItem = {
  date: string | null;
  description: string;
  id: string;
  title: string;
};

type DashboardPersonRow = {
  id: string | null;
  meta: string;
  name: string;
};

type DashboardUpcomingRow = {
  badge: string;
  icon: UpcomingTimelineIcon;
  id: string;
  label: string;
  meeting: DosAppMeeting | null;
  title: string;
};

function dashboardPersonRows(people: DosAppPerson[], fallbackNames: string[], metaFallback: string) {
  const realRows = people.slice(0, 3).map((person) => ({
    id: person.id,
    meta: person.relationshipType || metaFallback,
    name: person.name,
  }));

  if (realRows.length) {
    return realRows;
  }

  // UI-only fallback for visual review when the workspace has no rows for this dashboard slice.
  return fallbackNames.slice(0, 3).map((name) => ({
    id: null,
    meta: metaFallback,
    name,
  }));
}

function DashboardPersonMiniRow({ onOpenPerson, row }: { onOpenPerson: (personId: string) => void; row: DashboardPersonRow }) {
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[13px] bg-[#EBF2FF] text-[11px] font-black text-[#2563EB] ring-1 ring-[#DCEBFF]">
        {initials(row.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black leading-tight text-[#0F172A]">{row.name}</span>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#64748B]">{row.meta}</span>
      </span>
    </>
  );

  if (!row.id) {
    return <div className="flex min-w-0 items-center gap-2 rounded-[16px] bg-[#F8FBFF] px-2.5 py-2">{content}</div>;
  }

  const personId = row.id;

  return (
    <button
      className="flex min-w-0 items-center gap-2 rounded-[16px] bg-[#F8FBFF] px-2.5 py-2 text-left transition-colors hover:bg-[#EBF2FF]"
      onClick={() => onOpenPerson(personId)}
      type="button"
    >
      {content}
    </button>
  );
}

function DesktopHomeDashboard({
  circleGroups,
  fruitEvents,
  fruitItems,
  isUsamApplicationPending,
  loggedMeetings,
  onOpenFruit,
  onOpenMeeting,
  onOpenPerson,
  onOpenReports,
  onOpenTable,
  onOpenTableCalendar,
  onViewField,
  onViewUsamStatus,
  people,
  personTableStatsByPersonId,
  upcomingItems,
  upcomingMeetings,
}: {
  circleGroups: CircleLayerGroups;
  fruitEvents: DosAppFruitEvent[];
  fruitItems: DosAppFruit[];
  isUsamApplicationPending: boolean;
  loggedMeetings: DosAppMeeting[];
  onOpenFruit: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenPerson: (personId: string) => void;
  onOpenReports: () => void;
  onOpenTable: () => void;
  onOpenTableCalendar: () => void;
  onViewField: () => void;
  onViewUsamStatus: () => void;
  people: DosAppPerson[];
  personTableStatsByPersonId: Map<string, PersonTableStats>;
  upcomingItems: UpcomingTimelineItem[];
  upcomingMeetings: DosAppMeeting[];
}) {
  const { end: monthEnd, start: monthStart } = currentMonthRange();
  const loggedThisMonth = loggedMeetings.filter((meeting) => isDateWithinRange(meeting.date, monthStart, monthEnd));
  const scheduledUpcomingCount = upcomingMeetings.length;
  const monthDurationMinutes = loggedThisMonth.reduce((sum, meeting) => sum + tableDurationMinutes(meeting), 0);
  const totalDurationMinutes = loggedMeetings.reduce((sum, meeting) => sum + tableDurationMinutes(meeting), 0);
  const loggedWithDuration = loggedMeetings.filter((meeting) => tableDurationMinutes(meeting) > 0);
  const activePersonIds = new Set<string>();

  loggedThisMonth.forEach((meeting) => {
    meeting.fieldPersonIds.forEach((personId) => activePersonIds.add(personId));
  });

  people.forEach((person) => {
    if (isWithinLastDays(person.lastActivityAt, 30)) {
      activePersonIds.add(person.id);
    }
  });

  const newestPeople = people
    .slice()
    .sort((first, second) => dateSortValue(second.createdAt ?? second.lastActivityAt) - dateSortValue(first.createdAt ?? first.lastActivityAt));
  const circleCounts = {
    my3: circleGroups.three.length,
    my12: circleGroups.three.length + circleGroups.twelve.length,
    my70: circleGroups.three.length + circleGroups.twelve.length + circleGroups.seventy.length,
    my120: circleGroups.three.length + circleGroups.twelve.length + circleGroups.seventy.length + circleGroups.my120.length,
  };
  const activePeople = activePersonIds.size;
  const newThisMonth = people.filter((person) => isDateWithinRange(person.createdAt, monthStart, monthEnd)).length;
  const meetingsByMonth = loggedMeetings.reduce((map, meeting) => {
    const key = monthKey(meeting.date);

    if (!key) {
      return map;
    }

    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const mostActiveMonth = Array.from(meetingsByMonth.entries()).sort((first, second) => second[1] - first[1])[0] ?? null;
  const recentFruitItems: DashboardFruitItem[] = [
    ...fruitItems.map((fruit) => ({
      date: fruit.testimonyDate,
      description: fruit.submittedByName ? `${fruit.submittedByName} shared fruit` : "Fruit story recorded",
      id: `fruit-${fruit.id}`,
      title: fruit.summary || "Fruit recorded",
    })),
    ...fruitEvents.filter(isObservableFruitOutcome).map((event) => {
      const person = people.find((item) => item.id === event.personId) ?? null;

      return {
        date: event.date,
        description: person ? `${person.name} · ${formatDate(event.date)}` : formatDate(event.date),
        id: `event-${event.id}`,
        title: fruitOutcomeLabel(event),
      };
    }),
  ].sort((first, second) => dateSortValue(second.date) - dateSortValue(first.date)).slice(0, 4);
  const topTimeInvestments = people
    .map((person) => ({
      person,
      stats: personTableStatsByPersonId.get(person.id) ?? { meetings: 0, timeMinutes: 0 },
    }))
    .filter((item) => item.stats.timeMinutes > 0 || item.stats.meetings > 0)
    .sort((first, second) => second.stats.timeMinutes - first.stats.timeMinutes || second.stats.meetings - first.stats.meetings)
    .slice(0, 3);
  const trendMonths = dashboardTrendMonths();
  const trendData = trendMonths.map((month) => {
    const monthMeetings = loggedMeetings.filter((meeting) => monthKey(meeting.date) === month.key);
    const monthFruitCount = [
      ...fruitItems.filter((fruit) => monthKey(fruit.testimonyDate) === month.key),
      ...fruitEvents.filter((event) => monthKey(event.date) === month.key),
    ].length;

    return {
      fruit: monthFruitCount,
      hours: Math.round(monthMeetings.reduce((sum, meeting) => sum + tableDurationMinutes(meeting), 0) / 60),
      label: month.label,
      tables: monthMeetings.length,
    };
  });
  const trendMax = Math.max(1, ...trendData.flatMap((item) => [item.tables, item.hours, item.fruit]));
  const trendWidth = 720;
  const trendHeight = 112;
  const trendY = (value: number) => trendHeight - 20 - (value / trendMax) * 72;
  const trendX = (index: number) => 40 + index * ((trendWidth - 72) / Math.max(1, trendData.length - 1));
  const trendPoints = (key: "fruit" | "hours" | "tables") => trendData.map((item, index) => `${trendX(index)},${trendY(item[key])}`).join(" ");
  const averageDuration = loggedWithDuration.length ? Math.round(totalDurationMinutes / loggedWithDuration.length) : 0;
  const averageThisMonthDuration = loggedThisMonth.length && monthDurationMinutes ? Math.round(monthDurationMinutes / loggedThisMonth.length) : 0;
  const fieldHealthLists = [
    {
      label: "New",
      rows: dashboardPersonRows(newestPeople, ["Naomi Lee", "George Jenko", "Jason Waage"], "Recently added"),
    },
    {
      label: "My 3",
      rows: dashboardPersonRows(circleGroups.three.map((item) => item.person), ["Dirk Bond", "Brooke Fox", "Jason Waage"], "Focus relationship"),
    },
    {
      label: "My 12",
      rows: dashboardPersonRows(circleGroups.twelve.map((item) => item.person), ["Aaron Meyers", "George Jenko", "Naomi Lee"], "Active discipleship"),
    },
  ];
  const realUpcomingRows: DashboardUpcomingRow[] = upcomingItems.slice(0, 3).map((item) => ({
    badge: item.meeting ? "Scheduled" : item.icon === "birthday" ? "Birthday" : "Reminder",
    icon: item.icon,
    id: item.id,
    label: item.label,
    meeting: item.meeting ?? null,
    title: nextStepTitle(item),
  }));
  // UI-only fallback rows for visual QA; these are never written to Supabase.
  const dashboardSampleUpcomingRows: DashboardUpcomingRow[] = [
    { badge: "Scheduled", icon: "meeting", id: "sample-naomi-table", label: "Jun 6, 2026 · 6:00 PM", meeting: null, title: "Meet with Naomi Lee" },
    { badge: "Coffee", icon: "meeting", id: "sample-jason-coffee", label: "Jun 8, 2026 · 9:00 AM", meeting: null, title: "Coffee with Jason Waage" },
    { badge: "Follow Up", icon: "reminder", id: "sample-family-follow-up", label: "Jun 10, 2026 · 7:00 PM", meeting: null, title: "Family follow-up" },
  ];
  const dashboardUpcomingRows = realUpcomingRows.length >= 3 ? realUpcomingRows : dashboardSampleUpcomingRows;

  return (
    <div className="hidden md:block">
      {isUsamApplicationPending ? (
        <div className="mb-3">
          <UsamPendingHomeCard onViewStatus={onViewUsamStatus} />
        </div>
      ) : null}

      <header className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-black leading-none tracking-[-0.035em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            Dashboard
          </h1>
        </div>
        <span className="inline-flex min-h-10 items-center gap-2 rounded-[15px] border border-[#DCEBFF] bg-white px-4 text-sm font-bold text-[#0F172A] shadow-[0_10px_24px_rgba(37,99,235,0.04)]">
          <CalendarDays className="h-4 w-4 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
          This Month
        </span>
      </header>

      <div className="grid w-full gap-3">
      <div className="grid gap-3 min-[1200px]:grid-cols-[minmax(560px,1.18fr)_minmax(332px,0.82fr)] min-[1360px]:grid-cols-[minmax(620px,1.15fr)_minmax(420px,0.85fr)]">
        <DesktopPanel action={<DashboardHeaderAction onClick={onViewField}>View Field</DashboardHeaderAction>} className="min-h-[198px] min-w-0" compact eyebrow="Field Health">
          <div className="grid gap-3 min-[1180px]:grid-cols-[1.05fr_1.8fr]">
            <section className="min-w-0 rounded-[20px] border border-[#EAF2FF] bg-white/80 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>New</h3>
                <span className="text-[11px] font-bold text-[#64748B]">{newThisMonth} this month</span>
              </div>
              <div className="grid gap-2">
                {fieldHealthLists[0].rows.map((row) => <DashboardPersonMiniRow key={`${fieldHealthLists[0].label}-${row.name}`} onOpenPerson={onOpenPerson} row={row} />)}
              </div>
            </section>
            <div className="grid gap-3 min-[1180px]:grid-cols-2">
              {fieldHealthLists.slice(1).map((list) => (
                <section className="min-w-0 rounded-[20px] border border-[#EAF2FF] bg-[#F8FBFF] p-3" key={list.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>{list.label}</h3>
                    <span className="text-[11px] font-bold text-[#64748B]">{list.label === "My 3" ? circleCounts.my3 : circleCounts.my12}</span>
                  </div>
                  <div className="grid gap-2">
                    {list.rows.map((row) => <DashboardPersonMiniRow key={`${list.label}-${row.name}`} onOpenPerson={onOpenPerson} row={row} />)}
                  </div>
                </section>
              ))}
            </div>
            <div className="min-[1180px]:col-span-2 grid gap-2 min-[1180px]:grid-cols-4">
              {[
                { label: "My 70", value: circleCounts.my70 },
                { label: "My 120", value: circleCounts.my120 },
                { label: "Active People", value: activePeople },
                { label: "Hours This Month", value: formatDashboardDuration(monthDurationMinutes) },
              ].map((metric) => (
                <div className="flex items-center justify-between gap-3 rounded-[16px] bg-[#F8FBFF] px-3 py-2 ring-1 ring-[#EAF2FF]" key={metric.label}>
                  <span className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>{metric.label}</span>
                  <span className="shrink-0 text-sm font-black text-[#0F172A]">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </DesktopPanel>

        <DesktopPanel action={<DashboardHeaderAction onClick={onOpenTable}>View Table</DashboardHeaderAction>} className="min-h-[198px] min-w-0" compact eyebrow="Table Activity">
          <div className="grid gap-2 min-[1200px]:grid-cols-2 min-[1380px]:grid-cols-4">
              {[
                { icon: <CalendarDays className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />, label: "Scheduled", value: scheduledUpcomingCount },
                { icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />, label: "Completed", value: loggedThisMonth.length },
                { icon: <Clock className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />, label: "Avg. Time / Table", value: averageThisMonthDuration ? formatLoggedTime(averageThisMonthDuration) : "—" },
                { icon: <Sparkles className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />, label: "Most Active Month", value: mostActiveMonth ? monthShortLabelFromKey(mostActiveMonth[0]) : "—" },
              ].map((metric) => (
                <div className="flex min-h-[82px] min-w-0 items-center gap-3 rounded-[18px] border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-3" key={metric.label}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
                    {metric.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xl font-black leading-none tracking-[-0.02em] text-[#0F172A]">{metric.value}</span>
                    <span className="mt-1.5 block truncate text-[10px] font-black uppercase tracking-[0.1em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>{metric.label}</span>
                    {metric.label === "Most Active Month" && mostActiveMonth ? (
                      <span className="mt-1 block text-[11px] font-semibold text-[#64748B]">{mostActiveMonth[1]} tables</span>
                    ) : null}
                  </span>
                </div>
              ))}
          </div>
        </DesktopPanel>
      </div>

      <div className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <DesktopPanel action={<DashboardHeaderAction onClick={onOpenTableCalendar}>View Calendar</DashboardHeaderAction>} className="min-h-[176px]" compact eyebrow="Upcoming">
          <div className="grid gap-1">
            {dashboardUpcomingRows.map((item) => (
              <button
                className="flex min-w-0 items-center gap-2.5 border-b border-[#EAF2FF] px-1 py-2 text-left last:border-b-0"
                key={item.id}
                onClick={() => {
                  if (item.meeting) {
                    onOpenMeeting(item.meeting.id);
                  } else {
                    onOpenTableCalendar();
                  }
                }}
                type="button"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[13px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
                  <TimelineIcon icon={item.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[#0F172A]">{item.title}</span>
                  <span className="mt-1 block truncate text-xs text-[#64748B]">{item.label}</span>
                </span>
                <span className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                  {item.badge}
                </span>
              </button>
            ))}
          </div>
        </DesktopPanel>

        <DesktopPanel action={<DashboardHeaderAction onClick={onOpenFruit}>View all</DashboardHeaderAction>} className="min-h-[176px]" compact eyebrow="Recent Fruit">
          <div className="grid gap-1">
            {recentFruitItems.length ? recentFruitItems.map((item) => (
              <div className="flex min-w-0 items-center gap-2.5 border-b border-[#EAF2FF] px-1 py-2 last:border-b-0" key={item.id}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[13px] bg-[#ECFDF3] text-[#16A34A] ring-1 ring-[#D7F3DD]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[#0F172A]">{item.title}</span>
                  <span className="mt-1 block truncate text-xs text-[#475569]">{item.description}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-[#64748B]">{formatRelativeDate(item.date)}</span>
              </div>
            )) : (
              <p className="rounded-[18px] bg-[#F8FAFC] px-4 py-4 text-sm leading-6 text-[#64748B]">No recent fruit recorded yet.</p>
            )}
          </div>
        </DesktopPanel>
      </div>

      <DesktopPanel action={<DashboardHeaderAction onClick={onOpenReports}>View Time Report</DashboardHeaderAction>} compact eyebrow="Top Time Investments">
        <div className="grid gap-3 min-[1180px]:grid-cols-[minmax(0,1.32fr)_minmax(330px,0.68fr)] min-[1180px]:items-stretch">
          <div className="overflow-hidden rounded-[18px] border border-[#EAF2FF]">
            <div className="grid grid-cols-[48px_minmax(150px,1fr)_96px_142px] gap-3 border-b border-[#EAF2FF] bg-[#F8FBFF] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
              <span>Rank</span>
              <span>Person</span>
              <span>Circle</span>
              <span>Time Invested</span>
            </div>
            {topTimeInvestments.length ? topTimeInvestments.map((item, index) => (
              <button
                className="grid w-full grid-cols-[48px_minmax(150px,1fr)_96px_142px] items-center gap-3 border-b border-[#EAF2FF] px-3.5 py-2 text-left transition-colors last:border-b-0 hover:bg-[#F8FBFF]"
                key={item.person.id}
                onClick={() => onOpenPerson(item.person.id)}
                type="button"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2563EB] text-[11px] font-black text-white">{index + 1}</span>
                <span className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${avatarTone(index)}`}>{initials(item.person.name)}</span>
                  <span className="truncate text-sm font-bold text-[#0F172A]">{item.person.name}</span>
                </span>
                <span className="text-sm font-semibold text-[#0F172A]">{circleLayerLabelForPerson(item.person.id, circleGroups)}</span>
                <span className="text-sm font-black text-[#0F172A]">{item.stats.timeMinutes ? formatLoggedTime(item.stats.timeMinutes) : "—"}</span>
              </button>
            )) : (
              <p className="px-4 py-5 text-sm text-[#64748B]">No persisted table duration yet.</p>
            )}
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#EAF2FF] overflow-hidden rounded-[18px] border border-[#EAF2FF] bg-[#F8FBFF]">
            {[
              { icon: <Icon name="meetings" size={18} />, label: "Tables", value: loggedMeetings.length },
              { icon: <Clock className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />, label: "Total Time", value: formatDashboardDuration(totalDurationMinutes) },
              { icon: <Clock className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />, label: "Avg. Time / Table", value: averageDuration ? formatLoggedTime(averageDuration) : "—" },
            ].map((metric) => (
              <div className="flex min-h-[102px] flex-col items-center justify-center px-2.5 py-3 text-center" key={metric.label}>
                <span className="flex h-8 w-8 items-center justify-center rounded-[13px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">{metric.icon}</span>
                <span className="mt-2 block text-lg font-black leading-none text-[#0F172A]">{metric.value}</span>
                <span className="mt-1 block text-[9px] font-bold uppercase leading-tight tracking-[0.1em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      </DesktopPanel>

      <DesktopPanel
        action={(
          <div className="flex items-center gap-3">
            <span className="rounded-[13px] border border-[#DCEBFF] bg-white px-3 py-1.5 text-xs font-bold text-[#0F172A]">Last 12 Months</span>
            <DashboardHeaderAction onClick={onOpenReports}>View Full Report</DashboardHeaderAction>
          </div>
        )}
        compact
        eyebrow="Activity Trends"
      >
        <div className="mb-2 flex flex-wrap gap-4 text-xs font-semibold text-[#334155]">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />Tables</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#60A5FA]" />Time (Hours)</span>
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />Fruit</span>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2">
          <svg className="h-[112px] w-full" viewBox={`0 0 ${trendWidth} ${trendHeight}`} role="img" aria-label="Activity trends for tables, hours, and fruit">
            {[0, 1, 2, 3].map((line) => {
              const y = 20 + line * 24;

              return <line key={line} x1="34" x2={trendWidth - 18} y1={y} y2={y} stroke="#DCEBFF" strokeWidth="1" />;
            })}
            <polyline fill="none" points={trendPoints("tables")} stroke="#2563EB" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            <polyline fill="none" points={trendPoints("hours")} stroke="#60A5FA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            <polyline fill="none" points={trendPoints("fruit")} stroke="#10B981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
            {trendData.map((item, index) => (
              <g key={item.label}>
                <circle cx={trendX(index)} cy={trendY(item.tables)} fill="#2563EB" r="4" />
                <circle cx={trendX(index)} cy={trendY(item.hours)} fill="#60A5FA" r="4" />
                <circle cx={trendX(index)} cy={trendY(item.fruit)} fill="#10B981" r="4" />
                <text fill="#475569" fontSize="10" fontWeight="700" textAnchor="middle" x={trendX(index)} y={trendHeight - 6}>{item.label}</text>
              </g>
            ))}
          </svg>
        </div>
      </DesktopPanel>
      </div>
    </div>
  );
}

function DesktopMoreLauncher({
  apps,
  onScriptureClick,
}: {
  apps: DesktopMoreAppItem[];
  onScriptureClick: (scripture: ScriptureReference, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="hidden md:block">
      <TabHero
        icon={<Icon name="apps" size={20} />}
        onScriptureClick={onScriptureClick}
        subtitle="DOS core stays simple. Installable layers extend the workspace when needed."
        title="Apps for the work."
      />
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
        {apps.map((item) => (
          <DesktopMoreAppCard item={item} key={item.label} />
        ))}
      </div>
    </div>
  );
}

function desktopOrganizationCopy(connection: DosAppOrganizationConnection, application: DosAppData["usamApplication"]) {
  if (connection.type === "independent") {
    return "Your DOS workspace can operate independently for now.";
  }

  if (connection.type !== "usam") {
    return connection.status === "active" ? "Connected organization extension." : "Organization connection is waiting.";
  }

  const status = application.status;

  if (status === "application_started") {
    return "Application started. Continue when you are ready.";
  }

  if (status === "application_submitted" || status === "pending_review") {
    return "Application submitted. Pending review.";
  }

  if (status === "approved" || status === "active") {
    return application.publicProfileLive ? "Profile live and connected." : "Approved. Profile is not live yet.";
  }

  if (status === "rejected") {
    return "Application reviewed. Contact USA Missionaries for next steps.";
  }

  return "Apply to USA Missionaries when you are ready.";
}

function DesktopOrganizationConnectionCard({
  application,
  connection,
  onApply,
  onCopyPublicLink,
  onViewStatus,
  publicProfileHref,
}: {
  application: DosAppData["usamApplication"];
  connection: DosAppOrganizationConnection;
  onApply: () => void;
  onCopyPublicLink: () => void;
  onViewStatus: () => void;
  publicProfileHref: string;
}) {
  const isUsam = connection.type === "usam";
  const isIndependent = connection.type === "independent";
  const isPending = isUsam && (application.status === "application_submitted" || application.status === "pending_review");
  const isActive = isUsam && (application.status === "approved" || application.status === "active");
  const canApply = isUsam && !isPending && application.status !== "rejected" && application.status !== "archived";
  const statusLabel = isUsam ? usamStatusLabel(application.status) : organizationConnectionStatusLabel(connection);

  return (
    <article className={`flex min-h-[190px] min-w-0 flex-col rounded-[28px] border p-5 shadow-[0_16px_38px_rgba(37,99,235,0.05)] ${
      isPending
        ? "border-[#E2E8F0] bg-[#F8FAFC]"
        : isActive
          ? "border-[#BFDBFE] bg-white"
          : "border-[#EAF2FF] bg-white"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] ${
          isIndependent ? "bg-[#F8FAFC] text-[#64748B] ring-1 ring-[#E2E8F0]" : "bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]"
        }`}>
          {isUsam ? <Briefcase className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} /> : isIndependent ? <User className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} /> : <Church className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
          isActive
            ? "bg-[#ECFDF3] text-[#15803D]"
            : isPending
              ? "bg-[#FFF7ED] text-[#C2410C]"
              : "bg-[#F1F5F9] text-[#64748B]"
        }`} style={{ fontFamily: font.rajdhani }}>
          {statusLabel}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-black leading-tight tracking-[-0.02em] text-[#0F172A]">{connection.name}</h3>
      <p className="mt-2 text-sm leading-6 text-[#64748B]">{desktopOrganizationCopy(connection, application)}</p>
      {isUsam ? (
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-xs">
            <span className="font-semibold text-[#64748B]">Profile</span>
            <span className="font-bold text-[#0F172A]">{usamProfileStatusLabel(application.profileStatus)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canApply ? (
              <button
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-xs font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.20)]"
                onClick={onApply}
                type="button"
              >
                {application.status === "application_started" ? "Continue application" : isActive ? "Submit update" : "Apply"}
              </button>
            ) : null}
            {isPending ? (
              <button
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-xs font-bold text-[#475569] transition-colors hover:border-[#BFDBFE]"
                onClick={onViewStatus}
                type="button"
              >
                View status
              </button>
            ) : null}
            {application.publicProfileLive ? (
              <>
                <Link
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-xs font-bold text-[#0F172A] transition-colors hover:border-[#BFDBFE]"
                  href={publicProfileHref}
                >
                  View profile
                </Link>
                <button
                  className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-xs font-bold text-[#0F172A] transition-colors hover:border-[#BFDBFE]"
                  onClick={onCopyPublicLink}
                  type="button"
                >
                  Copy link
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DesktopOrganizationsView({
  application,
  message,
  onApply,
  onBack,
  onCopyPublicLink,
  onScriptureClick,
  onViewStatus,
  organizations,
  publicProfileHref,
}: {
  application: DosAppData["usamApplication"];
  message: { text: string; tone: "error" | "success" } | null;
  onApply: () => void;
  onBack: () => void;
  onCopyPublicLink: () => void;
  onScriptureClick: (scripture: ScriptureReference, event: MouseEvent<HTMLButtonElement>) => void;
  onViewStatus: () => void;
  organizations: DosAppOrganizationConnection[];
  publicProfileHref: string;
}) {
  return (
    <div className="hidden md:block">
      <TabPageHeader action={<MoreBackButton onClick={onBack} />} title="Organizations" />
      <div className="mt-4">
        <TabHero
          icon={<Briefcase className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
          onScriptureClick={onScriptureClick}
          scripture={scriptureReferences.secondPeter318}
          subtitle="Manage optional organization connections without changing your DOS workspace."
          title="Connected work."
        />
      </div>
      {message ? (
        <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
          message.tone === "success"
            ? "border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {message.text}
        </p>
      ) : null}
      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        {organizations.map((organization) => (
          <DesktopOrganizationConnectionCard
            application={application}
            connection={organization}
            key={organization.id}
            onApply={onApply}
            onCopyPublicLink={onCopyPublicLink}
            onViewStatus={onViewStatus}
            publicProfileHref={publicProfileHref}
          />
        ))}
      </section>
    </div>
  );
}

function MoreBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.06)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
      Apps
    </button>
  );
}

function MoreAppTile({
  description,
  icon,
  label,
  onClick,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-[108px] min-w-0 flex-col items-start justify-between rounded-[26px] border border-[#EAF2FF] bg-white p-4 text-left shadow-[0_16px_38px_rgba(37,99,235,0.06)] transition-colors hover:border-[#BFDBFE] hover:bg-[#FBFDFF] active:scale-[0.99]"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
        {icon}
      </span>
      <span className="mt-3 min-w-0">
        <span className="block text-base font-black leading-tight tracking-[-0.02em] text-[#0F172A]" style={{ fontFamily: font.oswald }}>{label}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#64748B]">{description}</span>
      </span>
    </button>
  );
}

function organizationConnectionStatusLabel(connection: DosAppOrganizationConnection) {
  if (connection.type === "usam") {
    return usamStatusLabel(connection.status as DosAppData["usamApplication"]["status"]);
  }

  if (connection.type === "independent") {
    return "Independent";
  }

  return connection.status === "active" ? "Connected" : connection.status;
}

function OrganizationConnectionRow({ connection }: { connection: DosAppOrganizationConnection }) {
  const isUsam = connection.type === "usam";
  const isIndependent = connection.type === "independent";

  return (
    <article className="flex min-w-0 gap-3 rounded-[22px] border border-[#EAF2FF] bg-white p-3.5 shadow-[0_12px_30px_rgba(37,99,235,0.045)]">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${
        isIndependent ? "bg-[#F8FAFC] text-[#64748B]" : "bg-[#EBF2FF] text-[#2563EB]"
      }`}>
        {isUsam ? <Briefcase className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={1.9} /> : isIndependent ? <User className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={1.9} /> : <Church className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={1.9} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-bold text-[#0F172A]">{connection.name}</h3>
          <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
            {organizationConnectionStatusLabel(connection)}
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-[#64748B]">
          {isUsam
            ? connection.status === "pending_review" || connection.status === "application_submitted"
              ? "Application submitted. Pending review."
              : `Profile ${connection.profileStatus ?? "draft"}${connection.publicProfileLive ? " · Live" : ""}`
            : isIndependent
              ? "Your DOS workspace can operate without an organization connection."
              : "Connected organization extension."}
        </p>
      </div>
    </article>
  );
}

function UsamApplicationSheet({
  draft,
  errorMessage,
  isSubmitting,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: UsamApplicationDraft;
  errorMessage: string;
  isSubmitting: boolean;
  onChange: (field: keyof UsamApplicationDraft, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const steps = [
    "calling",
    "story",
    "focus",
    "location",
    "photo",
    "budget",
    "prayer",
    "references",
    "review",
  ] as const;
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex] ?? "calling";
  const canAdvance = currentStep === "calling"
    ? Boolean(draft.callingReason.trim())
    : currentStep === "story"
      ? Boolean(draft.storyTestimony.trim())
      : currentStep === "focus"
        ? Boolean(draft.ministryFocus.trim())
        : currentStep === "budget"
          ? Boolean(draft.monthlyBudget.trim() || draft.supportGoal.trim())
          : currentStep === "prayer"
            ? Boolean(draft.prayerNeeds.trim())
            : true;
  const canSubmit = Boolean(
    draft.applicantName.trim()
    && draft.applicantEmail.trim()
    && draft.storyTestimony.trim()
    && buildUsamApplicationCallingFocus(draft),
  );

  function nextStep() {
    if (!canAdvance) {
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function previousStep() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  return (
    <Sheet description="Application details seed a draft USA Missionaries profile for admin review." onClose={onClose} showEyebrow={false} title="Apply to USA Missionaries">
      <form className="space-y-4" onSubmit={onSubmit}>
        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
        <div className="rounded-[26px] border border-[#EAF2FF] bg-[#FBFDFF] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
            Question {stepIndex + 1} of {steps.length}
          </p>
          {currentStep === "calling" ? (
            <label className="mt-3 block">
              <FieldLabel>Tell us briefly why you feel called to USA Missionaries.</FieldLabel>
              <textarea className={`${FieldTextareaClass()} min-h-32 bg-white`} onChange={(event) => onChange("callingReason", event.target.value)} required value={draft.callingReason} />
            </label>
          ) : null}
          {currentStep === "story" ? (
            <label className="mt-3 block">
              <FieldLabel>Share your story or testimony.</FieldLabel>
              <textarea className={`${FieldTextareaClass()} min-h-40 bg-white`} onChange={(event) => onChange("storyTestimony", event.target.value)} required value={draft.storyTestimony} />
            </label>
          ) : null}
          {currentStep === "focus" ? (
            <label className="mt-3 block">
              <FieldLabel>Who do you feel called to reach or disciple?</FieldLabel>
              <textarea className={`${FieldTextareaClass()} min-h-32 bg-white`} onChange={(event) => onChange("ministryFocus", event.target.value)} required value={draft.ministryFocus} />
            </label>
          ) : null}
          {currentStep === "location" ? (
            <label className="mt-3 block">
              <FieldLabel>Where are you based?</FieldLabel>
              <input className={`${FieldInputClass()} bg-white`} onChange={(event) => onChange("location", event.target.value)} value={draft.location} />
            </label>
          ) : null}
          {currentStep === "photo" ? (
            <div className="mt-3 grid gap-2">
              <label className="block">
                <FieldLabel>Add a profile photo.</FieldLabel>
                <input className={`${FieldInputClass()} bg-white`} onChange={(event) => onChange("profilePhotoUrl", event.target.value)} placeholder="https://..." value={draft.profilePhotoUrl} />
              </label>
              <p className="text-xs leading-5 text-[#64748B]">A URL is enough for now. Upload can come later.</p>
            </div>
          ) : null}
          {currentStep === "budget" ? (
            <div className="mt-3 grid gap-3">
              <label className="block">
                <FieldLabel>What is your monthly support goal?</FieldLabel>
                <input className={`${FieldInputClass()} bg-white`} inputMode="decimal" onChange={(event) => onChange("monthlyBudget", event.target.value)} placeholder="3500" value={draft.monthlyBudget} />
              </label>
              <label className="block">
                <FieldLabel>Support goal note</FieldLabel>
                <input className={`${FieldInputClass()} bg-white`} inputMode="decimal" onChange={(event) => onChange("supportGoal", event.target.value)} placeholder="Optional if different" value={draft.supportGoal} />
              </label>
            </div>
          ) : null}
          {currentStep === "prayer" ? (
            <label className="mt-3 block">
              <FieldLabel>How can people be praying for you?</FieldLabel>
              <textarea className={`${FieldTextareaClass()} min-h-32 bg-white`} onChange={(event) => onChange("prayerNeeds", event.target.value)} required value={draft.prayerNeeds} />
            </label>
          ) : null}
          {currentStep === "references" ? (
            <label className="mt-3 block">
              <FieldLabel>Optional references or pastor/church contact</FieldLabel>
              <textarea className={`${FieldTextareaClass()} min-h-28 bg-white`} onChange={(event) => onChange("referencesText", event.target.value)} value={draft.referencesText} />
            </label>
          ) : null}
          {currentStep === "review" ? (
            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 block">
                  <FieldLabel>Name</FieldLabel>
                  <input className={`${FieldInputClass()} bg-white`} onChange={(event) => onChange("applicantName", event.target.value)} required value={draft.applicantName} />
                </label>
                <label className="block">
                  <FieldLabel>Email</FieldLabel>
                  <input className={`${FieldInputClass()} bg-white`} onChange={(event) => onChange("applicantEmail", event.target.value)} required type="email" value={draft.applicantEmail} />
                </label>
                <label className="block">
                  <FieldLabel>Phone</FieldLabel>
                  <input className={`${FieldInputClass()} bg-white`} onChange={(event) => onChange("applicantPhone", event.target.value)} value={draft.applicantPhone} />
                </label>
              </div>
              <div className="rounded-[20px] border border-[#DCEBFF] bg-white px-3 py-3 text-sm leading-6 text-[#64748B]">
                Submitting creates a draft USA Missionaries Profile for admin review. It does not activate membership or publish your profile.
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 ? (
            <button
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-bold text-[#0F172A]"
              onClick={previousStep}
              type="button"
            >
              Back
            </button>
          ) : null}
          {currentStep === "review" ? (
            <button
              className="inline-flex min-h-12 flex-[1.6] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition-colors hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting || !canSubmit}
              type="submit"
            >
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          ) : (
            <button
              className="inline-flex min-h-12 flex-[1.6] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.22)] transition-colors hover:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canAdvance}
              onClick={nextStep}
              type="button"
            >
              Continue
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

function TaskCard({
  action,
  children,
  icon,
  title,
}: {
  action: ReactNode;
  children: ReactNode;
  icon?: IconName;
  title: string;
}) {
  return (
    <article className="flex min-h-[72px] items-center justify-between gap-4 rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#0F172A]">
            <Icon name={icon} size={16} />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="font-semibold leading-tight text-[#0F172A]">{title}</p>
          <div className="mt-1 text-xs leading-5 text-[#64748B]">{children}</div>
        </div>
      </div>
      {action}
    </article>
  );
}

function Sheet({
  children,
  description,
  onClose,
  showEyebrow = false,
  title,
}: {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  showEyebrow?: boolean;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-5 backdrop-blur-md" onMouseDown={onClose} role="presentation">
      <div className="flex min-h-full items-end justify-center">
        <div
          aria-modal="true"
          className="w-full max-w-lg overflow-hidden rounded-t-[30px] rounded-b-[24px] border border-white/70 bg-white p-4 shadow-[0_26px_90px_rgba(0,0,0,0.20)]"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E2E8F0]" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4">
            <div>
              {showEyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                DOS
              </p> : null}
              <h2 className={`${showEyebrow ? "mt-2" : ""} text-2xl font-bold leading-none text-[#0F172A]`}>{title}</h2>
              {description ? <p className="mt-3 text-sm leading-6 text-[#64748B]">{description}</p> : null}
            </div>
            <button
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-xl leading-none text-[#0F172A]"
              onClick={onClose}
              type="button"
            >
              &times;
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function MobileBottomSheet({
  badge,
  children,
  footer,
  onClose,
  subtitle,
  title,
}: {
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div
      className="absolute inset-0 z-[80] flex items-end bg-[#0F172A]/20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] backdrop-blur-[3px]"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="max-h-[calc(100dvh-1.5rem)] w-full overflow-hidden rounded-t-[32px] rounded-b-[24px] border border-white/70 bg-white p-3 shadow-[0_28px_85px_rgba(32,27,20,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E2E8F0]" aria-hidden="true" />
        <header className="flex items-start gap-3 px-1 pb-3">
          <button
            aria-label="Close"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
          {badge ? <div className="shrink-0">{badge}</div> : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-[#0F172A]">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-[#64748B]">{subtitle}</p> : null}
          </div>
        </header>
        <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto px-0.5 [scrollbar-width:none]">
          {children}
        </div>
        {footer ? <div className="mt-3 px-0.5">{footer}</div> : null}
      </section>
    </div>
  );
}

function ActionList({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_14px_40px_rgba(37,99,235,0.045)]">
      {children}
    </div>
  );
}

function ActionListRow({
  children,
  href,
  icon,
  isLast = false,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  icon: ReactNode;
  isLast?: boolean;
  onClick?: () => void;
}) {
  const className = `flex min-h-[54px] w-full items-center gap-3 bg-white px-4 text-left text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#FFFFFF] ${
    isLast ? "" : "border-b border-[#E2E8F0]"
  }`;
  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#1D4ED8]">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </>
  );

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className={className} onClick={onClick} type="button">
      {content}
    </button>
  );
}

function UserProfileAvatar({
  imageUrl,
  name,
  size = "sm",
}: {
  imageUrl?: string | null;
  name: string;
  size?: "lg" | "sm";
}) {
  const dimension = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-sm";
  const initial = name.trim().charAt(0).toUpperCase() || "R";

  if (imageUrl) {
    return (
      <span className={`${dimension} flex shrink-0 overflow-hidden rounded-full border border-[#BFDBFE] bg-[#EBF2FF] shadow-[0_10px_24px_rgba(37,99,235,0.10)]`}>
        <img alt="" className="h-full w-full object-cover" src={imageUrl} />
      </span>
    );
  }

  return (
    <span className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]`}>
      {initial}
    </span>
  );
}

function ProfileSheetFrame({
  children,
  desktopMaxWidthClassName = "md:max-w-[520px]",
  onClose,
  rightAction,
  title,
}: {
  children: ReactNode;
  desktopMaxWidthClassName?: string;
  onClose: () => void;
  rightAction?: ReactNode;
  title: string;
}) {
  return (
    <div
      className="absolute inset-0 z-[90] box-border flex items-end overflow-y-auto bg-[#0F172A]/18 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-[calc(env(safe-area-inset-top)+0.85rem)] backdrop-blur-[3px] md:items-center md:justify-center md:p-6"
      onMouseDown={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className={`flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[#F4F6FB] p-3 shadow-[0_28px_85px_rgba(32,27,20,0.22)] md:max-h-[min(760px,calc(100dvh-3rem))] md:border-[#EAF2FF] md:bg-[#F8FBFF] md:p-4 ${desktopMaxWidthClassName}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="relative flex h-10 shrink-0 items-center justify-center">
          <button
            aria-label="Close"
            className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
          <h2 className="text-sm font-bold text-[#0F172A]">{title}</h2>
          <div className="absolute right-0 flex h-9 min-w-9 items-center justify-center">{rightAction}</div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-0.5 pb-2 pt-2 [scrollbar-width:none]">
          {children}
        </div>
      </section>
    </div>
  );
}

function ProfileGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section>
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">{title}</p>
      <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">{children}</div>
    </section>
  );
}

function ProfileRow({
  children,
  icon,
  isLast = false,
  meta,
  onClick,
  sublabel,
}: {
  children: ReactNode;
  icon: ReactNode;
  isLast?: boolean;
  meta?: ReactNode;
  onClick?: () => void;
  sublabel?: string;
}) {
  return (
    <button
      className={`flex min-h-[58px] w-full items-center gap-3 bg-white px-3 text-left transition-colors hover:bg-[#F8FAFC] ${isLast ? "" : "border-b border-[#E2E8F0]"}`}
      onClick={onClick}
      type="button"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#EBF2FF] text-[#2563EB]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0F172A]">{children}</span>
        {sublabel ? <span className="mt-0.5 block truncate text-xs font-medium text-[#64748B]">{sublabel}</span> : null}
      </span>
      {meta ? <span className="shrink-0 text-xs font-semibold text-[#64748B]">{meta}</span> : <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />}
    </button>
  );
}

function RhythmBars() {
  return (
    <div className="flex items-end gap-1.5" aria-label="Seven day rhythm preview">
      {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
        <span
          aria-hidden="true"
          className="w-1.5 rounded-full bg-[#2563EB]"
          key={bar}
          style={{ height: `${14 + (bar % 3) * 3}px` }}
        />
      ))}
    </div>
  );
}

function ProfileSheet({
  email,
  name,
  onClose,
  onEditProfile,
  onOpenCircles,
  photoUrl,
  workspaceName,
  workspaceSublabel,
}: {
  email: string;
  name: string;
  onClose: () => void;
  onEditProfile: () => void;
  onOpenCircles: () => void;
  photoUrl?: string | null;
  workspaceName: string;
  workspaceSublabel: string;
}) {
  return (
    <ProfileSheetFrame
      onClose={onClose}
      rightAction={(
        <button
          aria-label="Profile settings"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white"
          type="button"
        >
          <Settings className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </button>
      )}
      title="Profile"
    >
      <div className="flex flex-col items-center px-2 pt-2 text-center">
        <UserProfileAvatar imageUrl={photoUrl} name={name} size="lg" />
        <h3 className="mt-3 text-lg font-bold leading-tight text-[#0F172A]">{name}</h3>
        <p className="mt-0.5 text-xs font-medium text-[#64748B]">{email || "No email added"}</p>
      </div>

      <div className="mt-5 grid gap-4">
        <section className="rounded-[18px] bg-white px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]">Current Rhythm</p>
              <p className="mt-1 text-base font-bold leading-none text-[#0F172A]">Day {currentRhythmDay}</p>
            </div>
            <RhythmBars />
          </div>
        </section>

        <ProfileGroup title="Your DOS Workspace">
          <ProfileRow icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} meta={<span className="text-[#2563EB]">Switch</span>} sublabel={workspaceSublabel}>
            {workspaceName}
          </ProfileRow>
          <ProfileRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} isLast onClick={onOpenCircles}>
            Field & circles
          </ProfileRow>
        </ProfileGroup>

        <ProfileGroup title="Account">
          <ProfileRow icon={<User className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} onClick={onEditProfile}>
            Edit profile
          </ProfileRow>
          <ProfileRow icon={<Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} meta="On">
            Notifications
          </ProfileRow>
          <ProfileRow icon={<Palette className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} isLast meta="System">
            Appearance
          </ProfileRow>
        </ProfileGroup>

        <ProfileGroup title="Support">
          <ProfileRow icon={<HelpCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} meta={<ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />}>
            Get help
          </ProfileRow>
          <ProfileRow icon={<Shield className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} isLast meta={<ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />}>
            Privacy & terms
          </ProfileRow>
        </ProfileGroup>

        <footer className="pb-1 pt-1 text-center">
          <Link className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#64748B] transition-colors hover:bg-white" href="/api/access/logout">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
            Sign out
          </Link>
          <p className="mt-1 text-[10px] font-semibold text-[#94A3B8]">DOS v0.4.2</p>
        </footer>
      </div>
    </ProfileSheetFrame>
  );
}

function EditProfileSheet({
  email,
  name,
  onClose,
  phone,
  workspaceName,
  workspaceSublabel,
}: {
  email: string;
  name: string;
  onClose: () => void;
  phone: string;
  workspaceName: string;
  workspaceSublabel: string;
}) {
  const [stateName, organizationName] = workspaceSublabel.split(" · ");

  return (
    <ProfileSheetFrame desktopMaxWidthClassName="md:max-w-[720px]" onClose={onClose} title="Edit Profile">
      <div className="px-1 md:px-0">
        <button
          className="mb-4 flex min-h-[52px] w-full items-center justify-center rounded-[16px] border border-dashed border-[#BFDBFE] bg-white text-sm font-bold text-[#2563EB] md:mb-5"
          type="button"
        >
          Change photo
        </button>

        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          {[
            ["Name", name],
            ["Email", email],
            ["Phone", formatPhoneNumber(phone) || phone],
            ["Workspace name", workspaceName],
            ["State", stateName ?? ""],
            ["Organization", organizationName ?? ""],
          ].map(([label, value]) => (
            <label className="grid gap-1.5" key={label}>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]">{label}</span>
              <input
                className="min-h-11 rounded-[14px] border border-[#E2E8F0] bg-white px-3 text-sm font-semibold text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                defaultValue={value}
              />
            </label>
          ))}
        </div>

        <button
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] md:mt-6"
          onClick={onClose}
          type="button"
        >
          Done
        </button>
      </div>
    </ProfileSheetFrame>
  );
}

function SegmentedTabs<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedTabOption<T>>;
  value: T;
}) {
  return (
    <div className="grid rounded-full bg-[#E2E8F0] p-1 shadow-inner shadow-white/60" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={`min-h-9 rounded-full px-2 text-xs font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 ${
            value === option.value
              ? "bg-white text-[#0F172A] shadow-[0_8px_18px_rgba(42,37,29,0.08)]"
              : "text-[#64748B] hover:text-[#0F172A]"
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const desktopMeetingsViewTabs: ReadonlyArray<SegmentedTabOption<MeetingsView>> = [
  { label: "Schedule", value: "upcoming" },
  { label: "Calendar", value: "calendar" },
  { label: "History", value: "history" },
  { label: "Availability", value: "availability" },
];

const mobileMeetingsViewTabs: ReadonlyArray<SegmentedTabOption<MobileMeetingsView>> = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Calendar", value: "calendar" },
  { label: "History", value: "history" },
];

const meetingCalendarFilterTabs: ReadonlyArray<SegmentedTabOption<MeetingCalendarFilter>> = [
  { label: "All", value: "all" },
  { label: "DOS", value: "dos" },
  { label: "Google", value: "google" },
  { label: "Reminders", value: "reminders" },
];

const fruitViewTabs: ReadonlyArray<SegmentedTabOption<FruitView>> = [
  { label: "Activity", value: "activity" },
  { label: "Impact", value: "impact" },
  { label: "Forms", value: "forms" },
];

const fruitFormCards: ReadonlyArray<{
  description: string;
  icon: IconName;
  key: FruitFormKey;
  status: FruitFormStatus;
  title: string;
}> = [
  {
    description: "Send after a meeting so someone can share what happened, how the meeting impacted them, and any next steps.",
    icon: "send",
    key: "quick_review",
    status: "live",
    title: "Quick Review",
  },
  {
    description: "Send this when someone has a testimony to share so it can be reviewed and connected to visible fruit.",
    icon: "fruit",
    key: "testimony_review",
    status: "live",
    title: "Testimony Review",
  },
  {
    description: "Send when someone wants to submit a prayer request connected to a meeting or follow-up.",
    icon: "prayer",
    key: "prayer_request",
    status: "coming_soon",
    title: "Prayer Request",
  },
];

const prayerWorkspaceTabs: ReadonlyArray<SegmentedTabOption<PrayerWorkspaceTab>> = [
  { label: "Partners", value: "partners" },
  { label: "My Requests", value: "my_requests" },
  { label: "Praying For", value: "praying_for" },
  { label: "Meeting Covering", value: "meeting_covering" },
];

const prayerRequestViewTabs: ReadonlyArray<SegmentedTabOption<PrayerRequestView>> = [
  { label: "Praying", value: "praying" },
  { label: "Answered", value: "answered" },
];

// TODO: Replace UI-only sample rows with prayer_partners/prayer_requests data once those tables are exposed to the DOS client.
const desktopPrayerPartnerSamples = [
  { action: "View", lastContacted: "2 days ago", name: "Brooke Fox", notes: "Prays over family and field rhythm.", relationship: "Spouse", status: "Active" },
  { action: "View", lastContacted: "1 week ago", name: "Dirk Bond", notes: "Mentor covering table conversations.", relationship: "Mentor", status: "Active" },
  { action: "View", lastContacted: "3 days ago", name: "Prayer Team Group", notes: "Shared covering for upcoming meetings.", relationship: "Group", status: "Active" },
] as const;

const desktopPrayerRequestSamples = [
  { action: "View", answered: "—", category: "Ministry", created: "Jun 4", request: "Wisdom for upcoming Kitchen Table", sharedWith: "Prayer Team", status: "Praying", view: "praying" },
  { action: "View", answered: "—", category: "Family", created: "Jun 3", request: "Family strength and covering", sharedWith: "Brooke", status: "Praying", view: "praying" },
  { action: "View", answered: "—", category: "Support", created: "Jun 2", request: "Open doors for support conversations", sharedWith: "3 partners", status: "Praying", view: "praying" },
  { action: "View", answered: "Jun 5", category: "Support", created: "May 31", request: "Support conversations this week", sharedWith: "3 partners", status: "Answered", view: "answered" },
  { action: "View", answered: "Jun 4", category: "Ministry", created: "Jun 3", request: "Peace before meeting with Naomi", sharedWith: "Brooke", status: "Answered", view: "answered" },
  { action: "View", answered: "May 31", category: "Provision", created: "May 28", request: "Provision for ministry needs", sharedWith: "Prayer Team", status: "Answered", view: "answered" },
] as const;

const desktopPrayingForSamples = [
  { frequency: "Weekly", lastPrayed: "Yesterday", person: "Aaron Meyers", request: "Job transition and peace", status: "Praying" },
  { frequency: "Ongoing", lastPrayed: "2 days ago", person: "Jason Waage", request: "Family discipleship rhythm", status: "Praying" },
  { frequency: "One time", lastPrayed: "Today", person: "Naomi Lee", request: "Upcoming table conversation", status: "Praying" },
] as const;

const desktopMeetingCoveringSamples = [
  { action: "View", date: "Jun 6, 6:00 PM", meeting: "Kitchen Table with Naomi Lee", person: "Naomi Lee", prayerTeam: "Brooke, Dirk", status: "Not sent" },
  { action: "View", date: "Jun 8, 9:00 AM", meeting: "Coffee with Jason Waage", person: "Jason Waage", prayerTeam: "Prayer Team Group", status: "Sent" },
  { action: "View", date: "Jun 10, 7:00 PM", meeting: "Follow-up with Aaron Meyers", person: "Aaron Meyers", prayerTeam: "Brooke", status: "Draft" },
] as const;

const peopleCircleTabs: ReadonlyArray<SegmentedTabOption<PeopleCircleView>> = [
  { label: "My 3", value: "three" },
  { label: "My 12", value: "twelve" },
  { label: "My 70", value: "seventy" },
  { label: "My 120", value: "my_120" },
];

function PeopleCircleTabs({
  onChange,
  value,
}: {
  onChange: (value: PeopleCircleView) => void;
  value: PeopleCircleView;
}) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-full border border-[#DCEBFF] bg-white p-1 shadow-[0_8px_22px_rgba(37,99,235,0.05)]">
      {peopleCircleTabs.map((option) => {
        const selected = value === option.value;

        return (
          <button
            aria-pressed={selected}
            className={`min-h-9 rounded-full px-1.5 text-[11px] font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 max-[350px]:text-[10px] ${
              selected
                ? "bg-[#EAF2FF] text-[#1D4ED8] shadow-[0_6px_14px_rgba(37,99,235,0.10)] ring-1 ring-[#CFE0FF]"
                : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function TableSearchBar({
  query,
  resultCount,
  onChange,
  showCount = true,
}: {
  query: string;
  resultCount: number;
  onChange: (value: string) => void;
  showCount?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#EAF2FF] bg-white p-1.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)] md:rounded-[22px] md:p-2">
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">Search tables</span>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
          <Icon name="search" size={14} />
        </span>
        <input
          className="min-h-10 w-full rounded-full border border-[#DCEBFF] bg-[#F8FBFF] pl-9 pr-3 text-sm font-semibold text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB] md:min-h-11 md:pl-10 md:pr-4"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search tables"
          type="search"
          value={query}
        />
      </label>
      {showCount ? (
        <span className="shrink-0 rounded-full bg-[#F8FAFC] px-2.5 py-1 text-center text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748B] md:px-3 md:py-1.5 md:text-[10px] md:tracking-[0.12em]" style={{ fontFamily: font.rajdhani }}>
          {resultCount} shown
        </span>
      ) : null}
    </div>
  );
}

function DesktopTableToolbar({
  meetingsView,
  onLogMeeting,
  onMeetingsViewChange,
  onScheduleMeeting,
  onSearchChange,
  query,
  resultCount,
}: {
  meetingsView: MeetingsView;
  onLogMeeting: () => void;
  onMeetingsViewChange: (value: MeetingsView) => void;
  onScheduleMeeting: () => void;
  onSearchChange: (value: string) => void;
  query: string;
  resultCount: number;
}) {
  return (
    <div className="hidden rounded-[26px] border border-[#EAF2FF] bg-white/92 p-3 shadow-[0_12px_34px_rgba(37,99,235,0.045)] backdrop-blur md:grid md:grid-cols-1 md:items-center md:gap-3 xl:grid-cols-[minmax(220px,300px)_minmax(390px,1fr)_auto]">
      <TableSearchBar onChange={onSearchChange} query={query} resultCount={resultCount} showCount={false} />
      <div className="min-w-0">
        <SegmentedTabs onChange={onMeetingsViewChange} options={desktopMeetingsViewTabs} value={meetingsView} />
      </div>
      <div className="grid grid-cols-2 gap-2 xl:min-w-[294px] xl:justify-self-end">
        <button
          className="inline-flex min-h-11 min-w-[124px] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.20)] transition-transform active:scale-[0.99]"
          onClick={onLogMeeting}
          type="button"
        >
          <Icon name="log" size={14} />
          <span>Log Table</span>
        </button>
        <button
          className="inline-flex min-h-11 min-w-[150px] items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#DCEBFF] bg-white px-4 text-sm font-bold text-[#0F172A] shadow-[0_8px_20px_rgba(37,99,235,0.045)] transition-colors hover:border-[#BFDBFE] active:scale-[0.99]"
          onClick={onScheduleMeeting}
          type="button"
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" aria-hidden="true" strokeWidth={1.9} />
          <span>Schedule Table</span>
        </button>
      </div>
    </div>
  );
}

function DesktopTableEmptyState({
  action,
  text,
  title,
}: {
  action: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="hidden items-center justify-between gap-4 rounded-[26px] border border-[#EAF2FF] bg-white/92 p-4 text-left shadow-[0_12px_34px_rgba(37,99,235,0.045)] backdrop-blur md:flex">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#EFF6FF] text-[#2563EB] shadow-[inset_0_0_0_1px_#DCEBFF]">
          <CalendarDays className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
        </span>
        <span className="min-w-0">
          <h2 className="truncate text-lg font-black leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">
            {text}
          </p>
        </span>
      </div>
      <div className="shrink-0">
        {action}
      </div>
    </div>
  );
}

function tablePersonColumnLabel(meeting: DosAppMeeting, people: DosAppPerson[]) {
  return meetingParticipantTitle(meeting, people) || "—";
}

function tableStatusColumnLabel(meeting: DosAppMeeting) {
  if (meeting.meetingStatus === "scheduled") {
    return isUpcomingDate(meeting.scheduledStartAt ?? meeting.date) ? "Scheduled" : "Past scheduled";
  }

  return "Logged";
}

function tableStoriesLabel(count: number) {
  return `${count} ${count === 1 ? "Story" : "Stories"}`;
}

function tableTimeLabel(value: string | null | undefined) {
  return value?.includes("T") ? formatTime(value) : "";
}

function DesktopTableActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function DesktopScheduleTable({
  meetings,
  onOpenMeeting,
  people,
}: {
  meetings: DosAppMeeting[];
  onOpenMeeting: (meetingId: string) => void;
  people: DosAppPerson[];
}) {
  return (
    <div className="hidden overflow-hidden rounded-[26px] border border-[#EAF2FF] bg-white/92 shadow-[0_12px_34px_rgba(37,99,235,0.045)] backdrop-blur md:block">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[150px_minmax(190px,1fr)_150px_112px_120px_104px] items-center gap-3 border-b border-[#EFF6FF] bg-[#F8FBFF] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
            <span>Date</span>
            <span>Person</span>
            <span>Type</span>
            <span>Duration</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-[#EFF6FF]">
            {meetings.map((meeting) => (
              <div
                className="grid grid-cols-[150px_minmax(190px,1fr)_150px_112px_120px_104px] items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-[#F8FBFF]"
                key={meeting.id}
              >
                <span className="min-w-0">
                  <span className="block truncate font-black text-[#0F172A]">{formatDate(meeting.scheduledStartAt ?? meeting.date)}</span>
                  <span className="mt-0.5 block truncate font-semibold text-[#64748B]">{tableTimeLabel(meeting.scheduledStartAt ?? meeting.date) || "—"}</span>
                </span>
                <span className="truncate font-black text-[#0F172A]">{tablePersonColumnLabel(meeting, people)}</span>
                <span className="truncate font-semibold text-[#475569]">{meetingActivityTitle(meeting)}</span>
                <span className="truncate font-semibold text-[#475569]">{formatLoggedTime(tableDurationMinutes(meeting))}</span>
                <span className="truncate">
                  <span className="rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                    {tableStatusColumnLabel(meeting)}
                  </span>
                </span>
                <span className="justify-self-end">
                  <DesktopTableActionButton onClick={() => onOpenMeeting(meeting.id)}>Open</DesktopTableActionButton>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopHistoryTable({
  meetings,
  onOpenMeeting,
  people,
  storyCountByMeetingId,
}: {
  meetings: DosAppMeeting[];
  onOpenMeeting: (meetingId: string) => void;
  people: DosAppPerson[];
  storyCountByMeetingId: Map<string, number>;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[26px] border border-[#EAF2FF] bg-white/92 shadow-[0_12px_34px_rgba(37,99,235,0.045)] backdrop-blur md:block">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[142px_minmax(180px,1fr)_132px_104px_minmax(240px,1.35fr)_112px] items-center gap-3 border-b border-[#EFF6FF] bg-[#F8FBFF] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
            <span>Date</span>
            <span>Person</span>
            <span>Type</span>
            <span>Duration</span>
            <span>Notes / Reflection</span>
            <span>Stories</span>
          </div>
          <div className="divide-y divide-[#EFF6FF]">
            {meetings.map((meeting) => {
              const notesPreview = meeting.notes?.trim() || "No reflection yet";
              const storyCount = storyCountByMeetingId.get(meeting.id) ?? 0;

              return (
                <button
                  className="grid w-full grid-cols-[142px_minmax(180px,1fr)_132px_104px_minmax(240px,1.35fr)_112px] items-center gap-3 px-4 py-3 text-left text-xs transition-colors hover:bg-[#F8FBFF]"
                  key={meeting.id}
                  onClick={() => onOpenMeeting(meeting.id)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-black text-[#0F172A]">{formatDate(meeting.date)}</span>
                    <span className="mt-0.5 block truncate font-semibold text-[#64748B]">{tableTimeLabel(meeting.date) || "—"}</span>
                  </span>
                  <span className="truncate font-black text-[#0F172A]">{tablePersonColumnLabel(meeting, people)}</span>
                  <span className="truncate font-semibold text-[#475569]">{meetingActivityTitle(meeting)}</span>
                  <span className="truncate font-semibold text-[#475569]">{formatLoggedTime(tableDurationMinutes(meeting))}</span>
                  <span className="truncate text-[#64748B]">{notesPreview}</span>
                  <span className="truncate font-bold text-[#0F172A]">{tableStoriesLabel(storyCount)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function calendarSourceSummaries(events: DosAppExternalCalendarEvent[]) {
  const summaries = new Map<string, { count: number; id: string; imported: number; name: string }>();

  events.forEach((event) => {
    const key = event.calendarSourceId ?? event.externalCalendarId ?? "google";
    const current = summaries.get(key) ?? {
      count: 0,
      id: key,
      imported: 0,
      name: event.sourceName ?? event.externalCalendarId ?? "Google Calendar",
    };

    summaries.set(key, {
      ...current,
      count: current.count + 1,
      imported: current.imported + (event.importedMeetingId ? 1 : 0),
    });
  });

  return Array.from(summaries.values()).sort((first, second) => first.name.localeCompare(second.name));
}

function DesktopAvailabilityPanel({
  calendarConnection,
  externalCalendarEvents,
  isDisconnecting,
  onDisconnectCalendar,
  onScheduleMeeting,
  workspaceId,
}: {
  calendarConnection: DosAppCalendarConnection;
  externalCalendarEvents: DosAppExternalCalendarEvent[];
  isDisconnecting: boolean;
  onDisconnectCalendar: () => void;
  onScheduleMeeting: () => void;
  workspaceId: string;
}) {
  const sourceSummaries = calendarSourceSummaries(externalCalendarEvents);
  const futureSections = ["Meeting types", "Availability rules", "Booking links", "Team/spouse calendars"];

  return (
    <div className="hidden gap-4 md:grid lg:grid-cols-[minmax(0,1fr)_minmax(310px,360px)]">
      <section className="rounded-[26px] border border-[#EAF2FF] bg-white/92 p-5 shadow-[0_12px_34px_rgba(37,99,235,0.045)] backdrop-blur">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#DCEBFF]">
              <Clock className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-black leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
                Availability is coming next.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                Connected calendars are already available for calendar sync. Availability rules and booking links are next.
              </p>
            </div>
          </div>
          <button
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.18)]"
            onClick={onScheduleMeeting}
            type="button"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
            Schedule Table
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {futureSections.map((section) => (
            <div className="rounded-[20px] border border-[#EAF2FF] bg-[#F8FBFF] p-4" key={section}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2563EB] ring-1 ring-[#DCEBFF]">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
              </span>
              <h3 className="mt-3 text-sm font-black text-[#0F172A]">{section}</h3>
              <p className="mt-1 text-xs leading-5 text-[#64748B]">Planned for the next scheduling phase.</p>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-3">
        <CalendarConnectionCard
          calendarConnection={calendarConnection}
          isDisconnecting={isDisconnecting}
          onDisconnect={calendarConnection.connected ? onDisconnectCalendar : undefined}
          workspaceId={workspaceId}
        />
        <section className="rounded-[22px] border border-[#DCEBFF] bg-white p-4 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black text-[#0F172A]">Calendar Sources</h3>
            <span className="rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              {sourceSummaries.length} sources
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {sourceSummaries.length ? sourceSummaries.map((source) => (
              <div className="rounded-[18px] border border-[#EFF6FF] bg-[#F8FBFF] p-3" key={source.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold text-[#0F172A]">{source.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-[#64748B]">{source.count} events</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">
                  {source.imported} added to DOS. Availability selection will use calendar source settings in the next phase.
                </p>
              </div>
            )) : (
              <p className="rounded-[18px] border border-dashed border-[#DCEBFF] bg-[#F8FBFF] p-3 text-sm leading-6 text-[#64748B]">
                No imported Google sources loaded yet.
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function DesktopPeopleIndex({
  empty,
  items,
  latestMeetingDateByPersonId,
  onLogMeeting,
  onOpenPerson,
  personTableStatsByPersonId,
  startIndex = 0,
  storyCountByPersonId,
}: {
  empty: string;
  items: CircleListItem[];
  latestMeetingDateByPersonId: Map<string, string | null>;
  onLogMeeting: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
  personTableStatsByPersonId: Map<string, PersonTableStats>;
  startIndex?: number;
  storyCountByPersonId: Map<string, number>;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[24px] border border-[#EAF2FF] bg-white px-5 py-8 text-center text-sm text-[#64748B] shadow-[0_12px_34px_rgba(37,99,235,0.045)]">
        {empty}
      </div>
    );
  }

  return (
    <div className="hidden overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_12px_34px_rgba(37,99,235,0.045)] md:block">
      <div className="overflow-x-auto">
        <div className="min-w-[1106px]">
          <div className="grid grid-cols-[minmax(264px,1.6fr)_142px_122px_60px_100px_84px_104px_114px] items-center gap-3 border-b border-[#EFF6FF] bg-[#F8FBFF] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
            <span>Person</span>
            <span className="leading-[0.82rem]">
              <span className="block">Relationship</span>
              <span className="block">Context</span>
            </span>
            <span className="leading-[0.82rem]">
              <span className="block">Engagement</span>
              <span className="block">Level</span>
            </span>
            <span>Meetings</span>
            <span className="leading-[0.82rem]">
              <span className="block">Time</span>
              <span className="block">Logged</span>
            </span>
            <span>Stories</span>
            <span className="leading-[0.82rem]">
              <span className="block">Last</span>
              <span className="block">Table</span>
            </span>
            <span className="text-right">Next</span>
          </div>
          <div className="divide-y divide-[#EFF6FF]">
            {items.map((item, index) => {
              const { person } = item;
              const rowIndex = startIndex + index;
              const relationshipModel = personRelationshipModel(person);
              const lastTable = latestMeetingDateByPersonId.get(person.id) ?? null;
              const storyCount = storyCountByPersonId.get(person.id) ?? 0;
              const tableStats = personTableStatsByPersonId.get(person.id) ?? { meetings: 0, timeMinutes: 0 };

              return (
                <div
                  className="grid grid-cols-[minmax(264px,1.6fr)_142px_122px_60px_100px_84px_104px_114px] items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-[#F8FBFF]"
                  key={person.id}
                >
                  <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onOpenPerson(person.id)} type="button">
                    <CircleAvatar index={rowIndex} person={person} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[#0F172A]">{person.name}</span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-[#64748B]">{relationshipTypePillLabel(person) || "—"}</span>
                    </span>
                  </button>
                  <span className="truncate text-[#475569]">{relationshipContextLabel(relationshipModel.relationshipContext) || "—"}</span>
                  <span className="truncate font-semibold text-[#334155]">{engagementLevelTableLabel(person)}</span>
                  <span className="font-black text-[#0F172A]">{tableStats.meetings}</span>
                  <span className="truncate font-semibold text-[#475569]">{formatLoggedTime(tableStats.timeMinutes)}</span>
                  <span className="truncate font-black text-[#0F172A]">{storyCount} {storyCount === 1 ? "Story" : "Stories"}</span>
                  <span className="truncate font-semibold text-[#475569]">
                    {lastTable ? formatRelativeDate(lastTable) : "—"}
                  </span>
                  <button
                    className="justify-self-end whitespace-nowrap rounded-full border border-[#DCEBFF] bg-white px-3 py-2 text-xs font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
                    onClick={() => onLogMeeting(person.id)}
                    type="button"
                  >
                    Log Table
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonCard({
  index,
  onClick,
  person,
  variant = "card",
}: {
  index: number;
  onClick?: () => void;
  person: DosAppPerson;
  variant?: "card" | "row";
}) {
  const isRow = variant === "row";
  const content = (
    <>
      <div className={`flex ${isRow ? "h-9 w-9" : "h-10 w-10"} shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(index)}`}>
        {initials(person.name)}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold text-[#0F172A]">{person.name}</p>
        <p className="mt-1 truncate text-xs text-[#64748B]">{relationshipLine(person)}</p>
      </div>
      {onClick ? <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className={`flex w-full items-center gap-3 bg-white transition-colors hover:bg-[#FFFFFF] ${isRow ? "px-4 py-3" : "rounded-2xl border border-[#E2E8F0] px-4 py-3"}`}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <article className={`flex items-center gap-3 bg-white ${isRow ? "px-4 py-3" : "rounded-2xl border border-[#E2E8F0] px-4 py-3"}`}>{content}</article>;
}

function circleDisplayName(circle: string) {
  switch (circle) {
    case "three":
      return "My 3";
    case "twelve":
      return "My 12";
    case "seventy":
      return "My 70";
    case "my_120":
      return "My 120";
    default:
      return "Field";
  }
}

function scoreLabel(value: number) {
  return `${Math.round(value)}`;
}

type CircleListItem = { person: DosAppPerson };
type CirclePersonItem = CircleListItem & { score: DosRelationshipScore };
type CircleLayerGroups = {
  my120: CirclePersonItem[];
  seventy: CirclePersonItem[];
  three: CirclePersonItem[];
  twelve: CirclePersonItem[];
};

function uniqueCircleMembers(items: CirclePersonItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.person.id)) {
      return false;
    }

    seen.add(item.person.id);
    return true;
  });
}

function circleLayerDetails(activeCircle: CircleFocusView, circleGroups: CircleLayerGroups) {
  switch (activeCircle) {
    case "three":
      return {
        capacity: 3,
        cumulativeCount: circleGroups.three.length,
        empty: "No one in My 3 yet.",
        items: circleGroups.three,
        sectionLabel: "Top 3",
        startIndex: 0,
        subtitle: "The people you invest in most deeply.",
        title: "My 3",
        value: "3",
      };
    case "twelve":
      return {
        capacity: 12,
        cumulativeCount: circleGroups.three.length + circleGroups.twelve.length,
        empty: "No additional people in your 12 yet.",
        items: circleGroups.twelve,
        sectionLabel: "Next 9 People",
        startIndex: 3,
        subtitle: "These are the next 9 people in your core circle. Together with your 3, this makes 12.",
        title: "My 12",
        value: "12",
      };
    case "seventy":
      return {
        capacity: 70,
        cumulativeCount: circleGroups.three.length + circleGroups.twelve.length + circleGroups.seventy.length,
        empty: "No additional people in your 70 yet.",
        items: circleGroups.seventy,
        sectionLabel: "Next 58 People",
        startIndex: 12,
        subtitle: "These are the next 58 people in your broader field. Together with your 12, this makes 70.",
        title: "My 70",
        value: "70",
      };
    case "my_120":
      return {
        capacity: 120,
        cumulativeCount: circleGroups.three.length + circleGroups.twelve.length + circleGroups.seventy.length + circleGroups.my120.length,
        empty: "No additional people in your 120 yet.",
        items: circleGroups.my120,
        sectionLabel: "Next 50 People",
        startIndex: 70,
        subtitle: "These are the next 50 people in your extended field. Together with your 70, this makes 120.",
        title: "My 120",
        value: "120",
      };
  }
}

function previewCircleLayerItems(activeCircle: CircleFocusView, items: CirclePersonItem[]) {
  return activeCircle === "seventy" || activeCircle === "my_120" ? items.slice(0, 6) : items;
}

function peopleCircleDetails(activeCircle: PeopleCircleView, circleGroups: CircleLayerGroups) {
  const details = circleLayerDetails(activeCircle, circleGroups);

  return {
    empty: details.empty,
    items: details.items,
    sectionLabel: details.sectionLabel,
    startIndex: details.startIndex,
    subtitle: details.subtitle,
    title: details.title,
  };
}

function filterCircleItems(items: CircleListItem[], query: string) {
  const filtered = filteredPeople(items.map(({ person }) => person), query);
  const filteredIds = new Set(filtered.map((person) => person.id));

  return items.filter(({ person }) => filteredIds.has(person.id));
}

function CircleAvatar({
  index,
  layer,
  person,
  size = "md",
}: {
  index: number;
  layer?: "center" | "middle" | "outer";
  person?: DosAppPerson;
  size?: "lg" | "md" | "sm" | "xs";
}) {
  const sizeClass = {
    lg: "h-11 w-11 text-sm",
    md: "h-10 w-10 text-xs",
    sm: "h-8 w-8 text-[10px]",
    xs: "h-6 w-6 text-[8px]",
  }[size];

  if (!person) {
    return (
      <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-dashed border-[#E2E8F0] bg-[#F1F5F9] text-[#94A3B8]`}>
        +
      </span>
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full font-bold ${avatarTone(index)}`}
      data-circle-layer={layer}
      data-person-id={person.id}
    >
      {initials(person.name)}
    </span>
  );
}

function CircleTarget({
  my12Count,
  my120Count,
  my3Count,
  my70Count,
  onSelectCircle,
}: {
  my12Count: number;
  my120Count: number;
  my3Count: number;
  my70Count: number;
  onSelectCircle: (circle: CircleFocusView) => void;
}) {
  const [focusedCircle, setFocusedCircle] = useState<CircleFocusView | null>(null);
  const isMy3Focused = focusedCircle === "three";
  const isMy12Focused = focusedCircle === "twelve";
  const isMy70Focused = focusedCircle === "seventy";
  const isMy120Focused = focusedCircle === "my_120";

  return (
    <div
      aria-label="Discipleship circle target"
      className="relative mx-auto mt-1 h-[236px] w-[236px] rounded-full max-[350px]:h-[220px] max-[350px]:w-[220px]"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusedCircle(null);
        }
      }}
      onMouseLeave={() => setFocusedCircle(null)}
    >
      <span
        className={`absolute inset-0 rounded-full border bg-white transition-all duration-200 ${
          isMy120Focused
            ? "border-[#2563EB]/55 shadow-[0_0_0_5px_rgba(37,99,235,0.055),0_18px_42px_rgba(37,99,235,0.08)]"
            : "border-[#DCEBFF] shadow-[0_16px_34px_rgba(37,99,235,0.045)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-1/2 top-1/2 h-[184px] w-[184px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#F8FBFF] transition-all duration-200 max-[350px]:h-[172px] max-[350px]:w-[172px] ${
          isMy70Focused
            ? "border-[#2563EB]/60 shadow-[0_0_0_5px_rgba(37,99,235,0.06),inset_0_8px_26px_rgba(255,255,255,0.82),0_14px_30px_rgba(37,99,235,0.10)]"
            : "border-[#CFE0FF]/90 shadow-[inset_0_6px_26px_rgba(255,255,255,0.82)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-1/2 top-1/2 h-[126px] w-[126px] -translate-x-1/2 -translate-y-1/2 rounded-full border bg-[#EBF2FF]/78 transition-all duration-200 max-[350px]:h-[118px] max-[350px]:w-[118px] ${
          isMy12Focused
            ? "border-[#2563EB]/60 shadow-[0_0_0_4px_rgba(37,99,235,0.075),inset_0_8px_24px_rgba(255,255,255,0.78)]"
            : "border-[#CFE0FF]/85 shadow-[inset_0_8px_24px_rgba(255,255,255,0.68)]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`absolute left-1/2 top-1/2 h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#BFDBFE] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] transition-all duration-200 max-[350px]:h-[62px] max-[350px]:w-[62px] ${
          isMy3Focused
            ? "scale-[1.03] shadow-[0_14px_28px_rgba(37,99,235,0.36),inset_0_5px_14px_rgba(255,255,255,0.28)]"
            : "shadow-[0_12px_24px_rgba(37,99,235,0.30),inset_0_5px_14px_rgba(255,255,255,0.22)]"
        }`}
        aria-hidden="true"
      />
      <svg
        aria-hidden="true"
        className="absolute inset-0 z-10 h-full w-full"
        viewBox="0 0 236 236"
      >
        <circle
          className="cursor-pointer"
          cx="118"
          cy="118"
          fill="none"
          onClick={() => onSelectCircle("my_120")}
          onMouseEnter={() => setFocusedCircle("my_120")}
          pointerEvents="stroke"
          r="108"
          stroke="transparent"
          strokeWidth="24"
        />
        <circle
          className="cursor-pointer"
          cx="118"
          cy="118"
          fill="none"
          onClick={() => onSelectCircle("seventy")}
          onMouseEnter={() => setFocusedCircle("seventy")}
          pointerEvents="stroke"
          r="83"
          stroke="transparent"
          strokeWidth="30"
        />
        <circle
          className="cursor-pointer"
          cx="118"
          cy="118"
          fill="none"
          onClick={() => onSelectCircle("twelve")}
          onMouseEnter={() => setFocusedCircle("twelve")}
          pointerEvents="stroke"
          r="55"
          stroke="transparent"
          strokeWidth="34"
        />
        <circle
          className="cursor-pointer"
          cx="118"
          cy="118"
          fill="transparent"
          onClick={() => onSelectCircle("three")}
          onMouseEnter={() => setFocusedCircle("three")}
          r="33"
        />
      </svg>
      <button
        aria-label={`Open My 120, ${my120Count} people`}
        className="absolute left-1/2 top-[5px] z-20 flex h-5 min-w-12 -translate-x-1/2 items-center justify-center rounded-full px-2 text-center text-[14px] font-extrabold leading-none text-[#60A5FA] transition-all duration-200 hover:bg-[#EFF6FF] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 max-[350px]:top-[4px] max-[350px]:text-[13px]"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("my_120");
        }}
        onFocus={() => setFocusedCircle("my_120")}
        onMouseEnter={() => setFocusedCircle("my_120")}
        type="button"
      >
        120
      </button>
      <button
        aria-label={`Open My 70, ${my70Count} people`}
        className="absolute left-1/2 top-[31px] z-20 flex h-5 min-w-11 -translate-x-1/2 items-center justify-center rounded-full px-2 text-center text-[14px] font-extrabold leading-none text-[#3B82F6] transition-all duration-200 hover:bg-[#EFF6FF] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 max-[350px]:top-[28px] max-[350px]:text-[13px]"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("seventy");
        }}
        onFocus={() => setFocusedCircle("seventy")}
        onMouseEnter={() => setFocusedCircle("seventy")}
        type="button"
      >
        70
      </button>
      <button
        aria-label={`Open My 12, ${my12Count} people`}
        className="absolute left-1/2 top-[61px] z-20 flex h-5 min-w-11 -translate-x-1/2 items-center justify-center rounded-full px-2 text-center text-[14px] font-extrabold leading-none text-[#2563EB] transition-all duration-200 hover:bg-[#EFF6FF] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 max-[350px]:top-[54px] max-[350px]:text-[13px]"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("twelve");
        }}
        onFocus={() => setFocusedCircle("twelve")}
        onMouseEnter={() => setFocusedCircle("twelve")}
        type="button"
      >
        12
      </button>
      <button
        aria-label={`Open My 3, ${my3Count} people`}
        className="absolute left-1/2 top-1/2 z-30 flex h-[66px] w-[66px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center transition-colors duration-200 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 max-[350px]:h-[62px] max-[350px]:w-[62px]"
        onClick={(event) => {
          event.stopPropagation();
          onSelectCircle("three");
        }}
        onFocus={() => setFocusedCircle("three")}
        onMouseEnter={() => setFocusedCircle("three")}
        type="button"
      >
        <span className="text-[17px] font-extrabold leading-none text-white max-[350px]:text-[16px]">3</span>
      </button>
    </div>
  );
}

function CircleFocusHero({
  circleGroups,
  onSelectCircle,
}: {
  circleGroups: CircleLayerGroups;
  onSelectCircle: (circle: CircleFocusView) => void;
}) {
  const my3Count = circleGroups.three.length;
  const my12Count = circleGroups.three.length + circleGroups.twelve.length;
  const my70Count = circleGroups.three.length + circleGroups.twelve.length + circleGroups.seventy.length;
  const my120Count = my70Count + circleGroups.my120.length;

  return (
    <section className="-mt-1 px-1 pb-1">
      <CircleTarget my12Count={my12Count} my120Count={my120Count} my3Count={my3Count} my70Count={my70Count} onSelectCircle={onSelectCircle} />
    </section>
  );
}

function CircleListRow({
  index,
  isLast = false,
  lastMeetingDate,
  onClick,
  onLogMeeting,
  person,
}: {
  index: number;
  isLast?: boolean;
  lastMeetingDate?: string | null;
  onClick: () => void;
  onLogMeeting?: () => void;
  person: DosAppPerson;
}) {
  const needsFollowUp = person.status === "follow_up";
  const activity = needsFollowUp
    ? "Follow up today"
    : lastMeetingDate
      ? `Met ${formatRelativeDate(lastMeetingDate).toLowerCase()}`
      : "No table yet";

  return (
    <div
      className={`flex min-h-[64px] w-full items-center gap-3 bg-white px-3 py-2 text-left transition-colors hover:bg-[#F8FBFF] ${isLast ? "" : "border-b border-[#EFF6FF]"}`}
    >
      <CircleAvatar index={index} person={person} size="sm" />
      <button className="min-w-0 flex-1 text-left" onClick={onClick} type="button">
        <span className="block truncate text-sm font-semibold text-[#0F172A]">{person.name}</span>
        <span className={`mt-0.5 block truncate text-xs ${needsFollowUp ? "font-semibold text-[#1D4ED8]" : "text-[#2563EB]"}`}>{activity}</span>
      </button>
      {onLogMeeting ? (
        <button
          aria-label={`Log table with ${person.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#DCEBFF] bg-white text-[#1D4ED8] transition-colors hover:border-[#2563EB] hover:bg-[#EFF6FF]"
          onClick={onLogMeeting}
          type="button"
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
        </button>
      ) : null}
      <button
        aria-label={`Open ${person.name}`}
        className="flex h-8 w-7 shrink-0 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
        onClick={onClick}
        type="button"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function RecentActivityRow({
  children,
  icon,
  onClick,
  title,
}: {
  children: ReactNode;
  icon: IconName;
  onClick: () => void;
  title: string;
}) {
  return (
    <button className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-white px-3 text-left" onClick={onClick} type="button">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#1D4ED8]">
        <Icon name={icon} size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0F172A]">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-[#64748B]">{children}</span>
      </span>
    </button>
  );
}

function WeekStatTile({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: number;
}) {
  const isPrayerIcon = icon === "prayer";

  return (
    <div className="min-w-0 rounded-[18px] border border-[#E2E8F0] bg-white px-2.5 py-3 text-center shadow-[0_10px_26px_rgba(37,99,235,0.055)] max-[350px]:px-2">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE] max-[350px]:h-7 max-[350px]:w-7">
          {isPrayerIcon ? (
            <svg aria-hidden="true" className="h-[22px] w-[22px] max-[350px]:h-5 max-[350px]:w-5" fill="none" viewBox="0 0 64 64">
              <path
                d="M29.5 4.5c-4.8 0-8.6 3.9-8.6 8.8v18.6c0 3.8-1.4 7.4-3.9 10.3l-2 2.3 10.1 11.2 3.7-3.8c3.6-3.7 5.6-8.7 5.6-13.9V9.5c0-2.8-2.2-5-4.9-5Z"
                fill="#EFF6FF"
                stroke="#2563EB"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4.2"
              />
              <path
                d="M34.5 4.5c4.8 0 8.6 3.9 8.6 8.8v18.6c0 3.8 1.4 7.4 3.9 10.3l2 2.3-10.1 11.2-3.7-3.8c-3.6-3.7-5.6-8.7-5.6-13.9V9.5c0-2.8 2.2-5 4.9-5Z"
                fill="#EFF6FF"
                stroke="#2563EB"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4.2"
              />
              <path d="M3.8 49.3 15 40.6l11.1 13.2-11 8.5c-1.2.9-2.9.7-3.8-.5l-8-10.4c-.5-.7-.4-1.6.5-2.1Z" fill="#2563EB" />
              <path d="M60.2 49.3 49 40.6 37.9 53.8l11 8.5c1.2.9 2.9.7 3.8-.5l8-10.4c.5-.7.4-1.6-.5-2.1Z" fill="#2563EB" />
              <path d="M32 7v32" stroke="#2563EB" strokeLinecap="round" strokeWidth="3.8" />
              <path d="M26.5 10.5v25" stroke="#2563EB" strokeLinecap="round" strokeWidth="2.8" />
              <path d="M37.5 10.5v25" stroke="#2563EB" strokeLinecap="round" strokeWidth="2.8" />
            </svg>
          ) : (
            <Icon name={icon} size={14} />
          )}
        </span>
        <span className="mt-1.5 block text-[24px] font-bold leading-none text-[#0F172A] max-[350px]:text-[21px]">{value}</span>
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-3 text-center text-[8px] font-bold uppercase leading-3 tracking-[0.1em] text-[#64748B] max-[350px]:tracking-[0.06em]" style={{ fontFamily: font.rajdhani }}>
        {label}
      </p>
    </div>
  );
}

function MeetingCard({
  meeting,
  onClick,
  people,
}: {
  meeting: DosAppMeeting;
  onClick: () => void;
  people: DosAppPerson[];
}) {
  const avatarNames = meetingAvatarNames(meeting, people);
  const participantTitle = meetingParticipantTitle(meeting, people);
  const hasPeople = Boolean(participantTitle);
  const context = meetingActivityTitle(meeting);
  const isScheduled = meeting.meetingStatus === "scheduled";
  const summary = meeting.notes?.trim();
  const title = meetingDisplayTitle(meeting, people);
  const statusLabel = isScheduled ? "Scheduled" : "Logged";
  const metadata = isScheduled
    ? `Scheduled • ${formatMeetingTimeRange(meeting)}`
    : hasPeople ? `${context} • ${formatDate(meeting.date)}` : formatDate(meeting.date);

  return (
    <button className="group w-full max-w-[calc(100vw-32px)] rounded-[24px] border border-[#EAF2FF] bg-white p-3.5 text-left shadow-[0_14px_34px_rgba(37,99,235,0.045)] transition-all hover:border-[#BFDBFE] hover:shadow-[0_18px_40px_rgba(37,99,235,0.08)] md:max-w-none md:rounded-[20px] md:p-3 md:shadow-[0_10px_28px_rgba(37,99,235,0.04)]" onClick={onClick} type="button">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex shrink-0 items-center">
          {avatarNames.length ? (
            <div className="flex -space-x-2">
              {avatarNames.map((name, index) => (
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold shadow-sm ${avatarTone(index)}`}
                  key={`${meeting.id}-${name}`}
                >
                  {initials(name)}
                </span>
              ))}
            </div>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] shadow-sm">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-5 text-[#0F172A]">{title}</p>
              <p className="mt-1 truncate text-xs leading-5 text-[#64748B]">{metadata}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#94A3B8] transition-colors group-hover:text-[#2563EB]" aria-hidden="true" strokeWidth={1.8} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              {context}
            </span>
            <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
              {statusLabel}
            </span>
          </div>
          {summary ? (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#334155] md:text-[13px]">{summary}</p>
          ) : (
            <p className="mt-2 text-sm leading-5 text-[#94A3B8] md:text-[13px]">{isScheduled ? "No prep notes yet" : "No reflection yet"}</p>
          )}
          {isScheduled && meeting.googleSyncEnabled ? (
            <span className="mt-2 inline-flex rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8]">
              {meeting.googleSyncStatus === "synced" ? "Google synced" : meeting.googleSyncStatus === "failed" ? "Google failed" : "Google pending"}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function calendarItemTone(kind: MeetingCalendarItemKind) {
  switch (kind) {
    case "google":
      return {
        bg: "bg-[#EEF6FF]",
        dot: "bg-[#0EA5E9]",
        text: "text-[#0369A1]",
      };
    case "birthday":
      return {
        bg: "bg-[#FEF3C7]",
        dot: "bg-[#F59E0B]",
        text: "text-[#B45309]",
      };
    case "anniversary":
      return {
        bg: "bg-[#FCE7F3]",
        dot: "bg-[#DB2777]",
        text: "text-[#BE185D]",
      };
    case "follow_up":
      return {
        bg: "bg-[#DCFCE7]",
        dot: "bg-[#16A34A]",
        text: "text-[#15803D]",
      };
    case "prayer":
      return {
        bg: "bg-[#EDE9FE]",
        dot: "bg-[#7C3AED]",
        text: "text-[#6D28D9]",
      };
    case "meeting":
    default:
      return {
        bg: "bg-[#EBF2FF]",
        dot: "bg-[#2563EB]",
        text: "text-[#1D4ED8]",
      };
  }
}

function calendarItemLabel(kind: MeetingCalendarItemKind) {
  switch (kind) {
    case "google":
      return "Google";
    case "birthday":
      return "Birthday";
    case "anniversary":
      return "Anniversary";
    case "follow_up":
      return "Follow Up";
    case "prayer":
      return "Prayer";
    case "meeting":
    default:
      return "Table";
  }
}

function calendarItemMatchesFilter(item: MeetingCalendarItem, filter: MeetingCalendarFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "dos") {
    return item.kind === "meeting";
  }

  if (filter === "google") {
    return item.kind === "google";
  }

  return item.kind !== "meeting" && item.kind !== "google";
}

function CalendarItemIcon({ kind }: { kind: MeetingCalendarItemKind }) {
  const className = "h-4 w-4";

  switch (kind) {
    case "google":
      return <CalendarDays className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "birthday":
      return <Cake className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "anniversary":
      return <HeartHandshake className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "follow_up":
      return <Send className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "prayer":
      return <Heart className={className} aria-hidden="true" strokeWidth={1.9} />;
    case "meeting":
    default:
      return <CalendarDays className={className} aria-hidden="true" strokeWidth={1.9} />;
  }
}

function CalendarAgendaItem({
  item,
  onOpenExternalEvent,
  onOpenMeeting,
  onOpenReminder,
}: {
  item: MeetingCalendarItem;
  onOpenExternalEvent: (eventId: string) => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenReminder: (reminderId: string) => void;
}) {
  const tone = calendarItemTone(item.kind);
  const content = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.bg} ${tone.text}`}>
        <CalendarItemIcon kind={item.kind} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-5 text-[#0F172A]">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs font-medium leading-4 text-[#64748B]">{item.subtitle}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${tone.bg} ${tone.text}`} style={{ fontFamily: font.rajdhani }}>
            {calendarItemLabel(item.kind)}
          </span>
          {item.syncLabel ? (
            <span className="rounded-full border border-[#E2E8F0] bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
              {item.syncLabel}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </>
  );
  const className = "flex min-h-[74px] w-full items-center gap-3 rounded-[20px] border border-[#EAF2FF] bg-white px-3.5 py-3 text-left shadow-[0_10px_26px_rgba(37,99,235,0.045)] transition-colors hover:border-[#BFDBFE]";

  const meeting = item.meeting;
  const reminder = item.reminder;
  const externalEvent = item.externalEvent;

  if (meeting) {
    return (
      <button className={className} onClick={() => onOpenMeeting(meeting.id)} type="button">
        {content}
      </button>
    );
  }

  if (reminder) {
    return (
      <button className={className} onClick={() => onOpenReminder(reminder.id)} type="button">
        {content}
      </button>
    );
  }

  if (externalEvent) {
    return (
      <button className={className} onClick={() => onOpenExternalEvent(externalEvent.id)} type="button">
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function MeetingCalendarView({
  calendarFilter,
  calendarSyncMessage,
  googleCalendarConnected,
  isSyncingGoogleCalendar,
  items,
  month,
  onCalendarFilterChange,
  onChangeMonth,
  onOpenExternalEvent,
  onOpenMeeting,
  onOpenReminder,
  onScheduleMeeting,
  onSelectDate,
  onSyncGoogleCalendar,
  onToday,
  selectedDateKey,
}: {
  calendarFilter: MeetingCalendarFilter;
  calendarSyncMessage: string;
  googleCalendarConnected: boolean;
  isSyncingGoogleCalendar: boolean;
  items: MeetingCalendarItem[];
  month: Date;
  onCalendarFilterChange: (filter: MeetingCalendarFilter) => void;
  onChangeMonth: (offset: number) => void;
  onOpenExternalEvent: (eventId: string) => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenReminder: (reminderId: string) => void;
  onScheduleMeeting: () => void;
  onSelectDate: (date: Date) => void;
  onSyncGoogleCalendar: () => void;
  onToday: () => void;
  selectedDateKey: string;
}) {
  const monthStart = startOfCalendarMonth(month);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const filteredItems = items.filter((item) => calendarItemMatchesFilter(item, calendarFilter));
  const itemsByDay = filteredItems.reduce((map, item) => {
    const key = calendarDateKeyFromValue(item.date);

    if (!key) {
      return map;
    }

    const dayItems = map.get(key) ?? [];
    dayItems.push(item);
    map.set(key, dayItems);

    return map;
  }, new Map<string, MeetingCalendarItem[]>());
  const selectedItems = itemsByDay.get(selectedDateKey) ?? [];

  return (
    <section className="space-y-3 md:grid md:grid-cols-[minmax(0,1fr)] md:gap-4 md:space-y-0 lg:grid-cols-[minmax(0,1.42fr)_minmax(300px,360px)]">
      <div className="overflow-hidden rounded-[28px] border border-[#DCEBFF] bg-white shadow-[0_18px_48px_rgba(37,99,235,0.07)] md:rounded-[26px] md:bg-white/92 md:backdrop-blur">
        <header className="flex items-center justify-between gap-2 border-b border-[#EFF6FF] px-3 py-3">
          <button
            aria-label="Previous month"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#2563EB] transition-colors hover:bg-[#EBF2FF]"
            onClick={() => onChangeMonth(-1)}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-base font-black leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
              {calendarMonthLabel(month)}
            </h2>
            <button className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]" onClick={onToday} style={{ fontFamily: font.rajdhani }} type="button">
              Today
            </button>
          </div>
          <button
            aria-label="Next month"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#2563EB] transition-colors hover:bg-[#EBF2FF]"
            onClick={() => onChangeMonth(1)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
        </header>

        <div className="px-2.5 pb-3 pt-2">
          <div className="grid grid-cols-7 gap-1 pb-1.5">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <div className="text-center text-[9px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]" key={`${day}-${index}`} style={{ fontFamily: font.rajdhani }}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const key = calendarDateKey(date);
              const dayItems = itemsByDay.get(key) ?? [];
              const isSelected = key === selectedDateKey;
              const isOutsideMonth = !isSameCalendarMonth(date, month);
              const isToday = key === todayDateValue();

              return (
                <button
                  aria-label={new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(date)}
                  aria-pressed={isSelected}
                  className={`min-h-[48px] rounded-[16px] px-1.5 py-1.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 max-[350px]:min-h-[44px] max-[350px]:rounded-[14px] md:min-h-[58px] ${
                    isSelected
                      ? "bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]"
                      : isToday
                        ? "bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]"
                        : "bg-[#F8FAFC] text-[#0F172A] hover:bg-[#EBF2FF]"
                  } ${isOutsideMonth && !isSelected ? "opacity-45" : ""}`}
                  key={key}
                  onClick={() => onSelectDate(date)}
                  type="button"
                >
                  <span className="block text-center text-xs font-bold leading-none max-[350px]:text-[11px]">{date.getDate()}</span>
                  {dayItems.length ? (
                    <span className="mt-2 flex min-h-1.5 items-center justify-center gap-0.5">
                      {dayItems.slice(0, 3).map((item) => (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : calendarItemTone(item.kind).dot}`} key={item.id} />
                      ))}
                      {dayItems.length > 3 ? <span className={`text-[8px] font-bold leading-none ${isSelected ? "text-white" : "text-[#64748B]"}`}>+{dayItems.length - 3}</span> : null}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="min-w-0 space-y-3">
        <div className="space-y-2 rounded-[24px] border border-[#DCEBFF] bg-white p-3 shadow-[0_12px_30px_rgba(37,99,235,0.055)] md:bg-white/92 md:backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
              Sources
            </div>
            {googleCalendarConnected ? (
              <button
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8] disabled:opacity-60"
                disabled={isSyncingGoogleCalendar}
                onClick={onSyncGoogleCalendar}
                style={{ fontFamily: font.rajdhani }}
                type="button"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncingGoogleCalendar ? "animate-spin" : ""}`} aria-hidden="true" strokeWidth={1.9} />
                Sync
              </button>
            ) : null}
          </div>
          <SegmentedTabs onChange={onCalendarFilterChange} options={meetingCalendarFilterTabs} value={calendarFilter} />
          <p className="px-1 text-xs font-medium leading-5 text-[#64748B]">
            {calendarSyncMessage || (googleCalendarConnected ? "Google events are read-only." : "Connect Google to read events.")}
          </p>
        </div>

        <section className="min-w-0 rounded-[24px] border border-[#EAF2FF] bg-white p-3 shadow-[0_12px_30px_rgba(37,99,235,0.045)] md:bg-white/92 md:backdrop-blur">
          <div className="mb-3 px-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
              Selected Day Agenda
            </div>
            <h3 className="mt-1 truncate text-base font-black leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
              {calendarSelectedDayLabel(selectedDateKey)}
            </h3>
          </div>
          <div className="grid gap-2.5">
            {selectedItems.length ? selectedItems.map((item) => (
              <CalendarAgendaItem
                item={item}
                key={item.id}
                onOpenExternalEvent={onOpenExternalEvent}
                onOpenMeeting={onOpenMeeting}
                onOpenReminder={onOpenReminder}
              />
            )) : (
              <SectionEmptyState
                action={<CompactButton icon="calendar" onClick={onScheduleMeeting}>Schedule Table</CompactButton>}
                text="Scheduled tables and reminders for the selected day will appear here."
                title="Nothing on this day."
              />
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}

function GoogleCalendarEventDetailSheet({
  event,
  isAdding,
  onAddToDos,
  onClose,
}: {
  event: DosAppExternalCalendarEvent;
  isAdding: boolean;
  onAddToDos: () => void;
  onClose: () => void;
}) {
  const alreadyAdded = Boolean(event.importedMeetingId);

  return (
    <MobileBottomSheet
      badge={<span className="rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>Google</span>}
      footer={(
        <div className="grid gap-2">
          <button
            className="min-h-11 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.22)] disabled:opacity-60"
            disabled={alreadyAdded || isAdding}
            onClick={onAddToDos}
            type="button"
          >
            {alreadyAdded ? "Already added to DOS" : isAdding ? "Adding..." : "Add to DOS"}
          </button>
          {event.htmlLink ? (
            <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-bold text-[#0F172A]" href={event.htmlLink} rel="noreferrer" target="_blank">
              Open in Google
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
            </a>
          ) : null}
        </div>
      )}
      onClose={onClose}
      subtitle={formatExternalCalendarEventTimeRange(event)}
      title={event.title}
    >
      <div className="grid gap-3">
        <div className="rounded-[22px] border border-[#EAF2FF] bg-[#F8FAFC] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Source</p>
          <p className="mt-1 text-sm font-semibold text-[#0F172A]">{event.sourceName ?? "Google Calendar"}</p>
        </div>
        {event.location ? (
          <div className="rounded-[22px] border border-[#EAF2FF] bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Location</p>
            <p className="mt-1 text-sm leading-5 text-[#334155]">{event.location}</p>
          </div>
        ) : null}
        {event.description ? (
          <div className="rounded-[22px] border border-[#EAF2FF] bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Details</p>
            <p className="mt-1 line-clamp-5 whitespace-pre-line text-sm leading-5 text-[#334155]">{event.description}</p>
          </div>
        ) : null}
      </div>
    </MobileBottomSheet>
  );
}

function CompactOptionSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ helper?: string; label: string; value: string }>;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <FieldLabel>{label}</FieldLabel>
      <button
        aria-expanded={isOpen}
        className={`mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left text-sm transition-colors ${
          isOpen ? "border-[#2563EB] shadow-[0_10px_24px_rgba(37,99,235,0.12)]" : "border-[#E2E8F0] hover:border-[#BFDBFE]"
        }`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate font-semibold text-[#0F172A]">{selectedOption?.label ?? "Select"}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`} aria-hidden="true" strokeWidth={1.8} />
      </button>
      {isOpen ? (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_18px_45px_rgba(42,37,29,0.14)]">
          {options.map((option) => {
            const selected = option.value === selectedOption?.value;

            return (
              <button
                aria-pressed={selected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors ${
                  selected ? "bg-[#EBF2FF] text-[#1D4ED8]" : "text-[#0F172A] hover:bg-[#F1F5F9]"
                }`}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{option.label}</span>
                {option.helper ? <span className="shrink-0 text-[11px] font-medium text-[#94A3B8]">{option.helper}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FormOptionSelect({
  defaultValue = "",
  label,
  name,
  options,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: ReadonlyArray<{ helper?: string; label: string; value: string }>;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <>
      <input name={name} type="hidden" value={value} />
      <CompactOptionSelect label={label} onChange={setValue} options={options} value={value} />
    </>
  );
}

function MeetingContextPicker({
  onChange,
  value,
}: {
  onChange: (value: DosAppMeetingType) => void;
  value: DosAppMeetingType;
}) {
  return (
    <CompactOptionSelect
      label="Table Context"
      onChange={(nextValue) => onChange(nextValue as DosAppMeetingType)}
      options={meetingTypeOptions.map((option) => ({ label: option.label, value: option.value }))}
      value={value}
    />
  );
}

function ConversationFlowPicker({
  allowConversationFlows,
  onChange,
  value,
}: {
  allowConversationFlows: boolean;
  onChange: (value: DosConversationFlowKey) => void;
  value: DosConversationFlowKey;
}) {
  const options = allowConversationFlows
    ? conversationFlowOptions
    : conversationFlowOptions.filter((option) => option.value === "none");

  return (
    <CompactOptionSelect
      label="Conversation Flow"
      onChange={(nextValue) => onChange(nextValue as DosConversationFlowKey)}
      options={options}
      value={(options.find((option) => option.value === value) ?? options[0])?.value ?? "none"}
    />
  );
}

function responseAsNumber(value: DosConversationResponseValue | undefined) {
  return typeof value === "number" ? value : undefined;
}

function responseAsString(value: DosConversationResponseValue | undefined) {
  return typeof value === "string" ? value : "";
}

function responseAsStringArray(value: DosConversationResponseValue | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function questionResponseLabel(question: DosConversationQuestion, value: DosConversationResponseValue | undefined) {
  if (question.kind === "rating") {
    const rating = responseAsNumber(value);

    return rating ? `${rating} · ${relationshipWithJesusTemperature(rating)}` : "Skipped";
  }

  if (question.kind === "text" || question.kind === "notes") {
    return responseAsString(value) || "No notes";
  }

  return answerLabel(value as DosConversationAnswer | undefined);
}

function conversationFlowPreviewPrompts(flow: NonNullable<ReturnType<typeof getConversationFlowDefinition>>) {
  return flow.sections
    .flatMap((section) => section.questions)
    .map((question) => question.prompt ?? question.label)
    .slice(0, 3);
}

function ConversationFlowExperience({
  flowKey,
  onResponseChange,
  onToggleFollowUpAction,
  recommendedResources,
  responses,
}: {
  flowKey: DosConversationFlowKey;
  onResponseChange: (questionId: string, value: DosConversationResponseValue | undefined) => void;
  onToggleFollowUpAction: (actionId: string) => void;
  recommendedResources: DosRecommendedResource[];
  responses: DosConversationResponses;
}) {
  const flow = getConversationFlowDefinition(flowKey);
  const temperature = flowKey === "kitchen_table_gospel"
    ? relationshipWithJesusTemperature(responseAsNumber(responses.relationshipWithJesus))
    : null;
  const selectedFollowUpActions = responseAsStringArray(responses.followUpActions);

  if (!flow) {
    return null;
  }

  const guideResource = dosTableTeachingResources.find((resource) => resource.title === flow.title) ?? null;
  const previewPrompts = conversationFlowPreviewPrompts(flow);

  return (
    <section className="grid gap-2.5 rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-2.5 shadow-[0_10px_24px_rgba(37,99,235,0.04)]">
      <div className="rounded-[20px] border border-[#DCEBFF] bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
              Conversation Flow
            </p>
            <p className="mt-1 text-sm font-black leading-5 text-[#0F172A]">{flow.title}</p>
            <p className="mt-1 text-xs leading-5 text-[#64748B]">{flow.description}</p>
          </div>
          {temperature ? (
            <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              {temperature}
            </span>
          ) : null}
        </div>

        {previewPrompts.length ? (
          <div className="mt-3 grid gap-1.5">
            {previewPrompts.map((prompt, index) => (
              <div className="flex gap-2 rounded-2xl bg-[#F8FAFC] p-2.5 text-xs leading-5 text-[#475569]" key={`${flow.id}-prompt-${index}`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[10px] font-black text-[#1D4ED8]">
                  {index + 1}
                </span>
                <span>{prompt}</span>
              </div>
            ))}
          </div>
        ) : null}

        {guideResource || recommendedResources.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {guideResource ? (
              <a
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-xs font-bold text-[#1D4ED8]"
                href={guideResource.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
                Open guide
              </a>
            ) : null}
            {recommendedResources.slice(0, 3).map((resource) => (
              <span className="inline-flex min-h-8 items-center rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-semibold text-[#0F172A]" key={resource.id}>
                {resource.title}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <details className="group rounded-[20px] border border-[#E2E8F0] bg-white p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-[#0F172A] [&::-webkit-details-marker]:hidden">
          <span>Capture guided responses</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform group-open:rotate-90" aria-hidden="true" strokeWidth={1.9} />
        </summary>
        <div className="mt-3 grid gap-3">
          {flow.sections.map((section) => (
            <div className="grid gap-2" key={section.id}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                  {section.title}
                </p>
                {section.description ? <p className="mt-0.5 text-xs leading-5 text-[#64748B]">{section.description}</p> : null}
              </div>
              {section.questions.map((question) => (
                <ConversationQuestionCard
                  key={question.id}
                  onResponseChange={onResponseChange}
                  question={question}
                  value={responses[question.id]}
                />
              ))}
            </div>
          ))}

          {flow.closingPrompt || flow.gospelInvitation ? (
            <div className="rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                Gospel Invitation
              </p>
              {flow.closingPrompt ? <p className="mt-2 text-sm font-semibold leading-5 text-[#0F172A]">{flow.closingPrompt}</p> : null}
              {flow.gospelInvitation ? <p className="mt-1 text-xs leading-5 text-[#64748B]">{flow.gospelInvitation}</p> : null}
            </div>
          ) : null}

          {flow.followUpActions?.length ? (
            <div className="rounded-2xl bg-[#F1F5F9] p-2.5">
              <p className="text-sm font-semibold text-[#0F172A]">Follow-up</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {flow.followUpActions.map((action) => {
                  const selected = selectedFollowUpActions.includes(action.id);

                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-8 rounded-full border px-3 text-xs font-bold ${
                        selected ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#E2E8F0] bg-white text-[#0F172A]"
                      }`}
                      key={action.id}
                      onClick={() => onToggleFollowUpAction(action.id)}
                      type="button"
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}

function ConversationQuestionCard({
  onResponseChange,
  question,
  value,
}: {
  onResponseChange: (questionId: string, value: DosConversationResponseValue | undefined) => void;
  question: DosConversationQuestion;
  value: DosConversationResponseValue | undefined;
}) {
  if (question.kind === "rating") {
    const ratingValue = responseAsNumber(value);
    const scaleMin = question.scale?.min ?? 1;
    const scaleMax = question.scale?.max ?? 10;

    return (
      <div className="rounded-2xl bg-[#F1F5F9] p-2.5">
        <p className="text-sm font-semibold text-[#0F172A]">{question.label}</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {Array.from({ length: scaleMax - scaleMin + 1 }, (_, index) => scaleMin + index).map((rating) => {
            const selected = ratingValue === rating;

            return (
              <button
                aria-pressed={selected}
                className={`min-h-8 rounded-xl border text-xs font-bold ${
                  selected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E2E8F0] bg-white text-[#0F172A]"
                }`}
                key={rating}
                onClick={() => onResponseChange(question.id, selected ? undefined : rating)}
                type="button"
              >
                {rating}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-4 text-[#64748B]">1-3 Cold · 4-7 Lukewarm · 8-10 Hot</p>
      </div>
    );
  }

  if (question.kind === "text" || question.kind === "notes") {
    return (
      <label className="block rounded-2xl bg-[#F1F5F9] p-2.5">
        <span className="text-sm font-semibold text-[#0F172A]">{question.label}</span>
        <textarea
          className={`${FieldInputClass()} mt-2 min-h-20 bg-white py-3`}
          onChange={(event) => onResponseChange(question.id, event.target.value)}
          placeholder={question.placeholder}
          value={responseAsString(value)}
        />
      </label>
    );
  }

  const answer = value as DosConversationAnswer | undefined;
  const options = question.kind === "yes_no_unsure" ? conversationUnsureAnswerOptions : conversationYesNoOptions;

  return (
    <div className="rounded-2xl bg-[#F1F5F9] p-2.5">
      <p className="text-sm font-semibold leading-5 text-[#0F172A]">{question.label}</p>
      {question.scriptureRefs?.length ? (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          {question.scriptureRefs.join(" · ")}
        </p>
      ) : null}
      {question.prompt ? <p className="mt-1 text-xs leading-5 text-[#64748B]">{question.prompt}</p> : null}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {options.map((option) => {
          const selected = answer === option.value;

          return (
            <button
              aria-pressed={selected}
              className={`min-h-8 rounded-xl border text-xs font-bold ${
                selected ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#E2E8F0] bg-white text-[#0F172A]"
              }`}
              key={option.value}
              onClick={() => onResponseChange(question.id, selected ? undefined : option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MeetingPeopleSelector({
  allPeople,
  isCreatingPerson = false,
  onCreatePerson,
  onQueryChange,
  onToggle,
  people,
  query,
  selectedPersonIds,
}: {
  allPeople: DosAppPerson[];
  isCreatingPerson?: boolean;
  onCreatePerson?: (name: string) => Promise<void>;
  onQueryChange: (value: string) => void;
  onToggle: (personId: string) => void;
  people: DosAppPerson[];
  query: string;
  selectedPersonIds: string[];
}) {
  const selectedPeople = selectedPersonIds
    .map((personId) => allPeople.find((person) => person.id === personId))
    .filter((person): person is DosAppPerson => Boolean(person));
  const visiblePeople = people.filter((person) => !selectedPersonIds.includes(person.id));
  const hasSearch = query.trim().length > 0;
  const quickAddName = query.trim().replace(/\s+/g, " ");
  const canQuickAdd = Boolean(onCreatePerson && hasSearch && quickAddName && people.length === 0);

  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-3">
      <FieldLabel>People Involved</FieldLabel>
      {selectedPeople.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedPeople.map((person, index) => (
            <button
              aria-label={`Remove ${person.name} from table`}
              className="inline-flex h-7 max-w-full items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] pl-1 pr-2 text-[11px] font-semibold text-[#0F172A] transition-colors hover:border-[#2563EB]"
              key={person.id}
              onClick={() => onToggle(person.id)}
              type="button"
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${avatarTone(index)}`}>
                {initials(person.name)}
              </span>
              <span className="max-w-[9rem] truncate">{person.name}</span>
              <span className="ml-0.5 text-[13px] leading-none text-[#1D4ED8]" aria-hidden="true">
                &times;
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative mt-2.5">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
          <Icon name="search" size={14} />
        </span>
        <input
          className="min-h-11 w-full rounded-full border border-[#E2E8F0] bg-[#F1F5F9] pl-9 pr-4 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search people in your field"
          type="search"
          value={query}
        />
      </div>

      {allPeople.length && hasSearch && visiblePeople.length ? (
        <div className="mt-2 grid gap-1 pr-1">
          {visiblePeople.map((person, index) => (
            <button
              className="flex min-h-9 items-center gap-2.5 rounded-2xl px-2.5 text-left text-sm text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
              key={person.id}
              onClick={() => onToggle(person.id)}
              type="button"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${avatarTone(index)}`}>
                {initials(person.name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{person.name}</span>
            </button>
          ))}
        </div>
      ) : null}
      {canQuickAdd ? (
        <button
          className="mt-2 flex min-h-10 w-full items-center gap-2.5 rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-left text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isCreatingPerson}
          onClick={() => {
            void onCreatePerson?.(quickAddName);
          }}
          type="button"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#2563EB] ring-1 ring-[#BFDBFE]">
            <Icon name="add" size={13} />
          </span>
          <span className="min-w-0 truncate">
            {isCreatingPerson ? "Adding..." : <>+ Add &ldquo;{quickAddName}&rdquo;</>}
          </span>
        </button>
      ) : null}
    </section>
  );
}

function MeetingCaptureNotes({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Table Notes</FieldLabel>
        <span className="rounded-full bg-[#F1F5F9] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
          Notes
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-[#64748B]">Capture what happened, key moments, and anything to remember.</p>
      <textarea className={`${FieldTextareaClass()} mt-2 min-h-24`} defaultValue={defaultValue ?? ""} name="notes" placeholder="What happened at the table?" />
      <p className="mt-2 rounded-2xl bg-[#F8FAFC] px-3 py-2 text-[11px] font-semibold leading-4 text-[#64748B]">
        Voice, photo, and screenshot attachments are coming later. Notes are saved with this table for now.
      </p>
    </section>
  );
}

function MeetingLeaderReflectionSection({
  notesDefault,
  onToggleOutcomeTag,
  selectedOutcomeTags,
}: {
  notesDefault?: string | null;
  onToggleOutcomeTag: (tag: string) => void;
  selectedOutcomeTags: string[];
}) {
  return (
    <section className={meetingFormGroupClassName}>
      <div className={meetingFormGroupCardClassName}>
        <p className={meetingFormGroupTitleClassName}>Leader Reflection</p>

        <div className="mt-3 grid gap-3">
          <ObservedFruitMultiSelect
            onToggle={onToggleOutcomeTag}
            selectedOutcomeTags={selectedOutcomeTags}
          />

          <MeetingCaptureNotes defaultValue={notesDefault} />

          <label className="block rounded-[22px] border border-[#E2E8F0] bg-white p-3">
            <FieldLabel>Prayer Needs</FieldLabel>
            <p className="mt-1 text-xs leading-5 text-[#64748B]">Capture prayer requests or covering needed after this meeting.</p>
            <textarea className={`${FieldTextareaClass()} mt-2 min-h-20`} name="prayer_needs" placeholder="What should we pray for?" />
          </label>

          <div className="grid gap-2 rounded-2xl bg-[#F8FAFC] p-3">
            <label className="flex min-h-10 items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#0F172A]">Follow Up Needed</span>
                <span className="mt-0.5 block text-xs text-[#64748B]">Mark if this needs action soon.</span>
              </span>
              <input className="h-5 w-5 shrink-0 accent-[#2563EB]" name="follow_up_needed" type="checkbox" />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}

const meetingFormGroupClassName = "grid gap-3 rounded-[24px] border border-[#DCEBFF] bg-[#F8FAFC] p-2.5 shadow-[0_10px_24px_rgba(37,99,235,0.04)]";
const meetingFormGroupCardClassName = "rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]";
const meetingFormGroupTitleClassName = "text-sm font-bold text-[#0F172A]";

const meetingDurationOptions = [
  { label: "15m", value: "15" },
  { label: "30m", value: "30" },
  { label: "1h", value: "60" },
  { label: "2h", value: "120" },
  { label: "Custom", value: "custom" },
] as const;

function MeetingDurationSelector() {
  return (
    <fieldset className="grid gap-2 rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
      <FieldLabel>Table Duration</FieldLabel>
      {/* TODO: Persist table duration when the DOS meeting schema exposes a duration field. */}
      <div className="flex flex-wrap gap-2">
        {meetingDurationOptions.map((option) => (
          <label className="cursor-pointer" key={option.value}>
            <input className="peer sr-only" defaultChecked={option.value === "30"} name="meeting_duration" type="radio" value={option.value} />
            <span className="flex min-h-10 items-center justify-center rounded-full border border-[#DCEBFF] bg-[#F8FAFC] px-3 text-xs font-bold text-[#475569] transition-colors peer-checked:border-[#2563EB] peer-checked:bg-[#EBF2FF] peer-checked:text-[#1D4ED8] max-[350px]:min-h-9 max-[350px]:px-2.5">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ObservedFruitMultiSelect({
  onToggle,
  selectedOutcomeTags,
}: {
  onToggle: (tag: string) => void;
  selectedOutcomeTags: string[];
}) {
  const selectedOptions = meetingObservedFruitOptions.filter((option) => selectedOutcomeTags.includes(option.value));
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="grid gap-3 rounded-[22px] border border-[#BFDBFE] bg-[#F8FBFF] p-3 shadow-[0_10px_24px_rgba(37,99,235,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <FieldLabel>Observed Fruit</FieldLabel>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">Select any visible fruit from this meeting.</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
          {selectedOptions.length ? `${selectedOptions.length} selected` : "Optional"}
        </span>
      </div>

      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <button
              aria-label={`Remove ${option.label}`}
              className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-white px-2.5 text-xs font-bold text-[#1D4ED8]"
              key={option.value}
              onClick={() => onToggle(option.value)}
              type="button"
            >
              {option.label}
              <X className="h-3 w-3" aria-hidden="true" strokeWidth={2} />
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-[18px] border border-[#DCEBFF] bg-white p-2">
        <button
          aria-expanded={isOpen}
          className="flex min-h-10 w-full items-center justify-between gap-3 rounded-2xl px-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#F8FBFF]"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span>{isOpen ? "Hide outcomes" : "Show outcomes"}</span>
          <ChevronRight className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden="true" strokeWidth={1.9} />
        </button>
        {isOpen ? (
          <div className="mt-2 grid max-h-[42dvh] gap-1.5 overflow-y-auto pr-1">
            {meetingObservedFruitOptions.map((option) => {
              const selected = selectedOutcomeTags.includes(option.value);

              return (
                <button
                  aria-pressed={selected}
                  className={`flex min-h-10 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                    selected ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]" : "border-[#EAF2FF] bg-[#F8FAFC] text-[#475569] hover:border-[#BFDBFE] hover:bg-white"
                  }`}
                  key={option.value}
                  onClick={() => onToggle(option.value)}
                  type="button"
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#CBD5E1] bg-white text-transparent"
                  }`}>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MeetingRecommendationsPreview({
  resources,
}: {
  resources: DosRecommendedResource[];
}) {
  if (!resources.length) {
    return null;
  }

  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-3.5">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Recommended Resources</FieldLabel>
        <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
          Queued
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {resources.map((resource) => (
          <span className="rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 py-1.5 text-xs font-semibold text-[#0F172A]" key={resource.id}>
            {resource.title}
          </span>
        ))}
      </div>
    </section>
  );
}

function MeetingFormContent({
  allPeople,
  allowConversationFlows,
  buttonText,
  conversationResponses,
  dateDefault,
  errorMessage,
  includeReflectionFields = false,
  isCreatingPerson = false,
  isSubmitting,
  meetingPeopleOptions,
  meetingPeopleQuery,
  notesDefault,
  onContextChange,
  onCreatePerson,
  onConversationFlowChange,
  onConversationResponse,
  onSubmit,
  onToggleFollowUpAction,
  onToggleOutcomeTag,
  onTogglePerson,
  onPeopleQueryChange,
  recommendedResources,
  selectedConversationFlow,
  selectedMeetingContext,
  selectedOutcomeTags,
  selectedPersonIds,
  showDurationField = false,
  submittingText,
}: {
  allPeople: DosAppPerson[];
  allowConversationFlows: boolean;
  buttonText: string;
  conversationResponses: DosConversationResponses;
  dateDefault: string;
  errorMessage?: string;
  includeReflectionFields?: boolean;
  isCreatingPerson?: boolean;
  isSubmitting: boolean;
  meetingPeopleOptions: DosAppPerson[];
  meetingPeopleQuery: string;
  notesDefault?: string | null;
  onContextChange: (value: DosAppMeetingType) => void;
  onCreatePerson?: (name: string) => Promise<void>;
  onConversationFlowChange: (value: DosConversationFlowKey) => void;
  onConversationResponse: (questionId: string, value: DosConversationResponseValue | undefined) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleFollowUpAction: (actionId: string) => void;
  onToggleOutcomeTag?: (tag: string) => void;
  onTogglePerson: (personId: string) => void;
  onPeopleQueryChange: (value: string) => void;
  recommendedResources: DosRecommendedResource[];
  selectedConversationFlow: DosConversationFlowKey;
  selectedMeetingContext: DosAppMeetingType;
  selectedOutcomeTags?: string[];
  selectedPersonIds: string[];
  showDurationField?: boolean;
  submittingText: string;
}) {
  const peopleSelector = (
    <MeetingPeopleSelector
      allPeople={allPeople}
      isCreatingPerson={isCreatingPerson}
      onCreatePerson={onCreatePerson}
      onQueryChange={onPeopleQueryChange}
      onToggle={onTogglePerson}
      people={meetingPeopleOptions}
      query={meetingPeopleQuery}
      selectedPersonIds={selectedPersonIds}
    />
  );
  const durationSelector = showDurationField ? <MeetingDurationSelector /> : null;
  const meetingContextPicker = <MeetingContextPicker onChange={onContextChange} value={selectedMeetingContext} />;
  const conversationFlowPicker = (
    <ConversationFlowPicker
      allowConversationFlows={allowConversationFlows}
      onChange={onConversationFlowChange}
      value={selectedConversationFlow}
    />
  );

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block">
        <FieldLabel>Date</FieldLabel>
        <input className={FieldInputClass()} defaultValue={dateDefault} name="table_date" type="date" />
      </label>
      {showDurationField ? (
        <section className={meetingFormGroupClassName}>
          {peopleSelector}
          {durationSelector}
        </section>
      ) : (
        <>
          {durationSelector}
          {peopleSelector}
        </>
      )}
      {showDurationField ? (
        <section className={meetingFormGroupClassName}>
          <div className={meetingFormGroupCardClassName}>
            <p className={meetingFormGroupTitleClassName}>Table Details</p>
            <div className="mt-3 grid gap-3">
              {meetingContextPicker}
              {conversationFlowPicker}
            </div>
          </div>
        </section>
      ) : (
        <>
          {meetingContextPicker}
          {conversationFlowPicker}
        </>
      )}
      {selectedConversationFlow !== "none" ? (
        <ConversationFlowExperience
          flowKey={selectedConversationFlow}
          onResponseChange={onConversationResponse}
          onToggleFollowUpAction={onToggleFollowUpAction}
          recommendedResources={recommendedResources}
          responses={conversationResponses}
        />
      ) : null}
      {includeReflectionFields ? (
        <MeetingLeaderReflectionSection
          notesDefault={notesDefault}
          onToggleOutcomeTag={onToggleOutcomeTag ?? (() => undefined)}
          selectedOutcomeTags={selectedOutcomeTags ?? []}
        />
      ) : (
        <MeetingCaptureNotes defaultValue={notesDefault} />
      )}
      {selectedConversationFlow === "none" ? <MeetingRecommendationsPreview resources={recommendedResources} /> : null}
      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? submittingText : buttonText}</AppButton>
    </form>
  );
}

function CalendarConnectionCard({
  calendarConnection,
  isDisconnecting = false,
  onDisconnect,
  workspaceId,
}: {
  calendarConnection: DosAppCalendarConnection;
  isDisconnecting?: boolean;
  onDisconnect?: () => void;
  workspaceId: string;
}) {
  const connectHref = `/api/dos/app/calendar/google/connect?workspaceId=${encodeURIComponent(workspaceId)}&next=${encodeURIComponent(`/dos/app?workspace=${workspaceId}`)}`;
  const statusLabel = calendarConnection.connected ? "Connected" : "Not Connected";
  const statusClassName = calendarConnection.connected
    ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
    : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]";
  const statusDetail = calendarConnection.connected
    ? calendarConnection.googleAccountEmail ?? "Google Calendar is ready."
    : calendarConnection.googleConfigured ? "Connect Google Calendar to sync." : "Google setup needed before live sync.";
  const lastSyncLabel = calendarConnection.lastSyncedAt ? `Last sync ${formatDateTime(calendarConnection.lastSyncedAt)}` : "Tables and reminders still save locally when disconnected.";

  return (
    <section className="rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
          <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="block text-sm font-bold leading-5 text-[#0F172A]">Google Calendar</span>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClassName}`}>{statusLabel}</span>
          </span>
          <span className="mt-1 block text-xs leading-5 text-[#64748B]">
            {statusDetail}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[#64748B]">
            {lastSyncLabel}
          </span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {!calendarConnection.connected && calendarConnection.googleConfigured ? (
          <a className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-xs font-bold text-[#1D4ED8]" href={connectHref}>
            Connect Google Calendar
          </a>
        ) : null}
        {calendarConnection.connected && onDisconnect ? (
          <button
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-3 text-xs font-bold text-[#334155] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisconnecting}
            onClick={onDisconnect}
            type="button"
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ScheduleMeetingForm({
  allPeople,
  calendarConnection,
  errorMessage,
  isCalendarDisconnecting = false,
  isCreatingPerson = false,
  isSubmitting,
  meetingPeopleOptions,
  meetingPeopleQuery,
  onContextChange,
  onCreatePerson,
  onDisconnectCalendar,
  onPeopleQueryChange,
  onStartLogMeeting,
  onSubmit,
  onTogglePerson,
  selectedMeetingContext,
  selectedPersonIds,
  workspaceId,
}: {
  allPeople: DosAppPerson[];
  calendarConnection: DosAppCalendarConnection;
  errorMessage?: string;
  isCalendarDisconnecting?: boolean;
  isCreatingPerson?: boolean;
  isSubmitting: boolean;
  meetingPeopleOptions: DosAppPerson[];
  meetingPeopleQuery: string;
  onContextChange: (value: DosAppMeetingType) => void;
  onCreatePerson?: (name: string) => Promise<void>;
  onDisconnectCalendar?: () => void;
  onPeopleQueryChange: (value: string) => void;
  onStartLogMeeting: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTogglePerson: (personId: string) => void;
  selectedMeetingContext: DosAppMeetingType;
  selectedPersonIds: string[];
  workspaceId: string;
}) {
  function applySchedulePreset(event: MouseEvent<HTMLButtonElement>, offsetDays: number | null) {
    const form = event.currentTarget.form;
    const dateInput = form?.elements.namedItem("scheduled_date") as HTMLInputElement | null;

    if (!dateInput) {
      return;
    }

    if (offsetDays === null) {
      dateInput.focus();
      return;
    }

    dateInput.value = dateValueFromToday(offsetDays);
    dateInput.focus();
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <CalendarConnectionCard
        calendarConnection={calendarConnection}
        isDisconnecting={isCalendarDisconnecting}
        onDisconnect={onDisconnectCalendar}
        workspaceId={workspaceId}
      />
      <MeetingPeopleSelector
        allPeople={allPeople}
        isCreatingPerson={isCreatingPerson}
        onCreatePerson={onCreatePerson}
        onQueryChange={onPeopleQueryChange}
        onToggle={onTogglePerson}
        people={meetingPeopleOptions}
        query={meetingPeopleQuery}
        selectedPersonIds={selectedPersonIds}
      />
      <div className="grid gap-3 rounded-[24px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
        <MeetingContextPicker onChange={onContextChange} value={selectedMeetingContext} />
        <div>
          <FieldLabel>Timing</FieldLabel>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {[
              { label: "Tomorrow", offset: 1 },
              { label: "This Week", offset: 2 },
              { label: "Next Week", offset: 7 },
            ].map((preset) => (
              <button
                className="min-h-8 rounded-full border border-[#DCEBFF] bg-[#F8FAFC] px-3 text-[11px] font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
                key={preset.label}
                onClick={(event) => applySchedulePreset(event, preset.offset)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
            <button
              className="min-h-8 rounded-full border border-[#E2E8F0] bg-white px-3 text-[11px] font-bold text-[#64748B] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
              onClick={(event) => applySchedulePreset(event, null)}
              type="button"
            >
              Custom
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <FieldLabel>Date</FieldLabel>
            <input className={FieldInputClass()} defaultValue={todayDateValue()} name="scheduled_date" required type="date" />
          </label>
          <label className="block min-w-0">
            <FieldLabel>Start Time</FieldLabel>
            <input className={FieldInputClass()} defaultValue="18:00" name="scheduled_time" required type="time" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <FieldLabel>Duration</FieldLabel>
            <select className={FieldInputClass()} defaultValue="60" name="duration_minutes">
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
              <option value="90">90 min</option>
              <option value="120">2 hours</option>
            </select>
          </label>
          <label className="flex min-h-[72px] min-w-0 items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3">
            <input
              className="h-5 w-5 shrink-0 accent-[#2563EB]"
              defaultChecked={calendarConnection.connected}
              disabled={!calendarConnection.connected}
              name="google_sync_enabled"
              type="checkbox"
            />
            <span className="min-w-0">
              <span className="block text-xs font-bold leading-4 text-[#0F172A]">Sync to Google</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-[#64748B]">
                {calendarConnection.connected ? "Create a calendar event." : "Connect Google Calendar to sync."}
              </span>
            </span>
          </label>
        </div>
        <label className="block">
          <FieldLabel>Notes</FieldLabel>
          <textarea className={`${FieldTextareaClass()} min-h-20`} name="notes" placeholder="What should you remember before this table?" />
        </label>
      </div>
      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Scheduling..." : "Schedule Table"}</AppButton>
      <AppButton disabled={isSubmitting} icon="log" onClick={onStartLogMeeting} tone="white">Log Table Instead</AppButton>
    </form>
  );
}

function ReminderFormContent({
  calendarConnection,
  defaultReminderType,
  defaultPersonId,
  errorMessage,
  householdPerson,
  isCalendarDisconnecting = false,
  isSubmitting,
  onDelete,
  onDisconnectCalendar,
  onSubmit,
  people,
  reminder,
  workspaceId,
}: {
  calendarConnection: DosAppCalendarConnection;
  defaultReminderType?: DosAppRelationshipReminder["reminderType"];
  defaultPersonId?: string | null;
  errorMessage?: string;
  householdPerson?: DosAppPerson | null;
  isCalendarDisconnecting?: boolean;
  isSubmitting: boolean;
  onDelete?: () => void;
  onDisconnectCalendar?: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  people: DosAppPerson[];
  reminder?: DosAppRelationshipReminder | null;
  workspaceId: string;
}) {
  const fallbackPersonId = defaultPersonId ?? people[0]?.id ?? "";
  const resolvedReminderType = reminder?.reminderType ?? defaultReminderType ?? "follow_up";
  const defaultRecurrence = reminder?.recurrence ?? (["birthday", "anniversary", "baptism", "salvation"].includes(resolvedReminderType) ? "yearly" : "none");
  const shortcutPerson = householdPerson ?? people.find((person) => person.id === (reminder?.personId ?? fallbackPersonId)) ?? null;
  const householdReminderTitles = Array.from(new Set([
    shortcutPerson?.spouseName ? "Spouse birthday" : null,
    shortcutPerson?.childrenNames ? "Child birthday" : null,
    shortcutPerson?.spouseName || shortcutPerson?.householdNotes ? "Anniversary" : null,
  ].filter((title): title is string => Boolean(title))));

  function applyReminderTitle(event: MouseEvent<HTMLButtonElement>, title: string) {
    const form = event.currentTarget.form;
    const titleInput = form?.elements.namedItem("title") as HTMLInputElement | null;

    if (titleInput) {
      titleInput.value = title;
      titleInput.focus();
    }
  }

  function applyReminderType(event: MouseEvent<HTMLButtonElement>, value: DosAppRelationshipReminder["reminderType"]) {
    const form = event.currentTarget.form;
    const typeInput = form?.elements.namedItem("reminder_type") as HTMLSelectElement | null;

    if (typeInput) {
      typeInput.value = value;
      typeInput.focus();
    }
  }

  function applyReminderRecurrence(event: MouseEvent<HTMLButtonElement>, value: DosAppRelationshipReminder["recurrence"]) {
    const form = event.currentTarget.form;
    const recurrenceInput = form?.elements.namedItem("recurrence") as HTMLSelectElement | null;

    if (recurrenceInput) {
      recurrenceInput.value = value;
      recurrenceInput.focus();
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <CalendarConnectionCard
        calendarConnection={calendarConnection}
        isDisconnecting={isCalendarDisconnecting}
        onDisconnect={onDisconnectCalendar}
        workspaceId={workspaceId}
      />
      <section className="grid gap-3 rounded-[24px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
        <label className="block">
          <FieldLabel>Person</FieldLabel>
          <select className={FieldInputClass()} defaultValue={reminder?.personId ?? fallbackPersonId} name="person_id" required>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.name}</option>
            ))}
          </select>
        </label>
        <FormOptionSelect
          defaultValue={resolvedReminderType}
          label="Reminder Type"
          name="reminder_type"
          options={reminderTypeOptions}
        />
        <div>
          <FieldLabel>Reminder Paths</FieldLabel>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {[
              { label: "Birthday", value: "birthday" },
              { label: "Anniversary", value: "anniversary" },
              { label: "Follow-up", value: "follow_up" },
              { label: "Prayer", value: "prayer" },
            ].map((path) => (
              <button
                className="min-h-8 rounded-full border border-[#DCEBFF] bg-[#F8FAFC] px-3 text-[11px] font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
                key={path.value}
                onClick={(event) => applyReminderType(event, path.value as DosAppRelationshipReminder["reminderType"])}
                type="button"
              >
                {path.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <FieldLabel>Title</FieldLabel>
          <input className={FieldInputClass()} defaultValue={reminder?.title ?? ""} name="title" placeholder="Optional reminder title" type="text" />
        </label>
        {householdReminderTitles.length ? (
          <div>
            <FieldLabel>Household</FieldLabel>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {householdReminderTitles.map((title) => (
                <button
                  className="min-h-8 rounded-full border border-[#DCEBFF] bg-[#F8FAFC] px-3 text-[11px] font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
                  key={title}
                  onClick={(event) => applyReminderTitle(event, title)}
                  type="button"
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <label className="block min-w-0">
            <FieldLabel>Date</FieldLabel>
            <input className={FieldInputClass()} defaultValue={(reminder?.reminderDate ?? todayDateValue()).slice(0, 10)} name="reminder_date" required type="date" />
          </label>
          <FormOptionSelect
            defaultValue={defaultRecurrence}
            label="Repeat"
            name="recurrence"
            options={reminderRecurrenceOptions}
          />
        </div>
        <div>
          <FieldLabel>Prayer Cadence</FieldLabel>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {[
              { label: "Pray Once", value: "none" },
              { label: "Weekly", value: "weekly" },
              { label: "Monthly", value: "monthly" },
            ].map((cadence) => (
              <button
                className="min-h-8 rounded-full border border-[#DCEBFF] bg-[#F8FAFC] px-3 text-[11px] font-bold text-[#1D4ED8] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF]"
                key={cadence.value}
                onClick={(event) => applyReminderRecurrence(event, cadence.value as DosAppRelationshipReminder["recurrence"])}
                type="button"
              >
                {cadence.label}
              </button>
            ))}
            <span aria-disabled="true" className="inline-flex min-h-8 cursor-not-allowed items-center rounded-full border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 text-[11px] font-bold text-[#94A3B8] opacity-70">
              Daily soon
            </span>
          </div>
        </div>
        <label className="block">
          <FieldLabel>Notes</FieldLabel>
          <textarea className={`${FieldTextareaClass()} min-h-20`} defaultValue={reminder?.notes ?? ""} name="notes" placeholder="Prayer notes, follow-up context, or details." />
        </label>
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3">
          <span className="min-w-0">
            <span className="block text-sm font-bold text-[#0F172A]">Sync to Google</span>
            <span className="mt-0.5 block text-xs text-[#64748B]">{calendarConnection.connected ? "Create or update a calendar event." : "Connect Google Calendar to sync. Local save still works."}</span>
          </span>
          <input
            className="h-5 w-5 shrink-0 accent-[#2563EB]"
            defaultChecked={calendarConnection.connected && reminder?.googleSyncEnabled !== false}
            disabled={!calendarConnection.connected}
            name="google_sync_enabled"
            type="checkbox"
          />
        </label>
      </section>
      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      <AppButton disabled={isSubmitting || !people.length} tone="black" type="submit">{isSubmitting ? "Saving..." : reminder ? "Save Reminder" : "Add Reminder"}</AppButton>
      {reminder && onDelete ? (
        <button
          className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={onDelete}
          type="button"
        >
          Delete Reminder
        </button>
      ) : null}
    </form>
  );
}

function ReminderRow({
  onClick,
  person,
  reminder,
}: {
  onClick?: () => void;
  person?: DosAppPerson | null;
  reminder: DosAppRelationshipReminder;
}) {
  const syncLabel = reminderSyncLabel(reminder);
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        {reminder.reminderType === "birthday" ? (
          <Cake className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        ) : (
          <Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5 text-[#0F172A]">{reminderDisplayTitle(reminder, person)}</span>
        <span className="mt-1 block text-xs leading-5 text-[#64748B]">
          {reminderTypeLabel(reminder.reminderType)} · {formatDate(nextReminderDate(reminder))}
          {reminder.recurrence !== "none" ? ` · ${reminder.recurrence}` : ""}
        </span>
        {reminder.notes ? <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#0F172A]">{reminder.notes}</span> : null}
        {syncLabel ? <span className="mt-2 inline-flex rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2 py-0.5 text-[10px] font-bold text-[#1D4ED8]">{syncLabel}</span> : null}
      </span>
      {onClick ? <ChevronRight className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]" onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      {content}
    </div>
  );
}

function TimelineIcon({ icon }: { icon: UpcomingTimelineIcon }) {
  const className = "h-4 w-4";

  if (icon === "birthday") {
    return <Cake className={className} aria-hidden="true" strokeWidth={1.9} />;
  }

  if (icon === "anniversary") {
    return <Heart className={className} aria-hidden="true" strokeWidth={1.9} />;
  }

  if (icon === "meeting") {
    return <CalendarDays className={className} aria-hidden="true" strokeWidth={1.9} />;
  }

  if (icon === "prayer") {
    return <HeartHandshake className={className} aria-hidden="true" strokeWidth={1.9} />;
  }

  return <Bell className={className} aria-hidden="true" strokeWidth={1.9} />;
}

function SyncStatusPill({ label }: { label: string }) {
  const className = label === "Synced"
    ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
    : label === "Sync failed"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-[#E2E8F0] bg-white text-[#64748B]";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${className}`}>{label}</span>
  );
}

function UpcomingTimelineRow({
  item,
  onEditReminder,
  onOpenMeeting,
}: {
  item: UpcomingTimelineItem;
  onEditReminder: (reminderId: string) => void;
  onOpenMeeting: (meetingId: string) => void;
}) {
  const handleClick = () => {
    if (item.meeting) {
      onOpenMeeting(item.meeting.id);
      return;
    }

    if (item.reminder) {
      onEditReminder(item.reminder.id);
    }
  };

  return (
    <button
      className="flex min-w-0 items-start gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
      onClick={handleClick}
      type="button"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <TimelineIcon icon={item.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5 text-[#0F172A]">{item.title}</span>
        <span className="mt-1 block text-xs leading-5 text-[#64748B]">
          {item.label}
          {item.personName ? ` · ${item.personName}` : ""}
        </span>
        {item.notes ? <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#0F172A]">{item.notes}</span> : null}
        <span className="mt-2 flex flex-wrap gap-1.5">
          <SyncStatusPill label={item.syncLabel} />
        </span>
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </button>
  );
}

function NextStepsCard({
  items,
  onOpenAll,
}: {
  items: UpcomingTimelineItem[];
  onOpenAll: () => void;
}) {
  const visibleItems = items.slice(0, 3);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <button
      aria-label="Open all upcoming items"
      className="block w-full rounded-[24px] border border-[#DCEBFF] bg-white p-4 text-left shadow-[0_14px_32px_rgba(37,99,235,0.07)] transition-colors hover:border-[#BFDBFE] hover:bg-[#FBFDFF] active:scale-[0.995]"
      onClick={onOpenAll}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          Upcoming
        </h2>
        <span className="rounded-full border border-[#DCEBFF] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold text-[#1D4ED8]">{items.length}</span>
      </div>

      <div className="mt-3 grid gap-2">
        {visibleItems.length ? visibleItems.map((item) => (
          <div
            className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-2.5 text-left"
            key={item.id}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
              <TimelineIcon icon={item.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#0F172A]">{nextStepTitle(item)}</span>
              <span className="mt-0.5 block truncate text-xs text-[#64748B]">{item.label}</span>
            </span>
          </div>
        )) : (
          <p className="rounded-2xl bg-[#F8FAFC] px-3 py-3 text-sm leading-6 text-[#64748B]">
            No next steps queued. Ask the Lord who to encourage next.
          </p>
        )}
        {hiddenCount ? (
          <p className="px-3 pt-1 text-xs font-semibold text-[#2563EB]">{hiddenCount} more upcoming</p>
        ) : null}
      </div>
    </button>
  );
}

function HomeActivityCard({
  items,
  onOpenAll,
}: {
  items: HomeActivityItem[];
  onOpenAll: () => void;
}) {
  const visibleItems = items.slice(0, 3);
  const hiddenCount = Math.max(items.length - visibleItems.length, 0);

  return (
    <button
      aria-label="Open all activity"
      className="block w-full rounded-[24px] border border-[#DCEBFF] bg-white p-4 text-left shadow-[0_14px_32px_rgba(37,99,235,0.07)] transition-colors hover:border-[#BFDBFE] hover:bg-[#FBFDFF] active:scale-[0.995]"
      onClick={onOpenAll}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>
          Activity
        </h2>
        <span className="rounded-full border border-[#DCEBFF] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold text-[#1D4ED8]">{items.length}</span>
      </div>

      <div className="mt-3 grid gap-2">
        {visibleItems.length ? visibleItems.map((item) => (
          <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#F8FAFC] px-3 py-2.5 text-left" key={item.id}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
              <Icon name={item.icon} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#0F172A]">{item.title}</span>
              <span className="mt-0.5 block truncate text-xs text-[#64748B]">{item.label}</span>
            </span>
          </div>
        )) : (
          <p className="rounded-2xl bg-[#F8FAFC] px-3 py-3 text-sm leading-6 text-[#64748B]">
            Log a table to begin your activity rhythm.
          </p>
        )}
        {hiddenCount ? (
          <p className="px-3 pt-1 text-xs font-semibold text-[#2563EB]">{hiddenCount} more activity items</p>
        ) : null}
      </div>
    </button>
  );
}

function HomeActivitySheetRow({ item, onClick }: { item: HomeActivityItem; onClick: () => void }) {
  return (
    <button
      className="flex min-w-0 items-start gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <Icon name={item.icon} size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5 text-[#0F172A]">{item.title}</span>
        <span className="mt-1 block text-xs leading-5 text-[#64748B]">{item.label}</span>
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </button>
  );
}

type FruitDashboardStory = {
  date: string | null;
  id: string;
  impactSource: "Leader Review" | "Quick Review" | "Story" | "Testimony Review";
  outcomeKeys: string[];
  personId: string | null;
  personName: string | null;
  source: FruitActivitySource;
  tags: string[];
  text: string;
  title: string;
  type: string;
};

function fruitSearchText(...values: Array<null | string | string[] | undefined>) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFruitOutcomeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function fruitOutcomeMatchesValue(outcome: FruitOutcomeDefinition, value: string) {
  const normalizedValue = normalizeFruitOutcomeText(value);
  const searchableLabels = [
    outcome.label,
    outcome.formLabel,
    outcome.leaderLabel,
    ...outcome.aliases,
  ].filter((label): label is string => Boolean(label));

  return searchableLabels.some((label) => normalizeFruitOutcomeText(label) === normalizedValue);
}

function fruitOutcomeMatchesText(outcome: FruitOutcomeDefinition, value: string) {
  const text = fruitSearchText(value);
  const searchableLabels = [
    outcome.label,
    outcome.formLabel,
    outcome.leaderLabel,
    ...outcome.aliases,
  ].filter((label): label is string => Boolean(label));

  return searchableLabels.some((label) => {
    const normalizedLabel = normalizeFruitOutcomeText(label);

    return normalizedLabel.length > 3 && normalizedLabel !== "other" && text.includes(normalizedLabel);
  });
}

function fruitOutcomesFromValues(...values: Array<null | string | string[] | undefined>) {
  const directValues = values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value): value is string => Boolean(value?.trim()));
  const outcomes = new Map<string, FruitOutcomeDefinition>();

  directValues.forEach((value) => {
    fruitOutcomeDefinitions.forEach((outcome) => {
      if (fruitOutcomeMatchesValue(outcome, value) || fruitOutcomeMatchesText(outcome, value)) {
        outcomes.set(outcome.key, outcome);
      }
    });
  });

  return Array.from(outcomes.values());
}

function fruitOutcomeLabelsFromKeys(outcomeKeys: string[]) {
  return uniqueFruitTags(outcomeKeys.map((key) => fruitOutcomeByKey.get(key)?.label ?? ""));
}

function uniqueFruitTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function fruitStoryOutcomeFields(outcomes: FruitOutcomeDefinition[]) {
  const outcomeKeys = uniqueFruitTags(outcomes.map((outcome) => outcome.key));

  return {
    outcomeKeys,
    tags: fruitOutcomeLabelsFromKeys(outcomeKeys),
  };
}

function fruitStoryTitle(value: string | null | undefined) {
  const text = value?.trim();

  if (!text) {
    return "Fruit recorded";
  }

  const firstSentence = text.split(/[.!?]/)[0]?.trim() || text;

  return firstSentence.length > 82 ? `${firstSentence.slice(0, 79).trim()}...` : firstSentence;
}

function isAnsweredPrayerText(...values: Array<null | string | string[] | undefined>) {
  const text = fruitSearchText(...values);

  return text.includes("answered prayer")
    || text.includes("prayer answered")
    || text.includes("answered prayers")
    || text.includes("prayer received");
}

function fruitEventSourceLabel(event: DosAppFruitEvent): FruitActivitySource {
  if (event.sourceType === "participant_review") {
    return "Quick Review";
  }

  if (event.sourceType === "testimony") {
    return "Testimony Review";
  }

  const text = fruitSearchText(event.fruitType, event.title, event.description);

  if (isAnsweredPrayerText(event.fruitType, event.title, event.description)) {
    return "Answered Prayer";
  }

  if (text.includes("prayer")) {
    return "Prayer";
  }

  return "Story";
}

function leaderReflectionFruitSource(reflection: DosAppLeaderReflection): FruitActivitySource {
  if (isAnsweredPrayerText(reflection.observedFruit, reflection.whatHappened, reflection.prayerNeeds, reflection.nextStep)) {
    return "Answered Prayer";
  }

  if (reflection.prayerNeeds) {
    return "Prayer";
  }

  return "Story";
}

function fruitActivitySourceClassName(source: FruitActivitySource) {
  switch (source) {
    case "Answered Prayer":
      return "bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]";
    case "Prayer":
      return "bg-[#F8FBFF] text-[#1D4ED8] ring-1 ring-[#DCEBFF]";
    case "Quick Review":
      return "bg-[#EEF6FF] text-[#2563EB]";
    case "Testimony Review":
      return "bg-[#F1F5F9] text-[#0F172A]";
    case "Story":
    default:
      return "bg-[#F1F5F9] text-[#475569]";
  }
}

function fruitActivityIconName(source: FruitActivitySource): IconName {
  switch (source) {
    case "Answered Prayer":
    case "Prayer":
      return "prayer";
    case "Quick Review":
      return "send";
    case "Testimony Review":
    case "Story":
    default:
      return "fruit";
  }
}

function isQaFruitStory(story: FruitDashboardStory) {
  const text = fruitSearchText(story.title, story.text, story.tags);

  return /\bqa\b/.test(text)
    || text.includes("safe to delete")
    || text.includes("validation only")
    || text.includes("pre deploy")
    || text.includes("pre-deploy")
    || text.includes("smoke test");
}

function approvedFruitStories(fruitItems: DosAppFruit[], fruitEvents: DosAppFruitEvent[], people: DosAppPerson[]) {
  return [
    ...fruitItems
      .filter((fruit) => fruit.status === "approved")
      .map((fruit) => {
        const outcomeFields = fruitStoryOutcomeFields(fruitOutcomesFromValues(fruit.outcomeTags, fruit.summary));

        return {
          date: fruit.testimonyDate,
          id: `fruit-${fruit.id}`,
          impactSource: "Story",
          personId: fruit.fieldPersonId,
          personName: fruit.fieldPersonId ? personName(people, fruit.fieldPersonId) : fruit.submittedByName,
          source: "Story",
          ...outcomeFields,
          text: fruit.summary,
          title: fruitStoryTitle(fruit.summary),
          type: outcomeFields.tags[0] ?? fruit.outcomeTags[0] ?? "Fruit",
        } satisfies FruitDashboardStory;
      }),
    ...fruitEvents
      .filter((event) => event.status === "approved")
      .map((event) => {
        const source = fruitEventSourceLabel(event);
        const outcomeFields = fruitStoryOutcomeFields(fruitOutcomesFromValues(event.fruitType, event.title, event.description));

        return {
          date: event.date,
          id: `fruit-event-${event.id}`,
          impactSource: source === "Quick Review" || source === "Testimony Review" ? source : "Story",
          personId: event.personId,
          personName: event.personId ? personName(people, event.personId) : null,
          source,
          ...outcomeFields,
          text: event.description ?? event.title ?? event.fruitType,
          title: event.title?.trim() || event.fruitType || "Fruit recorded",
          type: outcomeFields.tags[0] ?? event.fruitType,
        } satisfies FruitDashboardStory;
      }),
  ].sort((first, second) => {
    const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
    const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

    return secondTime - firstTime;
  });
}

function fieldFruitStories({
  fruitEvents,
  fruitItems,
  leaderReflections,
  participantReviews,
  participantTestimonies,
  people,
  prayerLogs,
  relationshipReminders,
  answeredPrayerByReminderId,
}: {
  answeredPrayerByReminderId: Record<string, string>;
  fruitEvents: DosAppFruitEvent[];
  fruitItems: DosAppFruit[];
  leaderReflections: DosAppLeaderReflection[];
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  people: DosAppPerson[];
  prayerLogs: DosAppPrayerLog[];
  relationshipReminders: DosAppRelationshipReminder[];
}) {
  const directStories = approvedFruitStories(fruitItems, fruitEvents, people);
  const testimonyStories = participantTestimonies
    .filter((testimony) => isSubmittedStatus(testimony.status))
    .filter((testimony) => Boolean(testimony.story?.trim() || testimony.whatChanged?.trim() || testimony.decisionMade?.trim()))
    .map((testimony) => {
      const outcomeFields = fruitStoryOutcomeFields(fruitOutcomesFromValues(
        testimony.decisionMade,
        testimony.nextStep,
        testimony.whatChanged,
        testimony.story,
      ));

      return {
        date: testimony.submittedAt,
        id: `testimony-story-${testimony.id}`,
        impactSource: "Testimony Review",
        personId: testimony.personId,
        personName: testimony.personId ? personName(people, testimony.personId) : testimony.publicDisplayName,
        source: "Testimony Review",
        ...outcomeFields,
        text: [testimony.story, testimony.whatChanged, testimony.nextStep].filter(Boolean).join(" "),
        title: fruitStoryTitle(testimony.whatChanged ?? testimony.story),
        type: outcomeFields.tags[0] ?? "Testimony",
      } satisfies FruitDashboardStory;
    });
  const reviewStories = participantReviews
    .filter((review) => isSubmittedStatus(review.status))
    .filter((review) => Boolean(review.comments?.trim() || review.conversationHelpful || review.feltCaredFor || review.feltHeard || review.wouldMeetAgain))
    .map((review) => {
      const outcomeFields = fruitStoryOutcomeFields(fruitOutcomesFromValues(
        review.conversationHelpful,
        review.feltHeard ? "Felt heard" : "",
        review.feltCaredFor ? "Felt cared for" : "",
        review.wouldMeetAgain ? "Life giving" : "",
        review.comments,
      ));

      return {
        date: review.submittedAt,
        id: `review-story-${review.id}`,
        impactSource: "Quick Review",
        personId: review.personId,
        personName: review.personId ? personName(people, review.personId) : null,
        source: "Quick Review",
        ...outcomeFields,
        text: review.comments ?? "Someone shared that the table helped them take a next step.",
        title: review.comments ? fruitStoryTitle(review.comments) : "Review shared",
        type: outcomeFields.tags[0] ?? "Quick Review",
      } satisfies FruitDashboardStory;
    });
  const reflectionStories = leaderReflections
    .filter((reflection) => Boolean(reflection.observedFruit.length || reflection.whatHappened?.trim() || reflection.prayerNeeds?.trim()))
    .map((reflection) => {
      const outcomeFields = fruitStoryOutcomeFields(fruitOutcomesFromValues(
        reflection.observedFruit,
        reflection.whatHappened,
        reflection.nextStep,
      ));

      return {
        date: reflection.createdAt,
        id: `reflection-story-${reflection.id}`,
        impactSource: "Leader Review",
        personId: reflection.personId,
        personName: reflection.personId ? personName(people, reflection.personId) : null,
        source: leaderReflectionFruitSource(reflection),
        ...outcomeFields,
        text: [reflection.whatHappened, reflection.prayerNeeds, reflection.nextStep].filter(Boolean).join(" "),
        title: outcomeFields.tags[0] ?? reflection.observedFruit[0] ?? fruitStoryTitle(reflection.whatHappened ?? reflection.prayerNeeds),
        type: outcomeFields.tags[0] ?? (reflection.prayerNeeds ? "Prayer" : "Leader Reflection"),
      } satisfies FruitDashboardStory;
    });
  const prayerLogStories = prayerLogs
    .filter((log) => Boolean(log.note?.trim() || log.prayedAt))
    .map((log) => ({
      date: log.prayedAt ?? log.createdAt,
      id: `prayer-log-${log.id}`,
      impactSource: "Story",
      outcomeKeys: [],
      personId: log.fieldPersonId,
      personName: log.fieldPersonId ? personName(people, log.fieldPersonId) : null,
      source: isAnsweredPrayerText(log.note) ? "Answered Prayer" : "Prayer",
      tags: [],
      text: log.note?.trim() || "Prayer was logged for this relationship.",
      title: isAnsweredPrayerText(log.note) ? "Answered prayer recorded" : "Prayer update recorded",
      type: isAnsweredPrayerText(log.note) ? "Answered Prayer" : "Prayer Update",
    } satisfies FruitDashboardStory));
  const prayerReminderStories = relationshipReminders
    .filter((reminder) => reminder.reminderType === "prayer")
    .filter((reminder) => Boolean(reminder.title?.trim() || reminder.notes?.trim() || answeredPrayerByReminderId[reminder.id]))
    .map((reminder) => {
      const answeredAt = answeredPrayerByReminderId[reminder.id] ?? null;
      const title = reminder.title?.replace(/^Prayer:\s*/i, "").trim() || "Prayer request";

      return {
        date: answeredAt ?? reminder.updatedAt ?? reminder.reminderDate,
        id: answeredAt ? `answered-prayer-${reminder.id}` : `prayer-request-${reminder.id}`,
        impactSource: "Story",
        outcomeKeys: [],
        personId: reminder.personId,
        personName: personName(people, reminder.personId),
        source: answeredAt ? "Answered Prayer" : "Prayer",
        tags: [],
        text: reminder.notes?.trim() || (answeredAt ? "This request was marked answered." : "Prayer request is being tracked."),
        title: answeredAt ? `Answered: ${title}` : title,
        type: answeredAt ? "Answered Prayer" : "Prayer Update",
      } satisfies FruitDashboardStory;
    });

  return [...directStories, ...testimonyStories, ...reviewStories, ...reflectionStories, ...prayerLogStories, ...prayerReminderStories]
    .sort((first, second) => {
      const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
      const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

      return secondTime - firstTime;
    });
}

function fruitImpactGroups(stories: FruitDashboardStory[]) {
  return fruitImpactGroupConfig.map((group) => ({
    ...group,
    outcomes: group.outcomeKeys.map((outcomeKey) => fruitImpactOutcomeMetric(stories, outcomeKey)),
  }));
}

function fruitImpactOutcomeMetric(stories: FruitDashboardStory[], outcomeKey: string) {
  const outcome = fruitOutcomeByKey.get(outcomeKey);
  const matchingStories = stories.filter((story) => story.outcomeKeys.includes(outcomeKey));
  const sources = uniqueFruitTags(matchingStories.map((story) => story.impactSource));

  return {
    key: outcomeKey,
    label: outcome ? fruitOutcomeSnapshotLabel(outcome) : outcomeKey,
    sources,
    value: matchingStories.length,
  };
}

function fruitImpactSnapshotMetrics(stories: FruitDashboardStory[]) {
  return fruitSnapshotOutcomeKeys.map((outcomeKey) => fruitImpactOutcomeMetric(stories, outcomeKey));
}

function fruitOutcomeSnapshotLabel(outcome: FruitOutcomeDefinition) {
  switch (outcome.key) {
    case "felt_encouraged":
      return "Felt Encouraged";
    case "joined_group":
      return "Joined a Group";
    case "reconciled_relationship":
      return "Reconciliation";
    case "baptism_requested":
      return "Baptism Requested";
    case "new_believer":
      return "New Believers";
    case "marriage_restoration":
      return "Marriage Restoration";
    case "started_discipling_others":
      return "Started Discipling Others";
    default:
      return outcome.label;
  }
}

type FruitImpactMetric = ReturnType<typeof fruitImpactOutcomeMetric>;

function FruitSnapshotMetricCard({ metric }: { metric: FruitImpactMetric }) {
  return (
    <article className="min-w-0 rounded-[18px] border border-[#EAF2FF] bg-white/95 px-3 py-3 shadow-[0_10px_24px_rgba(37,99,235,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
          <Icon name="fruit" size={13} />
        </span>
        <span className="text-[24px] font-black leading-none tracking-[-0.03em] text-[#0F172A]">{metric.value}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] font-black uppercase leading-4 tracking-[0.08em] text-[#334155]" style={{ fontFamily: font.rajdhani }}>
        {metric.label}
      </p>
      <p className="mt-1 truncate text-[10px] font-semibold text-[#94A3B8]">
        {metric.sources.length ? metric.sources.join(" · ") : "No records yet"}
      </p>
    </article>
  );
}

function FruitBreakdownSection({ groups }: { groups: ReturnType<typeof fruitImpactGroups> }) {
  const total = groups.reduce((sum, group) => (
    sum + group.outcomes.reduce((groupSum, outcome) => groupSum + outcome.value, 0)
  ), 0);

  return (
    <details className="group rounded-[22px] border border-[#EAF2FF] bg-white/90 p-3 shadow-[0_10px_26px_rgba(37,99,235,0.035)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[18px] px-1 py-1">
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>Fruit Breakdown</span>
          <span className="mt-1 block text-xs font-semibold text-[#64748B]">Grouped outcomes from forms and leader reviews</span>
        </span>
        <span className="flex items-center gap-2 text-xs font-bold text-[#1D4ED8]">
          {total} outcomes
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden="true" strokeWidth={1.8} />
        </span>
      </summary>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {groups.map((group) => (
          <FruitImpactGroupCard group={group} key={group.key} />
        ))}
      </div>
    </details>
  );
}

function FruitImpactGroupCard({
  group,
}: {
  group: ReturnType<typeof fruitImpactGroups>[number];
}) {
  const groupTotal = group.outcomes.reduce((total, outcome) => total + outcome.value, 0);

  return (
    <article className="rounded-[18px] border border-[#EAF2FF] bg-[#F8FBFF] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>{group.title}</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-4 text-[#64748B]">{group.sourceHint}</p>
        </div>
        <span className="rounded-full bg-[#EBF2FF] px-2.5 py-1 text-xs font-black text-[#1D4ED8]">{groupTotal}</span>
      </div>
      <div className="mt-2 divide-y divide-[#EAF2FF]">
        {group.outcomes.map((outcome) => (
          <div className="flex items-center justify-between gap-3 py-1.5" key={outcome.key}>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[#0F172A]">{outcome.label}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-[#94A3B8]">
                {outcome.sources.length ? outcome.sources.join(" · ") : "No records yet"}
              </p>
            </div>
            <span className="shrink-0 text-base font-black leading-none text-[#0F172A]">{outcome.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function RecentFruitStoryCard({
  compact = false,
  onOpen,
  story,
}: {
  compact?: boolean;
  onOpen?: () => void;
  story: FruitDashboardStory;
}) {
  return (
    <button
      className={`${compact ? "rounded-[20px] p-3" : "rounded-[22px] p-4"} border border-[#E2E8F0] bg-white text-left shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FBFF]`}
      onClick={onOpen}
      type="button"
    >
      <div className={`flex items-start ${compact ? "gap-2.5" : "gap-3"}`}>
        <span className={`${compact ? "h-8 w-8" : "h-9 w-9"} mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8]`}>
          <Icon name={fruitActivityIconName(story.source)} size={compact ? 13 : 15} />
        </span>
        <div className="min-w-0 flex-1">
          <span className={`${compact ? "mb-1.5 px-2 py-0.5 text-[8.5px]" : "mb-2 px-2.5 py-1 text-[9px]"} inline-flex w-fit rounded-full font-bold uppercase tracking-[0.12em] ${fruitActivitySourceClassName(story.source)}`} style={{ fontFamily: font.rajdhani }}>
            {story.source}
          </span>
          <p className={`${compact ? "text-[13px] leading-5" : "text-sm leading-5"} font-bold text-[#0F172A]`}>{story.title}</p>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">
            {[story.personName, formatDate(story.date)].filter(Boolean).join(" · ")}
          </p>
          {story.text && story.text !== story.title ? (
            <p className={`${compact ? "mt-1" : "mt-2"} line-clamp-2 text-xs leading-5 text-[#64748B]`}>{story.text}</p>
          ) : null}
        </div>
      </div>
      {story.tags.length ? (
        <div className={`${compact ? "mt-2 gap-1.5" : "mt-3 gap-2"} flex flex-wrap`}>
          {story.tags.slice(0, 4).map((tag) => (
            <span className={`${compact ? "px-2 py-0.5 text-[9.5px]" : "px-2.5 py-1 text-[10px]"} rounded-full bg-[#F1F5F9] font-semibold text-[#64748B]`} key={tag}>
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}

function DesktopFruitStoriesTable({
  onOpenActivity,
  stories,
}: {
  onOpenActivity: (story: FruitDashboardStory) => void;
  stories: FruitDashboardStory[];
}) {
  return (
    <div className="hidden overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_12px_34px_rgba(37,99,235,0.045)] md:block">
      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className="grid grid-cols-[118px_170px_136px_minmax(320px,1fr)_250px] gap-3 border-b border-[#EFF6FF] bg-[#F8FBFF] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
            <span>Date</span>
            <span>Person</span>
            <span>Source</span>
            <span>Story</span>
            <span>Fruit</span>
          </div>
          <div className="divide-y divide-[#EFF6FF]">
            {stories.map((story) => {
              const storyActionLabel = `Open ${story.source.toLowerCase()} details`;

              return (
                <button
                  aria-label={storyActionLabel}
                  className="grid w-full grid-cols-[118px_170px_136px_minmax(320px,1fr)_250px] items-center gap-3 px-4 py-3 text-left text-xs transition-colors hover:bg-[#F8FBFF]"
                  key={story.id}
                  onClick={() => onOpenActivity(story)}
                  type="button"
                >
                  <span className="truncate font-semibold text-[#475569]">{story.date ? formatDate(story.date) : "—"}</span>
                  <span className="truncate font-bold text-[#0F172A]">{story.personName || "—"}</span>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold ${fruitActivitySourceClassName(story.source)}`}>
                    {story.source}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#0F172A]">{story.title || "Fruit recorded"}</span>
                    {story.text && story.text !== story.title ? (
                      <span className="mt-0.5 block truncate text-xs leading-5 text-[#64748B]">{story.text}</span>
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-wrap gap-1.5">
                    {story.tags.length ? story.tags.slice(0, 3).map((tag) => (
                      <span className="max-w-[112px] truncate rounded-full bg-[#F1F5F9] px-2 py-1 text-[10px] font-bold text-[#64748B]" key={tag}>
                        {tag}
                      </span>
                    )) : <span className="font-semibold text-[#94A3B8]">—</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FruitActivityDetailSheet({
  onClose,
  onOpenPerson,
  story,
}: {
  onClose: () => void;
  onOpenPerson: (personId: string) => void;
  story: FruitDashboardStory;
}) {
  return (
    <Sheet description="Fruit-generating activity from reviews, testimonies, prayer updates, and stories." onClose={onClose} showEyebrow={false} title={story.title || "Fruit activity"}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${fruitActivitySourceClassName(story.source)}`} style={{ fontFamily: font.rajdhani }}>
            {story.source}
          </span>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
            {formatDate(story.date)}
          </span>
        </div>

        <section className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>Details</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#0F172A]">{story.text || story.title}</p>
          {story.personName ? (
            <p className="mt-3 text-xs font-semibold leading-5 text-[#64748B]">
              Person: <span className="text-[#0F172A]">{story.personName}</span>
            </p>
          ) : null}
        </section>

        {story.tags.length ? (
          <section className="rounded-[24px] border border-[#EAF2FF] bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Outcomes</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {story.tags.map((tag) => (
                <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-xs font-bold text-[#1D4ED8]" key={tag}>{tag}</span>
              ))}
            </div>
          </section>
        ) : null}

        {story.personId ? (
          <AppButton icon="people" onClick={() => onOpenPerson(story.personId!)} tone="black">Open Person</AppButton>
        ) : null}
      </div>
    </Sheet>
  );
}

function FruitFormCard({
  action,
  form,
  onComingSoon,
}: {
  action?: {
    isBusy?: boolean;
    onCopy: () => void;
    onPreview: () => void;
    onSend: () => void;
  };
  form: (typeof fruitFormCards)[number];
  onComingSoon: (form: (typeof fruitFormCards)[number]) => void;
}) {
  const isLive = form.status === "live";

  return (
    <article className="flex min-w-0 flex-col rounded-[24px] border border-[#EAF2FF] bg-white p-4 shadow-[0_12px_30px_rgba(37,99,235,0.045)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
          <Icon name={form.icon} size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <h3 className="text-base font-black leading-5 tracking-[-0.01em] text-[#0F172A]">{form.title}</h3>
            {isLive ? (
              <span className="shrink-0 rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                Sendable
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
                Coming Soon
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">{form.description}</p>
        </div>
      </div>
      {isLive ? (
        <FruitFormActions action={action} className="mt-4 grid-cols-3" />
      ) : (
        <div className="mt-4">
          <AppButton icon={form.icon} onClick={() => onComingSoon(form)} tone="soft">Coming Soon</AppButton>
        </div>
      )}
    </article>
  );
}

function FruitFormActions({
  action,
  className = "",
}: {
  action?: {
    isBusy?: boolean;
    onCopy: () => void;
    onPreview: () => void;
    onSend: () => void;
  };
  className?: string;
}) {
  const disabled = !action || action.isBusy;

  return (
    <div className={`grid gap-2 max-[350px]:grid-cols-1 ${className}`}>
      <FruitFormActionButton disabled={disabled} isBusy={action?.isBusy} label="Preview" onClick={action?.onPreview} />
      <FruitFormActionButton disabled={disabled} isBusy={action?.isBusy} label="Copy Link" onClick={action?.onCopy} />
      <FruitFormActionButton disabled={disabled} isBusy={action?.isBusy} label="Send" onClick={action?.onSend} primary />
    </div>
  );
}

function FruitFormActionButton({
  disabled,
  isBusy,
  label,
  onClick,
  primary = false,
}: {
  disabled?: boolean;
  isBusy?: boolean;
  label: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={`inline-flex min-h-10 min-w-0 items-center justify-center rounded-full px-2.5 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
        primary
          ? "bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_10px_22px_rgba(37,99,235,0.2)]"
          : "border border-[#BFDBFE] bg-white text-[#1D4ED8] hover:bg-[#EBF2FF]"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="truncate">{isBusy ? "Preparing..." : label}</span>
    </button>
  );
}

function FruitFormsGrid({
  comingSoonMessage,
  onOpenForm,
  quickReviewAction,
  testimonyReviewAction,
}: {
  comingSoonMessage?: string;
  onOpenForm: (form: (typeof fruitFormCards)[number]) => void;
  quickReviewAction?: ComponentProps<typeof FruitFormCard>["action"];
  testimonyReviewAction?: ComponentProps<typeof FruitFormCard>["action"];
}) {
  const actionForForm = (form: (typeof fruitFormCards)[number]) => (
    form.key === "quick_review" ? quickReviewAction : form.key === "testimony_review" ? testimonyReviewAction : undefined
  );

  return (
    <div className="space-y-3">
      {comingSoonMessage ? (
        <p className="rounded-2xl border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold leading-5 text-[#1D4ED8]">{comingSoonMessage}</p>
      ) : null}
      <div className="grid gap-3 md:hidden">
        {fruitFormCards.map((form) => (
          <FruitFormCard
            action={actionForForm(form)}
            form={form}
            key={form.key}
            onComingSoon={onOpenForm}
          />
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_12px_30px_rgba(37,99,235,0.045)] md:block">
        <div className="grid grid-cols-[1.05fr_1.55fr_0.65fr_1.2fr] gap-3 border-b border-[#EAF2FF] bg-[#F8FBFF] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          <span>Form</span>
          <span>Purpose</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {fruitFormCards.map((form) => {
          const isLive = form.status === "live";
          const action = actionForForm(form);

          return (
            <div className="grid grid-cols-[1.05fr_1.55fr_0.65fr_1.2fr] items-center gap-3 border-b border-[#F1F5F9] px-4 py-3 last:border-b-0" key={form.key}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[15px] bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
                  <Icon name={form.icon} size={16} />
                </span>
                <p className="truncate text-sm font-black text-[#0F172A]">{form.title}</p>
              </div>
              <p className="text-xs leading-5 text-[#64748B]">{form.description}</p>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${isLive ? "bg-[#EBF2FF] text-[#1D4ED8]" : "bg-[#F1F5F9] text-[#64748B]"}`} style={{ fontFamily: font.rajdhani }}>
                {isLive ? "Sendable" : "Coming Soon"}
              </span>
              {isLive ? (
                <FruitFormActions action={action} className="grid-cols-3" />
              ) : (
                <button
                  className="inline-flex min-h-10 w-fit items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[11px] font-bold text-[#64748B]"
                  onClick={() => onOpenForm(form)}
                  type="button"
                >
                  Coming Soon
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="px-1 text-xs leading-5 text-[#94A3B8]">Custom forms are coming later.</p>
    </div>
  );
}

function FruitFormPreviewSheet({
  formKey,
  onClose,
}: {
  formKey: Extract<FruitFormKey, "quick_review" | "testimony_review">;
  onClose: () => void;
}) {
  const isTestimony = formKey === "testimony_review";
  const title = isTestimony ? "Testimony Review" : "Quick Review";
  const description = isTestimony
    ? "This is what someone sees when they are invited to share a testimony."
    : "This is what someone sees when they are invited to send a quick review after a meeting.";

  return (
    <Sheet description={description} onClose={onClose} showEyebrow={false} title={`${title} Preview`}>
      <div className="space-y-4">
        <section className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            Recipient Form
          </p>
          <h3 className="mt-2 text-xl font-black leading-tight text-[#0F172A]">{isTestimony ? testimonyReviewFormPreview.title : quickReviewFormPreview.title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">
            {isTestimony
              ? "Taking a moment to reflect on what the Lord did at your kitchen table."
              : "A short reflection form someone can complete after a meeting or gathering."}
          </p>
        </section>
        {isTestimony ? (
          <SendableFormPreviewCard eyebrow="Testimony Review" form={testimonyReviewFormPreview} />
        ) : (
          <SendableFormPreviewCard eyebrow="Quick Review" form={quickReviewFormPreview} />
        )}
        <AppButton onClick={onClose} tone="black">Done</AppButton>
      </div>
    </Sheet>
  );
}

function MultiplicationTreeTeaser({ storyCount }: { storyCount: number }) {
  return (
    <section className="rounded-[28px] border border-[#DCEBFF] bg-white p-5 shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
      <div className="flex items-start gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <span className="absolute h-24 w-24 rounded-full border border-[#DCEBFF] bg-[#F8FBFF]" />
          <span className="absolute h-[72px] w-[72px] rounded-full border border-[#BFDBFE] bg-[#EFF6FF]" />
          <span className="absolute h-12 w-12 rounded-full border border-[#93C5FD] bg-white/70" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]">
            <Icon name="fruit" size={17} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>Multiplication Tree</p>
          <h3 className="mt-1 text-lg font-black leading-tight tracking-[-0.01em] text-[#0F172A]">Coming Soon</h3>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            As reviews, testimonies, and prayer updates are recorded, this will grow into a visual multiplication tree.
          </p>
          <p className="mt-3 text-xs font-bold text-[#1D4ED8]">{storyCount} {storyCount === 1 ? "activity record" : "activity records"} ready</p>
        </div>
      </div>
    </section>
  );
}

function prayerFrequencyLabel(value: DosAppRelationshipReminder["recurrence"]) {
  switch (value) {
    case "monthly":
      return "Monthly";
    case "weekly":
      return "Weekly";
    case "yearly":
      return "Yearly";
    case "none":
    default:
      return "One time";
  }
}

function latestPrayerDateForPerson(prayerLogs: DosAppPrayerLog[], personId: string | null | undefined) {
  if (!personId) {
    return null;
  }

  return prayerLogs
    .filter((log) => log.fieldPersonId === personId)
    .sort((first, second) => dateSortValue(second.prayedAt) - dateSortValue(first.prayedAt))[0]?.prayedAt ?? null;
}

function DesktopPrayerActionButton({
  children,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      aria-disabled={disabled}
      className="inline-flex min-h-8 items-center justify-center justify-self-end whitespace-nowrap rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#1D4ED8] transition-colors enabled:hover:border-[#BFDBFE] enabled:hover:bg-[#EBF2FF] disabled:cursor-not-allowed disabled:border-[#E2E8F0] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function DesktopPrayerStatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="w-fit rounded-full bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold text-[#1D4ED8]">
      {children}
    </span>
  );
}

function DesktopPrayerTableRow({
  children,
  gridTemplateColumns,
}: {
  children: ReactNode;
  gridTemplateColumns: string;
}) {
  return (
    <div
      className="grid items-center gap-3 px-4 py-3 text-left text-xs transition-colors hover:bg-[#F8FBFF]"
      style={{ gridTemplateColumns }}
    >
      {children}
    </div>
  );
}

function DesktopPrayerEmptyTableState({
  action,
  text,
  title,
}: {
  action?: ReactNode;
  text: string;
  title: string;
}) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-black text-[#0F172A]">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-[#64748B]">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function DesktopPrayerTable({
  children,
  columns,
  gridTemplateColumns,
  minWidth = 960,
}: {
  children: ReactNode;
  columns: string[];
  gridTemplateColumns: string;
  minWidth?: number;
}) {
  return (
    <div className="hidden w-full overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_12px_34px_rgba(37,99,235,0.045)] md:block">
      <div className="overflow-x-auto">
        <div style={{ minWidth }}>
          <div
            className="grid gap-3 border-b border-[#EFF6FF] bg-[#F8FBFF] px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]"
            style={{ fontFamily: font.rajdhani, gridTemplateColumns }}
          >
            {columns.map((column, index) => (
              <span className={index === columns.length - 1 ? "text-right" : ""} key={column}>{column}</span>
            ))}
          </div>
          <div className="divide-y divide-[#EFF6FF]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopPrayerActionGroup({
  onAnswered,
  onPrayNow,
}: {
  onAnswered: () => void;
  onPrayNow: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <DesktopPrayerActionButton onClick={onPrayNow}>Pray Now</DesktopPrayerActionButton>
      <DesktopPrayerActionButton onClick={onAnswered}>Answered</DesktopPrayerActionButton>
    </div>
  );
}

function AddPrayerRequestPlaceholderSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet description="Prayer request capture is being prepared. This preview shows the fields without writing data yet." onClose={onClose} showEyebrow={false} title="Add Prayer Request">
      <form className="space-y-4">
        <label className="block">
          <FieldLabel>Request</FieldLabel>
          <textarea className={`${FieldTextareaClass()} min-h-28 bg-white`} placeholder="What should your partners pray for?" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Category</FieldLabel>
            <select className={`${FieldInputClass()} bg-white`} defaultValue="Ministry">
              <option>Ministry</option>
              <option>Family</option>
              <option>Support</option>
              <option>Provision</option>
              <option>Health</option>
            </select>
          </label>
          <label className="block">
            <FieldLabel>Frequency</FieldLabel>
            <select className={`${FieldInputClass()} bg-white`} defaultValue="Weekly">
              <option>One time</option>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Ongoing</option>
            </select>
          </label>
        </div>
        <label className="block">
          <FieldLabel>Share With</FieldLabel>
          <input className={`${FieldInputClass()} bg-white`} placeholder="Prayer Team, Brooke, 3 partners..." />
        </label>
        <div className="rounded-2xl border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-xs leading-5 text-[#64748B]">
          This is UI-only for now. Persistence will be wired when prayer request creation is connected to the DOS data model.
        </div>
        <div className="grid gap-2">
          <AppButton disabled tone="black" type="button">Coming soon</AppButton>
          <AppButton onClick={onClose} tone="white">Close</AppButton>
        </div>
      </form>
    </Sheet>
  );
}

function DesktopPrayerPlaceholderSheet({
  description,
  onClose,
  title,
}: {
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <Sheet description={description} onClose={onClose} showEyebrow={false} title={title}>
      <div className="grid gap-3">
        <div className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-4 text-sm leading-6 text-[#64748B]">
          This action is ready for UI review. Data persistence and send/log behavior will be wired in a later prayer workflow pass.
        </div>
        <AppButton onClick={onClose} tone="black">Done</AppButton>
      </div>
    </Sheet>
  );
}

function DesktopPrayerWorkspace({
  onAddPrayerReminder,
  onOpenMeeting,
  onOpenReminder,
  onScheduleMeeting,
  people,
  prayerLogs,
  reminders,
  tab,
  upcomingMeetings,
  onTabChange,
}: {
  onAddPrayerReminder: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onOpenReminder: (reminderId: string) => void;
  onScheduleMeeting: () => void;
  onTabChange: (value: PrayerWorkspaceTab) => void;
  people: DosAppPerson[];
  prayerLogs: DosAppPrayerLog[];
  reminders: DosAppRelationshipReminder[];
  tab: PrayerWorkspaceTab;
  upcomingMeetings: DosAppMeeting[];
}) {
  const prayerReminders = reminders
    .filter((reminder) => reminder.reminderType === "prayer")
    .sort((first, second) => dateSortValue(nextReminderDate(first)) - dateSortValue(nextReminderDate(second)));
  const personById = new Map(people.map((person) => [person.id, person]));
  const [prayerRequestView, setPrayerRequestView] = useState<PrayerRequestView>("praying");
  const [isAddPrayerRequestOpen, setIsAddPrayerRequestOpen] = useState(false);
  const [prayerPlaceholder, setPrayerPlaceholder] = useState<{ description: string; title: string } | null>(null);
  const visiblePrayerRequests = desktopPrayerRequestSamples.filter((request) => request.view === prayerRequestView);
  const openPrayerPlaceholder = (title: string, description: string) => setPrayerPlaceholder({ description, title });

  return (
    <div className="hidden space-y-4 md:block">
      <SegmentedTabs onChange={onTabChange} options={prayerWorkspaceTabs} value={tab} />

      {tab === "partners" ? (
        <DesktopPanel
          action={<DesktopPrayerActionButton onClick={() => openPrayerPlaceholder("Add Prayer Partner", "Prayer partner creation will connect to the partner directory in a later pass.")}>Add Prayer Partner</DesktopPrayerActionButton>}
          compact
          eyebrow="Prayer Partners"
        >
          <DesktopPrayerTable
            columns={["Name", "Relationship", "Status", "Last Contacted", "Notes", "Action"]}
            gridTemplateColumns="minmax(190px,1.1fr) 150px 116px 150px minmax(260px,1fr) 110px"
            minWidth={920}
          >
            {desktopPrayerPartnerSamples.map((partner) => (
              <DesktopPrayerTableRow
                gridTemplateColumns="minmax(190px,1.1fr) 150px 116px 150px minmax(260px,1fr) 110px"
                key={partner.name}
              >
                <span className="truncate text-sm font-black text-[#0F172A]">{partner.name}</span>
                <span className="truncate font-semibold text-[#475569]">{partner.relationship}</span>
                <DesktopPrayerStatusPill>{partner.status}</DesktopPrayerStatusPill>
                <span className="truncate font-semibold text-[#475569]">{partner.lastContacted}</span>
                <span className="truncate leading-5 text-[#64748B]">{partner.notes}</span>
                <DesktopPrayerActionButton onClick={() => openPrayerPlaceholder(`${partner.name}`, "Prayer partner detail review is a placeholder for now.")}>{partner.action}</DesktopPrayerActionButton>
              </DesktopPrayerTableRow>
            ))}
          </DesktopPrayerTable>
        </DesktopPanel>
      ) : null}

      {tab === "my_requests" ? (
        <DesktopPanel
          action={<DesktopPrayerActionButton onClick={() => setIsAddPrayerRequestOpen(true)}>Add Prayer Request</DesktopPrayerActionButton>}
          compact
          eyebrow="My Requests"
        >
          <div className="mb-3 max-w-xs">
            <SegmentedTabs onChange={setPrayerRequestView} options={prayerRequestViewTabs} value={prayerRequestView} />
          </div>
          <DesktopPrayerTable
            columns={["Request", "Category", "Shared With", "Status", "Created", "Answered", "Action"]}
            gridTemplateColumns="minmax(280px,1fr) 126px 150px 116px 104px 104px 110px"
            minWidth={990}
          >
            {visiblePrayerRequests.map((request) => (
              <DesktopPrayerTableRow
                gridTemplateColumns="minmax(280px,1fr) 126px 150px 116px 104px 104px 110px"
                key={request.request}
              >
                <span className="truncate text-sm font-black text-[#0F172A]">{request.request}</span>
                <span className="truncate font-semibold text-[#475569]">{request.category}</span>
                <span className="truncate font-semibold text-[#475569]">{request.sharedWith}</span>
                <DesktopPrayerStatusPill>{request.status}</DesktopPrayerStatusPill>
                <span className="truncate font-semibold text-[#475569]">{request.created}</span>
                <span className="truncate font-semibold text-[#475569]">{request.answered}</span>
                <DesktopPrayerActionButton onClick={() => openPrayerPlaceholder(request.request, prayerRequestView === "answered" ? "Answered prayer details are UI-only examples until prayer request records are wired." : "Prayer request details are UI-only examples until prayer request records are wired.")}>{request.action}</DesktopPrayerActionButton>
              </DesktopPrayerTableRow>
            ))}
          </DesktopPrayerTable>
        </DesktopPanel>
      ) : null}

      {tab === "praying_for" ? (
        <DesktopPanel
          action={<DesktopPrayerActionButton onClick={onAddPrayerReminder}>Log Prayer Request</DesktopPrayerActionButton>}
          compact
          eyebrow="Praying For"
        >
          <DesktopPrayerTable
            columns={["Person", "Request", "Status", "Frequency", "Last Prayed", "Action"]}
            gridTemplateColumns="180px minmax(300px,1fr) 116px 126px 132px 176px"
            minWidth={980}
          >
            {prayerReminders.length ? prayerReminders.map((reminder) => {
              const person = personById.get(reminder.personId) ?? null;
              const latestPrayedAt = latestPrayerDateForPerson(prayerLogs, reminder.personId);

              return (
                <DesktopPrayerTableRow
                  key={reminder.id}
                  gridTemplateColumns="180px minmax(300px,1fr) 116px 126px 132px 176px"
                >
                  <span className="truncate font-bold text-[#0F172A]">{person?.name ?? "Unlinked person"}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-[#0F172A]">{reminderDisplayTitle(reminder, person)}</span>
                    {reminder.notes ? <span className="mt-0.5 block truncate text-xs leading-5 text-[#64748B]">{reminder.notes}</span> : null}
                  </span>
                  <DesktopPrayerStatusPill>Praying</DesktopPrayerStatusPill>
                  <span className="truncate font-semibold text-[#475569]">{prayerFrequencyLabel(reminder.recurrence)}</span>
                  <span className="truncate font-semibold text-[#475569]">{latestPrayedAt ? formatRelativeDate(latestPrayedAt) : "—"}</span>
                  <DesktopPrayerActionGroup
                    onAnswered={() => openPrayerPlaceholder("Mark Answered", "Answered prayer tracking will be wired to prayer request records in a later pass.")}
                    onPrayNow={() => onOpenReminder(reminder.id)}
                  />
                </DesktopPrayerTableRow>
              );
            }) : (
              desktopPrayingForSamples.map((request) => (
                <DesktopPrayerTableRow
                  gridTemplateColumns="180px minmax(300px,1fr) 116px 126px 132px 176px"
                  key={request.person}
                >
                  <span className="truncate text-sm font-black text-[#0F172A]">{request.person}</span>
                  <span className="truncate text-sm font-black text-[#0F172A]">{request.request}</span>
                  <DesktopPrayerStatusPill>{request.status}</DesktopPrayerStatusPill>
                  <span className="truncate font-semibold text-[#475569]">{request.frequency}</span>
                  <span className="truncate font-semibold text-[#475569]">{request.lastPrayed}</span>
                  <DesktopPrayerActionGroup
                    onAnswered={() => openPrayerPlaceholder("Mark Answered", "Answered prayer tracking is shown as a UI placeholder until persistence is wired.")}
                    onPrayNow={() => openPrayerPlaceholder("Pray Now", "Prayer logging is shown as a UI placeholder until prayer_logs actions are wired.")}
                  />
                </DesktopPrayerTableRow>
              ))
            )}
          </DesktopPrayerTable>
        </DesktopPanel>
      ) : null}

      {tab === "meeting_covering" ? (
        <DesktopPanel
          action={<DesktopPrayerActionButton onClick={onScheduleMeeting}>Schedule Table</DesktopPrayerActionButton>}
          compact
          eyebrow="Meeting Covering"
        >
          <DesktopPrayerTable
            columns={["Meeting", "Person", "Date", "Prayer Team", "Status", "Action"]}
            gridTemplateColumns="minmax(260px,1fr) 170px 190px 180px 116px 110px"
            minWidth={960}
          >
            {upcomingMeetings.length ? upcomingMeetings.map((meeting) => (
              <DesktopPrayerTableRow
                key={meeting.id}
                gridTemplateColumns="minmax(260px,1fr) 170px 190px 180px 116px 110px"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[#0F172A]">{meetingDisplayTitle(meeting, people)}</span>
                  <span className="mt-0.5 block truncate text-xs leading-5 text-[#64748B]">{meetingActivityTitle(meeting)}</span>
                </span>
                <span className="truncate font-semibold text-[#475569]">{meetingPeopleTitle(meeting, people) || "—"}</span>
                <span className="truncate font-semibold text-[#475569]">{formatMeetingTimeRange(meeting)}</span>
                {/* TODO: Wire prayer team recipients when meeting covering send mechanics exist. */}
                <span className="font-semibold text-[#94A3B8]">—</span>
                <DesktopPrayerStatusPill>Not sent</DesktopPrayerStatusPill>
                <DesktopPrayerActionButton onClick={() => onOpenMeeting(meeting.id)}>View</DesktopPrayerActionButton>
              </DesktopPrayerTableRow>
            )) : (
              desktopMeetingCoveringSamples.map((meeting) => (
                <DesktopPrayerTableRow
                  gridTemplateColumns="minmax(260px,1fr) 170px 190px 180px 116px 110px"
                  key={meeting.meeting}
                >
                  <span className="truncate text-sm font-black text-[#0F172A]">{meeting.meeting}</span>
                  <span className="truncate font-semibold text-[#475569]">{meeting.person}</span>
                  <span className="truncate font-semibold text-[#475569]">{meeting.date}</span>
                  <span className="truncate font-semibold text-[#475569]">{meeting.prayerTeam}</span>
                  <DesktopPrayerStatusPill>{meeting.status}</DesktopPrayerStatusPill>
                  <DesktopPrayerActionButton onClick={() => openPrayerPlaceholder(meeting.meeting, "Meeting covering send/draft actions are placeholders until prayer team send mechanics are wired.")}>{meeting.action}</DesktopPrayerActionButton>
                </DesktopPrayerTableRow>
              ))
            )}
          </DesktopPrayerTable>
        </DesktopPanel>
      ) : null}

      {isAddPrayerRequestOpen ? <AddPrayerRequestPlaceholderSheet onClose={() => setIsAddPrayerRequestOpen(false)} /> : null}
      {prayerPlaceholder ? (
        <DesktopPrayerPlaceholderSheet
          description={prayerPlaceholder.description}
          onClose={() => setPrayerPlaceholder(null)}
          title={prayerPlaceholder.title}
        />
      ) : null}
    </div>
  );
}

function PeopleImportSheet({
  existingPeople,
  onClose,
  onImport,
}: {
  existingPeople: DosAppPerson[];
  onClose: () => void;
  onImport: (rows: PeopleImportRow[]) => Promise<PeopleImportResult>;
}) {
  const [fileName, setFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<PeopleImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<PeopleImportRow[]>([]);
  const analysis = useMemo(() => analyzePeopleImportRows(rows, existingPeople), [existingPeople, rows]);
  const previewRows = rows.slice(0, 5);
  const canImport = analysis.readyRows.length > 0 && !isImporting;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setFileName(file?.name ?? "");
    setImportError("");
    setImportResult(null);
    setParseError("");
    setRows([]);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Choose a CSV file.");
      return;
    }

    try {
      const text = await file.text();
      const parsedCsv = parseCsvText(text);

      if (!parsedCsv.headers.length || !parsedCsv.rows.length) {
        setParseError("This CSV needs a header row and at least one contact.");
        return;
      }

      setRows(parsedCsv.rows.map((row, index) => mapDosPeopleCsvRow(parsedCsv.headers, row, index)));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to read this CSV.");
    }
  }

  async function handleImport() {
    if (!canImport) {
      return;
    }

    setImportError("");
    setImportResult(null);
    setIsImporting(true);

    try {
      const result = await onImport(analysis.readyRows);

      setImportResult(result);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to import contacts.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Sheet description="Upload a CSV to add people to your field." onClose={onClose} title="Import Contacts">
      <div className="space-y-4">
        <label className="block rounded-[22px] border border-dashed border-[#BFDBFE] bg-white p-4">
          <FieldLabel>CSV File</FieldLabel>
          <input
            accept=".csv,text/csv"
            className="mt-3 block w-full text-sm text-[#64748B] file:mr-4 file:rounded-full file:border-0 file:bg-[#2563EB] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            onChange={handleFileChange}
            type="file"
          />
          {fileName ? <p className="mt-3 text-xs text-[#64748B]">Loaded {fileName}</p> : null}
        </label>

        {parseError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{parseError}</p> : null}
        {importError ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{importError}</p> : null}
        {importResult ? (
          <p className="rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] p-3 text-sm text-[#1D4ED8]">
            Imported {importResult.importedCount}. Skipped {importResult.skippedCount}.
          </p>
        ) : null}

        {rows.length ? (
          <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <SummaryTile label="Ready" value={String(analysis.readyRows.length)} />
              <SummaryTile label="Duplicates" value={String(analysis.duplicateRows.length)} />
              <SummaryTile label="Needs Name" value={String(analysis.invalidRows.length)} />
            </div>
            <div className="mt-4 space-y-2">
              {previewRows.map((row) => (
                <div className="rounded-2xl bg-[#F1F5F9] p-3" key={`${row.sourceRowNumber}-${row.name}-${row.phone}`}>
                  <p className="text-sm font-bold text-[#0F172A]">{row.name || "Missing name"}</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">
                    {[formatPhoneNumber(row.phone) || row.phone, row.email, row.church, row.spouseName ? `Spouse: ${row.spouseName}` : ""].filter(Boolean).join(" · ") || `Row ${row.sourceRowNumber}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <AppButton disabled={!canImport} icon="add" onClick={handleImport} tone="black">
          {isImporting ? "Importing..." : analysis.readyRows.length ? `Import ${analysis.readyRows.length} Contacts` : "Import Contacts"}
        </AppButton>
      </div>
    </Sheet>
  );
}

function RelationshipTypePicker({
  onChange,
  value,
}: {
  onChange: (value: DosRelationshipModel) => void;
  value: DosRelationshipModel;
}) {
  const selectedValue = relationshipTypeFromModel(value);

  return (
    <fieldset>
      <FieldLabel>Relationship Type</FieldLabel>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {relationshipTypeOptions.map((option) => {
          const selected = selectedValue === option.value;

          return (
            <label
              className={`relative flex min-h-12 cursor-pointer items-center rounded-2xl border px-3 py-2 transition-colors ${
                selected
                  ? "border-[#2563EB] bg-[#EBF2FF] shadow-[0_8px_20px_rgba(37,99,235,0.08)]"
                  : "border-[#E2E8F0] bg-white hover:border-[#BFDBFE]"
              }`}
              key={option.value}
            >
              <input
                checked={selected}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                name="relationship_type"
                onChange={() => onChange(relationshipModelFromRelationshipType(option.value as RelationshipTypeValue, value))}
                required
                type="radio"
                value={option.value}
              />
              <span className="pr-6 text-[13px] font-bold leading-tight text-[#0F172A]">{option.label}</span>
              <span
                className={`absolute right-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border transition-colors ${
                  selected ? "border-[#2563EB] bg-white" : "border-[#CBD5E1] bg-white"
                }`}
                aria-hidden="true"
              >
                {selected ? <span className="h-2 w-2 rounded-full bg-[#2563EB]" /> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RelationshipContextPicker({
  onChange,
  value,
}: {
  onChange: (value: DosRelationshipModel) => void;
  value: DosRelationshipModel;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = relationshipContextOptions.find((option) => option.value === value.relationshipContext) ?? relationshipContextOptions[relationshipContextOptions.length - 1];

  return (
    <fieldset className="overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white">
      <button
        aria-expanded={isOpen}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <FieldLabel>Relationship Context</FieldLabel>
          <span className="mt-1 block truncate text-sm font-bold text-[#0F172A]">{selectedOption.label}</span>
        </span>
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
          aria-hidden="true"
          strokeWidth={1.9}
        />
      </button>
      {isOpen ? (
        <div className="grid grid-cols-2 gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] p-2">
          {relationshipContextOptions.map((option) => {
            const selected = value.relationshipContext === option.value;

            return (
              <button
                className={`relative flex min-h-10 items-center justify-between gap-2 rounded-2xl border px-3 text-left text-xs font-bold transition-colors ${
                  selected
                    ? "border-[#2563EB] bg-[#EBF2FF] text-[#1D4ED8]"
                    : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#BFDBFE]"
                }`}
                key={option.value}
                onClick={() => {
                  onChange({ ...value, relationshipContext: option.value });
                  setIsOpen(false);
                }}
                type="button"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    selected ? "border-[#2563EB] bg-white" : "border-[#CBD5E1] bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {selected ? <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </fieldset>
  );
}

function RelationshipScorePicker({
  onChange,
  value,
}: {
  onChange: (value: RelationshipScoreValue) => void;
  value: RelationshipScoreValue;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = commitmentLevelOptions.find((option) => option.value === value) ?? commitmentLevelOptions.find((option) => option.value === 0)!;

  return (
    <fieldset>
      <input name="engagement_score" type="hidden" value={relationshipScoreLabel(value)} />
      <div className="relative">
        <button
          aria-expanded={isOpen}
          className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[18px] border border-[#E2E8F0] bg-white px-4 py-3 text-left transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/25"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="min-w-0">
            <FieldLabel>Engagement Level</FieldLabel>
            <span className="mt-1 block truncate text-sm font-bold text-[#0F172A]">{selectedOption.label}</span>
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-[#94A3B8] transition-transform ${isOpen ? "-rotate-90" : "rotate-90"}`}
            aria-hidden="true"
            strokeWidth={1.9}
          />
        </button>

        {isOpen ? (
          <div className="absolute left-0 right-0 z-30 mt-2 max-h-[280px] overflow-y-auto rounded-[20px] border border-[#E2E8F0] bg-white p-2 shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
            {commitmentLevelOptions.map((option) => {
              const selected = value === option.value;

              return (
                <button
                  className={`flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "bg-[#EBF2FF] text-[#0F172A]"
                      : "text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      selected ? "border-[#2563EB] bg-white" : "border-[#CBD5E1] bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {selected ? <span className="h-2 w-2 rounded-full bg-[#2563EB]" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold leading-tight ${selected ? "text-[#1D4ED8]" : "text-[#0F172A]"}`}>{option.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#64748B]">{option.helper}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

function AdditionalPersonInformation({
  defaults = {},
  householdDraft,
  onHouseholdDraftChange,
  isOpen,
  onToggle,
  showToggle = true,
}: {
  defaults?: PersonFormDefaults;
  householdDraft: PersonHouseholdDraft;
  onHouseholdDraftChange: (value: PersonHouseholdDraft) => void;
  isOpen: boolean;
  onToggle: () => void;
  showToggle?: boolean;
}) {
  const updateSpouseDraft = (key: "spouseFirstName" | "spouseLastName", value: string) => {
    onHouseholdDraftChange({
      ...householdDraft,
      [key]: value,
    });
  };

  const updateChildDraft = (childId: string, key: "firstName" | "lastName", value: string) => {
    onHouseholdDraftChange({
      ...householdDraft,
      children: householdDraft.children.map((child) => (
        child.id === childId ? { ...child, [key]: value } : child
      )),
    });
  };

  const addChildDraft = () => {
    onHouseholdDraftChange({
      ...householdDraft,
      children: [
        ...householdDraft.children,
        {
          firstName: "",
          id: `child-${Date.now()}-${householdDraft.children.length}`,
          lastName: "",
        },
      ],
    });
  };

  const removeChildDraft = (childId: string) => {
    const remainingChildren = householdDraft.children.filter((child) => child.id !== childId);

    onHouseholdDraftChange({
      ...householdDraft,
      children: remainingChildren.length ? remainingChildren : [blankChildDraft()],
    });
  };

  const fields = (
    <div className={showToggle ? "mt-4 grid gap-3 border-t border-[#E2E8F0] pt-4" : "grid gap-3"}>
      <label className="block">
        <FieldLabel>Email</FieldLabel>
        <input className={FieldInputClass()} defaultValue={defaults.email} name="email" placeholder="email@example.com" type="email" />
      </label>
      <label className="block">
        <FieldLabel>Home Address</FieldLabel>
        <input className={FieldInputClass()} defaultValue={defaults.homeAddress} name="home_address" placeholder="Street address" />
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_72px_86px] gap-2">
        <label className="block min-w-0">
          <FieldLabel>City</FieldLabel>
          <input className={FieldInputClass()} defaultValue={defaults.city} name="city" placeholder="City" />
        </label>
        <label className="block min-w-0">
          <FieldLabel>State</FieldLabel>
          <input className={FieldInputClass()} defaultValue={defaults.state} maxLength={2} name="state" placeholder="ST" />
        </label>
        <label className="block min-w-0">
          <FieldLabel>ZIP</FieldLabel>
          <input className={FieldInputClass()} defaultValue={defaults.zip} inputMode="numeric" name="zip" placeholder="ZIP" />
        </label>
      </div>
      <label className="block">
        <FieldLabel>Church</FieldLabel>
        <input className={FieldInputClass()} defaultValue={defaults.church} name="church" placeholder="Church / community" />
      </label>
      <label className="block">
        <FieldLabel>Occupation</FieldLabel>
        <input className={FieldInputClass()} defaultValue={defaults.occupation} name="occupation" placeholder="What do they do?" />
      </label>
      <label className="block">
        <FieldLabel>Birthday</FieldLabel>
        <input className={FieldInputClass()} defaultValue={defaults.birthday} name="birthday" type="date" />
      </label>
      <label className="block">
        <FieldLabel>Notes</FieldLabel>
        <textarea className={FieldTextareaClass()} defaultValue={defaults.notes} name="notes" placeholder="Private notes..." />
      </label>
      <details className="group overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-white">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC] [&::-webkit-details-marker]:hidden">
          <FieldLabel>Household Information</FieldLabel>
          <ChevronRight className="h-4 w-4 shrink-0 rotate-90 text-[#94A3B8] transition-transform group-open:-rotate-90" aria-hidden="true" strokeWidth={1.9} />
        </summary>
        <div className="grid gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <div className="grid gap-2 min-[360px]:grid-cols-2">
            <label className="block min-w-0">
              <FieldLabel>Spouse First Name</FieldLabel>
              <input className={FieldInputClass()} onChange={(event) => updateSpouseDraft("spouseFirstName", event.target.value)} placeholder="First name" value={householdDraft.spouseFirstName} />
            </label>
            <label className="block min-w-0">
              <FieldLabel>Spouse Last Name</FieldLabel>
              <input className={FieldInputClass()} onChange={(event) => updateSpouseDraft("spouseLastName", event.target.value)} placeholder="Last name" value={householdDraft.spouseLastName} />
            </label>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Children</FieldLabel>
              <button
                className="inline-flex h-8 items-center rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-bold text-[#2563EB] transition-colors hover:bg-[#EBF2FF]"
                onClick={addChildDraft}
                type="button"
              >
                + Child
              </button>
            </div>
            <div className="grid gap-2">
              {householdDraft.children.map((child, index) => (
                <div className="grid gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-2" key={child.id}>
                  <div className="grid gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_32px]">
                    <label className="block min-w-0">
                      <FieldLabel>Child First Name</FieldLabel>
                      <input className={FieldInputClass()} onChange={(event) => updateChildDraft(child.id, "firstName", event.target.value)} placeholder="First name" value={child.firstName} />
                    </label>
                    <label className="block min-w-0">
                      <FieldLabel>Child Last Name</FieldLabel>
                      <input className={FieldInputClass()} onChange={(event) => updateChildDraft(child.id, "lastName", event.target.value)} placeholder="Last name" value={child.lastName} />
                    </label>
                    <button
                      aria-label={`Remove child ${index + 1}`}
                      className="mt-0 flex h-9 w-9 items-center justify-center justify-self-end rounded-full border border-[#E2E8F0] bg-white text-[#64748B] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 min-[360px]:mt-5"
                      onClick={() => removeChildDraft(child.id)}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );

  if (!showToggle) {
    return (
      <section className="grid gap-2">
        {fields}
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-[#E2E8F0] bg-white p-4">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={onToggle}
        type="button"
      >
        <span>
          <span className="block text-sm font-bold text-[#0F172A]">Additional Information</span>
        </span>
        <span className={`text-lg leading-none text-[#94A3B8] transition-transform ${isOpen ? "rotate-45" : ""}`} aria-hidden="true">
          +
        </span>
      </button>

      {isOpen ? fields : null}
    </section>
  );
}

function PersonExtraDetails({
  additionalDefaults,
  detailsOpen,
  householdDraft,
  onChange,
  onHouseholdDraftChange,
  onScoreChange,
  onToggleDetails,
  scoreValue,
  showToggle = true,
  value,
}: {
  additionalDefaults?: PersonFormDefaults;
  detailsOpen: boolean;
  householdDraft: PersonHouseholdDraft;
  onChange: (value: DosRelationshipModel) => void;
  onHouseholdDraftChange: (value: PersonHouseholdDraft) => void;
  onScoreChange: (value: RelationshipScoreValue) => void;
  onToggleDetails: () => void;
  scoreValue: RelationshipScoreValue;
  showToggle?: boolean;
  value: DosRelationshipModel;
}) {
  const fields = (
    <div className="space-y-4 rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <RelationshipContextPicker onChange={onChange} value={value} />
      <RelationshipScorePicker onChange={onScoreChange} value={scoreValue} />
      <AdditionalPersonInformation
        defaults={additionalDefaults}
        householdDraft={householdDraft}
        isOpen
        onHouseholdDraftChange={onHouseholdDraftChange}
        onToggle={onToggleDetails}
        showToggle={false}
      />
    </div>
  );

  if (!showToggle) {
    return <section>{fields}</section>;
  }

  return (
    <section className="space-y-3">
      <button
        aria-expanded={detailsOpen}
        className="flex w-full items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-left text-sm font-semibold text-[#2563EB] transition-colors hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
        onClick={onToggleDetails}
        type="button"
      >
        <span>{detailsOpen ? "Hide extra details" : "Show extra details"}</span>
        <span className={`text-lg leading-none text-[#94A3B8] transition-transform ${detailsOpen ? "rotate-45" : ""}`} aria-hidden="true">
          +
        </span>
      </button>
      {detailsOpen ? fields : null}
    </section>
  );
}

function PersonFormContent({
  additionalDefaults,
  buttonText,
  detailsOpen,
  errorMessage,
  isSubmitting,
  nameDefault,
  onRelationshipChange,
  onDelete,
  onScoreChange,
  onSubmit,
  onToggleDetails,
  phoneDefault,
  relationshipModel,
  scoreValue,
  showDetailsToggle = true,
  submittingText,
}: {
  additionalDefaults?: PersonFormDefaults;
  buttonText: string;
  detailsOpen: boolean;
  errorMessage: string;
  isSubmitting: boolean;
  nameDefault?: string | null;
  onRelationshipChange: (value: DosRelationshipModel) => void;
  onDelete?: () => void;
  onScoreChange: (value: RelationshipScoreValue) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleDetails: () => void;
  phoneDefault?: string | null;
  relationshipModel: DosRelationshipModel;
  scoreValue: RelationshipScoreValue;
  showDetailsToggle?: boolean;
  submittingText: string;
}) {
  const [nameDraft, setNameDraft] = useState(() => splitNameParts(nameDefault));
  const [phoneDraft, setPhoneDraft] = useState(() => phoneDigitsOnly(phoneDefault));
  const [householdDraft, setHouseholdDraft] = useState<PersonHouseholdDraft>(() => householdDraftFromDefaults(additionalDefaults));

  useEffect(() => {
    setNameDraft(splitNameParts(nameDefault));
  }, [nameDefault]);

  useEffect(() => {
    setPhoneDraft(phoneDigitsOnly(phoneDefault));
  }, [phoneDefault]);

  useEffect(() => {
    setHouseholdDraft(householdDraftFromDefaults(additionalDefaults));
  }, [additionalDefaults?.childrenNames, additionalDefaults?.spouseName]);

  const composedName = joinNameParts(nameDraft.firstName, nameDraft.lastName);
  const effectiveDetailsOpen = showDetailsToggle ? detailsOpen : true;

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <input name="name" type="hidden" value={composedName} />
      <input name="phone" type="hidden" value={phoneDraft} />
      <input name="spouse_name" type="hidden" value={householdDraftSpouseName(householdDraft)} />
      <input name="children_names" type="hidden" value={householdDraftChildrenNames(householdDraft)} />
      <div className="grid gap-3">
        <div className="grid gap-2 min-[360px]:grid-cols-2">
          <label className="block min-w-0">
            <FieldLabel>First Name</FieldLabel>
            <input className={FieldInputClass()} onChange={(event) => setNameDraft((current) => ({ ...current, firstName: event.target.value }))} placeholder="First name" required value={nameDraft.firstName} />
          </label>
          <label className="block min-w-0">
            <FieldLabel>Last Name</FieldLabel>
            <input className={FieldInputClass()} onChange={(event) => setNameDraft((current) => ({ ...current, lastName: event.target.value }))} placeholder="Last name" value={nameDraft.lastName} />
          </label>
        </div>
        <label className="block">
          <FieldLabel>Phone</FieldLabel>
          <input
            className={FieldInputClass()}
            inputMode="tel"
            onChange={(event) => setPhoneDraft(phoneDigitsOnly(event.target.value))}
            placeholder="(651) 456-8974"
            required
            type="tel"
            value={formatPhoneNumber(phoneDraft)}
          />
        </label>
      </div>
      <RelationshipTypePicker onChange={onRelationshipChange} value={relationshipModel} />
      <PersonExtraDetails
        additionalDefaults={additionalDefaults}
        detailsOpen={effectiveDetailsOpen}
        householdDraft={householdDraft}
        onChange={onRelationshipChange}
        onHouseholdDraftChange={setHouseholdDraft}
        onScoreChange={onScoreChange}
        onToggleDetails={onToggleDetails}
        scoreValue={scoreValue}
        showToggle={showDetailsToggle}
        value={relationshipModel}
      />
      {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
      <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? submittingText : buttonText}</AppButton>
      {onDelete ? (
        <button
          className="mt-2 w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={onDelete}
          type="button"
        >
          Delete Person
        </button>
      ) : null}
    </form>
  );
}

function DetailCard({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_14px_34px_rgba(37,99,235,0.055)]">
      <div className="flex items-center gap-2">
        {icon ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB]">
            {icon}
          </span>
        ) : null}
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          {title}
        </p>
      </div>
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3">{children}</div>
    </section>
  );
}

function SectionEmptyState({
  action,
  text,
  title,
}: {
  action?: ReactNode;
  text?: string;
  title: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.035)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5 text-[#0F172A]">{title}</span>
        {text ? <span className="mt-1 block text-sm leading-6 text-[#64748B]">{text}</span> : null}
        {action ? <span className="mt-3 block">{action}</span> : null}
      </span>
    </div>
  );
}

function FruitEventIcon({ event }: { event: DosAppFruitEvent }) {
  const iconClass = "h-4 w-4";

  if (event.fruitType.toLowerCase().includes("church")) {
    return <Church className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
  }

  if (event.fruitType.toLowerCase().includes("prayer")) {
    return <Moon className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
  }

  if (event.fruitType.toLowerCase().includes("testimony")) {
    return <Mic className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
  }

  if (event.fruitType.toLowerCase().includes("discip")) {
    return <Users className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
  }

  return <Flame className={iconClass} aria-hidden="true" strokeWidth={1.8} />;
}

function FruitEventRow({ event, onClick }: { event: DosAppFruitEvent; onClick?: () => void }) {
  const content = (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]">
        <FruitEventIcon event={event} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold leading-6 text-[#0F172A]">{event.title || event.fruitType}</h3>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-[#64748B]">{formatDate(event.date)}</p>
        <p className="mt-1 text-sm leading-6 text-[#64748B]">{fruitNarrative(event)}</p>
      </div>
      {onClick ? <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </div>
  );

  if (onClick) {
    return (
      <button
        className="relative w-full min-w-0 overflow-hidden rounded-[22px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="relative min-w-0 overflow-hidden rounded-[22px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      {content}
    </article>
  );
}

function LeaderReflectionRow({ reflection }: { reflection: DosAppLeaderReflection }) {
  return (
    <article className="flex min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-bold leading-5 text-[#0F172A]">{reflection.whatHappened || reflection.privateNotes || "Leader Reflection"}</p>
          {reflection.followUpNeeded ? (
            <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
              Follow Up
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[#64748B]">{formatDate(reflection.createdAt)}</p>
        {reflection.prayerNeeds ? <p className="mt-2 text-sm leading-6 text-[#0F172A]">Prayer: {reflection.prayerNeeds}</p> : null}
        {reflection.observedFruit.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reflection.observedFruit.map((fruit) => (
              <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]" key={fruit}>{fruit}</span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ParticipantReviewRow({ review }: { review: DosAppParticipantReview }) {
  return (
    <article className="flex min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-[#0F172A]">Review</p>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{formatDate(review.submittedAt)}</span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0F172A]">{review.comments || "Participant review submitted."}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">Heard: {review.feltHeard ?? "Skipped"}</span>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">Meet Again: {review.wouldMeetAgain === null ? "Skipped" : review.wouldMeetAgain ? "Yes" : "No"}</span>
        </div>
      </div>
    </article>
  );
}

function ParticipantTestimonyRow({ onClick, testimony }: { onClick?: () => void; testimony: DosAppParticipantTestimony }) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <Mic className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-[#0F172A]">Testimony</p>
          <span className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B]">{formatDate(testimony.submittedAt)}</span>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#0F172A]">{testimony.whatChanged || testimony.story}</p>
        {testimony.publicDisplayName ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-[#64748B]">{testimony.publicDisplayName}</p>
        ) : null}
      </div>
      {onClick ? <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        className="flex w-full min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className="flex min-w-0 gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 shadow-[0_8px_22px_rgba(37,99,235,0.04)]">
      {content}
    </article>
  );
}

function OutcomeDetailSheet({
  entry,
  meeting,
  onClose,
  person,
}: {
  entry: PersonOutcomeEntry;
  meeting?: DosAppMeeting | null;
  onClose: () => void;
  person: DosAppPerson;
}) {
  const isTestimony = entry.type === "testimony";
  const title = isTestimony ? "Testimony Shared" : entry.event.title || entry.event.fruitType;
  const date = isTestimony ? entry.testimony.submittedAt : entry.event.date;
  const description = isTestimony
    ? entry.testimony.whatChanged || entry.testimony.story || "Testimony shared."
    : fruitNarrative(entry.event);
  const source = isTestimony
    ? "Testimony"
    : entry.event.generatedBy || statusLabel(entry.event.sourceType);
  const peopleInvolved = meeting?.participantNames.length
    ? formatDosParticipantList(meeting.participantNames)
    : person.name;

  return (
    <MobileBottomSheet
      badge={<span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">{isTestimony ? <Mic className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /> : entry.type === "fruit" ? <FruitEventIcon event={entry.event} /> : null}</span>}
      onClose={onClose}
      subtitle={date ? formatDate(date) : "Date not recorded"}
      title={title}
    >
      <div className="grid gap-3">
        <DetailCard title="Outcome">
          <p className="whitespace-pre-line rounded-[18px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-sm leading-6 text-[#0F172A]">{description}</p>
        </DetailCard>
        <DetailCard title="Details">
          <DetailRow icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Date" value={date ? formatDate(date) : "Not recorded" } />
          {meeting ? <DetailRow icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Related Table" value={`${meetingActivityTitle(meeting)} · ${formatDate(meeting.date)}`} /> : null}
          <DetailRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="People Involved" value={peopleInvolved} />
          <DetailRow icon={<Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Source" value={source} />
        </DetailCard>
      </div>
    </MobileBottomSheet>
  );
}

function ConversationFlowDetail({ meeting }: { meeting: DosAppMeeting }) {
  const flow = getConversationFlowDefinition(meeting.conversationFlowKey);

  if (!flow) {
    return null;
  }

  const selectedActions = responseAsStringArray(meeting.conversationResponses.followUpActions);
  const selectedActionLabels = (flow.followUpActions ?? [])
    .filter((action) => selectedActions.includes(action.id))
    .map((action) => action.label);

  return (
    <DetailCard title={flow.title}>
      {flow.sections.map((section) => (
        <div className="grid gap-2" key={section.id}>
          {flow.sections.length > 1 ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
              {section.title}
            </p>
          ) : null}
          {section.questions.map((question) => (
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#F1F5F9] p-3" key={question.id}>
              <p className="text-sm leading-5 text-[#0F172A]">{question.label}</p>
              <span className="max-w-[52%] shrink-0 rounded-full bg-white px-2.5 py-1 text-right text-xs font-semibold text-[#64748B]">
                {questionResponseLabel(question, meeting.conversationResponses[question.id])}
              </span>
            </div>
          ))}
        </div>
      ))}
      {selectedActionLabels.length ? (
        <div className="rounded-2xl bg-[#F1F5F9] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
            Follow-up
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedActionLabels.map((label) => (
              <span className="rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-xs font-semibold text-[#1D4ED8]" key={label}>
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </DetailCard>
  );
}

function DetailRow({
  ariaLabel,
  href,
  icon,
  label,
  onClick,
  value,
}: {
  ariaLabel?: string;
  href?: string;
  icon?: ReactNode;
  label?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  value: ReactNode;
}) {
  const content = (
    <>
      {icon ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        {label ? <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>{label}</p> : null}
        <div className="mt-0.5 break-words leading-5 text-[#0F172A]">{value}</div>
      </div>
      {href ? <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} /> : null}
    </>
  );

  if (href) {
    return (
      <a
        aria-label={ariaLabel}
        className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]"
        href={href}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A]">
      {content}
    </div>
  );
}

function BottomNavigation({
  activeTab,
  onSelect,
}: {
  activeTab: ActiveTab;
  onSelect: (tab: ActiveTab) => void;
}) {
  return (
    <nav aria-label="Primary" className="absolute inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] md:hidden">
      <div className="mx-auto grid w-full grid-cols-3 gap-1 rounded-full border border-white/75 bg-white/62 p-1.5 shadow-[0_24px_55px_rgba(148,163,184,0.22)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/58">
        {mobileTabs.map((tab) => {
          const selected = activeTab === tab.value || (tab.value === "more" && activeTab === "people");

          return (
          <button
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors ${
              selected ? "bg-[#EBF2FF] text-[#2563EB] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]" : "text-[#94A3B8]"
            }`}
            key={tab.value}
            onClick={() => onSelect(tab.value)}
            type="button"
          >
            <Icon name={tab.icon} size={18} />
            {tab.label}
          </button>
          );
        })}
      </div>
    </nav>
  );
}

type MobileFloatingActionItem = {
  icon: IconName;
  label: string;
  onClick: () => void;
};

function MobileFloatingActions({
  isOpen,
  items,
  onClose,
  onToggle,
}: {
  isOpen: boolean;
  items: MobileFloatingActionItem[];
  onClose: () => void;
  onToggle: () => void;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[70] pointer-events-none md:hidden">
      {isOpen ? (
        <button
          aria-label="Close quick actions"
          className="absolute inset-0 pointer-events-auto bg-transparent"
          onClick={onClose}
          type="button"
        />
      ) : null}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.65rem)] right-5 flex w-[216px] flex-col items-end gap-2 pointer-events-auto">
        {isOpen ? (
          <div className="w-full rounded-[26px] border border-white/80 bg-white/95 p-2 shadow-[0_20px_55px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            {items.map((item) => (
              <button
                className="flex min-h-11 w-full items-center gap-3 rounded-[18px] px-3 text-left text-xs font-bold text-[#0F172A] transition-colors hover:bg-[#F8FAFC] active:bg-[#EFF6FF]"
                key={item.label}
                onClick={item.onClick}
                type="button"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB]">
                  <Icon name={item.icon} size={15} />
                </span>
                <span className="min-w-0 whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        ) : null}
        <button
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close quick actions" : "Open quick actions"}
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-[#2563EB] text-white shadow-[0_20px_44px_rgba(37,99,235,0.34)] transition-transform active:scale-[0.97] ${isOpen ? "rotate-45" : ""}`}
          onClick={onToggle}
          type="button"
        >
          <Icon name="add" size={28} />
        </button>
      </div>
    </div>
  );
}

function DesktopNavigation({
  activeTab,
  moreAppView,
  onOpenMoreApp,
  onOpenProfile,
  onSelect,
  profileEmail,
  profileImageUrl,
  profileName,
  workspaceName,
}: {
  activeTab: ActiveTab;
  moreAppView: MoreAppView | null;
  onOpenMoreApp: (view: MoreAppView) => void;
  onOpenProfile: () => void;
  onSelect: (tab: ActiveTab) => void;
  profileEmail: string;
  profileImageUrl?: string | null;
  profileName: string;
  workspaceName: string;
}) {
  function isNavItemActive(item: DesktopNavItem) {
    if (item.type === "tab") {
      return activeTab === item.value && moreAppView === null;
    }

    if (item.type === "moreApp") {
      if (item.value === "apps") {
        return activeTab === "more" && (moreAppView === "apps" || moreAppView === null);
      }

      return activeTab === "more" && moreAppView === item.value;
    }

    return activeTab === "more" && moreAppView === "settings";
  }

  function selectNavItem(item: DesktopNavItem) {
    if (item.type === "tab") {
      onSelect(item.value);
    } else if (item.type === "moreApp") {
      onOpenMoreApp(item.value);
    } else {
      onOpenProfile();
    }
  }

  function renderNavButton(item: DesktopNavItem, key: string) {
    const selected = isNavItemActive(item);

    return (
      <button
        aria-current={selected ? "page" : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-[18px] px-3 text-sm font-bold transition-colors ${
          selected
            ? "bg-[#EBF2FF] text-[#2563EB] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_22px_rgba(37,99,235,0.08)]"
            : "text-[#64748B] hover:bg-[#F8FBFF] hover:text-[#0F172A]"
        }`}
        key={key}
        onClick={() => selectNavItem(item)}
        type="button"
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] ${
          selected ? "bg-white text-[#2563EB]" : "bg-[#F8FAFC] text-[#94A3B8]"
        }`}>
          <Icon name={item.icon} size={17} />
        </span>
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <aside className="hidden h-full w-[232px] shrink-0 border-r border-white/65 bg-white/58 px-4 py-6 shadow-[18px_0_55px_rgba(148,163,184,0.14)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/52 md:flex md:flex-col xl:w-[260px]">
      <div className="rounded-[26px] border border-[#EAF2FF] bg-[#F8FBFF] p-4">
        <p className="text-[20px] font-black leading-none tracking-[-0.035em] text-[#1D4ED8]" style={{ fontFamily: font.oswald }}>
          DOS
        </p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>Workspace</p>
        <p className="mt-3 line-clamp-2 text-sm font-black leading-5 text-[#0F172A]">{workspaceName}</p>
      </div>
      <nav className="mt-5 grid gap-5" aria-label="DOS sections">
        <div className="grid gap-1.5">
          {renderNavButton(desktopDashboardNavItem, "dashboard")}
        </div>
        {desktopNavGroups.map((group) => (
          <div key={group.label}>
            <p className="px-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
              {group.label}
            </p>
            <div className="mt-2 grid gap-1.5">
              {group.items.map((item) => renderNavButton(item, `${group.label}-${item.label}`))}
            </div>
          </div>
        ))}
      </nav>
      <button
        className="mt-auto flex min-w-0 items-center gap-3 rounded-[22px] border border-[#EAF2FF] bg-[#F8FBFF] p-3 text-left transition-colors hover:border-[#BFDBFE] hover:bg-white"
        onClick={onOpenProfile}
        type="button"
      >
        <UserProfileAvatar imageUrl={profileImageUrl} name={profileName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#0F172A]">{profileName}</span>
          <span className="mt-0.5 block truncate text-xs text-[#64748B]">{profileEmail || "Profile settings"}</span>
        </span>
      </button>
    </aside>
  );
}

function ContactActionRow({
  actions,
  icon,
  label,
  primaryHref,
  value,
}: {
  actions?: Array<{ href: string; label: string }>;
  icon: ReactNode;
  label: string;
  primaryHref: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-sm text-[#0F172A]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]">{icon}</span>
      <a className="min-w-0 flex-1 transition-colors hover:text-[#1D4ED8]" href={primaryHref}>
        <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>{label}</span>
        <span className="mt-0.5 block truncate leading-5 text-[#0F172A]">{value}</span>
      </a>
      {actions?.length ? (
        <span className="flex shrink-0 gap-1.5 max-[350px]:gap-1">
          {actions.map((action) => (
            <a
              className="inline-flex min-h-8 items-center justify-center rounded-full bg-[#EBF2FF] px-3 text-xs font-bold text-[#1D4ED8] transition-colors hover:bg-[#DBEAFE] max-[350px]:px-2.5"
              href={action.href}
              key={action.label}
            >
              {action.label}
            </a>
          ))}
        </span>
      ) : <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />}
    </div>
  );
}

function CircleLayerList({
  empty,
  hiddenCount = 0,
  items,
  latestMeetingDateByPersonId,
  onLogMeeting,
  onOpenPerson,
  startIndex = 0,
}: {
  empty: string;
  hiddenCount?: number;
  items: CircleListItem[];
  latestMeetingDateByPersonId: Map<string, string | null>;
  onLogMeeting?: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
  startIndex?: number;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_36px_rgba(42,37,29,0.055)]">
      {items.length ? (
        <>
          {items.map(({ person }, index) => (
            <CircleListRow
              isLast={!hiddenCount && index === items.length - 1}
              index={startIndex + index}
              key={person.id}
              lastMeetingDate={latestMeetingDateByPersonId.get(person.id) ?? null}
              onClick={() => onOpenPerson(person.id)}
              onLogMeeting={onLogMeeting ? () => onLogMeeting(person.id) : undefined}
              person={person}
            />
          ))}
          {hiddenCount ? (
            <div className="flex min-h-[56px] items-center gap-3 bg-white px-4 text-sm font-semibold text-[#0F172A]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-light text-[#64748B]">+</span>
              <span className="min-w-0 flex-1">{hiddenCount} more people</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="px-4 py-5 text-center text-sm leading-5 text-[#64748B]">{empty}</p>
      )}
    </div>
  );
}

function CircleLayerSheet({
  activeCircle,
  circleGroups,
  latestMeetingDateByPersonId,
  onClose,
  onLogMeeting,
  onLogMeetingForPerson,
  onOpenPerson,
}: {
  activeCircle: CircleFocusView;
  circleGroups: CircleLayerGroups;
  latestMeetingDateByPersonId: Map<string, string | null>;
  onClose: () => void;
  onLogMeeting: () => void;
  onLogMeetingForPerson: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
}) {
  const details = circleLayerDetails(activeCircle, circleGroups);
  const visiblePeople = previewCircleLayerItems(activeCircle, details.items);
  const hiddenCount = Math.max(0, details.items.length - visiblePeople.length);
  const badgeClassName = "bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]";

  return (
    <MobileBottomSheet
      badge={<span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${badgeClassName}`}>{details.value}</span>}
      footer={(
        <button
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
          onClick={onLogMeeting}
          type="button"
        >
          <Icon name="add" size={14} />
          Log Table
        </button>
      )}
      onClose={onClose}
      subtitle={details.subtitle}
      title={details.title}
    >
        <CircleLayerList
          empty={details.empty}
          hiddenCount={hiddenCount}
          items={visiblePeople}
          latestMeetingDateByPersonId={latestMeetingDateByPersonId}
          onLogMeeting={onLogMeetingForPerson}
          onOpenPerson={onOpenPerson}
          startIndex={details.startIndex}
        />
    </MobileBottomSheet>
  );
}

function CirclesDetailOverlay({
  circleGroups,
  latestMeetingDateByPersonId,
  onBack,
  onLogMeeting,
  onLogMeetingForPerson,
  onOpenPerson,
  onSearch,
}: {
  circleGroups: CircleLayerGroups;
  latestMeetingDateByPersonId: Map<string, string | null>;
  onBack: () => void;
  onLogMeeting: () => void;
  onLogMeetingForPerson: (personId: string) => void;
  onOpenPerson: (personId: string) => void;
  onSearch: () => void;
}) {
  const [activeCircle, setActiveCircle] = useState<CircleFocusView>("three");
  const circleTabs: Array<SegmentedTabOption<CircleFocusView>> = [
    { label: "My 3", value: "three" },
    { label: "My 12", value: "twelve" },
    { label: "My 70", value: "seventy" },
    { label: "My 120", value: "my_120" },
  ];
  const circleContent = circleLayerDetails(activeCircle, circleGroups);
  const visiblePeople = previewCircleLayerItems(activeCircle, circleContent.items);
  const hiddenCount = Math.max(0, circleContent.items.length - visiblePeople.length);

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-white px-4 pb-28 pt-6 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white" onClick={onBack} type="button" aria-label="Back to home">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-sm font-bold text-[#0F172A]">
          Your Circles
        </p>
        <button className="flex h-10 w-10 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white" onClick={onSearch} type="button" aria-label="Search people">
          <Search className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
        </button>
      </header>

      <div className="mt-5">
        <SegmentedTabs onChange={setActiveCircle} options={circleTabs} value={activeCircle} />
      </div>

      <section className="mx-auto mt-5 max-w-[300px] text-center">
        <p className="text-sm leading-5 text-[#64748B]">{circleContent.subtitle}</p>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          {circleContent.cumulativeCount} / {circleContent.capacity} in {circleDisplayName(activeCircle)}
        </p>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
            {circleContent.sectionLabel}
          </p>
          <span className="text-xs text-[#64748B]">{circleContent.items.length}</span>
        </div>
        <CircleLayerList
          empty={circleContent.empty}
          hiddenCount={hiddenCount}
          items={visiblePeople}
          latestMeetingDateByPersonId={latestMeetingDateByPersonId}
          onLogMeeting={onLogMeetingForPerson}
          onOpenPerson={onOpenPerson}
          startIndex={circleContent.startIndex}
        />
        <button
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)]"
          onClick={onLogMeeting}
          type="button"
        >
          <Icon name="log" size={14} />
          Log Table
        </button>
      </section>
    </div>
  );
}

function PrayerRequestCard({
  answered,
  onMarkAnswered,
  onPrayNow,
  reminder,
}: {
  answered?: boolean;
  onMarkAnswered?: () => void;
  onPrayNow?: () => void;
  reminder: DosAppRelationshipReminder;
}) {
  const requestTitle = reminder.title?.replace(/^Prayer:\s*/i, "").trim() || "Prayer request";
  const reminderDate = nextReminderDate(reminder);

  return (
    <article className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-3.5 shadow-[0_12px_30px_rgba(37,99,235,0.045)]">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
          {answered ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} /> : <Heart className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-5 text-[#0F172A]">{requestTitle}</p>
          {reminder.notes ? <p className="mt-1 whitespace-pre-line text-xs leading-5 text-[#475569]">{reminder.notes}</p> : <p className="mt-1 text-xs leading-5 text-[#64748B]">No prayer details added yet.</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8] ring-1 ring-[#DCEBFF]" style={{ fontFamily: font.rajdhani }}>
              {prayerFrequencyLabel(reminder.recurrence)}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B] ring-1 ring-[#E2E8F0]" style={{ fontFamily: font.rajdhani }}>
              {formatDate(reminderDate)}
            </span>
          </div>
        </div>
      </div>
      {!answered ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-3 text-xs font-bold text-[#1D4ED8]" onClick={onPrayNow} type="button">
            Pray Now
          </button>
          <button className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#2563EB] px-3 text-xs font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.18)]" onClick={onMarkAnswered} type="button">
            Mark Answered
          </button>
        </div>
      ) : null}
    </article>
  );
}

function AnsweredPrayerCard({
  answeredAt,
  reminder,
}: {
  answeredAt: string;
  reminder: DosAppRelationshipReminder;
}) {
  return (
    <PrayerRequestCard answered reminder={{ ...reminder, reminderDate: answeredAt }} />
  );
}

function PrayerResourceMiniCard({
  onOpen,
  resource,
}: {
  onOpen: () => void;
  resource: DosPrayerResource;
}) {
  return (
    <button className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#DCEBFF] bg-white p-3 text-left shadow-[0_10px_24px_rgba(37,99,235,0.045)] transition-colors hover:border-[#BFDBFE]" onClick={onOpen} type="button">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
        <BookOpen className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 inline-flex max-w-full rounded-full bg-[#EBF2FF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>{resource.category}</span>
        <span className="block text-sm font-black leading-5 text-[#0F172A]">{resource.title}</span>
        <span className="mt-1 block text-xs leading-5 text-[#64748B]">{resource.description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
    </button>
  );
}

function PrayerResourcesLibrarySheet({
  activeCategory,
  onCategoryChange,
  onClose,
  onOpenResource,
  onQueryChange,
  query,
}: {
  activeCategory: DosPrayerResourceCategory;
  onCategoryChange: (category: DosPrayerResourceCategory) => void;
  onClose: () => void;
  onOpenResource: (resource: DosPrayerResource) => void;
  onQueryChange: (value: string) => void;
  query: string;
}) {
  const search = query.trim().toLowerCase();
  const resources = dosPrayerResources.filter((resource) => {
    if (!search) {
      return resource.category === activeCategory;
    }

    const searchable = [
      resource.title,
      resource.category,
      resource.description,
      ...resource.keyScriptures,
      ...resource.reflectionQuestions,
    ].join(" ").toLowerCase();

    return searchable.includes(search);
  });

  return (
    <Sheet description="Open a prayer, share a simple public link, or save it to follow-up for this relationship." onClose={onClose} showEyebrow={false} title="Prayer Resources">
      <div className="space-y-4">
        <label className="relative block">
          <span className="sr-only">Search prayer resources</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />
          <input
            className="min-h-11 w-full rounded-full border border-[#DCEBFF] bg-white pl-9 pr-4 text-sm font-semibold text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search prayers"
            value={query}
          />
        </label>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {dosPrayerResourceCategories.map((category) => {
            const selected = category === activeCategory;

            return (
              <button
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-colors ${selected ? "bg-[#2563EB] text-white shadow-[0_10px_22px_rgba(37,99,235,0.18)]" : "border border-[#DCEBFF] bg-white text-[#475569]"}`}
                key={category}
                onClick={() => onCategoryChange(category)}
                type="button"
              >
                {category}
              </button>
            );
          })}
        </div>
        <div className="grid gap-2.5">
          {resources.length ? (
            resources.map((resource) => (
              <PrayerResourceMiniCard key={resource.slug} onOpen={() => onOpenResource(resource)} resource={resource} />
            ))
          ) : (
            <p className="rounded-[20px] border border-[#EAF2FF] bg-white px-4 py-5 text-sm font-semibold leading-6 text-[#64748B]">
              No matching prayers found.
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function PrayerResourceDetailSheet({
  fallbackUrl,
  message,
  onClose,
  onPrayNow,
  onSaveToFollowUp,
  onSendLink,
  publicHref,
  resource,
}: {
  fallbackUrl: string;
  message: string;
  onClose: () => void;
  onPrayNow: () => void;
  onSaveToFollowUp: () => void;
  onSendLink: () => void;
  publicHref: string;
  resource: DosPrayerResource;
}) {
  return (
    <Sheet description={resource.description} onClose={onClose} showEyebrow={false} title={resource.title}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
            {resource.category}
          </span>
          <a className="inline-flex items-center gap-1 rounded-full border border-[#DCEBFF] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]" href={publicHref} rel="noopener noreferrer" target="_blank" style={{ fontFamily: font.rajdhani }}>
            Public Link
            <ExternalLink className="h-3 w-3" aria-hidden="true" strokeWidth={1.8} />
          </a>
        </div>

        <p className="rounded-2xl border border-[#DCEBFF] bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#475569]">{dosPrayerResourceAttribution}</p>

        {message ? <p className="rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-xs font-semibold leading-5 text-[#9A3412]">{message}</p> : null}

        {fallbackUrl ? (
          <label className="block rounded-2xl border border-[#DCEBFF] bg-white p-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Public URL</span>
            <input
              className="mt-2 w-full rounded-xl border border-[#EAF2FF] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold text-[#1D4ED8]"
              readOnly
              value={fallbackUrl}
            />
          </label>
        ) : null}

        <section className="rounded-[24px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563EB]" style={{ fontFamily: font.rajdhani }}>Prayer</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#0F172A]">{resource.prayerText}</p>
        </section>

        <section className="rounded-[24px] border border-[#EAF2FF] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Key Scriptures</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {resource.keyScriptures.map((scripture) => (
              <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-xs font-bold text-[#1D4ED8]" key={scripture}>{scripture}</span>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#EAF2FF] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Reflection Questions</p>
          <ol className="mt-3 grid gap-2 text-sm leading-6 text-[#0F172A]">
            {resource.reflectionQuestions.map((question, index) => (
              <li className="flex gap-2" key={question}>
                <span className="font-bold text-[#2563EB]">{index + 1}.</span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[24px] border border-[#EAF2FF] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>Follow-Up Suggestions</p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#0F172A]">
            {resource.followUpSuggestions.map((suggestion) => (
              <li className="flex gap-2" key={suggestion}>
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden="true" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-2">
          <AppButton icon="prayer" onClick={onPrayNow} tone="black">Pray Now</AppButton>
          <div className="grid grid-cols-2 gap-2">
            <AppButton icon="arrow" onClick={onSendLink} tone="white">Send Link</AppButton>
            <AppButton icon="bell" onClick={onSaveToFollowUp} tone="white">Save to Follow-Up</AppButton>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function ResourcePickerSheet({
  message,
  onClose,
  onSelectResource,
}: {
  message: string;
  onClose: () => void;
  onSelectResource: (resource: DosResource) => void;
}) {
  const groupedResources = dosSendableResourceCategories
    .map((category) => ({
      category,
      resources: dosSendableResourceItems.filter((resource) => resource.category === category),
    }))
    .filter((group) => group.resources.length);

  return (
    <Sheet description="Choose a resource from the DOS Library. Sending can be wired to text or email later; for now DOS prepares the share link." onClose={onClose} showEyebrow={false} title="Send Resource">
      <div className="max-h-[68dvh] overflow-y-auto pr-1 [scrollbar-width:none]">
        <div className="space-y-5">
          {message ? (
            <p className="rounded-2xl border border-[#BFDBFE] bg-[#EBF2FF] px-3 py-2 text-xs font-bold leading-5 text-[#1D4ED8]">
              {message}
            </p>
          ) : null}

          {groupedResources.map(({ category, resources }) => (
            <LibrarySection key={category} title={category}>
              <article className="overflow-hidden rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
                <div className="divide-y divide-[#EBF2FF]">
                  {resources.map((resource) => (
                    <CatalogResourceRow
                      actionLabel="Ready"
                      key={resource.id}
                      onClick={() => onSelectResource(resource)}
                      resource={resource}
                    />
                  ))}
                </div>
              </article>
            </LibrarySection>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function PersonDetailOverlay({
  calendarConnection,
  answeredPrayerByReminderId,
  circleScore,
  fruitEvents,
  fruitItems,
  index,
  isCalendarDisconnecting,
  leaderReflections,
  meetings,
  reminders,
  onBack,
  onAddReminder,
  onAddPrayerRequest,
  onDisconnectCalendar,
  onEditReminder,
  onEdit,
  onMarkPrayerAnswered,
  onOpenPrayerResources,
  onOpenMeeting,
  onLogMeeting,
  onScheduleMeeting,
  participantReviews,
  participantTestimonies,
  person,
  workspaceId,
}: {
  calendarConnection: DosAppCalendarConnection;
  answeredPrayerByReminderId: Record<string, string>;
  circleScore?: DosRelationshipScore | null;
  fruitEvents: DosAppFruitEvent[];
  fruitItems: DosAppFruit[];
  index: number;
  isCalendarDisconnecting?: boolean;
  leaderReflections: DosAppLeaderReflection[];
  meetings: DosAppMeeting[];
  reminders: DosAppRelationshipReminder[];
  onBack: () => void;
  onAddReminder: () => void;
  onAddPrayerRequest: () => void;
  onDisconnectCalendar?: () => void;
  onEditReminder: (reminderId: string) => void;
  onEdit: () => void;
  onMarkPrayerAnswered: (reminderId: string) => void;
  onOpenPrayerResources: () => void;
  onOpenMeeting: (meetingId: string) => void;
  onLogMeeting: () => void;
  onScheduleMeeting: () => void;
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  person: DosAppPerson;
  workspaceId: string;
}) {
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<PersonDetailTab>("overview");
  const [prayedPrayerReminderIds, setPrayedPrayerReminderIds] = useState<Record<string, boolean>>({});
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [selectedOutcomeEntry, setSelectedOutcomeEntry] = useState<PersonOutcomeEntry | null>(null);
  const defaults = personFormDefaults(person);
  const address = personAddressLine(defaults);
  const mapHref = address ? mapsHrefForAddress(address) : "";
  const hasHouseholdContext = hasHouseholdDetails(person);
  const relationshipScore = relationshipScoreFromEngagementLevel(person.engagementLevel);
  const engagementOverviewScore = relationshipScoreLabel(relationshipScore);
  const engagementOverviewLabel = overviewEngagementLabel(relationshipScore);
  const personMeetings = meetings.filter((meeting) => meeting.fieldPersonIds.includes(person.id));
  const personLoggedMeetings = personMeetings.filter((meeting) => meeting.meetingStatus === "logged");
  const personScheduledMeetings = personMeetings
    .filter((meeting) => meeting.meetingStatus === "scheduled" && isUpcomingDate(meeting.scheduledStartAt ?? meeting.date))
    .sort((first, second) => dateSortValue(first.scheduledStartAt ?? first.date) - dateSortValue(second.scheduledStartAt ?? second.date));
  const personReminders = reminders
    .filter((reminder) => reminder.personId === person.id)
    .sort((first, second) => dateSortValue(nextReminderDate(first)) - dateSortValue(nextReminderDate(second)));
  const personPrayerReminders = personReminders.filter((reminder) => reminder.reminderType === "prayer");
  const activePrayerReminders = personPrayerReminders.filter((reminder) => !answeredPrayerByReminderId[reminder.id]);
  const answeredPrayerReminders = personPrayerReminders
    .filter((reminder) => Boolean(answeredPrayerByReminderId[reminder.id]))
    .sort((first, second) => dateSortValue(answeredPrayerByReminderId[second.id]) - dateSortValue(answeredPrayerByReminderId[first.id]));
  const upcomingReminders = personReminders.filter((reminder) => isUpcomingDate(nextReminderDate(reminder)));
  const upcomingTimelineItems = buildUpcomingTimelineItems({
    meetings,
    people: [person],
    person,
    reminders,
  });
  const upcomingTimelineGroups = groupedUpcomingTimelineItems(upcomingTimelineItems);
  const personParticipantReviews = participantReviews.filter((review) => review.personId === person.id || personMeetings.some((meeting) => meeting.id === review.meetingId));
  const personTestimonies = participantTestimonies.filter((testimony) => testimony.personId === person.id || personMeetings.some((meeting) => meeting.id === testimony.meetingId));
  const personFruitSummary = selectPersonDetailFruitSummary({
    fruitEvents,
    fruitItems,
    leaderReflections,
    meetings: meetings.filter((meeting) => meeting.meetingStatus === "logged"),
    person,
  });
  const personFruitEvents = personFruitSummary.fruitEvents;
  const personReflections = leaderReflections.filter((reflection) => reflection.personId === person.id || personLoggedMeetings.some((meeting) => meeting.id === reflection.meetingId));
  const personOutcomeFruitEvents = personFruitEvents.filter(isObservableFruitOutcome);
  const personOutcomeTestimonies = personTestimonies.filter((testimony) => isSubmittedStatus(testimony.status) && Boolean(testimony.story?.trim() || testimony.whatChanged?.trim()));
  const personOutcomeEntries: PersonOutcomeEntry[] = [
    ...personOutcomeFruitEvents.map((event) => ({
      date: event.date,
      event,
      id: `fruit-${event.id}`,
      type: "fruit" as const,
    })),
    ...personOutcomeTestimonies.map((testimony) => ({
      date: testimony.submittedAt,
      id: `testimony-${testimony.id}`,
      testimony,
      type: "testimony" as const,
    })),
  ].sort((first, second) => (parseDisplayDate(second.date)?.getTime() ?? 0) - (parseDisplayDate(first.date)?.getTime() ?? 0));
  const latestOutcomeEntry = personOutcomeEntries[0];
  const selectedOutcomeMeeting = selectedOutcomeEntry
    ? meetings.find((meeting) => meeting.id === (selectedOutcomeEntry.type === "fruit" ? selectedOutcomeEntry.event.meetingId : selectedOutcomeEntry.testimony.meetingId)) ?? null
    : null;
  const recentMeetings = personLoggedMeetings.slice(0, 3);
  const relationshipTypePill = relationshipTypePillLabel(person);
  const spiritualJourneyPill = deriveSpiritualJourney({
    fruitEvents: personFruitEvents,
    fruitSummary: personFruitSummary,
    meetings: personLoggedMeetings,
    participantReviews: personParticipantReviews,
    participantTestimonies: personTestimonies,
    person,
    reflections: personReflections,
  });
  const lastMeetingDate = personLoggedMeetings[0]?.date ?? person.lastActivityAt;
  const currentCircleLabel = circleScore ? circleDisplayName(circleScore.circle) : "Field";
  const overviewNotes = defaults.notes?.trim() ?? "";
  const completedGuidedMeetings = personLoggedMeetings.filter((meeting) => meeting.conversationFlowKey !== "none").length;
  const relationshipSnapshotReasons = Array.from(new Set([
    personLoggedMeetings.length ? `${personLoggedMeetings.length} table${personLoggedMeetings.length === 1 ? "" : "s"} logged` : "",
    completedGuidedMeetings ? `${completedGuidedMeetings} guided conversation${completedGuidedMeetings === 1 ? "" : "s"} completed` : "",
    relationshipTypePill !== "New" ? "Active discipleship relationship" : "",
    personFruitEvents.length ? `${personFruitEvents.length} fruit event${personFruitEvents.length === 1 ? "" : "s"} recorded` : "",
  ].filter((reason): reason is string => Boolean(reason)))).slice(0, 3);
  function scrollDetailToTop() {
    requestAnimationFrame(() => {
      const scrollContainer = detailScrollRef.current;

      if (!scrollContainer) {
        return;
      }

      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    });
  }

  useEffect(() => {
    setActiveDetailTab("overview");
    setIsSnapshotOpen(false);
    setSelectedOutcomeEntry(null);
    scrollDetailToTop();
  }, [person.id]);

  return (
    <div ref={detailScrollRef} className="absolute inset-0 overflow-y-auto bg-white px-4 pb-28 pt-7 [scrollbar-width:none] md:left-[232px] md:bg-[#F8FBFF] md:px-6 md:pb-10 md:pt-6 xl:left-[260px]">
      <div className="mx-auto w-full max-w-[960px] md:rounded-[32px] md:border md:border-[#EAF2FF] md:bg-white md:p-5 md:shadow-[0_18px_48px_rgba(37,99,235,0.07)]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]" onClick={onBack} type="button" aria-label="Back to field">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-bold text-[#0F172A]" onClick={onEdit} type="button">
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
          Edit
        </button>
      </header>

      <section className="mt-5 text-center md:mt-3">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-base font-bold md:h-14 md:w-14 ${avatarTone(index)}`}>
          {initials(person.name)}
        </div>
        <h2 className="mt-3 text-[32px] font-bold leading-none tracking-tight text-[#0F172A] md:text-[28px]" style={{ fontFamily: font.oswald }}>
          {person.name}
        </h2>
      </section>

      <div className="mt-5 md:mx-auto md:max-w-md">
        <MeetingActionRow onLogMeeting={onLogMeeting} onScheduleMeeting={onScheduleMeeting} />
      </div>

      <div className="sticky top-0 z-20 -mx-4 mt-4 bg-white/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0">
        <div className="grid grid-cols-4 gap-1 rounded-full border border-[#E2E8F0] bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          {[
            { label: "Overview", value: "overview" },
            { label: "Activity", value: "activity" },
            { label: "Prayer", value: "prayer" },
            { label: "Fruit", value: "fruit" },
          ].map((tab) => (
            <button
              aria-current={activeDetailTab === tab.value ? "page" : undefined}
              className={`min-h-9 rounded-full px-2 text-[11px] font-bold transition-colors ${
                activeDetailTab === tab.value ? "bg-[#EAF2FF] text-[#1D4ED8] shadow-[0_6px_14px_rgba(37,99,235,0.10)] ring-1 ring-[#CFE0FF]" : "text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
              key={tab.value}
              onClick={() => {
                const nextTab = tab.value as typeof activeDetailTab;
                setActiveDetailTab(nextTab);
                scrollDetailToTop();
              }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3">
        {activeDetailTab === "overview" ? (
          <>
            <div className="grid min-w-0 grid-cols-3 gap-2 max-[350px]:gap-1.5">
              <SnapshotMetricTile icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Relationship" value={relationshipTypePill} />
              <EngagementSnapshotTile label={engagementOverviewLabel} score={engagementOverviewScore} />
              <SnapshotMetricTile icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Last Table" value={lastMeetingDate ? formatRelativeDate(lastMeetingDate) : "Not yet"} />
            </div>

            <section className="rounded-[24px] border border-[#D7F3DD] bg-[#F7FEFA] p-4 shadow-[0_14px_34px_rgba(22,163,74,0.055)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#15803D]" style={{ fontFamily: font.rajdhani }}>
                Details
              </p>

              <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 max-[350px]:gap-1.5">
                <DetailResultTile icon={<Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Spiritual Journey" value={spiritualJourneyPill} />
                <DetailResultTile icon={<User className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Current Circle" value={currentCircleLabel} />
              </div>

              <button
                aria-expanded={isSnapshotOpen}
                className="mt-3 flex min-h-10 w-full items-center justify-between rounded-2xl bg-white px-3 text-left text-xs font-bold text-[#0F172A] ring-1 ring-[#D7F3DD] transition-colors hover:bg-[#ECFDF3]"
                onClick={() => setIsSnapshotOpen((current) => !current)}
                type="button"
              >
                More Details
                <ChevronRight className={`h-4 w-4 text-[#16A34A] transition-transform ${isSnapshotOpen ? "rotate-90" : ""}`} aria-hidden="true" strokeWidth={1.8} />
              </button>

              {isSnapshotOpen ? (
                <div className="mt-3 grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#D7F3DD]">
                  <p className="text-xs leading-5 text-[#475569]">Spiritual Journey and Current Circle are based on the activity and fruit recorded with this person.</p>
                  <div className="grid gap-2">
                    {relationshipSnapshotReasons.length ? relationshipSnapshotReasons.map((reason) => (
                      <p className="flex items-start gap-2 text-xs leading-5 text-[#475569]" key={reason}>
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden="true" strokeWidth={1.9} />
                        <span>{reason}</span>
                      </p>
                    )) : (
                      <p className="flex items-start gap-2 text-xs leading-5 text-[#475569]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden="true" strokeWidth={1.9} />
                        <span>Log tables and discipleship activity to help DOS place this relationship.</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>

            <DetailCard icon={<Phone className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Contact Information">
              {person.phone ? (
                <ContactActionRow
                  actions={[
                    { href: phoneActionHref("tel", person.phone), label: "Call" },
                    { href: phoneActionHref("sms", person.phone), label: "Text" },
                  ]}
                  icon={<Phone className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
                  label="Phone"
                  primaryHref={phoneActionHref("tel", person.phone)}
                  value={formatPhoneNumber(person.phone) || person.phone}
                />
              ) : null}
              {person.email ? (
                <ContactActionRow
                  actions={[
                    { href: `mailto:${person.email}`, label: "Email" },
                  ]}
                  icon={<Mail className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
                  label="Email"
                  primaryHref={`mailto:${person.email}`}
                  value={person.email}
                />
              ) : null}
              {address ? (
                <DetailRow
                  ariaLabel={`Open map for ${address}`}
                  href={mapHref}
                  icon={<MapPin className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />}
                  label="Address"
                  onClick={(event) => handleAddressMapClick(event, address)}
                  value={address}
                />
              ) : null}
              {person.church ? <DetailRow icon={<Church className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Church" value={person.church} /> : null}
              {defaults.occupation ? <DetailRow icon={<Briefcase className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Occupation" value={defaults.occupation} /> : null}
              {defaults.birthday ? <DetailRow icon={<Cake className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Birthday" value={formatDate(defaults.birthday)} /> : null}
              {!person.phone && !person.email && !address && !person.church && !defaults.occupation && !defaults.birthday ? <p className="text-sm text-[#64748B]">No contact details yet.</p> : null}
            </DetailCard>

            {overviewNotes ? (
              <DetailCard icon={<StickyNote className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Notes">
                <div className="flex min-w-0 gap-3 rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-sm text-[#0F172A]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8] ring-1 ring-[#BFDBFE]">
                    <StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>Note</span>
                    <span className="mt-1 block whitespace-pre-line leading-6 text-[#0F172A]">{overviewNotes}</span>
                  </span>
                </div>
              </DetailCard>
            ) : null}

            {hasHouseholdContext ? (
              <DetailCard icon={<Users className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Household">
                {person.spouseName ? <DetailRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Spouse" value={person.spouseName} /> : null}
                {person.childrenNames ? <DetailRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Children" value={person.childrenNames} /> : null}
                {person.householdNotes ? <DetailRow icon={<StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Household Notes" value={person.householdNotes} /> : null}
                <div>
                  <CompactButton icon="bell" onClick={onAddReminder}>Add Household Reminder</CompactButton>
                </div>
              </DetailCard>
            ) : null}
          </>
        ) : null}

        {activeDetailTab === "activity" ? (
          <>
            <DetailCard icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Activity">
              <div className="grid min-w-0 grid-cols-3 gap-2 max-[350px]:gap-1.5">
                <ActivityFilterCard
                  icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Tables"
                  value={personLoggedMeetings.length}
                />
                <ActivityFilterCard
                  icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Scheduled"
                  value={personScheduledMeetings.length}
                />
                <ActivityFilterCard
                  icon={<Bell className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Reminders"
                  value={upcomingReminders.length}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <CompactButton icon="bell" onClick={onAddReminder}>Add Reminder</CompactButton>
                <CompactButton icon="calendar" onClick={onScheduleMeeting}>Schedule Table</CompactButton>
              </div>
            </DetailCard>

            <CalendarConnectionCard
              calendarConnection={calendarConnection}
              isDisconnecting={isCalendarDisconnecting}
              onDisconnect={onDisconnectCalendar}
              workspaceId={workspaceId}
            />

            <DetailCard icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Upcoming">
              {upcomingTimelineGroups.length ? upcomingTimelineGroups.map(({ group, items }) => (
                <section className="grid gap-2" key={group}>
                  <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>{group}</p>
                  {items.map((item) => (
                    <UpcomingTimelineRow
                      item={item}
                      key={item.id}
                      onEditReminder={onEditReminder}
                      onOpenMeeting={onOpenMeeting}
                    />
                  ))}
                </section>
              )) : (
                <SectionEmptyState action={<CompactButton icon="calendar" onClick={onScheduleMeeting}>Schedule Table</CompactButton>} text="Scheduled tables and reminders will appear here." title="Nothing upcoming." />
              )}
            </DetailCard>

            <DetailCard icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Recent Activity">
              {recentMeetings.length ? recentMeetings.map((meeting) => (
                <button className="flex min-w-0 items-center gap-3 rounded-[20px] border border-[#DCEBFF] bg-[#F8FAFC] p-3.5 text-left shadow-[0_8px_22px_rgba(37,99,235,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EBF2FF] active:scale-[0.99]" key={meeting.id} type="button" onClick={() => onOpenMeeting(meeting.id)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBF2FF] text-[#2563EB] ring-1 ring-[#BFDBFE]">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-5 text-[#0F172A]">{meetingActivityTitle(meeting)}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#64748B]">{formatDate(meeting.date)}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-[#0F172A]">{meeting.notes || "No summary added yet."}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
                </button>
              )) : <SectionEmptyState action={<CompactButton icon="log" onClick={onLogMeeting}>Log Table</CompactButton>} text="Log the next conversation when it happens." title="No tables yet." />}
            </DetailCard>

            <DetailCard icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Resources Sent">
              <SectionEmptyState
                text="Sent date, opened date, completed date, and scores can be tracked later."
                title="No resources sent yet."
              />
            </DetailCard>
          </>
        ) : null}

        {activeDetailTab === "prayer" ? (
          <>
            <DetailCard icon={<Heart className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Prayer Requests">
              {activePrayerReminders.length ? (
                <div className="grid gap-2.5">
                  {activePrayerReminders.map((reminder) => (
                    <PrayerRequestCard
                      key={reminder.id}
                      onMarkAnswered={() => onMarkPrayerAnswered(reminder.id)}
                      onPrayNow={() => setPrayedPrayerReminderIds((current) => ({ ...current, [reminder.id]: true }))}
                      reminder={reminder}
                    />
                  ))}
                  {activePrayerReminders.some((reminder) => prayedPrayerReminderIds[reminder.id]) ? (
                    <p className="rounded-2xl border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold leading-5 text-[#1D4ED8]">
                      Prayer noted for this session. Durable prayer logging can be wired later.
                    </p>
                  ) : null}
                </div>
              ) : (
                <SectionEmptyState
                  action={(
                    <div className="grid grid-cols-2 gap-2">
                      <CompactButton icon="prayer" onClick={onAddPrayerRequest}>Add Request</CompactButton>
                      <CompactButton icon="library" onClick={onOpenPrayerResources}>Resources</CompactButton>
                    </div>
                  )}
                  text="No active prayer requests yet. Add one from a meeting or start with a prayer resource."
                  title="No active prayer requests yet."
                />
              )}
            </DetailCard>

            <DetailCard icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Answered Prayer">
              {answeredPrayerReminders.length ? (
                <div className="grid gap-2.5">
                  {answeredPrayerReminders.map((reminder) => (
                    <AnsweredPrayerCard answeredAt={answeredPrayerByReminderId[reminder.id]} key={reminder.id} reminder={reminder} />
                  ))}
                </div>
              ) : (
                <SectionEmptyState text="Answered prayers will appear here when requests are marked answered." title="No answered prayers yet." />
              )}
            </DetailCard>

            <DetailCard icon={<BookOpen className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Prayer Resources">
              <div className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-4">
                <p className="text-sm font-black leading-5 text-[#0F172A]">Pray through a guided resource.</p>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">
                  Open a categorized prayer, share a public link, or save it to follow-up for the next meeting.
                </p>
                <div className="mt-3">
                  <CompactButton icon="library" onClick={onOpenPrayerResources}>Open Prayer Resources</CompactButton>
                </div>
              </div>
            </DetailCard>
          </>
        ) : null}

        {activeDetailTab === "fruit" ? (
          <>
            <DetailCard icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Fruit Summary">
              <div className="grid min-w-0 grid-cols-3 gap-2 max-[350px]:gap-1.5">
                <FruitSummaryCard icon={<Sparkles className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Fruit Count" value={String(personOutcomeEntries.length)} />
                <FruitSummaryCard
                  icon={<Gift className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />}
                  label="Latest Fruit"
                  value={latestOutcomeEntry ? latestOutcomeEntry.type === "testimony" ? "Testimony Shared" : fruitOutcomeLabel(latestOutcomeEntry.event) : "None Yet"}
                />
                <FruitSummaryCard icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />} label="Multiplication" value={fruitMultiplicationLabel(personFruitSummary.multiplicationStatus)} />
              </div>
            </DetailCard>

            <DetailCard icon={<Mic className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.9} />} title="Testimonies & Outcomes">
              {personOutcomeEntries.length ? personOutcomeEntries.map((entry) => (
                entry.type === "testimony"
                  ? <ParticipantTestimonyRow key={entry.id} onClick={() => setSelectedOutcomeEntry(entry)} testimony={entry.testimony} />
                  : <FruitEventRow event={entry.event} key={entry.id} onClick={() => setSelectedOutcomeEntry(entry)} />
              )) : (
                <SectionEmptyState text="Observable outcomes and shared stories will appear here." title="No outcomes yet." />
              )}
            </DetailCard>
          </>
        ) : null}

      </div>
      </div>
      {selectedOutcomeEntry ? (
        <OutcomeDetailSheet
          entry={selectedOutcomeEntry}
          meeting={selectedOutcomeMeeting}
          onClose={() => setSelectedOutcomeEntry(null)}
          person={person}
        />
      ) : null}
    </div>
  );
}

function ReviewActionButton({
  children,
  disabled,
  icon,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB] disabled:cursor-not-allowed disabled:opacity-55"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function SendableFormPreviewCard({
  eyebrow,
  form,
}: {
  eyebrow: string;
  form: SendableFormPreview;
}) {
  return (
    <section className="rounded-[22px] border border-[#DCEBFF] bg-[#F8FBFF] p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-black leading-tight text-[#0F172A]">{form.title}</h3>
      {form.intro ? (
        <p className="mt-2 text-xs leading-5 text-[#64748B]">{form.intro}</p>
      ) : null}
      <div className="mt-3 grid gap-3">
        {form.sections.map((section) => (
          <div className="rounded-2xl bg-white px-3 py-3 shadow-[0_8px_18px_rgba(37,99,235,0.035)]" key={section.label}>
            <p className="text-sm font-bold leading-5 text-[#0F172A]">
              {section.label}
              {section.required ? <span className="text-[#2563EB]"> *</span> : null}
            </p>
            {section.helper ? (
              <p className="mt-1 text-xs leading-5 text-[#64748B]">{section.helper}</p>
            ) : null}
            {section.type === "notice" ? (
              <p className="mt-2 text-xs leading-5 text-[#64748B]">{section.copy}</p>
            ) : null}
            {section.type === "field" ? (
              <div className={`mt-3 rounded-2xl border border-dashed border-[#BFDBFE] bg-[#F8FBFF] px-3 py-2 text-xs text-[#94A3B8] ${section.fieldType === "textarea" ? "min-h-20" : ""}`}>
                {section.placeholder ?? (section.fieldType === "textarea" ? "Long answer" : section.fieldType === "email" ? "Email field" : "Text field")}
              </div>
            ) : null}
            {section.type === "choice" && section.options?.length ? (
              <div className={section.choiceType === "checkbox" || section.choiceType === "radio" ? "mt-3 grid gap-2" : "mt-3 flex flex-wrap gap-2"}>
                {section.options.map((option) => (
                  section.choiceType === "checkbox" || section.choiceType === "radio" ? (
                    <span className="flex items-start gap-2 rounded-2xl border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold leading-5 text-[#475569]" key={option}>
                      <span className={`mt-0.5 h-3.5 w-3.5 shrink-0 border border-[#93C5FD] bg-white ${section.choiceType === "radio" ? "rounded-full" : "rounded-[4px]"}`} aria-hidden="true" />
                      <span>{option}</span>
                    </span>
                  ) : (
                    <span className="rounded-full border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-1.5 text-xs font-semibold text-[#475569]" key={option}>
                      {option}
                    </span>
                  )
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function MeetingSendConfirmationSheet({
  isSending,
  onClose,
  onConfirm,
  people,
  action,
}: {
  action: PendingMeetingSendAction;
  isSending: boolean;
  onClose: () => void;
  onConfirm: () => void;
  people: DosAppPerson[];
}) {
  const isTestimony = action.type === "testimony_request";
  const title = isTestimony ? "Send Testimony Request" : "Send Quick Review";
  const description = isTestimony
    ? "Invite them to share what changed from this table."
    : "Invite them to share a quick review of the table.";
  const recipientTitle = isTestimony
    ? meetingTestimonyRecipientTitle(action.meeting, people)
    : meetingParticipantTitle(action.meeting, people);
  const fallbackTitle = meetingFallbackTitle(action.meeting);
  const cannotSendTestimony = isTestimony && !recipientTitle;

  return (
    <Sheet description={description} onClose={onClose} showEyebrow={false} title={title}>
      <div className="grid gap-3">
        <div className="rounded-[22px] border border-[#DCEBFF] bg-white p-3.5 shadow-[0_10px_24px_rgba(37,99,235,0.05)]">
          {recipientTitle ? (
            <DetailRow icon={<Users className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Recipient" value={recipientTitle} />
          ) : (
            <DetailRow icon={<MessageCircle className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Table" value={fallbackTitle} />
          )}
          <DetailRow icon={<CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label={recipientTitle ? "Table" : "Date"} value={recipientTitle ? meetingMetadataLine(action.meeting) : formatDate(action.meeting.date)} />
          <DetailRow icon={<Send className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />} label="Request Type" value={isTestimony ? "Testimony Request" : "Quick Review"} />
        </div>
        <p className="rounded-2xl bg-[#F8FAFC] px-3 py-2 text-xs leading-5 text-[#64748B]">
          {cannotSendTestimony
            ? "Add a person to this table before sending a testimony request."
            : "DOS will create a share link for this request. You can use the phone share sheet or copy the link if sharing is not available."}
        </p>
        {isTestimony ? (
          <SendableFormPreviewCard eyebrow="Testimony Review" form={testimonyReviewFormPreview} />
        ) : (
          <SendableFormPreviewCard eyebrow="Quick Review" form={quickReviewFormPreview} />
        )}
        <div className="grid gap-2">
          <AppButton disabled={isSending || cannotSendTestimony} onClick={onConfirm} tone="black">
            {isSending ? "Preparing..." : isTestimony ? "Send Testimony Request" : "Send Review"}
          </AppButton>
          <AppButton disabled={isSending} onClick={onClose} tone="white">Cancel</AppButton>
        </div>
      </div>
    </Sheet>
  );
}

function MeetingNotesEditorSheet({
  defaultValue,
  errorMessage,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  defaultValue?: string | null;
  errorMessage?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const hasNotes = Boolean(defaultValue?.trim());

  return (
    <Sheet onClose={onClose} showEyebrow={false} title={hasNotes ? "Edit Notes" : "Add Notes"}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <FieldLabel>Table Notes</FieldLabel>
          <textarea
            autoFocus
            className={`${FieldTextareaClass()} min-h-40 bg-white`}
            defaultValue={defaultValue ?? ""}
            name="notes"
            placeholder="What happened at the table?"
          />
        </label>
        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
        <div className="grid gap-2">
          <AppButton disabled={isSubmitting} tone="black" type="submit">
            {isSubmitting ? "Saving..." : "Save Notes"}
          </AppButton>
          <AppButton disabled={isSubmitting} onClick={onClose} tone="white">
            Cancel
          </AppButton>
        </div>
      </form>
    </Sheet>
  );
}

function MeetingDetailOverlay({
  fruitEvents,
  hasReviewRequestLink,
  hasTestimonyRequestLink,
  isSendingReview,
  isSendingTestimony,
  leaderReflections,
  meeting,
  onBack,
  onEdit,
  onDone,
  onEditNotes,
  onPrepareQuickReview,
  onPrepareTestimonyRequest,
  onScheduleNextMeeting,
  onSendReview,
  onSendTestimony,
  participantReviews,
  participantTestimonies,
  people,
  reviewShareMessage,
  showPostMeetingFollowUp,
  testimonyShareMessage,
}: {
  fruitEvents: DosAppFruitEvent[];
  hasReviewRequestLink?: boolean;
  hasTestimonyRequestLink?: boolean;
  isSendingReview?: boolean;
  isSendingTestimony?: boolean;
  leaderReflections: DosAppLeaderReflection[];
  meeting: DosAppMeeting;
  onBack: () => void;
  onDone: () => void;
  onEdit: () => void;
  onEditNotes: () => void;
  onPrepareQuickReview: () => void;
  onPrepareTestimonyRequest: () => void;
  onScheduleNextMeeting: () => void;
  onSendReview: () => void;
  onSendTestimony: () => void;
  participantReviews: DosAppParticipantReview[];
  participantTestimonies: DosAppParticipantTestimony[];
  people: DosAppPerson[];
  reviewShareMessage?: string;
  showPostMeetingFollowUp?: boolean;
  testimonyShareMessage?: string;
}) {
  const isTableMeeting = meeting.source === "table";
  const isScheduledMeeting = meeting.meetingStatus === "scheduled";
  const isLoggedTableMeeting = isTableMeeting && !isScheduledMeeting;
  const temperature = meeting.conversationFlowKey === "kitchen_table_gospel"
    ? relationshipWithJesusTemperature(responseAsNumber(meeting.conversationResponses.relationshipWithJesus))
    : null;
  const avatarNames = meetingAvatarNames(meeting, people);
  const title = meetingDisplayTitle(meeting, people);
  const canSendTestimony = canSendMeetingTestimonyRequest(meeting, people);
  const meetingReflections = leaderReflections.filter((reflection) => reflection.meetingId === meeting.id);
  const meetingParticipantReviews = participantReviews.filter((review) => review.meetingId === meeting.id);
  const meetingTestimonies = participantTestimonies.filter((testimony) => testimony.meetingId === meeting.id);
  const meetingFruitEvents = fruitEvents.filter((event) => event.meetingId === meeting.id);
  const reviewIsCompleted = meeting.review.status === "approved" || meeting.review.status === "private" || meeting.review.status === "submitted";
  const reviewRequestSent = meeting.review.status === "pending" || Boolean(hasReviewRequestLink);
  const reviewDisplayTitle = reviewIsCompleted ? "Completed" : reviewRequestSent ? "Sent" : "Not sent";
  const reviewDisplayHelper = reviewIsCompleted
    ? meeting.review.submittedAt
      ? `Received ${formatDate(meeting.review.submittedAt)}.`
      : "Review received."
    : reviewRequestSent
      ? "Awaiting response."
      : "Send a quick review request when you are ready.";
  const storyIsCompleted = meetingTestimonies.length > 0;
  const storyRequestSent = Boolean(hasTestimonyRequestLink);
  const storyDisplayTitle = storyIsCompleted ? "Completed" : storyRequestSent ? "Sent" : "Not sent";
  const storyDisplayHelper = storyIsCompleted
    ? "Testimony received."
    : storyRequestSent
      ? "Awaiting response."
      : "Invite them to share how God worked in their life through this conversation.";

  if (showPostMeetingFollowUp && isLoggedTableMeeting) {
    return (
      <div className="absolute inset-0 z-40 overflow-y-auto bg-white px-4 pb-28 pt-7 [scrollbar-width:none]">
        <header className="flex items-center justify-between gap-3">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]" onClick={onBack} type="button" aria-label="Back to table">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
          </button>
          <span className="h-10 w-10" aria-hidden="true" />
        </header>

        <section className="mt-16 rounded-[30px] border border-[#DCEBFF] bg-white p-5 text-center shadow-[0_18px_48px_rgba(37,99,235,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D] ring-1 ring-[#BBF7D0]">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" strokeWidth={2} />
          </div>
          <h2 className="mt-4 text-[30px] font-bold leading-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
            Table Saved
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#64748B]">Table saved successfully.</p>

          <div className="mt-6 grid gap-2.5">
            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)]"
              disabled={isSendingReview}
              onClick={onPrepareQuickReview}
              type="button"
            >
              <Send className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
              Send Quick Review
            </button>
            {canSendTestimony ? (
              <button
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-4 text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB]"
                disabled={isSendingTestimony}
                onClick={onPrepareTestimonyRequest}
                type="button"
              >
                <Send className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
                Send Testimony Request
              </button>
            ) : null}
            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#BFDBFE]"
              onClick={onScheduleNextMeeting}
              type="button"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
              Schedule Next Table
            </button>
            <button
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-4 text-sm font-bold text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
              onClick={onDone}
              type="button"
            >
              Done
            </button>
          </div>
          {reviewShareMessage ? (
            <p className="mt-4 rounded-2xl border border-[#DCEBFF] bg-[#F8FBFF] px-3 py-2 text-xs font-semibold text-[#1D4ED8]">{reviewShareMessage}</p>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-white px-4 pb-28 pt-7 [scrollbar-width:none]">
      <header className="flex items-center justify-between gap-3">
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]" onClick={onBack} type="button" aria-label="Back to table">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
          {isScheduledMeeting ? "Scheduled" : "Table"}
        </p>
        {isLoggedTableMeeting ? (
          <button className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-bold text-[#0F172A]" onClick={onEdit} type="button">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />
            Edit
          </button>
        ) : <span className="h-10 w-10" aria-hidden="true" />}
      </header>

      <section className="mt-5 text-center">
        {avatarNames.length ? (
          <div className="mx-auto flex justify-center -space-x-2">
            {avatarNames.map((name, index) => (
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-white text-sm font-bold ${avatarTone(index)}`}
                key={`${meeting.id}-detail-${name}`}
              >
                {initials(name)}
              </span>
            ))}
          </div>
        ) : (
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1D4ED8]">
            <CalendarDays className="h-6 w-6" aria-hidden="true" strokeWidth={1.6} />
          </div>
        )}
        <h2 className="mx-auto mt-3 max-w-[320px] text-[32px] font-bold leading-none tracking-tight text-[#0F172A]" style={{ fontFamily: font.oswald }}>
          {title}
        </h2>
        <p className="mx-auto mt-2 max-w-[280px] text-sm leading-5 text-[#64748B]">{meetingMetadataLine(meeting)}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-3 py-1.5 text-xs font-semibold text-[#1D4ED8]">
            {isScheduledMeeting ? "Scheduled" : conversationFlowLabel(meeting.conversationFlowKey)}
          </span>
          {meeting.googleSyncEnabled ? (
            <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-1.5 text-xs font-semibold text-[#64748B]">
              {meeting.googleSyncStatus === "synced" ? "Google synced" : meeting.googleSyncStatus === "failed" ? "Google failed" : "Google pending"}
            </span>
          ) : null}
          {temperature ? (
            <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-3 py-1.5 text-xs font-semibold text-[#64748B]">
              {temperature}
            </span>
          ) : null}
        </div>
      </section>

      <div className="mt-5 grid gap-3">
        {isLoggedTableMeeting ? (
          <DetailCard title="Quick Review">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{reviewDisplayTitle}</p>
              <p className="mt-1 text-xs leading-5 text-[#64748B]">{reviewDisplayHelper}</p>
            </div>
            {meeting.review.status !== "not_sent" && meeting.review.sharePermission ? (
              <span className="mt-3 inline-flex rounded-full border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>
                {reviewSharePermissionLabel(meeting.review.sharePermission)}
              </span>
            ) : null}
            {meeting.review.stoodOut ? (
              <p className="mt-3 line-clamp-3 rounded-2xl bg-[#F1F5F9] p-3 text-sm leading-6 text-[#0F172A]">{meeting.review.stoodOut}</p>
            ) : null}
            {meeting.review.status === "not_sent" && !hasReviewRequestLink ? (
              <div className="mt-3">
                <ReviewActionButton disabled={isSendingReview} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onSendReview}>
                  Send Review
                </ReviewActionButton>
              </div>
            ) : null}
            {reviewShareMessage ? (
              <p className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#EBF2FF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{reviewShareMessage}</p>
            ) : null}
          </DetailCard>
        ) : null}

        {isLoggedTableMeeting && canSendTestimony ? (
          <DetailCard title="Testimony Request">
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">{storyDisplayTitle}</p>
              <p className="mt-1 text-xs leading-5 text-[#64748B]">{storyDisplayHelper}</p>
            </div>
            {!storyIsCompleted && !hasTestimonyRequestLink ? (
              <div className="mt-3">
              <ReviewActionButton disabled={isSendingTestimony} icon={<Send className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={1.8} />} onClick={onSendTestimony}>
                Send Testimony Request
              </ReviewActionButton>
            </div>
            ) : null}
            {testimonyShareMessage ? (
              <p className="mt-3 rounded-2xl border border-[#E2E8F0] bg-[#EBF2FF] px-3 py-2 text-center text-xs font-semibold text-[#1D4ED8]">{testimonyShareMessage}</p>
            ) : null}
          </DetailCard>
        ) : null}

        <DetailCard title={isScheduledMeeting ? "Prep Notes" : "Table Notes"}>
          {meeting.notes ? (
            <div className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-sm leading-6 text-[#0F172A]">
              {meeting.notes}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#F8FAFC] px-3 py-2 text-sm leading-6 text-[#64748B]">{isScheduledMeeting ? "No prep notes were added." : "No table notes were added."}</p>
          )}
          {isTableMeeting ? (
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-4 text-sm font-bold text-[#1D4ED8] transition-colors hover:border-[#2563EB]"
              onClick={onEditNotes}
              type="button"
            >
              <StickyNote className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
              {meeting.notes ? "Edit Notes" : "Add Notes"}
            </button>
          ) : null}
        </DetailCard>

        {!isScheduledMeeting ? <ConversationFlowDetail meeting={meeting} /> : null}

        {meetingReflections.length ? (
        <DetailCard title="Leader Reflections">
          {meetingReflections.length ? meetingReflections.map((reflection) => (
            <LeaderReflectionRow key={reflection.id} reflection={reflection} />
          )) : null}
        </DetailCard>
        ) : null}

        {meetingParticipantReviews.length ? (
        <DetailCard title="Reviews">
          {meetingParticipantReviews.length ? meetingParticipantReviews.map((review) => (
            <ParticipantReviewRow key={review.id} review={review} />
          )) : null}
        </DetailCard>
        ) : null}

        {meetingTestimonies.length ? (
        <DetailCard title="Testimonies">
          {meetingTestimonies.length ? meetingTestimonies.map((testimony) => (
            <ParticipantTestimonyRow key={testimony.id} testimony={testimony} />
          )) : null}
        </DetailCard>
        ) : null}

        {meetingFruitEvents.length ? (
        <DetailCard title="Fruit Feed">
          {meetingFruitEvents.length ? meetingFruitEvents.map((event) => (
            <FruitEventRow event={event} key={event.id} />
          )) : null}
        </DetailCard>
        ) : null}

        {meeting.recommendedResources.length ? (
          <DetailCard title="Recommended Resources">
            {/* TODO: Add SMS/email/share actions for queued resources after DOS messaging workflows exist. */}
            {meeting.recommendedResources.map((resource) => (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F1F5F9] p-3" key={resource.id}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0F172A]">{resource.title}</p>
                  {resource.reason ? <p className="mt-1 text-xs text-[#64748B]">{resource.reason}</p> : null}
                </div>
                <span className="shrink-0 rounded-full border border-[#BFDBFE] bg-[#EBF2FF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1D4ED8]" style={{ fontFamily: font.rajdhani }}>
                  Queued
                </span>
              </div>
            ))}
          </DetailCard>
        ) : null}
      </div>
    </div>
  );
}

export function DosMvpAppClient({ data }: { data: DosAppData }) {
  const router = useRouter();
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const appScrollRef = useRef<HTMLDivElement | null>(null);
  const isPreview = data.workspace.isPreview === true;
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [moreAppView, setMoreAppView] = useState<MoreAppView | null>(null);
  const [meetingsView, setMeetingsView] = useState<MeetingsView>("upcoming");
  const [meetingCalendarFilter, setMeetingCalendarFilter] = useState<MeetingCalendarFilter>("all");
  const [fruitView, setFruitView] = useState<FruitView>("activity");
  const [prayerWorkspaceTab, setPrayerWorkspaceTab] = useState<PrayerWorkspaceTab>("partners");
  const [meetingsCalendarMonth, setMeetingsCalendarMonth] = useState(() => startOfCalendarMonth(new Date()));
  const [selectedMeetingsCalendarDate, setSelectedMeetingsCalendarDate] = useState(() => calendarDateKey(new Date()));
  const [errorMessage, setErrorMessage] = useState("");
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [isMobileActionSheetOpen, setIsMobileActionSheetOpen] = useState(false);
  const [isActivitySheetOpen, setIsActivitySheetOpen] = useState(false);
  const [isUpcomingSheetOpen, setIsUpcomingSheetOpen] = useState(false);
  const [isPrayerResourceLibraryOpen, setIsPrayerResourceLibraryOpen] = useState(false);
  const [isResourcePickerOpen, setIsResourcePickerOpen] = useState(false);
  const [resourcePickerMessage, setResourcePickerMessage] = useState("");
  const [selectedPrayerResourceSlug, setSelectedPrayerResourceSlug] = useState<string | null>(null);
  const [prayerResourceCategory, setPrayerResourceCategory] = useState<DosPrayerResourceCategory>("Identity & Freedom");
  const [prayerResourceSearchQuery, setPrayerResourceSearchQuery] = useState("");
  const [prayerResourceMessage, setPrayerResourceMessage] = useState("");
  const [prayerResourceFallbackUrl, setPrayerResourceFallbackUrl] = useState("");
  const [, setSavedPrayerResourceKeys] = useState<string[]>([]);
  const [answeredPrayerByReminderId, setAnsweredPrayerByReminderId] = useState<Record<string, string>>({});
  const [circleSheetView, setCircleSheetView] = useState<CircleFocusView | null>(null);
  const [isCirclesOpen, setIsCirclesOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAdditionalPersonInfoOpen, setIsAdditionalPersonInfoOpen] = useState(false);
  const [isCreatingMeetingPerson, setIsCreatingMeetingPerson] = useState(false);
  const [isPeopleImportOpen, setIsPeopleImportOpen] = useState(false);
  const [isPeopleSearchOpen, setIsPeopleSearchOpen] = useState(false);
  const [isUsamApplicationOpen, setIsUsamApplicationOpen] = useState(false);
  const [isAddingExternalEventToDos, setIsAddingExternalEventToDos] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCalendarDisconnecting, setIsCalendarDisconnecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingGoogleCalendar, setIsSyncingGoogleCalendar] = useState(false);
  const [isSubmittingUsamApplication, setIsSubmittingUsamApplication] = useState(false);
  const [calendarSyncMessage, setCalendarSyncMessage] = useState("");
  const [usamApplicationMessage, setUsamApplicationMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [usamApplication, setUsamApplication] = useState(data.usamApplication);
  const [usamApplicationDraft, setUsamApplicationDraft] = useState<UsamApplicationDraft>(() => defaultUsamApplicationDraft(data));
  const [conversationResponses, setConversationResponses] = useState<DosConversationResponses>({});
  const [meetingPeopleQuery, setMeetingPeopleQuery] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [isAppsSearchOpen, setIsAppsSearchOpen] = useState(false);
  const [isTableSearchOpen, setIsTableSearchOpen] = useState(false);
  const [peopleCircleView, setPeopleCircleView] = useState<PeopleCircleView>("three");
  const [peopleImportMessage, setPeopleImportMessage] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [meetingNotesOverrides, setMeetingNotesOverrides] = useState<Record<string, string | null>>({});
  const [pendingMeetingSendAction, setPendingMeetingSendAction] = useState<PendingMeetingSendAction | null>(null);
  const [reviewLinksByMeetingId, setReviewLinksByMeetingId] = useState<Record<string, string>>({});
  const [reviewLinkMeetingId, setReviewLinkMeetingId] = useState<string | null>(null);
  const [reviewShareMessage, setReviewShareMessage] = useState("");
  const [postMeetingFollowUpId, setPostMeetingFollowUpId] = useState<string | null>(null);
  const [testimonyLinksByMeetingId, setTestimonyLinksByMeetingId] = useState<Record<string, string>>({});
  const [testimonyLinkMeetingId, setTestimonyLinkMeetingId] = useState<string | null>(null);
  const [testimonyShareMessage, setTestimonyShareMessage] = useState("");
  const [selectedConversationFlow, setSelectedConversationFlow] = useState<DosConversationFlowKey>("none");
  const [selectedExternalCalendarEventId, setSelectedExternalCalendarEventId] = useState<string | null>(null);
  const [selectedFruitActivity, setSelectedFruitActivity] = useState<FruitDashboardStory | null>(null);
  const [selectedFruitFormPreviewKey, setSelectedFruitFormPreviewKey] = useState<Extract<FruitFormKey, "quick_review" | "testimony_review"> | null>(null);
  const [fruitFormsNotice, setFruitFormsNotice] = useState("");
  const [selectedMeetingContext, setSelectedMeetingContext] = useState<DosAppMeetingType>("kitchen_table");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedMeetingPersonIds, setSelectedMeetingPersonIds] = useState<string[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(null);
  const [selectedRelationshipModel, setSelectedRelationshipModel] = useState<DosRelationshipModel>(defaultRelationshipModel);
  const [selectedRelationshipScore, setSelectedRelationshipScore] = useState<RelationshipScoreValue>(0);
  const [selectedOutcomeTags, setSelectedOutcomeTags] = useState<string[]>([]);
  const [selectedScripture, setSelectedScripture] = useState<ScriptureQuickViewState | null>(null);
  const [newReminderType, setNewReminderType] = useState<DosAppRelationshipReminder["reminderType"]>("follow_up");
  const visibleFruit = useMemo(() => data.fruit.filter((fruit) => fruit.status !== "archived"), [data.fruit]);
  const [quickAddedPeople, setQuickAddedPeople] = useState<DosAppPerson[]>([]);
  const loggedMeetings = useMemo(() => data.meetings.filter((meeting) => meeting.meetingStatus === "logged"), [data.meetings]);
  const people = useMemo(() => {
    const loadedPersonIds = new Set(data.people.map((person) => person.id));

    return [
      ...data.people,
      ...quickAddedPeople.filter((person) => !loadedPersonIds.has(person.id)),
    ];
  }, [data.people, quickAddedPeople]);
  const fruitStoryEntries = useMemo(() => fieldFruitStories({
    answeredPrayerByReminderId,
    fruitEvents: data.fruitEvents,
    fruitItems: data.fruit,
    leaderReflections: data.leaderReflections,
    participantReviews: data.participantReviews,
    participantTestimonies: data.participantTestimonies,
    people,
    prayerLogs: data.prayerLogs,
    relationshipReminders: data.reminders,
  }), [answeredPrayerByReminderId, data.fruit, data.fruitEvents, data.leaderReflections, data.participantReviews, data.participantTestimonies, data.prayerLogs, data.reminders, people]);
  const visibleFruitStories = useMemo(() => fruitStoryEntries.filter((story) => !isQaFruitStory(story)), [fruitStoryEntries]);
  const fruitImpactOutcomeGroups = useMemo(() => fruitImpactGroups(visibleFruitStories), [visibleFruitStories]);
  const fruitSnapshotMetrics = useMemo(() => fruitImpactSnapshotMetrics(visibleFruitStories), [visibleFruitStories]);
  const latestMeeting = loggedMeetings[0];
  const latestLoggedTableMeeting = useMemo(() => (
    loggedMeetings.find((meeting) => meeting.source === "table") ?? null
  ), [loggedMeetings]);
  const latestTestimonyReviewMeeting = useMemo(() => (
    loggedMeetings.find((meeting) => meeting.source === "table" && canSendMeetingTestimonyRequest(meeting, people)) ?? null
  ), [loggedMeetings, people]);
  const latestFruitActivity = useMemo(() => {
    const fruitItems = [
      ...visibleFruit.map((fruit) => ({
        date: fruit.testimonyDate,
        label: `${fruit.summary || "Fruit recorded"} · ${formatDate(fruit.testimonyDate)}`,
      })),
      ...data.fruitEvents.map((event) => ({
        date: event.date,
        label: `${event.title || event.fruitType || "Fruit recorded"} · ${formatDate(event.date)}`,
      })),
    ];

    return fruitItems.sort((first, second) => {
      const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
      const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

      return secondTime - firstTime;
    })[0] ?? null;
  }, [data.fruitEvents, visibleFruit]);
  const scoreByPersonId = useMemo(() => {
    const scores = data.circles ? [...data.circles.my3, ...data.circles.my12, ...data.circles.my70, ...data.circles.my120, ...data.circles.field] : [];

    return new Map(scores.map((score) => [score.person.id, score]));
  }, [data.circles]);
  const meetingPeopleOptions = useMemo(() => filteredPeople(people, meetingPeopleQuery), [people, meetingPeopleQuery]);
  const draftRecommendedResources = useMemo(() => (
    buildMeetingRecommendations(selectedConversationFlow, conversationResponses)
  ), [conversationResponses, selectedConversationFlow]);
  const featuredTableTeaching = dosTableTeachingResources[0];
  const secondaryTableTeachings = dosTableTeachingResources.slice(1);
  const selectedMeeting = useMemo(() => {
    const meeting = data.meetings.find((item) => item.id === selectedMeetingId) ?? null;

    if (!meeting || !Object.prototype.hasOwnProperty.call(meetingNotesOverrides, meeting.id)) {
      return meeting;
    }

    return {
      ...meeting,
      notes: meetingNotesOverrides[meeting.id],
    };
  }, [data.meetings, meetingNotesOverrides, selectedMeetingId]);
  const selectedMeetingWithReview = useMemo(() => {
    if (!selectedMeeting) {
      return null;
    }

    const token = reviewLinksByMeetingId[selectedMeeting.id];

    if (!token || selectedMeeting.review.status !== "not_sent") {
      return selectedMeeting;
    }

    return {
      ...selectedMeeting,
      review: {
        ...selectedMeeting.review,
        status: "pending" as const,
        token,
      },
    };
  }, [reviewLinksByMeetingId, selectedMeeting]);
  const selectedPerson = useMemo(() => people.find((person) => person.id === selectedPersonId) ?? null, [people, selectedPersonId]);
  const selectedPrayerResource = useMemo(() => (
    selectedPrayerResourceSlug ? getDosPrayerResourceBySlug(selectedPrayerResourceSlug) : null
  ), [selectedPrayerResourceSlug]);
  const selectedReminder = useMemo(() => data.reminders.find((reminder) => reminder.id === selectedReminderId) ?? null, [data.reminders, selectedReminderId]);
  const selectedExternalCalendarEvent = useMemo(() => (
    data.externalCalendarEvents.find((event) => event.id === selectedExternalCalendarEventId) ?? null
  ), [data.externalCalendarEvents, selectedExternalCalendarEventId]);
  const circlePeopleByLayer = useMemo<CircleLayerGroups>(() => {
    const peopleById = new Map(people.map((person) => [person.id, person]));
    const mapScores = (scores: DosRelationshipScore[]) => uniqueCircleMembers(scores
      .map((score) => ({ person: peopleById.get(score.person.id), score }))
      .filter((item): item is CirclePersonItem => Boolean(item.person)));

    return {
      my120: mapScores(data.circles?.my120 ?? []),
      seventy: mapScores(data.circles?.my70 ?? []),
      three: mapScores(data.circles?.my3 ?? []),
      twelve: mapScores(data.circles?.my12 ?? []),
    };
  }, [data.circles, people]);
  const peopleCircleContent = useMemo(() => peopleCircleDetails(peopleCircleView, circlePeopleByLayer), [circlePeopleByLayer, peopleCircleView]);
  const visibleCirclePeople = useMemo(() => filterCircleItems(peopleCircleContent.items, peopleQuery), [peopleCircleContent.items, peopleQuery]);
  const latestMeetingDateByPersonId = useMemo(() => {
    const latestDates = new Map<string, string | null>();

    loggedMeetings.forEach((meeting) => {
      if (!meeting.date) {
        return;
      }

      const meetingTime = new Date(meeting.date).getTime();

      meeting.fieldPersonIds.forEach((personId) => {
        const currentDate = latestDates.get(personId);
        const currentTime = currentDate ? new Date(currentDate).getTime() : Number.NEGATIVE_INFINITY;

        if (!currentDate || meetingTime > currentTime) {
          latestDates.set(personId, meeting.date);
        }
      });
    });

    return latestDates;
  }, [loggedMeetings]);
  const personTableStatsByPersonId = useMemo(() => {
    const stats = new Map<string, PersonTableStats>();

    data.meetings.forEach((meeting) => {
      meeting.fieldPersonIds.forEach((personId) => {
        const current = stats.get(personId) ?? { meetings: 0, timeMinutes: 0 };

        stats.set(personId, {
          meetings: current.meetings + (meeting.meetingStatus === "logged" ? 1 : 0),
          timeMinutes: current.timeMinutes + tableDurationMinutes(meeting),
        });
      });
    });

    return stats;
  }, [data.meetings]);
  const storyCountByPersonId = useMemo(() => {
    const counts = new Map<string, number>();

    people.forEach((person) => counts.set(person.id, 0));

    visibleFruitStories.forEach((story) => {
      if (!story.personId) {
        return;
      }

      counts.set(story.personId, (counts.get(story.personId) ?? 0) + 1);
    });

    return counts;
  }, [people, visibleFruitStories]);
  const storyCountByMeetingId = useMemo(() => {
    const counts = new Map<string, number>();
    const addStory = (meetingId: string | null | undefined) => {
      if (!meetingId) {
        return;
      }

      counts.set(meetingId, (counts.get(meetingId) ?? 0) + 1);
    };

    data.leaderReflections
      .filter((reflection) => Boolean(reflection.observedFruit.length || reflection.whatHappened?.trim() || reflection.prayerNeeds?.trim()))
      .forEach((reflection) => addStory(reflection.meetingId));
    data.participantReviews
      .filter((review) => isSubmittedStatus(review.status))
      .forEach((review) => addStory(review.meetingId));
    data.participantTestimonies
      .filter((testimony) => isSubmittedStatus(testimony.status))
      .forEach((testimony) => addStory(testimony.meetingId));
    data.fruitEvents.forEach((event) => addStory(event.meetingId));

    return counts;
  }, [data.fruitEvents, data.leaderReflections, data.participantReviews, data.participantTestimonies]);
  const latestPrayerActivity = useMemo(() => {
    const prayerMeetings = loggedMeetings
      .filter(isPrayerMeeting)
      .map((meeting) => ({
        date: meeting.date,
        label: `${meetingDisplayTitle(meeting, people)} · ${formatRelativeDate(meeting.date)}`,
        meetingId: meeting.id,
      }));
    const prayerReflections = data.leaderReflections
      .filter((reflection) => Boolean(normalizeText(reflection.prayerNeeds)))
      .map((reflection) => {
        const meeting = loggedMeetings.find((item) => item.id === reflection.meetingId) ?? null;

        return {
          date: reflection.createdAt,
          label: meeting ? `${meetingDisplayTitle(meeting, people)} · ${formatRelativeDate(reflection.createdAt)}` : `Prayer note · ${formatRelativeDate(reflection.createdAt)}`,
          meetingId: reflection.meetingId,
        };
      });

    return [...prayerMeetings, ...prayerReflections].sort((first, second) => {
      const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
      const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

      return secondTime - firstTime;
    })[0] ?? null;
  }, [data.leaderReflections, loggedMeetings, people]);
  const homeActivityItems = useMemo<HomeActivityItem[]>(() => {
    const meetingItems: HomeActivityItem[] = loggedMeetings.map((meeting) => ({
      date: meeting.date,
      icon: "log",
      id: `meeting-${meeting.id}`,
      label: `${meetingDisplayTitle(meeting, people)} · ${meetingActivityTitle(meeting)} · ${formatRelativeDate(meeting.date)}`,
      meetingId: meeting.id,
      target: "meeting",
      title: "Table",
    }));
    const prayerItems: HomeActivityItem[] = data.leaderReflections
      .filter((reflection) => Boolean(normalizeText(reflection.prayerNeeds)))
      .map((reflection) => {
        const meeting = loggedMeetings.find((item) => item.id === reflection.meetingId) ?? null;

        return {
          date: reflection.createdAt,
          icon: "bell",
          id: `prayer-${reflection.id}`,
          label: meeting ? `${meetingDisplayTitle(meeting, people)} · ${formatRelativeDate(reflection.createdAt)}` : `Prayer note · ${formatRelativeDate(reflection.createdAt)}`,
          meetingId: reflection.meetingId,
          target: "meeting",
          title: "Prayer",
        };
      });
    const fruitItems: HomeActivityItem[] = [
      ...visibleFruit.map((fruit) => ({
        date: fruit.testimonyDate,
        icon: "fruit" as const,
        id: `fruit-${fruit.id}`,
        label: `${fruit.summary || "Fruit recorded"} · ${formatDate(fruit.testimonyDate)}`,
        target: "fruit" as const,
        title: "Fruit",
      })),
      ...data.fruitEvents.map((event) => ({
        date: event.date,
        icon: "fruit" as const,
        id: `fruit-event-${event.id}`,
        label: `${event.title || event.fruitType || "Fruit recorded"} · ${formatDate(event.date)}`,
        target: "fruit" as const,
        title: "Fruit",
      })),
    ];

    return [...meetingItems, ...prayerItems, ...fruitItems].sort((first, second) => {
      const firstTime = parseDisplayDate(first.date)?.getTime() ?? 0;
      const secondTime = parseDisplayDate(second.date)?.getTime() ?? 0;

      return secondTime - firstTime;
    });
  }, [data.fruitEvents, data.leaderReflections, loggedMeetings, people, visibleFruit]);
  const upcomingTimelineItems = useMemo(() => (
    buildUpcomingTimelineItems({
      meetings: data.meetings,
      people,
      reminders: data.reminders,
    })
  ), [data.meetings, data.reminders, people]);
  const nextStepItems = useMemo(() => (
    upcomingTimelineItems.slice(0, 5)
  ), [upcomingTimelineItems]);
  const upcomingTableMeetings = useMemo(() => (
    data.meetings
      .filter((meeting) => meeting.meetingStatus === "scheduled")
      .filter((meeting) => isUpcomingDate(meeting.scheduledStartAt ?? meeting.date))
      .sort((first, second) => dateSortValue(first.scheduledStartAt ?? first.date) - dateSortValue(second.scheduledStartAt ?? second.date))
  ), [data.meetings]);
  const tableHistoryMeetings = useMemo(() => (
    data.meetings
      .filter((meeting) => meeting.meetingStatus !== "scheduled" || !isUpcomingDate(meeting.scheduledStartAt ?? meeting.date))
      .sort((first, second) => dateSortValue(second.scheduledStartAt ?? second.date) - dateSortValue(first.scheduledStartAt ?? first.date))
  ), [data.meetings]);
  const upcomingScheduledMeetings = useMemo(() => (
    upcomingTableMeetings
      .slice(0, 4)
  ), [upcomingTableMeetings]);
  const meetingCalendarItems = useMemo(() => (
    buildMeetingCalendarItems({
      externalCalendarEvents: data.externalCalendarEvents,
      meetings: data.meetings,
      month: meetingsCalendarMonth,
      people,
      reminders: data.reminders,
    })
  ), [data.externalCalendarEvents, data.meetings, data.reminders, meetingsCalendarMonth, people]);
  const visibleUpcomingTableMeetings = useMemo(() => filteredTables(upcomingTableMeetings, people, tableQuery), [people, tableQuery, upcomingTableMeetings]);
  const visibleHistoryTableMeetings = useMemo(() => filteredTables(tableHistoryMeetings, people, tableQuery), [people, tableHistoryMeetings, tableQuery]);
  const visibleMeetingCalendarItems = useMemo(() => filteredCalendarItems(meetingCalendarItems, tableQuery), [meetingCalendarItems, tableQuery]);
  const tableResultCount = meetingsView === "availability"
    ? data.externalCalendarEvents.length
    : meetingsView === "calendar"
      ? visibleMeetingCalendarItems.length
      : meetingsView === "history"
        ? visibleHistoryTableMeetings.length
        : visibleUpcomingTableMeetings.length;
  const thisWeekStats = useMemo(() => {
    const { end, start } = currentWeekRange();
    const meetingsThisWeek = loggedMeetings.filter((meeting) => isDateWithinRange(meeting.date, start, end));
    const prayerLogsThisWeek = (data.prayerLogs ?? []).filter((log: DosAppPrayerLog) => isDateWithinRange(log.prayedAt, start, end));

    return {
      label: formatWeekRangeCompact(start, end),
      meetings: meetingsThisWeek.length,
      newPeople: people.filter((person) => isDateWithinRange(person.createdAt, start, end)).length,
      prayed: prayerLogsThisWeek.length,
    };
  }, [data.prayerLogs, loggedMeetings, people]);
  const greetingName = cleanIdentitySegment(data.workspace.greetingName) ?? firstNameFromDisplayName(data.workspace.displayName);
  const [homeSubtitle, setHomeSubtitle] = useState(() => homeDateSubtitle());
  const profileName = workspaceProfileName(data.workspace, greetingName);
  const profileEmail = workspaceProfileEmail(data.workspace);
  const profilePhone = workspaceProfilePhone(data.workspace);
  const workspaceName = workspaceIdentityName(data.workspace);
  const workspaceSublabel = workspaceIdentitySublabel(data.workspace);
  const selectedPersonDefaults = personFormDefaults(selectedPerson);
  const isUsamApplicationPending = usamApplication.status === "application_submitted" || usamApplication.status === "pending_review";

  function scrollAppToTop() {
    requestAnimationFrame(() => {
      const scrollContainer = appScrollRef.current;

      if (!scrollContainer) {
        return;
      }

      scrollContainer.scrollTop = 0;
      scrollContainer.scrollLeft = 0;
    });
  }

  function selectMeetingsCalendarDate(date: Date) {
    setSelectedMeetingsCalendarDate(calendarDateKey(date));

    if (!isSameCalendarMonth(date, meetingsCalendarMonth)) {
      setMeetingsCalendarMonth(startOfCalendarMonth(date));
    }
  }

  function changeMeetingsCalendarMonth(offset: number) {
    const nextMonth = addCalendarMonths(meetingsCalendarMonth, offset);
    const selectedDate = dateFromCalendarKey(selectedMeetingsCalendarDate);
    const selectedDay = Math.min(selectedDate.getDate(), daysInCalendarMonth(nextMonth));

    setMeetingsCalendarMonth(nextMonth);
    setSelectedMeetingsCalendarDate(calendarDateKey(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), selectedDay)));
  }

  function jumpMeetingsCalendarToToday() {
    const today = new Date();

    setMeetingsCalendarMonth(startOfCalendarMonth(today));
    setSelectedMeetingsCalendarDate(calendarDateKey(today));
  }

  function openScriptureQuickView(scripture: ScriptureReference, event: MouseEvent<HTMLButtonElement>) {
    const shell = appShellRef.current;
    const shellRect = shell?.getBoundingClientRect();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const shellHeight = shell?.clientHeight ?? window.innerHeight;
    const rawTop = shellRect ? triggerRect.bottom - shellRect.top + 8 : triggerRect.bottom + 8;
    const maxTop = Math.max(82, shellHeight - 250);

    setSelectedScripture({
      scripture,
      top: Math.min(Math.max(rawTop, 82), maxTop),
    });
  }

  useEffect(() => {
    const updateHomeTime = () => {
      const now = new Date();

      setHomeSubtitle(homeDateSubtitle(now));
    };

    updateHomeTime();
    const interval = window.setInterval(updateHomeTime, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);


  useEffect(() => {
    setIsMobileActionSheetOpen(false);
  }, [activeTab, formMode, isActivitySheetOpen, isAppsSearchOpen, isPrayerResourceLibraryOpen, isResourcePickerOpen, isTableSearchOpen, isUpcomingSheetOpen, moreAppView, selectedExternalCalendarEventId, selectedMeetingId, selectedPersonId, selectedPrayerResourceSlug, selectedReminderId]);

  function resetMeetingDraft(personIds: string[] = []) {
    setConversationResponses({});
    setMeetingPeopleQuery("");
    setSelectedConversationFlow("none");
    setSelectedMeetingContext("kitchen_table");
    setSelectedMeetingPersonIds(personIds);
    setSelectedOutcomeTags([]);
  }

  function closeForm() {
    setErrorMessage("");
    setFormMode(null);
    setIsAdditionalPersonInfoOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setPendingMeetingSendAction(null);
    setSelectedReminderId(null);
    setNewReminderType("follow_up");
    setSelectedRelationshipModel(defaultRelationshipModel);
    setSelectedRelationshipScore(0);
    setIsUsamApplicationOpen(false);
    resetMeetingDraft();
  }

  function openForm(mode: Exclude<FormMode, null>) {
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setFormMode(mode);
    setIsAdditionalPersonInfoOpen(false);
    if (mode === "meeting") {
      setSelectedMeetingId(null);
      resetMeetingDraft();
    }
    if (mode === "person") {
      setSelectedRelationshipModel(defaultRelationshipModel);
      setSelectedRelationshipScore(0);
    }
  }

  function handleConversationFlowChange(flowKey: DosConversationFlowKey) {
    setSelectedConversationFlow(flowKey);
    setConversationResponses({});
  }

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    setMoreAppView(null);
    setIsAppsSearchOpen(false);
    setIsTableSearchOpen(false);
    setIsActivitySheetOpen(false);
    setIsUpcomingSheetOpen(false);
    setAppSearchQuery("");
    scrollAppToTop();
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setPendingMeetingSendAction(null);
    setSelectedMeetingId(null);
    setSelectedReminderId(null);
    setSelectedPersonId(null);
    setPostMeetingFollowUpId(null);
    setPeopleImportMessage(null);
    setIsUsamApplicationOpen(false);
  }

  function openMoreApp(view: MoreAppView) {
    setActiveTab("more");
    setMoreAppView(view);
    setIsAppsSearchOpen(false);
    setIsTableSearchOpen(false);
    setIsActivitySheetOpen(false);
    setIsUpcomingSheetOpen(false);
    setAppSearchQuery("");
    scrollAppToTop();
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedMeetingId(null);
    setSelectedReminderId(null);
    setSelectedPersonId(null);
    setPostMeetingFollowUpId(null);
    setIsUsamApplicationOpen(false);
  }

  function viewUsamApplicationStatus() {
    openMoreApp("missionary_profile");
    setUsamApplicationMessage({
      text: "Application submitted. Pending review.",
      tone: "success",
    });
  }

  function openPeopleCircle(circle: PeopleCircleView = "three") {
    setActiveTab("people");
    setMoreAppView(null);
    setIsAppsSearchOpen(false);
    setIsTableSearchOpen(false);
    setIsActivitySheetOpen(false);
    setIsUpcomingSheetOpen(false);
    setAppSearchQuery("");
    scrollAppToTop();
    setPeopleCircleView(circle);
    setPeopleQuery("");
    setIsPeopleSearchOpen(false);
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setPendingMeetingSendAction(null);
    setSelectedMeetingId(null);
    setSelectedReminderId(null);
    setSelectedPersonId(null);
    setPostMeetingFollowUpId(null);
    setPeopleImportMessage(null);
    setIsUsamApplicationOpen(false);
  }

  function openFieldSearch() {
    openPeopleCircle("three");
    setIsPeopleSearchOpen(true);
  }

  function openTableSearch() {
    selectTab("meetings");
    setIsTableSearchOpen(true);
  }

  function openAppsSearch() {
    openMoreApp("apps");
    setIsAppsSearchOpen(true);
  }

  function openUsamAppsLayer() {
    openMoreApp("organizations");
  }

  function openHomeActivityItem(item: HomeActivityItem) {
    setIsActivitySheetOpen(false);

    if (item.target === "fruit") {
      openMoreApp("fruit");
      return;
    }

    if (item.meetingId) {
      openMeetingDetail(item.meetingId);
      return;
    }

    setActiveTab("meetings");
  }

  function openUsamApplicationSheet() {
    setUsamApplicationDraft((currentDraft) => ({
      ...defaultUsamApplicationDraft(data),
      ...currentDraft,
      applicantEmail: currentDraft.applicantEmail || data.workspace.userEmail || "",
      applicantName: currentDraft.applicantName || data.workspace.displayName,
    }));
    setUsamApplicationMessage(null);
    setErrorMessage("");
    setIsUsamApplicationOpen(true);
  }

  function closeUsamApplicationSheet() {
    setIsUsamApplicationOpen(false);
    setErrorMessage("");
  }

  function updateUsamApplicationDraft(field: keyof UsamApplicationDraft, value: string) {
    setUsamApplicationDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  async function copyPublicProfileLink() {
    const href = data.workspace.publicProfileHref;
    const publicUrl = typeof window !== "undefined" ? new URL(href, window.location.origin).toString() : href;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setUsamApplicationMessage({ text: "Public profile link copied.", tone: "success" });
    } catch {
      setUsamApplicationMessage({ text: publicUrl, tone: "success" });
    }
  }

  function openPrayerResourceLibrary() {
    setPrayerResourceMessage("");
    setPrayerResourceFallbackUrl("");
    setPrayerResourceSearchQuery("");
    setSelectedPrayerResourceSlug(null);
    setIsPrayerResourceLibraryOpen(true);
  }

  function openPrayerResource(resource: DosPrayerResource) {
    setPrayerResourceMessage("");
    setPrayerResourceFallbackUrl("");
    setIsPrayerResourceLibraryOpen(false);
    setSelectedPrayerResourceSlug(resource.slug);
  }

  function prayerResourcePublicHref(resource: DosPrayerResource) {
    return `/prayer/${resource.slug}`;
  }

  function prayerResourcePublicUrl(resource: DosPrayerResource) {
    const href = prayerResourcePublicHref(resource);

    return typeof window !== "undefined" ? new URL(href, window.location.origin).toString() : href;
  }

  async function sendPrayerResourceLink(resource: DosPrayerResource) {
    const publicUrl = prayerResourcePublicUrl(resource);
    setPrayerResourceFallbackUrl(publicUrl);

    try {
      await navigator.clipboard.writeText(publicUrl);
      setPrayerResourceMessage("Prayer link copied");
      setPrayerResourceFallbackUrl("");
      window.setTimeout(() => {
        setPrayerResourceMessage((current) => current === "Prayer link copied" ? "" : current);
      }, 2400);
    } catch {
      setPrayerResourceMessage("Copy failed. Select and copy the link below.");
      setPrayerResourceFallbackUrl(publicUrl);
    }
  }

  function savePrayerResourceToFollowUp(resource: DosPrayerResource) {
    const resourceKey = `${selectedPersonId ?? "workspace"}:${resource.slug}`;

    // TODO: Persist saved prayer resources to Supabase follow-up/reminder notes when that workflow is wired.
    setSavedPrayerResourceKeys((current) => current.includes(resourceKey) ? current : [...current, resourceKey]);
    setPrayerResourceFallbackUrl("");
    setPrayerResourceMessage(selectedPerson ? "Saved to this person's follow-up notes" : "Saved to follow-up notes");
  }

  function openResourcePicker() {
    setResourcePickerMessage("");
    setIsResourcePickerOpen(true);
  }

  function resourcePublicUrl(resource: DosResource) {
    return typeof window !== "undefined" ? new URL(resource.path, window.location.origin).toString() : resource.path;
  }

  async function prepareResourceToSend(resource: DosResource) {
    const publicUrl = resourcePublicUrl(resource);

    try {
      await navigator.clipboard.writeText(publicUrl);
      setResourcePickerMessage(`Resource ready to send. Link copied: ${publicUrl}`);
    } catch {
      setResourcePickerMessage(publicUrl);
    }
  }

  function markPrayerReminderAnswered(reminderId: string) {
    setAnsweredPrayerByReminderId((current) => current[reminderId] ? current : {
      ...current,
      [reminderId]: new Date().toISOString(),
    });
  }

  function openPersonDetail(personId: string) {
    setActiveTab("people");
    setMoreAppView(null);
    scrollAppToTop();
    setErrorMessage("");
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedMeetingId(null);
    setSelectedReminderId(null);
    setPostMeetingFollowUpId(null);
    setSelectedPersonId(personId);
  }

  function openPersonEdit(person: DosAppPerson) {
    setErrorMessage("");
    setFormMode("editPerson");
    setIsAdditionalPersonInfoOpen(false);
    setSelectedRelationshipModel(relationshipModelForPerson(person));
    setSelectedRelationshipScore(relationshipScoreFromEngagementLevel(person.engagementLevel));
  }

  function openMeetingForPerson(personId: string) {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedMeetingId(null);
    setErrorMessage("");
    setFormMode("meeting");
    setIsAdditionalPersonInfoOpen(false);
    resetMeetingDraft([personId]);
  }

  function openScheduleMeeting(personId?: string | string[]) {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedMeetingId(null);
    setErrorMessage("");
    setFormMode("scheduleMeeting");
    setIsAdditionalPersonInfoOpen(false);
    resetMeetingDraft(Array.isArray(personId) ? personId : personId ? [personId] : []);
  }

  function openReminderForm(personId?: string, reminderType: DosAppRelationshipReminder["reminderType"] = "follow_up") {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedReminderId(null);
    setErrorMessage("");
    setFormMode("reminder");
    setNewReminderType(reminderType);
    setSelectedMeetingPersonIds(personId ? [personId] : []);
  }

  function openReminderEdit(reminderId: string) {
    setCircleSheetView(null);
    setIsCirclesOpen(false);
    setSelectedExternalCalendarEventId(null);
    setSelectedReminderId(reminderId);
    setErrorMessage("");
    setFormMode("reminder");
    setNewReminderType("follow_up");
  }

  function openScheduledDraftAsMeeting() {
    setErrorMessage("");
    setSelectedMeetingId(null);
    setFormMode("meeting");
  }

  function openMeetingDetail(meetingId: string) {
    setActiveTab("meetings");
    setMoreAppView(null);
    setErrorMessage("");
    setReviewLinkMeetingId(null);
    setReviewShareMessage("");
    setTestimonyLinkMeetingId(null);
    setTestimonyShareMessage("");
    setSelectedPersonId(null);
    setSelectedExternalCalendarEventId(null);
    setSelectedReminderId(null);
    setSelectedMeetingId(meetingId);
  }

  function openExternalCalendarEventDetail(eventId: string) {
    setActiveTab("meetings");
    setMoreAppView(null);
    setErrorMessage("");
    setFormMode(null);
    setSelectedMeetingId(null);
    setSelectedReminderId(null);
    setSelectedPersonId(null);
    setSelectedExternalCalendarEventId(eventId);
  }

  function openMeetingEdit(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return;
    }

    setErrorMessage("");
    setFormMode("editMeeting");
    setIsAdditionalPersonInfoOpen(false);
    setConversationResponses(meeting.conversationFlowKey !== "none" ? meeting.conversationResponses : {});
    setMeetingPeopleQuery("");
    setSelectedConversationFlow(data.workspace.isUsamWorkspace ? meeting.conversationFlowKey : "none");
    setSelectedMeetingContext(meeting.type);
    setSelectedMeetingId(meeting.id);
    setSelectedMeetingPersonIds(meeting.fieldPersonIds);
  }

  function openMeetingNotesEdit(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return;
    }

    setErrorMessage("");
    setFormMode("meetingNotes");
    setSelectedMeetingId(meeting.id);
  }

  function personPayloadFromForm(formData: FormData, relationshipModel: DosRelationshipModel, relationshipScore: RelationshipScoreValue, id?: string, fallback: PersonFormDefaults = {}) {
    const formString = (name: string, fallbackValue = "") => (
      formData.has(name)
        ? String(formData.get(name) ?? "")
        : fallbackValue
    );

    return {
      birthday: formString("birthday", fallback.birthday ?? ""),
      childrenNames: formString("children_names", fallback.childrenNames ?? ""),
      church: formString("church", fallback.church ?? ""),
      discipleshipStage: relationshipModel.discipleshipStage,
      city: formString("city", fallback.city ?? ""),
      email: formString("email", fallback.email ?? ""),
      engagementScore: relationshipScoreLabel(relationshipScore),
      homeAddress: formString("home_address", fallback.homeAddress ?? ""),
      householdNotes: formString("household_notes", fallback.householdNotes ?? ""),
      id,
      name: String(formData.get("name") ?? ""),
      notes: formString("notes", fallback.notes ?? ""),
      occupation: formString("occupation", fallback.occupation ?? ""),
      phone: String(formData.get("phone") ?? ""),
      relationshipContext: relationshipModel.relationshipContext,
      relationshipType: relationshipModel.relationshipType,
      roleInMyLife: relationshipModel.roleInMyLife,
      spouseName: formString("spouse_name", fallback.spouseName ?? ""),
      state: formString("state", fallback.state ?? ""),
      zip: formString("zip", fallback.zip ?? ""),
    };
  }

  async function submitJson(endpoint: string, payload: Record<string, unknown>, method: "DELETE" | "PATCH" | "POST" = "POST", closeAfterSave = true) {
    setErrorMessage("");

    if (isPreview) {
      setErrorMessage("Preview mode is read-only. Demo changes are not saved.");
      return null;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          ...payload,
          workspaceId: data.workspace.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method,
      });
      const result = await response.json().catch(() => ({})) as { calendarWarning?: string | null; error?: string; id?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save.");
      }

      if (closeAfterSave) {
        closeForm();
      }
      setSelectedOutcomeTags([]);
      router.refresh();

      return result;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleUsamApplicationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setUsamApplicationMessage(null);

    if (isPreview) {
      setErrorMessage("Preview mode is read-only. Applications are not submitted.");
      return;
    }

    void (async () => {
      setIsSubmittingUsamApplication(true);

      try {
        const response = await fetch("/api/dos/app/organization/usam/apply", {
          body: JSON.stringify({
            ...usamApplicationDraft,
            callingFocus: buildUsamApplicationCallingFocus(usamApplicationDraft),
            workspaceId: data.workspace.id,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const result = await response.json().catch(() => ({})) as {
          applicationId?: string;
          error?: string;
          status?: DosAppData["usamApplication"]["status"];
          submittedAt?: string;
        };

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to submit USA Missionaries application.");
        }

        setUsamApplication((currentApplication) => ({
          ...currentApplication,
          applicationId: result.applicationId ?? currentApplication.applicationId,
          appliedAt: result.submittedAt ?? new Date().toISOString(),
          profileStatus: "under_review",
          publicProfileLive: false,
          status: result.status ?? "pending_review",
        }));
        setUsamApplicationMessage({
          text: "Application submitted for review.",
          tone: "success",
        });
        setIsUsamApplicationOpen(false);
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to submit USA Missionaries application.");
      } finally {
        setIsSubmittingUsamApplication(false);
      }
    })();
  }

  function handleDisconnectCalendar() {
    setErrorMessage("");

    if (isPreview) {
      setErrorMessage("Preview mode is read-only. Google Calendar stays connected in the demo.");
      return;
    }

    if (!data.calendarConnection.connected || isCalendarDisconnecting) {
      return;
    }

    if (!window.confirm("Disconnect Google Calendar? DOS tables and reminders will keep saving locally.")) {
      return;
    }

    setIsCalendarDisconnecting(true);

    void (async () => {
      try {
        const response = await fetch("/api/dos/app/calendar/google/disconnect", {
          body: JSON.stringify({
            workspaceId: data.workspace.id,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const result = await response.json().catch(() => ({})) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to disconnect Google Calendar.");
        }

        router.refresh();
      } catch {
        setErrorMessage("Unable to disconnect Google Calendar. Please try again.");
      } finally {
        setIsCalendarDisconnecting(false);
      }
    })();
  }

  function handleSyncGoogleCalendar() {
    setErrorMessage("");
    setCalendarSyncMessage("");

    if (isPreview) {
      setCalendarSyncMessage("Preview mode does not sync live Google events.");
      return;
    }

    if (!data.calendarConnection.connected || isSyncingGoogleCalendar) {
      setCalendarSyncMessage("Connect Google Calendar to read events.");
      return;
    }

    setIsSyncingGoogleCalendar(true);

    void (async () => {
      try {
        const syncStart = addCalendarMonths(meetingsCalendarMonth, -1);
        const syncEnd = addCalendarMonths(meetingsCalendarMonth, 4);
        const response = await fetch("/api/dos/app/calendar/google/sync", {
          body: JSON.stringify({
            timeMax: syncEnd.toISOString(),
            timeMin: syncStart.toISOString(),
            workspaceId: data.workspace.id,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const result = await response.json().catch(() => ({})) as {
          error?: string;
          eventCount?: number;
          message?: string | null;
          status?: string;
        };

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to sync Google Calendar.");
        }

        if (result.status === "needs_reconnect" || result.status === "not_connected") {
          setCalendarSyncMessage(result.message ?? "Reconnect Google Calendar to read events.");
          return;
        }

        setCalendarSyncMessage(`Synced ${result.eventCount ?? 0} Google events.`);
        router.refresh();
      } catch {
        setCalendarSyncMessage("Unable to sync Google Calendar events.");
      } finally {
        setIsSyncingGoogleCalendar(false);
      }
    })();
  }

  function handleAddExternalEventToDos() {
    if (!selectedExternalCalendarEvent || isAddingExternalEventToDos) {
      return;
    }

    setErrorMessage("");

    if (isPreview) {
      setErrorMessage("Preview mode is read-only. Google events are not added to DOS.");
      return;
    }

    setIsAddingExternalEventToDos(true);

    void (async () => {
      try {
        const response = await fetch(`/api/dos/app/calendar/events/${selectedExternalCalendarEvent.id}/add-to-dos`, {
          body: JSON.stringify({
            workspaceId: data.workspace.id,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const result = await response.json().catch(() => ({})) as {
          error?: string;
          meetingId?: string;
          message?: string;
          status?: "added" | "already_added";
        };

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to add Google event to DOS.");
        }

        if (result.status === "already_added") {
          setErrorMessage(result.message ?? "Already added to DOS.");
        }

        if (result.meetingId) {
          setSelectedExternalCalendarEventId(null);
          setSelectedMeetingId(result.meetingId);
          setActiveTab("meetings");
        }

        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to add Google event to DOS.");
      } finally {
        setIsAddingExternalEventToDos(false);
      }
    })();
  }

  async function handlePeopleImport(rows: PeopleImportRow[]) {
    setPeopleImportMessage(null);

    if (isPreview) {
      throw new Error("Preview mode is read-only. Contacts are not imported.");
    }

    const response = await fetch("/api/dos/app/people/import", {
      body: JSON.stringify({
        rows,
        workspaceId: data.workspace.id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as Partial<PeopleImportResult> & { error?: string };

    if (!response.ok) {
      throw new Error(result.error ?? "Unable to import contacts.");
    }

    const importResult: PeopleImportResult = {
      duplicateCount: result.duplicateCount ?? 0,
      importedCount: result.importedCount ?? 0,
      invalidCount: result.invalidCount ?? 0,
      skippedCount: result.skippedCount ?? 0,
    };

    setPeopleImportMessage({
      text: `Imported ${importResult.importedCount}. Skipped ${importResult.skippedCount}.`,
      tone: "success",
    });
    router.refresh();

    return importResult;
  }

  async function handleCreateMeetingPerson(rawName: string) {
    const nameParts = splitNameParts(rawName);
    const name = joinNameParts(nameParts.firstName, nameParts.lastName);

    if (!name || isCreatingMeetingPerson) {
      return;
    }

    setErrorMessage("");
    setIsCreatingMeetingPerson(true);

    try {
      const createdAt = new Date().toISOString();

      if (isPreview) {
        const previewPersonId = `preview-person-${Date.now()}`;

        setQuickAddedPeople((current) => [
          ...current,
          {
            church: null,
            createdAt,
            discipleshipStage: "not_started",
            email: null,
            engagementLevel: "0",
            id: previewPersonId,
            lastActivityAt: null,
            name,
            notes: null,
            phone: "",
            relationshipContext: "other",
            relationshipType: "new",
            roleInMyLife: "not_active",
            status: "new",
            updatedAt: createdAt,
          },
        ]);
        setSelectedMeetingPersonIds((current) => current.includes(previewPersonId) ? current : [...current, previewPersonId]);
        setMeetingPeopleQuery("");
        return;
      }

      const response = await fetch("/api/dos/app/people", {
        body: JSON.stringify({
          discipleshipStage: "not_started",
          engagementScore: 0,
          name,
          phone: "",
          relationshipContext: "other",
          relationshipType: "new",
          roleInMyLife: "not_active",
          workspaceId: data.workspace.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await response.json().catch(() => ({})) as { error?: string; id?: string };

      if (!response.ok || !result.id) {
        throw new Error(result.error ?? "Unable to add person.");
      }

      setQuickAddedPeople((current) => [
        ...current,
        {
          church: null,
          createdAt,
          discipleshipStage: "not_started",
          email: null,
          engagementLevel: "0",
          id: result.id as string,
          lastActivityAt: null,
          name,
          notes: null,
          phone: "",
          relationshipContext: "other",
          relationshipType: "new",
          roleInMyLife: "not_active",
          status: "new",
          updatedAt: createdAt,
        },
      ]);
      setSelectedMeetingPersonIds((current) => current.includes(result.id as string) ? current : [...current, result.id as string]);
      setMeetingPeopleQuery("");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to add person.");
    } finally {
      setIsCreatingMeetingPerson(false);
    }
  }

  function handlePersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    void submitJson("/api/dos/app/people", {
      ...personPayloadFromForm(formData, selectedRelationshipModel, selectedRelationshipScore),
    });
  }

  function handleEditPersonSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedPerson) {
      return;
    }

    void submitJson("/api/dos/app/people", {
      ...personPayloadFromForm(formData, selectedRelationshipModel, selectedRelationshipScore, selectedPerson.id, selectedPersonDefaults),
    }, "PATCH");
  }

  function handleDeletePerson() {
    if (!selectedPerson) {
      return;
    }

    if (!window.confirm("Delete this person? This cannot be undone.")) {
      return;
    }

    void (async () => {
      const result = await submitJson("/api/dos/app/people", {
        id: selectedPerson.id,
      }, "DELETE", false);

      if (result) {
        setQuickAddedPeople((current) => current.filter((person) => person.id !== selectedPerson.id));
        setSelectedPersonId(null);
        closeForm();
      }
    })();
  }

  function handleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const conversationFlowKey = data.workspace.isUsamWorkspace ? selectedConversationFlow : "none";
    const meetingNotes = String(formData.get("notes") ?? "");
    const observedFruit = [...selectedOutcomeTags];
    const followUpNeeded = formData.get("follow_up_needed") === "on";
    const nextStep = String(formData.get("next_step") ?? "");
    const prayerNeeds = String(formData.get("prayer_needs") ?? "");
    const spiritualOpenness = String(formData.get("spiritual_openness") ?? "");
    const shouldSaveReflection = Boolean(
      meetingNotes.trim()
      || observedFruit.length
      || followUpNeeded
      || nextStep.trim()
      || prayerNeeds.trim()
      || spiritualOpenness.trim(),
    );

    void (async () => {
      const result = await submitJson("/api/dos/app/meetings", {
      conversationFlowKey,
      conversationResponses: conversationFlowKey !== "none" ? conversationResponses : {},
      fieldPersonIds: selectedMeetingPersonIds,
      notes: meetingNotes,
      tableDate: String(formData.get("table_date") ?? todayDateValue()),
      tableType: selectedMeetingContext,
      }, "POST", false);

      if (result?.id) {
        if (shouldSaveReflection) {
          const reflectionResult = await submitJson("/api/dos/app/reflections", {
            followUpNeeded,
            meetingId: result.id,
            nextStep,
            observedFruit,
            prayerNeeds,
            privateNotes: "",
            spiritualOpenness,
            whatHappened: meetingNotes,
          }, "POST", false);

          if (!reflectionResult) {
            return;
          }
        }

        closeForm();
        setActiveTab("meetings");
        setSelectedMeetingId(result.id);
        setPostMeetingFollowUpId(result.id);
      }
    })();
  }

  function handleScheduleMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const scheduledDate = String(formData.get("scheduled_date") ?? todayDateValue());
    const scheduledTime = String(formData.get("scheduled_time") ?? "");
    const scheduledStartAt = localDateTimeIso(scheduledDate, scheduledTime);

    if (!scheduledStartAt) {
      setErrorMessage("Choose a valid table date and time.");
      return;
    }

    const scheduledEndAt = new Date(new Date(scheduledStartAt).getTime() + formDurationMinutes(formData.get("duration_minutes")) * 60_000).toISOString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;

    void (async () => {
      const result = await submitJson("/api/dos/app/meetings", {
        // TODO: Later allow scheduling with a planned conversation flow; capture responses during Log Table.
        conversationFlowKey: "none",
        conversationResponses: {},
        fieldPersonIds: selectedMeetingPersonIds,
        googleSyncEnabled: formData.get("google_sync_enabled") === "on",
        meetingStatus: "scheduled",
        notes: String(formData.get("notes") ?? ""),
        scheduledEndAt,
        scheduledStartAt,
        tableDate: scheduledDate,
        tableType: selectedMeetingContext,
        timezone,
      }, "POST", false);

      if (result?.id) {
        closeForm();
        setActiveTab("meetings");
        setSelectedMeetingId(result.id);
      }
    })();
  }

  function handleEditMeetingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedMeeting || selectedMeeting.source !== "table") {
      return;
    }

    const conversationFlowKey = data.workspace.isUsamWorkspace ? selectedConversationFlow : "none";

    void submitJson("/api/dos/app/meetings", {
      conversationFlowKey,
      conversationResponses: conversationFlowKey !== "none" ? conversationResponses : {},
      fieldPersonIds: selectedMeetingPersonIds,
      id: selectedMeeting.id,
      notes: String(formData.get("notes") ?? ""),
      tableDate: String(formData.get("table_date") ?? selectedMeeting.date ?? todayDateValue()),
      tableType: selectedMeetingContext,
    }, "PATCH");
  }

  function handleMeetingNotesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedMeeting || selectedMeeting.source !== "table") {
      return;
    }

    const notes = String(formData.get("notes") ?? "");
    const displayNotes = notes.trim() ? notes : null;

    void (async () => {
      const result = await submitJson("/api/dos/app/meetings", {
        id: selectedMeeting.id,
        notes,
        notesOnly: true,
      }, "PATCH", false);

      if (result) {
        setMeetingNotesOverrides((current) => ({
          ...current,
          [selectedMeeting.id]: displayNotes,
        }));
        closeForm();
      }
    })();
  }

  function handleReminderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const personId = String(formData.get("person_id") ?? selectedMeetingPersonIds[0] ?? "");
    const reminderType = String(formData.get("reminder_type") ?? "custom");
    const rawRecurrence = String(formData.get("recurrence") ?? "none");
    const recurrence = ["anniversary", "baptism", "birthday", "salvation"].includes(reminderType) && rawRecurrence === "none"
      ? "yearly"
      : rawRecurrence;
    const googleSyncEnabled = formData.get("google_sync_enabled") === "on";
    const reminderDate = String(formData.get("reminder_date") ?? todayDateValue());
    const payload = {
      googleSyncEnabled,
      google_sync_enabled: googleSyncEnabled,
      id: selectedReminder?.id,
      notes: String(formData.get("notes") ?? ""),
      personId,
      person_id: personId,
      recurrence,
      reminderDate,
      reminder_date: reminderDate,
      reminderType,
      reminder_type: reminderType,
      title: String(formData.get("title") ?? ""),
    };

    void submitJson("/api/dos/app/reminders", payload, selectedReminder ? "PATCH" : "POST");
  }

  function handleDeleteReminder() {
    if (!selectedReminder) {
      return;
    }

    if (!window.confirm("Delete this reminder?")) {
      return;
    }

    void (async () => {
      const result = await submitJson("/api/dos/app/reminders", {
        id: selectedReminder.id,
      }, "DELETE", false);

      if (result) {
        closeForm();

        if (result.calendarWarning) {
          setErrorMessage(result.calendarWarning);
        }
      }
    })();
  }

  function handleDeleteMeeting() {
    if (!selectedMeeting || selectedMeeting.source !== "table") {
      return;
    }

    if (!window.confirm("Delete this table? This cannot be undone.")) {
      return;
    }

    void (async () => {
      const result = await submitJson("/api/dos/app/meetings", {
        id: selectedMeeting.id,
      }, "DELETE", false);

      if (result) {
        setActiveTab("meetings");
        setPostMeetingFollowUpId(null);
        setSelectedMeetingId(null);
        closeForm();

        if (result.calendarWarning) {
          setErrorMessage(result.calendarWarning);
        }
      }
    })();
  }

  function handleFruitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    void submitJson("/api/dos/app/fruit", {
      fieldPersonId: String(formData.get("field_person_id") ?? ""),
      outcomeTags: selectedOutcomeTags,
      summary: String(formData.get("summary") ?? ""),
      testimonyDate: String(formData.get("testimony_date") ?? todayDateValue()),
    });
  }

  function reviewUrlFromToken(token: string) {
    return typeof window !== "undefined"
      ? `${window.location.origin}/review/${token}`
      : `/review/${token}`;
  }

  function testimonyUrlFromToken(token: string) {
    return typeof window !== "undefined"
      ? `${window.location.origin}/testimony/${token}`
      : `/testimony/${token}`;
  }

  function existingReviewUrl(meeting: DosAppMeeting) {
    const token = reviewLinksByMeetingId[meeting.id] ?? meeting.review.token;

    return token ? reviewUrlFromToken(token) : null;
  }

  function existingTestimonyUrl(meeting: DosAppMeeting) {
    const token = testimonyLinksByMeetingId[meeting.id];

    return token ? testimonyUrlFromToken(token) : null;
  }

  async function ensureReviewLink(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return null;
    }

    if (isPreview) {
      throw new Error("Preview mode is read-only. Review links are not created.");
    }

    const existingUrl = existingReviewUrl(meeting);

    if (existingUrl) {
      return existingUrl;
    }

    const response = await fetch("/api/dos/app/review-links", {
      body: JSON.stringify({
        meetingId: meeting.id,
        workspaceId: data.workspace.id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as { error?: string; token?: string; url?: string };

    if (!response.ok || !result.url) {
      throw new Error(result.error ?? "Unable to create review link.");
    }

    if (result.token) {
      setReviewLinksByMeetingId((current) => ({
        ...current,
        [meeting.id]: result.token as string,
      }));
    }

    return result.url;
  }

  async function ensureTestimonyLink(meeting: DosAppMeeting) {
    if (meeting.source !== "table") {
      return null;
    }

    if (!canSendMeetingTestimonyRequest(meeting, people)) {
      throw new Error("Add a person to this table before sending a testimony request.");
    }

    if (isPreview) {
      throw new Error("Preview mode is read-only. Story links are not created.");
    }

    const existingUrl = existingTestimonyUrl(meeting);

    if (existingUrl) {
      return existingUrl;
    }

    const response = await fetch("/api/dos/app/testimony-links", {
      body: JSON.stringify({
        meetingId: meeting.id,
        workspaceId: data.workspace.id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await response.json().catch(() => ({})) as { error?: string; token?: string; url?: string };

    if (!response.ok || !result.url) {
      throw new Error(result.error ?? "Unable to create story link.");
    }

    if (result.token) {
      setTestimonyLinksByMeetingId((current) => ({
        ...current,
        [meeting.id]: result.token as string,
      }));
    }

    return result.url;
  }

  async function copyReviewUrl(url: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);

        return true;
      } catch {
        return false;
      }
    }

    return false;
  }

  async function handleShareReview(meeting: DosAppMeeting) {
    setErrorMessage("");
    setReviewLinkMeetingId(meeting.id);
    setReviewShareMessage("");

    try {
      const url = await ensureReviewLink(meeting);

      if (!url) {
        return;
      }

      // TODO: Add SMS/email/WhatsApp sending from this link once DOS messaging workflows exist.
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            text: "Quick check-in for our conversation.",
            title: "DOS Quick Review",
            url,
          });
          setReviewShareMessage("Review link shared.");
          return;
        } catch {
          // Fall through to clipboard for browsers that cancel or block sharing.
        }
      }

      const copied = await copyReviewUrl(url);

      setReviewShareMessage(copied ? "Review link copied." : url);
    } catch (error) {
      setReviewShareMessage(error instanceof Error ? error.message : "Unable to share review link.");
    } finally {
      setReviewLinkMeetingId(null);
    }
  }

  async function handleSendReview(meeting: DosAppMeeting) {
    await handleShareReview(meeting);
  }

  async function handleShareTestimony(meeting: DosAppMeeting) {
    setErrorMessage("");
    setTestimonyLinkMeetingId(meeting.id);
    setTestimonyShareMessage("");

    try {
      const url = await ensureTestimonyLink(meeting);

      if (!url) {
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            text: "Share your story from our conversation.",
            title: "DOS Testimony Request",
            url,
          });
          setTestimonyShareMessage("Testimony request link shared.");
          return;
        } catch {
        }
      }

      const copied = await copyReviewUrl(url);

      setTestimonyShareMessage(copied ? "Testimony request link copied." : url);
    } catch (error) {
      setTestimonyShareMessage(error instanceof Error ? error.message : "Unable to share testimony request link.");
    } finally {
      setTestimonyLinkMeetingId(null);
    }
  }

  function handleComingSoonFruitForm(form: (typeof fruitFormCards)[number]) {
    setFruitView("forms");
    setFruitFormsNotice(`${form.title} is coming soon. Prayer request forms will connect to Prayer later.`);
  }

  function handlePreviewFruitForm(formKey: Extract<FruitFormKey, "quick_review" | "testimony_review">) {
    setFruitView("forms");
    setFruitFormsNotice("");
    setSelectedFruitFormPreviewKey(formKey);
  }

  async function handleFruitFormLinkAction(formKey: Extract<FruitFormKey, "quick_review" | "testimony_review">, meeting: DosAppMeeting | null, action: "copy" | "send") {
    const isTestimony = formKey === "testimony_review";
    const title = isTestimony ? "Testimony Review" : "Quick Review";
    const setBusyMeetingId = isTestimony ? setTestimonyLinkMeetingId : setReviewLinkMeetingId;
    const ensureLink = isTestimony ? ensureTestimonyLink : ensureReviewLink;

    setFruitFormsNotice("");

    if (!meeting) {
      setFruitFormsNotice(isTestimony
        ? "Log a table with a person before sending a testimony review."
        : "Log a table before sending a quick review.");
      return;
    }

    setErrorMessage("");
    setBusyMeetingId(meeting.id);

    try {
      const url = await ensureLink(meeting);

      if (!url) {
        return;
      }

      if (action === "copy") {
        const copied = await copyReviewUrl(url);

        setFruitFormsNotice(copied ? `${title} link copied.` : url);
        return;
      }

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            text: isTestimony ? "Share your story from our conversation." : "Quick check-in for our conversation.",
            title: isTestimony ? "DOS Testimony Request" : "DOS Quick Review",
            url,
          });
          setFruitFormsNotice(isTestimony ? "Testimony review link shared." : "Quick review link shared.");
          return;
        } catch {
          // Fall through to clipboard for browsers that cancel or block sharing.
        }
      }

      const copied = await copyReviewUrl(url);

      setFruitFormsNotice(copied ? `${title} link copied.` : url);
    } catch (error) {
      setFruitFormsNotice(error instanceof Error ? error.message : `Unable to prepare ${title.toLowerCase()} link.`);
    } finally {
      setBusyMeetingId(null);
    }
  }

  function handleMobileFruitFormAction(form: (typeof fruitFormCards)[number]) {
    setFruitView("forms");

    if (form.key === "quick_review") {
      void handleFruitFormLinkAction("quick_review", latestLoggedTableMeeting, "send");
      return;
    }

    if (form.key === "testimony_review") {
      void handleFruitFormLinkAction("testimony_review", latestTestimonyReviewMeeting, "send");
      return;
    }

    handleComingSoonFruitForm(form);
  }

  async function handleConfirmMeetingSendAction() {
    if (!pendingMeetingSendAction) {
      return;
    }

    const action = pendingMeetingSendAction;

    if (action.type === "quick_review") {
      await handleSendReview(action.meeting);
    } else if (!canSendMeetingTestimonyRequest(action.meeting, people)) {
      setPendingMeetingSendAction(null);
    } else {
      await handleShareTestimony(action.meeting);
    }

    setPendingMeetingSendAction(null);
  }

  function toggleOutcomeTag(tag: string) {
    setSelectedOutcomeTags((current) =>
      current.includes(tag)
        ? current.filter((currentTag) => currentTag !== tag)
        : [...current, tag],
    );
  }

  function toggleMeetingPersonId(personId: string) {
    setSelectedMeetingPersonIds((current) =>
      current.includes(personId)
        ? current.filter((currentPersonId) => currentPersonId !== personId)
        : [...current, personId],
    );
  }

  function handleConversationResponse(questionId: string, value: DosConversationResponseValue | undefined) {
    setConversationResponses((current) => {
      if (value === undefined || value === "") {
        const { [questionId]: _removed, ...rest } = current;

        return rest;
      }

      return {
        ...current,
        [questionId]: value,
      };
    });
  }

  function handleConversationFollowUpAction(actionId: string) {
    setConversationResponses((current) => {
      const currentActions = responseAsStringArray(current.followUpActions);
      const nextActions = currentActions.includes(actionId)
        ? currentActions.filter((currentAction) => currentAction !== actionId)
        : [...currentActions, actionId];

      if (!nextActions.length) {
        const { followUpActions: _removed, ...rest } = current;

        return rest;
      }

      return {
        ...current,
        followUpActions: nextActions,
      };
    });
  }

  const prayerReminderCount = data.reminders.filter((reminder) => reminder.reminderType === "prayer").length;
  const isMissionaryLayerActive = usamApplication.status === "approved"
    || usamApplication.status === "active"
    || usamApplication.publicProfileLive;
  const missionaryLayerStatus = usamApplication.publicProfileLive
    ? "Live"
    : isMissionaryLayerActive
      ? "Approved"
      : isUsamApplicationPending
        ? "Pending"
        : "Optional";
  const appCatalogSections: DosAppCatalogSection[] = [
    {
      description: "Core DOS rhythms that are already available in this workspace.",
      label: "Installed",
      items: [
        {
          description: "Field relationships you are stewarding.",
          icon: <Users className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Field",
          onClick: () => openPeopleCircle("three"),
          section: "installed",
          status: `${people.length} people`,
        },
        {
          description: "Upcoming and completed table conversations.",
          icon: <Icon name="meetings" size={20} />,
          label: "Table",
          onClick: () => selectTab("meetings"),
          section: "installed",
          status: `${upcomingTableMeetings.length} upcoming`,
        },
        {
          description: `${prayerReminderCount} reminders and recent prayer activity.`,
          icon: <Heart className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Prayer",
          onClick: () => openMoreApp("prayer"),
          section: "installed",
          status: "Installed",
        },
        {
          description: "Curated outcomes and visible multiplication.",
          icon: <Icon name="fruit" size={20} />,
          label: "Fruit",
          onClick: () => openMoreApp("fruit"),
          section: "installed",
          status: `${visibleFruitStories.length} records`,
        },
        {
          description: "Teachings and sendable resources.",
          icon: <BookOpen className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Library",
          onClick: () => openMoreApp("library"),
          section: "installed",
          status: "Installed",
        },
      ],
    },
    {
      description: "Optional USA Missionaries tools attached to this DOS workspace after approval.",
      label: "USA Missionaries",
      items: [
        {
          description: "Application status, public profile, and profile link.",
          icon: <User className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Missionary Profile",
          onClick: () => openMoreApp("missionary_profile"),
          section: "missionary",
          status: missionaryLayerStatus,
        },
        {
          description: "Prayer partners and public profile prayer needs.",
          icon: <HeartHandshake className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Prayer Team",
          onClick: () => openMoreApp("prayer_team"),
          section: "missionary",
          status: isMissionaryLayerActive ? "Available" : "Layer",
        },
        {
          description: "Support partners, giving progress, and support status.",
          icon: <Gift className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Support Team",
          onClick: () => openMoreApp("support_team"),
          section: "missionary",
          status: isMissionaryLayerActive ? "Available" : "Layer",
        },
      ],
    },
    {
      description: "Future optional apps that can be installed without changing the DOS core.",
      label: "Coming Soon",
      items: [
        {
          description: "Reports for leaders and teams.",
          icon: <Megaphone className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Reports",
          onClick: () => openMoreApp("reports"),
          section: "coming_soon",
          status: "Coming Soon",
        },
        {
          description: "Generosity, budgeting, and ministry stewardship tools.",
          icon: <Briefcase className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Stewardship",
          onClick: () => openMoreApp("stewardship"),
          section: "coming_soon",
          status: "Coming Soon",
        },
        {
          description: "Everyone has a testimony. Practice yours and get coach feedback.",
          icon: <Mic className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />,
          label: "Testimony Practice",
          onClick: () => openMoreApp("in_season"),
          section: "coming_soon",
          status: "Coming Soon",
        },
      ],
    },
  ];
  const mobileAppCatalogItems = appCatalogSections
    .flatMap((section) => section.items)
    .filter((item) => !["Missionary Profile", "Prayer Team", "Support Team", "Table Flow"].includes(item.label));
  const desktopAppCatalogItems = appCatalogSections
    .flatMap((section) => section.items)
    .filter((item) => ["Fruit", "Library", "Reports", "Stewardship", "Testimony Practice"].includes(item.label));
  const visibleMobileAppCatalogItems = mobileAppCatalogItems.filter((item) => {
    const query = isAppsSearchOpen ? appSearchQuery.trim().toLowerCase() : "";

    if (!query) {
      return true;
    }

    return `${item.label} ${item.description} ${item.status}`.toLowerCase().includes(query);
  });
  const runMobileAction = (action: () => void) => () => {
    setIsMobileActionSheetOpen(false);
    action();
  };
  const quickReviewFruitFormAction = {
    isBusy: latestLoggedTableMeeting ? reviewLinkMeetingId === latestLoggedTableMeeting.id : false,
    onCopy: () => void handleFruitFormLinkAction("quick_review", latestLoggedTableMeeting, "copy"),
    onPreview: () => handlePreviewFruitForm("quick_review"),
    onSend: () => void handleFruitFormLinkAction("quick_review", latestLoggedTableMeeting, "send"),
  };
  const testimonyReviewFruitFormAction = {
    isBusy: latestTestimonyReviewMeeting ? testimonyLinkMeetingId === latestTestimonyReviewMeeting.id : false,
    onCopy: () => void handleFruitFormLinkAction("testimony_review", latestTestimonyReviewMeeting, "copy"),
    onPreview: () => handlePreviewFruitForm("testimony_review"),
    onSend: () => void handleFruitFormLinkAction("testimony_review", latestTestimonyReviewMeeting, "send"),
  };
  const mobileFloatingActionItems: MobileFloatingActionItem[] = activeTab === "meetings"
    ? [
        { icon: "log", label: "Log Table", onClick: runMobileAction(() => openForm("meeting")) },
        { icon: "calendar", label: "Schedule Table", onClick: runMobileAction(() => openScheduleMeeting()) },
        { icon: "search", label: "Search Tables", onClick: runMobileAction(openTableSearch) },
        { icon: "send", label: "Send Resource", onClick: runMobileAction(openResourcePicker) },
      ]
    : activeTab === "more" && moreAppView === "fruit"
      ? fruitFormCards.map((form) => ({
          icon: form.icon,
          label: form.title,
          onClick: runMobileAction(() => handleMobileFruitFormAction(form)),
        }))
    : activeTab === "more"
      ? [
          { icon: "people", label: "USA Missionaries", onClick: runMobileAction(openUsamAppsLayer) },
          { icon: "people", label: "Missionary Profile", onClick: runMobileAction(() => openMoreApp("missionary_profile")) },
          { icon: "prayer", label: "Prayer Team", onClick: runMobileAction(() => openMoreApp("prayer_team")) },
          { icon: "people", label: "Support Team", onClick: runMobileAction(() => openMoreApp("support_team")) },
          { icon: "log", label: "Reports", onClick: runMobileAction(() => openMoreApp("reports")) },
          { icon: "search", label: "Search Apps", onClick: runMobileAction(openAppsSearch) },
        ]
      : activeTab === "home"
      ? [
          { icon: "people", label: "My Field", onClick: runMobileAction(() => openPeopleCircle("three")) },
          { icon: "add", label: "Add Person", onClick: runMobileAction(() => openForm("person")) },
          { icon: "log", label: "Log Table", onClick: runMobileAction(() => openForm("meeting")) },
          { icon: "calendar", label: "Schedule", onClick: runMobileAction(() => openScheduleMeeting()) },
          { icon: "search", label: "Search", onClick: runMobileAction(openFieldSearch) },
        ]
      : [];
  const showMobileFloatingActions = mobileFloatingActionItems.length > 0
    && !formMode
    && !isCirclesOpen
    && !isEditProfileOpen
    && !isPeopleImportOpen
    && !isPrayerResourceLibraryOpen
    && !isResourcePickerOpen
    && !isProfileOpen
    && !isActivitySheetOpen
    && !isTableSearchOpen
    && !isUpcomingSheetOpen
    && !isUsamApplicationOpen
    && !selectedExternalCalendarEventId
    && !selectedFruitActivity
    && !selectedFruitFormPreviewKey
    && !selectedMeetingId
    && !selectedPersonId
    && !selectedPrayerResourceSlug
    && !selectedReminderId
    && !selectedScripture;

  return (
    <div className={dosRootShellClassName}>
      <div ref={appShellRef} className={`${dosPhoneShellClassName} ${dosDawnShellClassName}`}>
        <DesktopNavigation
          activeTab={activeTab}
          moreAppView={moreAppView}
          onOpenMoreApp={openMoreApp}
          onOpenProfile={() => openMoreApp("settings")}
          onSelect={selectTab}
          profileEmail={profileEmail}
          profileImageUrl={data.workspace.profileImageUrl}
          profileName={profileName}
          workspaceName={workspaceName}
        />
        <div ref={appScrollRef} className={`h-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-transparent px-4 pt-11 [scrollbar-width:none] md:bg-transparent md:px-8 md:pb-10 md:pt-6 xl:px-10 ${activeTab === "more" ? "pb-40" : "pb-28"}`}>
          {activeTab === "home" ? (
            <header className="relative md:hidden">
              <div className="min-w-0 pr-16">
                <p className="text-[20px] font-black leading-none tracking-[-0.035em] text-[#1D4ED8]" style={{ fontFamily: font.oswald }}>
                  DOS
                </p>
                <h1 className="mt-2 max-w-[340px] text-[46px] font-black leading-[0.88] tracking-[-0.025em] text-[#020617] max-[350px]:text-[42px]" style={{ fontFamily: font.oswald, wordSpacing: "0.04em" }}>
                  <span className="block">Discipleship</span>
                  <span className="block">on the go.</span>
                </h1>
                <span className="mt-2 inline-flex rounded-full border border-[#DCEBFF] bg-white px-3 py-1.5 text-[11px] font-semibold leading-none text-[#64748B] shadow-[0_6px_14px_rgba(37,99,235,0.045)]">
                  {homeSubtitle}
                </span>
              </div>
              <button
                aria-label="Open profile"
                className="absolute right-0 top-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/35"
                onClick={() => setIsProfileOpen(true)}
                type="button"
              >
                <UserProfileAvatar imageUrl={data.workspace.profileImageUrl} name={profileName} />
              </button>
            </header>
          ) : null}

          <main className={`min-w-0 max-w-full ${activeTab === "home" ? "mt-10 md:mt-0" : ""}`}>
            {activeTab === "home" ? (
              <>
              <div className="space-y-5 md:hidden">
                <CircleFocusHero
                  circleGroups={circlePeopleByLayer}
                  onSelectCircle={openPeopleCircle}
                />

                {isUsamApplicationPending ? <UsamPendingHomeCard onViewStatus={viewUsamApplicationStatus} /> : null}

                <NextStepsCard
                  items={upcomingTimelineItems}
                  onOpenAll={() => setIsUpcomingSheetOpen(true)}
                />

                <HomeActivityCard
                  items={homeActivityItems}
                  onOpenAll={() => setIsActivitySheetOpen(true)}
                />
              </div>
              <DesktopHomeDashboard
                circleGroups={circlePeopleByLayer}
                fruitEvents={data.fruitEvents}
                fruitItems={data.fruit}
                isUsamApplicationPending={isUsamApplicationPending}
                loggedMeetings={loggedMeetings}
                onOpenFruit={() => openMoreApp("fruit")}
                onOpenMeeting={openMeetingDetail}
                onOpenPerson={openPersonDetail}
                onOpenReports={() => openMoreApp("reports")}
                onOpenTable={() => setActiveTab("meetings")}
                onOpenTableCalendar={() => {
                  setActiveTab("meetings");
                  setMeetingsView("calendar");
                }}
                onViewField={() => setActiveTab("people")}
                onViewUsamStatus={viewUsamApplicationStatus}
                people={people}
                personTableStatsByPersonId={personTableStatsByPersonId}
                upcomingItems={upcomingTimelineItems}
                upcomingMeetings={upcomingScheduledMeetings}
              />
              </>
            ) : null}

            {activeTab === "people" ? (
              <div className="space-y-4">
                <TabHero
                  icon={<Users className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                  onScriptureClick={openScriptureQuickView}
                  scripture={scriptureReferences.luke1610}
                  subtitle="Steward the field God has entrusted to your care."
                  title="Faithful with a few."
                />
                <div className="hidden items-center gap-3 rounded-[24px] border border-[#EAF2FF] bg-white p-3 shadow-[0_12px_34px_rgba(37,99,235,0.045)] md:flex">
                  <button
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.22)] transition-colors hover:brightness-[0.98]"
                    onClick={() => openForm("person")}
                    type="button"
                  >
                    <Icon name="add" size={15} />
                    Add Person
                  </button>
                  <label className="relative min-w-[260px] flex-1">
                    <span className="sr-only">Search field</span>
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                      <Icon name="search" size={15} />
                    </span>
                    <input
                      className="min-h-11 w-full rounded-full border border-[#DCEBFF] bg-[#F8FBFF] pl-10 pr-4 text-sm font-semibold text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white"
                      onChange={(event) => setPeopleQuery(event.target.value)}
                      placeholder="Search by name, phone, relationship, or context"
                      type="search"
                      value={peopleQuery}
                    />
                  </label>
                  <button
                    aria-label="Import CSV"
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#D7E3F8] bg-white px-4 text-sm font-bold text-[#2563EB] shadow-[0_6px_14px_rgba(15,23,42,0.04)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EFF6FF]"
                    onClick={() => setIsPeopleImportOpen(true)}
                    title="Import CSV"
                    type="button"
                  >
                    <Icon name="add" size={14} />
                    Import
                  </button>
                </div>
                <div className="flex items-center gap-2 md:hidden">
                  <button
                    className="inline-flex h-12 min-w-0 flex-[1.35] items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(37,99,235,0.24)] transition-colors hover:brightness-[0.98] max-[350px]:flex-[1.2] max-[350px]:px-3 max-[350px]:text-[12px]"
                    onClick={() => openForm("person")}
                    type="button"
                  >
                    + Add Person
                  </button>
                  <button
                    aria-expanded={isPeopleSearchOpen}
                    aria-label="Search field"
                    className={`inline-flex h-12 min-w-0 flex-[0.9] items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-bold text-[#2563EB] shadow-[0_8px_18px_rgba(37,99,235,0.08)] transition-colors max-[350px]:flex-[0.88] max-[350px]:gap-1 max-[350px]:px-2 max-[350px]:text-[12px] ${
                      isPeopleSearchOpen
                        ? "border-[#2563EB] bg-[#EBF2FF]"
                        : "border-[#D7E3F8] bg-white hover:border-[#BFDBFE] hover:bg-[#EFF6FF]"
                    }`}
                    onClick={() => {
                      setIsPeopleSearchOpen((current) => {
                        if (current) {
                          setPeopleQuery("");
                        }

                        return !current;
                      });
                    }}
                    title="Search field"
                    type="button"
                  >
                    <Icon name="search" size={18} />
                    <span>Search</span>
                  </button>
                  <button
                    aria-label="Import CSV"
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#D7E3F8] bg-white text-[#2563EB] shadow-[0_6px_14px_rgba(15,23,42,0.06)] transition-colors hover:border-[#BFDBFE] hover:bg-[#EFF6FF] max-[350px]:w-10"
                    onClick={() => setIsPeopleImportOpen(true)}
                    title="Import CSV"
                    type="button"
                  >
                    <Icon name="add" size={14} />
                  </button>
                </div>
                {isPeopleSearchOpen ? (
                  <div className="relative md:hidden">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                      <Icon name="search" size={15} />
                    </span>
                    <input
                      autoFocus
                      className="min-h-11 w-full rounded-full border border-[#BFDBFE] bg-white pl-10 pr-4 text-sm text-[#0F172A] shadow-[0_8px_18px_rgba(37,99,235,0.06)] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2563EB]"
                      onChange={(event) => setPeopleQuery(event.target.value)}
                      placeholder="Search by name, phone, or relationship"
                      type="search"
                      value={peopleQuery}
                    />
                  </div>
                ) : null}
                <div>
                  <PeopleCircleTabs onChange={setPeopleCircleView} value={peopleCircleView} />
                </div>
                {peopleImportMessage ? (
                  <p className={`mt-3 rounded-2xl border p-3 text-sm ${
                    peopleImportMessage.tone === "success"
                      ? "border-[#BFDBFE] bg-[#EBF2FF] text-[#1D4ED8]"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}>
                    {peopleImportMessage.text}
                  </p>
                ) : null}
                <div className="mt-3">
                  {visibleCirclePeople.length ? (
                    <>
                      <div className="md:hidden">
                        <CircleLayerList
                          empty={peopleCircleContent.empty}
                          items={visibleCirclePeople}
                          latestMeetingDateByPersonId={latestMeetingDateByPersonId}
                          onLogMeeting={openMeetingForPerson}
                          onOpenPerson={openPersonDetail}
                          startIndex={peopleCircleContent.startIndex}
                        />
                      </div>
                      <DesktopPeopleIndex
                        empty={peopleCircleContent.empty}
                        items={visibleCirclePeople}
                        latestMeetingDateByPersonId={latestMeetingDateByPersonId}
                        onLogMeeting={openMeetingForPerson}
                        onOpenPerson={openPersonDetail}
                        personTableStatsByPersonId={personTableStatsByPersonId}
                        startIndex={peopleCircleContent.startIndex}
                        storyCountByPersonId={storyCountByPersonId}
                      />
                    </>
                  ) : people.length ? (
                    <EmptyState text={peopleQuery.trim() ? `Try a different search inside ${circleDisplayName(peopleCircleView)}.` : peopleCircleContent.empty} title={peopleQuery.trim() ? "No matching field results." : `No one in ${circleDisplayName(peopleCircleView)}.`} />
                  ) : (
                    <EmptyState action={<CompactButton icon="add" onClick={() => openForm("person")}>Add Person</CompactButton>} text="Start by adding someone you are walking with." title="No field added yet." />
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "meetings" ? (
              <div className="space-y-4">
                <TabHero
                  desktopCompact
                  icon={<Icon name="meetings" size={20} />}
                  onScriptureClick={openScriptureQuickView}
                  scripture={scriptureReferences.hebrews1025}
                  subtitle="Every conversation is an opportunity to motivate, encourage, and challenge."
                  title="Faithful at the table."
                />
                <DesktopTableToolbar
                  meetingsView={meetingsView}
                  onLogMeeting={() => openForm("meeting")}
                  onMeetingsViewChange={setMeetingsView}
                  onScheduleMeeting={() => openScheduleMeeting()}
                  onSearchChange={setTableQuery}
                  query={tableQuery}
                  resultCount={tableResultCount}
                />
                <div className="md:hidden">
                  <SegmentedTabs
                    onChange={(value) => setMeetingsView(value)}
                    options={mobileMeetingsViewTabs}
                    value={meetingsView === "availability" ? "upcoming" : meetingsView}
                  />
                </div>
                <div>
                  {meetingsView === "upcoming" ? (
                    visibleUpcomingTableMeetings.length ? (
                      <>
                        <div className="grid gap-3 md:hidden">{visibleUpcomingTableMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} onClick={() => openMeetingDetail(meeting.id)} people={people} />)}</div>
                        <DesktopScheduleTable meetings={visibleUpcomingTableMeetings} onOpenMeeting={openMeetingDetail} people={people} />
                      </>
                    ) : (
                      <>
                        <div className="md:hidden">
                          <EmptyState action={<CompactButton icon="calendar" onClick={() => openScheduleMeeting()}>Schedule Table</CompactButton>} text={tableQuery.trim() ? "Try another person, note, date, or table type." : "Schedule the next conversation or prayer moment."} title={tableQuery.trim() ? "No matching upcoming tables." : "Nothing upcoming."} />
                        </div>
                        <DesktopTableEmptyState action={<CompactButton icon="calendar" onClick={() => openScheduleMeeting()}>Schedule Table</CompactButton>} text={tableQuery.trim() ? "Try another person, note, date, or table type." : "Schedule your next table or prayer moment."} title={tableQuery.trim() ? "No matching upcoming tables." : "Nothing scheduled."} />
                      </>
                    )
                  ) : meetingsView === "calendar" ? (
                    <MeetingCalendarView
                      calendarFilter={meetingCalendarFilter}
                      calendarSyncMessage={calendarSyncMessage}
                      googleCalendarConnected={data.calendarConnection.connected}
                      isSyncingGoogleCalendar={isSyncingGoogleCalendar}
                      items={visibleMeetingCalendarItems}
                      month={meetingsCalendarMonth}
                      onCalendarFilterChange={setMeetingCalendarFilter}
                      onChangeMonth={changeMeetingsCalendarMonth}
                      onOpenExternalEvent={openExternalCalendarEventDetail}
                      onOpenMeeting={openMeetingDetail}
                      onOpenReminder={openReminderEdit}
                      onScheduleMeeting={() => openScheduleMeeting()}
                      onSelectDate={selectMeetingsCalendarDate}
                      onSyncGoogleCalendar={handleSyncGoogleCalendar}
                      onToday={jumpMeetingsCalendarToToday}
                      selectedDateKey={selectedMeetingsCalendarDate}
                    />
                  ) : meetingsView === "availability" ? (
                    <>
                      <div className="md:hidden">
                        <EmptyState action={<CompactButton icon="calendar" onClick={() => openScheduleMeeting()}>Schedule Table</CompactButton>} text="Availability and booking links are coming next. Connected calendars already sync into Table." title="Availability is coming next." />
                      </div>
                      <DesktopAvailabilityPanel
                        calendarConnection={data.calendarConnection}
                        externalCalendarEvents={data.externalCalendarEvents}
                        isDisconnecting={isCalendarDisconnecting}
                        onDisconnectCalendar={handleDisconnectCalendar}
                        onScheduleMeeting={() => openScheduleMeeting()}
                        workspaceId={data.workspace.id}
                      />
                    </>
                  ) : (
                    visibleHistoryTableMeetings.length ? (
                      <>
                        <div className="grid gap-3 md:hidden">{visibleHistoryTableMeetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} onClick={() => openMeetingDetail(meeting.id)} people={people} />)}</div>
                        <DesktopHistoryTable meetings={visibleHistoryTableMeetings} onOpenMeeting={openMeetingDetail} people={people} storyCountByMeetingId={storyCountByMeetingId} />
                      </>
                    ) : (
                      <>
                        <div className="md:hidden">
                          <EmptyState action={<CompactButton icon="log" onClick={() => openForm("meeting")}>Log Table</CompactButton>} text={tableQuery.trim() ? "Try another table type, note, person, or date." : "Completed tables will land here after you log them."} title={tableQuery.trim() ? "No matching history." : "No table history yet."} />
                        </div>
                        <DesktopTableEmptyState action={<CompactButton icon="log" onClick={() => openForm("meeting")}>Log Table</CompactButton>} text={tableQuery.trim() ? "Try another table type, note, person, or date." : "Completed tables will land here after you log them."} title={tableQuery.trim() ? "No matching history." : "No table history yet."} />
                      </>
                    )
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "more" ? (
              <div className="space-y-5">
                {moreAppView === null || moreAppView === "apps" ? (
                  <>
                    <div className="space-y-4 md:hidden">
                      <TabHero
                        icon={<Icon name="apps" size={20} />}
                        onScriptureClick={openScriptureQuickView}
                        subtitle="DOS core stays simple. Installable layers extend the workspace when needed."
                        title="Apps for the work."
                      />
                      {isAppsSearchOpen ? (
                        <div className="rounded-[24px] border border-[#EAF2FF] bg-white p-2 shadow-[0_12px_30px_rgba(37,99,235,0.055)]">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.9} />
                            <input
                              autoFocus
                              className="h-11 w-full rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-10 text-sm font-semibold text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#BFDBFE] focus:bg-white"
                              onChange={(event) => setAppSearchQuery(event.target.value)}
                              placeholder="Search apps"
                              value={appSearchQuery}
                            />
                            {appSearchQuery.trim() ? (
                              <button
                                aria-label="Clear app search"
                                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-white hover:text-[#0F172A]"
                                onClick={() => setAppSearchQuery("")}
                                type="button"
                              >
                                <X className="h-4 w-4" aria-hidden="true" strokeWidth={2} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-3">
                        {visibleMobileAppCatalogItems.map((item) => (
                          <DesktopMoreAppCard item={item} key={item.label} />
                        ))}
                      </div>
                      {visibleMobileAppCatalogItems.length ? null : (
                        <EmptyState text="Try a different app name." title="No apps found." />
                      )}
                    </div>
                    <DesktopMoreLauncher apps={desktopAppCatalogItems} onScriptureClick={openScriptureQuickView} />
                  </>
                ) : null}

                {moreAppView === "settings" ? (
                  <DesktopSettingsProfileView
                    application={usamApplication}
                    email={profileEmail}
                    missionaryLayerStatus={missionaryLayerStatus}
                    name={profileName}
                    onEditProfile={() => setIsEditProfileOpen(true)}
                    onOpenCircles={() => setIsCirclesOpen(true)}
                    onOpenMissionaryProfile={() => openMoreApp("missionary_profile")}
                    onOpenPrayerTeam={() => openMoreApp("prayer_team")}
                    onOpenSupportTeam={() => openMoreApp("support_team")}
                    onViewApplicationStatus={viewUsamApplicationStatus}
                    organizationName={data.workspace.organizationName}
                    phone={profilePhone}
                    photoUrl={data.workspace.profileImageUrl}
                    publicProfileHref={data.workspace.publicProfileHref}
                    stateName={data.workspace.stateName}
                    workspaceName={workspaceName}
                  />
                ) : null}

                {moreAppView === "prayer" ? (
                  <>
                    <div className="flex min-h-9 items-center md:hidden">
                      <MoreBackButton onClick={() => setMoreAppView(null)} />
                    </div>
                    <TabHero
                      icon={<Heart className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.hebrews1025}
                      subtitle="Remember who to pray for and keep the next faithful step visible."
                      title="Pray with purpose."
                    />
                    <div className="space-y-5 md:hidden">
                      <LibrarySection title="Prayer Today">
                        <div className="grid gap-3">
                          {data.reminders.filter((reminder) => reminder.reminderType === "prayer").slice(0, 4).map((reminder) => {
                            const person = people.find((item) => item.id === reminder.personId);

                            return (
                              <button
                                className="flex min-w-0 items-center gap-3 rounded-[22px] border border-[#EAF2FF] bg-white p-3 text-left shadow-[0_12px_30px_rgba(37,99,235,0.045)]"
                                key={reminder.id}
                                onClick={() => openReminderEdit(reminder.id)}
                                type="button"
                              >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[#EBF2FF] text-[#2563EB]">
                                  <Heart className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-bold text-[#0F172A]">{reminder.title || "Prayer reminder"}</span>
                                  <span className="mt-1 block text-xs leading-5 text-[#64748B]">{person?.name ?? "Someone"} · {formatDate(reminder.reminderDate)}</span>
                                </span>
                              </button>
                            );
                          })}
                          {!data.reminders.some((reminder) => reminder.reminderType === "prayer") ? (
                            <EmptyState text="No prayer reminders yet. Add one from a person profile when someone needs steady covering." title="No prayer reminders." />
                          ) : null}
                        </div>
                      </LibrarySection>
                      <LibrarySection title="Recent Prayer">
                        <div className="grid gap-2">
                          {latestPrayerActivity ? (
                            <RecentActivityRow icon="prayer" onClick={() => openMeetingDetail(latestPrayerActivity.meetingId)} title="Latest prayer">
                              {latestPrayerActivity.label}
                            </RecentActivityRow>
                          ) : null}
                          <div className="grid grid-cols-2 gap-2">
                            <WeekStatTile icon="prayer" label="This Week" value={thisWeekStats.prayed} />
                            <WeekStatTile icon="bell" label="Reminders" value={data.reminders.filter((reminder) => reminder.reminderType === "prayer").length} />
                          </div>
                        </div>
                      </LibrarySection>
                      <LibrarySection title="Prayer Resources">
                        <button
                          className="flex min-w-0 items-center gap-3 rounded-[24px] border border-[#DCEBFF] bg-white p-4 text-left shadow-[0_12px_30px_rgba(37,99,235,0.055)]"
                          onClick={openPrayerResourceLibrary}
                          type="button"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#EBF2FF] text-[#2563EB]">
                            <BookOpen className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-[#0F172A]">Open prayer library</span>
                            <span className="mt-1 block text-xs leading-5 text-[#64748B]">Identity, healing, relationships, freedom, and life challenges.</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
                        </button>
                      </LibrarySection>
                    </div>
                    <DesktopPrayerWorkspace
                      onAddPrayerReminder={() => openReminderForm(undefined, "prayer")}
                      onOpenMeeting={openMeetingDetail}
                      onOpenReminder={openReminderEdit}
                      onScheduleMeeting={() => openScheduleMeeting()}
                      onTabChange={setPrayerWorkspaceTab}
                      people={people}
                      prayerLogs={data.prayerLogs}
                      reminders={data.reminders}
                      tab={prayerWorkspaceTab}
                      upcomingMeetings={upcomingTableMeetings}
                    />
                  </>
                ) : null}

                {moreAppView === "fruit" ? (
                  <>
                    <div className="flex min-h-9 items-center">
                      <MoreBackButton onClick={() => setMoreAppView(null)} />
                    </div>
                    <TabHero
                      icon={<Icon name="fruit" size={20} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.matthew716}
                      subtitle="Activity, visible outcomes, and fruit forms."
                      title="Recognize the fruit."
                    />
                    <SegmentedTabs onChange={setFruitView} options={fruitViewTabs} value={fruitView} />

                    {fruitView === "activity" ? (
                      <section>
                        <SectionHeading title="Activity" />
                        {visibleFruitStories.length ? (
                          <>
                            <DesktopFruitStoriesTable onOpenActivity={setSelectedFruitActivity} stories={visibleFruitStories} />
                            <div className="grid gap-3 md:hidden">
                              {visibleFruitStories.slice(0, 9).map((story) => (
                                <RecentFruitStoryCard key={story.id} onOpen={() => setSelectedFruitActivity(story)} story={story} />
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="grid gap-3">
                            <SectionEmptyState
                              action={<CompactButton icon="fruit" onClick={() => setFruitView("forms")}>Open Forms</CompactButton>}
                              text="Testimonies, quick reviews, leader reviews, baptisms, new believers, reconciliation, and visible outcomes will appear here."
                              title="No fruit activity yet."
                            />
                          </div>
                        )}
                      </section>
                    ) : null}

                    {fruitView === "impact" ? (
                      <div className="space-y-4">
                        <section>
                          <SectionHeading title="Fruit Snapshot" />
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            {fruitSnapshotMetrics.map((metric) => (
                              <FruitSnapshotMetricCard key={metric.key} metric={metric} />
                            ))}
                          </div>
                        </section>
                        {visibleFruitStories.length ? (
                          <section>
                            <SectionHeading title="Recent Fruit" />
                            <div className="grid gap-2.5 md:grid-cols-3">
                              {visibleFruitStories.slice(0, 3).map((story) => (
                                <RecentFruitStoryCard compact key={story.id} onOpen={() => setSelectedFruitActivity(story)} story={story} />
                              ))}
                            </div>
                          </section>
                        ) : null}
                        <section>
                          <FruitBreakdownSection groups={fruitImpactOutcomeGroups} />
                        </section>
                        <MultiplicationTreeTeaser storyCount={visibleFruitStories.length} />
                      </div>
                    ) : null}

                    {fruitView === "forms" ? (
                      <section>
                        <SectionHeading title="Forms" />
                        <FruitFormsGrid
                          comingSoonMessage={fruitFormsNotice}
                          onOpenForm={handleComingSoonFruitForm}
                          quickReviewAction={quickReviewFruitFormAction}
                          testimonyReviewAction={testimonyReviewFruitFormAction}
                        />
                      </section>
                    ) : null}
                  </>
                ) : null}

                {moreAppView === "library" ? (
                  <>
                    <div className="flex min-h-9 items-center">
                      <MoreBackButton onClick={() => setMoreAppView(null)} />
                    </div>
                    <TabHero
                      icon={<BookOpen className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.secondPeter318}
                      subtitle="Resources for conversations, follow up, and discipleship."
                      title="Grow in truth."
                    />
                    <div className="space-y-6">
                      <LibrarySection title="Table Teachings">
                        <div className="grid gap-3">
                          <FeaturedTeachingCard
                            description={featuredTableTeaching.description}
                            href={featuredTableTeaching.href}
                            title={featuredTableTeaching.title}
                          />
                          {secondaryTableTeachings.map((teaching) => (
                            <TableTeachingRow
                              description={teaching.description}
                              href={teaching.href}
                              key={teaching.href}
                              title={teaching.title}
                            />
                          ))}
                        </div>
                      </LibrarySection>

                      <LibrarySection
                        title="Commands of Jesus"
                      >
                        <CatalogResourceList resources={dosCommandResourceItems} />
                      </LibrarySection>

                      <LibrarySection title="Relationships">
                        <CatalogResourceList resources={dosRelationshipResourceItems} />
                      </LibrarySection>

                      <LibrarySection title="Prayer">
                        <button
                          className="flex min-w-0 items-center gap-3 rounded-[24px] border border-[#DCEBFF] bg-white p-4 text-left shadow-[0_12px_30px_rgba(37,99,235,0.055)]"
                          onClick={openPrayerResourceLibrary}
                          type="button"
                        >
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#EBF2FF] text-[#2563EB]">
                            <Heart className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-[#0F172A]">Prayer Resources</span>
                            <span className="mt-1 block text-xs leading-5 text-[#64748B]">Identity, healing, relationships, freedom, and life challenges.</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" strokeWidth={1.8} />
                        </button>
                      </LibrarySection>
                    </div>
                  </>
                ) : null}

                {moreAppView === "in_season" ? (
                  <>
                    {/* TODO: Later rename the internal in_season app key after migration/route plan. */}
                    <TabPageHeader action={<MoreBackButton onClick={() => setMoreAppView(null)} />} title="Testimony Practice" />
                    <TabHero
                      icon={<Mic className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      subtitle="Practice sharing yours on camera and invite a coach to help you grow."
                      title="Everyone has a testimony."
                    />
                    <article className="rounded-[28px] border border-[#EAF2FF] bg-white p-5 shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
                      <h2 className="text-base font-black text-[#0F172A]">Coming soon</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                        Record or draft your testimony, practice it out loud, and get feedback before you share it.
                      </p>
                    </article>
                  </>
                ) : null}

                {moreAppView === "missionary_profile" ? (
                  <>
                    <TabPageHeader action={<MoreBackButton onClick={() => setMoreAppView(null)} />} title="Missionary Profile" />
                    <TabHero
                      icon={<User className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.secondPeter318}
                      subtitle="An optional USA Missionaries layer attached to this DOS workspace."
                      title="Workspace to profile."
                    />
                    <OrganizationStatusCard
                      application={usamApplication}
                      message={usamApplicationMessage}
                      onApply={openUsamApplicationSheet}
                      onCopyPublicLink={copyPublicProfileLink}
                      onViewStatus={viewUsamApplicationStatus}
                      publicProfileHref={data.workspace.publicProfileHref}
                    />
                    <LibrarySection title="Architecture">
                      <div className="rounded-[24px] border border-[#EAF2FF] bg-white p-4 text-sm leading-6 text-[#64748B] shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
                        <p className="font-bold text-[#0F172A]">DOS Workspace → Optional Missionary Layer</p>
                        <p className="mt-2">
                          Field, tables, prayer, fruit, and library stay in this DOS workspace. USA Missionaries can attach a public profile, prayer team, and support team to the same workspace after approval.
                        </p>
                      </div>
                    </LibrarySection>
                  </>
                ) : null}

                {moreAppView === "prayer_team" ? (
                  <>
                    <TabPageHeader action={<MoreBackButton onClick={() => setMoreAppView(null)} />} title="Prayer Team" />
                    <TabHero
                      icon={<HeartHandshake className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.hebrews1025}
                      subtitle="A USA Missionaries layer for public profile prayer partnership."
                      title="Invite covering."
                    />
                    <EmptyState
                      action={<CompactButton icon="people" onClick={() => openMoreApp("missionary_profile")}>View Missionary Profile</CompactButton>}
                      text={isMissionaryLayerActive ? "Prayer Team tools will connect to the public profile and partner list once this layer is expanded." : "Apply to USA Missionaries first. Admin approval turns this from an optional layer into an active profile tool."}
                      title={isMissionaryLayerActive ? "Prayer Team layer is available." : "Prayer Team waits for approval."}
                    />
                  </>
                ) : null}

                {moreAppView === "support_team" ? (
                  <>
                    <TabPageHeader action={<MoreBackButton onClick={() => setMoreAppView(null)} />} title="Support Team" />
                    <TabHero
                      icon={<Gift className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.secondPeter318}
                      subtitle="A USA Missionaries layer for giving goals and support partners."
                      title="Steward support."
                    />
                    <EmptyState
                      action={<CompactButton icon="people" onClick={() => openMoreApp("missionary_profile")}>View Missionary Profile</CompactButton>}
                      text={isMissionaryLayerActive ? "Support Team tools will use the existing workspace/profile relationship and support settings. No duplicate missionary account is needed." : "Apply to USA Missionaries first. Admin approval keeps support visibility from going live automatically."}
                      title={isMissionaryLayerActive ? "Support Team layer is available." : "Support Team waits for approval."}
                    />
                  </>
                ) : null}

                {moreAppView === "stewardship" ? (
                  <>
                    <TabPageHeader action={<MoreBackButton onClick={() => setMoreAppView(null)} />} title="Stewardship" />
                    <TabHero
                      icon={<Briefcase className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.luke1610}
                      subtitle="A future optional app for budgets, giving, and faithful management."
                      title="Coming soon."
                    />
                    <EmptyState text="Stewardship can be installed later without changing the DOS core workspace." title="Stewardship is not installed yet." />
                  </>
                ) : null}

                {/* TODO: Fold Table Flow into Table later as Guided Flow templates. */}
                {moreAppView === "table_flow" ? (
                  <>
                    <TabPageHeader action={<MoreBackButton onClick={() => setMoreAppView(null)} />} title="Table Flow" />
                    <TabHero
                      icon={<GitBranch className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.hebrews1025}
                      subtitle="A future optional app for guided table conversations and follow-up paths."
                      title="Coming soon."
                    />
                    <EmptyState text="Table Flow can become an installable guided conversation layer while Table remains the core capture flow." title="Table Flow is not installed yet." />
                  </>
                ) : null}

                {moreAppView === "reports" ? (
                  <>
                    <TabPageHeader action={<MoreBackButton onClick={() => setMoreAppView(null)} />} title="Reports" />
                    <TabHero
                      icon={<Megaphone className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                      onScriptureClick={openScriptureQuickView}
                      scripture={scriptureReferences.luke1610}
                      subtitle="Future analytics, multiplication reporting, state reporting, and dashboards."
                      title="Coming soon."
                    />
                    <section className="rounded-[22px] border border-[#DCEBFF] bg-white p-5 text-sm leading-6 text-[#334155] shadow-[0_12px_30px_rgba(37,99,235,0.05)]">
                      <p className="font-bold text-[#0F172A]">Reports are coming soon.</p>
                      <p className="mt-2 font-medium text-[#334155]">Reports are being built for leaders and teams. DOS stays focused on your next faithful step.</p>
                    </section>
                  </>
                ) : null}

                {moreAppView === "organizations" ? (
                  <>
                    <div className="space-y-5 md:hidden">
                      <TabPageHeader action={<MoreBackButton onClick={() => setMoreAppView(null)} />} title="Organizations" />
                      <TabHero
                        icon={<Briefcase className="h-5 w-5" aria-hidden="true" strokeWidth={1.9} />}
                        onScriptureClick={openScriptureQuickView}
                        scripture={scriptureReferences.secondPeter318}
                        subtitle="Manage optional organization connections without changing your DOS workspace."
                        title="Connected work."
                      />
                      <LibrarySection title="Connections">
                        <div className="grid gap-3">
                          {data.organizations.map((organization) => (
                            <OrganizationConnectionRow connection={organization} key={organization.id} />
                          ))}
                        </div>
                      </LibrarySection>
                      <OrganizationStatusCard
                        application={usamApplication}
                        message={usamApplicationMessage}
                        onApply={openUsamApplicationSheet}
                        onCopyPublicLink={copyPublicProfileLink}
                        onViewStatus={viewUsamApplicationStatus}
                        publicProfileHref={data.workspace.publicProfileHref}
                      />
                      {usamApplication.status === "active" || usamApplication.status === "approved" ? (
                        <section className="grid grid-cols-2 gap-2">
                          {[
                            ["Prayer Team", "Profile"],
                            ["Support Team", "Profile"],
                            ["Giving", "Draft"],
                            ["Profile", usamProfileStatusLabel(usamApplication.profileStatus)],
                          ].map(([label, value]) => (
                            <div className="rounded-[18px] border border-[#EAF2FF] bg-white px-3 py-3 shadow-[0_10px_26px_rgba(37,99,235,0.05)]" key={label}>
                              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#64748B]" style={{ fontFamily: font.rajdhani }}>{label}</p>
                              <p className="mt-1 text-sm font-bold text-[#0F172A]">{value}</p>
                            </div>
                          ))}
                        </section>
                      ) : null}
                    </div>
                    <DesktopOrganizationsView
                      application={usamApplication}
                      message={usamApplicationMessage}
                      onApply={openUsamApplicationSheet}
                      onBack={() => setMoreAppView(null)}
                      onCopyPublicLink={copyPublicProfileLink}
                      onScriptureClick={openScriptureQuickView}
                      onViewStatus={viewUsamApplicationStatus}
                      organizations={data.organizations}
                      publicProfileHref={data.workspace.publicProfileHref}
                    />
                  </>
                ) : null}
              </div>
            ) : null}
          </main>
        </div>

        {isCirclesOpen ? (
          <CirclesDetailOverlay
            circleGroups={circlePeopleByLayer}
            latestMeetingDateByPersonId={latestMeetingDateByPersonId}
            onBack={() => setIsCirclesOpen(false)}
            onLogMeeting={() => openForm("meeting")}
            onLogMeetingForPerson={openMeetingForPerson}
            onOpenPerson={openPersonDetail}
            onSearch={() => {
              setIsCirclesOpen(false);
              setActiveTab("people");
            }}
          />
        ) : null}

        {circleSheetView ? (
          <CircleLayerSheet
            activeCircle={circleSheetView}
            circleGroups={circlePeopleByLayer}
            latestMeetingDateByPersonId={latestMeetingDateByPersonId}
            onClose={() => setCircleSheetView(null)}
            onLogMeeting={() => openForm("meeting")}
            onLogMeetingForPerson={openMeetingForPerson}
            onOpenPerson={openPersonDetail}
          />
        ) : null}

        {selectedPerson ? (
            <PersonDetailOverlay
              answeredPrayerByReminderId={answeredPrayerByReminderId}
              calendarConnection={data.calendarConnection}
              fruitEvents={data.fruitEvents}
              fruitItems={data.fruit}
              index={Math.max(0, people.findIndex((person) => person.id === selectedPerson.id))}
              isCalendarDisconnecting={isCalendarDisconnecting}
              leaderReflections={data.leaderReflections}
              meetings={data.meetings}
              reminders={data.reminders}
            onBack={() => setSelectedPersonId(null)}
            onAddReminder={() => openReminderForm(selectedPerson.id)}
            onAddPrayerRequest={() => openReminderForm(selectedPerson.id, "prayer")}
            onDisconnectCalendar={handleDisconnectCalendar}
            onEdit={() => openPersonEdit(selectedPerson)}
            onEditReminder={openReminderEdit}
            onLogMeeting={() => openMeetingForPerson(selectedPerson.id)}
            onMarkPrayerAnswered={markPrayerReminderAnswered}
            onOpenMeeting={openMeetingDetail}
            onOpenPrayerResources={openPrayerResourceLibrary}
            onScheduleMeeting={() => openScheduleMeeting(selectedPerson.id)}
            participantReviews={data.participantReviews}
              participantTestimonies={data.participantTestimonies}
              person={selectedPerson}
              circleScore={scoreByPersonId.get(selectedPerson.id) ?? null}
              workspaceId={data.workspace.id}
            />
        ) : null}

        {selectedMeetingWithReview ? (
          <MeetingDetailOverlay
            fruitEvents={data.fruitEvents}
            hasReviewRequestLink={Boolean(existingReviewUrl(selectedMeetingWithReview))}
            hasTestimonyRequestLink={Boolean(existingTestimonyUrl(selectedMeetingWithReview))}
            isSendingReview={reviewLinkMeetingId === selectedMeetingWithReview.id}
            isSendingTestimony={testimonyLinkMeetingId === selectedMeetingWithReview.id}
            leaderReflections={data.leaderReflections}
            meeting={selectedMeetingWithReview}
            onBack={() => {
              setPostMeetingFollowUpId(null);
              setSelectedMeetingId(null);
            }}
            onDone={() => {
              setPostMeetingFollowUpId(null);
              setSelectedMeetingId(null);
              setActiveTab("meetings");
            }}
            onEdit={() => openMeetingEdit(selectedMeetingWithReview)}
            onEditNotes={() => openMeetingNotesEdit(selectedMeetingWithReview)}
            onPrepareQuickReview={() => setPendingMeetingSendAction({ meeting: selectedMeetingWithReview, type: "quick_review" })}
            onPrepareTestimonyRequest={() => {
              if (canSendMeetingTestimonyRequest(selectedMeetingWithReview, people)) {
                setPendingMeetingSendAction({ meeting: selectedMeetingWithReview, type: "testimony_request" });
              }
            }}
            onScheduleNextMeeting={() => openScheduleMeeting(selectedMeetingWithReview.fieldPersonIds)}
            onSendReview={() => handleSendReview(selectedMeetingWithReview)}
            onSendTestimony={() => handleShareTestimony(selectedMeetingWithReview)}
            participantReviews={data.participantReviews}
            participantTestimonies={data.participantTestimonies}
            people={people}
            reviewShareMessage={reviewShareMessage}
            showPostMeetingFollowUp={postMeetingFollowUpId === selectedMeetingWithReview.id}
            testimonyShareMessage={testimonyShareMessage}
          />
        ) : null}

        {selectedExternalCalendarEvent ? (
          <GoogleCalendarEventDetailSheet
            event={selectedExternalCalendarEvent}
            isAdding={isAddingExternalEventToDos}
            onAddToDos={handleAddExternalEventToDos}
            onClose={() => setSelectedExternalCalendarEventId(null)}
          />
        ) : null}

        {isProfileOpen ? (
          <ProfileSheet
            email={profileEmail}
            name={profileName}
            onClose={() => setIsProfileOpen(false)}
            onEditProfile={() => {
              setIsProfileOpen(false);
              setIsEditProfileOpen(true);
            }}
            onOpenCircles={() => {
              setIsProfileOpen(false);
              openPeopleCircle("three");
            }}
            photoUrl={data.workspace.profileImageUrl}
            workspaceName={workspaceName}
            workspaceSublabel={workspaceSublabel}
          />
        ) : null}

        {isEditProfileOpen ? (
          <EditProfileSheet
            email={profileEmail}
            name={profileName}
            onClose={() => setIsEditProfileOpen(false)}
            phone={profilePhone}
            workspaceName={workspaceName}
            workspaceSublabel={workspaceSublabel}
          />
        ) : null}

        {isPeopleImportOpen ? (
          <PeopleImportSheet
            existingPeople={people}
            onClose={() => setIsPeopleImportOpen(false)}
            onImport={handlePeopleImport}
          />
        ) : null}

        {isUsamApplicationOpen ? (
          <UsamApplicationSheet
            draft={usamApplicationDraft}
            errorMessage={errorMessage}
            isSubmitting={isSubmittingUsamApplication}
            onChange={updateUsamApplicationDraft}
            onClose={closeUsamApplicationSheet}
            onSubmit={handleUsamApplicationSubmit}
          />
        ) : null}

        {selectedScripture ? (
          <ScriptureQuickView onClose={() => setSelectedScripture(null)} state={selectedScripture} />
        ) : null}

        {pendingMeetingSendAction ? (
          <MeetingSendConfirmationSheet
            action={pendingMeetingSendAction}
            isSending={
              pendingMeetingSendAction.type === "quick_review"
                ? reviewLinkMeetingId === pendingMeetingSendAction.meeting.id
                : testimonyLinkMeetingId === pendingMeetingSendAction.meeting.id
            }
            onClose={() => setPendingMeetingSendAction(null)}
            onConfirm={handleConfirmMeetingSendAction}
            people={people}
          />
        ) : null}

        {isPrayerResourceLibraryOpen ? (
          <PrayerResourcesLibrarySheet
            activeCategory={prayerResourceCategory}
            onCategoryChange={setPrayerResourceCategory}
            onClose={() => {
              setIsPrayerResourceLibraryOpen(false);
              setPrayerResourceSearchQuery("");
            }}
            onOpenResource={openPrayerResource}
            onQueryChange={setPrayerResourceSearchQuery}
            query={prayerResourceSearchQuery}
          />
        ) : null}

        {selectedPrayerResource ? (
          <PrayerResourceDetailSheet
            fallbackUrl={prayerResourceFallbackUrl}
            message={prayerResourceMessage}
            onClose={() => {
              setSelectedPrayerResourceSlug(null);
              setPrayerResourceMessage("");
              setPrayerResourceFallbackUrl("");
            }}
            onPrayNow={() => setPrayerResourceMessage("Pray through the prayer below, then use the reflection questions to listen together.")}
            onSaveToFollowUp={() => savePrayerResourceToFollowUp(selectedPrayerResource)}
            onSendLink={() => sendPrayerResourceLink(selectedPrayerResource)}
            publicHref={prayerResourcePublicHref(selectedPrayerResource)}
            resource={selectedPrayerResource}
          />
        ) : null}

        {selectedFruitActivity ? (
          <FruitActivityDetailSheet
            onClose={() => setSelectedFruitActivity(null)}
            onOpenPerson={(personId) => {
              setSelectedFruitActivity(null);
              openPersonDetail(personId);
            }}
            story={selectedFruitActivity}
          />
        ) : null}

        {selectedFruitFormPreviewKey ? (
          <FruitFormPreviewSheet
            formKey={selectedFruitFormPreviewKey}
            onClose={() => setSelectedFruitFormPreviewKey(null)}
          />
        ) : null}

        {isResourcePickerOpen ? (
          <ResourcePickerSheet
            message={resourcePickerMessage}
            onClose={() => {
              setIsResourcePickerOpen(false);
              setResourcePickerMessage("");
            }}
            onSelectResource={prepareResourceToSend}
          />
        ) : null}

        <BottomNavigation activeTab={activeTab} onSelect={selectTab} />
        {showMobileFloatingActions ? (
          <MobileFloatingActions
            isOpen={isMobileActionSheetOpen}
            items={mobileFloatingActionItems}
            onClose={() => setIsMobileActionSheetOpen(false)}
            onToggle={() => setIsMobileActionSheetOpen((current) => !current)}
          />
        ) : null}
      </div>

      {isUpcomingSheetOpen ? (
        <Sheet onClose={() => setIsUpcomingSheetOpen(false)} showEyebrow={false} title="Upcoming">
          <div className="max-h-[68dvh] overflow-y-auto pr-1 [scrollbar-width:none]">
            <div className="grid gap-2">
              {upcomingTimelineItems.length ? upcomingTimelineItems.map((item) => (
                <UpcomingTimelineRow
                  item={item}
                  key={item.id}
                  onEditReminder={(reminderId) => {
                    setIsUpcomingSheetOpen(false);
                    openReminderEdit(reminderId);
                  }}
                  onOpenMeeting={(meetingId) => {
                    setIsUpcomingSheetOpen(false);
                    openMeetingDetail(meetingId);
                  }}
                />
              )) : (
                <EmptyState text="No next steps queued. Ask the Lord who to encourage next." title="Nothing upcoming." />
              )}
            </div>
          </div>
        </Sheet>
      ) : null}

      {isActivitySheetOpen ? (
        <Sheet onClose={() => setIsActivitySheetOpen(false)} showEyebrow={false} title="Activity">
          <div className="max-h-[68dvh] overflow-y-auto pr-1 [scrollbar-width:none]">
            <div className="grid gap-2">
              {homeActivityItems.length ? homeActivityItems.map((item) => (
                <HomeActivitySheetRow item={item} key={item.id} onClick={() => openHomeActivityItem(item)} />
              )) : (
                <EmptyState text="Log a table to begin your activity rhythm." title="No activity yet." />
              )}
            </div>
          </div>
        </Sheet>
      ) : null}

      {isTableSearchOpen ? (
        <Sheet onClose={() => setIsTableSearchOpen(false)} showEyebrow={false} title="Search Tables">
          <div className="space-y-4">
            <TableSearchBar onChange={setTableQuery} query={tableQuery} resultCount={tableResultCount} />
            <AppButton onClick={() => setIsTableSearchOpen(false)} tone="black">Done</AppButton>
          </div>
        </Sheet>
      ) : null}

      {formMode === "person" ? (
        <Sheet onClose={closeForm} showEyebrow={false} title="Add Person">
          <PersonFormContent
            buttonText="Add Person"
            detailsOpen={isAdditionalPersonInfoOpen}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            onRelationshipChange={setSelectedRelationshipModel}
            onScoreChange={setSelectedRelationshipScore}
            onSubmit={handlePersonSubmit}
            onToggleDetails={() => setIsAdditionalPersonInfoOpen((current) => !current)}
            relationshipModel={selectedRelationshipModel}
            scoreValue={selectedRelationshipScore}
            submittingText="Saving..."
          />
        </Sheet>
      ) : null}

      {formMode === "editPerson" && selectedPerson ? (
        <Sheet onClose={closeForm} showEyebrow={false} title="Edit Person">
          <PersonFormContent
            additionalDefaults={selectedPersonDefaults}
            buttonText="Save Person"
            detailsOpen={isAdditionalPersonInfoOpen}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            nameDefault={selectedPerson.name}
            onDelete={handleDeletePerson}
            onRelationshipChange={setSelectedRelationshipModel}
            onScoreChange={setSelectedRelationshipScore}
            onSubmit={handleEditPersonSubmit}
            onToggleDetails={() => setIsAdditionalPersonInfoOpen((current) => !current)}
            phoneDefault={selectedPerson.phone}
            relationshipModel={selectedRelationshipModel}
            scoreValue={selectedRelationshipScore}
            showDetailsToggle={false}
            submittingText="Saving..."
          />
        </Sheet>
      ) : null}

      {formMode === "meeting" ? (
        <Sheet onClose={closeForm} title="Log Table">
          <MeetingFormContent
            allPeople={people}
            allowConversationFlows={data.workspace.isUsamWorkspace}
            buttonText="Log Table"
            conversationResponses={conversationResponses}
            dateDefault={todayDateValue()}
            errorMessage={errorMessage}
            includeReflectionFields
            isCreatingPerson={isCreatingMeetingPerson}
            isSubmitting={isSubmitting}
            meetingPeopleOptions={meetingPeopleOptions}
            meetingPeopleQuery={meetingPeopleQuery}
            onContextChange={setSelectedMeetingContext}
            onCreatePerson={handleCreateMeetingPerson}
            onConversationFlowChange={handleConversationFlowChange}
            onConversationResponse={handleConversationResponse}
            onPeopleQueryChange={setMeetingPeopleQuery}
            onSubmit={handleMeetingSubmit}
            onToggleFollowUpAction={handleConversationFollowUpAction}
            onToggleOutcomeTag={toggleOutcomeTag}
            onTogglePerson={toggleMeetingPersonId}
            recommendedResources={draftRecommendedResources}
            selectedConversationFlow={selectedConversationFlow}
            selectedMeetingContext={selectedMeetingContext}
            selectedOutcomeTags={selectedOutcomeTags}
            selectedPersonIds={selectedMeetingPersonIds}
            showDurationField
            submittingText="Saving..."
          />
        </Sheet>
      ) : null}

      {formMode === "scheduleMeeting" ? (
        <Sheet onClose={closeForm} showEyebrow={false} title="Schedule Table">
          <ScheduleMeetingForm
            allPeople={people}
            calendarConnection={data.calendarConnection}
            errorMessage={errorMessage}
            isCalendarDisconnecting={isCalendarDisconnecting}
            isCreatingPerson={isCreatingMeetingPerson}
            isSubmitting={isSubmitting}
            meetingPeopleOptions={meetingPeopleOptions}
            meetingPeopleQuery={meetingPeopleQuery}
            onContextChange={setSelectedMeetingContext}
            onCreatePerson={handleCreateMeetingPerson}
            onDisconnectCalendar={handleDisconnectCalendar}
            onPeopleQueryChange={setMeetingPeopleQuery}
            onStartLogMeeting={openScheduledDraftAsMeeting}
            onSubmit={handleScheduleMeetingSubmit}
            onTogglePerson={toggleMeetingPersonId}
            selectedMeetingContext={selectedMeetingContext}
            selectedPersonIds={selectedMeetingPersonIds}
            workspaceId={data.workspace.id}
          />
        </Sheet>
      ) : null}

      {formMode === "reminder" ? (
        <Sheet onClose={closeForm} showEyebrow={false} title={selectedReminder ? "Edit Reminder" : "Add Reminder"}>
          <ReminderFormContent
            calendarConnection={data.calendarConnection}
            defaultPersonId={selectedMeetingPersonIds[0] ?? selectedPerson?.id ?? null}
            defaultReminderType={newReminderType}
            errorMessage={errorMessage}
            householdPerson={selectedReminder ? people.find((person) => person.id === selectedReminder.personId) ?? null : selectedPerson}
            isCalendarDisconnecting={isCalendarDisconnecting}
            isSubmitting={isSubmitting}
            onDelete={selectedReminder ? handleDeleteReminder : undefined}
            onDisconnectCalendar={handleDisconnectCalendar}
            onSubmit={handleReminderSubmit}
            people={people}
            reminder={selectedReminder}
            workspaceId={data.workspace.id}
          />
        </Sheet>
      ) : null}

      {formMode === "editMeeting" && selectedMeeting ? (
        <Sheet onClose={closeForm} title="Edit Table">
          <div className="space-y-3">
            <MeetingFormContent
              allPeople={people}
              allowConversationFlows={data.workspace.isUsamWorkspace}
              buttonText="Save Table"
              conversationResponses={conversationResponses}
              dateDefault={selectedMeeting.date ?? todayDateValue()}
              errorMessage={errorMessage}
              isCreatingPerson={isCreatingMeetingPerson}
              isSubmitting={isSubmitting}
              meetingPeopleOptions={meetingPeopleOptions}
              meetingPeopleQuery={meetingPeopleQuery}
              notesDefault={selectedMeeting.notes}
              onContextChange={setSelectedMeetingContext}
              onCreatePerson={handleCreateMeetingPerson}
              onConversationFlowChange={handleConversationFlowChange}
              onConversationResponse={handleConversationResponse}
              onPeopleQueryChange={setMeetingPeopleQuery}
              onSubmit={handleEditMeetingSubmit}
              onToggleFollowUpAction={handleConversationFollowUpAction}
              onTogglePerson={toggleMeetingPersonId}
              recommendedResources={draftRecommendedResources}
              selectedConversationFlow={selectedConversationFlow}
              selectedMeetingContext={selectedMeetingContext}
              selectedPersonIds={selectedMeetingPersonIds}
              submittingText="Saving..."
            />
            <button
              className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handleDeleteMeeting}
              type="button"
            >
              Delete Table
            </button>
          </div>
        </Sheet>
      ) : null}

      {formMode === "meetingNotes" && selectedMeeting ? (
        <MeetingNotesEditorSheet
          defaultValue={selectedMeeting.notes}
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          onClose={closeForm}
          onSubmit={handleMeetingNotesSubmit}
        />
      ) : null}

      {formMode === "fruit" ? (
        <Sheet description="Record what changed. This starts private for review." onClose={closeForm} title="Record Fruit">
          <form className="space-y-4" onSubmit={handleFruitSubmit}>
            <label className="block">
              <FieldLabel>Summary</FieldLabel>
              <textarea className={`${FieldInputClass()} min-h-24 py-3`} name="summary" placeholder="Short private summary of the fruit." required />
            </label>
            <label className="block">
              <FieldLabel>Date</FieldLabel>
              <input className={FieldInputClass()} defaultValue={todayDateValue()} name="testimony_date" type="date" />
            </label>
            <FormOptionSelect
              label="Linked Person"
              name="field_person_id"
              options={[
                { label: "Not linked", value: "" },
                ...people.map((person) => ({
                  helper: relationshipLine(person),
                  label: person.name,
                  value: person.id,
                })),
              ]}
            />
            <div>
              <FieldLabel>Outcome Tags</FieldLabel>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {outcomeTagOptions.map((tag) => {
                  const selected = selectedOutcomeTags.includes(tag);

                  return (
                    <button
                      aria-pressed={selected}
                      className={`min-h-11 rounded-2xl border px-3 text-left text-xs font-semibold ${
                        selected ? "border-[#2563EB] bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] text-white" : "border-[#E2E8F0] bg-white text-[#0F172A]"
                      }`}
                      key={tag}
                      onClick={() => toggleOutcomeTag(tag)}
                      type="button"
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            {errorMessage ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
            <AppButton disabled={isSubmitting} tone="black" type="submit">{isSubmitting ? "Saving..." : "Record Fruit"}</AppButton>
          </form>
        </Sheet>
      ) : null}
    </div>
  );
}
