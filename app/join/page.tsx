import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

import { JoinPreviewGate } from "./JoinPreviewGate";
import { UsamApplicationClient } from "./UsamApplicationClient";
import {
  emptyJoinApplicationDraft,
  type JoinApplicationStepId,
} from "@/src/lib/join/application-steps";
import { resolveResumeToken } from "@/src/lib/join/drafts";
import {
  isJoinPreviewDeployment,
  isJoinPreviewGateEnabled,
  isJoinPreviewTokenValid,
  JOIN_PREVIEW_COOKIE_NAME,
} from "@/src/lib/join/preview-access";
import { domainSites } from "@/src/lib/domain-sites";

/**
 * USA-167: /join is the USA Missionaries application.
 *
 * Two things here are load-bearing and were the cause of the P0.
 *
 * 1. `force-dynamic`. The old /join was statically prerendered, so Vercel served
 *    it from cache and ?resume=<token> never reached the server at all. The
 *    token was silently discarded on every device. Rendering at request time is
 *    what lets a resume link do anything.
 * 2. USA Missionaries identity. The old route spread dosAppMetadata, so the tab,
 *    the favicon and the share card all said DOS, and the body rendered the DOS
 *    setup wizard. That wizard now lives at /dos/setup, where it belongs.
 */
export const dynamic = "force-dynamic";

const joinDescription =
  "Apply to serve with USA Missionaries. Tell us your story, your calling, and the ministry you believe God is asking you to begin.";

/*
 * The link preview says what the page says: a shared /join link carries the
 * hero's own words, and opengraph-image.tsx puts them on the card. The `images`
 * key stays out of the openGraph block below — declaring it, even as undefined,
 * suppresses the file convention.
 */
const joinShareTitle = "Welcome to the Team";

export const metadata: Metadata = {
  description: joinDescription,
  openGraph: {
    description: joinDescription,
    siteName: domainSites.usam.siteName,
    title: joinShareTitle,
    type: "website",
  },
  robots: {
    follow: false,
    index: false,
  },
  title: { absolute: "Apply to Become a USA Missionary" },
  twitter: {
    card: "summary_large_image",
    description: joinDescription,
    title: joinShareTitle,
  },
};

// The application is served on the same near-black the rest of USA Missionaries
// uses, so the mobile browser chrome has to match it or the top of the screen
// stays a leftover blue band above a dark page.
export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
};

type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const cookieStore = await cookies();
  const hasPreviewAccess = await isJoinPreviewTokenValid(cookieStore.get(JOIN_PREVIEW_COOKIE_NAME)?.value);

  if (!hasPreviewAccess) {
    return <JoinPreviewGate configured={isJoinPreviewGateEnabled() || !isJoinPreviewDeployment()} />;
  }

  const params = await searchParams;
  const resumeToken = firstValue(params.resume).trim();

  let initialDraft = emptyJoinApplicationDraft();
  let initialStep: JoinApplicationStepId = "start";
  let resumeState: "expired" | "none" | "restored" | "revoked" | "submitted" | "unavailable" = "none";

  if (resumeToken) {
    const lookup = await resolveResumeToken(resumeToken);

    if (lookup.status === "ok") {
      initialDraft = lookup.record.draft;
      initialStep = lookup.record.currentStep;
      resumeState = "restored";
    } else if (lookup.reason === "expired") {
      resumeState = "expired";
    } else if (lookup.reason === "submitted") {
      resumeState = "submitted";
    } else if (lookup.reason === "revoked") {
      resumeState = "revoked";
    } else {
      // A token that resolves to nothing must say so. Rendering the blank first
      // screen is precisely what made the original defect look like a routing
      // bug rather than a missing draft.
      resumeState = "unavailable";
    }
  }

  return (
    <UsamApplicationClient
      initialDraft={initialDraft}
      initialStep={initialStep}
      resumeState={resumeState}
      resumeToken={resumeState === "restored" ? resumeToken : null}
    />
  );
}
