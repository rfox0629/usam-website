import Link from "next/link";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { loadAudienceContacts, loadAudienceSummary } from "@/src/lib/operations/communications";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsBadge,
  OperationsEmptyState,
  OperationsMetric,
  OperationsPanel,
  operationsFont,
  type OperationsTone,
} from "../../_components/OperationsUI";
import { CommunicationsSubnav } from "../_components/CommunicationsSubnav";

export const dynamic = "force-dynamic";

const filters = [
  { key: "all", label: "All" },
  { key: "subscribed", label: "Subscribed" },
  { key: "unsubscribed", label: "Unsubscribed" },
  { key: "suppressed", label: "Suppressed" },
  { key: "pending", label: "Pending" },
] as const;

function statusTone(status: string): OperationsTone {
  if (status === "subscribed") {
    return "green";
  }

  if (status === "bounced" || status === "complained") {
    return "red";
  }

  if (status === "unsubscribed") {
    return "muted";
  }

  return "amber";
}

export default async function OperationsCommunicationsAudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [query, authorization] = await Promise.all([searchParams, getOperationsAuthorization()]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "communications")) {
    return <OperationsAccessDenied active="communications" authorization={authorization} />;
  }

  const activeStatus = query.status ?? "all";
  const search = query.q ?? "";
  const [summary, { contacts, error }] = await Promise.all([
    loadAudienceSummary(),
    loadAudienceContacts({ search, status: activeStatus }),
  ]);

  const filterHref = (status: string) => {
    const params = new URLSearchParams();

    if (status !== "all") {
      params.set("status", status);
    }

    if (search) {
      params.set("q", search);
    }

    const suffix = params.toString();

    return suffix ? `/operations/communications/audience?${suffix}` : "/operations/communications/audience";
  };

  return (
    <OperationsShell active="communications" authorization={authorization} title="Communications">
      <CommunicationsSubnav active="audience" />

      <div className="space-y-4">
        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</section>
        ) : null}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <OperationsMetric label="Subscribed" value={summary.eligible} detail="Eligible to receive" />
          <OperationsMetric label="Unsubscribed" value={summary.unsubscribed} />
          <OperationsMetric label="Suppressed" value={summary.suppressed} detail="Bounced or complained" />
          <OperationsMetric label="Total Contacts" value={summary.total} />
        </div>

        <OperationsPanel title="Find a Contact">
          <form action="/operations/communications/audience" className="flex flex-wrap items-end gap-3" method="get">
            <label className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Search</span>
              <input
                className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                defaultValue={search}
                name="q"
                placeholder="Name or email"
              />
            </label>
            {activeStatus !== "all" ? <input name="status" type="hidden" value={activeStatus} /> : null}
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932]"
              style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
              type="submit"
            >
              Search
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Link
                className={`inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] uppercase tracking-[0.12em] ${
                  activeStatus === filter.key
                    ? "border-[#D8A932] bg-[#FFF7DF] text-[#654500]"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                href={filterHref(filter.key)}
                key={filter.key}
                style={{ fontFamily: operationsFont.rajdhani, fontWeight: 700 }}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </OperationsPanel>

        <OperationsPanel title="Audience">
          {contacts.length > 0 ? (
            <div className="divide-y divide-slate-100">
              <div className="hidden gap-3 pb-2 lg:grid lg:grid-cols-[minmax(0,1.3fr)_150px_110px_minmax(0,1fr)_110px]">
                {["Contact", "Status", "Source", "Last Event", "Added"].map((heading) => (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400" key={heading}>{heading}</p>
                ))}
              </div>
              {contacts.map((contact) => (
                <div
                  className="grid gap-2 py-3 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.3fr)_150px_110px_minmax(0,1fr)_110px] lg:items-center lg:gap-3"
                  key={contact.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "No name"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">{contact.email}</p>
                  </div>
                  <div>
                    <OperationsBadge tone={statusTone(contact.status)}>{contact.statusLabel}</OperationsBadge>
                  </div>
                  <p className="truncate text-sm text-slate-700">{contact.source}</p>
                  <p className="truncate text-sm text-slate-600">
                    {contact.lastEventType
                      ? `${contact.lastEventType.replace(/_/g, " ")} · ${formatOperationsDate(contact.lastEventAt)}`
                      : "No events"}
                  </p>
                  <p className="text-sm text-slate-500">{formatOperationsDate(contact.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <OperationsEmptyState>
              No contacts match. The reconciled donor audience has not been imported yet.
            </OperationsEmptyState>
          )}
        </OperationsPanel>

        <OperationsPanel title="Audience Import">
          <p className="text-sm leading-6 text-slate-600">
            The canonical donor audience is imported once, from a reconciled file prepared outside this product.
            The importer is a server-side script rather than a product feature: it is idempotent by email, never
            resubscribes anyone who is unsubscribed or suppressed, preserves source metadata, and prints a full
            summary in dry-run mode before anything is written.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            <code>npm run communications:import -- --file &lt;path&gt; --dry-run</code>
          </p>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
