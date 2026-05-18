import Link from "next/link";
import BlogHeader from "./components/BlogHeader";
import BackToTop from "./components/BackToTop";
import UtilityBar from "./components/UtilityBar";
import Logo from "../components/Logo";
import { getCategoryCounts } from "@/lib/db/queries";

// Revalidate counts cada 10 min — los conteos no necesitan ser
// realtime, solo dirigir tráfico.
export const revalidate = 600;

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch en server, pasamos plain JSON al BlogHeader (client).
  // Si la DB falla, fallback a {} para no romper el render.
  let categoryCounts: Record<string, number> = {};
  try {
    categoryCounts = await getCategoryCounts();
  } catch (e) {
    console.error("[blog/layout] getCategoryCounts failed", e);
  }

  return (
    <>
      <UtilityBar />
      <BlogHeader categoryCounts={categoryCounts} />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
        {children}
      </main>

      <BackToTop />

      <footer
        className="border-t mt-24"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/blog" className="inline-flex items-center mb-3">
              <Logo size="sm" />
            </Link>
            <p
              className="text-sm leading-relaxed mt-3"
              style={{ color: "var(--text-muted)" }}
            >
              Tutoriales de electrónica, robótica y DIY adaptados al maker
              chileno. Cada proyecto linkea componentes reales del catálogo
              MechatronicStore.cl.
            </p>
          </div>

          {/* Categorías */}
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--text-dim)" }}
            >
              Categorías
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/blog/categoria/esp32" className="hover:underline" style={{ color: "var(--text-muted)" }}>
                  ESP32
                </Link>
              </li>
              <li>
                <Link href="/blog/categoria/arduino" className="hover:underline" style={{ color: "var(--text-muted)" }}>
                  Arduino
                </Link>
              </li>
              <li>
                <Link href="/blog/categoria/rpi" className="hover:underline" style={{ color: "var(--text-muted)" }}>
                  Raspberry Pi
                </Link>
              </li>
              <li>
                <Link href="/blog/categoria/robotica" className="hover:underline" style={{ color: "var(--text-muted)" }}>
                  Robótica
                </Link>
              </li>
              <li>
                <Link href="/blog/categoria/sensores" className="hover:underline" style={{ color: "var(--text-muted)" }}>
                  Sensores
                </Link>
              </li>
              <li>
                <Link href="/blog/categoria/3d" className="hover:underline" style={{ color: "var(--text-muted)" }}>
                  Impresión 3D
                </Link>
              </li>
            </ul>
          </div>

          {/* Recursos */}
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--text-dim)" }}
            >
              MechatronicStore
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a
                  href="https://www.mechatronicstore.cl"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Tienda online
                </a>
              </li>
              <li>
                <a
                  href="https://noticias.mechatronicstore.cl"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Mecha Noticias
                </a>
              </li>
              <li>
                <a
                  href="https://www.mechatronicstore.cl/contacto"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Contacto
                </a>
              </li>
              <li>
                <Link
                  href="/blog/sitemap.xml"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="border-t py-5"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div
            className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            <div>
              © {new Date().getFullYear()} MechatronicStore · Todos los derechos reservados
            </div>
            <div className="flex items-center gap-3">
              <span>Hecho con</span>
              <span aria-hidden>💜</span>
              <span>en Chile</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
