import Link from "next/link";
import type { ReactNode } from "react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { HeroProfile } from "@/components/missionaries/HeroProfile";
import { HeroSupportActions, ProfileSupportSectionActions } from "@/components/missionaries/SupportMissionButtons";
import { StoryReadMoreButton } from "@/components/missionaries/StoryReadMoreButton";
import { FruitFromTheFieldModal } from "@/src/components/missionaries/FruitFromTheFieldModal";
import { JoinPrayerTeamModal, PrayerRequestsModalButton } from "@/src/components/missionaries/JoinPrayerTeamModal";
import { MissionaryProfileReviewModal } from "@/src/components/missionaries/MissionaryProfileReviewModal";
import type { Missionary, MissionaryFruitItem, MissionaryPrayerRequest } from "@/src/data/missionaries";
import { getSupportRoutingPublicCopy } from "@/src/lib/missionaries/support-routing";

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

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  }).format(value);
}

function calculateMonthlyGoal(annualGoal: number) {
  return annualGoal > 0 ? Math.round(annualGoal / 12) : 0;
}

function getProgressPercentage(monthlyCommitted: number, monthlyGoal: number) {
  if (monthlyGoal <= 0) {
    return 0;
  }

  return Math.round((monthlyCommitted / monthlyGoal) * 100);
}

