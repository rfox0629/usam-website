import { createClient } from "@supabase/supabase-js";
import {
  getMissionaryBySlug,
  missionaries,
  type Missionary,
  type MissionaryFruitItem,
  type MissionaryFunctionTag,
  type MissionaryPrayerRequest,
  type MissionaryRoleTag,
  type MissionarySupportMode,
} from "@/src/data/missionaries";
import {
  normalizeLocationVisibility,
  normalizeMinistryRegion,
  normalizePrimaryState,
  roleTypeLabel,
  normalizeServingScope,
  profileLocationLine,
  normalizeRoleType,
} from "@/src/lib/missionaries/location";
import { normalizeSupportRoutingMode } from "@/src/lib/missionaries/support-routing";
import { createSupabaseServerClient, isSupabaseServerConfigured } from "@/src/lib/supabase/server";

const roleTags = [
  "MISSIONARY COUPLE",
  "MISSIONARY",
  "STATE LEADER",
  "REGIONAL LEADER",
  "NATIONAL LEADER",
  "PRAYER TEAM",
  "SUPPORT TEAM",
] as const satisfies readonly MissionaryRoleTag[];

const functionTags = [
  "LEADERSHIP",
  "OPERATIONS",
  "ADMIN",
  "TRAINING",
  "EVANGELISM",
  "DISCIPLESHIP",
] as const satisfies readonly MissionaryFunctionTag[];

const directoryImageFallback = "/fox-family.png";
const householdBaseSelect = "id, slug, display_name, location, profile_image_url, hero_image_url, short_mission, story, public_visible, sort_order";
const householdFeatureSelect = [
  "show_household",
  "show_photos",
  "show_team",
  "show_story",
  "show_fruit",
  "show_support",
  "show_prayer",
  "fruit_from_field",
  "public_story",
  "support_mode",
  "support_target_household_id",
  "support_target_fund",
  "support_public_label",
  "support_button_label",
  "support_explanation",
  "prayer_cta_label",
  "prayer_destination",
  "enable_prayer_team",
  "prayer_section_headline",
  "prayer_section_description",
  "primary_state",
  "serving_scope",
  "secondary_states",
  "region",
  "role_type",
  "custom_serving_label",
  "location_visibility",
].join(", ");
const householdProfileSelect = `${householdBaseSelect}, ${householdFeatureSelect}`;
const supportSettingsBaseSelect = "show_support, annual_goal, monthly_goal, monthly_committed, monthly_received, general_fund_percentage, goal_basis";
const supportSettingsFullSelect = `${supportSettingsBaseSelect}, monthly_giving_url, one_time_giving_url, monthly_button_label, one_time_button_label, major_gift_button_label, enable_monthly_partnership, enable_one_time_gift, enable_major_gift_inquiry, monthly_support_description, one_time_support_description, major_gift_notify_email, major_gift_public_description, flyer_headline, flyer_support_appeal, flyer_prayer_ask, flyer_note`;

type HouseholdRow = {
  id: string;
  slug: string;
  display_name: string;
  location: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  short_mission: string | null;
  story: string | null;
  public_story?: string | null;
  public_visible: boolean | null;
  sort_order: number | null;
  show_household?: boolean | null;
  show_photos?: boolean | null;
  show_team?: boolean | null;
  show_story?: boolean | null;
  show_fruit?: boolean | null;
  show_support?: boolean | null;
  show_prayer?: boolean | null;
  primary_state?: string | null;
  serving_scope?: string | null;
  secondary_states?: string[] | null;
  region?: string | null;
  role_type?: string | null;
  custom_serving_label?: string | null;
  location_visibility?: string | null;
  fruit_from_field?: string | null;
  support_mode?: string | null;
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

type PersonRow = {
  missionary_number: string;
  first_name: string;
  last_name: string | null;
  role: string | null;
  sort_order: number | null;
};

type TagRow = {
  tag: string;
  tag_type: "role" | "function";
};

// Team rows are public roster entries for Profiles (PF), not discipleship or
// follow-up relationships.
type TeamMemberRow = {
  display_name: string;
  dos_user_id: string | null;
  id: string;
  is_public: boolean | null;
  public_number: string | null;
  role_title: string | null;
  short_description: string | null;
  sort_order: number | null;
  status: "active" | "hidden" | "archived";
};

type SupportSettingsRow = {
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
  enable_monthly_partnership?: boolean | null;
  enable_one_time_gift?: boolean | null;
  enable_major_gift_inquiry?: boolean | null;
  monthly_support_description?: string | null;
  one_time_support_description?: string | null;
  flyer_headline?: string | null;
  flyer_note?: string | null;
  flyer_prayer_ask?: string | null;
  flyer_support_appeal?: string | null;
  major_gift_notify_email?: string | null;
  major_gift_public_description?: string | null;
};

type DirectoryHouseholdRow = HouseholdRow & {
  missionary_people?: PersonRow[] | null;
  missionary_tags?: TagRow[] | null;
};

type SupportTargetHouseholdRow = {
  id: string;
  display_name: string;
  show_household?: boolean | null;
  slug: string;
};

type PrayerRequestRow = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  visibility: "public" | "team" | "private";
  created_at: string;
};

