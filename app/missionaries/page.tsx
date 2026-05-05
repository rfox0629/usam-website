import type { Metadata } from "next";
import Link from "next/link";
import { PrimaryNav } from "../../components/PrimaryNav";
import { MissionaryDirectory, type MissionaryDirectoryProfile } from "./MissionaryDirectory";
import { getMissionaryHouseholdsResult, type MissionaryHouseholdDirectoryRow } from "@/src/lib/missionaries/queries";
import { normalizeLocationVisibility, normalizePrimaryState } from "@/src/lib/missionaries/location";

export const metadata: Metadata = {
  title: "Missionary Team | USA Missionaries",
  description: "Meet the USA Missionaries team serving across America.",
};

export const revalidate = 60;

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const directoryImageFallback = "/fox-family.png";

function getDisplayNumber(people: MissionaryHouseholdDirectoryRow["missionary_people"]) {
  const sortedNumbers = (people ?? [])
    .map((person) => person.missionary_number.trim())
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }));

  if (sortedNumbers.length === 0) {
    return "";
  }

  if (sortedNumbers.length === 1) {
    return `#${sortedNumbers[0]}`;
  }

  return `#${sortedNumbers[0]}–${sortedNumbers[sortedNumbers.length - 1]}`;
}

function mapHouseholdToDirectoryProfile(household: MissionaryHouseholdDirectoryRow): MissionaryDirectoryProfile {
  const roleTags: string[] = [];
  const functionTags: string[] = [];
  const showPhotos = household.show_photos !== false;

  household.missionary_tags?.forEach((tag) => {
    if (tag.tag_type === "role") {
      roleTags.push(tag.tag);
    }

    if (tag.tag_type === "function") {
      functionTags.push(tag.tag);
    }
  });
  const primaryState = normalizePrimaryState(household.primary_state) ?? normalizePrimaryState(household.location);
  const locationVisibility = normalizeLocationVisibility(household.location_visibility);

  return {
    displayNumber: getDisplayNumber(household.missionary_people),
    functionTags,
    image: showPhotos ? household.profile_image_url || directoryImageFallback : null,
    location: locationVisibility === "hidden" ? "Undisclosed Location" : primaryState || household.location || "United States",
    name: household.display_name,
    roleTags,
    slug: household.slug,
  };
}

function ActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
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

export default async function MissionariesPage() {
  const missionaryHouseholdsResult = await getMissionaryHouseholdsResult();
  const missionaries = missionaryHouseholdsResult.data.map(mapHouseholdToDirectoryProfile);
  const emptyMessage = missionaryHouseholdsResult.error
    ? "Error loading missionary data."
    : "Connected to Supabase, but no missionary records found.";

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <PrimaryNav active="support" />

      <section className="relative overflow-hidden px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:72px_72px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(212,166,61,0.1),transparent_26%),radial-gradient(ellipse_at_center,transparent_30%,#050505_100%)]" />
        <div className="relative mx-auto max-w-6xl">
          <p className="tactical-label uppercase" style={{ fontFamily: font.rajdhani }}>
            The Team
          </p>
          <h1 className="mt-6 text-5xl font-bold leading-none tracking-tight text-stone-100 md:text-7xl" style={{ fontFamily: font.oswald }}>
            Meet the Missionaries
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-stone-400 md:text-lg">
            A growing network of laborers reaching the lost, making disciples, and multiplying the mission across America.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <ActionLink href="/support">Support The Mission</ActionLink>
            <ActionLink href="/mission" variant="secondary">Become A Missionary</ActionLink>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 px-6 py-16 text-stone-950 md:py-20">
        <div className="mx-auto max-w-6xl">
          <MissionaryDirectory emptyMessage={emptyMessage} missionaries={missionaries} />
        </div>
      </section>
    </main>
  );
}
