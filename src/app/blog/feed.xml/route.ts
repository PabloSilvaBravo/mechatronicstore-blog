import { NextResponse } from "next/server";
import { getPublishedTutorials } from "@/lib/db/queries";

// Pablo 21-may-2026 Tier A: RSS feed para lectores RSS (Feedly, Inoreader,
// NetNewsWire). Trae visitas recurrentes — usuarios fieles no tienen que
// chequear manualmente. Inspirado en feed.xml de MechaNoticias.
const BASE_URL = "https://www.mechatronicstore.cl";
const SITE_TITLE = "Blog MechatronicStore";
const SITE_DESCRIPTION =
  "Tutoriales de electrónica y mecatrónica, explicados paso a paso. Arduino, ESP32, Raspberry Pi, robótica, sensores e impresión 3D.";

// Cache 1h — los lectores RSS no necesitan respuesta segundo-real.
export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoToRfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

export async function GET() {
  const tutorials = await getPublishedTutorials(40);

  const lastBuildDate = tutorials[0]?.published_at
    ? isoToRfc822(tutorials[0].published_at)
    : new Date().toUTCString();

  const items = tutorials
    .map((t) => {
      const url = `${BASE_URL}/blog/${t.slug}`;
      const pubDate = t.published_at ? isoToRfc822(t.published_at) : lastBuildDate;
      const enclosure = t.hero_image_url
        ? `<enclosure url="${escapeXml(t.hero_image_url)}" type="image/jpeg" length="0"/>`
        : "";
      const categories = (t.tags || [])
        .slice(0, 5)
        .map((tag) => `<category>${escapeXml(tag)}</category>`)
        .join("\n      ");
      return `    <item>
      <title>${escapeXml(t.title_es)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(t.subtitle_es || "")}</description>
      <pubDate>${pubDate}</pubDate>
      ${enclosure}
      ${categories}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <link>${BASE_URL}/blog</link>
    <atom:link href="${BASE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>es-CL</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <generator>Next.js + Turso</generator>
    <image>
      <url>${BASE_URL}/blog/logo-mechastore-blog.svg</url>
      <title>${escapeXml(SITE_TITLE)}</title>
      <link>${BASE_URL}/blog</link>
    </image>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
