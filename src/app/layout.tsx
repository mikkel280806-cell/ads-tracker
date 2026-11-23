import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flake — E-commerce Shops & Meta Ad Intelligence",
  description:
    "Track danske og amerikanske e-commerce shops, live Meta Ad Library annoncer, pixels, Shopify apps, produkter, landing pages, hooks og ad copy.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flake",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32.png",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(max-width: 1023px)", color: "#ffffff" },
    { media: "(min-width: 1024px)", color: "#05060B" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="da"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh overflow-x-clip bg-[#F7F8FB] text-[#0F172A] antialiased selection:bg-[#0027eb]/15 selection:text-[#0027eb] lg:bg-[#05060B]">
        {children}
      </body>
    </html>
  );
}
