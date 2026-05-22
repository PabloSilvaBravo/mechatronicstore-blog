import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedTutorials } from "@/lib/db/queries";
import HeroDecor from "./components/HeroDecor";
import RevealOnScroll from "./components/RevealOnScroll";

// Pablo 20-may-2026 audit SEO: home tenía 0 OG, 0 Twitter, 0 JSON-LD →
// share en redes salía sin preview. Fix con generateMetadata async que
// usa el hero del último tutorial como og:image (siempre actual y
// representativo) + JSON-LD WebSite schema.
const SITE_BASE = "https://www.mechatronicstore.cl";
const FALLBACK_OG_IMAGE = `${SITE_BASE}/blog/logo-mechastore-blog.svg`;
const DESCRIPTION =
  "Tutoriales paso a paso de Arduino, ESP32, Raspberry Pi, robótica e impresión 3D. Código probado, esquemas claros y proyectos completos para makers.";

export async function generateMetadata(): Promise<Metadata> {
  // Intentar usar hero del último tutorial como OG image dinámico
  let ogImage = FALLBACK_OG_IMAGE;
  try {
    const recent = await getPublishedTutorials(1);
    if (recent[0]?.hero_image_url) {
      ogImage = recent[0].hero_image_url;
    }
  } catch {
    // si DB falla, fallback
  }
  return {
    title: "Inicio",
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_BASE}/blog` },
    openGraph: {
      title: "Blog MechatronicStore — Tutoriales de electrónica y mecatrónica",
      description: DESCRIPTION,
      url: `${SITE_BASE}/blog`,
      type: "website",
      siteName: "MechatronicStore Blog",
      locale: "es_CL",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Blog MechatronicStore" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Blog MechatronicStore",
      description: DESCRIPTION,
      images: [ogImage],
    },
  };
}

export const revalidate = 600;

const CATEGORY_LABELS: Record<string, string> = {
  arduino: "Arduino",
  esp32: "ESP32",
  rpi: "Raspberry Pi",
  robotica: "Robótica",
  sensores: "Sensores",
  "3d": "Impresión 3D",
  otros: "Otros",
};

function difficultyLabel(d: string | null): string {
  if (d === "beginner") return "Principiante";
  if (d === "intermediate" || d === "intermedia") return "Intermedio";
  if (d === "advanced") return "Avanzado";
  return d || "";
}

function difficultyColor(d: string | null): string {
  if (d === "beginner") return "var(--brand-yellow)";
  if (d === "intermediate" || d === "intermedia") return "var(--brand-purple-light)";
  if (d === "advanced") return "var(--text-accent)";
  return "var(--text-muted)";
}

function formatPublishedDate(iso: string): string {
  const dateStr = iso.slice(0, 10);
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${months[m - 1]} ${y}`;
}

