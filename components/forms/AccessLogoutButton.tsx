"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const font = { rajdhani: "'Rajdhani', sans-serif" };

export function AccessLogoutButton({
  children = "Log Out",
  className,
  redirectTo,
}: {
  children?: string;
  className?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logOut() {
    setIsLoggingOut(true);

    try {
      await fetch("/api/access/logout", {
        method: "POST",
      });
      router.push(redirectTo ?? "/system?access=1");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <button
      className={className ?? "inline-flex min-h-10 items-center justify-center border border-stone-700 bg-transparent px-4 text-[11px] uppercase tracking-[0.18em] text-stone-300 transition-colors hover:border-[#D4A63D] hover:text-[#F5B942] disabled:cursor-not-allowed disabled:opacity-60"}
      disabled={isLoggingOut}
      onClick={logOut}
      style={{ fontFamily: font.rajdhani, fontWeight: 700 }}
      type="button"
    >
      {isLoggingOut ? "Logging Out" : children}
    </button>
  );
}
