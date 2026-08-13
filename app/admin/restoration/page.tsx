import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "../_components/AdminShell";
import {
  AdminActionLink,
  AdminBadge,
  AdminMetricCard,
  adminFont,
  type AdminBadgeTone,
} from "../_components/AdminUI";
import {
  restorationHandoffOutcomes,
  restorationPreviewToken,
  restorationSectionCompletion,
  restorationSections,
  restorationStatuses,
} from "@/src/lib/restoration/intake";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restoration Review | Command Center",
  robots: {
    follow: false,
    index: false,
  },
};

type RestorationStatus = (typeof restorationStatuses)[number];

const previewValues: Record<string, unknown> = {
  careAcknowledgement: true,
  immediateDanger: "No",
  informedConsent: true,
  jesusAuthorityFreedom: "Yes",
  participantEmail: "preview@usam.dev",
  participantName: "Preview Participant",
  participantPhone: "555-0100",
  previewAcknowledgement: true,
  promptedPrayerCounseling: "I want a guided prayer process and a clear restoration next step.",
  restorationGoals: "Peace, forgiveness, and a healthy discipleship path.",
  truthfulInitials: true,
  waterBaptized: "Yes",
  willingToVisitPastHurt: "Yes",
  yearsChristian: "4",
};

const referralRows: Array<{
  assignedTo: string;
  followUp: string;
  lastSaved: string;
  person: string;
  progress: string;
  referredBy: string;
  status: RestorationStatus;
  submittedAt: string;
}> = [
  {
    assignedTo: "MOR Preview Team",
    followUp: "Review consent and schedule first restoration meeting",
    lastSaved: "13 Aug 2026, 10:36 AM",
    person: "Preview Participant",
    progress: "6 of 11 sections started",
    referredBy: "USA Missionary",
    status: "under_review",
    submittedAt: "13 Aug 2026, 10:42 AM",
  },
  {
    assignedTo: "Unassigned",
    followUp: "Waiting for participant to begin",
    lastSaved: "Not started",
    person: "Private Referral",
    progress: "0 of 11 sections",
    referredBy: "USA Missionary",
    status: "invited",
    submittedAt: "-",
  },
];

const auditEvents = [
  { actor: "System", event: "Private invitation created", time: "12 Aug 2026, 4:18 PM" },
  { actor: "Participant", event: "Access verified without answer payload in email or URL", time: "13 Aug 2026, 9:04 AM" },
  { actor: "System", event: "Draft autosaved", time: "13 Aug 2026, 10:36 AM" },
  { actor: "Participant", event: "Submitted reflection", time: "13 Aug 2026, 10:42 AM" },
  { actor: "Operations", event: "Assigned MOR Preview Team", time: "13 Aug 2026, 10:48 AM" },
];

const statusTone: Record<RestorationStatus, AdminBadgeTone> = {
  completed: "green",
  declined_closed: "muted",
  in_restoration: "blue",
  invited: "muted",
  last_saved: "amber",
  meeting_scheduled: "blue",
  started: "amber",
  submitted: "amber",
  under_review: "blue",
};

function titleFromStatus(status: RestorationStatus) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[9px] uppercase tracking-[0.16em] text-stone-500"
      style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
    >
      {children}
    </p>
  );
}

function CompactPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/90">
      <div className="border-b border-stone-800/75 px-4 py-3">
        <h2
          className="text-[11px] uppercase tracking-[0.18em] text-stone-300"
          style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
        >
          {title}
        </h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </section>
  );
}

