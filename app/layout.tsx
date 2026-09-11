import type { Metadata, Viewport } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";
import { getSiteUrl } from "@/lib/site-url";
import { ADRECA_COMPLETA, CLUB } from "@/lib/legal";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "CF Juneda — Temporada 26/27",
    template: "%s · CF Juneda",
  },
  description:
    "Web oficial del Club Futbol Juneda: botiga, esdeveniments, socis, plantilla i calendari de lliga 2026/27.",
  alternates: { canonical: "/" },
  keywords: ["CF Juneda", "Club Futbol Juneda", "futbol", "Juneda", "Segona Catalana"],
  authors: [{ name: CLUB.nom }],
  creator: CLUB.nom,
  openGraph: {
    type: "website",
    locale: "ca_ES",
    url: "/",
    siteName: CLUB.nom,
    title: "CF Juneda — Temporada 26/27",
    description: "Botiga, esdeveniments, socis, plantilla i calendari oficial del CF Juneda.",
    images: [{ url: "/data/Logo_cutout.png", alt: "Escut del Club Futbol Juneda" }],
  },
  twitter: {
    card: "summary",
    title: "CF Juneda — Temporada 26/27",
    description: "Web oficial del Club Futbol Juneda.",
    images: ["/data/Logo_cutout.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0B",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: CLUB.nom,
    url: getSiteUrl(),
    logo: `${getSiteUrl()}/data/Logo_cutout.png`,
    email: CLUB.email,
    address: ADRECA_COMPLETA,
    sport: "Football",
  };

  return (
    <html lang="ca">
      <body className={`${syne.variable} ${inter.variable}`}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
