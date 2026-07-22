import type { Metadata } from "next";

export const dosAppManifest = "/dos.webmanifest";

const dosIconBasePath = "/favicons/dos";

export const dosAppIcons: Metadata["icons"] = {
  apple: [
    {
      sizes: "180x180",
      type: "image/png",
      url: `${dosIconBasePath}/apple-touch-icon.png`,
    },
  ],
  icon: [
    {
      type: "image/svg+xml",
      url: `${dosIconBasePath}/favicon.svg`,
    },
    {
      sizes: "any",
      url: `${dosIconBasePath}/favicon.ico`,
    },
    {
      sizes: "48x48",
      type: "image/png",
      url: `${dosIconBasePath}/favicon-48x48.png`,
    },
    {
      sizes: "32x32",
      type: "image/png",
      url: `${dosIconBasePath}/favicon-32x32.png`,
    },
    {
      sizes: "16x16",
      type: "image/png",
      url: `${dosIconBasePath}/favicon-16x16.png`,
    },
  ],
};
