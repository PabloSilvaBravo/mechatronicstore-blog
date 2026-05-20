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

// Pablo 20-may-2026 audit SEO: categoría tenía OG básico sin og_image y
// sin JSON-LD. Fix: usar hero del primer tutorial de la categoría como
// og:image dinámico + agregar CollectionPage + ItemList schema.
const FALLBACK_OG_IMAGE = `${BASE_URL}/blog/logo-mechastore-blog.svg`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cat } = await params;
  const meta = CATEGORIES[cat];
  if (!meta) return { title: "Categoría no encontrada" };
  const url = `${BASE_URL}/blog/categoria/${cat}`;
  // og:image dinámico — hero del primer tutorial publicado en la categoría
  let ogImage = FALLBACK_OG_IMAGE;
  try {
    const recent = await getPublishedTutorials(1, cat);
    if (recent[0]?.hero_image_url) ogImage = recent[0].hero_image_url;
  } catch {}
  const desc = `${meta.description}. Tutoriales paso a paso, código probado y materiales en stock en Chile.`;
  return {
    title: `Tutoriales de ${meta.label}`,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: `Tutoriales de ${meta.label} · Blog MechatronicStore`,
      description: desc,
      url,
      type: "website",
      siteName: "MechatronicStore Blog",
      locale: "es_CL",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `Tutoriales ${meta.label}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `Tutoriales de ${meta.label}`,
      description: desc,
      images: [ogImage],
    },
  };
}

export const revalidate = 3600;

export default async function CategoryPage({ params }: Props) {
  const { cat } = await params;
  const meta = CATEGORIES[cat];
  if (!meta) notFound();

  const tutorials = await getPublishedTutorials(50, cat);

  // JSON-LD CollectionPage + Breadcrumb (Pablo 20-may-2026 audit SEO)
  const url = `${BASE_URL}/blog/categoria/${cat}`;
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    name: `Tutoriales de ${meta.label}`,
    description: meta.description,
    url,
    inLanguage: "es-CL",
    isPartOf: {
      "@type": "Blog",
      "@id": `${BASE_URL}/blog#blog`,
      name: "Blog MechatronicStore",
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: tutorials.length,
      itemListElement: tutorials.slice(0, 20).map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/blog/${t.slug}`,
        name: t.title_es,
      })),
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: meta.label, item: url },
    ],
  };

  return (
    <div className="fade-in-up">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
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

      {/* Hero header con decoración + H1 en gradient block (Pack C-lite)
          Pablo 18-may-2026: replicando luisllamas — H1 wrapped en
          container con bg gradient brand. Subtitle en monospace
          con caret blink. */}
      <header className="relative mb-10 -mx-4 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-14">
        <HeroDecor />
        <div className="relative">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--brand-yellow)" }}
          >
            Sección · {meta.label}
          </div>
          <h1
            className="font-headline mb-4 tracking-tight"
            style={{
              fontSize: "clamp(2rem, 1.5rem + 3vw, 3.5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            <span className="h1-gradient-block">
              Tutoriales de {meta.label}
            </span>
          </h1>
          <p
            className="subtitle-mono with-caret mt-4"
            style={{ maxWidth: "60ch" }}
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
                      referrerPolicy="no-referrer"
                      loading="lazy"
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
