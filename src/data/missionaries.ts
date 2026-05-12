export type MissionaryCategory = "Missionaries" | "State Directors" | "Regional Leaders" | "Support Team";
export type MissionaryRoleTag =
  | "MISSIONARY COUPLE"
  | "MISSIONARY"
  | "STATE LEADER"
  | "REGIONAL LEADER"
  | "NATIONAL LEADER"
  | "PRAYER TEAM"
  | "SUPPORT TEAM";
export type MissionaryFunctionTag =
  | "LEADERSHIP"
  | "OPERATIONS"
  | "ADMIN"
  | "TRAINING"
  | "EVANGELISM"
  | "DISCIPLESHIP";

export type MissionaryFunding = {
  annualGoal: number;
  monthlyGoal: number;
  monthlyCommitted: number;
  receivedAnnual: number;
  receivedMonthly: number;
  committedAnnual: number;
  committedMonthly: number;
  goalLabel: string;
  goalBasis: string;
};

export type MissionarySupportMode =
  | "household"
  | "general_fund"
  | "state_leader"
  | "regional_leader"
  | "national_leadership"
  | "household_nomination"
  | "hidden";

export type MissionaryProfileFeatures = {
  showHousehold: boolean;
  showPhotos: boolean;
  showTeam: boolean;
  showStory: boolean;
  showFruit: boolean;
  showSupport: boolean;
  showPrayer: boolean;
};

export type MissionarySupportRouting = {
  mode: MissionarySupportMode;
  targetHouseholdId?: string | null;
  targetHouseholdName?: string | null;
  targetFund?: string | null;
  publicLabel?: string | null;
  buttonLabel?: string | null;
  explanation?: string | null;
  monthlyGivingUrl?: string | null;
  oneTimeGivingUrl?: string | null;
  monthlyButtonLabel?: string | null;
  oneTimeButtonLabel?: string | null;
  majorGiftButtonLabel?: string | null;
  enableMajorGiftInquiry?: boolean | null;
  flyerHeadline?: string | null;
  flyerNote?: string | null;
  flyerPrayerAsk?: string | null;
  flyerSupportAppeal?: string | null;
  majorGiftNotifyEmail?: string | null;
  majorGiftPublicDescription?: string | null;
};

export type MissionaryPrayerSettings = {
  ctaLabel?: string | null;
  destination?: string | null;
  enablePrayerTeam?: boolean | null;
  headline?: string | null;
  description?: string | null;
};

export type MissionaryPrayerRequest = {
  id: string;
  title: string;
  description: string;
  category?: string | null;
  date: string;
  visibility: "public" | "team";
};

// Profiles (PF) consume only approved Fruit records. Raw Encounters stay in
// Command Center review and are never rendered by public profile components.
export type MissionaryFruitItem = {
  id: string;
  title?: string | null;
  body: string;
  category?: string | null;
  testimonyDate?: string | null;
  submittedByName?: string | null;
  source: "website_admin" | "dos" | "public_form";
  sourceApp?: string | null;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
};

// Team is a public-facing roster surface only. Do not model disciples,
// follow-up relationships, or ministry network edges with household members.
export type MissionaryHouseholdMember = {
  displayName: string;
  dosUserId?: string | null;
  publicNumber?: string | null;
  roleTitle?: string | null;
  shortDescription?: string | null;
  sortOrder?: number | null;
};

export type Missionary = {
  id: string;
  missionaryNumber: string;
  slug: string;
  name: string;
  role: string;
  category: MissionaryCategory;
  location: string;
  locationLine: string;
  statement: string;
  funding: MissionaryFunding;
  activeDisciples: number;
  tableMeetings: number;
  peopleReached: number;
  newDisciples: number;
  commitments: number;
  needs: readonly string[];
  image: string;
  roleTags: readonly MissionaryRoleTag[];
  functionTags?: readonly MissionaryFunctionTag[];
  heroImage?: string;
  headerImage?: string;
  householdMembers?: readonly MissionaryHouseholdMember[];
  story?: string;
  fruitFromField?: string;
  features?: MissionaryProfileFeatures;
  supportRouting?: MissionarySupportRouting;
  prayerSettings?: MissionaryPrayerSettings;
  fruitItems?: readonly MissionaryFruitItem[];
  supportEnabled?: boolean;
  prayerRequests?: readonly MissionaryPrayerRequest[];
};

