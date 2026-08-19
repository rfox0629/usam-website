import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { isFactVerified, type ComplianceFact } from "@/src/lib/finance/facts";

export type Form990PartKey =
  | "part_i" | "part_iii" | "part_iv" | "part_v" | "part_vi" | "part_vii"
  | "part_viii" | "part_ix" | "part_x" | "part_xi" | "part_xii"
  | "schedule_a" | "schedule_b" | "schedule_o";

export type Form990Readiness =
  | "not_started" | "data_available" | "needs_review" | "ready"
  | "needs_cpa_review" | "cpa_confirmed" | "not_applicable";

export type Form990Part = {
  key: Form990PartKey;
  /** What real data feeds this part today. */
  source: string;
  title: string;
};

export const form990Parts: Form990Part[] = [
  { key: "part_i", source: "Verified period totals", title: "Part I — Summary" },
  { key: "part_iii", source: "Program narrative", title: "Part III — Program Service Accomplishments" },
  { key: "part_iv", source: "Schedule triggers", title: "Part IV — Required Schedules" },
  { key: "part_v", source: "Other IRS filings", title: "Part V — Other IRS Filings" },
  { key: "part_vi", source: "Governance records", title: "Part VI — Governance" },
  { key: "part_vii", source: "Compensation data", title: "Part VII — Officers and Key Employees" },
  { key: "part_viii", source: "Planning Center Giving + other income", title: "Part VIII — Revenue" },
  { key: "part_ix", source: "Categorized expenses", title: "Part IX — Functional Expenses" },
  { key: "part_x", source: "Reconciled balances", title: "Part X — Balance Sheet" },
  { key: "part_xi", source: "Net asset reconciliation", title: "Part XI — Net Assets" },
  { key: "part_xii", source: "Reporting method", title: "Part XII — Financial Reporting" },
  { key: "schedule_a", source: "Public support workpaper", title: "Schedule A — Public Charity Status" },
  { key: "schedule_b", source: "Contributor threshold review", title: "Schedule B — Contributors" },
  { key: "schedule_o", source: "Narrative explanations", title: "Schedule O — Supplemental Information" },
];

export type Form990PartState = Form990Part & {
  detail: string;
  readiness: Form990Readiness;
};

/**
 * Derives readiness from real data only. A part with no backing source stays
 * `not_started`; schedule triggers surface as `needs_review` prompts rather
 * than asserted conclusions.
 */
export async function loadForm990Readiness({
  facts,
  organizationId,
  taxPeriodId,
}: {
  facts: Map<string, ComplianceFact>;
  organizationId: string;
  taxPeriodId: string | null;
}): Promise<Form990PartState[]> {
  const supabase = createSupabaseAdminClient();
  const [givingResult, transactionsResult, storedResult] = await Promise.all([
    supabase.from("pco_giving_records").select("gross_amount, refunded, attribution_kind"),
    supabase
      .from("bank_transactions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    taxPeriodId
      ? supabase
        .from("form_990_workpapers")
        .select("part_key, readiness, notes")
        .eq("tax_period_id", taxPeriodId)
      : Promise.resolve({ data: [] as { notes: string | null; part_key: string; readiness: string }[] }),
  ]);

  const stored = new Map(
    ((storedResult.data ?? []) as { notes: string | null; part_key: string; readiness: string }[])
      .map((row) => [row.part_key, row]),
  );

  const giving = ((givingResult.data ?? []) as {
    gross_amount: number | string | null;
    refunded: boolean | null;
  }[]).filter((row) => row.refunded !== true);
  const givingTotal = giving.reduce((sum, row) => sum + (Number(row.gross_amount) || 0), 0);
  const transactionCount = transactionsResult.count ?? 0;
  const periodVerified = Boolean(taxPeriodId);
  const money = (value: number) => new Intl.NumberFormat("en-US", {
    currency: "USD", maximumFractionDigits: 0, style: "currency",
  }).format(value);

  return form990Parts.map((part) => {
    const override = stored.get(part.key);

    if (override) {
      return {
        ...part,
        detail: override.notes ?? part.source,
        readiness: override.readiness as Form990Readiness,
      };
    }

    if (part.key === "part_viii") {
      return giving.length > 0
        ? {
          ...part,
          detail: `${giving.length} gifts totalling ${money(givingTotal)} from Planning Center`,
          readiness: periodVerified ? "data_available" : "needs_review",
        }
        : { ...part, detail: "No giving imported yet", readiness: "not_started" };
    }

    if (part.key === "schedule_b") {
      return giving.length > 0
        ? { ...part, detail: "Contributor thresholds need review before disclosure", readiness: "needs_review" }
        : { ...part, detail: "No contributor data yet", readiness: "not_started" };
    }

    if (part.key === "part_ix" || part.key === "part_x" || part.key === "part_xi") {
      return transactionCount > 0
        ? { ...part, detail: `${transactionCount} bank transactions to categorize`, readiness: "needs_review" }
        : { ...part, detail: "No bank transactions imported yet", readiness: "not_started" };
    }

    if (part.key === "part_i") {
      return periodVerified
        ? { ...part, detail: "Rolls up from verified period totals", readiness: "needs_review" }
        : { ...part, detail: "Waiting on a verified tax period", readiness: "not_started" };
    }

    if (part.key === "part_xii") {
      const method = facts.get("accounting_method");

      return isFactVerified(method)
        ? { ...part, detail: `Accounting method: ${method?.value}`, readiness: "data_available" }
        : { ...part, detail: "Accounting method not verified", readiness: "not_started" };
    }

    return { ...part, detail: part.source, readiness: "not_started" };
  });
}
