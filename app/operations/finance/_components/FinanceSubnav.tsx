import Link from "next/link";
import { operationsFont } from "../../_components/OperationsUI";

export const financeSections = [
  { href: "/operations/finance", key: "overview", title: "Overview" },
  { href: "/operations/finance/giving", key: "giving", title: "Giving" },
  { href: "/operations/finance/banking", key: "banking", title: "Banking" },
  { href: "/operations/finance/transactions", key: "transactions", title: "Transactions" },
  { href: "/operations/finance/documents", key: "documents", title: "Documents" },
  { href: "/operations/finance/compliance", key: "compliance", title: "Compliance" },
  { href: "/operations/finance/year-end", key: "year-end", title: "Year End" },
] as const;

export type FinanceSection = typeof financeSections[number]["key"];

/** One quiet row on desktop that wraps into compact rows on narrow screens. */
export function FinanceSubnav({ active }: { active: FinanceSection }) {
  return (
    <nav
      aria-label="Finance sections"
      className="mb-4"
    >
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
        {financeSections.map((section) => (
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
