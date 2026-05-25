import Link from "next/link";
import BackToTop from "./components/BackToTop";
import NewsletterSignup from "./components/NewsletterSignup";
import { SearchOverlayProvider } from "./components/SearchOverlay";
import Logo from "../components/Logo";

// Revalidate counts cada 10 min — los conteos no necesitan ser
// realtime, solo dirigir tráfico.
export const revalidate = 600;

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Header v2 + UtilityBar (banner Envio gratis) + skip-link ahora se
  // montan en root layout.tsx (UtilityBar dentro del BlogHeader v2, arriba
  // del main bar). NO duplicar aca.
  return (
    <SearchOverlayProvider>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-4 sm:py-8">
        {children}
      </main>

      <BackToTop />

      <footer
        className="border-t mt-12"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "var(--bg-elevated)",
        }}
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand + Newsletter */}
          <div className="lg:col-span-2">
            <Link href="/blog" className="inline-flex items-center mb-3">
              <Logo size="sm" />
            </Link>
            <p
              className="text-sm leading-relaxed mt-3 mb-5"
              style={{ color: "var(--text-muted)" }}
            >
              Tutoriales de electrónica, robótica y DIY adaptados al maker
              chileno. Cada proyecto linkea componentes reales del catálogo
              MechatronicStore.cl.
            </p>
            <NewsletterSignup />
          </div>

          {/* Contáctanos */}
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--text-dim)" }}
            >
              Contáctanos
            </div>
            <ul className="space-y-1.5 text-sm">
              <li style={{ color: "var(--text-muted)" }}>
                Manuel Rodriguez 212, local 1, Curicó
              </li>
              <li>
                <a
                  href="mailto:ventas@mechatronicstore.cl"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  ventas@mechatronicstore.cl
                </a>
              </li>
              <li>
                <a
                  href="tel:+56976167930"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  +56 9 7616 7930
                </a>
              </li>
            </ul>
          </div>

          {/* Categorías Blog */}
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--text-dim)" }}
            >
              Categorías Blog
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

          {/* Páginas de interés */}
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-[0.12em] mb-3"
              style={{ color: "var(--text-dim)" }}
            >
              Páginas de Interés
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a
                  href="https://www.mechatronicstore.cl/?utm_source=blog&utm_medium=footer&utm_campaign=mechaai"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  MechaAI
                </a>
              </li>
              <li>
                <a
                  href="https://www.mechatronicstore.cl/cotizacion/?utm_source=blog&utm_medium=footer"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Solicitar Cotización
                </a>
              </li>
              <li>
                <a
                  href="https://www.mechatronicstore.cl/servicio-de-impresion-3d/?utm_source=blog&utm_medium=footer"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Impresión 3D
                </a>
              </li>
              <li>
                <a
                  href="https://www.mechatronicstore.cl/politicas/?utm_source=blog&utm_medium=footer"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a
                  href="https://www.mechatronicstore.cl/garantia/?utm_source=blog&utm_medium=footer"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Garantía
                </a>
              </li>
              <li>
                <Link
                  href="/blog/etica"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Política editorial
                </Link>
              </li>
              <li>
                <Link
                  href="/blog/feed.xml"
                  className="hover:underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Feed RSS
                </Link>
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

        {/* Social icons */}
        <div
          className="border-t mt-8"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 flex items-center justify-center gap-4">
            <a
              href="https://www.instagram.com/mechatronicstore.cl/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de MechatronicStore"
              className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:text-[color:var(--brand-purple)]"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@mechatronicstore.cl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok de MechatronicStore"
              className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:text-[color:var(--brand-purple)]"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {/* Nota musical: tronco vertical + curva superior + cabeza circular */}
                <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
                <path d="M14 4c0 2.5 2 4.5 4.5 4.5" />
              </svg>
            </a>
            <a
              href="https://www.youtube.com/channel/UCduHpxJBRrJBa2lgT0NPFbQ"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube de MechatronicStore"
              className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:text-[color:var(--brand-purple)]"
              style={{ color: "var(--text-muted)" }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="2" y="6" width="20" height="12" rx="3" />
                <path d="M10 9.5v5l5-2.5-5-2.5Z" />
              </svg>
            </a>
          </div>
        </div>

        <div
          className="border-t py-5"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div
            className="mx-auto max-w-5xl px-4 sm:px-6 text-center text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            © MechatronicStore<sup>®</sup> {new Date().getFullYear()} Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </SearchOverlayProvider>
  );
}
