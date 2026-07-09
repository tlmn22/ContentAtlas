import type { MetadataRoute } from "next";
import { getDb } from "@/lib/supabase";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/hailt`, changeFrequency: "daily", priority: 0.6 },
    { url: `${siteUrl}/suvag`, changeFrequency: "weekly", priority: 0.5 },
  ];

  try {
    const db = getDb();
    const { data: movies } = await db
      .from("movies")
      .select("slug, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    const moviePages: MetadataRoute.Sitemap = (movies ?? []).map((m) => ({
      url: `${siteUrl}/kino/${m.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    return [...staticPages, ...moviePages];
  } catch {
    return staticPages;
  }
}
