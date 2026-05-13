import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, HandHeart, Heart, Users } from "lucide-react";
import { PrimaryNav } from "@/components/PrimaryNav";
import { HeroProfile } from "@/components/missionaries/HeroProfile";
import { ProfileSupportSectionActions } from "@/components/missionaries/SupportMissionButtons";
import { StoryReadMoreButton } from "@/components/missionaries/StoryReadMoreButton";
import { FruitFromTheFieldModal } from "@/src/components/missionaries/FruitFromTheFieldModal";
import { JoinPrayerTeamModal, PrayerRequestsModalButton } from "@/src/components/missionaries/JoinPrayerTeamModal";
import { MissionaryProfileReviewModal } from "@/src/components/missionaries/MissionaryProfileReviewModal";
import { MissionaryProfileViewTracker } from "@/src/components/missionaries/MissionaryProfileViewTracker";
import { SubmitPrayerRequestModal } from "@/src/components/missionaries/SubmitPrayerRequestModal";
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

function HeroSupportCard({
  actions,
  missionary,
}: {
  actions: ReactNode;
  missionary: Missionary;
}) {
  const annualGoal = missionary.funding.annualGoal ?? 0;
  const monthlyGoal = missionary.funding.monthlyGoal > 0
    ? missionary.funding.monthlyGoal
    : calculateMonthlyGoal(annualGoal);
  const monthlyCommitted = missionary.funding.monthlyCommitted ?? 0;
  const progressPercentage = getProgressPercentage(monthlyCommitted, monthlyGoal);
  const visualProgressPercentage = Math.min(Math.max(progressPercentage, 0), 100);
  const hasGoal = monthlyGoal > 0;

  return (
    <aside
      id="support"
      className="w-full rounded-[1.25rem] border border-[#D4A63D]/26 bg-black/72 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl md:p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          Support
        </p>
        {hasGoal ? (
          <span className="rounded-full border border-[#D4A63D]/35 bg-[#D4A63D]/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-[#F5B942]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            {progressPercentage}% funded
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
          <p className="text-[9px] uppercase tracking-[0.16em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Raised
          </p>
          <p className="mt-2 text-2xl font-bold leading-none text-stone-100 md:text-[1.7rem]" style={{ fontFamily: font.oswald }}>
            {formatMoney(monthlyCommitted)}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
          <p className="text-[9px] uppercase tracking-[0.16em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Monthly Goal
          </p>
          <p className="mt-2 text-2xl font-bold leading-none text-stone-100 md:text-[1.7rem]" style={{ fontFamily: font.oswald }}>
            {hasGoal ? formatMoney(monthlyGoal) : "Open"}
          </p>
        </div>
      </div>

      {hasGoal ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.1]">
          <div
            className={`h-full rounded-full transition-all ${getProgressFillClass(progressPercentage)}`}
            style={{ width: `${visualProgressPercentage}%` }}
          />
        </div>
      ) : null}

      <p className="mt-4 text-sm leading-6 text-stone-300">
        Secure giving for this household.
      </p>

      {actions}
    </aside>
  );
}

function MissionProfileCard({
  action,
  children,
  icon,
  label,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <article className="group flex min-h-[210px] flex-col rounded-[1.25rem] border border-stone-800/80 bg-[#080808] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.2)] transition-all duration-300 hover:border-[#D4A63D]/45 hover:bg-[#0d0d0d] md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4A63D]/25 bg-[#D4A63D]/10 text-[#F5B942]">
          {icon}
        </div>
        <span className="rounded-full border border-white/[0.1] px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-stone-400" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          {label}
        </span>
      </div>
      <h2 className="mt-4 text-2xl font-bold uppercase leading-none text-stone-100 md:text-3xl" style={{ fontFamily: font.oswald }}>
        {title}
      </h2>
      <div className="mt-3 flex-1 text-sm leading-6 text-stone-300">
        {children}
      </div>
      {action ? (
        <div className="mt-4">
          {action}
        </div>
      ) : null}
    </article>
  );
}

function StoryProfileCard({
  storyParagraphs,
  storyPreview,
}: {
  storyParagraphs: readonly string[];
  storyPreview: string;
}) {
  return (
    <MissionProfileCard
      action={<StoryReadMoreButton buttonLabel="Read Story" paragraphs={storyParagraphs} />}
      icon={<BookOpen aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />}
      label="Story"
      title="Our Story"
    >
      <p className="max-h-[6.2rem] overflow-hidden">
        {storyPreview}
      </p>
    </MissionProfileCard>
  );
}

