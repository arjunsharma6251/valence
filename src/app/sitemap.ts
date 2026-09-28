import type { MetadataRoute } from "next";
import { topics } from "@/lib/content";
import { siteUrl } from "@/lib/site";

/**
 * Pages we want indexed: the app's own surfaces and the topic guides.
 * Individual question pages are deliberately left out — they reproduce ACS
 * exam content, so they stay crawlable but are not actively submitted while
 * the permission request is outstanding.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const core: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/topics", priority: 0.9, changeFrequency: "monthly" },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" },
    { path: "/practice", priority: 0.7, changeFrequency: "weekly" },
    { path: "/part2", priority: 0.7, changeFrequency: "monthly" },
    { path: "/mock", priority: 0.6, changeFrequency: "monthly" },
    { path: "/review", priority: 0.4, changeFrequency: "monthly" },
    { path: "/search", priority: 0.3, changeFrequency: "monthly" },
    { path: "/feedback", priority: 0.2, changeFrequency: "yearly" },
  ];
  return [
    ...core.map((c) => ({ url: `${siteUrl}${c.path}`, lastModified: now, changeFrequency: c.changeFrequency, priority: c.priority })),
    ...topics.map((t) => ({ url: `${siteUrl}/topics/${t.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
