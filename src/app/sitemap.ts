import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://webecho.ai";

const publicPages = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "pricing", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "docs", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "login", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "register", priority: 0.5, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map(({ path, priority, changeFrequency }) => ({
    url: path ? `${baseUrl}/${path}` : baseUrl,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
