import { adminFont } from "../../../../admin/_components/AdminUI";

const agentMay = [
  "Classify uploaded document type (by filename only — not content)",
  "Suggest reporting month/year from transaction date ranges",
  "Identify missing monthly documents against the standard checklist",
  "Suggest transaction categories (keyword-based, not content extraction)",
  "Detect likely payroll and payroll-tax transactions",
  "Flag unclear or unusual transactions (statistical outliers)",
  "Draft missing-information questions from known gaps",
  "Prepare draft workpaper summaries from approved transactions",
];

const agentMayNot = [
  "Submit a tax or state filing",
  "Mark a filing filed",
  "Create financial adjustments",
  "Change donor restrictions",
  "Approve transaction categories",
  "Modify officers, directors, or statutory-agent information",
  "Send documents externally without human approval",
];

export function FinanceAgentPanel() {
  return (
    <section className="border border-stone-800/75 bg-[#080808]/85 p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-100" style={{ fontFamily: adminFont.rajdhani }}>
        Initial Finance Agent
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        Every capability below is rule-based (keyword matching, date math, arithmetic on already-approved
        transactions) — no capability in this list reads the content of an uploaded document, and none calls a
        generative AI model. Extracting beginning/ending statement balances from an actual scanned statement
        would require that, so it is not implemented here — deferred until staging authorization and storage
        tests pass, per your instruction.
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
