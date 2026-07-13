"use client";

import { ArrowLeft } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

function cleanWorkspaceParam(value: string | null) {
  const workspace = value?.trim();

  return workspace && /^[a-z0-9][a-z0-9-]{1,120}$/i.test(workspace) ? workspace : null;
}

function backToLibraryFallbackHref(workspace: string | null) {
  const query = new URLSearchParams({ view: "library" });

  if (workspace) {
    query.set("workspace", workspace);

    return `/dos/${encodeURIComponent(workspace)}?${query.toString()}`;
  }

  return `/dos?${query.toString()}`;
}

function hasUsableDosHistory() {
  if (typeof window === "undefined" || !document.referrer || window.history.length <= 1) {
    return false;
  }

  try {
    const referrerUrl = new URL(document.referrer);

    return referrerUrl.origin === window.location.origin && referrerUrl.pathname.startsWith("/dos");
  } catch {
    return false;
  }
}

export function GuideBackToLibraryButton() {
  const [fallbackHref, setFallbackHref] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workspace = cleanWorkspaceParam(params.get("workspace"));
    const hasDosContext = params.get("from") === "dos-library" || params.get("source") === "dos-library" || Boolean(workspace);

    setFallbackHref(hasDosContext ? backToLibraryFallbackHref(workspace) : null);
  }, []);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!hasUsableDosHistory()) {
      return;
    }

    event.preventDefault();
    window.history.back();
  }

  if (!fallbackHref) {
    return null;
  }

  return (
    <a
      className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-[#BFDBFE] bg-white/90 px-4 text-sm font-bold text-[#0F172A] shadow-[0_10px_28px_rgba(37,99,235,0.06)] transition-colors hover:bg-white"
      href={fallbackHref}
      onClick={handleClick}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" strokeWidth={1.8} />
      Back to Library
    </a>
  );
}
