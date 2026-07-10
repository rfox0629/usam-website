import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const appClient = read("app/dos/app/DosMvpAppClient.tsx");
const missionaryApp = read("src/lib/dos/missionary-app.ts");
const reviewRequests = read("src/lib/dos/review-requests.ts");

assert(
  appClient.includes("const reviewRequestReady = meeting.review.status === \"pending\" || Boolean(hasReviewRequestLink);")
    && appClient.includes("reviewDisplayTitle = reviewIsCompleted ? \"Review received\" : reviewRequestReady ? \"Ready\" : \"Not sent\"")
    && appClient.includes("Review link is ready. Send or copy it when you are ready.")
    && appClient.includes("Link ready ${formatDate(readyReviewLink.createdAt)}. Channel: link."),
  "Quick Review link-created state must be labeled Ready, not Sent.",
);

assert(
  !appClient.includes("Delivered"),
  "Quick Review UI must not claim delivery without provider confirmation.",
);

assert(
  !appClient.includes("const reviewRequestSent = meeting.review.status === \"pending\" || Boolean(hasReviewRequestLink);"),
  "Quick Review UI must not use link existence as a sent-status flag.",
);

assert(
  appClient.includes("const reviewActionLabel = meeting.review.status === \"not_sent\" && !hasReviewRequestLink ? \"Send\" : \"Send Again\"")
    && appClient.includes("{reviewActionLabel}")
    && appClient.includes("Copy Review Link")
    && appClient.includes("Open Review Link")
    && appClient.includes("onCopyReviewLink")
    && appClient.includes("onOpenReviewLink"),
  "Quick Review follow-up action must stay retryable and expose Copy/Open for existing links.",
);

assert(
  appClient.includes("function reviewLinkCanBeSent(link: DosAppMeeting[\"reviewLinks\"][number])")
    && appClient.includes("!link.usedAt && !link.submittedAt")
    && appClient.includes("link.status !== \"submitted\" && link.status !== \"expired\""),
  "Client must only reuse unused, non-expired review links.",
);

assert(
  appClient.includes("const reviewSendInFlightRef = useRef<Set<string>>(new Set());")
    && appClient.includes("reviewSendInFlightRef.current.has(sendKey)")
    && appClient.includes("reviewSendInFlightRef.current.add(sendKey)")
    && appClient.includes("reviewSendInFlightRef.current.delete(sendKey)"),
  "Quick Review send/share action must guard duplicate taps.",
);

assert(
  missionaryApp.includes("function reviewLinkIsReusable(link: ReviewLinkRow | null | undefined)")
    && missionaryApp.includes("status: reusableLink ? \"pending\" : \"not_sent\"")
    && missionaryApp.includes("token: reusableLink?.token ?? null")
    && missionaryApp.includes("createdAt: link.created_at ?? null"),
  "Server data loader must not hydrate stale submitted or expired links as active review URLs.",
);

assert(
  reviewRequests.includes("[DOS review send]")
    && reviewRequests.includes("providerRequestStatus: \"not_attempted\"")
    && reviewRequests.includes("providerResponseStatus: \"no_delivery_provider_configured\"")
    && reviewRequests.includes("retryAttempt: event === \"reused\" ? \"reuse_existing_link\" : \"create_link\""),
  "Review-link server path must log truthful provider status without pretending delivery happened.",
);

console.log("DOS review link send-state regression passed.");
