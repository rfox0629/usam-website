"use client";

import Link from "next/link";

type LaunchWorkspace = {
  displayName: string;
  href: string;
  id: string;
  isConfirmedDefault: boolean;
  isLikelyTest: boolean;
  slug: string;
  statusLabel: string;
};

type DosPortalClientProps = {
  isAuthenticated?: boolean;
  launchWorkspaces?: LaunchWorkspace[];
};

export function DosPortalClient({
  isAuthenticated = false,
  launchWorkspaces = [],
}: DosPortalClientProps) {
  if (isAuthenticated) {
    return (
      <div className="dos-portal-route min-h-screen bg-[#FAFBFD] text-[#0F172A]">
        <PortalRouteStyles />
        <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 px-4 py-8 sm:px-6">
          <section className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">DOS</p>
            <h1 className="mt-4 text-4xl font-bold leading-[0.95] tracking-[-0.045em] text-[#0F172A] sm:text-5xl">
              Choose your workspace
            </h1>
          </section>

          {launchWorkspaces.length ? (
            <section className="grid gap-3">
              {launchWorkspaces.map((workspace) => (
                <article
                  className="flex flex-col gap-4 rounded-[24px] border border-[#E2E8F0] bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between"
                  key={workspace.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold tracking-[-0.02em] text-[#0F172A]">{workspace.displayName}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        workspace.isConfirmedDefault
                          ? "bg-[#DCFCE7] text-[#166534]"
                          : workspace.isLikelyTest
                            ? "bg-[#FEF3C7] text-[#92400E]"
                            : "bg-[#E2E8F0] text-[#475569]"
                      }`}>
                        {workspace.statusLabel}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs font-medium text-[#64748B]">{workspace.slug}</p>
                  </div>
                  <Link
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
                    href={workspace.href}
                  >
                    Open DOS
                  </Link>
                </article>
              ))}
            </section>
          ) : (
            <section className="rounded-[24px] border border-[#E2E8F0] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">No workspace yet</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Finish setup to create your DOS workspace, or ask an admin to connect your account to an existing one.
              </p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
                href="/join"
              >
                Finish Setup
              </Link>
            </section>
          )}
        </main>
      </div>
    );
  }

  // USA-138: the signed-out portal used to render a ten-field onboarding form
  // whose submit handler discarded every value and redirected to /login. Setup
  // now points at /join, which is the flow that actually provisions a workspace.
  return (
    <div className="dos-portal-route min-h-screen bg-[#FAFBFD] text-[#0F172A]">
      <PortalRouteStyles />
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-4 py-8 sm:px-6">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">DOS</p>
          <h1 className="mt-4 text-4xl font-bold leading-[0.95] tracking-[-0.045em] text-[#0F172A] sm:text-5xl">
            Start your DOS field
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-[#64748B]">
            Create your workspace and begin walking with people.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8]"
              href="/join"
            >
              Get Started
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-6 text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB]"
              href="/login?next=/dos"
            >
              Sign In
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function PortalRouteStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          body:has(.dos-portal-route) {
            background: #FAFBFD !important;
            color: #0F172A;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }

          .dos-portal-route,
          .dos-portal-route * {
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          }

          body:has(.dos-portal-route) > footer {
            display: none !important;
          }
        `,
      }}
    />
  );
}
