import { eq, desc, and } from "drizzle-orm";
import { getDb, tutorials } from "@/lib/db";

export interface TutorialPublished {
  id: string;
  slug: string;
  source_id: string;
  source_url: string;
  source_name?: string;
  title_es: string;
  subtitle_es: string;
  body_es: string;
  hero_image_url: string | null;
  category: string | null;
  difficulty: string | null;
  estimated_time_minutes: number | null;
  estimated_cost_clp: number | null;
  materials_list: Array<{ name: string; qty?: number; role?: string }>;
  steps: Array<{ position: number; name: string; text: string; image_url?: string }>;
  code_blocks: Array<{ lang: string; caption?: string; code: string }>;
  linked_products: Array<{
    name_original: string;
    product_id: number;
    product_url: string;
    price_clp: number;
    stock_available: boolean;
    match_score: number;
  }>;
  github_url: string | null;
  download_urls: Array<{ label: string; url: string; kind: string }>;
  tags: string[];
  published_at: string;
  combined_score: number;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToTutorial(r: typeof tutorials.$inferSelect): TutorialPublished {
  return {
    id: r.id,
    slug: r.slug,
    source_id: r.source_id,
    source_url: r.source_url,
    title_es: r.title_es || "",
    subtitle_es: r.subtitle_es || "",
    body_es: r.body_es || "",
    hero_image_url: r.hero_image_url,
    category: r.category,
    difficulty: r.difficulty,
    estimated_time_minutes: r.estimated_time_minutes,
    estimated_cost_clp: r.estimated_cost_clp,
    materials_list: parseJson(r.materials_list_json, []),
    steps: parseJson(r.steps_json, []),
    code_blocks: parseJson(r.code_blocks_json, []),
    linked_products: parseJson(r.linked_products_json, []),
    github_url: r.github_url,
    download_urls: parseJson(r.download_urls_json, []),
    tags: parseJson(r.tags_json, []),
    published_at: r.published_at || "",
    combined_score: r.combined_score || 0,
  };
}

export async function getTutorialBySlug(slug: string): Promise<TutorialPublished | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(tutorials)
    .where(and(eq(tutorials.slug, slug), eq(tutorials.status, "published")))
    .limit(1);

  if (rows.length === 0) return null;
  return rowToTutorial(rows[0]);
}

export async function getPublishedTutorials(
  limit = 20,
  category?: string,
): Promise<TutorialPublished[]> {
  const db = getDb();
  const where = category
    ? and(eq(tutorials.status, "published"), eq(tutorials.category, category))
    : eq(tutorials.status, "published");

  const rows = await db
    .select()
    .from(tutorials)
    .where(where)
    .orderBy(desc(tutorials.published_at))
    .limit(limit);

  return rows.map(rowToTutorial);
}
