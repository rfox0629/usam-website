import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Restricted Access | USA Missionaries",
  description: "Restricted access gate for the USA Missionaries discipleship system.",
};

export default function SystemPreviewPage() {
  redirect("/system?access=1");
}
