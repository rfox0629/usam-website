"use client";

import { AccessCodeModal } from "@/components/forms/AccessCodeModal";

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
      triggerClassName="inline-flex min-h-12 w-full items-center justify-center border border-white/[0.3] bg-transparent px-7 py-3 text-center text-xs uppercase leading-5 tracking-[0.26em] text-white transition-all duration-300 hover:border-amber-400 hover:bg-white/[0.04] sm:w-auto"
      triggerLabel="View the Team"
      type="team"
    />
  );
}
