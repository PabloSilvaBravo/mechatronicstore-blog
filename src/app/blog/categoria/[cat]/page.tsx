import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedTutorials } from "@/lib/db/queries";

interface Props {
  params: Promise<{ cat: string }>;
}

const BASE_URL = "https://www.mechatronicstore.cl";

const CATEGORIES: Record<string, { label: string; description: string }> = {
  arduino: { label: "Arduino", description: "Tutoriales con placas Arduino" },
  esp32: { label: "ESP32", description: "Tutoriales con ESP32 y derivados" },
  rpi: { label: "Raspberry Pi", description: "Tutoriales con Raspberry Pi" },
  robotica: { label: "Robótica", description: "Robots y mecatrónica" },
  sensores: { label: "Sensores", description: "Sensores y actuadores" },
  "3d": { label: "Impresión 3D", description: "Impresión 3D y modelado" },
  otros: { label: "Otros", description: "Otros tutoriales" },
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
    <div>
      <nav className="text-sm text-[color:var(--muted)] mb-6">
        <Link href="/blog" className="hover:underline">
          ← Blog
        </Link>
      </nav>

      <h1 className="text-3xl font-bold mb-2">
        Tutoriales de {meta.label}
      </h1>
      <p className="text-[color:var(--muted)] mb-8">{meta.description}</p>

      {tutorials.length === 0 ? (
        <p className="text-[color:var(--muted)]">
          Sin tutoriales en esta categoría todavía.
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tutorials.map((t) => (
            <li
              key={t.slug}
              className="border border-[color:var(--border)] rounded-lg overflow-hidden hover:border-[color:var(--primary)] transition-colors"
            >
              <Link href={`/blog/${t.slug}`} className="block">
                {t.hero_image_url && (
                  <img
                    src={t.hero_image_url}
                    alt={t.title_es}
                    className="w-full h-40 object-cover"
                  />
                )}
                <div className="p-4">
                  <h2 className="font-bold mb-1 line-clamp-2">{t.title_es}</h2>
                  <p className="text-sm text-[color:var(--muted)] line-clamp-2">
                    {t.subtitle_es}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