// Future: replace static missionary data with approved Supabase Profile data.
export const missionaries: readonly Missionary[] = [
  {
    id: "001",
    missionaryNumber: "001",
    slug: "ryan-brooke-fox",
    name: "Ryan & Brooke Fox",
    role: "Minnesota Missionaries",
    category: "Missionaries",
    location: "Minnesota",
    locationLine: "Based in Minnesota | Serving Nationwide",
    statement: "Reaching the lost. Making disciples. Multiplying across America.",
    funding: {
      annualGoal: 87000,
      monthlyGoal: 7250,
      monthlyCommitted: 2100,
      receivedAnnual: 25200,
      receivedMonthly: 2100,
      committedAnnual: 25200,
      committedMonthly: 2100,
      goalLabel: "Annual Goal",
      goalBasis: "Based on the median household income in Lakeville, Minnesota.",
    },
    activeDisciples: 24,
    tableMeetings: 18,
    peopleReached: 84,
    newDisciples: 12,
    commitments: 7,
    needs: ["3 Monthly Partners ($200/mo)", "Outreach Trip ($2,500)", "Camper Buildout"],
    image: "/fox-family.png",
    roleTags: ["MISSIONARY COUPLE", "STATE LEADER"],
    functionTags: ["LEADERSHIP"],
    heroImage: "/fox-family-no-background.png",
    headerImage: "/fox-family.png",
    supportEnabled: true,
  },
  {
    id: "008",
    missionaryNumber: "008",
    slug: "dirk-julia-bond",
    name: "Dirk & Julia Bond",
    role: "Missionary Couple",
    category: "Missionaries",
    location: "United States",
    locationLine: "Based in the United States | Serving Nationwide",
    statement: "Serving families, tables, and communities with the Gospel through faithful discipleship.",
    funding: {
      annualGoal: 87000,
      monthlyGoal: 7250,
      monthlyCommitted: 1450,
      receivedAnnual: 17400,
      receivedMonthly: 1450,
      committedAnnual: 17400,
      committedMonthly: 1450,
      goalLabel: "Annual Goal",
      goalBasis: "Based on current annual ministry support needs.",
    },
    activeDisciples: 8,
    tableMeetings: 6,
    peopleReached: 32,
    newDisciples: 4,
    commitments: 2,
    needs: ["Monthly Partners", "Table Outreach", "Travel Support"],
    image: "/usa-outline-clean.png",
    roleTags: ["MISSIONARY COUPLE"],
    functionTags: [],
    supportEnabled: false,
  },
  {
    id: "010",
    missionaryNumber: "010",
    slug: "doug-robbie-wooten",
    name: "Doug & Robbie Wooten",
    role: "Missionary Couple",
    category: "Missionaries",
    location: "United States",
    locationLine: "Based in the United States | Serving Nationwide",
    statement: "Reaching people with the Gospel and walking with new disciples as they follow Jesus.",
    funding: {
      annualGoal: 87000,
      monthlyGoal: 7250,
      monthlyCommitted: 2175,
      receivedAnnual: 26100,
      receivedMonthly: 2175,
      committedAnnual: 26100,
      committedMonthly: 2175,
      goalLabel: "Annual Goal",
      goalBasis: "Based on current annual ministry support needs.",
    },
    activeDisciples: 10,
    tableMeetings: 7,
    peopleReached: 40,
    newDisciples: 5,
    commitments: 3,
    needs: ["Monthly Partners", "Discipleship Materials", "Hospitality Support"],
    image: "/usa-outline-clean.png",
    roleTags: ["MISSIONARY COUPLE"],
    functionTags: [],
    supportEnabled: false,
  },
  {
    id: "012",
    missionaryNumber: "012",
    slug: "ted-donna-landgraf",
    name: "Ted & Donna Landgraf",
    role: "Missionary Couple",
    category: "Missionaries",
    location: "United States",
    locationLine: "Based in the United States | Serving Nationwide",
    statement: "Opening doors for prayer, repentance, and discipleship through relational ministry.",
    funding: {
      annualGoal: 87000,
      monthlyGoal: 7250,
      monthlyCommitted: 2900,
      receivedAnnual: 34800,
      receivedMonthly: 2900,
      committedAnnual: 34800,
      committedMonthly: 2900,
      goalLabel: "Annual Goal",
      goalBasis: "Based on current annual ministry support needs.",
    },
    activeDisciples: 12,
    tableMeetings: 9,
    peopleReached: 48,
    newDisciples: 6,
    commitments: 4,
    needs: ["Monthly Partners", "Outreach Support", "Travel Support"],
    image: "/usa-outline-clean.png",
    roleTags: ["MISSIONARY COUPLE"],
    functionTags: [],
    supportEnabled: false,
  },
  {
    id: "014",
    missionaryNumber: "014",
    slug: "rich-laura-lucas",
    name: "Rich & Laura Lucas",
    role: "Missionary Couple",
    category: "Missionaries",
    location: "United States",
    locationLine: "Based in the United States | Serving Nationwide",
    statement: "Helping people encounter Jesus and grow into disciple-makers in everyday life.",
    funding: {
      annualGoal: 87000,
      monthlyGoal: 7250,
      monthlyCommitted: 1813,
      receivedAnnual: 21750,
      receivedMonthly: 1813,
      committedAnnual: 21750,
      committedMonthly: 1813,
      goalLabel: "Annual Goal",
      goalBasis: "Based on current annual ministry support needs.",
    },
    activeDisciples: 9,
    tableMeetings: 8,
    peopleReached: 36,
    newDisciples: 5,
    commitments: 3,
    needs: ["Monthly Partners", "Community Outreach", "Training Support"],
    image: "/usa-outline-clean.png",
    roleTags: ["MISSIONARY COUPLE"],
    functionTags: [],
    supportEnabled: false,
  },
  {
    id: "016",
    missionaryNumber: "016",
    slug: "lyf-tammie-nimmo",
    name: "Lyf & Tammie Nimmo",
    role: "Missionary Couple",
    category: "Missionaries",
    location: "United States",
    locationLine: "Based in the United States | Serving Nationwide",
    statement: "Multiplying the mission through table ministry, prayer, and faithful follow-up.",
    funding: {
      annualGoal: 87000,
      monthlyGoal: 7250,
      monthlyCommitted: 1088,
      receivedAnnual: 13050,
      receivedMonthly: 1088,
      committedAnnual: 13050,
      committedMonthly: 1088,
      goalLabel: "Annual Goal",
      goalBasis: "Based on current annual ministry support needs.",
    },
    activeDisciples: 7,
    tableMeetings: 5,
    peopleReached: 28,
    newDisciples: 4,
    commitments: 1,
    needs: ["Monthly Partners", "Table Meetings", "Discipleship Support"],
    image: "/usa-outline-clean.png",
    roleTags: ["MISSIONARY COUPLE"],
    functionTags: [],
    supportEnabled: false,
  },
];

export function getMissionaryBySlug(slug: string) {
  return missionaries.find((missionary) => missionary.slug === slug);
}
