import { NextResponse } from "next/server";
import { render } from "@react-email/render";
import WeeklyDigest, {
  type DigestTutorial,
} from "@/lib/email/templates/weekly-digest";
import {
  publishedInRange,
  clicksPerTutorialInRange,
  topProductInRange,
} from "@/lib/email/digest-queries";
import { sendEmail } from "@/lib/email/resend";

function sqliteUtcDateTime(d: Date): string {
  // 'YYYY-MM-DD HH:MM:SS' UTC — formato sqlite consistente con datetime('now')
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Ventana semanal: [hoy_00:00_UTC - 7d, hoy_00:00_UTC).
 * Si el endpoint corre el lunes 11:30 UTC, eso da exactamente los
 * últimos 7 días naturales (lunes pasado 00:00 → lunes hoy 00:00).
 */
function weekRange(): { from: string; to: string } {
  const now = new Date();
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
  );
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from: sqliteUtcDateTime(from), to: sqliteUtcDateTime(to) };
}

export async function POST(request: Request) {
  // Auth: bearer token shared secret
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.DIGEST_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      {
        error: "server_misconfigured",
        detail: "DIGEST_API_TOKEN not set",
      },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { from, to } = weekRange();

  const [tutorials, clicksMap, topProd] = await Promise.all([
    publishedInRange(from, to),
    clicksPerTutorialInRange(from, to),
    topProductInRange(from, to),
  ]);

  const digestTutorials: DigestTutorial[] = tutorials.map((t) => ({
    slug: t.slug,
    title: t.title,
    subtitle: t.subtitle,
    hero_image_url: t.hero_image_url,
    published_at: t.published_at,
    clicks_week: clicksMap.get(t.slug) ?? 0,
  }));

  const totalClicksWeek = Array.from(clicksMap.values()).reduce(
    (s, n) => s + n,
    0,
  );

  const html = await render(
    WeeklyDigest({
      weekStart: from.slice(0, 10),
      weekEnd: to.slice(0, 10),
      tutorials: digestTutorials,
      totalClicksWeek,
      topProductName: topProd?.name ?? null,
      topProductClicks: topProd?.clicks ?? 0,
    }),
  );

  const subject =
    digestTutorials.length > 0
      ? `📚 Blog: ${digestTutorials.length} tutorial${digestTutorials.length === 1 ? "" : "es"} esta semana (${totalClicksWeek} clicks)`
      : `📚 Blog: sin publicaciones esta semana`;

  const toEmail = process.env.DIGEST_TO_EMAIL;
  if (!toEmail) {
    return NextResponse.json(
      {
        error: "server_misconfigured",
        detail: "DIGEST_TO_EMAIL not set",
      },
      { status: 500 },
    );
  }

  try {
    const { id } = await sendEmail({
      to: toEmail,
      subject,
      html,
    });
    return NextResponse.json({
      ok: true,
      resend_id: id,
      published: digestTutorials.length,
      total_clicks_week: totalClicksWeek,
      window: { from, to },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "send_failed", detail: msg },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
