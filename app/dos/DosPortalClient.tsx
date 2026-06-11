"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

type SetupType = "church" | "ministry_team" | "personal" | "usa_missionaries";
type TeamStatus = "individual" | "married_team";
type RoleCalling = "church_leader" | "disciple_maker" | "ministry_partner" | "prayer_partner" | "usa_missionary";

type PortalForm = {
  city: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  phone: string;
  roleCalling: RoleCalling;
  setupType: SetupType;
  spouseEmail: string;
  spouseName: string;
  state: string;
  teamStatus: TeamStatus;
};

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

const setupOptions: Array<{ description: string; label: string; value: SetupType }> = [
  { description: "Joining the national missionary network.", label: "Joining USA Missionaries", value: "usa_missionaries" },
  { description: "Using DOS through a church or local ministry.", label: "Joining through church", value: "church" },
  { description: "Starting with your own field.", label: "Personal DOS use", value: "personal" },
];

const roleOptions: Array<{ label: string; value: RoleCalling }> = [
  { label: "USA Missionary", value: "usa_missionary" },
  { label: "Disciple Maker", value: "disciple_maker" },
  { label: "Church Leader", value: "church_leader" },
  { label: "Prayer Partner", value: "prayer_partner" },
  { label: "Ministry Partner", value: "ministry_partner" },
];

const initialForm: PortalForm = {
  city: "",
  email: "",
  firstName: "",
  lastName: "",
  organizationName: "",
  phone: "",
  roleCalling: "disciple_maker",
  setupType: "usa_missionaries",
  spouseEmail: "",
  spouseName: "",
  state: "",
  teamStatus: "individual",
};

export function DosPortalClient({
  isAuthenticated = false,
  launchWorkspaces = [],
}: DosPortalClientProps) {
  const [form, setForm] = useState<PortalForm>(initialForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [workspaceHref, setWorkspaceHref] = useState("");
  const needsOrganization = form.setupType === "church" || form.setupType === "ministry_team";
  const showTeamFields = form.teamStatus === "married_team";

  function update<K extends keyof PortalForm>(key: K, value: PortalForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWorkspaceHref("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/dos/portal/workspaces", {
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json() as { error?: string; workspaceHref?: string };

      if (!response.ok || !payload.workspaceHref) {
        throw new Error(payload.error ?? "Unable to set up this workspace.");
      }

      setWorkspaceHref(payload.workspaceHref);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to set up this workspace.");
    } finally {
      setIsSaving(false);
    }
  }

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
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#64748B]">
              Select the DOS workspace you want to open. Setup and test workspaces stay available here, but they are not promoted as your default workspace.
            </p>
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
              <h2 className="text-lg font-bold tracking-[-0.02em] text-[#0F172A]">No workspace found</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                Create a workspace or ask an admin to connect your account to the right DOS workspace.
              </p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
                href="/join"
              >
                Start Setup
              </Link>
            </section>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="dos-portal-route min-h-screen bg-[#FAFBFD] text-[#0F172A]">
      <PortalRouteStyles />
      <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)] lg:items-center lg:py-12">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">DOS</p>
          <h1 className="mt-4 max-w-xl text-5xl font-bold leading-[0.95] tracking-[-0.055em] text-[#0F172A] sm:text-6xl">
            Start your DOS field
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#64748B]">
            Create your personal workspace and begin walking with people.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#2563EB] px-6 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8]" href="#get-started">
              Get Started
            </a>
            <Link className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#E2E8F0] bg-white px-6 text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB]" href="/login?next=/dos">
              Sign In
            </Link>
          </div>
        </section>

        <section className="rounded-[30px] border border-[#E2E8F0] bg-white p-4 shadow-[0_20px_56px_rgba(15,23,42,0.08)] sm:p-5" id="get-started">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">Start</p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em]">Create your personal workspace</h2>
            </div>
            <span className="rounded-full bg-[#EBF2FF] px-3 py-1.5 text-xs font-semibold text-[#2563EB]">MVP</span>
          </div>

          {workspaceHref ? (
            <div className="mt-5 rounded-[24px] border border-[#BFDBFE] bg-[#EBF2FF] p-4">
              <h3 className="text-base font-bold text-[#0F172A]">Workspace ready</h3>
              <p className="mt-2 text-sm leading-6 text-[#475569]">
                Your personal DOS workspace has been created. Sign in to continue.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#2563EB] px-4 text-sm font-semibold text-white" href={workspaceHref}>
                  Open DOS
                </Link>
                <Link className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#BFDBFE] bg-white px-4 text-sm font-semibold text-[#0F172A]" href={`/login?next=${encodeURIComponent(workspaceHref)}`}>
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" onChange={(value) => update("firstName", value)} required value={form.firstName} />
                <Input label="Last name" onChange={(value) => update("lastName", value)} required value={form.lastName} />
              </div>
              <Input label="Email" onChange={(value) => update("email", value)} required type="email" value={form.email} />
              <Input label="Phone" onChange={(value) => update("phone", value)} type="tel" value={form.phone} />
              <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3">
                <Input label="City" onChange={(value) => update("city", value)} value={form.city} />
                <Input label="State" onChange={(value) => update("state", value)} maxLength={2} value={form.state} />
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B]">Setup type</p>
                <div className="grid gap-2">
                  {setupOptions.map((option) => (
                    <button
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        form.setupType === option.value
                          ? "border-[#2563EB] bg-[#EBF2FF]"
                          : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#BFDBFE]"
                      }`}
                      key={option.value}
                      onClick={() => update("setupType", option.value)}
                      type="button"
                    >
                      <span className="block text-sm font-bold">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#64748B]">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {needsOrganization ? (
                <Input label="Church / organization name" onChange={(value) => update("organizationName", value)} required value={form.organizationName} />
              ) : null}

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B]">Marital / team status</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Individual", value: "individual" },
                    { label: "Married / team", value: "married_team" },
                  ].map((option) => (
                    <button
                      className={`rounded-2xl border px-3 py-3 text-left text-sm font-bold transition ${
                        form.teamStatus === option.value
                          ? "border-[#2563EB] bg-[#EBF2FF] text-[#0F172A]"
                          : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:border-[#BFDBFE]"
                      }`}
                      key={option.value}
                      onClick={() => update("teamStatus", option.value as TeamStatus)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {showTeamFields ? (
                <div className="grid gap-3 rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <Input label="Spouse / team member name" onChange={(value) => update("spouseName", value)} value={form.spouseName} />
                  <Input label="Spouse / team member email" onChange={(value) => update("spouseEmail", value)} type="email" value={form.spouseEmail} />
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B]">Role / calling</p>
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((option) => (
                    <button
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        form.roleCalling === option.value
                          ? "bg-[#2563EB] text-white"
                          : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB]"
                      }`}
                      key={option.value}
                      onClick={() => update("roleCalling", option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <button className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-70" disabled={isSaving} type="submit">
                {isSaving ? "Setting Up" : "Create Workspace"}
              </button>
            </form>
          )}
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

function Input({
  label,
  maxLength,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#64748B]">{label}</span>
      <input
        className="min-h-12 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:bg-white"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}
