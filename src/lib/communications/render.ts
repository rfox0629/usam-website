import { getConfiguredSiteUrl } from "@/src/lib/site-url";
import {
  renderEditorialNewsletter,
  type EditorialLinks,
  type EditorialNewsletter,
} from "./newsletter-editorial";
import { renderNewsletterEmail } from "./newsletter-template";
import { septemberNewsletter } from "./september-2026";
import type { CommunicationNewsletter, CommunicationSubscriber } from "./types";

/**
 * One render path for every surface: Operations preview, test send, and the
 * donor broadcast when it is eventually enabled. They must not diverge, or the
 * thing reviewed is not the thing delivered.
 *
 * Issues listed here are hand-built in the locked editorial design system
 * (newsletter-editorial.ts). Everything else falls back to the generic
 * database-driven template, which is still correct for a routine update.
 */
const editorialIssues: Record<
  string,
  (input: { imageBase: string; postalAddress: string | null }) => EditorialNewsletter
> = {
  "q2-q3-2026-field-update": septemberNewsletter,
};

export function isEditorialIssue(slug: string) {
  return Object.hasOwn(editorialIssues, slug);
}

/**
 * A test render must never carry a real subscriber's token: a forwarded test
 * would otherwise let a stranger unsubscribe that person or edit their
 * preferences. Callers pass this instead of a token.
 */
export const PLACEHOLDER_MANAGE_TOKEN = "test-preview";

export function newsletterLinks({
  manageToken,
  siteUrl = getConfiguredSiteUrl(),
  slug,
}: {
  manageToken: string;
  siteUrl?: string;
  slug: string;
}): EditorialLinks {
  return {
    archiveUrl: `${siteUrl}/newsletter/${slug}`,
    preferencesUrl: `${siteUrl}/preferences/${manageToken}`,
    unsubscribeUrl: `${siteUrl}/unsubscribe/${manageToken}`,
  };
}

export type RenderedNewsletter = {
  html: string;
  subject: string;
  text: string;
};

export function renderNewsletter({
  manageToken,
  newsletter,
  postalAddress = null,
  subscriber,
}: {
  manageToken: string;
  newsletter: CommunicationNewsletter;
  /**
   * CAN-SPAM's physical address. Null renders nothing rather than an invented
   * address, in both renderers.
   */
  postalAddress?: string | null;
  subscriber: CommunicationSubscriber;
}): RenderedNewsletter {
  const buildIssue = editorialIssues[newsletter.slug];

  if (buildIssue) {
    const siteUrl = getConfiguredSiteUrl();

    return renderEditorialNewsletter({
      links: newsletterLinks({ manageToken, siteUrl, slug: newsletter.slug }),
      // Photographs are served from the same origin as the links, so a preview
      // deploy shows its own images rather than production's.
      newsletter: buildIssue({ imageBase: siteUrl, postalAddress }),
      recipientFirstName: subscriber.first_name?.trim() || "friend",
    });
  }

  const rendered = renderNewsletterEmail({
    manageToken,
    newsletter,
    postalAddress,
    subscriber,
  });

  return { html: rendered.html, subject: newsletter.subject, text: rendered.text };
}
