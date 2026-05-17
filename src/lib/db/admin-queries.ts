import { desc, eq, sql } from "drizzle-orm";
import { getDb, tutorials, sources } from "@/lib/db";

export interface AdminStats {
  by_status: Record<string, number>;
  by_category: Array<{ category: string; n: number }>;
  by_source: Array<{ source_id: string; n: number }>;
  total: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = getDb();
  const statusRows = await db
    .select({ status: tutorials.status, n: sql<number>`COUNT(*)` })
    .from(tutorials)
    .groupBy(tutorials.status);

  const categoryRows = await db
    .select({ category: tutorials.category, n: sql<number>`COUNT(*)` })
    .from(tutorials)
    .where(eq(tutorials.status, "published"))
    .groupBy(tutorials.category);

  const sourceRows = await db
    .select({ source_id: tutorials.source_id, n: sql<number>`COUNT(*)` })
    .from(tutorials)
    .groupBy(tutorials.source_id);

  const totalRow = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(tutorials);

  return {
    by_status: Object.fromEntries(statusRows.map((r) => [r.status, Number(r.n)])),
    by_category: categoryRows
      .filter((r) => r.category)
      .map((r) => ({ category: r.category as string, n: Number(r.n) }))
      .sort((a, b) => b.n - a.n),
    by_source: sourceRows
      .map((r) => ({ source_id: r.source_id, n: Number(r.n) }))
      .sort((a, b) => b.n - a.n),
    total: Number(totalRow[0]?.n || 0),
  };
}

export interface AdminTutorialRow {
  id: string;
  slug: string;
  status: string;
  title: string;
  source_id: string;
  category: string | null;
  combined_score: number | null;
  ingested_at: string;
  ranked_at: string | null;
  published_at: string | null;
  rejected_reason: string | null;
}

export async function listTutorials(
  status?: string,
  limit = 50,
  offset = 0,
): Promise<AdminTutorialRow[]> {
  const db = getDb();
  const where = status ? eq(tutorials.status, status) : undefined;
  const rows = await db
    .select({
      id: tutorials.id,
      slug: tutorials.slug,
      status: tutorials.status,
      title_es: tutorials.title_es,
      title_en: tutorials.title_en,
      source_id: tutorials.source_id,
      category: tutorials.category,
      combined_score: tutorials.combined_score,
      ingested_at: tutorials.ingested_at,
      ranked_at: tutorials.ranked_at,
      published_at: tutorials.published_at,
      rejected_reason: tutorials.rejected_reason,
    })
    .from(tutorials)
    .where(where)
    .orderBy(desc(tutorials.ingested_at))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    status: r.status,
    title: r.title_es || r.title_en || "",
    source_id: r.source_id,
    category: r.category,
    combined_score: r.combined_score,
    ingested_at: r.ingested_at || "",
    ranked_at: r.ranked_at,
    published_at: r.published_at,
    rejected_reason: r.rejected_reason,
  }));
}

export interface AdminSourceRow {
  id: string;
  name: string;
  feed_url: string;
  parser_id: string;
  tier: number;
  is_active: boolean;
  last_polled_at: string | null;
  last_success_at: string | null;
  consecutive_failures: number;
  tutorials_total: number;
  tutorials_published: number;
}

export async function listSources(): Promise<AdminSourceRow[]> {
  const db = getDb();
  const srcRows = await db.select().from(sources);
  const result: AdminSourceRow[] = [];
  for (const s of srcRows) {
    const totalRow = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(tutorials)
      .where(eq(tutorials.source_id, s.id));
    const pubRow = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(tutorials)
      .where(sql`${tutorials.source_id} = ${s.id} AND ${tutorials.status} = 'published'`);
    result.push({
      id: s.id,
      name: s.name,
      feed_url: s.feed_url,
      parser_id: s.parser_id,
      tier: s.tier,
      is_active: Boolean(s.is_active),
      last_polled_at: s.last_polled_at,
      last_success_at: s.last_success_at,
      consecutive_failures: s.consecutive_failures || 0,
      tutorials_total: Number(totalRow[0]?.n || 0),
      tutorials_published: Number(pubRow[0]?.n || 0),
    });
  }
  return result.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}
