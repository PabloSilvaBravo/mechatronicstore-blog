"use client";

/**
 * HeaderActions — cluster derecho del main bar del header del blog,
 * replica las acciones del header de mechatronicstore.cl.
 *
 * Pablo 21-may-2026 (alignment con store v2):
 *   1. SUSCRÍBETE — yellow dot + texto, scroll smooth al newsletter.
 *   2. COTIZAR + badge NUEVO — nuevo botón prominente con bg púrpura
 *      sólido + label "NUEVO" amarillo. Solo desktop (lg+). Match con
 *      el botón "Cotizar" + badge del store.
 *   3. 🛒 Cart — SVG shopping bag dentro de cuadrado púrpura sólido
 *      36×36 con icono BLANCO (no ghost transparente). Match exacto
 *      con los rectángulos púrpura del store.
 *   4. 👤 Cuenta — Misma estética que cart: cuadrado púrpura sólido +
 *      icono blanco.
 *
 * Cada link externo lleva utm_source=blog para tracking en el store.
 */
function handleScrollToNewsletter(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const input = document.querySelector<HTMLInputElement>(
    'input[type="email"][aria-label="Tu email"]',
  );
  if (input) {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus después de la animación para que la UX sea: scroll → focus
    setTimeout(() => input.focus(), 600);
  } else {
    // Fallback si el componente no está montado (edge case)
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
}

/**
 * Estilo compartido para los iconos de acción del header (cart, user).
 * Bg púrpura sólido + icono blanco — match exacto con el header del
 * store mechatronicstore.cl. NO usar bg ghost transparente.
 */
const ICON_BUTTON_STYLE: React.CSSProperties = {
  width: "36px",
  height: "36px",
  background: "var(--brand-purple)",
  color: "#ffffff",
  borderRadius: "4px",
};

export default function HeaderActions() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* SUSCRÍBETE — yellow dot + label, scroll al footer newsletter */}
      <a
        href="#newsletter"
        onClick={handleScrollToNewsletter}
        className="hidden lg:inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] transition-opacity hover:opacity-80"
        style={{ color: "var(--text)" }}
        aria-label="Suscríbete al newsletter del blog"
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

      {/* Divider sutil entre suscribete y COTIZAR */}
      <span
        className="hidden lg:inline-block w-px h-5"
        style={{ background: "var(--border-subtle)" }}
        aria-hidden
      />

      {/* COTIZAR — botón prominente desktop-only, badge "NUEVO" amarillo
          arriba a la derecha. Replica el botón "Cotizar" del store que
          pasamos a destacar como nueva feature B2B. */}
      <a
        href="https://www.mechatronicstore.cl/cotizacion/?utm_source=blog&utm_medium=header&utm_campaign=cotizar"
        className="relative hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.08em] text-white transition-colors hover:opacity-90"
        style={{ background: "var(--brand-purple)", height: "36px" }}
        aria-label="Pedir cotización en MechatronicStore"
        title="Cotizar en MechatronicStore"
      >
        Cotizar
        <span
          className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded text-[9px] font-bold leading-none uppercase tracking-wide"
          style={{
            background: "var(--brand-yellow)",
            color: "#1a0640",
          }}
          aria-hidden
        >
          Nuevo
        </span>
      </a>

      {/* Cart icon — shopping bag style en cuadrado púrpura sólido */}
      <a
        href="https://www.mechatronicstore.cl/cart/?utm_source=blog&utm_medium=header&utm_campaign=cart"
        className="header-icon-btn flex items-center justify-center transition-colors"
        style={ICON_BUTTON_STYLE}
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
          {/* Bolsa: dos asas curvas + cuerpo trapezoide invertido */}
          <path d="M6 2h12l3 6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8l3-6Z" />
          <path d="M3 8h18" />
          <path d="M9 13a3 3 0 0 0 6 0" />
        </svg>
      </a>

      {/* Account icon — user silhouette en cuadrado púrpura sólido */}
      <a
        href="https://www.mechatronicstore.cl/mi-cuenta/?utm_source=blog&utm_medium=header&utm_campaign=cuenta"
        className="header-icon-btn hidden sm:flex items-center justify-center transition-colors"
        style={ICON_BUTTON_STYLE}
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
          {/* Cabeza redonda + hombros estilo Flatsome icon-user */}
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" />
        </svg>
      </a>
    </div>
  );
}
