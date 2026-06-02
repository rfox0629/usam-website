"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, Check, Plus, X } from "lucide-react";
import { adminFont } from "../_components/AdminUI";
import { formatOrganizationType, type OrganizationSummary } from "@/src/lib/admin/organization-shared";

const organizationTypes = [
  { label: "USA Missionaries", value: "usa_missionaries" },
  { label: "Church", value: "church" },
  { label: "Ministry", value: "ministry" },
  { label: "Partner", value: "partner" },
  { label: "Other", value: "other" },
] as const;

const featureOptions = [
  { key: "dosEnabled", label: "DOS enabled" },
  { key: "prayerEnabled", label: "Prayer enabled" },
  { key: "publicProfilesEnabled", label: "Public profiles enabled" },
  { key: "publishingEnabled", label: "Publishing enabled" },
  { key: "csvImportsEnabled", label: "CSV imports enabled" },
] as const;

type FeatureKey = typeof featureOptions[number]["key"];
type OrganizationTypeValue = typeof organizationTypes[number]["value"];

type FormState = {
  defaultWorkspaceName: string;
  features: Record<FeatureKey, boolean>;
  name: string;
  primaryContactEmail: string;
  primaryContactName: string;
  type: OrganizationTypeValue;
};

const defaultFormState: FormState = {
  defaultWorkspaceName: "",
  features: {
    csvImportsEnabled: true,
    dosEnabled: true,
    prayerEnabled: true,
    publicProfilesEnabled: false,
    publishingEnabled: false,
  },
  name: "",
  primaryContactEmail: "",
  primaryContactName: "",
  type: "ministry",
};

