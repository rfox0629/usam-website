import { AdminBadge, AdminEmptyState, adminFont } from "../../../../admin/_components/AdminUI";
import { reminderMilestonesForDueDate } from "@/src/lib/compliance/types";
import { formatDate } from "./complianceLabels";

export function ReminderSchedule({ dueDateIso }: { dueDateIso: string | null }) {
  if (!dueDateIso) {
    return (
      <AdminEmptyState
        description="Reminders can't be scheduled until a due date is known. For Form 990, that requires confirming the accounting year-end first."
        title="No Due Date Yet"
      />
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const milestones = reminderMilestonesForDueDate(dueDateIso);

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Reminder Schedule
      </h2>
      <div className="mt-4 divide-y divide-stone-900">
        {milestones.map((milestone) => {
          const isPast = milestone.date < today;

          return (
            <div className="flex items-center justify-between gap-3 py-2.5" key={milestone.daysBefore}>
              <span className="text-sm text-stone-300">{milestone.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm text-stone-500">{formatDate(milestone.date)}</span>
                {isPast ? <AdminBadge tone="muted">Past</AdminBadge> : <AdminBadge tone="amber">Scheduled</AdminBadge>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
