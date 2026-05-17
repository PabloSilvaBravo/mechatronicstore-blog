import { NextResponse } from "next/server";
import { getDb, tutorialProductClicks } from "@/lib/db";

const VALID_SOURCES = new Set(["material_list", "buy_all", "inline"]);

interface ClickBody {
  slug: string;
  source: string;
  product_id?: string | null;
  product_name?: string | null;
  ref_url?: string | null;
}

export async function POST(request: Request) {
  let body: ClickBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.slug || typeof body.slug !== "string") {
    return NextResponse.json({ error: "missing_slug" }, { status: 400 });
  }
  if (!body.source || !VALID_SOURCES.has(body.source)) {
    return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  }

  try {
    const db = getDb();
    await db.insert(tutorialProductClicks).values({
      tutorial_slug: body.slug.slice(0, 255),
      source: body.source,
      product_id: body.product_id ? body.product_id.slice(0, 100) : null,
      product_name: body.product_name ? body.product_name.slice(0, 255) : null,
      ref_url: body.ref_url ? body.ref_url.slice(0, 2048) : null,
    });
  } catch (err) {
    // Fire-and-forget: nunca rompemos UX por un fallo de tracking.
    console.error("track/click insert failed:", err);
  }

  // 204 No Content: el cliente usa sendBeacon, no espera body.
  return new NextResponse(null, { status: 204 });
}

export const runtime = "nodejs";