// Fruit is the structured output layer. Public profile queries must read only
// approved Fruit rows and must never expose raw missionary_encounters records.
type FruitItemRow = {
  id: string;
  title: string | null;
  body: string;
  category: string | null;
  testimony_date: string | null;
  submitted_by_name: string | null;
  source: "website_admin" | "dos" | "public_form";
  source_app: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  created_at: string;
};

export type MissionaryHouseholdDirectoryRow = {
  id: string;
  slug: string;
  display_name: string;
  location: string | null;
  profile_image_url: string | null;
  show_household?: boolean | null;
  show_photos?: boolean | null;
  primary_state?: string | null;
  serving_scope?: string | null;
  secondary_states?: string[] | null;
  region?: string | null;
  role_type?: string | null;
  custom_serving_label?: string | null;
  location_visibility?: string | null;
  missionary_people?: Array<{
    missionary_number: string;
  }> | null;
  missionary_tags?: Array<{
    tag: string;
    tag_type: "role" | "function";
  }> | null;
};

export type MissionaryHouseholdsResult = {
  connected: boolean;
  data: MissionaryHouseholdDirectoryRow[];
  error: string | null;
};

function isRoleTag(tag: string): tag is MissionaryRoleTag {
  return roleTags.includes(tag as MissionaryRoleTag);
}

function isFunctionTag(tag: string): tag is MissionaryFunctionTag {
  return functionTags.includes(tag as MissionaryFunctionTag);
}

function sortPeople(people: readonly PersonRow[] = []) {
  return [...people].sort((first, second) => {
    return first.missionary_number.localeCompare(second.missionary_number, undefined, { numeric: true });
  });
}

function mapTags(tags: readonly TagRow[] = []) {
  return tags.reduce(
    (acc, tagRow) => {
      if (tagRow.tag_type === "role" && isRoleTag(tagRow.tag)) {
        acc.roleTags.push(tagRow.tag);
      }

      if (tagRow.tag_type === "function" && isFunctionTag(tagRow.tag)) {
        acc.functionTags.push(tagRow.tag);
      }

      return acc;
    },
    { functionTags: [] as MissionaryFunctionTag[], roleTags: [] as MissionaryRoleTag[] },
  );
}

function getCategoryFromTags(tags: readonly MissionaryRoleTag[]): Missionary["category"] {
  if (tags.includes("STATE LEADER")) {
    return "State Directors";
  }

  if (tags.includes("REGIONAL LEADER") || tags.includes("NATIONAL LEADER")) {
    return "Regional Leaders";
  }

  if (tags.includes("SUPPORT TEAM") || tags.includes("PRAYER TEAM")) {
    return "Support Team";
  }

  return "Missionaries";
}

function toDisplayRole(tags: readonly MissionaryRoleTag[]) {
  return tags.length > 0 ? tags.join(" / ") : "Missionary";
}

function toFunding(support?: SupportSettingsRow | null): Missionary["funding"] {
  const annualGoal = support?.annual_goal ?? 0;
  const monthlyGoal = support?.monthly_goal ?? 0;
  const monthlyCommitted = support?.monthly_committed ?? 0;
  const receivedMonthly = support?.monthly_received ?? 0;

  return {
    annualGoal,
    monthlyGoal,
    monthlyCommitted,
    receivedAnnual: receivedMonthly * 12,
    receivedMonthly,
    committedAnnual: monthlyCommitted * 12,
    committedMonthly: monthlyCommitted,
    goalLabel: "Annual Goal",
    goalBasis: support?.goal_basis ?? "",
  };
}

