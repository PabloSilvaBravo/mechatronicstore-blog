import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import {
  tutorialsByTag,
  countTutorialsByTag,
  relatedTags,
} from "@/lib/db/queries";
import HeroDecor from "../../components/HeroDecor";
import RevealOnScroll from "../../components/RevealOnScroll";

const BASE_URL = "https://www.mechatronicstore.cl";
const MIN_TUTORIALS_FOR_INDEX = 3;

interface PageProps {
  params: Promise<{ tag: string }>;
}

// React cache() dedup: generateMetadata + page run en el mismo request
const getCached = cache(async (tag: string, limit: number) =>
  tutorialsByTag(tag, limit),
);

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const label = decoded.replace(/-/g, " ");
  const url = `${BASE_URL}/blog/tag/${tag}`;
  const items = await getCached(decoded, 60);
  const noindex = items.length < MIN_TUTORIALS_FOR_INDEX;

  return {
    title: `#${decoded}`,
    description: `Tutoriales sobre ${label} en MechatronicStore Blog. ${items.length} tutoriales publicados.`,
    robots: noindex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : undefined,
    alternates: {
      canonical: url,
      languages: {
        "es-CL": url,
        "es-419": url,
        es: url,
        "x-default": url,
      },
    },
    openGraph: {
      title: `#${decoded} · Blog MechatronicStore`,
      description: `Tutoriales sobre ${label}.`,
      type: "website",
      url,
      siteName: "MechatronicStore Blog",
      locale: "es_CL",
      // Pablo 20-may-2026 audit SEO: og:image dinámico — hero del primer
      // tutorial del tag.
      images: items[0]?.hero_image_url
        ? [{ url: items[0].hero_image_url, width: 1200, height: 630, alt: `#${decoded}` }]
        : [{ url: `${BASE_URL}/blog/logo-mechastore-blog.svg`, width: 1200, height: 630, alt: "Blog MechatronicStore" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `#${decoded}`,
      description: `Tutoriales sobre ${label}`,
      images: items[0]?.hero_image_url
        ? [items[0].hero_image_url]
        : [`${BASE_URL}/blog/logo-mechastore-blog.svg`],
    },
  };
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  const [items, related, totalCount] = await Promise.all([
    getCached(decoded, 60),
    relatedTags(decoded, 8),
    countTutorialsByTag(decoded),
  ]);

  if (items.length === 0) notFound();

  const label = decoded.replace(/-/g, " ");

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${BASE_URL}/blog/tag/${tag}`,
    name: `#${label}`,
    description: `Tutoriales sobre ${label}`,
    url: `${BASE_URL}/blog/tag/${tag}`,
    inLanguage: "es-CL",
    dateModified: items[0]?.published_at || new Date().toISOString(),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: Math.min(items.length, 12),
      itemListElement: items.slice(0, 12).map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/blog/${t.slug}`,
        name: t.title_es,
      })),
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: BASE_URL + "/blog" },
      {
        "@type": "ListItem",
        position: 3,
        name: `#${label}`,
        item: `${BASE_URL}/blog/tag/${tag}`,
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav
        className="text-xs uppercase tracking-[0.12em] mb-6"
        style={{ color: "var(--text-dim)" }}
      >
        <Link href="/blog" className="underlink">Blog</Link>
        <span className="mx-2" aria-hidden>›</span>
        <span style={{ color: "var(--text-muted)" }}>#{decoded}</span>
      </nav>

      <header className="relative mb-10 -mx-4 px-4 py-10 sm:-mx-6 sm:px-6 sm:py-12">
        <HeroDecor />
        <div className="relative">
          <div
            className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "var(--brand-yellow)" }}
          >
            Etiqueta
          </div>
          <h1
            className="font-headline mb-4 tracking-tight"
            style={{
              fontSize: "clamp(2rem, 1.5rem + 3vw, 3.25rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            <span className="h1-gradient-block">#{decoded}</span>
          </h1>
          <p
            className="subtitle-mono with-caret mt-4"
          >
            {totalCount} {totalCount === 1 ? "tutorial publicado" : "tutoriales publicados"}
          </p>
        </div>
      </header>

      <RevealOnScroll>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {items.map((t) => (
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

      {related.length >= 3 && (
        <section
          className="border-t pt-8 mt-12"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <h2
            className="text-lg font-bold mb-3"
            style={{ color: "var(--text)" }}
          >
            Etiquetas relacionadas
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            Otros temas que aparecen junto a #{decoded} en tutoriales.
          </p>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.tag}
                href={`/blog/tag/${encodeURIComponent(r.tag)}`}
                className="pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm"
                style={{
                  color: "var(--text-muted)",
                  backgroundColor: "var(--bg-elevated)",
                }}
              >
                <span style={{ color: "var(--text-dim)" }}>#</span>
                <span className="font-medium">{r.tag}</span>
                <span
                  className="text-[11px] tabular-nums"
                  style={{ color: "var(--text-dim)" }}
                >
                  {r.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
