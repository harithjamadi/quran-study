import type { MetadataRoute } from "next";
import { SURAHS } from "@/data/surahs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mubin.local";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const root: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/surahs`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/bookmarks`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/settings`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];
  const surahs: MetadataRoute.Sitemap = SURAHS.map((s) => ({
    url: `${SITE}/surah/${s.number}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...root, ...surahs];
}
