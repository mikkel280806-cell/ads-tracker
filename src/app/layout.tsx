import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

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
  title: "Adtrack — E-commerce Shops & Meta Ad Intelligence",
  description:
    "Track danske og amerikanske e-commerce shops, live Meta Ad Library annoncer, pixels, Shopify apps, produkter, landing pages, hooks og ad copy.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Adtrack",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
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
  themeColor: "#05060B",
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
      className={`${instrumentSans.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh overflow-x-clip bg-[#F7F8FB] text-[#0F172A] antialiased selection:bg-[#0027eb]/15 selection:text-[#0027eb] lg:bg-[#05060B]">
        {children}
      </body>
    </html>
  );
}
