"use client";

import { MoreHorizontal } from "lucide-react";
import { Fragment, useEffect, useId, useRef, useState } from "react";

/* USA-280 Person record actions: the one menu every record row uses.
 *
 * It lived inside `DosMvpAppClient` and could not be reached from the
 * Multiplication tree, which is why that section grew its own dots button
 * wired straight to a sheet. One primitive now serves every list, so trailing
 * alignment, control size, touch target, spacing and dismissal behave the same
 * way in every section of the record.
 *
 * Three rules this file exists to enforce:
 *
 * 1. Opening a menu never navigates. The trigger stops its own click, so a
 *    menu inside a row that some other code made clickable still only opens.
 * 2. One menu is open anywhere on the screen. Opening a second closes the
 *    first, so two menus can never overlap each other.
 * 3. The menu stays inside the viewport and clear of the bottom navigation
 *    and the floating button. When there is not enough room below the trigger
 *    it opens upward, and when there is not enough room either way it scrolls
 *    rather than running off the screen.
 */

export type RowActionMenuItem = {
  /* Removal and other destructive actions. Rendered last and set apart. */
  danger?: boolean;
  /* A real link, so Open on an external resource stays a link. */
  href?: string;
  label: string;
  onSelect?: () => void;
};

/* The bottom navigation and the floating action button own the last stretch of
   the viewport. A menu is measured against the space above them so its last
   item is never covered by either. */
const BOTTOM_FURNITURE_CLEARANCE = 104;
/* Below this, opening downward would show only a sliver, so it flips up. */
const MINIMUM_USEFUL_HEIGHT = 168;

let openRowActionMenuId: string | null = null;
const rowActionMenuListeners = new Set<(id: string | null) => void>();

function announceOpenRowActionMenu(id: string | null) {
  openRowActionMenuId = id;
  rowActionMenuListeners.forEach((listener) => listener(id));
}

export function RowActionMenu({
  items,
  label,
}: {
  items: ReadonlyArray<RowActionMenuItem>;
  label: string;
}) {
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  /* Another row's menu opening closes this one. */
  useEffect(() => {
    const listener = (id: string | null) => {
      if (id !== menuId) {
        setIsOpen(false);
      }
    };

    rowActionMenuListeners.add(listener);

    return () => {
      rowActionMenuListeners.delete(listener);
    };
  }, [menuId]);

  /* A press outside closes it. Capture phase, so it still runs when the press
     lands on something that stops propagation on its way up. */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node | null)) {
        setIsOpen(false);

        if (openRowActionMenuId === menuId) {
          openRowActionMenuId = null;
        }
      }
    };

    window.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [isOpen, menuId]);

  if (!items.length) {
    return null;
  }

  const close = (returnFocus = false) => {
    setIsOpen(false);

    if (openRowActionMenuId === menuId) {
      openRowActionMenuId = null;
    }

    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect();

    if (rect && typeof window !== "undefined") {
      const roomBelow = window.innerHeight - BOTTOM_FURNITURE_CLEARANCE - rect.bottom;
      const roomAbove = rect.top - 12;
      const opensUpward = roomBelow < MINIMUM_USEFUL_HEIGHT && roomAbove > roomBelow;

      setPlacement(opensUpward ? "above" : "below");
      /* Never below a usable height: a very short menu that scrolls is still
         reachable, whereas one clipped to nothing is not. */
      setMaxHeight(Math.max(140, Math.round(opensUpward ? roomAbove : roomBelow)));
    }

    announceOpenRowActionMenu(menuId);
    setIsOpen(true);
  };

  return (
    <div
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          /* Stops here, so an enclosing sheet stays open. */
          event.stopPropagation();
          close(true);
        }
      }}
      ref={rootRef}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={label}
        className="flex h-11 w-11 items-center justify-center rounded-full text-dos-secondary transition-colors hover:bg-dos-blue50 hover:text-dos-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-dos-blue"
        onClick={(event) => {
          /* The menu opens. It never also does whatever the row does. */
          event.preventDefault();
          event.stopPropagation();

          if (isOpen) {
            close();
          } else {
            open();
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" className="h-5 w-5" strokeWidth={2} />
      </button>
      {isOpen ? (
        <div
          className={`absolute right-0 z-dos-popover w-56 overflow-y-auto overscroll-contain rounded-2xl border border-dos-line bg-white p-1.5 shadow-[0_18px_45px_rgba(42,37,29,0.14)] ${placement === "above" ? "bottom-full mb-1" : "top-full mt-1"}`}
          role="menu"
          style={maxHeight ? { maxHeight } : undefined}
        >
          {items.map((item, index) => {
            const itemClassName = `flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-left text-dos-label font-semibold leading-[1.3] ${item.danger ? "text-[#B42318] hover:bg-[#FEF2F2]" : "text-dos-primary hover:bg-dos-blue50"}`;
            /* Removal is last and set apart, so it is never the thing a
               thumb lands on by accident. */
            const startsDangerGroup = Boolean(item.danger) && !items[index - 1]?.danger;

            return (
              <Fragment key={item.label}>
                {startsDangerGroup && index > 0 ? (
                  <span aria-hidden="true" className="my-1.5 block h-px bg-dos-rule" />
                ) : null}
                {item.href ? (
                  <a
                    className={itemClassName}
                    href={item.href}
                    onClick={() => close()}
                    role="menuitem"
                  >
                    {item.label}
                  </a>
                ) : (
                  <button
                    className={itemClassName}
                    onClick={(event) => {
                      event.stopPropagation();
                      close();
                      item.onSelect?.();
                    }}
                    role="menuitem"
                    type="button"
                  >
                    {item.label}
                  </button>
                )}
              </Fragment>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* A record row is information plus one trailing menu.
 *
 * Before this, a row was itself a button with a chevron, so the row and its
 * menu disagreed about what a tap does: on Multiplication the two controls sat
 * side by side, and a tap meant to open the menu often navigated instead. The
 * row is no longer clickable and carries no chevron. Every destination it used
 * to reach is a named action in the menu. */
export function PersonRecordItem({
  children,
  menuItems,
  menuLabel,
}: {
  children: React.ReactNode;
  menuItems: ReadonlyArray<RowActionMenuItem>;
  menuLabel: string;
}) {
  return (
    <div className="flex min-h-11 w-full items-start gap-3 py-3 first:pt-1.5 last:pb-1.5">
      <div className="min-w-0 flex-1">{children}</div>
      <span className="flex shrink-0 items-center">
        <RowActionMenu items={menuItems} label={menuLabel} />
      </span>
    </div>
  );
}
