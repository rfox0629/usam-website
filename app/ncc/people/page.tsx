import type { Metadata } from "next";
import { NccPlanned } from "../_components/NccPlanned";
import { requireFullNccAccess } from "../_lib/require-full-ncc-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "People | National Command Center",
};

export default async function NccPeoplePage() {
  await requireFullNccAccess();

  return (
    <NccPlanned
      activeKey="people"
      crossLinks={[
        { href: "/admin/applications", label: "Applicants (Legacy)" },
        { href: "/admin/profiles", label: "Profiles (Legacy)" },
      ]}
    />
  );
}
