"use client";

/**
 * HeaderActions — cluster derecho del main bar del header del blog.
 *
 * Pablo 21-may-2026 (clonación 1:1 del store mechatronicstore.cl):
 * tras audit JS profundo del HTML/CSS/animations del store, replico
 * EXACTO los componentes (estructura, sizes, radios, keyframes).
 *
 *   1. SUSCRÍBETE — botón con dot ANIMADO (msPulse 2.4s ease-in-out
 *      infinite) que parpadea amarillo→oscuro. Replica .ms-kl-btn +
 *      .ms-dot del store. Texto color var(--text) uppercase. Click
 *      scroll smooth al newsletter del footer.
 *
 *   2. COTIZAR + badge NUEVO — link con bg púrpura, borde 1px blanco,
 *      border-radius 12px (pill), height 30px, font 12px. Badge "NUEVO"
 *      pseudo (::after) amarillo arriba-derecha con animación
 *      pulse-badge (scale 1→1.08, 2s infinite). Link a
 *      empresas.mechatronicstore.cl (portal B2B real del store, NO
 *      /cotizacion/ que no existe).
 *
 *   3. Cart icon — rectángulo 32×33 bg púrpura sólido, border-radius
 *      12px (NO 4px, el store usa 12 pill-ish). Icono blanco interno.
 *
 *   4. User icon — mismo estilo que cart.
 *
 * Animaciones y vars CSS están en globals.css:
 *   --ms-dot-on / --ms-dot-off / @keyframes msPulse / @keyframes pulse-badge
 */

function handleScrollToNewsletter(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const input = document.querySelector<HTMLInputElement>(
    'input[type="email"][aria-label="Tu email"]',
  );
  if (input) {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => input.focus(), 600);
  } else {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
}

// v6 — header outer es claro/blanco, los iconos vuelven al morado sólido
// original (32×33 medido en el store: header-cart-link bg rgb(96,23,177)).
const ICON_BUTTON_STYLE: React.CSSProperties = {
  width: "32px",
  height: "33px",
  background: "var(--brand-purple)",
  color: "#ffffff",
  borderRadius: "12px",
};

export default function HeaderActions() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* SUSCRÍBETE — dot animado msPulse + texto. Replica .ms-kl-btn del store. */}
      <a
        href="#newsletter"
        onClick={handleScrollToNewsletter}
        className="ms-kl-btn hidden lg:inline-flex"
        aria-label="Suscríbete al newsletter del blog"
      >
        <span className="ms-dot" aria-hidden />
        <span className="ms-kl-text">Suscríbete</span>
      </a>

      {/* Divider sutil */}
      <span
        className="hidden lg:inline-block w-px h-5"
        style={{ background: "var(--border-subtle)" }}
        aria-hidden
      />

      {/* COTIZAR — replica EXACTA del store .slide con badge NUEVO ::after.
          Inline styles para garantizar match 1:1 con el inline style del store. */}
      <a
        href="https://empresas.mechatronicstore.cl/?utm_source=blog&utm_medium=header&utm_campaign=cotizar"
        className="cotizar-slide hidden lg:inline-flex"
        aria-label="Cotizar en MechatronicStore Empresas"
        title="Cotizar en MechatronicStore"
      >
        COTIZAR
      </a>

      {/* Cart icon — bg púrpura sólido 32×33 radius 12px */}
      <a
        href="https://www.mechatronicstore.cl/cart/?utm_source=blog&utm_medium=header&utm_campaign=cart"
        className="header-icon-btn flex items-center justify-center transition-colors"
        style={ICON_BUTTON_STYLE}
        aria-label="Ver carrito"
        title="Carrito en MechatronicStore"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 2h12l3 6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8l3-6Z" />
          <path d="M3 8h18" />
          <path d="M9 13a3 3 0 0 0 6 0" />
        </svg>
      </a>

      {/* Account icon — bg púrpura sólido 32×33 radius 12px */}
      <a
        href="https://www.mechatronicstore.cl/mi-cuenta/?utm_source=blog&utm_medium=header&utm_campaign=cuenta"
        className="header-icon-btn hidden sm:flex items-center justify-center transition-colors"
        style={ICON_BUTTON_STYLE}
        aria-label="Mi cuenta"
        title="Mi cuenta en MechatronicStore"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" />
        </svg>
      </a>
    </div>
  );
}
