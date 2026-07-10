import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const template = fs.readFileSync(path.join(root, "src/components/missionaries/MissionaryProfileTemplate.tsx"), "utf8");
const prayerLoader = fs.readFileSync(path.join(root, "src/lib/missionaries/prayer.ts"), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`Missionary profile prayer regression failed: ${message}`);
    process.exit(1);
  }
}

assert(
  template.includes("function PrayerProfileCard"),
  "public missionary profiles must have a Prayer card render path.",
);

assert(
  template.includes("JoinPrayerTeamModal")
    && template.includes("SubmitPrayerRequestModal")
    && template.includes("PrayerRequestPreviewList"),
  "Prayer card must expose partner signup, request submission, and public request previews.",
);

assert(
  template.includes("showPrayer={showPrayer}")
    && template.includes("const showPrayer = features.showPrayer"),
  "MissionaryProfileSection must receive the feature-gated showPrayer flag.",
);

assert(
  prayerLoader.includes('const publicProfilePrayerVisibilities = ["public_profile", "public"] as const'),
  "public profile prayer loader must accept canonical and legacy public visibility values.",
);

assert(
  prayerLoader.includes('.in("visibility", [...publicProfilePrayerVisibilities])'),
  "public profile prayer request queries must use the shared public visibility allowlist.",
);

assert(
  prayerLoader.includes("function isPublicProfilePrayerVisibility")
    && prayerLoader.includes("isPublicProfilePrayerVisibility(row.visibility"),
  "public profile prayer mapper/counts must use the shared public visibility allowlist.",
);

assert(
  prayerLoader.includes("!isPublicProfilePrayerVisibility(row.visibility"),
  "legacy public prayer requests must not be counted as internal requests.",
);

console.log("Missionary profile prayer regression passed.");