export default async function BlogHomePage() {
  const tutorials = await getPublishedTutorials(24);

  // JSON-LD @graph profundo — Pablo 21-may-2026 (DEEP-INSPECT store):
  // Match con el schema del store mechatronicstore.cl que tiene
  // @graph con Place + Store + Organization + WebSite + Blog + BlogPostings.
  // GeoCoordinates del local físico en Curicó (Manuel Rodriguez 212).
  const websiteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Place",
        "@id": `${SITE_BASE}/#place`,
        name: "MechatronicStore (local Curicó)",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Manuel Rodriguez 212, local 1",
          addressLocality: "Curicó",
          addressRegion: "Maule",
          addressCountry: "CL",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: -34.9833,
          longitude: -71.2333,
        },
      },
      {
        "@type": ["Store", "Organization"],
        "@id": `${SITE_BASE}/#org`,
        name: "MechatronicStore",
        url: SITE_BASE,
        logo: { "@type": "ImageObject", url: `${SITE_BASE}/blog/logo-mechastore-blog.svg` },
        email: "ventas@mechatronicstore.cl",
        telephone: "+56976167930",
        location: { "@id": `${SITE_BASE}/#place` },
        sameAs: [
          "https://www.instagram.com/mechatronicstore.cl/",
          "https://www.tiktok.com/@mechatronicstore.cl",
          "https://www.youtube.com/channel/UCduHpxJBRrJBa2lgT0NPFbQ",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_BASE}/#website`,
        url: SITE_BASE,
        name: "MechatronicStore",
        inLanguage: "es-CL",
        publisher: { "@id": `${SITE_BASE}/#org` },
      },
      {
        "@type": "Blog",
        "@id": `${SITE_BASE}/blog#blog`,
        name: "Blog MechatronicStore",
        description: DESCRIPTION,
        url: `${SITE_BASE}/blog`,
        inLanguage: "es-CL",
        publisher: { "@id": `${SITE_BASE}/#org` },
        isPartOf: { "@id": `${SITE_BASE}/#website` },
        blogPost: tutorials.slice(0, 12).map((t) => ({
          "@type": "BlogPosting",
          headline: t.title_es,
          url: `${SITE_BASE}/blog/${t.slug}`,
          image: t.hero_image_url || undefined,
          datePublished: t.published_at || undefined,
          inLanguage: "es-CL",
        })),
      },
    ],
  };

  if (tutorials.length === 0) {
    return (
      <div>
        <header className="relative mb-12 fade-in-up py-12">
          <HeroDecor />
          <div
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--brand-yellow)" }}
          >
            Blog · Tutoriales · Maker
          </div>
          <h1
            className="font-headline mb-4 tracking-tight"
            style={{
              fontSize: "clamp(2.25rem, 1.75rem + 3.5vw, 4rem)",
              lineHeight: 1.05,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Electrónica y mecatrónica, explicadas paso a paso.
          </h1>
          <p
            className="subtitle-mono mt-2"
            style={{ maxWidth: "62ch", fontSize: "clamp(1rem, 0.9rem + 0.4vw, 1.1rem)" }}
          >
            Tutoriales con Arduino, ESP32, Raspberry Pi y más. Estamos preparando los primeros.
            <span className="typewriter-caret" aria-hidden />
          </p>
        </header>
        <div
          className="card-luis p-8 text-center"
        >
          <div className="text-4xl mb-3" aria-hidden>🚧</div>
          <h2
            className="font-headline text-2xl mb-2"
            style={{ color: "var(--text)" }}
          >
            Sin tutoriales aún
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            Estamos preparando los primeros tutoriales. Vuelve pronto.
          </p>
        </div>
      </div>
    );
  }

  const [hero, ...rest] = tutorials;
  const featured = rest.slice(0, 2);
  const remaining = rest.slice(2);

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      {/* Masthead con decoración SVG de fondo.
          Pablo 18-may-2026 v4: copy reenfocado al PROPÓSITO REAL del blog
          (educar/compartir conocimiento técnico) y no a la logística de
          la tienda. El visitante del blog NO viene a comprar — viene a
          aprender. Si después aprende y necesita componentes, los va a
          encontrar via los links de cada tutorial. El header (utility
          bar + cart) ya provee el contexto comercial; el hero del blog
          tiene que vender LO QUE VAS A APRENDER. */}
      <header className="relative mb-10 sm:mb-14 py-8 sm:py-12">
        <HeroDecor />
        <div className="relative">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--brand-yellow)" }}
          >
            <span className="live-dot" aria-hidden />
            <span>Blog · Tutoriales · Maker</span>
          </div>
          <h1
            className="font-headline mb-4 tracking-tight"
            style={{
              fontSize: "clamp(2.25rem, 1.75rem + 3.5vw, 4rem)",
              lineHeight: 1.05,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Electrónica y mecatrónica, explicadas paso a paso.
          </h1>
          <p
            className="subtitle-mono mt-2 leading-relaxed"
            style={{ maxWidth: "62ch", fontSize: "clamp(1rem, 0.9rem + 0.4vw, 1.1rem)" }}
          >
            Tutoriales con Arduino, ESP32, Raspberry Pi y más. Cada proyecto
            con código probado, esquemas claros y la lista de materiales.
            <span className="typewriter-caret" aria-hidden />
          </p>
        </div>
      </header>

      {/* HERO tutorial — destacado */}
      <RevealOnScroll>
        <section className="mb-12 sm:mb-16">
          <Link
            href={`/blog/${hero.slug}`}
            className="card-luis group block p-5 sm:p-6"
          >
            <article
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center"
            >
              {hero.hero_image_url && (
                <div
                  className="relative aspect-[16/10] overflow-hidden rounded-xl border order-2 lg:order-1"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <img
                    src={hero.hero_image_url}
                    alt={hero.title_es}
                    className="card-img w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="order-1 lg:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] rounded-sm"
                    style={{
                      backgroundColor: "var(--brand-yellow)",
                      color: "var(--text-on-yellow)",
                    }}
                  >
                    Destacado
                  </span>
                  {hero.category && (
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: "var(--text-accent)" }}
                    >
                      {CATEGORY_LABELS[hero.category] || hero.category}
                    </span>
                  )}
                </div>
                <h2
                  className="font-headline tracking-tight mb-3 group-hover:text-[color:var(--text-accent)] transition-colors"
                  style={{
                    fontSize: "clamp(1.75rem, 1.4rem + 2vw, 2.75rem)",
                    lineHeight: 1.1,
                    color: "var(--text)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {hero.title_es}
                </h2>
                <p
                  className="text-base sm:text-lg leading-relaxed mb-4"
                  style={{ color: "var(--text-muted)" }}
                >
                  {hero.subtitle_es}
                </p>
                <div
                  className="flex items-center gap-4 text-xs"
                  style={{ color: "var(--text-dim)" }}
                >
                  {hero.published_at && <span>{formatPublishedDate(hero.published_at)}</span>}
                  {hero.estimated_time_minutes && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{hero.estimated_time_minutes} min</span>
                    </>
                  )}
                  {hero.difficulty && (
                    <>
                      <span aria-hidden>·</span>
                      <span style={{ color: difficultyColor(hero.difficulty) }}>
                        {difficultyLabel(hero.difficulty)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </article>
          </Link>
        </section>
      </RevealOnScroll>

      {/* Featured (2 next) */}
      {featured.length > 0 && (
        <section
          className="mb-12 sm:mb-16 pt-10 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <RevealOnScroll>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featured.map((t) => (
                <TutorialCard key={t.slug} t={t} variant="feature" />
              ))}
            </div>
          </RevealOnScroll>
        </section>
      )}

      {/* Resto */}
      {remaining.length > 0 && (
        <section
          className="pt-10 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-6"
            style={{ color: "var(--text-dim)" }}
          >
            Más tutoriales
          </h2>
          <RevealOnScroll>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remaining.map((t) => (
                <TutorialCard key={t.slug} t={t} variant="compact" />
              ))}
            </div>
          </RevealOnScroll>
        </section>
      )}
    </div>
  );
}

