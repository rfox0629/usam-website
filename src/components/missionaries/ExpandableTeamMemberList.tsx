"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MissionaryHouseholdMember } from "@/src/data/missionaries";

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };
const publicTrainingRoleLabel = "Missionary in Training";

function publicRoleLabel(member: MissionaryHouseholdMember) {
  return member.roleTitle?.trim() || publicTrainingRoleLabel;
}

export function ExpandableTeamMemberList({
  members,
}: {
  members: readonly MissionaryHouseholdMember[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleMembers = expanded ? members : members.slice(0, 4);
  const hiddenMemberCount = Math.max(members.length - 4, 0);

  return (
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
              <span className="text-[9px] uppercase tracking-[0.14em] text-[#C2A14E]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
                {member.publicNumber}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-stone-400">
            {publicRoleLabel(member)}
          </p>
        </div>
      ))}
      {hiddenMemberCount > 0 ? (
        <button
          className="flex min-h-9 items-center justify-between gap-2 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 text-left text-xs uppercase tracking-[0.16em] text-[#C2A14E] transition-colors hover:border-[#C2A14E]/45 hover:bg-[#C2A14E]/10"
          onClick={() => setExpanded((current) => !current)}
          style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
          type="button"
        >
          <span>{expanded ? "Show less" : `+${hiddenMemberCount} more`}</span>
          {expanded ? (
            <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          ) : (
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          )}
        </button>
      ) : null}
    </div>
  );
}
