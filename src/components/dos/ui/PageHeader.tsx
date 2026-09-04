import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Page header (canonical spec §3): back when pushed, the title in the display
 * size, one optional trailing control. Replaces the "← More" pill and the
 * hero/title-with-control variants on refreshed screens. Home keeps its own
 * hero (B1).
 */
export function PageHeader({
  action,
  backLabel = "Back",
  lede,
  onBack,
  title,
}: {
  action?: ReactNode;
  backLabel?: string;
  /** One line under the title, in the secondary color. */
  lede?: string;
  onBack?: () => void;
  title: string;
}) {
  return (
    <header className="pt-2">
      {onBack || action ? (
        <div className="flex h-11 items-center justify-between gap-3">
          {onBack ? (
            <button
              aria-label={backLabel}
              className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-dos-3 text-dos-primary transition-colors hover:bg-dos-surface2 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
            </button>
          ) : (
            <span />
          )}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <h1 className="mt-1 text-dos-display text-dos-primary">{title}</h1>
      {lede ? <p className="mt-1.5 text-dos-body text-dos-secondary">{lede}</p> : null}
    </header>
  );
}

/**
 * Section eyebrow: the only uppercase text in DOS. `section` is blue and
 * introduces a page section; `sub` is grey and groups rows inside a section
 * (Person "Right now"). An optional count sits on the right, or an action.
 */
export function Eyebrow({
  action,
  children,
  count,
  tone = "section",
}: {
  action?: ReactNode;
  children: ReactNode;
  count?: ReactNode;
  tone?: "section" | "sub";
}) {
  return (
    <div className="mb-2 mt-[22px] flex items-center justify-between gap-3 first:mt-0">
      <h2 className={`text-dos-eyebrow uppercase ${tone === "section" ? "text-dos-eyebrowSection" : "text-dos-eyebrow"}`}>{children}</h2>
      {action ?? (count !== undefined ? <span className="text-dos-meta text-dos-secondary">{count}</span> : null)}
    </div>
  );
}
