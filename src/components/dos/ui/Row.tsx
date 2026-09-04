import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * List row (canonical spec §3): 12px vertical padding, hairline top, optional
 * leading tile or avatar, primary line 15/600 ink, secondary line 12.5 ink-2,
 * trailing pill and/or chevron. The whole row is the tap target; the pill is
 * never a control.
 */
export function Row({
  chevron = false,
  href,
  leading,
  onClick,
  primary,
  secondary,
  trailing,
}: {
  chevron?: boolean;
  href?: string;
  leading?: ReactNode;
  onClick?: () => void;
  primary: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-dos-body font-semibold text-dos-primary">{primary}</span>
        {secondary ? <span className="mt-0.5 block truncate text-dos-meta text-dos-secondary">{secondary}</span> : null}
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
      {chevron ? <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-dos-secondary" strokeWidth={2} /> : null}
    </>
  );
  const className = "flex min-h-[60px] w-full items-center gap-3 border-t border-dos-line py-3 text-left first:border-t-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue focus-visible:ring-inset";

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

/**
 * Card: only for a self-contained object (Last / Upcoming meeting, an Apps
 * tile, a dashboard panel). Never nested inside another card.
 */
export function Card({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const className = "block w-full rounded-dos-2 border border-dos-line bg-white px-4 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue";

  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        {children}
      </button>
    );
  }

  return <section className={className}>{children}</section>;
}
