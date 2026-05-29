import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/clientConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ["", "/locks", "/how-it-works", "/stats"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.8,
  }));
}
