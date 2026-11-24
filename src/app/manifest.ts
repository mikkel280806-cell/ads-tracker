import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flake — E-commerce Shops & Meta Ad Intelligence",
    short_name: "Flake",
    description:
      "Track danske og amerikanske e-commerce shops, live Meta Ad Library annoncer, pixels, Shopify apps, produkter, landing pages og hooks.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f8fb",
    theme_color: "#f7f8fb",
    categories: ["business", "productivity", "marketing"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