function toPublicImageSource(value: string | null | undefined, fallback: string) {
  const imageSource = value?.trim();

  if (!imageSource) {
    return fallback;
  }

  if (imageSource.startsWith("/") || /^https?:\/\//.test(imageSource)) {
    return imageSource;
  }

  return fallback;
}

function toOptionalPublicImageSource(value: string | null | undefined) {
  const imageSource = value?.trim();

  if (!imageSource) {
    return undefined;
  }

  return imageSource.startsWith("/") || /^https?:\/\//.test(imageSource)
    ? imageSource
    : undefined;
}

function isEnabledByDefault(value: boolean | null | undefined) {
  return value !== false;
}

function isHouseholdPubliclyVisible(household: { show_household?: boolean | null }) {
  return isEnabledByDefault(household.show_household);
}

function toSupportMode(value: string | null | undefined): MissionarySupportMode {
  return normalizeSupportRoutingMode(value) as MissionarySupportMode;
}

function hasMissingFeatureColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return [
    "show_household",
    "show_photos",
    "show_team",
    "show_story",
    "show_fruit",
    "show_support",
    "show_prayer",
    "primary_state",
    "serving_scope",
    "secondary_states",
    "region",
    "role_type",
    "custom_serving_label",
    "location_visibility",
    "fruit_from_field",
    "support_mode",
    "support_target_household_id",
    "support_target_fund",
    "support_public_label",
    "support_button_label",
    "support_explanation",
    "prayer_cta_label",
    "prayer_destination",
    "enable_prayer_team",
    "prayer_section_headline",
    "prayer_section_description",
  ].some((columnName) => message.includes(columnName));
}

function hasMissingPrayerRequestsTableError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("prayer_requests");
}

function hasMissingFruitItemsTableError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return message.includes("missionary_fruit_items");
}

function hasMissingSupportSettingsColumnsError(error: { message?: string } | null | undefined) {
  const message = error?.message ?? "";

  return [
    "monthly_giving_url",
    "one_time_giving_url",
    "monthly_button_label",
    "one_time_button_label",
    "major_gift_button_label",
    "enable_monthly_partnership",
    "enable_one_time_gift",
    "enable_major_gift_inquiry",
    "monthly_support_description",
    "one_time_support_description",
    "major_gift_notify_email",
    "major_gift_public_description",
    "flyer_headline",
    "flyer_support_appeal",
    "flyer_prayer_ask",
    "flyer_note",
  ].some((columnName) => message.includes(columnName));
}

function hasMissingTeamMembersTableError(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const missingRelation = code === "42P01"
    || code === "PGRST205"
    || message.toLowerCase().includes("schema cache")
    || message.toLowerCase().includes("does not exist")
    || message.toLowerCase().includes("could not find the table");

  return missingRelation && message.includes("missionary_team_members");
}

function mapPrayerRequests(requests: readonly PrayerRequestRow[] = []): MissionaryPrayerRequest[] {
  return requests
    .filter((request) => request.visibility === "public" || request.visibility === "team")
    .map((request) => ({
      category: request.category,
      date: request.created_at,
      description: request.description,
      id: request.id,
      title: request.title,
      visibility: request.visibility as "public" | "team",
    }));
}

