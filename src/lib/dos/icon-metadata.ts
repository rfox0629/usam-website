import type { Metadata } from "next";

export const dosAppManifest = "/dos.webmanifest";

export const dosAppIcons: Metadata["icons"] = {
  apple: [
    {
      sizes: "180x180",
      type: "image/png",
      url: "/apple-touch-icon.png",
    },
  ],
  icon: [
    {
      sizes: "any",
      url: "/favicon.ico",
    },
    {
      sizes: "48x48",
      type: "image/png",
      url: "/favicon-48x48.png",
    },
    {
      sizes: "32x32",
      type: "image/png",
      url: "/favicon-32x32.png",
    },
    {
      sizes: "16x16",
      type: "image/png",
      url: "/favicon-16x16.png",
    },
  ],
};
