import type { Metadata, Viewport } from "next";
import { dosAppMetadata, dosAppViewport } from "@/src/lib/dos/brand-metadata";
import { dosSupportEmail } from "@/src/lib/dos/access-request-email";
import { DosOnboardingClient } from "./DosOnboardingClient";

// USA-167 moved this wizard off /join. It is DOS workspace setup, so it lives
// on a DOS path and keeps DOS identity. /join is now the USA Missionaries
// application and must not show any of this before acceptance.
//
// USA-289: this page is the DOS access request (individual or organization).
// It records a request for Operations review and creates no account.
export const metadata: Metadata = {
  ...dosAppMetadata,
  description: "Request access to DOS for yourself or your organization. Every request is reviewed before access is set up.",
  title: { absolute: "Request DOS access" },
};

export const viewport: Viewport = dosAppViewport;

export default function DosSetupPage() {
  return <DosOnboardingClient supportEmail={dosSupportEmail()} />;
}
