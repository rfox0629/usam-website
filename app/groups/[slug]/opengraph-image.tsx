import { headers } from "next/headers";
import { approvedPublicGroupBySlug, communityCopyFor } from "../community-content";
import {
  renderGroupsShareCard,
  resolveShareCardSite,
  shareCardContentType,
  shareCardSize,
} from "../share-card";
import { loadPublicGroup } from "@/src/lib/public-groups";
import { requestHostname } from "@/src/lib/groups/public-site";

export const runtime = "nodejs";
export const alt = "Discipleship group";
export const size = shareCardSize;
export const contentType = shareCardContentType;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const headersList = await headers();
  const hostname = requestHostname(headersList);
  const [group, site] = await Promise.all([loadPublicGroup(slug, hostname), resolveShareCardSite(hostname)]);

  // The approved list is the same canonical source the group page falls back to,
  // so a card never disagrees with the page it belongs to when the database is
  // unreachable — on preview deploys, for instance.
  const approved = approvedPublicGroupBySlug.get(slug);
  const copy = approved ? communityCopyFor(approved) : null;

  const title = group?.name ?? approved?.name ?? "Discipleship Groups";
  const subtitle =
    group?.tagline
    || group?.description
    || copy?.tagline
    || copy?.description
    || "Find recurring rhythms of prayer, accountability, and community.";
  const footnote = group?.rhythm || approved?.rhythmLabel || "Discipleship Groups";

  return renderGroupsShareCard({ footnote, site, subtitle, title });
}
