import Link from "next/link";

/**
 * HeaderActions — cluster derecho del main bar del header del blog,
 * replica las acciones del header de mechatronicstore.cl.
 *
 * Acciones (de izq a der, igual orden que el store):
 *   1. SUSCRÍBETE — yellow dot + texto, abre subscribe page del store
 *      (Pablo 18-may-2026: usar el newsletter del store para mantener
 *      una sola lista de suscriptores, no fragmentar).
 *   2. 🛒 Cart — icono carrito → /cart del store con UTM tracking
 *      (Pablo: solo link externo, sin badge en vivo — evita CORS).
 *   3. 👤 Cuenta — icono usuario → /mi-cuenta del store
 *
 * Cada link lleva utm_source=blog para que el store sepa qué tráfico
 * vino del blog.
 *
 * Server component sin JS.
 */
export default function HeaderActions() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* SUSCRÍBETE — yellow dot + label */}
      <a
        href="https://www.mechatronicstore.cl/suscribete/?utm_source=blog&utm_medium=header&utm_campaign=suscribete"
        className="hidden lg:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] transition-opacity hover:opacity-80"
        style={{ color: "var(--text)" }}
        aria-label="Suscríbete al newsletter"
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{
            background: "var(--brand-yellow)",
            boxShadow: "0 0 8px var(--brand-yellow)",
          }}
          aria-hidden
        />
        Suscríbete
      </a>

      {/* Divider sutil entre suscribete y los icons */}
      <span
        className="hidden lg:inline-block w-px h-5"
        style={{ background: "var(--border-subtle)" }}
        aria-hidden
      />

      {/* Cart icon */}
      <a
        href="https://www.mechatronicstore.cl/cart/?utm_source=blog&utm_medium=header&utm_campaign=cart"
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-[color:var(--bg-hover)]"
        style={{ color: "var(--text)" }}
        aria-label="Ver carrito"
        title="Carrito en MechatronicStore"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </a>

      {/* Account icon */}
      <a
        href="https://www.mechatronicstore.cl/mi-cuenta/?utm_source=blog&utm_medium=header&utm_campaign=cuenta"
        className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-[color:var(--bg-hover)]"
        style={{ color: "var(--text)" }}
        aria-label="Mi cuenta"
        title="Mi cuenta en MechatronicStore"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </a>
    </div>
  );
}
