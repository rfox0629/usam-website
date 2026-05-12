"use client";

import { useEffect } from "react";

export function PrintFlyerClient({ shouldPrint }: { shouldPrint: boolean }) {
  useEffect(() => {
    if (!shouldPrint) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [shouldPrint]);

  return null;
}