function formatDate(value: string | null) {
  if (!value) {
    return "No activity";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: OrganizationSummary["status"] }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full border px-2 text-[9px] uppercase tracking-[0.14em] ${
        status === "active"
          ? "border-usam-gold/35 bg-usam-gold/10 text-usam-gold"
          : "border-stone-700 bg-stone-900/70 text-stone-300"
      }`}
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {status === "active" ? "Active" : "Setup"}
    </span>
  );
}

function OrganizationCard({ organization }: { organization: OrganizationSummary }) {
  return (
    <Link
      className="group flex min-h-56 flex-col justify-between rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 transition-colors hover:border-usam-gold/60 hover:bg-usam-gold/[0.04]"
      href={`/admin/organizations/${organization.id}`}
    >
      <span>
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-800 bg-stone-950 text-usam-gold">
              <Building2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold text-stone-50">{organization.name}</span>
              <span className="mt-1 block text-xs text-stone-500">{formatOrganizationType(organization.type, organization.brandingMode)}</span>
            </span>
          </span>
          <StatusPill status={organization.status} />
        </span>
        <span className="mt-5 grid grid-cols-2 gap-2">
          <span className="rounded-lg border border-stone-800/70 bg-[#050505] p-3">
            <span className="block text-2xl font-semibold leading-none text-stone-50">{organization.workspaceCount}</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Workspaces
            </span>
          </span>
          <span className="rounded-lg border border-stone-800/70 bg-[#050505] p-3">
            <span className="block text-2xl font-semibold leading-none text-stone-50">{organization.memberCount}</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.14em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Members
            </span>
          </span>
        </span>
      </span>
      <span className="mt-5 flex items-center justify-between border-t border-stone-800/70 pt-3">
        <span className="text-xs text-stone-500">{formatDate(organization.lastActivityAt)}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-usam-gold" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
          Open
        </span>
      </span>
    </Link>
  );
}

function AddOrganizationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedType = useMemo(
    () => organizationTypes.find((type) => type.value === formState.type) ?? organizationTypes[2],
    [formState.type],
  );

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/organizations", {
        body: JSON.stringify({
          defaultWorkspaceName: formState.defaultWorkspaceName,
          dosEnabled: formState.features.dosEnabled,
          name: formState.name,
          prayerEnabled: formState.features.prayerEnabled,
          primaryContactEmail: formState.primaryContactEmail,
          primaryContactName: formState.primaryContactName,
          publicProfilesEnabled: formState.features.publicProfilesEnabled,
          publishingEnabled: formState.features.publishingEnabled,
          type: formState.type,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to add organization.");
        return;
      }

      onCreated();
    } catch {
      setError("Unable to add organization.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-3 py-4 backdrop-blur-sm sm:items-center">
      <form className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-stone-800 bg-[#080808] p-4 shadow-2xl sm:p-5" onSubmit={submitForm}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-usam-gold" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Organizations
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-50">Add Organization</h2>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 text-stone-300 transition-colors hover:border-usam-gold hover:text-usam-gold"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Organization Name
            </span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none transition-colors focus:border-usam-gold"
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              required
              value={formState.name}
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Organization Type
            </span>
            <select
              className="mt-2 h-11 w-full appearance-none rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none transition-colors focus:border-usam-gold"
              onChange={(event) => setFormState((current) => ({ ...current, type: event.target.value as OrganizationTypeValue }))}
              value={formState.type}
            >
              {organizationTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Primary Contact
            </span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none transition-colors focus:border-usam-gold"
              onChange={(event) => setFormState((current) => ({ ...current, primaryContactName: event.target.value }))}
              value={formState.primaryContactName}
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Contact Email
            </span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none transition-colors focus:border-usam-gold"
              onChange={(event) => setFormState((current) => ({ ...current, primaryContactEmail: event.target.value }))}
              type="email"
              value={formState.primaryContactEmail}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
              Default Workspace Name
            </span>
            <input
              className="mt-2 h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none transition-colors focus:border-usam-gold"
              onChange={(event) => setFormState((current) => ({ ...current, defaultWorkspaceName: event.target.value }))}
              required
              value={formState.defaultWorkspaceName}
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-stone-800 bg-[#050505] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-stone-100">Feature set</p>
              <p className="mt-1 text-xs text-stone-500">{selectedType.label}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {featureOptions.map((option) => {
              const selected = formState.features[option.key];

              return (
                <button
                  className={`flex min-h-10 items-center justify-between rounded-lg border px-3 text-left text-sm transition-colors ${
                    selected
                      ? "border-usam-gold/60 bg-usam-gold/10 text-usam-gold"
                      : "border-stone-800 bg-stone-950 text-stone-300 hover:border-stone-700"
                  }`}
                  key={option.key}
                  onClick={() => setFormState((current) => ({
                    ...current,
                    features: {
                      ...current.features,
                      [option.key]: !current.features[option.key],
                    },
                  }))}
                  type="button"
                >
                  <span>{option.label}</span>
                  {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/35 bg-red-950/25 p-3 text-sm text-red-100">{error}</p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-700 px-4 text-[11px] uppercase tracking-[0.16em] text-stone-200 transition-colors hover:border-stone-500"
            onClick={onClose}
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-usam-gold bg-usam-gold px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-usam-gold disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            type="submit"
          >
            {isSaving ? "Adding" : "Add Organization"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function OrganizationsClient({
  organizations,
}: {
  organizations: OrganizationSummary[];
}) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <>
      <div className="space-y-5">
        <section className="flex flex-col gap-3 rounded-xl border border-stone-800/75 bg-[#080808]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-50">National organization layer</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-400">
              Creates the organization record and a DOS-compatible workspace while the generic workspace bridge is added.
            </p>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-usam-gold bg-usam-gold px-4 text-[11px] uppercase tracking-[0.16em] text-black transition-colors hover:bg-usam-gold"
            onClick={() => setIsAdding(true)}
            style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Organization
          </button>
        </section>

        {organizations.length > 0 ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {organizations.map((organization) => (
              <OrganizationCard key={organization.id} organization={organization} />
            ))}
          </section>
        ) : (
          <section className="rounded-xl border border-stone-800/75 bg-[#080808]/90 p-6 text-sm text-stone-400">
            No organizations yet.
          </section>
        )}
      </div>

      {isAdding ? (
        <AddOrganizationModal
          onClose={() => setIsAdding(false)}
          onCreated={() => {
            setIsAdding(false);
            router.refresh();
            window.setTimeout(() => window.location.reload(), 250);
          }}
        />
      ) : null}
    </>
  );
}
