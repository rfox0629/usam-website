import Link from "next/link";
import type { ReactNode } from "react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { HeroProfile } from "@/components/missionaries/HeroProfile";
import { HeroSupportActions, ProfileSupportSectionActions } from "@/components/missionaries/SupportMissionButtons";
import { StoryReadMoreButton } from "@/components/missionaries/StoryReadMoreButton";
import { FruitFromTheFieldModal } from "@/src/components/missionaries/FruitFromTheFieldModal";
import { JoinPrayerTeamModal, PrayerRequestsModalButton } from "@/src/components/missionaries/JoinPrayerTeamModal";
import type { Missionary, MissionaryFruitItem, MissionarySupportMode } from "@/src/data/missionaries";
import { FundingDashboard } from "./FundingDashboard";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const ryanBrookeStory = [
  "When the Lord gave us the vision for this organization, He did not begin with a name. He began with a calling.",
  'The Spirit of God spoke clearly to Ryan and Brooke: "You will go and present the Gospel at people\'s kitchen tables."',
  "At first, we wrestled with what that meant. We considered whether we should partner with an existing missionary organization or serve under a local church. But as we prayed together, the Lord made it clear this was not something we were to step into. This was something we were being called to step out into.",
  "That clarity came with a cost.",
  "We were not stepping into certainty. We were stepping into obedience. It meant laying down comfort, income stability, and the direction we had been building for years. It meant trusting that where He guides, He provides.",
  "Out of that place of surrender, USA Missionaries was born.",
  "From that moment, the Lord began to reveal the strategy, the purpose, and the promise behind the vision. On August 3, 2025, we officially incorporated USA Missionaries as the legal covering for what God had already established in our hearts.",
  "Ministering to people at their kitchen tables is more than a concept. It is a mandate.",
  "Just as Paul charged Timothy in his final letter, we carry the same calling found in 2 Timothy 4:1-8. To preach the Word. To be ready in season and out of season. To reprove, rebuke, and exhort with complete patience and teaching.",
  "Even as many turn aside to what suits their own desires, we are called to remain faithful.",
  "So we go.",
  "We endure. We evangelize. We walk with people in truth and love. We fight the good fight, finish the race, and keep the faith.",
  "This mission did not begin with us. And it is not sustained by us.",
  "It is carried forward by every step of obedience.",
  "And we believe the Lord is just getting started.",
] as const;

const defaultStory = [
  "We stepped into full-time ministry to reach the lost, make disciples, and help raise up laborers across America. Our heart is to see people encounter Jesus, be walked with after they say yes, and become disciple-makers in their own homes, cities, and communities.",
] as const;

const ryanBrookeStoryPreview = "When the Lord gave us the vision for this organization, He did not begin with a name. He began with a calling to bring the Gospel to people at their kitchen tables and step out in obedience.";

function splitStory(story?: string) {
  if (!story) {
    return undefined;
  }

  const paragraphs = story
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : undefined;
}

function formatPrayerDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function fruitDateValue(item: MissionaryFruitItem) {
  const date = new Date(item.testimonyDate ?? item.createdAt);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getTopFruitItems(items: readonly MissionaryFruitItem[]) {
  const featured = items
    .filter((item) => item.isFeatured)
    .sort((first, second) => first.sortOrder - second.sortOrder || fruitDateValue(second) - fruitDateValue(first));
  const featuredIds = new Set(featured.map((item) => item.id));
  const newest = items
    .filter((item) => !featuredIds.has(item.id))
    .sort((first, second) => fruitDateValue(second) - fruitDateValue(first));

  return [...featured, ...newest].slice(0, 3);
}

function toTitleFromMode(mode: MissionarySupportMode) {
  switch (mode) {
    case "general_fund":
      return "USA Missionaries General Fund";
    case "state_leader":
      return "State Leadership Fund";
    case "regional_leader":
      return "Regional Leadership Fund";
    case "national_leadership":
      return "National Leadership";
    case "household_nomination":
      return "Recommended Missionary Household";
    case "hidden":
      return "Support This Mission";
    case "household":
    default:
      return "Support This Mission";
  }
}

function getSupportDefaults(missionary: Missionary) {
  const requestedMode = missionary.supportRouting?.mode ?? "household";
  const missingTarget = requestedMode === "household_nomination" && !missionary.supportRouting?.targetHouseholdName;
  const mode = missingTarget ? "general_fund" : requestedMode;
  const routeLabel = missingTarget
    ? "USA Missionaries General Fund"
    : missionary.supportRouting?.targetHouseholdName || missionary.supportRouting?.targetFund || toTitleFromMode(mode);
  const publicLabel = missionary.supportRouting?.publicLabel || routeLabel;
  const buttonLabel = missionary.supportRouting?.buttonLabel || "Support Monthly";
  const explanation = missionary.supportRouting?.explanation || (
    mode === "household"
      ? "Your support helps sustain the laborers who are reaching, discipling, and multiplying the mission across America."
      : `This missionary household is not currently raising personal support. You can still give toward the broader mission through ${routeLabel}.`
  );

  return {
    buttonLabel,
    enableMajorGiftInquiry: missionary.supportRouting?.enableMajorGiftInquiry !== false,
    explanation,
    isHouseholdFundraising: mode === "household",
    majorGiftButtonLabel: missionary.supportRouting?.majorGiftButtonLabel || "Contact About Major Gift",
    majorGiftPublicDescription: missionary.supportRouting?.majorGiftPublicDescription ?? null,
    mode,
    monthlyButtonLabel: missionary.supportRouting?.monthlyButtonLabel || buttonLabel,
    monthlyGivingUrl: missionary.supportRouting?.monthlyGivingUrl ?? null,
    oneTimeButtonLabel: missionary.supportRouting?.oneTimeButtonLabel || "Give One Time",
    oneTimeGivingUrl: missionary.supportRouting?.oneTimeGivingUrl ?? null,
    publicLabel,
    targetFund: missionary.supportRouting?.targetFund ?? (mode === "household" ? null : mode),
    targetHouseholdName: missingTarget ? null : missionary.supportRouting?.targetHouseholdName ?? null,
  };
}

function ActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const className = variant === "primary"
    ? "border border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942] hover:shadow-[0_0_22px_rgba(212,166,61,0.24)]"
    : "border border-white/[0.3] bg-transparent text-white hover:border-[#D4A63D] hover:bg-white/[0.04]";

  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 w-full items-center justify-center px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] transition-all duration-300 sm:w-auto ${className}`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="mb-5 h-px w-12 bg-[#D4A63D]" />
      <h2 className="text-4xl font-bold uppercase leading-none text-stone-100 md:text-6xl" style={{ fontFamily: font.oswald }}>
        {title}
      </h2>
      <p className="mt-5 text-base leading-8 text-stone-400 md:text-lg">
        {subtitle}
      </p>
    </div>
  );
}

function MissionaryHouseholdSection({ missionary }: { missionary: Missionary }) {
  const members = missionary.householdMembers ?? [];

  return (
    <section className="border-t border-stone-900/80 px-6 py-12 md:py-16">
      <div className="mx-auto max-w-6xl border border-stone-800/80 bg-[#080808] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:p-8">
        <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <div className="mb-4 h-px w-12 bg-[#D4A63D]" />
            <h2 className="text-3xl font-bold uppercase leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
              Missionary Household
            </h2>
            <p className="mt-4 text-[12px] uppercase tracking-[0.22em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              {missionary.locationLine}
            </p>
          </div>
          <div>
            <h3 className="text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
              {missionary.name}
            </h3>
            <p className="mt-4 text-base leading-8 text-stone-200">
              {missionary.statement}
            </p>
            {members.length > 0 ? (
              <p className="mt-4 text-sm leading-7 text-stone-400">
                This household includes {members.length} public team {members.length === 1 ? "member" : "members"} connected to the mission.
              </p>
            ) : null}
          </div>
        </div>

        {members.length > 0 ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => {
              const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ");

              return (
                <article key={`${member.missionaryNumber}-${fullName}`} className="border border-stone-800 bg-[#050505] p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                    #{member.missionaryNumber}
                  </p>
                  <h3 className="mt-2 text-xl font-bold leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                    {fullName}
                  </h3>
                  {member.role ? (
                    <p className="mt-2 text-sm text-stone-500">
                      {member.role}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StorySection({
  storyParagraphs,
  storyPreview,
}: {
  storyParagraphs: readonly string[];
  storyPreview: string;
}) {
  return (
    <section className="border-t border-stone-900/80 px-6 py-14 md:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <div className="mb-5 h-px w-12 bg-[#D4A63D]" />
          <h2 className="text-4xl font-bold uppercase leading-none text-stone-100 md:text-6xl" style={{ fontFamily: font.oswald }}>
            Our Story
          </h2>
          <p className="mt-5 text-base leading-8 text-stone-300 md:text-lg">
            How God called us into the mission field.
          </p>
          <p className="mt-7 text-base leading-8 text-stone-200 md:text-lg">
            {storyPreview}
          </p>
          <div className="mt-7">
            <StoryReadMoreButton paragraphs={storyParagraphs} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FruitSection({
  fruitItems,
}: {
  fruitItems: readonly MissionaryFruitItem[];
}) {
  const topFruitItems = getTopFruitItems(fruitItems);

  return (
    <section className="border-t border-stone-900/80 px-6 py-14 md:py-16 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <div>
            <div className="mb-5 h-px w-12 bg-[#D4A63D]" />
            <h2 className="text-4xl font-bold uppercase leading-none text-stone-100 md:text-6xl" style={{ fontFamily: font.oswald }}>
              Fruit From The Field
            </h2>
            <p className="mt-5 text-base leading-8 text-stone-300 md:text-lg">
              What God is doing through table meetings, discipleship, prayer, and ongoing follow-up.
            </p>
          </div>

          <div>
            <div className="grid gap-4">
              {topFruitItems.map((item) => (
                <article key={item.id} className="border border-stone-800/70 bg-[#080808] p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      {formatPrayerDate(item.testimonyDate ?? item.createdAt)}
                    </p>
                    {item.category ? (
                      <span className="border border-stone-700 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        {item.category}
                      </span>
                    ) : null}
                    {item.isFeatured ? (
                      <span className="border border-[#D4A63D]/40 bg-[#D4A63D]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        Featured
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-2xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                    {item.title || "Field Testimony"}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-stone-200">
                    {item.body}
                  </p>
                  {item.submittedByName ? (
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      {item.submittedByName}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="mt-8">
              <FruitFromTheFieldModal items={fruitItems} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrayerSection({ missionary }: { missionary: Missionary }) {
  const ctaLabel = missionary.prayerSettings?.ctaLabel || "Join The Prayer Team";
  const destination = missionary.prayerSettings?.destination || "/prayer";
  const prayerTeamEnabled = missionary.prayerSettings?.enablePrayerTeam !== false;
  const prayerRequests = missionary.prayerRequests ?? [];
  const headline = missionary.prayerSettings?.headline || "Prayer Requests";
  const description = missionary.prayerSettings?.description || "Stand with this household in prayer as they reach, disciple, and serve across the mission field.";

  return (
    <section className="border-t border-stone-900/80 px-6 py-14 md:py-16 lg:py-20">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <SectionHeading
          title={headline}
          subtitle={description}
        />

        <div className="space-y-5">
          <div className="border border-stone-800/80 bg-[#080808] p-6 md:p-8">
            <div className="mb-5 h-px w-12 bg-[#D4A63D]" />
            <h3 className="text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
              Pray With Us
            </h3>
            <p className="mt-4 text-base leading-8 text-stone-300">
              Join this household's prayer team to receive current requests and stand with them as needs are updated.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {prayerTeamEnabled ? (
                <JoinPrayerTeamModal
                  buttonLabel={ctaLabel}
                  householdId={missionary.id}
                  householdName={missionary.name}
                  householdNumber={missionary.missionaryNumber}
                  initialPrayerRequests={prayerRequests}
                  profileSlug={missionary.slug}
                  variant="gold"
                />
              ) : (
                <ActionLink href={destination}>{ctaLabel}</ActionLink>
              )}
              {prayerRequests.length > 0 ? (
                <PrayerRequestsModalButton requests={prayerRequests} />
              ) : null}
            </div>
          </div>

          {prayerRequests.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {prayerRequests.slice(0, 4).map((request) => (
                <article key={request.id} className="border border-stone-800/70 bg-[#080808] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      {formatPrayerDate(request.date)}
                    </p>
                    {request.category ? (
                      <span className="border border-stone-700 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                        {request.category}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="mt-3 text-xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                    {request.title}
                  </h4>
                  <p className="mt-3 text-sm leading-7 text-stone-300">
                    {request.description}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-stone-800/70 bg-[#080808] p-5 text-sm leading-7 text-stone-300">
              Current requests are shared with the prayer team as they are added.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function MissionaryProfileTemplate({ missionary }: { missionary: Missionary }) {
  const funding = missionary.funding;
  const features = missionary.features ?? {
    showFruit: true,
    showHousehold: true,
    showPhotos: true,
    showPrayer: true,
    showStory: true,
    showSupport: missionary.supportEnabled ?? true,
  };
  const storedStoryParagraphs = splitStory(missionary.story);
  const fallbackStoryParagraphs = missionary.features
    ? undefined
    : missionary.slug === "ryan-brooke-fox" ? ryanBrookeStory : defaultStory;
  const storyParagraphs = storedStoryParagraphs ?? fallbackStoryParagraphs;
  const storyPreview = storedStoryParagraphs?.[0] ?? (missionary.slug === "ryan-brooke-fox" ? ryanBrookeStoryPreview : storyParagraphs?.[0] ?? "");
  const fruitItems = missionary.fruitItems ?? [];
  const showHousehold = features.showHousehold;
  const showPhotos = features.showPhotos;
  const showStory = features.showStory && Boolean(storyParagraphs?.length);
  const showFruit = features.showFruit && fruitItems.length > 0;
  const supportDefaults = getSupportDefaults(missionary);
  const showSupport = features.showSupport && supportDefaults.mode !== "hidden";
  const showPrayer = features.showPrayer;
  const prayerTeamEnabled = missionary.prayerSettings?.enablePrayerTeam !== false;
  const prayerRequests = missionary.prayerRequests ?? [];
  const joinPrayerTeamAction = prayerTeamEnabled ? (
    <JoinPrayerTeamModal
      householdId={missionary.id}
      householdName={missionary.name}
      householdNumber={missionary.missionaryNumber}
      initialPrayerRequests={prayerRequests}
      profileSlug={missionary.slug}
      variant={showSupport ? "outline" : "gold"}
    />
  ) : null;
  const supportModalProps = {
    enableMajorGiftInquiry: supportDefaults.enableMajorGiftInquiry,
    extraAction: joinPrayerTeamAction,
    majorGiftButtonLabel: supportDefaults.majorGiftButtonLabel,
    majorGiftPublicDescription: supportDefaults.majorGiftPublicDescription,
    missionaryId: missionary.id,
    missionaryName: missionary.name,
    missionarySlug: missionary.slug,
    monthlyGoal: funding.monthlyGoal,
    monthlyButtonLabel: supportDefaults.monthlyButtonLabel,
    monthlyGivingUrl: supportDefaults.monthlyGivingUrl,
    oneTimeButtonLabel: supportDefaults.oneTimeButtonLabel,
    oneTimeGivingUrl: supportDefaults.oneTimeGivingUrl,
    receivedMonthlySupport: funding.receivedMonthly,
    showSupport,
    supportButtonLabel: supportDefaults.buttonLabel,
    supportExplanation: supportDefaults.explanation,
    supportMode: supportDefaults.mode,
    supportPublicLabel: supportDefaults.publicLabel,
    supportTargetFund: supportDefaults.targetFund,
    supportTargetHouseholdName: supportDefaults.targetHouseholdName,
  };

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="support" />

      <HeroProfile
        name={missionary.name}
        location={missionary.locationLine}
        description={missionary.statement}
        image={showPhotos ? missionary.heroImage : undefined}
        actions={<HeroSupportActions {...supportModalProps} />}
      />

      {showHousehold ? (
        <MissionaryHouseholdSection missionary={missionary} />
      ) : null}

      {showStory && storyParagraphs ? (
        <StorySection storyParagraphs={storyParagraphs} storyPreview={storyPreview} />
      ) : null}

      {showFruit ? (
        <FruitSection fruitItems={fruitItems} />
      ) : null}

      {showSupport ? (
        <section className="border-t border-stone-900/80 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              title={supportDefaults.publicLabel}
              subtitle={supportDefaults.explanation}
            />

            {supportDefaults.isHouseholdFundraising ? (
              <FundingDashboard funding={funding} />
            ) : (
              <div className="mt-10 border border-stone-800/80 bg-[#080808] p-6 md:p-8">
                <p className="text-[12px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  Routed Support
                </p>
                <h3 className="mt-3 text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
                  {supportDefaults.publicLabel}
                </h3>
                <p className="mt-4 max-w-3xl text-base leading-8 text-stone-300">
                  {supportDefaults.explanation}
                </p>
              </div>
            )}

            <ProfileSupportSectionActions {...supportModalProps} />
          </div>
        </section>
      ) : null}

      {showPrayer ? (
        <PrayerSection missionary={missionary} />
      ) : null}
    </main>
  );
}
