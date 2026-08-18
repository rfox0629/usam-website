import { notFound } from "next/navigation";
import { canAccessOperationsModule, getOperationsAuthorization } from "@/src/lib/operations/auth";
import {
  loadOperationsOnboardingDetail,
  onboardingStatusLabel,
  operationsOnboardingStatuses,
  type OperationsOnboardingContactItem,
  type OperationsOnboardingDetailItem,
  type OperationsOnboardingDocumentItem,
  type OperationsOnboardingHouseholdMember,
  type OperationsOnboardingReferenceItem,
} from "@/src/lib/operations/onboarding";
import { OperationsAccessDenied, OperationsShell } from "../../_components/OperationsShell";
import {
  formatOperationsDate,
  OperationsActionLink,
  OperationsBadge,
  OperationsEmptyState,
  OperationsPanel,
  type OperationsTone,
} from "../../_components/OperationsUI";
import {
  archiveMissionaryApplicationAction,
  deleteTestMissionaryApplicationAction,
  restoreMissionaryApplicationAction,
  updateMissionaryReviewAction,
} from "./actions";

export const dynamic = "force-dynamic";

const followUpOptions = [
  "",
  "Review needed",
  "Review complete",
  "Waiting on candidate",
  "Follow up",
  "Interview needed",
  "Ready for decision",
];
const interviewOptions = ["", "Not scheduled", "Scheduling", "Scheduled", "Completed"];
const decisionOptions = ["", "Pending", "Accepted", "Declined", "Hold"];
const onboardingOptions = ["", "Not started", "Plan needed", "In progress", "Ready after acceptance"];
const readinessOptions = ["", "Pending", "Goal captured", "Ready for plan", "Pending activation"];
const profileOptions = ["", "Draft needed", "Profile linked", "Ready for build", "Pending activation", "Published"];
const dosOptions = ["", "Workspace linked", "Needs setup", "Ready after acceptance"];

function toneForStatus(status: string): OperationsTone {
  if (status === "Pending Review" || status === "Application Submitted" || status === "Application Started") {
    return "blue";
  }

  if (status === "More Info Requested") {
    return "amber";
  }

  if (status === "Approved" || status === "Active") {
    return "green";
  }

  if (status === "Declined" || status === "Rejected" || status === "Archived") {
    return "red";
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
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm leading-6 text-slate-800">{value || "-"}</p>
    </div>
  );
}

function DetailGrid({
  empty,
  items,
}: {
  empty: string;
  items: OperationsOnboardingDetailItem[];
}) {
  if (items.length === 0) {
    return <OperationsEmptyState>{empty}</OperationsEmptyState>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <FieldBlock key={`${item.label}-${item.value.slice(0, 24)}`} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

function ContactList({
  empty,
  items,
}: {
  empty: string;
  items: OperationsOnboardingContactItem[];
}) {
  if (items.length === 0) {
    return <OperationsEmptyState>{empty}</OperationsEmptyState>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px]" key={`${item.name}-${item.email ?? item.phone ?? item.relationship}`}>
          <FieldBlock label="Name" value={item.name} />
          <FieldBlock label="Contact" value={item.email ?? item.phone} />
          <FieldBlock label="Relationship" value={item.relationship} />
        </div>
      ))}
    </div>
  );
}

function ReferenceList({ items }: { items: OperationsOnboardingReferenceItem[] }) {
  if (items.length === 0) {
    return <OperationsEmptyState>No references are captured yet.</OperationsEmptyState>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px]" key={`${item.name}-${item.email ?? item.description ?? item.relationship}`}>
          <FieldBlock label="Reference" value={item.name} />
          <FieldBlock label="Contact" value={item.email ?? item.phone ?? item.organization} />
          <FieldBlock label="Relationship" value={item.relationship} />
          {item.description ? (
            <div className="md:col-span-3">
              <FieldBlock label="Notes" value={item.description} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function HouseholdMemberList({ items }: { items: OperationsOnboardingHouseholdMember[] }) {
  if (items.length === 0) {
    return <OperationsEmptyState>No household members are captured yet.</OperationsEmptyState>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_140px_120px]" key={`${item.name}-${item.relationship ?? item.age ?? item.status}`}>
          <FieldBlock label="Name" value={item.name} />
          <FieldBlock label="Relationship" value={item.relationship} />
          <FieldBlock label="Status" value={item.status ?? item.age} />
        </div>
      ))}
    </div>
  );
}

