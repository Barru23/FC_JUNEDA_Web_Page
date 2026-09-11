import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date("2026-09-11T00:00:00+02:00");
  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/avis-legal`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/privacitat`, lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/condicions-compra`, lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}
