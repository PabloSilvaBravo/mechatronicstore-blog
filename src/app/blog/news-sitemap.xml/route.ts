import { NextResponse } from "next/server";
import { getPublishedTutorials } from "@/lib/db/queries";

// Pablo 21-may-2026 Tier A: Google News sitemap.
// Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap
// Solo incluye URLs publicadas en los últimos 2 días (regla News). El
// resto del catálogo va por sitemap.xml regular.

const BASE_URL = "https://www.mechatronicstore.cl";
const SITE_NAME = "Blog MechatronicStore";
export const revalidate = 600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // Fetch generoso; filtramos por fecha en JS (≤ 2 días).
  const recent = await getPublishedTutorials(50);
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const fresh = recent.filter((t) => {
    if (!t.published_at) return false;
    return new Date(t.published_at).getTime() >= cutoff;
  });

  const items = fresh
    .map((t) => {
      const url = `${BASE_URL}/blog/${t.slug}`;
      const pubISO = new Date(t.published_at).toISOString();
      const keywords = (t.tags || []).slice(0, 10).join(", ");
      return `  <url>
    <loc>${escapeXml(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_NAME)}</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${pubISO}</news:publication_date>
      <news:title>${escapeXml(t.title_es || "")}</news:title>
      ${keywords ? `<news:keywords>${escapeXml(keywords)}</news:keywords>` : ""}
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${items}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
