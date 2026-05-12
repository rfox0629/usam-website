import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "../_components/AdminShell";
import { adminFont, type AdminBadgeTone } from "../_components/AdminUI";
import { addAdminUser, removeAdminUser, updateAdminUser, updateSystemAccessCodes } from "./actions";
import { adminRoles, canManageAdminSettings, getAdminAuthorization, type AdminRole } from "@/src/lib/admin-auth";
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from "@/src/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Admin Settings | USA Missionaries",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

const inputClassName = "mt-2 min-h-10 w-full rounded-lg border border-stone-800 bg-[#050505] px-3 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]";
const primaryButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-lg border border-transparent bg-[#D4A63D] px-4 text-[11px] uppercase tracking-[0.14em] text-black transition-colors hover:bg-[#F5B942]";
const secondaryButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-700 px-4 text-[11px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]";
const dangerButtonClassName = "inline-flex min-h-10 items-center justify-center rounded-lg border border-red-500/35 px-4 text-[11px] uppercase tracking-[0.14em] text-red-200 transition-colors hover:bg-red-950/25";
const badgeToneClassName: Record<AdminBadgeTone, string> = {
  amber: "border-[#C9A24A]/35 bg-[#C9A24A]/10 text-[#E4C465]",
  blue: "border-blue-400/25 bg-blue-950/30 text-blue-300",
  green: "border-green-500/25 bg-green-950/30 text-green-300",
  muted: "border-stone-700 bg-stone-900/70 text-stone-300",
  red: "border-red-500/35 bg-red-950/25 text-red-200",
};

type SearchParams = {
  error?: string;
  saved?: string;
};

type AccessCodeType = "preview" | "system" | "team";

type SystemAccessCodeRow = {
  active: boolean;
  code: string;
  code_type: AccessCodeType;
  updated_at: string;
};

type AdminUserRow = {
  created_at: string;
  email: string;
  id: string;
  is_active: boolean;
  role: AdminRole;
};

const accessCodeFields: Array<{
  description: string;
  label: string;
  name: AccessCodeType;
}> = [
  {
    description: "Used by the System page access modal.",
    label: "System Access Code",
    name: "system",
  },
  {
    description: "Used by the Support page View the Team access modal.",
    label: "Team Access Code",
    name: "team",
  },
  {
    description: "Used for the protected DOS preview experience.",
    label: "DOS Preview Access Code",
    name: "preview",
  },
];

function isMissingAccessCodesTable(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  return code === "42P01"
    || code === "PGRST205"
    || message.includes("system_access_codes")
    || message.includes("schema cache")
    || message.includes("does not exist");
}

function isMissingAdminUsersTableOrColumn(error: { code?: string; message?: string } | null | undefined) {
  const code = error?.code ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  return code === "42P01"
    || code === "PGRST205"
    || message.includes("admin_users")
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("is_active");
}

function formatDate(value?: string) {
  if (!value) {
    return "Not saved yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusMessage(params: SearchParams) {
  if (params.saved === "access-codes") {
    return {
      tone: "success" as const,
      text: "System access codes saved.",
    };
  }

  if (params.saved === "admin-user") {
    return {
      tone: "success" as const,
      text: "Admin permissions saved.",
    };
  }

  if (!params.error) {
    return null;
  }

  const errorCopy: Record<string, string> = {
    "admin-email": "Enter a valid admin email address.",
    "admin-role": "Choose a valid admin role.",
    "admin-user-missing": "Select an admin user before saving.",
    "preview-missing": "Enter a DOS Preview Access Code before saving.",
    "self-admin": "Keep your own account active with the admin role before saving.",
    "self-remove": "You cannot remove your own admin account.",
    "supabase": "Supabase admin environment variables are not configured.",
    "system-missing": "Enter a System Access Code before saving.",
    "team-missing": "Enter a Team Access Code before saving.",
    "unauthorized": "Admin role is required to manage Settings.",
  };

  return {
    tone: "error" as const,
    text: errorCopy[params.error] ?? params.error,
  };
}

function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: AdminBadgeTone;
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center justify-center rounded-full border px-2 text-[9px] uppercase tracking-[0.13em] ${badgeToneClassName[tone]}`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </span>
  );
}

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "amber" | "error" | "info" | "success" }) {
  const className = {
    amber: "border-l-[#D4A63D] bg-amber-950/10 text-amber-100",
    error: "border-l-red-400 bg-red-950/10 text-red-100",
    info: "border-l-stone-500 bg-stone-950/60 text-stone-300",
    success: "border-l-green-400 bg-green-950/15 text-green-200",
  }[tone];

  return <div className={`rounded-xl border border-stone-800/75 border-l-2 px-4 py-3 text-sm leading-6 ${className}`}>{children}</div>;
}

function Section({
  badge,
  children,
  title,
}: {
  badge?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 md:p-5">
      <div className="flex flex-col gap-3 border-b border-stone-800/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]"
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
          >
            {title}
          </p>
        </div>
        {badge ? <div className="flex flex-wrap gap-2">{badge}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-stone-800/75 bg-[#050505] p-5">
      <p className="text-sm font-semibold text-stone-100">{title}</p>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.15em] text-stone-400" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function InviteAdminForm() {
  return (
    <form action={addAdminUser} className="grid gap-3 rounded-xl border border-stone-800/75 bg-[#050505] p-3 lg:grid-cols-[minmax(220px,1fr)_180px_auto]">
      <label>
        <FieldLabel>Email</FieldLabel>
        <input
          autoComplete="email"
          className={inputClassName}
          name="email"
          placeholder="name@example.com"
          required
          type="email"
        />
      </label>
      <label>
        <FieldLabel>Role</FieldLabel>
        <select className={`${inputClassName} capitalize`} defaultValue="viewer" name="role">
          {adminRoles.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </label>
      <button className={`${primaryButtonClassName} self-end`} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }} type="submit">
        Invite
      </button>
    </form>
  );
}

function AdminUserCard({ user }: { user: AdminUserRow }) {
  return (
    <article className="rounded-xl border border-stone-800/75 bg-[#050505] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_160px_130px_auto] lg:items-center">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-100">{user.email}</p>
          <p className="mt-1 text-xs text-stone-500">{formatDate(user.created_at)}</p>
        </div>
        <form action={updateAdminUser} className="contents" id={`admin-user-${user.id}`}>
          <input name="admin_user_id" type="hidden" value={user.id} />
          <label>
            <FieldLabel>Role</FieldLabel>
            <select className={`${inputClassName} capitalize`} defaultValue={user.role} name="role">
              {adminRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-10 items-center gap-2 pt-5 text-[10px] uppercase tracking-[0.14em] text-stone-300 lg:pt-6" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            <input
              className="h-4 w-4 accent-[#D4A63D]"
              defaultChecked={user.is_active}
              name="is_active"
              type="checkbox"
            />
            Active
          </label>
        </form>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button className={secondaryButtonClassName} form={`admin-user-${user.id}`} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }} type="submit">
            Save
          </button>
          <form action={removeAdminUser}>
            <input name="admin_user_id" type="hidden" value={user.id} />
            <button className={dangerButtonClassName} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }} type="submit">
              Remove
            </button>
          </form>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={user.is_active ? "green" : "muted"}>{user.is_active ? "Active" : "Disabled"}</Badge>
        <Badge>{user.role}</Badge>
      </div>
    </article>
  );
}

function AccessCodeCard({
  field,
  row,
}: {
  field: typeof accessCodeFields[number];
  row?: SystemAccessCodeRow;
}) {
  return (
    <article className="rounded-xl border border-stone-800/75 bg-[#050505] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(180px,0.85fr)_minmax(220px,1fr)_120px] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-100">{field.label}</p>
          <p className="mt-1 text-xs text-stone-500">{formatDate(row?.updated_at)}</p>
        </div>
        <label>
          <FieldLabel>Code</FieldLabel>
          <input
            autoComplete="off"
            className={inputClassName}
            defaultValue={row?.code ?? ""}
            id={`${field.name}_code`}
            name={`${field.name}_code`}
            placeholder="Enter access code"
            required
            type="password"
          />
        </label>
        <label className="flex min-h-10 items-center gap-2 pt-5 text-[10px] uppercase tracking-[0.14em] text-stone-300 lg:pt-6" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          <input
            className="h-4 w-4 accent-[#D4A63D]"
            defaultChecked={row?.active ?? true}
            name={`${field.name}_active`}
            type="checkbox"
          />
          Active
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge tone={row?.active ?? true ? "green" : "muted"}>{row?.active ?? true ? "Active" : "Disabled"}</Badge>
      </div>
    </article>
  );
}

async function loadAccessCodes() {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      rows: [] as SystemAccessCodeRow[],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("system_access_codes")
    .select("code, code_type, active, updated_at")
    .order("code_type", { ascending: true });

  if (error) {
    return {
      error: isMissingAccessCodesTable(error)
        ? "Apply the system_access_codes migration before access codes can be managed here."
        : error.message,
      rows: [] as SystemAccessCodeRow[],
    };
  }

  return {
    error: "",
    rows: (data ?? []) as SystemAccessCodeRow[],
  };
}

async function loadAdminUsers() {
  if (!isSupabaseAdminConfigured()) {
    return {
      error: "Supabase admin environment variables are not configured.",
      rows: [] as AdminUserRow[],
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email, role, is_active, created_at")
    .order("email", { ascending: true });

  if (error) {
    return {
      error: isMissingAdminUsersTableOrColumn(error)
        ? "Apply the admin access permissions migration before admin users can be managed here."
        : error.message,
      rows: [] as AdminUserRow[],
    };
  }

  return {
    error: "",
    rows: (data ?? []) as AdminUserRow[],
  };
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const authorization = await getAdminAuthorization();
  const canManageSettings = canManageAdminSettings(authorization);
  const { error, rows } = canManageSettings
    ? await loadAccessCodes()
    : { error: "", rows: [] as SystemAccessCodeRow[] };
  const { error: adminUsersError, rows: adminUsers } = canManageSettings
    ? await loadAdminUsers()
    : { error: "", rows: [] as AdminUserRow[] };
  const message = statusMessage(params);
  const rowByType = new Map(rows.map((row) => [row.code_type, row]));

  return (
    <AdminShell active="settings" title="Admin Settings">
      <div className="space-y-5">
        {!canManageSettings ? (
          <Notice tone="error">
            Admin role is required to manage Settings, access codes, and admin permissions.
          </Notice>
        ) : null}

        {message ? (
          <Notice tone={message.tone === "success" ? "success" : "error"}>
            {message.text}
          </Notice>
        ) : null}

        {error ? (
          <Notice tone="amber">{error}</Notice>
        ) : null}

        {adminUsersError ? (
          <Notice tone="amber">{adminUsersError}</Notice>
        ) : null}

        {canManageSettings ? (
          <>
            <Section
              badge={<Badge tone={adminUsersError ? "amber" : "green"}>{adminUsersError ? "Migration Required" : "User Based"}</Badge>}
              title="Admin Access"
            >
              <div className="grid gap-4">
                <InviteAdminForm />

                <div className="grid gap-3">
                  {adminUsers.length ? adminUsers.map((user) => (
                    <AdminUserCard key={user.id} user={user} />
                  )) : (
                    <EmptyState title="No admin users yet" />
                  )}
                </div>
              </div>
            </Section>

            <Section
              badge={<Badge tone={error ? "amber" : "green"}>{error ? "Migration Required" : "Active"}</Badge>}
              title="System Access"
            >
              <form action={updateSystemAccessCodes} className="grid gap-3">
                {accessCodeFields.map((field) => {
                  const row = rowByType.get(field.name);

                  return <AccessCodeCard field={field} key={field.name} row={row} />;
                })}

                <div className="flex justify-end border-t border-stone-800/70 pt-4">
                  <button className={primaryButtonClassName} style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }} type="submit">
                    Update
                  </button>
                </div>
              </form>
            </Section>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
