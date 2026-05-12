export type DosGuideResource = {
  description: string;
  href: string;
  title: string;
};

export const dosGuideResources = [
  {
    description: "A simple guide for presenting the Gospel around the table.",
    href: "/guides/kitchen-table-gospel.pdf",
    title: "Kitchen Table Gospel",
  },
] as const satisfies readonly DosGuideResource[];

function normalizeGuideTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getDosGuideResourceByTitle(title: string | null | undefined) {
  const normalizedTitle = normalizeGuideTitle(title ?? "");

  return dosGuideResources.find((resource) => normalizeGuideTitle(resource.title) === normalizedTitle) ?? null;
}
