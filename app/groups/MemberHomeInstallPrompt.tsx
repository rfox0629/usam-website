"use client";

import { useEffect, useMemo, useState } from "react";

type MemberHomeInstallPromptProps = {
  identityId: string;
  /**
   * Leader preview. The row renders exactly as the participant sees it on first
   * entry — collapsed, instructions closed — but never reads or writes the
   * participant's stored dismissal state.
   */
  readOnly?: boolean;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function deviceInstructions(userAgent: string) {
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  const isChrome = /Chrome|CriOS/i.test(userAgent) && !/Edg|OPR/i.test(userAgent);
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line|LinkedInApp|Messenger|Pinterest|TikTok|Twitter|X-IAB/i.test(userAgent);

  if (isIOS && isInAppBrowser) {
    return {
      steps: ["Open this link in Safari.", "Tap Share.", "Tap Add to Home Screen.", "Open as Web App, then tap Add."],
      title: "Open in Safari first",
    };
  }

  if (isIOS) {
    return {
      steps: ["Safari: tap Share.", "Tap Add to Home Screen.", "Open as Web App, then tap Add."],
      title: "iPhone / iPad",
    };
  }

  if (isAndroid && isChrome) {
    return {
      steps: ["Chrome: open the menu.", "Tap Install app or Add to Home screen.", "Confirm the DOS icon."],
      title: "Android / Chrome",
    };
  }

  if (isAndroid) {
    return {
      steps: ["Open this page in Chrome.", "Open the menu.", "Tap Install app or Add to Home screen."],
      title: "Android",
    };
  }

  return {
    steps: ["Use your browser menu.", "Choose Install app or Add to Home screen.", "Open DOS from the new icon."],
    title: "Install",
  };
}

export function MemberHomeInstallPrompt({ identityId, readOnly = false }: MemberHomeInstallPromptProps) {
  const [isStandalone, setIsStandalone] = useState(false);
  // Instructions stay closed until tapped, in the real portal and the preview
  // alike. Install help sits at the bottom and never opens itself.
  const [showSteps, setShowSteps] = useState(false);
  // First entry may add a one-line invitation above the row. Once dismissed,
  // only the compact row remains, so install help never dominates the fold.
  const [showInvitation, setShowInvitation] = useState(false);
  const storageKey = `dos-member-home-install-dismissed:${identityId}`;
  const instructions = useMemo(() => {
    if (typeof window === "undefined") {
      return { steps: [], title: "Install" };
    }

    return deviceInstructions(window.navigator.userAgent);
  }, []);

  useEffect(() => {
    const standalone = isStandaloneDisplay();

    setIsStandalone(standalone);

    if (standalone) {
      return;
    }

    // Leader preview must never read or write the participant's real state, so
    // it always shows the unseen-yet first-entry invitation.
    setShowInvitation(readOnly || window.localStorage.getItem(storageKey) !== "true");
  }, [readOnly, storageKey]);

  function dismissInvitation() {
    if (!readOnly) {
      window.localStorage.setItem(storageKey, "true");
    }

    setShowInvitation(false);
  }

  // Already installed — the row has nothing left to offer.
  if (isStandalone) {
    return null;
  }

  return (
    <section className="rounded-[24px] border border-[#EAF2FF] bg-white shadow-[0_14px_34px_rgba(37,99,235,0.045)]">
      {showInvitation ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAF2FF] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#0F172A]">Keep DOS on your phone</p>
            <p className="mt-0.5 text-xs font-semibold leading-5 text-[#64748B]">
              Add it to your Home Screen so you can return each week.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#2563EB_0%,#1D4ED8_100%)] px-3 text-xs font-bold text-white"
              onClick={() => setShowSteps(true)}
              type="button"
            >
              Show Me How
            </button>
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#DCEBFF] bg-white px-3 text-xs font-bold text-[#475569]"
              onClick={dismissInvitation}
              type="button"
            >
              Maybe Later
            </button>
          </div>
        </div>
      ) : null}

      <button
        aria-expanded={showSteps}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setShowSteps((value) => !value)}
        type="button"
      >
        <span className="text-sm font-bold text-[#0F172A]">Add DOS to your Home Screen</span>
        <span className="shrink-0 text-xs font-bold text-[#1D4ED8]">{showSteps ? "Hide" : "Show"}</span>
      </button>

      {showSteps ? (
        <div className="border-t border-[#EAF2FF] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748B]">{instructions.title}</p>
          <ol className="mt-2 grid list-decimal gap-1 pl-4 text-sm font-semibold leading-6 text-[#475569]">
            {instructions.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
