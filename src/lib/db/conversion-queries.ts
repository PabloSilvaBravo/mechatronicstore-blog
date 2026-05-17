import { getClient } from "./index";

export interface TutorialClicks {
  slug: string;
  title: string | null;
  clicks: number;
}

export interface ProductClicks {
  product_id: string;
  product_name: string;
  clicks: number;
}

export interface SourceClicks {
  source: string;
  clicks: number;
}

export interface RawClick {
  id: number;
  tutorial_slug: string;
  product_id: string | null;
  product_name: string | null;
  source: string;
  ref_url: string | null;
  clicked_at: string;
}

/**
 * Top N tutoriales con más clicks en los últimos `daysBack` días.
 * JOIN con tutorials para traer el title_es display-ready.
 */
export async function topTutorialsByClicks(
  daysBack: number,
  limit: number,
): Promise<TutorialClicks[]> {
  const client = getClient();
  const result = await client.execute({
    sql: `
      SELECT
        c.tutorial_slug AS slug,
        t.title_es AS title,
        COUNT(*) AS clicks
      FROM tutorial_product_clicks c
      LEFT JOIN tutorials t ON t.slug = c.tutorial_slug
      WHERE c.clicked_at >= datetime('now', '-' || ? || ' days')
      GROUP BY c.tutorial_slug
      ORDER BY clicks DESC
      LIMIT ?
    `,
    args: [daysBack, limit],
  });
  return result.rows.map((r) => ({
    slug: String(r.slug),
    title: r.title === null ? null : String(r.title),
    clicks: Number(r.clicks),
  }));
}

/**
 * Top N productos clickeados en los últimos `daysBack` días.
 * Excluye source=buy_all (product_id null).
 */
export async function topProductsByClicks(
  daysBack: number,
  limit: number,
): Promise<ProductClicks[]> {
  const client = getClient();
  const result = await client.execute({
    sql: `
      SELECT
        product_id,
        MAX(product_name) AS product_name,
        COUNT(*) AS clicks
      FROM tutorial_product_clicks
      WHERE product_id IS NOT NULL
        AND clicked_at >= datetime('now', '-' || ? || ' days')
      GROUP BY product_id
      ORDER BY clicks DESC
      LIMIT ?
    `,
    args: [daysBack, limit],
  });
  return result.rows.map((r) => ({
    product_id: String(r.product_id),
    product_name: r.product_name === null ? "" : String(r.product_name),
    clicks: Number(r.clicks),
  }));
}

/**
 * Distribución de clicks por source (material_list vs buy_all vs inline).
 */
export async function clicksBySource(
  daysBack: number,
): Promise<SourceClicks[]> {
  const client = getClient();
  const result = await client.execute({
    sql: `
      SELECT source, COUNT(*) AS clicks
      FROM tutorial_product_clicks
      WHERE clicked_at >= datetime('now', '-' || ? || ' days')
      GROUP BY source
      ORDER BY clicks DESC
    `,
    args: [daysBack],
  });
  return result.rows.map((r) => ({
    source: String(r.source),
    clicks: Number(r.clicks),
  }));
}

/**
 * Últimos N clicks raw para feed en admin (debug + spot-check).
 */
export async function recentClicks(limit: number): Promise<RawClick[]> {
  const client = getClient();
  const result = await client.execute({
    sql: `
      SELECT id, tutorial_slug, product_id, product_name, source, ref_url, clicked_at
      FROM tutorial_product_clicks
      ORDER BY clicked_at DESC
      LIMIT ?
    `,
    args: [limit],
  });
  return result.rows.map((r) => ({
    id: Number(r.id),
    tutorial_slug: String(r.tutorial_slug),
    product_id: r.product_id === null ? null : String(r.product_id),
    product_name: r.product_name === null ? null : String(r.product_name),
    source: String(r.source),
    ref_url: r.ref_url === null ? null : String(r.ref_url),
    clicked_at: String(r.clicked_at),
  }));
}

/**
 * Total clicks en un rango (helper para weekly digest).
 */
export async function totalClicksBetween(
  fromISO: string,
  toISO: string,
): Promise<number> {
  const client = getClient();
  const result = await client.execute({
    sql: `
      SELECT COUNT(*) AS total
      FROM tutorial_product_clicks
      WHERE clicked_at >= ? AND clicked_at < ?
    `,
    args: [fromISO, toISO],
  });
  if (result.rows.length === 0) return 0;
  return Number(result.rows[0].total);
}
