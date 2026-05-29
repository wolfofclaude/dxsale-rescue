import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/clientConfig";

// Explicitly welcome crawlers AND AI agents (ClaudeBot, GPTBot, PerplexityBot,
// Google-Extended, etc. all match "*"). Nothing here is private.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