function TutorialCard({
  t,
  variant,
}: {
  t: Awaited<ReturnType<typeof getPublishedTutorials>>[number];
  variant: "feature" | "compact";
}) {
  return (
    <Link href={`/blog/${t.slug}`} className="card-luis group block p-4">
      <article>
        {t.hero_image_url && (
          <div
            className={`relative overflow-hidden rounded-lg border mb-4 ${
              variant === "feature" ? "aspect-[16/10]" : "aspect-[16/9]"
            }`}
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <img
              src={t.hero_image_url}
              alt={t.title_es}
              className="card-img w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          {t.category && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-accent)" }}
            >
              {CATEGORY_LABELS[t.category] || t.category}
            </span>
          )}
          {t.difficulty && (
            <>
              <span style={{ color: "var(--text-dim)" }} aria-hidden>·</span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: difficultyColor(t.difficulty) }}
              >
                {difficultyLabel(t.difficulty)}
              </span>
            </>
          )}
        </div>
        <h3
          className={`font-headline leading-tight mb-2 group-hover:text-[color:var(--text-accent)] transition-colors ${
            variant === "feature" ? "text-2xl" : "text-lg"
          }`}
          style={{
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {t.title_es}
        </h3>
        <p
          className={`leading-snug line-clamp-2 ${variant === "feature" ? "text-base" : "text-sm"}`}
          style={{ color: "var(--text-muted)" }}
        >
          {t.subtitle_es}
        </p>
        {(t.published_at || t.estimated_time_minutes) && (
          <div
            className="flex items-center gap-3 mt-3 text-[11px]"
            style={{ color: "var(--text-dim)" }}
          >
            {t.published_at && <span>{formatPublishedDate(t.published_at)}</span>}
            {t.estimated_time_minutes && (
              <>
                <span aria-hidden>·</span>
                <span>{t.estimated_time_minutes} min</span>
              </>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
