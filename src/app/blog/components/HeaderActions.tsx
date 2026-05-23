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

      {/* Cart icon — Pablo 23-may-2026 v8: SVG FILLED (estilo store
          Flatsome icon-cart) en lugar de outline. Cuadrado morado 32×33
          radius 12 con shopping bag blanco sólido relleno adentro. */}
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
          fill="currentColor"
          aria-hidden
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zm0 2h12l2 2H4l2-2zM4 8h16v12H4V8zm4 2v2a4 4 0 0 0 8 0v-2h-2v2a2 2 0 0 1-4 0v-2H8z" />
        </svg>
      </a>

      {/* Account icon — SVG FILLED estilo store icon-user. */}
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
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-8a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 10c-3.87 0-9 1.945-9 5.5V22h18v-2.5c0-3.555-5.13-5.5-9-5.5zm0 2c3.526 0 7 1.71 7 3.5V20H5v-.5c0-1.79 3.474-3.5 7-3.5z" />
        </svg>
      </a>
    </div>
  );
}
