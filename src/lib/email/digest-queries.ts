import { getClient } from "@/lib/db";

export interface DigestTutorialRow {
  slug: string;
  title: string;
  subtitle: string | null;
  hero_image_url: string | null;
  published_at: string;
}

/**
 * Tutoriales publicados en [fromISO, toISO) — formato 'YYYY-MM-DD HH:MM:SS' UTC.
 */
export async function publishedInRange(
  fromISO: string,
  toISO: string,
): Promise<DigestTutorialRow[]> {
  const client = getClient();
  const result = await client.execute({
    sql: `
      SELECT
        slug,
        title_es AS title,
        subtitle_es AS subtitle,
        hero_image_url,
        published_at
      FROM tutorials
      WHERE status = 'published'
        AND published_at >= ?
        AND published_at < ?
      ORDER BY published_at DESC
    `,
    args: [fromISO, toISO],
  });
  return result.rows.map((r) => ({
    slug: String(r.slug),
    title: r.title === null ? "" : String(r.title),
    subtitle: r.subtitle === null ? null : String(r.subtitle),
    hero_image_url:
      r.hero_image_url === null ? null : String(r.hero_image_url),
    published_at: String(r.published_at),
  }));
}

/**
 * Map<tutorial_slug, click_count> en [fromISO, toISO).
 */
export async function clicksPerTutorialInRange(
  fromISO: string,
  toISO: string,
): Promise<Map<string, number>> {
  const client = getClient();
  const result = await client.execute({
    sql: `
      SELECT tutorial_slug AS slug, COUNT(*) AS clicks
      FROM tutorial_product_clicks
      WHERE clicked_at >= ? AND clicked_at < ?
      GROUP BY tutorial_slug
    `,
    args: [fromISO, toISO],
  });
  const map = new Map<string, number>();
  for (const r of result.rows) {
    map.set(String(r.slug), Number(r.clicks));
  }
  return map;
}

/**
 * Top producto clickeado en el rango. Null si no hubo clicks.
 */
export async function topProductInRange(
  fromISO: string,
  toISO: string,
): Promise<{ name: string; clicks: number } | null> {
  const client = getClient();
  const result = await client.execute({
    sql: `
      SELECT MAX(product_name) AS name, COUNT(*) AS clicks
      FROM tutorial_product_clicks
      WHERE product_id IS NOT NULL
        AND clicked_at >= ? AND clicked_at < ?
      GROUP BY product_id
      ORDER BY clicks DESC
      LIMIT 1
    `,
    args: [fromISO, toISO],
  });
  if (result.rows.length === 0) return null;
  return {
    name: result.rows[0].name === null ? "" : String(result.rows[0].name),
    clicks: Number(result.rows[0].clicks),
  };
}
