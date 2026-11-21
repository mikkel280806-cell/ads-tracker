import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adtrack — E-commerce Ads Library & Brand Tracker",
  description:
    "Dit personlige Trendtrack & Foreplay ad-bibliotek til Instagram, Meta Ad Library og e-commerce konkurrent-analyse.",
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
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0027eb",
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
      className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} h-full`}
    >
      <body className="min-h-full bg-[#08090B] text-[#111318] antialiased selection:bg-[#0027eb]/15 selection:text-[#0027eb]">
        {children}
      </body>
    </html>
  );
}
