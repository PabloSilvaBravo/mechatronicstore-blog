import type { MetadataRoute } from "next";
import { getPublishedTutorials } from "@/lib/db/queries";

const BASE_URL = "https://www.mechatronicstore.cl";

/**
 * Sitemap servido en /blog/sitemap.xml — CF Worker ya rutea /blog* a Vercel,
 * no requiere cambios de infra. Solo categorías con ≥1 tutorial publicado
 * aparecen (evita 404s en el sitemap por categorías vacías).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tutorials = await getPublishedTutorials(1000);

  const tutorialEntries: MetadataRoute.Sitemap = tutorials.map((t) => ({
    url: `${BASE_URL}/blog/${t.slug}`,
    lastModified: t.published_at ? new Date(t.published_at) : undefined,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Solo categorías que tienen ≥1 tutorial publicado
  const categoriesInUse = new Set<string>();
  for (const t of tutorials) {
    if (t.category) categoriesInUse.add(t.category);
  }

  const categoryEntries: MetadataRoute.Sitemap = Array.from(categoriesInUse).map(
    (cat) => ({
      url: `${BASE_URL}/blog/categoria/${cat}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );

  const indexEntry: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
  ];

  return [...indexEntry, ...categoryEntries, ...tutorialEntries];
}
