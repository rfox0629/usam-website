import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Join the Prayer Team | USA Missionaries",
  description: "Apply to join the USA Missionaries Prayer Team.",
};

export default function PrayerTeamJoinPage() {
  redirect("/prayer?join=1");
}
