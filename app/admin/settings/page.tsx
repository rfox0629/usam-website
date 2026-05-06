import type { Metadata } from "next";
import { AdminShell } from "../_components/AdminShell";
import { AdminBadge, adminFont } from "../_components/AdminUI";
import { updateSystemAccessCodes } from "./actions";
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
  code: string;
  code_type: AccessCodeType;
  is_active: boolean;
  updated_at: string;
};

const accessCodeFields: Array<{
  description: string;
  envFallback?: string;
  label: string;
  name: AccessCodeType;
}> = [
  {
    description: "Used by the System page access modal.",
    envFallback: "SYSTEM_ACCESS_CODE",
    label: "System Access Code",
    name: "system",
  },
  {
    description: "Used by the Support page View the Team access modal.",
    envFallback: "USAM_TEAM_ACCESS_CODE",
    label: "Team Access Code",
    name: "team",
  },
  {
    description: "Used for the protected DOS preview experience.",
    envFallback: "USAM_SYSTEM_PREVIEW_CODE",
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

function envFallbackCode(type: AccessCodeType) {
  if (type === "system") {
    return process.env.SYSTEM_ACCESS_CODE
      || process.env.USAM_SYSTEM_ACCESS_CODE
      || process.env.USAM_SYSTEM_PREVIEW_CODE
      || "";
  }

  if (type === "team") {
    return process.env.USAM_TEAM_ACCESS_CODE
      || process.env.USAM_TEAM_ACCESS_CODES?.split(",")[0]?.trim()
      || "";
  }

  return process.env.USAM_SYSTEM_PREVIEW_CODE
    || process.env.SYSTEM_ACCESS_CODE
    || "";
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

  if (!params.error) {
    return null;
  }

  const errorCopy: Record<string, string> = {
    "preview-missing": "Enter a DOS Preview Access Code before saving.",
    "supabase": "Supabase admin environment variables are not configured.",
    "system-missing": "Enter a System Access Code before saving.",
    "team-missing": "Enter a Team Access Code before saving.",
    "unauthorized": "Admin access is required to update access codes.",
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
    .select("code, code_type, is_active, updated_at")
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

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { error, rows } = await loadAccessCodes();
  const message = statusMessage(params);
  const rowByType = new Map(rows.map((row) => [row.code_type, row]));

  return (
    <AdminShell
      active="settings"
      description="Manage core admin controls, access model, and system-level configuration."
      title="Admin Settings"
    >
      <div className="space-y-5">
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
              const fallback = envFallbackCode(field.name);
              const defaultValue = row?.code ?? fallback;

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
                      {!row && fallback ? ` · currently falling back to ${field.envFallback}` : ""}
                    </p>
                  </div>

                  <input
                    autoComplete="off"
                    className="min-h-12 w-full border border-stone-700 bg-[#111111] px-4 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-[#D4A63D]"
                    defaultValue={defaultValue}
                    id={`${field.name}_code`}
                    name={`${field.name}_code`}
                    placeholder="Enter access code"
                    required
                    type="text"
                  />

                  <label className="flex min-h-12 items-center gap-3 text-xs uppercase tracking-[0.16em] text-stone-300" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
                    <input
                      className="h-4 w-4 accent-[#D4A63D]"
                      defaultChecked={row?.is_active ?? true}
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
      </div>
    </AdminShell>
  );
}
