import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedTutorials } from "@/lib/db/queries";
import HeroDecor from "../../components/HeroDecor";
import RevealOnScroll from "../../components/RevealOnScroll";

interface Props {
  params: Promise<{ cat: string }>;
}

const BASE_URL = "https://www.mechatronicstore.cl";

const CATEGORIES: Record<
  string,
  { label: string; description: string; icon: string }
> = {
  arduino: {
    label: "Arduino",
    description: "Tutoriales con placas Arduino",
    icon: "🔌",
  },
  esp32: {
    label: "ESP32",
    description: "Tutoriales con ESP32 y derivados",
    icon: "📡",
  },
  rpi: {
    label: "Raspberry Pi",
    description: "Tutoriales con Raspberry Pi",
    icon: "🍓",
  },
  robotica: {
    label: "Robótica",
    description: "Robots y mecatrónica",
    icon: "🤖",
  },
  sensores: {
    label: "Sensores",
    description: "Sensores y actuadores",
    icon: "📊",
  },
  "3d": {
    label: "Impresión 3D",
    description: "Impresión 3D y modelado",
    icon: "🖨️",
  },
  otros: { label: "Otros", description: "Otros tutoriales", icon: "⚙️" },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cat } = await params;
  const meta = CATEGORIES[cat];
  if (!meta) return { title: "Categoría no encontrada" };
  const url = `${BASE_URL}/blog/categoria/${cat}`;
  return {
    title: `Tutoriales de ${meta.label}`,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      title: `Tutoriales de ${meta.label}`,
      url,
      type: "website",
      siteName: "MechatronicStore Blog",
      locale: "es_CL",
    },
  };
}

export const revalidate = 3600;

export default async function CategoryPage({ params }: Props) {
  const { cat } = await params;
  const meta = CATEGORIES[cat];
  if (!meta) notFound();

  const tutorials = await getPublishedTutorials(50, cat);

  return (
    <div className="fade-in-up">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs uppercase tracking-[0.12em]"
        style={{ color: "var(--text-dim)" }}
      >
        <Link href="/blog" className="underlink">
          Blog
        </Link>
        <span className="mx-2" aria-hidden>›</span>
        <span style={{ color: "var(--text-muted)" }}>{meta.label}</span>
      </nav>

      {/* Hero header con decoración */}
      <header className="relative mb-10 -mx-4 px-4 py-8 sm:-mx-6 sm:px-6 sm:py-12">
        <HeroDecor />
        <div className="relative">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--brand-yellow)" }}
          >
            <span aria-hidden className="text-base">
              {meta.icon}
            </span>
            <span>Categoría</span>
          </div>
          <h1
            className="font-headline mb-3 tracking-tight"
            style={{
              fontSize: "clamp(2rem, 1.5rem + 3vw, 3.5rem)",
              lineHeight: 1.05,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            Tutoriales de {meta.label}
          </h1>
          <p
            className="text-lg sm:text-xl"
            style={{ color: "var(--text-muted)", maxWidth: "60ch" }}
          >
            {meta.description}.
          </p>
        </div>
      </header>

      {tutorials.length === 0 ? (
        <div className="card-luis p-8 text-center">
          <div className="text-4xl mb-3" aria-hidden>
            🚧
          </div>
          <p style={{ color: "var(--text-muted)" }}>
            Sin tutoriales en esta categoría todavía.
          </p>
        </div>
      ) : (
        <RevealOnScroll>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((t) => (
              <li key={t.slug}>
                <Link href={`/blog/${t.slug}`} className="card-luis group block">
                  {t.hero_image_url && (
                    <img
                      src={t.hero_image_url}
                      alt={t.title_es}
                      className="card-img w-full h-44 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h2
                      className="font-headline font-bold leading-tight mb-1 line-clamp-2 group-hover:text-[color:var(--text-accent)] transition-colors"
                      style={{ color: "var(--text)" }}
                    >
                      {t.title_es}
                    </h2>
                    <p
                      className="text-sm line-clamp-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {t.subtitle_es}
                    </p>
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
