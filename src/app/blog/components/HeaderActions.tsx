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
      {/* Suscribete + COTIZAR escondidos en mobile via wrapper.
          Pablo 25-may-2026 (mobile UX fix): las clases custom .ms-kl-btn y
          .cotizar-slide tienen `display: inline-flex` que override el `hidden`
          de Tailwind por specificity de CSS. Para garantizar que se oculten
          en mobile, los envuelvo en un div con `hidden lg:contents` — el div
          es transparente al flex layout cuando lg+ (los hijos siguen siendo
          flex items del parent), pero `display: none` en <lg. */}
      <div className="hidden lg:contents">
        {/* SUSCRIBETE - dot animado msPulse + texto. Replica .ms-kl-btn del store. */}
        <a
          href="#newsletter"
          onClick={handleScrollToNewsletter}
          className="ms-kl-btn"
          aria-label="Suscribete al newsletter del blog"
        >
          <span className="ms-dot" aria-hidden />
          <span className="ms-kl-text">Suscribete</span>
        </a>

        {/* Divider sutil */}
        <span
          className="inline-block w-px h-5"
          style={{ background: "var(--border-subtle)" }}
          aria-hidden
        />

        {/* COTIZAR - replica EXACTA del store .slide con badge NUEVO ::after.
            Inline styles para garantizar match 1:1 con el inline style del store. */}
        <a
          href="https://empresas.mechatronicstore.cl/?utm_source=blog&utm_medium=header&utm_campaign=cotizar"
          className="cotizar-slide"
          aria-label="Cotizar en MechatronicStore Empresas"
          title="Cotizar en MechatronicStore"
        >
          COTIZAR
        </a>
      </div>

      {/* Cart icon — Pablo 23-may-2026 v9: SVG path EXACTO del icon
          `shopping-bag` (U+E90A) del font flatsome-icons que usa el
          store. Extraído de fl-icons.svg, units-per-em=1024, ascent=960.
          El <g transform="translate(0,960) scale(1,-1)"> flippea el Y
          del coordinate system de SVG fonts (Y-up) al SVG normal (Y-down). */}
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
          viewBox="0 0 1024 1024"
          fill="currentColor"
          aria-hidden
        >
          <g transform="translate(0,960) scale(1,-1)">
            <path d="M1004 146.286l20-178.857q1.714-16-9.143-28.571-10.857-12-27.429-12h-950.857q-16.571 0-27.429 12-10.857 12.571-9.143 28.571l20 178.857h984zM950.857 625.714l49.143-442.857h-976l49.143 442.857q1.714 13.714 12 23.143t24.571 9.429h146.286v-73.143q0-30.286 21.429-51.714t51.714-21.429 51.714 21.429 21.429 51.714v73.143h219.429v-73.143q0-30.286 21.429-51.714t51.714-21.429 51.714 21.429 21.429 51.714v73.143h146.286q14.286 0 24.571-9.429t12-23.143zM731.429 731.428v-146.286q0-14.857-10.857-25.714t-25.714-10.857-25.714 10.857-10.857 25.714v146.286q0 60.571-42.857 103.429t-103.429 42.857-103.429-42.857-42.857-103.429v-146.286q0-14.857-10.857-25.714t-25.714-10.857-25.714 10.857-10.857 25.714v146.286q0 90.857 64.286 155.143t155.143 64.286 155.143-64.286 64.286-155.143z" />
          </g>
        </svg>
      </a>

      {/* Account icon — SVG path EXACTO de icon `user` (U+E901) del
          mismo font. Mismo transform Y-flip que el cart. */}
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
          viewBox="0 0 1024 1024"
          fill="currentColor"
          aria-hidden
        >
          <g transform="translate(0,960) scale(1,-1)">
            <path d="M576 253.388v52.78c70.498 39.728 128 138.772 128 237.832 0 159.058 0 288-192 288s-192-128.942-192-288c0-99.060 57.502-198.104 128-237.832v-52.78c-217.102-17.748-384-124.42-384-253.388h896c0 128.968-166.898 235.64-384 253.388z" />
          </g>
        </svg>
      </a>
    </div>
  );
}
