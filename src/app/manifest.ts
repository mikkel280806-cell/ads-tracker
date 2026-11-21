import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Adtrack — E-commerce Ads & Brand Tracker",
    short_name: "Adtrack",
    description:
      "Din egen Trendtrack & Foreplay til Instagram, Meta Ad Library, shops og konkurrent-overvågning.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#08090B",
    theme_color: "#0027eb",
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
    share_target: {
      action: "/?share=1",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
