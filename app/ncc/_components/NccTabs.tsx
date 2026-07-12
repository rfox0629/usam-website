import Link from "next/link";
import { adminFont } from "../../admin/_components/AdminUI";

export type NccTab = {
  key: string;
  label: string;
  status: "live" | "planned";
};

export function NccTabBar({
  basePath,
  currentTab,
  tabs,
}: {
  basePath: string;
  currentTab: string;
  tabs: readonly NccTab[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-stone-800/70 pb-3">
      {tabs.map((tab) => {
        const active = tab.key === currentTab;

        return (
          <Link
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] uppercase tracking-[0.14em] transition-colors ${
              active
                ? "border-[#C9A24A]/50 bg-[#C9A24A]/10 text-[#E4C465]"
                : "border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-100"
            }`}
            href={`${basePath}?tab=${tab.key}`}
            key={tab.key}
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            {tab.label}
            {tab.status === "planned" ? <span className="text-[9px] text-stone-600">Planned</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
