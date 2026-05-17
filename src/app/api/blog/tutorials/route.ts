import { NextResponse } from "next/server";
import { tutorialsByProductId } from "@/lib/db/queries";

const BLOG_BASE = "https://www.mechatronicstore.cl/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/blog/tutorials?product_id=D-517[&limit=5]
 *
 * Endpoint público para reverse interlinking: el WP plugin
 * mecha-blog-tutorials consulta este endpoint desde cada página de
 * producto de la tienda y renderiza "Tutoriales con este producto".
 *
 * Respuesta:
 *   { product_id, count, tutorials: [{slug,url,title,subtitle,hero_image_url,...}] }
 *
 * Cache: 30min en CDN (s-maxage) + 1h SWR. WP plugin tiene su propio
 * cache de 6h via wp_transient — esta doble capa absorbe spikes de
 * tráfico en la tienda sin martillar Turso.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");

  if (!productId) {
    return NextResponse.json(
      { error: "missing_product_id", detail: "?product_id=X required" },
      { status: 400 },
    );
  }

  // Sanitización básica: SKUs son alfanuméricos + dash + guión bajo,
  // longitud razonable (los SKUs de Mechatronicstore son tipo "D-517", "B-450V1").
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(productId)) {
    return NextResponse.json(
      { error: "invalid_product_id" },
      { status: 400 },
    );
  }

  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "5", 10) || 5,
    20,
  );

  let tutorials;
  try {
    tutorials = await tutorialsByProductId(productId, limit);
  } catch (err) {
    console.error("tutorialsByProductId failed:", err);
    return NextResponse.json(
      { error: "query_failed" },
      { status: 500 },
    );
  }

  const payload = {
    product_id: productId,
    count: tutorials.length,
    tutorials: tutorials.map((t) => ({
      slug: t.slug,
      url: `${BLOG_BASE}/${t.slug}`,
      title: t.title_es,
      subtitle: t.subtitle_es,
      hero_image_url: t.hero_image_url,
      published_at: t.published_at,
      category: t.category,
    })),
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control":
        "public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
