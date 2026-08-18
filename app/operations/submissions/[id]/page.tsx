import { notFound } from "next/navigation";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  loadOperationsSubmissionDetail,
  operationsSubmissionStatusLabel,
  operationsSubmissionStatuses,
} from "@/src/lib/operations/submissions";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  type OperationsTone,
} from "../../_components/OperationsUI";
import { archiveSubmissionAction, deleteTestSubmissionAction, restoreSubmissionAction, updateSubmissionReviewAction } from "./actions";

export const dynamic = "force-dynamic";

function toneForStatus(status: string): OperationsTone {
  if (status === "new") {
    return "blue";
  }

  if (status === "needs_follow_up" || status === "follow_up") {
    return "amber";
  }

  if (status === "converted" || status === "archived") {
    return "green";
  }

  return "muted";
}

function FieldBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-slate-800">{value || "-"}</p>
    </div>
  );
}

export default async function OperationsSubmissionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const [{ id }, query, authorization] = await Promise.all([
    params,
    searchParams,
    getOperationsAuthorization(),
  ]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "submissions")) {
    return <OperationsAccessDenied active="submissions" authorization={authorization} />;
  }

  const { error, submission, unauthorized } = await loadOperationsSubmissionDetail({ authorization, id });

  if (unauthorized) {
    return <OperationsAccessDenied active="submissions" authorization={authorization} title="Submission Access Limited" />;
  }

  if (!submission && !error) {
    notFound();
  }

  return (
    <OperationsShell
      active="submissions"
      action={<OperationsActionLink href="/operations/submissions" variant="outline">Back to Inbox</OperationsActionLink>}
      authorization={authorization}
      eyebrow={submission?.sourceLabel}
      title={submission?.submitter ?? "Submission Detail"}
    >
      <div className="space-y-4">
        {query.saved ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Review saved.
          </section>
        ) : null}

        {query.error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {query.error}
          </section>
        ) : null}

        {error ? (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {error}
          </section>
        ) : null}

        {submission ? (
          <>
            <OperationsPanel title="Case Summary">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FieldBlock label="Submitted" value={formatOperationsDate(submission.submittedAt)} />
                <FieldBlock label="Assigned" value={submission.assignedTo} />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Status</p>
                  <div className="mt-1">
                    <OperationsBadge tone={toneForStatus(submission.status)}>
                      {operationsSubmissionStatusLabel(submission.status)}
                    </OperationsBadge>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Access</p>
                  <div className="mt-1">
                    <OperationsBadge tone={submission.isSensitive ? "red" : "muted"}>
                      {submission.isSensitive ? "Restricted" : "Internal"}
                    </OperationsBadge>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <FieldBlock label="Email" value={submission.email} />
                <FieldBlock label="Phone" value={submission.phone} />
                <FieldBlock label="Source Page" value={submission.sourcePage} />
                <FieldBlock label="Priority" value={submission.priority} />
              </div>
            </OperationsPanel>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <OperationsPanel title="Secure Full Response">
                {submission.fullResponse.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {submission.fullResponse.map((field) => (
                      <div className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(180px,0.42fr)_minmax(0,1fr)]" key={`${field.label}-${field.value.slice(0, 16)}`}>
                        <p className="text-sm font-medium leading-6 text-slate-700">{field.label}</p>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{field.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <OperationsEmptyState>
                    No response payload is available for this submission.
                  </OperationsEmptyState>
                )}
              </OperationsPanel>

              <div className="space-y-4">
                <OperationsPanel title="Follow Up">
                  {submission.canManage ? (
                    <form action={updateSubmissionReviewAction} className="grid gap-4">
                      <input name="id" type="hidden" value={submission.id} />
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Status</span>
                        <select
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={submission.status}
                          name="status"
                        >
                          {operationsSubmissionStatuses.map((status) => (
                            <option key={status} value={status}>
                              {operationsSubmissionStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Owner</span>
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={submission.assignedTo ?? ""}
                          name="assignedTo"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Review Summary</span>
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={submission.reviewSummary ?? ""}
                          name="reviewSummary"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Next Action</span>
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={submission.nextAction ?? ""}
                          name="nextAction"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Follow-up State</span>
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={submission.followUpState ?? ""}
                          name="followUpState"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Internal Notes</span>
                        <textarea
                          className="mt-2 min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={submission.internalNotes ?? ""}
                          name="internalNotes"
                        />
                      </label>
                      <button
                        className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#D8A932] px-4 text-[11px] uppercase tracking-[0.14em] text-[#101826] transition hover:bg-[#E7BF57]"
                        type="submit"
                      >
                        Save Review
                      </button>
                    </form>
                  ) : (
                    <OperationsEmptyState>
                      This submission is view-only for your current role.
                    </OperationsEmptyState>
                  )}
                </OperationsPanel>

                {submission.canManage ? (
                  <OperationsPanel title="Record Controls">
                    <div className="grid gap-2">
                      {submission.status === "archived" ? (
                        <form action={restoreSubmissionAction}>
                          <input name="id" type="hidden" value={submission.id} />
                          <button
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932] hover:text-[#7A5200]"
                            type="submit"
                          >
                            Restore
                          </button>
                        </form>
                      ) : (
                        <form action={archiveSubmissionAction}>
                          <input name="id" type="hidden" value={submission.id} />
                          <button
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932] hover:text-[#7A5200]"
                            type="submit"
                          >
                            Archive
                          </button>
                        </form>
                      )}
                      {submission.isTestRecord ? (
                        <form action={deleteTestSubmissionAction}>
                          <input name="id" type="hidden" value={submission.id} />
                          <button
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 text-[11px] uppercase tracking-[0.12em] text-red-700 transition hover:border-red-300 hover:bg-red-100"
                            type="submit"
                          >
                            Delete Test Record
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </OperationsPanel>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </OperationsShell>
  );
}