// Profiles (PF): Team is public roster content only. Disciples, people being
// followed up with, and ministry relationships belong in future People/Tables
// models, not this public profile section.
function TeamProfileCard({ missionary }: { missionary: Missionary }) {
  const members = missionary.householdMembers ?? [];
  const visibleMembers = members.slice(0, 4);

  return (
    <MissionProfileCard
      icon={<Users aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />}
      label={`${members.length} ${members.length === 1 ? "Member" : "Members"}`}
      title="Team"
    >
      <div className="grid gap-2">
        {visibleMembers.map((member) => (
          <div
            className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5"
            key={`${member.publicNumber ?? "member"}-${member.displayName}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                {member.displayName}
              </h3>
              {member.publicNumber ? (
                <span className="text-[9px] uppercase tracking-[0.14em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                  {member.publicNumber}
                </span>
              ) : null}
            </div>
            {member.roleTitle ? (
              <p className="mt-1 text-xs text-stone-400">
                {member.roleTitle}
              </p>
            ) : null}
          </div>
        ))}
        {members.length > visibleMembers.length ? (
          <p className="pt-1 text-xs uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            +{members.length - visibleMembers.length} more
          </p>
        ) : null}
      </div>
    </MissionProfileCard>
  );
}

function PrayerProfileCard({ missionary }: { missionary: Missionary }) {
  const ctaLabel = missionary.prayerSettings?.ctaLabel || "Join Prayer Team";
  const prayerTeamEnabled = missionary.prayerSettings?.enablePrayerTeam !== false;
  const prayerRequests = missionary.prayerRequests ?? [];
  const previewRequest = prayerRequests[0];
  const previewText = previewRequest
    ? previewRequest.description
    : missionary.prayerSettings?.description || "Pray with this household as they reach, disciple, and serve.";

  return (
    <MissionProfileCard
      action={(
        <div className="grid gap-2 sm:grid-cols-2">
          {prayerTeamEnabled ? (
            <JoinPrayerTeamModal
              buttonLabel={ctaLabel}
              householdId={missionary.id}
              householdName={missionary.name}
              householdNumber={missionary.missionaryNumber}
              initialPrayerRequests={prayerRequests}
              profileSlug={missionary.slug}
              variant="compact"
            />
          ) : null}
          <SubmitPrayerRequestModal
            householdId={missionary.id}
            householdName={missionary.name}
            profileSlug={missionary.slug}
          />
          {prayerRequests.length > 0 ? (
            <PrayerRequestsModalButton buttonLabel="Requests" requests={prayerRequests} />
          ) : null}
        </div>
      )}
      icon={<Heart aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />}
      label={previewRequest ? "Current" : "Prayer"}
      title={missionary.prayerSettings?.headline || "Prayer"}
    >
      <p className="max-h-[6.2rem] overflow-hidden">
        {previewText}
      </p>
    </MissionProfileCard>
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
    <section className="border-t border-stone-900/80 px-6 py-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[1.25rem] border border-stone-800/80 bg-[#080808] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.2)] md:p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                Field Updates
              </p>
              <h2 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100 md:text-4xl" style={{ fontFamily: font.oswald }}>
                Fruit From The Field
              </h2>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <FruitFromTheFieldModal items={fruitItems} />
              <MissionaryProfileReviewModal
                initialOpen={initialReviewOpen}
                missionaryId={missionary.id}
                missionaryName={missionary.name}
                profileSlug={missionary.slug}
              />
            </div>
          </div>

          {topFruitItems.length > 0 ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {topFruitItems.map((item) => (
                <article key={item.id} className="rounded-xl border border-stone-800/70 bg-[#050505] p-4">
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
                  <h3 className="mt-3 text-xl font-bold uppercase leading-tight text-stone-100" style={{ fontFamily: font.oswald }}>
                    {item.title || "Field Testimony"}
                  </h3>
                  <p className="mt-3 max-h-[8.5rem] overflow-hidden text-sm leading-7 text-stone-300">
                    {item.body}
                  </p>
                  {item.submittedByName ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                      {item.submittedByName}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-stone-800/70 bg-[#050505] p-4 text-sm text-stone-400">
              Approved field updates will appear here.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MissionProfileSection({
  missionary,
  showPrayer,
  showStory,
  showTeam,
  storyParagraphs,
  storyPreview,
}: {
  missionary: Missionary;
  showPrayer: boolean;
  showStory: boolean;
  showTeam: boolean;
  storyParagraphs?: readonly string[];
  storyPreview: string;
}) {
  const hasCards = (showStory && storyParagraphs)
    || showPrayer
    || showTeam;

  if (!hasCards) {
    return null;
  }

  return (
    <section className="border-t border-stone-900/80 px-6 py-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
              Mission Profile
            </p>
            <h2 className="mt-2 text-3xl font-bold uppercase leading-none text-stone-100 md:text-[2.5rem]" style={{ fontFamily: font.oswald }}>
              Connect With The Mission
            </h2>
          </div>
          <HandHeart aria-hidden="true" className="hidden h-7 w-7 text-[#D4A63D] md:block" strokeWidth={1.6} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {showStory && storyParagraphs ? (
            <StoryProfileCard storyParagraphs={storyParagraphs} storyPreview={storyPreview} />
          ) : null}
          {showPrayer ? (
            <PrayerProfileCard missionary={missionary} />
          ) : null}
          {showTeam ? (
            <TeamProfileCard missionary={missionary} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ProfileFooter({ missionary }: { missionary: Missionary }) {
  return (
    <footer className="border-t border-stone-900/80 px-6 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="uppercase tracking-[0.18em]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
          USA Missionaries
        </p>
        <p>{missionary.name}</p>
      </div>
    </footer>
  );
}

function hasPublicPrayerContent(missionary: Missionary, prayerRequests: readonly MissionaryPrayerRequest[]) {
  const settings = missionary.prayerSettings;

  return Boolean(settings) || prayerRequests.length > 0;
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
      <MissionaryProfileViewTracker missionaryProfileId={missionary.id} profileSlug={missionary.slug} />
      <PrimaryNav active="support" />

      <HeroProfile
        name={missionary.name}
        location={missionary.locationLine}
        description={missionary.statement}
        image={showPhotos ? missionary.heroImage : undefined}
        actions={joinPrayerTeamAction}
        spotlight={showSupport ? (
          <HeroSupportCard
            actions={<ProfileSupportSectionActions {...supportModalProps} layout="compact" />}
            missionary={missionary}
          />
        ) : null}
      />

      <MissionProfileSection
        missionary={missionary}
        showPrayer={showPrayer}
        showStory={showStory}
        showTeam={showTeam}
        storyParagraphs={storyParagraphs}
        storyPreview={storyPreview}
      />

      {showFruit ? (
        <FruitSection fruitItems={fruitItems} initialReviewOpen={shouldPreviewProfileReview} missionary={missionary} />
      ) : null}

      <ProfileFooter missionary={missionary} />
    </main>
  );
}
