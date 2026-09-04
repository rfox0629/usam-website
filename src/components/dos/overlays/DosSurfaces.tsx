"use client";

import { ArrowLeft, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { backdropMayDismiss, discardConfirmationCopy, exitNeedsConfirmation, formIsDirty, type DosSurfaceKind } from "@/src/lib/dos/unsaved-work";

/* The DOS overlay primitives and the single unsaved-work guard. Moved verbatim
 * from app/dos/app/DosMvpAppClient.tsx in USA-211 (spec §3, B7). The order of
 * the functions is preserved because regression scripts slice this file by
 * function name. `font.rajdhani` is the same value the client uses. */
const font = { rajdhani: "'Inter', sans-serif" };

/* A dedicated task screen: the user has navigated into a real workflow.
 *
 * Every one of these holds meaningful input, so the guard is not optional here
 * the way it is on a Sheet -- Back always asks before discarding work. It uses
 * the same DOM snapshot as Sheet, so there is one dirty-state implementation
 * for the whole application rather than one per form. */
export function DosWorkflowPage({
  children,
  onClose,
  subtitle,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const initialValuesRef = useRef<Record<string, unknown> | null>(null);
  const guard = useUnsavedWorkGuard({
    getIsDirty: () => formIsDirty(initialValuesRef.current, readSurfaceValues(bodyRef.current)),
    onExit: onClose,
  });

  useEffect(() => {
    if (initialValuesRef.current === null) {
      initialValuesRef.current = readSurfaceValues(bodyRef.current);
    }
  }, []);

  const requestClose = guard.requestExit;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-white [scrollbar-width:none] md:left-[232px] xl:left-[260px]">
      <div className="mx-auto w-full max-w-[620px] px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-6 md:px-8 md:pb-16 md:pt-10" ref={bodyRef}>
        <header>
          <button
            aria-label="Back"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-dos-primary transition-colors hover:bg-[#F3F4F6]"
            onClick={requestClose}
            type="button"
          >
            <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" strokeWidth={2} />
          </button>
          <h2 className="mt-2 text-[25px] font-bold leading-[1.1] tracking-[-0.02em] text-dos-primary">{title}</h2>
          {subtitle ? <p className="mt-1.5 text-[14.5px] leading-[1.5] text-dos-body">{subtitle}</p> : null}
        </header>
        <div className="mt-6">{children}</div>
      </div>
      {guard.confirmation}
    </div>
  );
}

/* The one confirmation DOS uses when leaving unfinished work.
 *
 * Keep editing is first, is the filled button, and is what Escape and the
 * backdrop do -- because the safe choice should be the easy one, and because
 * this dialog exists to catch accidents. Discard is a plain text button: it is
 * the destructive path and should take a deliberate press.
 *
 * It renders above everything, including the sheet that raised it, at a z-index
 * above Sheet's own 1000. */
export function DiscardChangesDialog({
  onDiscard,
  onKeepEditing,
}: {
  onDiscard: () => void;
  onKeepEditing: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onKeepEditing();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onKeepEditing]);

  const content = (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#0F172A]/35 px-5 backdrop-blur-sm"
      onMouseDown={onKeepEditing}
      role="presentation"
    >
      <div
        aria-modal="true"
        className="w-full max-w-[340px] rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_26px_90px_rgba(15,23,42,0.22)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className="text-[19px] font-bold leading-[1.2] tracking-[-0.015em] text-dos-primary">{discardConfirmationCopy.title}</h2>
        <p className="mt-1.5 text-[14px] leading-[1.5] text-dos-body">{discardConfirmationCopy.description}</p>
        <div className="mt-5 grid gap-2">
          <button
            className="flex min-h-11 w-full items-center justify-center rounded-full bg-dos-blue px-4 text-[14.5px] font-bold text-white transition-colors hover:bg-[#1D4ED8]"
            onClick={onKeepEditing}
            type="button"
          >
            {discardConfirmationCopy.cancel}
          </button>
          <button
            className="flex min-h-11 w-full items-center justify-center rounded-full px-4 text-[14px] font-semibold text-[#B42318] transition-colors hover:bg-[#FEF3F2]"
            onClick={onDiscard}
            type="button"
          >
            {discardConfirmationCopy.confirm}
          </button>
        </div>
      </div>
    </div>
  );

  return isMounted ? createPortal(content, document.body) : null;
}

/* The single unsaved-work guard for DOS.
 *
 * A workflow tells it whether it is dirty; it hands back the close handler to
 * wire to X, Back and Cancel, plus the dialog to render. One implementation
 * rather than one per form, so a new workflow gets the protection by using it
 * rather than by remembering to reimplement it.
 *
 * Keep editing simply stops asking: the form was never unmounted, so every
 * typed character, selection and scroll position is still exactly where the
 * user left it. That is the point of guarding the exit rather than saving a
 * copy of the state and restoring it. */
export function useUnsavedWorkGuard({
  getIsDirty,
  onExit,
}: {
  /* A getter rather than a value: dirtiness is read from the live surface at
     the moment the user tries to leave, so nothing has to be recomputed on
     every keystroke to keep a boolean current. */
  getIsDirty: () => boolean;
  onExit: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  const requestExit = () => {
    if (exitNeedsConfirmation({ isDirty: getIsDirty(), kind: "editable" })) {
      setIsConfirming(true);
      return;
    }

    onExit();
  };

  /* Used after a successful save: the work is persisted, so there is nothing
     left to protect and the caller leaves without a prompt. */
  const exitWithoutGuard = () => {
    setIsConfirming(false);
    onExit();
  };

  const confirmation = isConfirming ? (
    <DiscardChangesDialog
      onDiscard={() => {
        setIsConfirming(false);
        onExit();
      }}
      onKeepEditing={() => setIsConfirming(false)}
    />
  ) : null;

  return { confirmation, exitWithoutGuard, isConfirming, requestExit };
}

/* What has the user actually put into this surface?
 *
 * Read from the rendered controls rather than from each form's own state,
 * because there are twenty editable sheets with twenty different state shapes
 * and asking each to report dirtiness separately is how a form gets forgotten.
 * One reader here means a sheet is protected by saying what it is, not by
 * remembering to wire anything.
 *
 * Covers the three ways DOS collects an answer: typed fields, native selects
 * and checkboxes, and the pressed-state button groups the DOS pickers use. */
export function readSurfaceValues(root: HTMLElement | null) {
  if (!root) {
    return {};
  }

  const values: Record<string, unknown> = {};

  root.querySelectorAll("input, textarea, select").forEach((node, index) => {
    const field = node as HTMLInputElement;
    const key = field.name || `${field.tagName}:${index}`;

    values[key] = field.type === "checkbox" || field.type === "radio" ? field.checked : field.value;
  });

  /* The DOS pickers are buttons carrying aria-pressed, not inputs, so a
     changed relationship or context would otherwise read as clean. */
  root.querySelectorAll("[aria-pressed]").forEach((node, index) => {
    values[`pressed:${index}`] = node.getAttribute("aria-pressed");
  });

  return values;
}

/* A Sheet declares what it is, and its dismissal rules follow.
 *
 *   kind="inspection" (the default) is a record you are reading. The backdrop
 *   closes it, exactly as every sheet always has, because closing costs
 *   nothing.
 *
 *   kind="editable" holds user input. The backdrop still dims and blurs, but
 *   stops being a way to lose work; X and Escape route through onClose, which
 *   the caller guards.
 *
 * The default is deliberately the old behaviour, so the 60 read-only sheets
 * are unchanged and only a surface that says it holds work gets the new
 * protection. */
export function Sheet({
  children,
  description,
  kind = "inspection",
  onClose,
  showEyebrow = false,
  showHeader = true,
  size = "default",
  title,
}: {
  children: ReactNode;
  description?: string;
  kind?: DosSurfaceKind;
  onClose: () => void;
  showEyebrow?: boolean;
  showHeader?: boolean;
  size?: "default" | "wide";
  title: string;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const initialValuesRef = useRef<Record<string, unknown> | null>(null);
  const guard = useUnsavedWorkGuard({
    getIsDirty: () => kind === "editable" && formIsDirty(initialValuesRef.current, readSurfaceValues(panelRef.current)),
    onExit: onClose,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /* Snapshot what the sheet opened with, once it has rendered. Everything the
     user does afterwards is measured against this, so typing a word and
     deleting it again leaves the sheet clean. */
  useEffect(() => {
    if (isMounted && kind === "editable" && initialValuesRef.current === null) {
      initialValuesRef.current = readSurfaceValues(panelRef.current);
    }
  }, [isMounted, kind]);

  /* Every deliberate exit -- X, Escape, and whatever the caller wires to
     onClose -- comes through here. A clean sheet closes silently; a sheet
     holding work asks first. Keep editing only dismisses the dialog, so the
     sheet is never unmounted and every entered value survives. */
  const requestClose = guard.requestExit;

  useEffect(() => {
    /* globalThis.KeyboardEvent because this file imports React KeyboardEvent. */
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, onClose]);

  const panelClassName = size === "wide"
    ? "max-w-[1060px] overflow-hidden rounded-t-[28px] rounded-b-[24px] md:rounded-[30px]"
    : "max-w-lg overflow-y-auto overflow-x-hidden rounded-t-[30px] rounded-b-[24px] p-4 [scrollbar-width:none] md:rounded-[30px]";

  const content = (
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto overflow-x-hidden bg-[#EAF2FF]/60 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] pt-5 backdrop-blur-lg md:bg-[#0F172A]/18"
      /* The whole point. An editable sheet's backdrop is inert: no handler at
         all, so a stray thumb on the blurred area does nothing rather than
         destroying a half-finished form. */
      onMouseDown={backdropMayDismiss(kind) ? onClose : undefined}
      role="presentation"
    >
      <div className="flex min-h-full min-w-0 items-end justify-center md:items-center">
        <div
          aria-modal="true"
          className={`max-h-[calc(100dvh-1.5rem)] w-full max-w-[calc(100vw-1.5rem)] min-w-0 border border-white/80 bg-white shadow-[0_26px_90px_rgba(37,99,235,0.16)] ${panelClassName}`}
          onMouseDown={(event) => event.stopPropagation()}
          ref={panelRef}
          role="dialog"
        >
          {showHeader ? (
            <>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E2E8F0]" aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  {showEyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]" style={{ fontFamily: font.rajdhani }}>
                    DOS
                  </p> : null}
                  <h2 className={`${showEyebrow ? "mt-2" : ""} text-2xl font-bold leading-none text-[#0F172A]`}>{title}</h2>
                  {description ? <p className="mt-3 text-sm leading-6 text-[#64748B]">{description}</p> : null}
                </div>
                <button
                  aria-label="Close"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-xl leading-none text-[#0F172A]"
                  onClick={requestClose}
                  type="button"
                >
                  &times;
                </button>
              </div>
              <div className="mt-5">{children}</div>
            </>
          ) : children}
        </div>
      </div>
      {guard.confirmation}
    </div>
  );

  return isMounted ? createPortal(content, document.body) : null;
}

/* The legacy sheet primitive, kept for two read-only previews. It takes the
   same kind contract as Sheet so that if anything editable is ever put in one,
   its backdrop stops being a way to lose work -- rather than this quietly
   becoming a second door around the safety rule. */
export function MobileBottomSheet({
  badge,
  children,
  footer,
  kind = "inspection",
  onClose,
  subtitle,
  title,
}: {
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  kind?: DosSurfaceKind;
  onClose: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <div
      className="absolute inset-0 z-[80] flex items-end bg-[#0F172A]/20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] backdrop-blur-[3px]"
      onMouseDown={backdropMayDismiss(kind) ? onClose : undefined}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="max-h-[calc(100dvh-1.5rem)] w-full overflow-hidden rounded-t-[32px] rounded-b-[24px] border border-white/70 bg-white p-3 shadow-[0_28px_85px_rgba(32,27,20,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E2E8F0]" aria-hidden="true" />
        <header className="flex items-start gap-3 px-1 pb-3">
          <button
            aria-label="Close"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#0F172A] transition-colors hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" strokeWidth={1.9} />
          </button>
          {badge ? <div className="shrink-0">{badge}</div> : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-[#0F172A]">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-[#64748B]">{subtitle}</p> : null}
          </div>
        </header>
        <div className="max-h-[calc(100dvh-13rem)] overflow-y-auto px-0.5 [scrollbar-width:none]">
          {children}
        </div>
        {footer ? <div className="mt-3 px-0.5">{footer}</div> : null}
      </section>
    </div>
  );
}