export default function RestorationAdminPage() {
  const sectionCompletion = restorationSections.map((section) => ({
    ...restorationSectionCompletion(section, previewValues),
    id: section.id,
    shortTitle: section.shortTitle,
    title: section.title,
  }));
  const totalAnswered = sectionCompletion.reduce((sum, section) => sum + section.answered, 0);
  const totalFields = sectionCompletion.reduce((sum, section) => sum + section.total, 0);

  return (
    <AdminShell
      active="forms-pages"
      action={<AdminActionLink href={`/restoration/${restorationPreviewToken}`} variant="gold">Participant Preview</AdminActionLink>}
      description="Restricted MOR review workspace for restoration referrals, intake status, and discipleship handoff."
      title="Restoration"
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard label="Under Review" value="1" />
          <AdminMetricCard label="Started" value="1" />
          <AdminMetricCard label="Assigned" value="1" />
          <AdminMetricCard label="Answered" value={`${totalAnswered}/${totalFields}`} />
        </div>

        <CompactPanel title="Restoration Referrals">
          <div className="divide-y divide-stone-900/95">
            {referralRows.map((row) => (
              <div className="grid gap-3 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1.15fr)_130px_minmax(0,0.9fr)_minmax(0,1.1fr)_110px] lg:items-center" key={`${row.person}-${row.status}`}>
                <div className="min-w-0">
                  <FieldLabel>Referral</FieldLabel>
                  <p className="mt-1 truncate text-sm font-semibold text-stone-100">{row.person}</p>
                  <p className="mt-1 truncate text-xs text-stone-500">From {row.referredBy}</p>
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <div className="mt-1">
                    <AdminBadge tone={statusTone[row.status]}>{titleFromStatus(row.status)}</AdminBadge>
                  </div>
                </div>
                <div className="min-w-0">
                  <FieldLabel>Progress</FieldLabel>
                  <p className="mt-1 truncate text-sm text-stone-300">{row.progress}</p>
                </div>
                <div className="min-w-0">
                  <FieldLabel>Follow Up</FieldLabel>
                  <p className="mt-1 truncate text-sm text-stone-300">{row.followUp}</p>
                </div>
                <div className="flex lg:justify-end">
                  <Link
                    className="inline-flex min-h-9 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942]"
                    href="#restricted-answers"
                    style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CompactPanel>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <CompactPanel title="Status Pipeline">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {restorationStatuses.map((status) => (
                  <div className="flex items-center justify-between gap-3 border border-stone-800/70 bg-[#050505]/70 p-3" key={status}>
                    <span className="text-sm text-stone-300">{titleFromStatus(status)}</span>
                    <AdminBadge tone={statusTone[status]}>{status === "under_review" ? "Active" : "Ready"}</AdminBadge>
                  </div>
                ))}
              </div>
            </CompactPanel>

            <CompactPanel title="Section Completion">
              <div className="grid gap-3 md:grid-cols-2">
                {sectionCompletion.map((section) => (
                  <div className="border border-stone-800/70 bg-[#050505]/70 p-3" key={section.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-stone-100">{section.title}</p>
                      <span className="shrink-0 text-xs text-stone-500">{section.answered}/{section.total}</span>
                    </div>
                    <div className="mt-3 h-1.5 bg-stone-900">
                      <div
                        className="h-full bg-[#D4A63D]"
                        style={{ width: `${Math.round((section.answered / section.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CompactPanel>

            <CompactPanel title="Audit Trail">
              <div className="divide-y divide-stone-900/95">
                {auditEvents.map((event) => (
                  <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[150px_minmax(0,1fr)_180px] sm:items-center" key={`${event.actor}-${event.time}`}>
                    <p className="text-sm font-semibold text-stone-100">{event.actor}</p>
                    <p className="text-sm text-stone-300">{event.event}</p>
                    <p className="text-xs text-stone-500 sm:text-right">{event.time}</p>
                  </div>
                ))}
              </div>
            </CompactPanel>

            <CompactPanel title="Discipleship Handoff">
              <div className="grid gap-3">
                {restorationHandoffOutcomes.map((outcome, index) => (
                  <label className="flex min-h-12 items-center gap-3 border border-stone-800/70 bg-[#050505]/70 p-3 text-sm text-stone-300" key={outcome}>
                    <input
                      checked={index === 1}
                      className="h-4 w-4 accent-[#D4A63D]"
                      name="handoff"
                      readOnly
                      type="radio"
                    />
                    <span>{outcome}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 border border-stone-800/70 bg-[#050505]/70 p-3">
                <FieldLabel>DOS Coordination</FieldLabel>
                <p className="mt-2 text-sm text-stone-300">
                  Share only: restoration status, assigned staff, next meeting date, and handoff outcome.
                </p>
              </div>
            </CompactPanel>
          </div>

          <aside className="space-y-5">
            <CompactPanel title="Access Boundary">
              <div className="space-y-3 text-sm leading-6 text-stone-400">
                <p>Full answers are restricted to MOR and authorized operations roles.</p>
                <p>Ordinary DOS/person views receive handoff status only.</p>
                <p>Branch preview uses fabricated local data and no production persistence.</p>
              </div>
            </CompactPanel>

            <CompactPanel title="Assignment">
              <div className="space-y-4">
                <div>
                  <FieldLabel>Reviewer</FieldLabel>
                  <p className="mt-1 text-sm text-stone-100">MOR Preview Team</p>
                </div>
                <div>
                  <FieldLabel>Internal Follow Up</FieldLabel>
                  <p className="mt-1 text-sm text-stone-300">Schedule restoration meeting</p>
                </div>
                <div>
                  <FieldLabel>Submitted</FieldLabel>
                  <p className="mt-1 text-sm text-stone-300">13 Aug 2026, 10:42 AM</p>
                </div>
              </div>
            </CompactPanel>

            <CompactPanel title="Restricted Answers">
              <div id="restricted-answers" className="space-y-3">
                <AdminBadge tone="red">Restricted</AdminBadge>
                <p className="text-sm leading-6 text-stone-400">
                  Preview keeps values minimal; production should render the encrypted answer record after server-side role authorization.
                </p>
                <details className="border border-stone-800/70 bg-[#050505]/70 p-3">
                  <summary
                    className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]"
                    style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                  >
                    Show Preview Structure
                  </summary>
                  <div className="mt-3 space-y-3">
                    {restorationSections.slice(0, 4).map((section) => (
                      <div key={section.id}>
                        <p className="text-sm font-semibold text-stone-100">{section.title}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-500">
                          {section.fields.length} fields. Values must stay out of URLs, logs, analytics, email, and screenshots.
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </CompactPanel>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}
