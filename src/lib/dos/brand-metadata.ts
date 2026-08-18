import type { Metadata, Viewport } from "next";
import {
  buildDomainSiteIcons,
  buildDomainSiteMetadata,
  buildDomainSiteViewport,
} from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

const dosSite = domainSites["discipleship-operating-system"];

/**
 * The DOS app and the DOS member surfaces are hosted under usamissionaries.org,
 * so they need a manifest scoped to that path rather than the one served at the
 * root of discipleshipoperatingsystem.com.
 */
export const dosAppManifest = "/favicons/dos/app.webmanifest";

export const dosAppIcons: Metadata["icons"] = buildDomainSiteIcons(dosSite);

/**
 * Full DOS identity for surfaces nested inside the USAM app: DOS titles, DOS
 * description, DOS icon family, DOS social preview. Without this, DOS routes
 * inherit the USAM title template and favicon from the root layout.
 *
 * Canonical URLs stay with the individual pages — this wraps many routes.
 */
export const dosAppMetadata: Metadata = buildDomainSiteMetadata(dosSite, {
  canonical: null,
  manifestPath: dosAppManifest,
  // These routes are served from usamissionaries.org, not the DOS domain, so
  // relative social image URLs must resolve against the host actually serving them.
  metadataBaseOrigin: domainSites.usam.canonicalOrigin,
});

export const dosAppViewport: Viewport = buildDomainSiteViewport(dosSite);
