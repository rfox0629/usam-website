import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Prayer Team Application",
  description: "Apply to join the USA Missionaries Prayer Team.",
  // The form itself, not the invitation. /prayer and /prayer/join are the pages
  // meant to be found and shared; robots.txt already disallowed this one.
  robots: {
    follow: false,
    index: false,
  },
};

export default function PrayerPartnerApplicationPage() {
  redirect("/prayer?join=1");
}
