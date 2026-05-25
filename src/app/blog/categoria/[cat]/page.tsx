import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getPublishedTutorials,
  tutorialsByMacroCategory,
  isMacroCategory,
} from "@/lib/db/queries";
import HeroDecor from "../../components/HeroDecor";
import TutorialCard from "../../components/TutorialCard";

interface Props {
  params: Promise<{ cat: string }>;
}

const BASE_URL = "https://www.mechatronicstore.cl";

/**
 * CATEGORIES = todos los slugs validos en `/blog/categoria/{slug}`.
 *
 * Pablo 25-may-2026: agregar slugs macro (electronica, domotica, telematica)
 * para evitar 404 desde el header v2 que enlaza a esas 4 verticales.
 *
 * Slugs legacy (arduino, esp32, rpi, sensores, otros, 3d) siguen activos
 * para no romper URLs ya indexadas + links externos.
 *
 * Para slugs macro la query usa `tutorialsByMacroCategory` que filtra por
 * categorias DB + tags. Para legacy usa `getPublishedTutorials(limit, cat)`
 * (equivalente a WHERE category = cat).
 */
const CATEGORIES: Record<
  string,
  { label: string; description: string }
> = {
  // Macro verticales (header v2)
  electronica: {
    label: "Electronica",
    description:
      "Tutoriales paso a paso de electronica: Arduino, ESP32, Raspberry Pi, sensores y mas",
  },
  robotica: {
    label: "Robotica",
    description: "Robots y mecatronica DIY con codigo probado",
  },
  domotica: {
    label: "Domotica",
    description:
      "Domotica DIY: HomeKit, Home Assistant, IoT smart home, MQTT y automatizacion",
  },
  telematica: {
    label: "Telematica",
    description:
      "Comunicaciones inalambricas: WiFi, BLE, ESP-NOW, LoRa, web servers, MQTT",
  },
  // Legacy sub-tipos (slugs viejos, mantener compatibilidad SEO)
  arduino: {
    label: "Arduino",
    description: "Tutoriales con placas Arduino",
  },
  esp32: {
    label: "ESP32",
    description: "Tutoriales con ESP32 y derivados",
  },
  rpi: {
    label: "Raspberry Pi",
    description: "Tutoriales con Raspberry Pi",
  },
  sensores: {
    label: "Sensores",
    description: "Sensores y actuadores",
  },
  "3d": {
    label: "Impresion 3D",
    description: "Impresion 3D y modelado",
  },
  otros: { label: "Otros", description: "Otros tutoriales" },
};

async function getTutorialsForSlug(slug: string, limit = 50) {
  return isMacroCategory(slug)
    ? tutorialsByMacroCategory(slug, limit)
    : getPublishedTutorials(limit, slug);
}

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
    const recent = await getTutorialsForSlug(cat, 1);
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

  const tutorials = await getTutorialsForSlug(cat, 50);

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

      {/* Hero header con decoración + H1 en gradient block.
          Pablo 25-may-2026 Fase D: reducir whitespace mobile (antes
          py-10 sm:py-14 + mb-10 = ~250px de aire). Bajar a py-6 sm:py-10
          + mb-6 (~150px). Mismo enfoque que home page.tsx audit. */}
      <header className="relative mb-6 -mx-4 px-4 py-6 sm:-mx-6 sm:px-6 sm:py-10">
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
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{/* sin RevealOnScroll, ver page.tsx */}
            {tutorials.map((t) => (
              <li key={t.slug}>
                <TutorialCard t={t} variant="compact" />
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
