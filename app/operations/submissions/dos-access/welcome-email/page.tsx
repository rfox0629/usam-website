import {
  buildDosWelcomeEmailCurrent,
  buildDosWelcomeEmailRedesign,
  dosSupportEmail,
  dosWelcomeEmailRedesignLive,
} from "@/src/lib/dos/access-request-email";
import {
  canDecideDosAccessRequests,
  canViewDosAccessRequests,
  dosWelcomeEmailInputFor,
  listDosWelcomeEmailPreviewRequests,
  type DosWelcomeEmailPreviewVariant,
} from "@/src/lib/dos/access-requests";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import { OperationsAccessDenied, OperationsShell } from "../../../_components/OperationsShell";
import { OperationsActionLink, OperationsPanel } from "../../../_components/OperationsUI";
import { sendDosWelcomeEmailTestAction } from "./actions";

export const dynamic = "force-dynamic";

// USA-289: preview of the redesigned DOS welcome email, which is under review,
// next to the current email approvals still send. "Send a test" sends the
// redesign to the signed-in reviewer only; approvals switch to it only when
// dosWelcomeEmailRedesignLive is turned on after the founder's Gmail review.
export default async function DosWelcomeEmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string; error?: string; request?: string; saved?: string; variant?: string }>;
}) {
  const [query, authorization] = await Promise.all([searchParams, getOperationsAuthorization()]);

  if (authorization.status !== "authorized") {
    return null;
  }

  if (!canAccessOperationsModule(authorization, "submissions") || !canViewDosAccessRequests(authorization)) {
    return <OperationsAccessDenied active="submissions" authorization={authorization} title="DOS Welcome Email" />;
  }

  const requests = await listDosWelcomeEmailPreviewRequests(authorization);
  const selected = requests.find((row) => row.id === query.request) ?? null;
  const variant: DosWelcomeEmailPreviewVariant = query.variant === "new" ? "new" : "existing";
  const design = query.design === "current" ? "current" : "redesign";
  const input = dosWelcomeEmailInputFor(selected, variant);
  const template = design === "current"
    ? buildDosWelcomeEmailCurrent({ ...input, workspaceSlug: input.workspaceSlug || "jordan-hale" })
    : buildDosWelcomeEmailRedesign(input);
  const canSend = canDecideDosAccessRequests(authorization);
  const field = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

  return (
    <OperationsShell
      action={<OperationsActionLink href="/operations/submissions?type=dos_access_request" variant="outline">Back to Inbox</OperationsActionLink>}
      active="submissions"
      authorization={authorization}
      eyebrow="DOS Access Request"
      title="Welcome Email Preview"
    >
      <div className="space-y-4">
        {query.saved ? <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{query.saved}</section> : null}
        {query.error ? <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{query.error}</section> : null}
        <OperationsPanel title="Welcome email">
          <p className="text-sm leading-6 text-slate-600">
            {dosWelcomeEmailRedesignLive
              ? "Approved requests now receive the redesign."
              : "The redesign is in review and not live. Approved requests still receive the current email (\"Your DOS access is ready\") until the redesign is approved after a real Gmail test."}
            {" "}The redesign&apos;s one button opens {"/dos"}, which takes each person to their own workspace after sign-in. Replies go to {dosSupportEmail()}.
          </p>
          <form className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end" method="get">
            <label className="text-sm text-slate-700">Design
              <select className={field} defaultValue={design} name="design">
                <option value="redesign">Redesign (in review)</option>
                <option value="current">Current (sent to approvals now)</option>
              </select>
            </label>
            <label className="text-sm text-slate-700">Recipient details
              <select className={field} defaultValue={selected?.id ?? ""} name="request">
                <option value="">Sample recipient (Jordan)</option>
                {requests.map((row) => (
                  <option key={row.id} value={row.id}>{row.reference_code} · {row.first_name} {row.last_name} · /dos/{row.provisioned_workspace_slug}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">Sample account
              <select className={field} defaultValue={variant} disabled={Boolean(selected)} name="variant">
                <option value="existing">Existing account, existing workspace</option>
                <option value="new">New account, new workspace</option>
              </select>
            </label>
            <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800" type="submit">Preview</button>
          </form>
          <p className="mt-4 text-sm text-slate-800"><span className="text-slate-500">Subject:</span> {template.subject}</p>
          {canSend ? (
            <form action={sendDosWelcomeEmailTestAction} className="mt-4">
              <input name="request" type="hidden" value={selected?.id ?? ""} />
              <input name="variant" type="hidden" value={variant} />
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="submit">Send a test of the redesign to {authorization.email}</button>
              <p className="mt-2 text-xs text-slate-500">Only you receive it, marked [Test]. It always sends the redesign. Nothing is recorded on any request, no applicant is emailed, and no request&apos;s welcome email is resent.</p>
            </form>
          ) : null}
        </OperationsPanel>
        <div className="grid gap-4 xl:grid-cols-[640px_420px]">
          <OperationsPanel title="Desktop (600px)">
            <iframe className="h-[1000px] w-full rounded border border-slate-200 bg-white" sandbox="" srcDoc={template.html} title="Welcome email, desktop width" />
          </OperationsPanel>
          <OperationsPanel title="Phone (375px)">
            <iframe className="mx-auto block h-[1150px] w-[375px] max-w-full rounded border border-slate-200 bg-white" sandbox="" srcDoc={template.html} title="Welcome email, phone width" />
          </OperationsPanel>
        </div>
        <OperationsPanel title="Plain-text version">
          <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{template.text}</pre>
        </OperationsPanel>
      </div>
    </OperationsShell>
  );
}