function getProgressFillClass(progressPercentage: number) {
  if (progressPercentage >= 100) {
    return "bg-green-500";
  }

  if (progressPercentage >= 50) {
    return "bg-gradient-to-r from-[#D4A63D] to-green-500";
  }

  return "bg-[#D4A63D]";
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

function getSupportDefaults(missionary: Missionary) {
  const requestedMode = missionary.supportRouting?.mode ?? "household";
  const missingTarget = requestedMode === "household_nomination" && !missionary.supportRouting?.targetHouseholdName;
  const mode = missingTarget ? "general_fund" : requestedMode;
  const publicCopy = getSupportRoutingPublicCopy(mode, missionary.supportRouting?.targetHouseholdName);
  const publicLabel = publicCopy.title;
  const monthlyButtonLabel = missionary.supportRouting?.monthlyButtonLabel || "Support Monthly";
  const explanation = missionary.supportRouting?.explanation || publicCopy.explanation;

  return {
    buttonLabel: monthlyButtonLabel,
    enableMajorGiftInquiry: missionary.supportRouting?.enableMajorGiftInquiry !== false,
    explanation,
    isHouseholdFundraising: mode === "household",
    majorGiftButtonLabel: missionary.supportRouting?.majorGiftButtonLabel || "Contact About Major Gift",
    majorGiftPublicDescription: missionary.supportRouting?.majorGiftPublicDescription ?? null,
    mode,
    monthlyButtonLabel,
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

function SupportProgressSummary({ missionary }: { missionary: Missionary }) {
  const annualGoal = missionary.funding.annualGoal ?? 0;
  const monthlyGoal = missionary.funding.monthlyGoal > 0
    ? missionary.funding.monthlyGoal
    : calculateMonthlyGoal(annualGoal);
  const monthlyCommitted = missionary.funding.monthlyCommitted ?? 0;

  if (monthlyGoal <= 0) {
    return null;
  }

  const progressPercentage = getProgressPercentage(monthlyCommitted, monthlyGoal);
  const visualProgressPercentage = Math.min(Math.max(progressPercentage, 0), 100);

  return (
    <div className="mt-10 max-w-[520px] rounded-xl border border-[#222222] bg-[#0a0a0a] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
        Fundraising Progress
      </p>
      <p className="mt-3 text-5xl font-bold leading-none text-stone-100 md:text-6xl" style={{ fontFamily: font.oswald }}>
        {formatMoney(monthlyCommitted)}
      </p>
      <p className="mt-3 text-sm leading-6 text-stone-400">
        of {formatMoney(monthlyGoal)} monthly goal
      </p>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-stone-900">
        <div
          className={`h-full rounded-full transition-all ${getProgressFillClass(progressPercentage)}`}
          style={{ width: `${visualProgressPercentage}%` }}
        />
      </div>
      <p className="mt-4 text-sm font-semibold text-stone-100">
        {progressPercentage}% raised
      </p>
    </div>
  );
}

// Profiles (PF): Team is public roster content only. Disciples, people being
// followed up with, and ministry relationships belong in future People/Tables
// models, not this public profile section.
function TeamSection({ missionary }: { missionary: Missionary }) {
  const members = missionary.householdMembers ?? [];

  return (
    <section className="border-t border-stone-900/80 px-6 py-12 md:py-16">
      <div className="mx-auto max-w-6xl border border-stone-800/80 bg-[#080808] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:p-8">
        <div>
          <div className="mb-4 h-px w-12 bg-[#D4A63D]" />
          <h2 className="text-3xl font-bold uppercase leading-none text-stone-100 md:text-5xl" style={{ fontFamily: font.oswald }}>
            Team
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
            This household includes {members.length} public team {members.length === 1 ? "member" : "members"} connected to the mission.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <article key={`${member.publicNumber ?? "member"}-${member.displayName}`} className="border border-stone-800 bg-[#050505] p-4">
              {member.publicNumber ? (
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {member.publicNumber}
                </p>
              ) : null}
              <h3 className="mt-2 text-xl font-bold leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                {member.displayName}
              </h3>
              {member.roleTitle ? (
                <p className="mt-2 text-sm text-stone-400">
                  {member.roleTitle}
                </p>
              ) : null}
              {member.shortDescription ? (
                <p className="mt-3 text-sm leading-6 text-stone-500">
                  {member.shortDescription}
                </p>
              ) : null}
            </article>
          ))}
        </div>
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

// Profiles (PF): render approved, curated Fruit only. Raw Encounter intake
// stays inside Command Center until reviewed and transformed into Fruit.
function FruitSection({
  fruitItems,
  initialReviewOpen = false,
  missionary,
}: {
  fruitItems: readonly MissionaryFruitItem[];
  initialReviewOpen?: boolean;
  missionary: Missionary;
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
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <FruitFromTheFieldModal items={fruitItems} />
                <MissionaryProfileReviewModal
                  initialOpen={initialReviewOpen}
                  missionaryId={missionary.id}
                  missionaryName={missionary.name}
                  profileSlug={missionary.slug}
                />
              </div>
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

function hasPublicPrayerContent(missionary: Missionary, prayerRequests: readonly MissionaryPrayerRequest[]) {
  const settings = missionary.prayerSettings;

  return settings?.enablePrayerTeam === true
    || Boolean(settings?.ctaLabel?.trim())
    || Boolean(settings?.destination?.trim())
    || Boolean(settings?.headline?.trim())
    || Boolean(settings?.description?.trim())
    || prayerRequests.length > 0;
}

export function MissionaryProfileTemplate({
  missionary,
  previewForm,
}: {
  missionary: Missionary;
  previewForm?: string;
}) {
  const features = missionary.features ?? {
    showFruit: true,
    showHousehold: true,
    showPhotos: true,
    showTeam: true,
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
  const showPhotos = features.showPhotos;
  const showTeam = features.showTeam && Boolean(missionary.householdMembers?.length);
  const showStory = features.showStory && Boolean(storyParagraphs?.length);
  const shouldPreviewProfileReview = previewForm === "missionary_profile_review";
  const showFruit = features.showFruit && (fruitItems.length > 0 || shouldPreviewProfileReview);
  const supportDefaults = getSupportDefaults(missionary);
  const showSupport = features.showSupport && supportDefaults.mode !== "hidden";
  const prayerTeamEnabled = missionary.prayerSettings?.enablePrayerTeam !== false;
  const prayerRequests = missionary.prayerRequests ?? [];
  const showPrayer = features.showPrayer && hasPublicPrayerContent(missionary, prayerRequests);
  const joinPrayerTeamAction = showPrayer && prayerTeamEnabled ? (
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
    initialMajorGiftOpen: previewForm === "major_gift",
    majorGiftButtonLabel: supportDefaults.majorGiftButtonLabel,
    majorGiftPublicDescription: supportDefaults.majorGiftPublicDescription,
    missionaryId: missionary.id,
    missionaryName: missionary.name,
    missionarySlug: missionary.slug,
    monthlyButtonLabel: supportDefaults.monthlyButtonLabel,
    monthlyGivingUrl: supportDefaults.monthlyGivingUrl,
    oneTimeButtonLabel: supportDefaults.oneTimeButtonLabel,
    oneTimeGivingUrl: supportDefaults.oneTimeGivingUrl,
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

      {showTeam ? (
        <TeamSection missionary={missionary} />
      ) : null}

      {showStory && storyParagraphs ? (
        <StorySection storyParagraphs={storyParagraphs} storyPreview={storyPreview} />
      ) : null}

      {showFruit ? (
        <FruitSection fruitItems={fruitItems} initialReviewOpen={shouldPreviewProfileReview} missionary={missionary} />
      ) : null}

      {showPrayer ? (
        <PrayerSection missionary={missionary} />
      ) : null}

      {showSupport ? (
        <section id="support" className="border-t border-stone-900/80 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              title="Support This Mission"
              subtitle={supportDefaults.explanation}
            />

            <SupportProgressSummary missionary={missionary} />

            <ProfileSupportSectionActions {...supportModalProps} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
