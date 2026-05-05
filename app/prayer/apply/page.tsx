import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Prayer Team Application | USA Missionaries",
  description: "Apply to join the USA Missionaries Prayer Team.",
};

export default function PrayerPartnerApplicationPage() {
  redirect("/prayer?join=1");
}
