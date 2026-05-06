import type { Metadata } from "next";
import { AdminShell } from "../_components/AdminShell";
import { AdminBadge, adminFont } from "../_components/AdminUI";
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
    <AdminShell
      active="settings"
      description="Manage core admin controls, access model, and system-level configuration."
      title="Admin Settings"
    >
      <div className="space-y-5">
        {!canManageSettings ? (
          <p className="border border-red-500/30 bg-red-950/20 p-4 text-sm leading-6 text-red-100">
            Admin role is required to manage Settings, access codes, and admin permissions.
          </p>
        ) : null}

        {message ? (
          <p className={`border p-4 text-sm leading-6 ${
            message.tone === "success"
              ? "border-green-500/25 bg-green-950/20 text-green-100"
              : "border-red-500/30 bg-red-950/20 text-red-100"
          }`}>
            {message.text}
          </p>
        ) : null}

        {error ? (
          <p className="border border-amber-500/30 bg-amber-950/15 p-4 text-sm leading-6 text-amber-100">
            {error}
          </p>
        ) : null}

        {adminUsersError ? (
          <p className="border border-amber-500/30 bg-amber-950/15 p-4 text-sm leading-6 text-amber-100">
            {adminUsersError}
          </p>
        ) : null}

        {canManageSettings ? (
          <>
        <section className="border border-stone-800/75 bg-[#080808]/85 p-5 md:p-6">
          <div className="flex flex-col gap-3 border-b border-stone-800/75 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]"
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              >
                Permissions
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                Admin Access & Permissions
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
                Manage Supabase Auth users allowed into the Command Center. Access codes remain as an optional backup for protected public experiences, not the primary admin login system.
              </p>
              <p className="mt-2 text-xs leading-5 text-stone-500">
                TODO: Expand permissions per feature for DOS, Prayer, Support, and missionary-specific review workflows.
              </p>
            </div>
            <AdminBadge tone={adminUsersError ? "amber" : "green"}>{adminUsersError ? "Migration Needed" : "User-Based"}</AdminBadge>
          </div>

          {canManageSettings ? (
            <>
              <form action={addAdminUser} className="mt-6 grid gap-3 border border-stone-800/75 bg-[#050505] p-4 lg:grid-cols-[minmax(260px,1fr)_220px_auto]">
                <label>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                    Email
                  </span>
                  <input
                    autoComplete="email"
                    className="mt-2 min-h-11 w-full border border-stone-700 bg-[#111111] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
                    name="email"
                    placeholder="name@example.com"
                    required
                    type="email"
                  />
                </label>
                <label>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-stone-300" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                    Role
                  </span>
                  <select
                    className="mt-2 min-h-11 w-full border border-stone-700 bg-[#111111] px-4 text-sm capitalize text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
                    defaultValue="viewer"
                    name="role"
                  >
                    {adminRoles.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="inline-flex min-h-11 items-center justify-center self-end bg-[#D4A63D] px-5 text-xs uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#F5B942]"
                  style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                  type="submit"
                >
                  Add Admin User
                </button>
              </form>

              <div className="mt-5 overflow-hidden border border-stone-800/75">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-stone-800/75 bg-[#050505] text-[10px] uppercase tracking-[0.18em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Active</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-900 bg-[#070707]">
                      {adminUsers.length ? adminUsers.map((user) => (
                        <tr key={user.id} className="align-middle">
                          <td className="px-4 py-3 text-sm text-stone-100">{user.email}</td>
                          <td className="px-4 py-3">
                            <form action={updateAdminUser} id={`admin-user-${user.id}`} className="contents">
                              <input name="admin_user_id" type="hidden" value={user.id} />
                              <select
                                className="min-h-10 w-full max-w-[180px] border border-stone-700 bg-[#111111] px-3 text-sm capitalize text-stone-100 outline-none transition-colors focus:border-[#D4A63D]"
                                defaultValue={user.role}
                                name="role"
                              >
                                {adminRoles.map((role) => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                            </form>
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex min-h-10 items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-stone-300" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                              <input
                                className="h-4 w-4 accent-[#D4A63D]"
                                defaultChecked={user.is_active}
                                form={`admin-user-${user.id}`}
                                name="is_active"
                                type="checkbox"
                              />
                              Active
                            </label>
                          </td>
                          <td className="px-4 py-3 text-sm text-stone-400">{formatDate(user.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.16em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                                form={`admin-user-${user.id}`}
                                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                                type="submit"
                              >
                                Save
                              </button>
                              <form action={removeAdminUser}>
                                <input name="admin_user_id" type="hidden" value={user.id} />
                                <button
                                  className="inline-flex min-h-9 items-center justify-center border border-red-500/35 px-3 text-[10px] uppercase tracking-[0.16em] text-red-200 transition-colors hover:bg-red-950/25"
                                  style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                                  type="submit"
                                >
                                  Remove User
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td className="px-4 py-6 text-sm leading-6 text-stone-400" colSpan={5}>
                            No admin users have been added yet. Add the first admin user above after the migration is applied.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section className="border border-stone-800/75 bg-[#080808]/85 p-5 md:p-6">
          <div className="flex flex-col gap-3 border-b border-stone-800/75 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.2em] text-[#D4A63D]"
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
              >
                System
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-100">
                System Access Codes
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">
                Manage the private codes used for System access, Team access, and the protected DOS preview. These values are loaded server-side and are never sent to public pages.
              </p>
            </div>
            <AdminBadge tone={error ? "amber" : "green"}>{error ? "Migration Needed" : "Active"}</AdminBadge>
          </div>

          <form action={updateSystemAccessCodes} className="mt-6 space-y-4">
            {accessCodeFields.map((field) => {
              const row = rowByType.get(field.name);

              return (
                <div
                  className="grid gap-4 border border-stone-800/75 bg-[#050505] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,420px)_auto]"
                  key={field.name}
                >
                  <div>
                    <label
                      className="text-[10px] uppercase tracking-[0.18em] text-stone-300"
                      htmlFor={`${field.name}_code`}
                      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                    >
                      {field.label}
                    </label>
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      {field.description}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-stone-500">
                      Last updated: {formatDate(row?.updated_at)}
                    </p>
                  </div>

                  <input
                    autoComplete="off"
                    className="min-h-12 w-full border border-stone-700 bg-[#111111] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
                    defaultValue={row?.code ?? ""}
                    id={`${field.name}_code`}
                    name={`${field.name}_code`}
                    placeholder="Enter access code"
                    required
                    type="text"
                  />

                  <label className="flex min-h-12 items-center gap-3 text-xs uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                    <input
                      className="h-4 w-4 accent-[#D4A63D]"
                      defaultChecked={row?.active ?? true}
                      name={`${field.name}_active`}
                      type="checkbox"
                    />
                    Active
                  </label>
                </div>
              );
            })}

            <div className="flex justify-end border-t border-stone-800/75 pt-5">
              <button
                className="inline-flex min-h-11 items-center justify-center bg-[#D4A63D] px-5 text-xs uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#F5B942]"
                style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                type="submit"
              >
                Save Access Codes
              </button>
            </div>
          </form>
        </section>
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
