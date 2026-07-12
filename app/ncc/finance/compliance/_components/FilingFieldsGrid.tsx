import Link from "next/link";
import { AdminBadge, adminFont } from "../../../../admin/_components/AdminUI";
import type { ComplianceFiling } from "@/src/lib/compliance/types";
import { formatDate, statusLabels, statusTone } from "./complianceLabels";

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="border border-stone-900 bg-[#050505] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-stone-200">{children}</div>
    </div>
  );
}

export function FilingFieldsGrid({ filing }: { filing: ComplianceFiling }) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          Filing Details
        </h2>
        {!filing.isPersisted ? <AdminBadge tone="muted">Read-Only Default — Not Yet Tracked</AdminBadge> : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Filing Name">{filing.filingName}</Field>
        <Field label="Agency">{filing.agency}</Field>
        <Field label="Filing Period">{filing.filingPeriod}</Field>
        <Field label="Original Due Date">{formatDate(filing.originalDueDate)}</Field>
        <Field label="Extended Due Date">{formatDate(filing.extendedDueDate)}</Field>
        <Field label="Status">
          <AdminBadge tone={statusTone[filing.status]}>{statusLabels[filing.status]}</AdminBadge>
        </Field>
        <Field label="Assigned Person">{filing.assignedPerson || "Unassigned"}</Field>
        <Field label="Readiness">{filing.readinessPercentage}%</Field>
        <Field label="Official Filing Link">
          {filing.officialFilingUrl ? (
            <a className="break-words text-[#E4C465] hover:underline" href={filing.officialFilingUrl} rel="noreferrer" target="_blank">
              {filing.officialFilingUrl}
            </a>
          ) : "—"}
        </Field>
        <Field label="Last Filed Date">{formatDate(filing.lastFiledDate)}</Field>
        <Field label="Confirmation Number">{filing.confirmationNumber || "—"}</Field>
        <Field label="Filing Receipt">
          {filing.filingReceiptPath ? (
            <span className="text-stone-300">On file</span>
          ) : (
            <span className="text-stone-500">Not on file</span>
          )}
        </Field>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Open Questions">
          {filing.openQuestions.length === 0 ? (
            <span className="text-stone-500">None recorded</span>
          ) : (
            <ul className="space-y-1">
              {filing.openQuestions.map((question) => (
                <li className="flex gap-2" key={question}>
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#C9A24A]" />
                  {question}
                </li>
              ))}
            </ul>
          )}
        </Field>
        <Field label="Missing Documents">
          {filing.missingDocuments.length === 0 ? (
            <span className="text-stone-500">None recorded</span>
          ) : (
            <ul className="space-y-1">
              {filing.missingDocuments.map((doc) => (
                <li className="flex gap-2" key={doc}>
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                  {doc}
                </li>
              ))}
            </ul>
          )}
        </Field>
      </div>

      {Object.keys(filing.extra).length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.entries(filing.extra).map(([key, value]) => (
            <Field key={key} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase())}>
              {value || "Unknown"}
            </Field>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-stone-600">
        <Link className="hover:text-[#C9A24A]" href="/ncc/finance/compliance">
          Back to Compliance overview
        </Link>
      </p>
    </section>
  );
}
