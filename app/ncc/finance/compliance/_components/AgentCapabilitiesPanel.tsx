import { adminFont } from "../../../../admin/_components/AdminUI";

const agentMay = [
  "Extract corporate identity and filing data from uploaded formation documents",
  "Read bank statements, payroll reports, donation reports, board records, and governing documents",
  "Prefill draft filing fields",
  "Prepare P&L and balance-sheet workpapers",
  "Prepare payroll and officer-compensation summaries",
  "Identify missing information",
  "Draft governance responses",
  "Generate an accountant-ready package",
  "Flag inconsistencies and deadlines",
];

const agentMayNot = [
  "Submit filings",
  "Certify legal statements",
  "Change officers or directors",
  "Change statutory-agent details",
  "Post financial adjustments",
  "Mark a filing complete without human confirmation",
];

export function AgentCapabilitiesPanel() {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
          Finance &amp; Compliance Agent — Preparation Layer
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        This is the interface and workflow scaffold the agent will operate within — it defines the boundary
        the agent must respect, not a live extraction pipeline. No document is read or summarized by AI in
        this preview; uploaded files are stored for human and, later, accountant review only.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#D4A63D]" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            The Agent May
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-stone-300">
            {agentMay.map((item) => (
              <li className="flex gap-2" key={item}>
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#C9A24A]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-red-300" style={{ fontFamily: adminFont.rajdhani, fontWeight: 700 }}>
            The Agent May Not
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-stone-300">
            {agentMayNot.map((item) => (
              <li className="flex gap-2" key={item}>
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
