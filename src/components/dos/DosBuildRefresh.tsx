"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* USA-283 follow-up: an installed Home Screen app never reloads itself.
 *
 * iOS keeps a standalone web app's process alive across days of resumes.
 * There is no address bar to pull down and no tab to close, so the JavaScript
 * loaded on the day it was installed keeps rendering long after the server
 * moved on -- which is exactly how a redesigned screen can be deployed,
 * verified on the server, and still not be what the leader sees.
 *
 * This compares the build that rendered the page with the build the server is
 * on now, and reloads when they differ. The rules that keep it safe:
 *
 *   - It only reloads when nothing is open. Any dialog or sheet on screen
 *     means work may be in progress (the unsaved-work guard owns that), so
 *     the update waits behind a button instead.
 *   - It reloads at most once per new build, remembered for the session, so a
 *     misconfigured environment can never put the app in a reload loop.
 *   - A failed check is silent. Being offline is not an update.
 */

const dosBuildCheckIntervalMs = 15 * 60 * 1000;
const reloadedForBuildKey = "dos:reloaded-for-build";

function readReloadedFor() {
  try {
    return window.sessionStorage.getItem(reloadedForBuildKey);
  } catch {
    return null;
  }
}

function rememberReloadedFor(buildId: string) {
  try {
    window.sessionStorage.setItem(reloadedForBuildKey, buildId);
  } catch {
    /* Private mode or blocked storage: the worst case is the pill instead of
       an automatic reload, which is the safe direction. */
  }
}

/* Anything modal on screen means the leader is mid-task. */
function appIsBusy() {
  return Boolean(document.querySelector('[role="dialog"], [aria-modal="true"]'));
}

export function DosBuildRefresh({ buildId }: { buildId: string }) {
  const [updateReady, setUpdateReady] = useState(false);
  /* A sheet's backdrop covers everything below it, so a notice rendered while
     a sheet is open cannot be tapped (found in testing). The update waits,
     silently, until the leader closes what they were working on. */
  const [isBusy, setIsBusy] = useState(false);
  const checkingRef = useRef(false);

  const check = useCallback(async () => {
    if (checkingRef.current || !buildId || buildId === "development" || typeof document === "undefined" || document.visibilityState === "hidden") {
      return;
    }

    checkingRef.current = true;

    try {
      const response = await fetch("/api/dos/app/build", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const result = await response.json() as { buildId?: unknown };
      const serverBuildId = typeof result.buildId === "string" ? result.buildId : "";

      if (!serverBuildId || serverBuildId === "development" || serverBuildId === buildId) {
        return;
      }

      if (appIsBusy() || readReloadedFor() === serverBuildId) {
        setIsBusy(appIsBusy());
        setUpdateReady(true);
        return;
      }

      rememberReloadedFor(serverBuildId);
      window.location.reload();
    } catch {
      /* Offline, or the check was interrupted by a navigation. Try again on
         the next resume. */
    } finally {
      checkingRef.current = false;
    }
  }, [buildId]);

  useEffect(() => {
    void check();

    /* Resuming the Home Screen app is the moment that matters: it is the only
       "page load" an installed app ever gets. `pageshow` also covers Safari
       restoring the page from its back/forward cache. */
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void check();
      }
    };
    const interval = window.setInterval(() => void check(), dosBuildCheckIntervalMs);

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [check]);

  /* Once an update is waiting, watch for the screen to clear. */
  useEffect(() => {
    if (!updateReady) {
      return undefined;
    }

    const timer = window.setInterval(() => setIsBusy(appIsBusy()), 1000);

    return () => window.clearInterval(timer);
  }, [updateReady]);

  if (!updateReady || isBusy) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-dos-popover flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
    >
      <div className="pointer-events-auto flex max-w-[420px] items-center gap-3 rounded-dos-3 bg-dos-primary px-4 py-2.5 text-white shadow-dos-float" role="status">
        <span className="min-w-0 text-dos-label">A newer version of DOS is ready.</span>
        <button
          className="shrink-0 rounded-dos-3 bg-white/15 px-3 py-1.5 text-dos-label transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          onClick={() => window.location.reload()}
          type="button"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
