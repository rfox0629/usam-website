import { OperationsEmptyState, formatOperationsDate } from "../../../_components/OperationsUI";
import { buildCaseBrief, type PreparationSummary } from "@/src/lib/operations/restoration-preparation";
import { generatePreparationSummaryAction, savePreparationNoteAction, savePreparationSummaryAction } from "../actions";

const inputClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-[#D8A932]";
const primaryButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-md bg-[#D8A932] px-4 text-[11px] uppercase tracking-[0.14em] text-[#101826] transition hover:bg-[#E7BF57]";
const outlineButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-[11px] uppercase tracking-[0.12em] text-slate-800 transition hover:border-[#D8A932] hover:text-[#7A5200]";

/**
 * The Preparation Summary (USA-187).
 *
 * Renders what the participant actually reported, organized into sections, with
 * no interpretation added. Reviewers may edit each section before saving, and
 * may attach an internal note that is stored apart from the participant's
 * answers and left out of the exported PDF unless they opt in.
 */
export function PreparationSummaryView({
  canManage,
  submissionId,
  summary,
}: {
  canManage: boolean;
  submissionId: string;
  summary: PreparationSummary | null;
}) {
  if (!summary) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">No preparation summary yet</h2>
        <p className="mt-2 max-w-prose text-sm leading-6 text-slate-600">
          Generating a summary organizes this case&rsquo;s answers into eight preparation sections
          and drops anything the participant answered no to or left blank. Nothing is interpreted
          or added, and the original response stays untouched.
        </p>
        {canManage ? (
          <form action={generatePreparationSummaryAction} className="mt-5">
            <input name="id" type="hidden" value={submissionId} />
            <button className={primaryButtonClassName} type="submit">
              Generate Preparation Summary
            </button>
          </form>
        ) : (
          <OperationsEmptyState>
            Generating a preparation summary requires Restoration manage access.
          </OperationsEmptyState>
        )}
      </div>
    );
  }

  const brief = buildCaseBrief(summary.sections);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9D7417]">Case Reference</p>
            <p className="mt-1 font-mono text-lg font-semibold tracking-[0.08em] text-slate-950">
              {summary.caseReference}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Generated {formatOperationsDate(summary.generatedAt)}
              {summary.savedAt ? ` · Saved ${formatOperationsDate(summary.savedAt)}` : " · Draft, not yet saved"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.status === "saved" ? (
              <form
                action={`/operations/submissions/${submissionId}/preparation.pdf`}
                className="flex flex-col items-start gap-2"
                method="get"
              >
                <button className={outlineButtonClassName} type="submit">
                  Download Redacted PDF
                </button>
                <label className="flex items-center gap-2 text-xs leading-5 text-slate-600">
                  <input
                    className="h-4 w-4 rounded border-slate-300"
                    name="notes"
                    type="checkbox"
                    value="1"
                  />
                  Include my internal notes
                </label>
              </form>
            ) : null}
            {canManage ? (
              <form action={generatePreparationSummaryAction}>
                <input name="id" type="hidden" value={submissionId} />
                <button className={outlineButtonClassName} type="submit">
                  Regenerate
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          Confidential. This summary uses a case reference in place of the participant&rsquo;s name and
          omits contact details. Share it only with authorized reviewers, and destroy printed copies
          when they are no longer needed.
        </p>

        {summary.status === "draft" ? (
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Save the summary to enable the redacted PDF export.
          </p>
        ) : null}
      </section>

      {brief.length > 0 ? (
        <section className="rounded-lg border-2 border-[#D8A932] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-base font-semibold leading-tight text-slate-950">Case brief</h3>
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
              Repeated in full below
            </p>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            The five things worth knowing before you open the case. Nothing here is new: every line
            is drawn from the sections below.
          </p>
          <dl className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-100 bg-slate-50/60">
            {brief.map((entry) => (
              <div className="grid gap-1 px-3 py-2 md:grid-cols-[minmax(190px,0.34fr)_minmax(0,1fr)]" key={entry.label}>
                <dt className="text-xs font-medium leading-5 text-slate-600">
                  {entry.label}
                  {entry.kind === "generated" ? (
                    <span className="mt-0.5 block text-[10px] uppercase tracking-[0.12em] text-slate-400">
                      Organized, not reported
                    </span>
                  ) : null}
                </dt>
                <dd className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">
                  {entry.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <form action={savePreparationSummaryAction} className="space-y-4">
        <input name="id" type="hidden" value={submissionId} />

        {summary.sections.map((section) => {
          const note = summary.notes[section.id];

          return (
            <section
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              id={`section-${section.id}`}
              key={section.id}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="text-base font-semibold leading-tight text-slate-950">{section.title}</h3>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  {section.kind === "participant" ? "Participant's own words" : "Organized for preparation"}
                </p>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">{section.provenance}</p>

              {section.items.length > 0 ? (
                <dl className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-100 bg-slate-50/60">
                  {section.items.map((item) => (
                    <div className="grid gap-1 px-3 py-2 md:grid-cols-[minmax(180px,0.4fr)_minmax(0,1fr)]" key={item.fieldId}>
                      <dt className="text-xs font-medium leading-5 text-slate-600">{item.label}</dt>
                      <dd className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Nothing was reported for this section.
                </p>
              )}

              <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  Internal reviewer note
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Kept separate from what the participant wrote. Left out of the PDF unless you
                  choose to include notes.
                </p>
                {note ? (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Last updated {formatOperationsDate(note.updatedAt)} by {note.author}
                  </p>
                ) : null}
                {canManage ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className={`min-h-16 ${inputClassName}`}
                      defaultValue={note?.text ?? ""}
                      form={`note-${section.id}`}
                      name="note"
                    />
                    <button className={outlineButtonClassName} form={`note-${section.id}`} type="submit">
                      Save Note
                    </button>
                  </div>
                ) : note ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{note.text}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-400">No note.</p>
                )}
              </div>
            </section>
          );
        })}

        {canManage ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <button className={primaryButtonClassName} type="submit">
              {summary.status === "saved" ? "Mark Reviewed Again" : "Mark Summary Reviewed"}
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Records that you have read the summary and enables the redacted PDF. Your own words
              belong in the section notes above.
            </p>
          </div>
        ) : null}
      </form>

      {/*
        The note forms live outside the summary form: HTML forbids nesting, so
        each textarea above is bound to its own form by id.
      */}
      {canManage
        ? summary.sections.map((section) => (
            <form action={savePreparationNoteAction} id={`note-${section.id}`} key={`note-form-${section.id}`}>
              <input name="id" type="hidden" value={submissionId} />
              <input name="sectionId" type="hidden" value={section.id} />
            </form>
          ))
        : null}
    </div>
  );
}
