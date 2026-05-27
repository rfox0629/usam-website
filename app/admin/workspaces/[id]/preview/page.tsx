import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Heart, Home, Import, Plus, UserPlus, Users } from "lucide-react";
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

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof UserPlus;
  label: string;
}) {
  return (
    <Link
      className="flex min-h-24 flex-col justify-between rounded-2xl border border-[#E2DED6] bg-white p-4 text-[#111111] shadow-[0_14px_34px_rgba(42,37,29,0.06)] transition-colors hover:border-[#D1A63C]"
      href={href}
    >
      <Icon className="h-5 w-5 text-[#A86F00]" aria-hidden="true" />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function BottomNavItem({
  active = false,
  icon: Icon,
  label,
}: {
  active?: boolean;
  icon: typeof Home;
  label: string;
}) {
  return (
    <span className={`grid justify-items-center gap-1 text-[10px] ${active ? "text-[#111111]" : "text-[#8E8880]"}`}>
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

  return (
    <main className="min-h-screen bg-[#050505] px-3 py-4 text-stone-100 sm:px-5 sm:py-6">
      <section className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone-400 transition-colors hover:text-[#E4C465]"
              href="/admin/organizations"
              style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Organizations
            </Link>
            <p className="mt-3 text-sm text-stone-400">Preview mode: workspace user</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminBadge tone="amber">View as User</AdminBadge>
            <AdminBadge tone="muted">UI visibility only</AdminBadge>
          </div>
        </div>

        <section className="mx-auto max-w-md overflow-hidden rounded-[32px] border border-[#DED9CF] bg-[#F5F3EE] text-[#1F1D1A] shadow-[0_30px_90px_rgba(0,0,0,0.22)] md:max-w-3xl">
          <header className="sticky top-0 z-10 border-b border-[#E2DED6] bg-[#F5F3EE]/95 px-5 py-4 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#A86F00]" style={{ fontFamily: adminFont.rajdhani }}>
                  Workspace
                </p>
                <h1 className="mt-2 truncate text-3xl font-bold leading-none text-[#111111]" style={{ fontFamily: adminFont.oswald }}>
                  {preview.workspace.displayName}
                </h1>
                <p className="mt-2 text-sm text-[#746F67]">{preview.organizationName}</p>
              </div>
              <span className="rounded-full border border-[#DED9CF] bg-white px-3 py-2 text-xs font-semibold text-[#5D574F]">
                {preview.counts.members} members
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-semibold text-white"
                href={`/dos/app?workspace=${encodeURIComponent(preview.workspace.slug)}`}
                target="_blank"
              >
                Open DOS
              </Link>
              {preview.features.publicProfileEnabled ? (
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#D7D0C4] bg-white px-5 text-sm font-semibold text-[#111111]"
                  href={`/missionaries/${preview.workspace.slug}`}
                  target="_blank"
                >
                  Public Profile
                </Link>
              ) : null}
            </div>
          </header>

          <div className="space-y-4 px-5 pb-24 pt-5">
            <section className="rounded-3xl border border-[#E0DBD1] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E8880]" style={{ fontFamily: adminFont.rajdhani }}>
                This Week&apos;s Mission
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#F0ECE4] p-3">
                  <p className="text-2xl font-bold">{preview.counts.fieldPeople}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#746F67]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Follow ups</p>
                </div>
                <div className="rounded-2xl bg-[#F0ECE4] p-3">
                  <p className="text-2xl font-bold">{preview.counts.prayerRequests}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#746F67]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Prayer</p>
                </div>
                <div className="rounded-2xl bg-[#F0ECE4] p-3">
                  <p className="text-2xl font-bold">{preview.counts.meetings}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#746F67]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Meetings</p>
                </div>
                <div className="rounded-2xl bg-[#F0ECE4] p-3">
                  <p className="text-2xl font-bold">{preview.counts.fruit}</p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#746F67]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>Next step</p>
                </div>
              </div>
            </section>

            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E8880]" style={{ fontFamily: adminFont.rajdhani }}>
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction href={`/admin/missionary-profiles?tab=people&profile=${preview.workspace.slug}`} icon={UserPlus} label="Add Person" />
                <QuickAction href={`/admin/missionary-profiles?tab=meetings&profile=${preview.workspace.slug}`} icon={Plus} label="Log Meeting" />
                <QuickAction href="/admin/prayer-team" icon={Heart} label="Prayer Request" />
                <QuickAction href={`/admin/missionary-profiles?tab=people&profile=${preview.workspace.slug}`} icon={Import} label="Import Contacts" />
              </div>
            </section>

            <section className="rounded-3xl border border-[#E0DBD1] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E8880]" style={{ fontFamily: adminFont.rajdhani }}>
                Mission Feed
              </p>
              <div className="mt-4 space-y-2">
                {preview.activity.length > 0 ? (
                  preview.activity.map((item) => (
                    <Link
                      className="block rounded-2xl border border-[#ECE7DD] bg-[#FBFAF7] p-3 transition-colors hover:border-[#D1A63C]"
                      href={item.href}
                      key={item.id}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[#111111]">{item.title}</span>
                        <span className="text-xs text-[#8E8880]">{formatDate(item.timestamp)}</span>
                      </span>
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.14em] text-[#A86F00]" style={{ fontFamily: adminFont.rajdhani }}>
                        {item.label}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-sm text-[#746F67]">{item.detail}</span>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-2xl border border-[#ECE7DD] bg-[#FBFAF7] p-4 text-sm text-[#746F67]">
                    No mission activity yet.
                  </p>
                )}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              {["Field", "Prayer", preview.features.publicProfileEnabled ? "Public Profile" : "More", "Resources", "Imports", "Settings"].map((tool) => (
                <span className="rounded-2xl border border-[#E0DBD1] bg-white px-3 py-3 text-sm font-semibold text-[#2C2923]" key={tool}>
                  {tool}
                </span>
              ))}
            </section>
          </div>

          <nav className="sticky bottom-0 grid grid-cols-4 border-t border-[#E2DED6] bg-[#F8F7F3]/95 px-5 pb-4 pt-3 backdrop-blur" aria-label="Workspace preview navigation">
            <BottomNavItem active icon={Home} label="Home" />
            <BottomNavItem icon={Users} label="Field" />
            <BottomNavItem icon={Heart} label="Prayer" />
            <BottomNavItem icon={BookOpen} label={preview.features.publicProfileEnabled ? "Profile" : "More"} />
          </nav>
        </section>
      </section>
    </main>
  );
}
