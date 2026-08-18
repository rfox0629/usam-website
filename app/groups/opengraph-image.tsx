import { headers } from "next/headers";
import {
  renderGroupsShareCard,
  resolveShareCardSite,
  shareCardContentType,
  shareCardSize,
} from "./share-card";
import { requestHostname } from "@/src/lib/groups/public-site";

export const runtime = "nodejs";
export const alt = "Discipleship Groups";
export const size = shareCardSize;
export const contentType = shareCardContentType;

export default async function Image() {
  const headersList = await headers();
  const site = await resolveShareCardSite(requestHostname(headersList));

  return renderGroupsShareCard({
    footnote: "Find a group",
    site,
    subtitle: "Find recurring rhythms of prayer, accountability, and community.",
    title: "Discipleship Groups",
  });
}
