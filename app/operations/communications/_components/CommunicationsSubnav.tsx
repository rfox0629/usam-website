import Link from "next/link";
import { operationsFont } from "../../_components/OperationsUI";

export const communicationsSections = [
  { href: "/operations/communications", key: "overview", title: "Overview" },
  { href: "/operations/communications/audience", key: "audience", title: "Audience" },
  { href: "/operations/communications/newsletters", key: "newsletters", title: "Newsletters" },
] as const;

export type CommunicationsSection = typeof communicationsSections[number]["key"];

/** Same quiet subnav treatment Finance uses, so the area feels native. */
export function CommunicationsSubnav({ active }: { active: CommunicationsSection }) {
  return (
    <nav aria-label="Communications sections" className="-mx-4 mb-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-1 border-b border-slate-200 pb-px">
        {communicationsSections.map((section) => (
          <Link
            className={`inline-flex min-h-9 items-center rounded-t-md px-3 text-[11px] uppercase tracking-[0.12em] transition ${
              active === section.key
                ? "border-b-2 border-[#D8A932] text-slate-950"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-900"
            }`}
            href={section.href}
            key={section.key}
            style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
          >
            {section.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}
