import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Heart,
  Home,
  Import,
  Plus,
  Settings,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminBadge, AdminEmptyState, adminFont } from "../../../_components/AdminUI";
import { getAdminAuthorization } from "@/src/lib/admin-auth";
import { loadWorkspacePreviewData } from "@/src/lib/admin/organization-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace Preview | National Command Center",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Recent";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recent";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`
    : name.slice(0, 2);

  return initials.toUpperCase() || "W";
}

function SignalCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-[#F4F0E8] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#706A60]" style={{ fontFamily: adminFont.rajdhani }}>
          {label}
        </p>
        <p className="text-2xl font-bold leading-none text-[#141312]">{value}</p>
      </div>
      <p className="mt-1 text-sm text-[#706A60]">{detail}</p>
    </div>
  );
}

function QuickAction({
  disabled = false,
  href,
  icon: Icon,
  label,
  meta,
}: {
  disabled?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  meta: string;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6EACC] text-[#986800]">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#141312]">{label}</span>
        <span className="mt-0.5 block text-xs text-[#7B756C]">{disabled ? "Coming soon" : meta}</span>
      </span>
    </>
  );

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#E4DED2] bg-white/65 px-3 py-3 opacity-70"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-[#E4DED2] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(47,42,34,0.05)] transition hover:-translate-y-0.5 hover:border-[#D2A943]"
      href={href}
    >
      {content}
    </Link>
  );
}

function SecondaryTool({
  disabled = false,
  href,
  icon: Icon,
  label,
}: {
  disabled?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  const className = "flex items-center justify-between gap-3 rounded-2xl border border-[#E2DDD3] bg-white px-4 py-3 text-sm font-semibold text-[#29251F] transition hover:border-[#D2A943]";
  const content = (
    <>
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-[#9A6B06]" aria-hidden="true" />
        <span>{label}</span>
      </span>
      <span className="text-xs text-[#8B8377]">{disabled ? "Soon" : "Open"}</span>
    </>
  );

  if (disabled) {
    return (
      <span aria-disabled="true" className={`${className} opacity-65`}>
        {content}
      </span>
    );
  }

  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  );
}

function BottomNavItem({
  active = false,
  icon: Icon,
  label,
}: {
  active?: boolean;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className={`grid justify-items-center gap-1 text-[10px] font-semibold ${active ? "text-[#111111]" : "text-[#8E8880]"}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export default async function WorkspacePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authorization = await getAdminAuthorization();

  if (authorization.status !== "authorized") {
    return null;
  }

  const { id } = await params;
  const { error, preview } = await loadWorkspacePreviewData(id);

  if (!preview && !error) {
    notFound();
  }

  if (error || !preview) {
    return (
      <main className="min-h-screen bg-[#050505] px-4 py-6 text-stone-100">
        <section className="mx-auto max-w-2xl">
          <AdminEmptyState
            description={error ?? "Workspace not found."}
            title="Preview unavailable"
          />
        </section>
      </main>
    );
  }

  const workspaceHref = `/admin/missionary-profiles?profile=${preview.workspace.slug}`;
  const dosHref = `/dos/app?workspace=${encodeURIComponent(preview.workspace.slug)}`;
  const publicProfileHref = `/missionaries/${preview.workspace.slug}`;
  const quickActions = [
    { href: `${workspaceHref}&tab=people`, icon: UserPlus, label: "Add Person", meta: "Field" },
    { href: `${workspaceHref}&tab=meetings`, icon: Plus, label: "Log Meeting", meta: "Tables" },
    { href: "/admin/prayer-team", icon: Heart, label: "Prayer Request", meta: "Prayer" },
    { href: `${workspaceHref}&tab=people`, icon: Import, label: "Import Contacts", meta: "CSV" },
  ];
  const visibleMembers = preview.members.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#050505] text-stone-100">
      <section className="border-b border-stone-800/80 bg-[#060606] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone-400 transition-colors hover:text-[#E4C465]"
            href="/admin/organizations"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Command Center
          </Link>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone="amber">Preview only</AdminBadge>
            <AdminBadge tone="muted">Viewing as workspace user</AdminBadge>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="overflow-hidden rounded-[30px] border border-[#2E281F] bg-[#F6F3EC] text-[#1E1B17] shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
          <header className="sticky top-0 z-20 border-b border-[#E2DCCD] bg-[#F6F3EC]/95 px-4 py-4 backdrop-blur lg:static lg:px-7 lg:py-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#A86F00]" style={{ fontFamily: adminFont.rajdhani }}>
                    Workspace
                  </p>
                  <span className="rounded-full border border-[#DED5C6] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#6F675D]">
                    Preview only
                  </span>
                </div>
                <h1 className="mt-2 max-w-3xl break-words text-[2.35rem] font-bold leading-none text-[#111111] sm:text-5xl" style={{ fontFamily: adminFont.oswald }}>
                  {preview.workspace.displayName}
                </h1>
                <p className="mt-2 text-sm text-[#746F67]">{preview.organizationName}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {visibleMembers.length > 0 ? (
                    visibleMembers.map((member) => (
                      <span
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#E4DED2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#312D27]"
                        key={member.id}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D9EFE2] text-[10px] text-[#175C47]">
                          {initialsFor(member.name)}
                        </span>
                        <span className="truncate">{member.name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-[#E4DED2] bg-white px-3 py-1.5 text-xs font-semibold text-[#746F67]">
                      {preview.counts.members} members
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[330px]">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#2A2926]"
                  href={dosHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open DOS
                </Link>
                {preview.features.publicProfileEnabled ? (
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D7D0C4] bg-white px-5 text-sm font-semibold text-[#111111] transition hover:border-[#D2A943]"
                    href={publicProfileHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Public Profile
                  </Link>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-5 px-4 pb-24 pt-5 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_360px] lg:px-7 lg:pb-8 lg:pt-7">
            <div className="space-y-5">
              <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(44,39,31,0.06)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E8880]" style={{ fontFamily: adminFont.rajdhani }}>
                      This Week&apos;s Mission
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[#111111]" style={{ fontFamily: adminFont.oswald }}>
                      What needs attention
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#FFF4D9] px-3 py-1.5 text-xs font-semibold text-[#8B5A00]">
                    Live preview
                  </span>
                </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <SignalCard detail="Open field priorities" label="Follow ups" value={preview.counts.followUps} />
                  <SignalCard detail="Requests in this workspace" label="Prayer requests" value={preview.counts.prayerRequests} />
                  <SignalCard detail="Logged in the last 7 days" label="Recent meetings" value={preview.counts.recentMeetings} />
                  <SignalCard detail="Movement steps recorded" label="Ready for next step" value={preview.counts.readyForNextStep} />
                </div>
              </section>

              <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_40px_rgba(44,39,31,0.06)] sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E8880]" style={{ fontFamily: adminFont.rajdhani }}>
                    Mission Feed
                  </p>
                  <span className="text-xs font-semibold text-[#8E8880]">{preview.activity.length} items</span>
                </div>
                <div className="mt-4 space-y-2">
                  {preview.activity.length > 0 ? (
                    preview.activity.map((item) => (
                      <Link
                        className="group flex items-start gap-3 rounded-2xl border border-[#ECE7DD] bg-[#FBFAF7] p-3 transition hover:border-[#D2A943]"
                        href={item.href}
                        key={item.id}
                      >
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#D8A431]" />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-sm font-semibold text-[#111111]">{item.title}</span>
                            <span className="text-xs text-[#8E8880]">{formatDate(item.timestamp)}</span>
                          </span>
                          <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#A86F00]" style={{ fontFamily: adminFont.rajdhani }}>
                            {item.label}
                          </span>
                          <span className="mt-1 line-clamp-2 block text-sm leading-5 text-[#746F67]">{item.detail}</span>
                        </span>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#B6AEA3] transition group-hover:text-[#A86F00]" aria-hidden="true" />
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-[#ECE7DD] bg-[#FBFAF7] p-4 text-sm text-[#746F67]">
                      No mission activity yet.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E8880]" style={{ fontFamily: adminFont.rajdhani }}>
                  Quick Actions
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {quickActions.map((action) => (
                    <QuickAction
                      href={action.href}
                      icon={action.icon}
                      key={action.label}
                      label={action.label}
                      meta={action.meta}
                    />
                  ))}
                </div>
              </section>

              <section>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E8880]" style={{ fontFamily: adminFont.rajdhani }}>
                  Tools
                </p>
                <div className="space-y-2">
                  <SecondaryTool href={`${workspaceHref}&tab=people`} icon={Users} label="Field" />
                  <SecondaryTool href="/admin/prayer-team" icon={Heart} label="Prayer" />
                  {preview.features.publicProfileEnabled ? (
                    <SecondaryTool href={publicProfileHref} icon={Home} label="Public Profile" />
                  ) : null}
                  <SecondaryTool disabled href="#" icon={BookOpen} label="Resources" />
                  <SecondaryTool href={`${workspaceHref}&tab=people`} icon={Import} label="Imports" />
                  <SecondaryTool href={`${workspaceHref}&tab=features`} icon={Settings} label="Settings" />
                </div>
              </section>
            </aside>
          </div>

          <nav className="sticky bottom-0 grid grid-cols-4 border-t border-[#E2DCCD] bg-[#F9F7F1]/95 px-5 pb-4 pt-3 backdrop-blur lg:hidden" aria-label="Workspace preview navigation">
            <BottomNavItem active icon={Home} label="Home" />
            <BottomNavItem icon={Users} label="Field" />
            <BottomNavItem icon={Heart} label="Prayer" />
            <BottomNavItem icon={BookOpen} label={preview.features.publicProfileEnabled ? "Profile" : "More"} />
          </nav>
        </div>
      </section>
    </main>
  );
}
