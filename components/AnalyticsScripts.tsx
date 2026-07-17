"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  clarityProjectId,
  analyticsCrossDomainHosts,
  gaMeasurementId,
  isClarityAnalyticsPath,
  isAnalyticsEnabled,
  isPublicAnalyticsPath,
  trackPageView,
} from "@/src/lib/analytics";

export function AnalyticsScripts() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPathRef = useRef<string | null>(null);
  const search = searchParams.toString();
  const path = pathname || "/";
  const pagePath = search ? `${path}?${search}` : path;
  const shouldRunGoogleAnalytics = isAnalyticsEnabled() && Boolean(gaMeasurementId) && isPublicAnalyticsPath(pathname);
  const shouldRunClarity = isAnalyticsEnabled() && Boolean(clarityProjectId) && isClarityAnalyticsPath(pathname);

  useEffect(() => {
    if (!shouldRunGoogleAnalytics) {
      return;
    }

    if (lastTrackedPathRef.current === null) {
      lastTrackedPathRef.current = pagePath;
      return;
    }

    if (lastTrackedPathRef.current === pagePath) {
      return;
    }

    lastTrackedPathRef.current = pagePath;
    trackPageView(pagePath);
  }, [pagePath, shouldRunGoogleAnalytics]);

  if (!shouldRunGoogleAnalytics && !shouldRunClarity) {
    return null;
  }

  return (
    <>
      {shouldRunGoogleAnalytics ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
                window.__usamAnalyticsHostname = (window.location.hostname || '').toLowerCase();
                window.__usamAnalyticsBrand = ({
                  'usamissionaries.org': 'usam',
                  'www.usamissionaries.org': 'usam',
                  'kitchentablegospel.org': 'kitchen_table_gospel',
                  'www.kitchentablegospel.org': 'kitchen_table_gospel',
                  'discipleshipoperatingsystem.com': 'dos',
                  'www.discipleshipoperatingsystem.com': 'dos'
                })[window.__usamAnalyticsHostname] || 'usam';
                window.gtag('set', 'linker', { domains: ${JSON.stringify(analyticsCrossDomainHosts)} });
                window.gtag('js', new Date());
                window.gtag('config', ${JSON.stringify(gaMeasurementId)}, {
                  page_location: window.location.href,
                  page_path: window.location.pathname + window.location.search,
                  page_title: document.title,
                  site_brand: window.__usamAnalyticsBrand,
                  site_hostname: window.__usamAnalyticsHostname || 'unknown'
                });
              `,
            }}
            id="ga4-init"
            strategy="afterInteractive"
          />
        </>
      ) : null}

      {shouldRunClarity ? (
        <Script
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", ${JSON.stringify(clarityProjectId)});
            `,
          }}
          id="clarity-init"
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
