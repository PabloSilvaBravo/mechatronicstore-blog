import Link from "next/link";
import type { Metadata } from "next";
import {
  getPublishedTutorials,
  searchPublishedTutorials,
} from "@/lib/db/queries";
import HeroDecor from "../components/HeroDecor";
import RevealOnScroll from "../components/RevealOnScroll";
import ImageWithSkeleton from "../components/ImageWithSkeleton";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

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

// Pablo 20-may-2026 audit SEO: agregar OG + Twitter con hero del primer
// tutorial publicado.
const SITE_BASE = "https://www.mechatronicstore.cl";
const FALLBACK_OG_IMAGE = `${SITE_BASE}/blog/logo-mechastore-blog.svg`;
const PAGE_DESCRIPTION =
  "Catálogo completo de tutoriales del Blog MechatronicStore. Búsqueda y filtrado por categoría.";

export async function generateMetadata(): Promise<Metadata> {
  let ogImage = FALLBACK_OG_IMAGE;
  try {
    const recent = await getPublishedTutorials(1);
    if (recent[0]?.hero_image_url) ogImage = recent[0].hero_image_url;
  } catch {}
  const url = `${SITE_BASE}/blog/tutoriales`;
  return {
    title: "Todos los tutoriales",
    description: PAGE_DESCRIPTION,
    alternates: { canonical: url },
    openGraph: {
      title: "Todos los tutoriales · Blog MechatronicStore",
      description: PAGE_DESCRIPTION,
      url,
      type: "website",
      siteName: "MechatronicStore Blog",
      locale: "es_CL",
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Catálogo de tutoriales" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Todos los tutoriales · Blog MechatronicStore",
      description: PAGE_DESCRIPTION,
      images: [ogImage],
    },
  };
}

export const revalidate = 600;

export default async function TutorialesIndexPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q || "").trim();
  const tutorials = query
    ? await searchPublishedTutorials(query, 100)
    : await getPublishedTutorials(100);

  return (
    <div className="fade-in-up">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs uppercase tracking-[0.12em]"
        style={{ color: "var(--text-dim)" }}
      >
        <Link href="/blog" className="underlink">Blog</Link>
        <span className="mx-2" aria-hidden>›</span>
        <span style={{ color: "var(--text-muted)" }}>Tutoriales</span>
      </nav>

      {/* Hero header con HeroDecor + H1 gradient block */}
      <header className="relative mb-10 -mx-4 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-14">
        <HeroDecor />
        <div className="relative">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--brand-yellow)" }}
          >
            {query ? "Búsqueda" : "Catálogo completo"}
          </div>
          <h1
            className="font-headline mb-4 tracking-tight"
            style={{
              fontSize: "clamp(2rem, 1.5rem + 3vw, 3.25rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            <span className="h1-gradient-block">
              {query ? `Resultados: "${query}"` : "Todos los tutoriales"}
            </span>
          </h1>
          <p
            className="subtitle-mono with-caret mt-4"
            style={{ maxWidth: "60ch" }}
          >
            {query
              ? `${tutorials.length} ${tutorials.length === 1 ? "tutorial encontrado" : "tutoriales encontrados"}.`
              : `${tutorials.length} ${tutorials.length === 1 ? "tutorial publicado" : "tutoriales publicados"}.`}
          </p>
        </div>
      </header>

      {tutorials.length === 0 ? (
        <div className="card-luis p-10 text-center">
          <div className="text-4xl mb-3" aria-hidden>🔍</div>
          <h2
            className="font-headline text-xl mb-2"
            style={{ color: "var(--text)" }}
          >
            Sin resultados
          </h2>
          <p style={{ color: "var(--text-muted)" }}>
            No encontramos tutoriales con &quot;{query}&quot;. Probá con otra palabra
            o vé al{" "}
            <Link href="/blog/tutoriales" className="underlink font-semibold" style={{ color: "var(--text-accent)" }}>
              catálogo completo
            </Link>
            .
          </p>
        </div>
      ) : (
        <RevealOnScroll>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((t) => (
              <li key={t.slug}>
                <Link href={`/blog/${t.slug}`} className="card-luis group block">
                  {t.hero_image_url && (
                    <ImageWithSkeleton
                      src={t.hero_image_url}
                      alt={t.title_es}
                      className="card-img w-full h-44"
                    />
                  )}
                  <div className="p-4">
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
                    <h2
                      className="font-headline font-bold leading-tight mb-2 line-clamp-2 group-hover:text-[color:var(--text-accent)] transition-colors"
                      style={{ color: "var(--text)" }}
                    >
                      {t.title_es}
                    </h2>
                    <p
                      className="text-sm line-clamp-2 mb-2"
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
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </RevealOnScroll>
      )}
    </div>
  );
}
