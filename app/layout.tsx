import type { Metadata } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";

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
  title: "CF Juneda — Temporada 26/27",
  description:
    "Club Futbol Juneda — Esdeveniments, botiga oficial i plantilla. Som-hi Rojos!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca">
      <body className={`${syne.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
