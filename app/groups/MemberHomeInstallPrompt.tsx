"use client";

import { useEffect, useMemo, useState } from "react";

type MemberHomeInstallPromptProps = {
  identityId: string;
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

export function MemberHomeInstallPrompt({ identityId }: MemberHomeInstallPromptProps) {
  const [isDismissed, setIsDismissed] = useState(true);
  const [showSteps, setShowSteps] = useState(false);
  const storageKey = `dos-member-home-install-dismissed:${identityId}`;
  const instructions = useMemo(() => {
    if (typeof window === "undefined") {
      return { steps: [], title: "Install" };
    }

    return deviceInstructions(window.navigator.userAgent);
  }, []);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      return;
    }

    setIsDismissed(window.localStorage.getItem(storageKey) === "true");
  }, [storageKey]);

  function dismiss() {
    window.localStorage.setItem(storageKey, "true");
    setIsDismissed(true);
  }

  if (isDismissed) {
    return null;
  }

  return (
    <section className="rounded-lg border border-[#C2A14E]/35 bg-[#171B22] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C56A]">Keep DOS on your phone</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/70">Add it to your Home Screen so you can return each week.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button className="inline-flex min-h-10 items-center justify-center rounded-sm bg-[#C2A14E] px-3 text-xs font-black text-[#080A0D]" onClick={() => setShowSteps((value) => !value)} type="button">
            Show Me How
          </button>
          <button className="inline-flex min-h-10 items-center justify-center rounded-sm border border-white/14 bg-white/[0.04] px-3 text-xs font-black text-white/72" onClick={dismiss} type="button">
            Maybe Later
          </button>
        </div>
      </div>
      {showSteps ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F8C56A]">{instructions.title}</p>
          <ol className="mt-2 grid gap-1 text-sm font-semibold leading-6 text-white/72">
            {instructions.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
