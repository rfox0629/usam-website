import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "../_components/AdminShell";

export const metadata: Metadata = {
  title: "Forms & Pages | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

const font = { oswald: "'Oswald', sans-serif", rajdhani: "'Rajdhani', sans-serif" };

const forms = [
  {
    editHref: "/admin/support-team?type=financial_freedom",
    formName: "Financial Freedom Request",
    routesTo: "Support Team",
    status: "Live",
    url: "/financialfreedom",
  },
  {
    editHref: "/admin/support-team?type=support_giving",
    formName: "Support / Giving Commitment",
    routesTo: "Support Team",
    status: "Live",
    url: "/missionaries/ryan-brooke-fox",
  },
  {
    editHref: "/admin/support-team?type=major_gift",
    formName: "Major Gift Inquiry",
    routesTo: "Support Team",
    status: "Live",
    url: "/missionaries/ryan-brooke-fox",
  },
  {
    editHref: "/admin/prayer-team?tab=applications",
    formName: "Prayer Team Application",
    routesTo: "Prayer Team",
    status: "Live",
    url: "/prayer/join",
  },
  {
    editHref: "/admin/prayer-team?tab=requests",
    formName: "Prayer Request",
    routesTo: "Prayer Team",
    status: "Draft",
    url: "/prayer",
  },
  {
    editHref: "/admin/support-team?type=contact",
    formName: "Contact",
    routesTo: "Support Team",
    status: "Draft",
    url: "/",
  },
] as const;

function StatusBadge({ status }: { status: "Draft" | "Live" }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${
        status === "Live"
          ? "border-green-500/25 bg-green-950/30 text-green-300"
          : "border-stone-700 bg-stone-900/70 text-stone-300"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {status}
    </span>
  );
}

function RouteBadge({ routesTo }: { routesTo: string }) {
  const isPrayer = routesTo === "Prayer Team";

  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center border px-2 text-[9px] uppercase tracking-[0.14em] ${
        isPrayer
          ? "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]"
          : "border-blue-400/25 bg-blue-950/30 text-blue-300"
      }`}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {routesTo}
    </span>
  );
}

function ActionLink({ children, href, variant = "outline" }: { children: string; href: string; variant?: "gold" | "outline" }) {
  return (
    <Link
      className={`inline-flex min-h-10 items-center justify-center px-4 text-[11px] uppercase tracking-[0.18em] transition-colors ${
        variant === "gold"
          ? "border border-transparent bg-[#D4A63D] text-black hover:bg-[#F5B942]"
          : "border border-stone-700 text-stone-100 hover:border-[#D4A63D] hover:text-[#F5B942]"
      }`}
      href={href}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
    >
      {children}
    </Link>
  );
}

export default function FormsPagesAdminPage() {
  return (
    <AdminShell
      active="forms-pages"
      description="Control public-facing forms, page entry points, and which operating team receives each submission."
      title="Forms & Pages"
    >
      <div className="space-y-5">
        <div className="border border-stone-800/75 bg-[#080808]/85 p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4A63D]" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            Routing Rule
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-stone-300">
            All public forms submit into <span className="text-stone-100">form_submissions</span>. Prayer Team applications and prayer requests are handled by Prayer Team. All other form submissions are handled by Support Team.
          </p>
        </div>

        <div className="overflow-hidden border border-stone-800/75 bg-[#080808]/85">
          <div className="hidden grid-cols-[1.1fr_1fr_0.45fr_0.65fr_0.8fr] gap-4 border-b border-stone-800/70 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-stone-500 lg:grid" style={{ fontFamily: font.rajdhani, fontWeight: 700 }}>
            <span>Form Name</span>
            <span>URL</span>
            <span>Status</span>
            <span>Routes To</span>
            <span>Actions</span>
          </div>
          <div className="divide-y divide-stone-900">
            {forms.map((form) => (
              <article className="grid gap-3 p-4 lg:grid-cols-[1.1fr_1fr_0.45fr_0.65fr_0.8fr] lg:items-center" key={form.formName}>
                <div>
                  <p className="font-medium text-stone-100">{form.formName}</p>
                  <p className="mt-1 text-xs text-stone-500 lg:hidden">{form.url}</p>
                </div>
                <Link className="text-sm text-stone-300 hover:text-[#F5B942]" href={form.url}>
                  {form.url}
                </Link>
                <StatusBadge status={form.status} />
                <RouteBadge routesTo={form.routesTo} />
                <div className="flex flex-wrap gap-2">
                  <ActionLink href={form.url}>View Form</ActionLink>
                  <ActionLink href={form.editHref} variant="gold">Edit Routing</ActionLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
