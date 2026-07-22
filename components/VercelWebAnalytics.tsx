"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isPublicAnalyticsPath } from "@/src/lib/analytics";

const sensitiveQueryParamPattern = /(?:access|code|email|key|message|name|phone|prayer|refresh|secret|session|token)/i;

function scrubAnalyticsUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl, window.location.origin);

    if (!isPublicAnalyticsPath(url.pathname)) {
      return null;
    }

    for (const key of Array.from(url.searchParams.keys())) {
      if (sensitiveQueryParamPattern.test(key)) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

function beforeSend(event: BeforeSendEvent) {
  const url = scrubAnalyticsUrl(event.url);

  if (!url) {
    return null;
  }

  return {
    ...event,
    url,
  };
}

export function VercelWebAnalytics() {
  const pathname = usePathname();
  const [shouldRenderAnalytics, setShouldRenderAnalytics] = useState(false);

  useEffect(() => {
    const isLocalhost = ["127.0.0.1", "localhost"].includes(window.location.hostname);

    setShouldRenderAnalytics(!isLocalhost && isPublicAnalyticsPath(pathname));
  }, [pathname]);

  if (!shouldRenderAnalytics) {
    return null;
  }

  return <Analytics beforeSend={beforeSend} />;
}
