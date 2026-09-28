/** Canonical origin, shared by metadata, robots, sitemap and structured data. */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const siteName = "Valence";
export const siteTagline = "Free USNCO practice with every past exam question";