function fruitDateValue(item: MissionaryFruitItem) {
  const date = new Date(item.testimonyDate ?? item.createdAt);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function mapFruitItems(items: readonly FruitItemRow[] = []): MissionaryFruitItem[] {
  return items
    .map((item) => ({
      body: item.body,
      category: item.category,
      createdAt: item.created_at,
      id: item.id,
      isFeatured: item.is_featured === true,
      sortOrder: item.sort_order ?? 0,
      source: item.source,
      sourceApp: item.source_app,
      submittedByName: item.submitted_by_name,
      testimonyDate: item.testimony_date,
      title: item.title,
    }))
    .sort((first, second) => {
      if (first.isFeatured !== second.isFeatured) {
        return first.isFeatured ? -1 : 1;
      }

      if (first.isFeatured && first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }

      return fruitDateValue(second) - fruitDateValue(first);
    });
}

// Team is mapped as a public roster only. It is not a relationship graph and
// must not be used for disciples, follow-up contacts, or field relationships.
function toPublicNumber(value: string | null | undefined) {
  const trimmedValue = value?.trim().replace(/^#/, "");

  if (!trimmedValue) {
    return null;
  }

  return `#${/^\d{1,4}$/.test(trimmedValue) ? trimmedValue.padStart(4, "0") : trimmedValue}`;
}

function publicNumberSortValue(value: string | null | undefined) {
  const trimmedValue = value?.trim().replace(/^#/, "") ?? "";

  return /^\d{1,4}$/.test(trimmedValue) ? trimmedValue.padStart(4, "0") : trimmedValue;
}

function mapTeamMembers(items: readonly TeamMemberRow[] = []) {
  return [...items]
    .filter((item) => item.status === "active" && item.is_public !== false)
    .sort((first, second) => {
      const sortOrderDifference = (first.sort_order ?? 0) - (second.sort_order ?? 0);

      if (sortOrderDifference !== 0) {
        return sortOrderDifference;
      }

      return publicNumberSortValue(first.public_number).localeCompare(publicNumberSortValue(second.public_number), undefined, { numeric: true })
        || first.display_name.localeCompare(second.display_name);
    })
    .map((item) => ({
      displayName: item.display_name,
      dosUserId: item.dos_user_id,
      publicNumber: toPublicNumber(item.public_number),
      roleTitle: item.role_title,
      shortDescription: item.short_description,
      sortOrder: item.sort_order ?? 0,
    }));
}

function mapHouseholdToMissionary({
  fruitItems = [],
  household,
  people = [],
  prayerRequests = [],
  support = null,
  supportTargetHousehold = null,
  supportTargetSettings = null,
  tags = [],
  teamMembers = [],
}: {
  fruitItems?: readonly FruitItemRow[];
  household: HouseholdRow;
  people?: readonly PersonRow[];
  prayerRequests?: readonly PrayerRequestRow[];
  support?: SupportSettingsRow | null;
  supportTargetHousehold?: SupportTargetHouseholdRow | null;
  supportTargetSettings?: SupportSettingsRow | null;
  tags?: readonly TagRow[];
  teamMembers?: readonly TeamMemberRow[];
}): Missionary {
  const sortedPeople = sortPeople(people);
  const mappedFruitItems = mapFruitItems(fruitItems);
  const mappedTags = mapTags(tags);
  const primaryState = normalizePrimaryState(household.primary_state) ?? normalizePrimaryState(household.location);
  const servingScope = normalizeServingScope(household.serving_scope);
  const ministryRegion = normalizeMinistryRegion(household.region);
  const locationVisibility = normalizeLocationVisibility(household.location_visibility);
  const roleType = normalizeRoleType(household.role_type);
  const location = primaryState ?? household.location ?? "United States";
  const supportMode = toSupportMode(household.support_mode);
  const hasNominationTarget = supportMode === "household_nomination" && Boolean(supportTargetHousehold);
  const showSupport = isEnabledByDefault(household.show_support) && supportMode !== "hidden";
  const showPhotos = isEnabledByDefault(household.show_photos);
  const monthlyGivingUrl = supportMode === "household"
    ? support?.monthly_giving_url ?? null
    : hasNominationTarget
      ? supportTargetSettings?.monthly_giving_url ?? null
      : null;
  const oneTimeGivingUrl = supportMode === "household"
    ? support?.one_time_giving_url ?? null
    : hasNominationTarget
      ? supportTargetSettings?.one_time_giving_url ?? null
      : null;

  return {
    id: household.id,
    missionaryNumber: sortedPeople[0]?.missionary_number ?? "",
    slug: household.slug,
    name: household.display_name,
    role: roleTypeLabel(roleType) || toDisplayRole(mappedTags.roleTags),
    category: getCategoryFromTags(mappedTags.roleTags),
    location,
    locationLine: profileLocationLine({
      customServingLabel: household.custom_serving_label,
      locationVisibility,
      primaryState,
      region: ministryRegion,
      servingScope,
    }),
    statement: household.short_mission ?? "Reaching the lost. Making disciples. Multiplying across America.",
    funding: toFunding(support),
    activeDisciples: 0,
    tableMeetings: 0,
    peopleReached: 0,
    newDisciples: 0,
    commitments: 0,
    needs: [],
    image: showPhotos ? toPublicImageSource(household.profile_image_url, directoryImageFallback) : directoryImageFallback,
    roleTags: mappedTags.roleTags,
    functionTags: mappedTags.functionTags,
    heroImage: showPhotos ? toOptionalPublicImageSource(household.hero_image_url) ?? toPublicImageSource(household.profile_image_url, directoryImageFallback) : undefined,
    headerImage: showPhotos ? toPublicImageSource(household.profile_image_url, directoryImageFallback) : undefined,
    householdMembers: mapTeamMembers(teamMembers),
    story: household.public_story ?? undefined,
    fruitFromField: household.fruit_from_field ?? undefined,
    fruitItems: mappedFruitItems,
    features: {
      showHousehold: isEnabledByDefault(household.show_household),
      showPhotos,
      showTeam: isEnabledByDefault(household.show_team),
      showStory: isEnabledByDefault(household.show_story),
      showFruit: isEnabledByDefault(household.show_fruit),
      showSupport,
      showPrayer: isEnabledByDefault(household.show_prayer),
    },
    supportRouting: {
      buttonLabel: household.support_button_label ?? null,
      enableMajorGiftInquiry: isEnabledByDefault(support?.enable_major_gift_inquiry),
      enableMonthlyPartnership: isEnabledByDefault(support?.enable_monthly_partnership),
      enableOneTimeGift: isEnabledByDefault(support?.enable_one_time_gift),
      explanation: household.support_explanation ?? null,
      flyerHeadline: support?.flyer_headline ?? null,
      flyerNote: support?.flyer_note ?? null,
      flyerPrayerAsk: support?.flyer_prayer_ask ?? null,
      flyerSupportAppeal: support?.flyer_support_appeal ?? null,
      majorGiftButtonLabel: support?.major_gift_button_label ?? null,
      majorGiftNotifyEmail: support?.major_gift_notify_email ?? null,
      majorGiftPublicDescription: support?.major_gift_public_description ?? null,
      mode: supportMode,
      monthlyButtonLabel: support?.monthly_button_label ?? null,
      monthlyGivingUrl,
      monthlySupportDescription: support?.monthly_support_description ?? null,
      oneTimeButtonLabel: support?.one_time_button_label ?? null,
      oneTimeGivingUrl,
      oneTimeSupportDescription: support?.one_time_support_description ?? null,
      publicLabel: household.support_public_label ?? null,
      targetFund: household.support_target_fund ?? null,
      targetHouseholdId: household.support_target_household_id ?? null,
      targetHouseholdName: supportTargetHousehold?.display_name ?? null,
    },
    prayerSettings: {
      ctaLabel: household.prayer_cta_label ?? null,
      destination: household.prayer_destination ?? null,
      description: household.prayer_section_description ?? null,
      enablePrayerTeam: isEnabledByDefault(household.enable_prayer_team),
      headline: household.prayer_section_headline ?? null,
    },
    prayerRequests: mapPrayerRequests(prayerRequests),
    supportEnabled: showSupport,
  };
}

export async function getMissionaryDirectory() {
  if (!isSupabaseServerConfigured()) {
    return missionaries;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("missionary_households")
      .select(`
        id,
        slug,
        display_name,
        location,
        profile_image_url,
        hero_image_url,
        show_household,
        show_photos,
        primary_state,
        serving_scope,
        secondary_states,
        region,
        role_type,
        custom_serving_label,
        location_visibility,
        short_mission,
        story,
        public_visible,
        sort_order,
        missionary_people (
          missionary_number,
          first_name,
          last_name,
          role,
          sort_order
        ),
        missionary_tags (
          tag,
          tag_type
        )
      `)
      .eq("public_visible", true)
      .order("sort_order", { ascending: true });

    if (error && hasMissingFeatureColumnsError(error)) {
      const fallbackResult = await supabase
        .from("missionary_households")
        .select(`
          id,
          slug,
          display_name,
          location,
          profile_image_url,
          hero_image_url,
          short_mission,
          story,
          public_visible,
          sort_order,
          missionary_people (
            missionary_number,
            first_name,
            last_name,
            role,
            sort_order
          ),
          missionary_tags (
            tag,
            tag_type
          )
        `)
        .eq("public_visible", true)
        .order("sort_order", { ascending: true });

      if (fallbackResult.error || !fallbackResult.data) {
        return missionaries;
      }

      return (fallbackResult.data as DirectoryHouseholdRow[]).map((household) => mapHouseholdToMissionary({
        household,
        people: household.missionary_people ?? [],
        tags: household.missionary_tags ?? [],
      }));
    }

    if (error || !data) {
      return missionaries;
    }

    return (data as DirectoryHouseholdRow[])
      .filter(isHouseholdPubliclyVisible)
      .map((household) => mapHouseholdToMissionary({
        household,
        people: household.missionary_people ?? [],
        tags: household.missionary_tags ?? [],
      }));
  } catch {
    return missionaries;
  }
}

export async function getMissionaryHouseholdsResult(): Promise<MissionaryHouseholdsResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase error:", "Supabase environment variables are not configured.");
    return {
      connected: false,
      data: [],
      error: "Supabase environment variables are not configured.",
    };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("missionary_households")
      .select(`
        id,
        slug,
        display_name,
        location,
        profile_image_url,
        show_household,
        show_photos,
        primary_state,
        serving_scope,
        secondary_states,
        region,
        role_type,
        custom_serving_label,
        location_visibility,
        missionary_people (
          missionary_number
        ),
        missionary_tags (
          tag,
          tag_type
        )
      `)
      .eq("public_visible", true)
      .order("sort_order", { ascending: true });

    if (error && hasMissingFeatureColumnsError(error)) {
      const fallbackResult = await supabase
        .from("missionary_households")
        .select(`
          id,
          slug,
          display_name,
          location,
          profile_image_url,
          missionary_people (
            missionary_number
          ),
          missionary_tags (
            tag,
            tag_type
          )
        `)
        .eq("public_visible", true)
        .order("sort_order", { ascending: true });

      if (fallbackResult.error) {
        console.error("Supabase error:", fallbackResult.error);
        return {
          connected: true,
          data: [],
          error: fallbackResult.error.message,
        };
      }

      return {
        connected: true,
        data: (fallbackResult.data ?? []) as MissionaryHouseholdDirectoryRow[],
        error: null,
      };
    }

    if (error) {
      console.error("Supabase error:", error);
      return {
        connected: true,
        data: [],
        error: error.message,
      };
    }

    // If no data is returned, RLS may be blocking access.
    return {
      connected: true,
      data: ((data ?? []) as MissionaryHouseholdDirectoryRow[]).filter(isHouseholdPubliclyVisible),
      error: null,
    };
  } catch (error) {
    console.error("Supabase error:", error);
    return {
      connected: false,
      data: [],
      error: error instanceof Error ? error.message : "Unknown Supabase error.",
    };
  }
}

export async function getMissionaryHouseholds(): Promise<MissionaryHouseholdDirectoryRow[]> {
  const result = await getMissionaryHouseholdsResult();

  return result.data;
}

export async function getMissionaryProfileBySlug(slug: string) {
  if (!isSupabaseServerConfigured()) {
    return getMissionaryBySlug(slug);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const householdResult = await supabase
      .from("missionary_households")
      .select(householdProfileSelect as string)
      .eq("slug", slug)
      .eq("public_visible", true)
      .maybeSingle();
    let household = householdResult.data as HouseholdRow | null;
    let householdError = householdResult.error;

    if (householdError && hasMissingFeatureColumnsError(householdError)) {
      const fallbackResult = await supabase
        .from("missionary_households")
        .select(householdBaseSelect)
        .eq("slug", slug)
        .eq("public_visible", true)
        .maybeSingle();

      household = fallbackResult.data as HouseholdRow | null;
      householdError = fallbackResult.error;
    }

    if (householdError) {
      return getMissionaryBySlug(slug);
    }

    if (!household || !isHouseholdPubliclyVisible(household)) {
      return undefined;
    }

    const supportTargetHouseholdId = typeof household.support_target_household_id === "string"
      ? household.support_target_household_id
      : "";

    const [peopleResult, tagsResult, supportResult, supportTargetResult, supportTargetSettingsResult, prayerRequestsResult, fruitItemsResult, teamMembersResult] = await Promise.all([
      supabase
        .from("missionary_people")
        .select("missionary_number, first_name, last_name, role, sort_order")
        .eq("household_id", household.id)
        .eq("is_public", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("missionary_tags")
        .select("tag, tag_type")
        .eq("household_id", household.id),
      supabase
        .from("missionary_support_settings")
        .select(supportSettingsFullSelect)
        .eq("household_id", household.id)
        .maybeSingle(),
      supportTargetHouseholdId
        ? supabase
          .from("missionary_households")
          .select("id, display_name, slug, show_household")
          .eq("id", supportTargetHouseholdId)
          .eq("public_visible", true)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supportTargetHouseholdId
        ? supabase
          .from("missionary_support_settings")
          .select(supportSettingsFullSelect)
          .eq("household_id", supportTargetHouseholdId)
          .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("prayer_requests")
        .select("id, title, description, category, visibility, created_at")
        .eq("household_id", household.id)
        .in("status", ["active", "open"])
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("missionary_fruit_items")
        .select("id, title, body, category, testimony_date, submitted_by_name, source, source_app, is_featured, sort_order, created_at")
        .eq("household_id", household.id)
        .eq("status", "published")
        .eq("visibility", "public")
        .eq("permission_to_share", true)
        .eq("missionary_public_approved", true)
        .order("is_featured", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("testimony_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("missionary_team_members")
        .select("id, display_name, public_number, role_title, short_description, sort_order, is_public, dos_user_id, status")
        .eq("household_id", household.id)
        .eq("status", "active")
        .eq("is_public", true)
        .order("sort_order", { ascending: true })
        .order("public_number", { ascending: true })
        .order("display_name", { ascending: true }),
    ]);

    if (peopleResult.error || tagsResult.error) {
      return getMissionaryBySlug(slug);
    }

    const supportTargetHousehold = supportTargetResult.error
      ? null
      : (supportTargetResult.data as SupportTargetHouseholdRow | null);
    let supportSettings = supportResult.error ? null : (supportResult.data as SupportSettingsRow | null);
    let supportTargetSettings = supportTargetSettingsResult.error ? null : (supportTargetSettingsResult.data as SupportSettingsRow | null);

    if (supportResult.error && hasMissingSupportSettingsColumnsError(supportResult.error)) {
      const fallbackSupportResult = await supabase
        .from("missionary_support_settings")
        .select(supportSettingsBaseSelect)
        .eq("household_id", household.id)
        .maybeSingle();

      supportSettings = fallbackSupportResult.error
        ? null
        : (fallbackSupportResult.data as SupportSettingsRow | null);
    }

    if (supportTargetSettingsResult.error && supportTargetHouseholdId && hasMissingSupportSettingsColumnsError(supportTargetSettingsResult.error)) {
      const fallbackSupportTargetSettingsResult = await supabase
        .from("missionary_support_settings")
        .select(supportSettingsBaseSelect)
        .eq("household_id", supportTargetHouseholdId)
        .maybeSingle();

      supportTargetSettings = fallbackSupportTargetSettingsResult.error
        ? null
        : (fallbackSupportTargetSettingsResult.data as SupportSettingsRow | null);
    }

    const people = (peopleResult.data ?? []) as PersonRow[];
    const teamMembers = teamMembersResult.error
      ? []
      : (teamMembersResult.data ?? []) as TeamMemberRow[];

    return mapHouseholdToMissionary({
      household: household as HouseholdRow,
      fruitItems: fruitItemsResult.error && hasMissingFruitItemsTableError(fruitItemsResult.error)
        ? []
        : (fruitItemsResult.data ?? []) as FruitItemRow[],
      people,
      prayerRequests: prayerRequestsResult.error && hasMissingPrayerRequestsTableError(prayerRequestsResult.error)
        ? []
        : (prayerRequestsResult.data ?? []) as PrayerRequestRow[],
      tags: (tagsResult.data ?? []) as TagRow[],
      support: supportSettings,
      supportTargetHousehold: supportTargetHousehold?.show_household === false ? null : supportTargetHousehold,
      supportTargetSettings,
      teamMembers,
    });
  } catch {
    return getMissionaryBySlug(slug);
  }
}

export async function getMissionaryStaticParams() {
  const directory = await getMissionaryDirectory();

  return directory.map((missionary) => ({ slug: missionary.slug }));
}
