"use client";

import { AccessCodeModal } from "@/components/forms/AccessCodeModal";
import { secondaryDarkButtonClassName } from "@/components/brandButtons";

export function ViewTeamComingSoonButton({
  hasAccess = false,
  initialOpen = false,
}: {
  hasAccess?: boolean;
  initialOpen?: boolean;
}) {
  return (
    <AccessCodeModal
      alreadyHasAccess={hasAccess}
      initialOpen={initialOpen}
      redirectPath="/missionaries"
      secondaryHref="/system?waitlist=1"
      secondaryLabel="Request Access"
      sourcePage="/support"
      triggerClassName={`${secondaryDarkButtonClassName} w-full sm:w-auto`}
      triggerLabel="View the Team"
      type="team"
    />
  );
}