function DocumentList({ items }: { items: OperationsOnboardingDocumentItem[] }) {
  if (items.length === 0) {
    return <OperationsEmptyState>Documents and photos are pending.</OperationsEmptyState>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((item) => (
        <div className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_140px_120px]" key={`${item.kind}-${item.fileName}-${item.path ?? "pending"}`}>
          <FieldBlock label="File" value={item.fileName} />
          <FieldBlock label="Type" value={item.kind} />
          <FieldBlock label="Status" value={item.status} />
        </div>
      ))}
    </div>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue: string | null;
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <select
        className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
        defaultValue={defaultValue ?? ""}
        name={name}
      >
        {options.map((option) => (
          <option key={option || `${name}-empty`} value={option}>
            {option || "Unset"}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function OperationsMissionaryDetailPage({
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

  if (!canAccessOperationsModule(authorization, "missionaries")) {
    return <OperationsAccessDenied active="missionaries" authorization={authorization} />;
  }

  const { error, item, unauthorized } = await loadOperationsOnboardingDetail({ authorization, id });

  if (unauthorized) {
    return <OperationsAccessDenied active="missionaries" authorization={authorization} title="Missionary Review Access Limited" />;
  }

  if (!item && !error) {
    notFound();
  }

  return (
    <OperationsShell
      active="missionaries"
      action={<OperationsActionLink href="/operations/missionaries" variant="outline">Back to Queue</OperationsActionLink>}
      authorization={authorization}
      eyebrow="Missionary Application"
      title={item?.candidate ?? "Application Detail"}
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

        {item ? (
          <>
            <OperationsPanel title="Candidate">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FieldBlock label="Submitted" value={formatOperationsDate(item.submittedAt)} />
                <FieldBlock label="Assigned" value={item.assignedTo} />
                <FieldBlock label="Email" value={item.email} />
                <FieldBlock label="Phone" value={item.applicantPhone} />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Status</p>
                  <div className="mt-1">
                    <OperationsBadge tone={toneForStatus(item.status)}>
                      {item.status}
                    </OperationsBadge>
                  </div>
                </div>
                <FieldBlock label="Location" value={item.location} />
                <FieldBlock label="Calling" value={item.callingFocus} />
                <FieldBlock label="Proposed Need" value={item.proposedMonthlyNeedLabel} />
                <FieldBlock label="Approved Goal" value={item.adminApprovedMonthlyGoalLabel} />
                <FieldBlock label="Excess Agreement" value={item.excessSupportAgreementAccepted ? "Accepted" : "Not accepted"} />
              </div>
            </OperationsPanel>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-4">
                <OperationsPanel title="Story / Calling">
                  <div className="grid gap-4">
                    <FieldBlock label="Testimony" value={item.storyTestimony} />
                    <DetailGrid empty="No structured story answers are captured yet." items={item.storyAnswers} />
                  </div>
                </OperationsPanel>

                <OperationsPanel title="Household">
                  <div className="space-y-5">
                    <DetailGrid empty="No household context is captured yet." items={item.householdDetails} />
                    <HouseholdMemberList items={item.householdMembers} />
                  </div>
                </OperationsPanel>

                <OperationsPanel title="References">
                  <ReferenceList items={item.references} />
                </OperationsPanel>

                <OperationsPanel title="Prayer / Ministry">
                  <div className="grid gap-5">
                    <ContactList empty="No prayer partners are captured yet." items={item.prayerPartners} />
                    {item.prayerRequests.length > 0 ? (
                      <div className="grid gap-2">
                        {item.prayerRequests.map((request) => (
                          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800" key={request}>
                            {request}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <OperationsEmptyState>No prayer requests are captured yet.</OperationsEmptyState>
                    )}
                  </div>
                </OperationsPanel>

                <OperationsPanel title="Support / Documents">
                  <div className="space-y-5">
                    <DetailGrid empty="No support details are captured yet." items={item.supportDetails} />
                    <DocumentList items={item.documents} />
                  </div>
                </OperationsPanel>
              </div>

              <div className="space-y-4">
                <OperationsPanel title="Review">
                  {item.canManage ? (
                    <form action={updateMissionaryReviewAction} className="grid gap-4">
                      <input name="id" type="hidden" value={item.id} />
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Status</span>
                        <select
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={item.statusKey}
                          name="status"
                        >
                          {operationsOnboardingStatuses.map((status) => (
                            <option key={status} value={status}>
                              {onboardingStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Owner</span>
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={item.assignedTo ?? ""}
                          name="assignedTo"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Approved Monthly Goal</span>
                        <input
                          className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={item.adminApprovedMonthlyGoalLabel ?? ""}
                          inputMode="decimal"
                          name="adminApprovedMonthlyGoal"
                          placeholder="$0"
                        />
                      </label>
                      <SelectField defaultValue={item.followUpState ?? item.followUpLabel} label="Follow Up" name="followUpState" options={followUpOptions} />
                      <SelectField defaultValue={item.interviewState} label="Interview" name="interviewState" options={interviewOptions} />
                      <SelectField defaultValue={item.decisionState ?? item.decisionLabel} label="Decision" name="decisionState" options={decisionOptions} />
                      <SelectField defaultValue={item.onboardingStatus} label="Onboarding" name="onboardingStatus" options={onboardingOptions} />
                      <SelectField defaultValue={item.fundraisingLabel} label="Fundraising" name="supportReadiness" options={readinessOptions} />
                      <SelectField defaultValue={item.profileReadiness ?? item.profileLabel} label="Profile" name="profileReadiness" options={profileOptions} />
                      <SelectField defaultValue={item.dosSetupState ?? item.dosSetupLabel} label="DOS Setup" name="dosSetupState" options={dosOptions} />
                      <label className="block">
                        <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Internal Notes</span>
                        <textarea
                          className="mt-2 min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-[#D8A932]"
                          defaultValue={item.adminNotes ?? ""}
                          name="adminNotes"
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
                      This application is view-only for your current role.
                    </OperationsEmptyState>
                  )}
                </OperationsPanel>

                {item.canManage ? (
                  <OperationsPanel title="Record Controls">
                    <div className="grid gap-2">
                      {item.statusKey === "archived" ? (
                        <form action={restoreMissionaryApplicationAction}>
                          <input name="id" type="hidden" value={item.id} />
                          <button
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932] hover:text-[#7A5200]"
                            type="submit"
                          >
                            Restore
                          </button>
                        </form>
                      ) : (
                        <form action={archiveMissionaryApplicationAction}>
                          <input name="id" type="hidden" value={item.id} />
                          <button
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932] hover:text-[#7A5200]"
                            type="submit"
                          >
                            Archive
                          </button>
                        </form>
                      )}
                      {item.isTestRecord ? (
                        <form action={deleteTestMissionaryApplicationAction}>
                          <input name="id" type="hidden" value={item.id} />
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
