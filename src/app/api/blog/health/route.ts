import { NextResponse } from "next/server";
import { getClient } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/blog/health
 *
 * Healthcheck endpoint usado para:
 *   - Verificar que la app está deployada y responde
 *   - Verificar que la conexión a Turso funciona
 *   - Usable por uptime monitors (Cloudflare Health Checks)
 */
export async function GET() {
  const started = Date.now();
  try {
    const r = await getClient().execute("SELECT COUNT(*) AS n FROM tutorials");
    const tutorialCount = Number(r.rows[0]?.n ?? 0);
    return NextResponse.json({
      ok: true,
      service: "mecha-blog",
      version: "0.1.0",
      db: { connected: true, tutorials_count: tutorialCount },
      latency_ms: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        service: "mecha-blog",
        version: "0.1.0",
        error: err instanceof Error ? err.message : String(err),
        latency_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
