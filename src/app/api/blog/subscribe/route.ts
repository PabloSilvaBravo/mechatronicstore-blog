import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getClient, newsletterSubscribers } from "@/lib/db";

// Pablo 21-may-2026 Tier A: signup para weekly digest del blog.
// Guarda email + metadata para detectar bots después si crece spam.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 4096;

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || "blog-newsletter-2026";
  return crypto.createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  // Body size guard
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload demasiado grande" }, { status: 413 });
  }

  let body: { email?: string; source?: string };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const source = (body.source || "footer").slice(0, 32);

  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  // Honeypot-style basic spam check: rechazar dominios obviamente desechables
  const blockedDomains = ["mailinator.com", "guerrillamail.com", "10minutemail.com", "trashmail.com"];
  if (blockedDomains.some((d) => email.endsWith("@" + d))) {
    // Devolvemos 200 silenciosamente para no dar pistas al spammer
    return NextResponse.json({ ok: true });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 256) || null;

  try {
    const client = getClient();
    await client.execute({
      sql: `INSERT INTO newsletter_subscribers (email, source, user_agent, ip_hash)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              source = excluded.source,
              unsubscribed_at = NULL,
              user_agent = excluded.user_agent,
              ip_hash = excluded.ip_hash`,
      args: [email, source, userAgent, hashIp(ip)],
    });
  } catch (e) {
    console.error("[/api/blog/subscribe] DB error:", e);
    return NextResponse.json(
      { error: "Error guardando suscripción" },
      { status: 500 },
    );
  }

  // Tipo unused-but-imported para que tree-shake mantenga schema export
  void newsletterSubscribers;

  return NextResponse.json({ ok: true });
}
