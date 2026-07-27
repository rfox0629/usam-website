import type { Metadata } from "next";
import { buildDomainSiteIcons } from "@/src/lib/domain-metadata";
import { domainSites } from "@/src/lib/domain-sites";

export const dosAppManifest = "/dos.webmanifest";

export const dosAppIcons: Metadata["icons"] = buildDomainSiteIcons(domainSites["discipleship-operating-system"]);
