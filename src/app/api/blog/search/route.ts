import { NextRequest, NextResponse } from "next/server";
import { searchPublishedTutorials } from "@/lib/db/queries";

/**
 * GET /api/blog/search?q={query}
 *
 * Endpoint para live search del SearchBar del header. Devuelve los top
 * 8 resultados con datos mínimos para el dropdown (slug, title,
 * subtitle, hero image, category).
 *
 * Pablo 18-may-2026: search bar pasa a live (dropdown con resultados
 * a medida que escribís). 300ms debounce client-side + cap 8
 * resultados para evitar dropdown gigante.
 *
 * Cache: s-maxage 60s — los resultados pueden cachearse cortos en CDN
 * porque el corpus crece despacio (1 tutorial nuevo cada algunos días).
 * stale-while-revalidate para no penalizar respuesta.
 */
export const runtime = "nodejs"; // libsql necesita Node, no Edge

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json(
      { results: [], count: 0, query: q },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  }

  try {
    const tutorials = await searchPublishedTutorials(q, 8);
    const results = tutorials.map((t) => ({
      slug: t.slug,
      title_es: t.title_es,
      subtitle_es: t.subtitle_es,
      hero_image_url: t.hero_image_url,
      category: t.category,
    }));
    return NextResponse.json(
      { results, count: results.length, query: q },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (e) {
    console.error("[api/blog/search] error", e);
    return NextResponse.json(
      { results: [], count: 0, query: q, error: "search_failed" },
      { status: 500 },
    );
  }
}
