import type { Metadata } from "next";
import { Oswald, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://forgeva.com"),
  title: {
    default: "The Forge | Building Boys Into Faithful Men",
    template: "%s | The Forge",
  },
  description:
    "A Christian brotherhood helping boys ages 9–16 grow in faith, fitness, character, and resilience.",
  icons: {
    icon: "/images/forge-crest.png",
    shortcut: "/images/forge-crest.png",
  },
  openGraph: {
    type: "website",
    title: "The Forge | Building Boys Into Faithful Men",
    description:
      "Faith. Fitness. Fellowship. Fun. A brotherhood rooted in God's Word and forged through challenge.",
    url: "https://forgeva.com",
    siteName: "The Forge",
    images: [{ url: "/og.png", width: 1729, height: 910, alt: "The Forge — Building boys into faithful men" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Forge | Building Boys Into Faithful Men",
    description: "Faith. Fitness. Fellowship. Fun.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
