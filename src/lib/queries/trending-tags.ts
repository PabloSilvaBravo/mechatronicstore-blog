import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export interface Tag {
  slug: string;
  name: string;
  count: number;
}

export interface FeaturedTutorial {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  category: string;
}

/**
 * Devuelve los top N tags más usados across tutoriales published,
 * extraídos de la columna `tags_json` (JSON array) via json_each.
 * Slug derivado del tag lowercase + dashes.
 */
export async function getTopBlogTags(limit = 20): Promise<Tag[]> {
  const res = await client.execute({
    sql: `
      SELECT je.value AS name, COUNT(*) AS cnt
        FROM tutorials t, json_each(t.tags_json) je
       WHERE t.status = 'published'
         AND t.tags_json IS NOT NULL
         AND t.tags_json != ''
       GROUP BY je.value
       ORDER BY cnt DESC
       LIMIT ?
    `,
    args: [limit],
  });

  return res.rows.map((r) => {
    const name = String(r.name || "").trim();
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return { slug, name, count: Number(r.cnt) };
  });
}

/**
 * Tutorial más reciente de cada categoría (para mega-menu).
 */
export async function getFeaturedPerCategory(
  cats: readonly string[],
): Promise<Record<string, FeaturedTutorial | null>> {
  const out: Record<string, FeaturedTutorial | null> = {};
  for (const cat of cats) {
    const res = await client.execute({
      sql: `
        SELECT id, slug, title_es AS title, hero_image_url AS image, category
          FROM tutorials
         WHERE status = 'published' AND category = ?
         ORDER BY published_at DESC
         LIMIT 1
      `,
      args: [cat],
    });
    const r = res.rows[0];
    out[cat] = r
      ? {
          id: String(r.id),
          slug: String(r.slug),
          title: String(r.title || ""),
          image: r.image ? String(r.image) : null,
          category: String(r.category),
        }
      : null;
  }
  return out;
}

/**
 * Top N tags por categoría (para mega-menu).
 */
export async function getTagsPerCategory(
  cats: readonly string[],
  perCat = 6,
): Promise<Record<string, Tag[]>> {
  const out: Record<string, Tag[]> = {};
  for (const cat of cats) {
    const res = await client.execute({
      sql: `
        SELECT je.value AS name, COUNT(*) AS cnt
          FROM tutorials t, json_each(t.tags_json) je
         WHERE t.status = 'published' AND t.category = ?
           AND t.tags_json IS NOT NULL
           AND t.tags_json != ''
         GROUP BY je.value
         ORDER BY cnt DESC
         LIMIT ?
      `,
      args: [cat, perCat],
    });
    out[cat] = res.rows.map((r) => {
      const name = String(r.name || "").trim();
      const slug = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return { slug, name, count: Number(r.cnt) };
    });
  }
  return out;
}
