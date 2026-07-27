import ecosystemRoutes from "@/src/data/ecosystem-routes.json";

export type EcosystemPage = (typeof ecosystemRoutes.pages)[number];

export const usamCanonicalOrigin = ecosystemRoutes.usamCanonicalOrigin;
export const ecosystemPages = ecosystemRoutes.pages;
export const publicEcosystemPages = ecosystemPages.filter((page) => page.href !== "/");
export const ecosystemNavItems = ecosystemPages;
export const ecosystemPageByKey = Object.fromEntries(
  ecosystemPages.map((page) => [page.key, page]),
) as Record<string, EcosystemPage>;
export const legacySystemRoute = ecosystemRoutes.legacySystem;
export const privateDosRoute = ecosystemRoutes.privateDos;
export const ecosystemExternalDomainRedirects = ecosystemRoutes.externalDomainRedirects;
