import { adminFont } from "../../../../admin/_components/AdminUI";
import { complianceWorkflowStages, workflowStageLabels, type ComplianceWorkflowStage } from "@/src/lib/compliance/types";

export function WorkflowStageTracker({ currentStage }: { currentStage: ComplianceWorkflowStage }) {
  const currentIndex = complianceWorkflowStages.indexOf(currentStage);

  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Workflow
      </h2>
      <ol className="mt-4 space-y-0">
        {complianceWorkflowStages.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li className="flex items-start gap-3 pb-4 last:pb-0" key={stage}>
              <span className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                    isCurrent
                      ? "border-[#C9A24A] bg-[#C9A24A]/15 text-[#E4C465]"
                      : isComplete
                        ? "border-[#C9A24A]/50 bg-[#C9A24A]/10 text-[#C9A24A]"
                        : "border-stone-700 text-stone-600"
                  }`}
                >
                  {index + 1}
                </span>
                {index < complianceWorkflowStages.length - 1 ? (
                  <span className={`mt-1 h-full min-h-4 w-px flex-1 ${isComplete ? "bg-[#C9A24A]/40" : "bg-stone-800"}`} />
                ) : null}
              </span>
              <span
                className={`pt-0.5 text-sm ${isCurrent ? "font-semibold text-stone-100" : isComplete ? "text-stone-400" : "text-stone-600"}`}
              >
                {workflowStageLabels[stage]}
                {isCurrent ? (
                  <span className="ml-2 text-[9px] uppercase tracking-[0.16em] text-[#C9A24A]">Current</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
