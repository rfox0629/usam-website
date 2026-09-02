/**
 * Remnant canonical content source (USA-153).
 *
 * This is the ONE place a video is added or edited. Both the public USA
 * Missionaries `/remnant` page and the DOS Library "Remnant" collection
 * import from this file. Never copy a record into either surface.
 *
 * How to add the next video:
 *   1. Add one object to `remnantVideos` below with a unique `id`/`slug`.
 *   2. Fill every required field. Do not invent `title`, `speaker`,
 *      `ministry`, dates, or quotes. Confirm them directly from YouTube
 *      (oEmbed and/or an embed check) before publishing.
 *   3. Set `status: "published"` when ready. Both surfaces pick it up
 *      automatically; no other file needs to change.
 *
 * USA-101 migration note: when DOS and the public site separate into
 * independent app workspaces, move `remnantVideos` behind a shared
 * database table, CMS, or content API and keep the exported function
 * signatures (`getRemnantVideos`, `getFeaturedRemnantVideo`,
 * `getRemnantVideoBySlug`) unchanged so neither surface has to change.
 */

export type RemnantVideoStatus = "draft" | "published";

export type RemnantVideo = {
  /** Stable identifier. Do not reuse or repurpose after publishing. */
  id: string;
  slug: string;
  title: string;
  speaker: string;
  /** Ministry, church, or channel the message is published under. */
  ministry?: string;
  youtubeId: string;
  youtubeUrl: string;
  /** Deep-link start time, in seconds, when the relevant message begins mid-service. */
  startTimeSeconds?: number;
  thumbnailUrl: string;
  /** Short description shown on cards. */
  description: string;
  /** Editorial note: why USA Missionaries recommends this specific message. */
  whyWeRecommendIt: string;
  /** Freeform editorial category, e.g. "Discipleship & Obedience". */
  category: string;
  tags?: readonly string[];
  scriptureReferences?: readonly string[];
  featured: boolean;
  /** Lower sorts first. */
  order: number;
  status: RemnantVideoStatus;
};

function youtubeThumbnailUrl(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/**
 * Seed records for the founder-preview MVP. Title/channel metadata verified
 * directly against YouTube (oEmbed + embed check) before publishing.
 */
const remnantVideos: readonly RemnantVideo[] = [
  {
    category: "Discipleship & Obedience",
    description: "A call beyond passive Christian belief into surrender, obedience, and lived discipleship.",
    featured: true,
    id: "francis-chan-most-dangerous-kind-of-christian",
    order: 1,
    slug: "francis-chan-most-dangerous-kind-of-christian",
    speaker: "Francis Chan",
    ministry: "Crazy Love",
    status: "published",
    tags: ["Obedience", "Discipleship", "Surrender"],
    thumbnailUrl: youtubeThumbnailUrl("PLirnAQ-40M"),
    title: "The Most Dangerous Kind of Christian",
    whyWeRecommendIt: "We recommend this message because it calls listeners beyond passive Christian belief into surrender, obedience, and a wholeheartedly lived discipleship. Those are central convictions behind USA Missionaries' work.",
    youtubeId: "PLirnAQ-40M",
    youtubeUrl: "https://www.youtube.com/watch?v=PLirnAQ-40M",
  },
  {
    category: "Evangelism & Mission",
    description: "Bold evangelism and ordinary believers participating in God's mission.",
    featured: false,
    id: "ben-fitzgerald-great-commission",
    order: 2,
    slug: "ben-fitzgerald-great-commission",
    speaker: "Ben Fitzgerald",
    ministry: "Jesus Image",
    startTimeSeconds: 6300,
    status: "published",
    tags: ["Evangelism", "Mission", "Everyday Believers"],
    thumbnailUrl: youtubeThumbnailUrl("ae0RJpCGt4I"),
    title: "The Great Commission | Sunday Night Service",
    whyWeRecommendIt: "We recommend this message because it calls ordinary believers toward bold evangelism and active participation in God's mission, not just spectating it.",
    youtubeId: "ae0RJpCGt4I",
    youtubeUrl: "https://www.youtube.com/watch?v=ae0RJpCGt4I",
  },
  {
    category: "Consecration & Mission",
    description: "A call to consecrated, apostolic living that fixes on the worth of Jesus and His glory among all nations.",
    featured: false,
    id: "dick-brogden-apostolic-nasty",
    order: 3,
    slug: "dick-brogden-apostolic-nasty",
    speaker: "Dick Brogden",
    ministry: "River Valley Church",
    startTimeSeconds: 140,
    status: "published",
    tags: ["Consecration", "Mission", "The Nations"],
    thumbnailUrl: youtubeThumbnailUrl("cq6rx5VUWLE"),
    title: "Apostolic Nasty - Dick Brogden",
    whyWeRecommendIt: "We recommend this message because it presses past comfortable faith into consecrated, apostolic living: a life fixed on the worth of Jesus and His glory among the nations.",
    youtubeId: "cq6rx5VUWLE",
    youtubeUrl: "https://www.youtube.com/watch?v=cq6rx5VUWLE",
  },
] as const;

export const remnantCollection = {
  disclaimer:
    "Recommending a message here is not a blanket endorsement of every teaching, ministry, or position associated with its speaker or organization. Watch with discernment and test everything against Scripture.",
  tagline: "Curated messages for those who want to follow Jesus wholeheartedly.",
  title: "Remnant",
} as const;

export function getRemnantVideos(): RemnantVideo[] {
  return [...remnantVideos]
    .filter((video) => video.status === "published")
    .sort((a, b) => a.order - b.order);
}

export function getFeaturedRemnantVideo(): RemnantVideo | null {
  const published = getRemnantVideos();

  return published.find((video) => video.featured) ?? published[0] ?? null;
}

export function getRemnantVideoBySlug(slug: string | null | undefined): RemnantVideo | null {
  if (!slug) {
    return null;
  }

  return getRemnantVideos().find((video) => video.slug === slug) ?? null;
}

export function remnantWatchUrl(video: RemnantVideo): string {
  if (!video.startTimeSeconds) {
    return video.youtubeUrl;
  }

  const separator = video.youtubeUrl.includes("?") ? "&" : "?";

  return video.youtubeUrl.includes("t=") ? video.youtubeUrl : `${video.youtubeUrl}${separator}t=${video.startTimeSeconds}s`;
}

export function remnantEmbedUrl(video: RemnantVideo): string {
  const params = new URLSearchParams({ autoplay: "1", rel: "0" });

  if (video.startTimeSeconds) {
    params.set("start", String(video.startTimeSeconds));
  }

  return `https://www.youtube-nocookie.com/embed/${video.youtubeId}?${params.toString()}`;
}
