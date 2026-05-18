import Link from "next/link";
import BlogHeader from "./components/BlogHeader";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogHeader />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
        {children}
      </main>

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
            <Link
              href="/blog"
              className="flex items-center gap-2.5 mb-3"
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-md flex-shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, var(--brand-purple), var(--brand-purple-light))",
                }}
              >
                <span style={{ color: "white" }} aria-hidden>📚</span>
              </div>
              <div>
                <div
                  className="font-serif font-bold text-sm leading-none"
                  style={{ color: "var(--text)" }}
                >
                  Blog
                </div>
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--text-accent)" }}
                >
                  MechatronicStore
                </div>
              </div>
            </Link>
            <p
              className="text-sm leading-relaxed"
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
