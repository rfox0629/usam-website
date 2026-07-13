import Link from "next/link";
import { adminFont, AdminBadge, type AdminBadgeTone } from "../../../../admin/_components/AdminUI";

export type WorkflowStepStatus = "done" | "in_progress" | "blocked" | "not_started";

export type WorkflowStep = {
  cta: { href: string; label: string } | null;
  detail: string;
  status: WorkflowStepStatus;
  title: string;
};

const statusTone: Record<WorkflowStepStatus, AdminBadgeTone> = {
  blocked: "muted",
  done: "green",
  in_progress: "amber",
  not_started: "muted",
};

const statusLabel: Record<WorkflowStepStatus, string> = {
  blocked: "Not Available Yet",
  done: "Done",
  in_progress: "In Progress",
  not_started: "Not Started",
};

/**
 * The single continuous path through a filing's preparation workflow,
 * rendered as one checklist instead of leaving a first-time user to guess
 * which tab to open next. Each step's status is computed from real data
 * already loaded on the page, not a separately tracked flag that could
 * drift out of sync with what's actually there. Shared by the 990
 * workspace and the Arizona Annual Report workspace.
 */
export function FilingProgressDashboard({ periodLabel, steps }: { periodLabel: string; steps: readonly WorkflowStep[] }) {
  const nextStep = steps.find((step) => step.status === "in_progress" || step.status === "not_started");

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          Preparation Workflow
        </h2>
        {nextStep?.cta ? (
          <Link
            className="inline-flex min-h-9 items-center justify-center border border-transparent bg-[#D4A63D] px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition-colors hover:bg-[#F5B942]"
            href={nextStep.cta.href}
          >
            Next: {nextStep.cta.label}
          </Link>
        ) : null}
      </div>

      <ol className="mt-4 divide-y divide-stone-900">
        {steps.map((step, index) => (
          <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={step.title}>
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                  step.status === "done"
                    ? "border-[#C9A24A]/50 bg-[#C9A24A]/10 text-[#C9A24A]"
                    : step === nextStep
                      ? "border-[#C9A24A] bg-[#C9A24A]/15 text-[#E4C465]"
                      : "border-stone-700 text-stone-600"
                }`}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-100">{step.title}</p>
                <p className="mt-0.5 text-xs text-stone-500">{step.detail}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AdminBadge tone={statusTone[step.status]}>{statusLabel[step.status]}</AdminBadge>
              {step.cta ? (
                <Link
                  className="inline-flex min-h-8 items-center justify-center border border-stone-700 px-3 text-[10px] uppercase tracking-[0.14em] text-stone-100 transition-colors hover:border-[#D4A63D]"
                  href={step.cta.href}
                  style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}
                >
                  {step.cta.label}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-[11px] text-stone-600">{periodLabel} — every step above reflects real data already on this filing, not a separate progress flag.</p>
    </section>
  );
}
