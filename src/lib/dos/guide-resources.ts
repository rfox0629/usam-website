import { getDosResourceByTitle, getDosResourcesByCategory } from "@/src/lib/dos/resource-catalog";

export type DosGuideResource = {
  description: string;
  href: string;
  title: string;
};

export type DosConversationFlowResource = DosGuideResource & {
  pdfLabel: string;
};

export const dosTableTeachingResources = getDosResourcesByCategory("Table Teachings").map((resource) => ({
  description: resource.description,
  href: resource.path,
  pdfLabel: "Open PDF",
  title: resource.title,
})) satisfies readonly DosConversationFlowResource[];

export const dosFollowUpGuideResources = getDosResourcesByCategory("Commands of Jesus").map((resource) => ({
  description: resource.description,
  href: resource.path,
  title: resource.title,
})) satisfies readonly DosGuideResource[];

export const dosGuideResources = [
  ...dosTableTeachingResources.map((resource) => ({
    description: resource.title === "Kitchen Table Gospel"
      ? "A simple guide for presenting the Gospel around the table."
      : resource.description,
    href: resource.href,
    title: resource.title,
  })),
  ...dosFollowUpGuideResources,
] satisfies readonly DosGuideResource[];

export function getDosGuideResourceByTitle(title: string | null | undefined) {
  const resource = getDosResourceByTitle(title);

  if (!resource) {
    return null;
  }

  return {
    description: resource.description,
    href: resource.path,
    title: resource.title,
  } satisfies DosGuideResource;
}
