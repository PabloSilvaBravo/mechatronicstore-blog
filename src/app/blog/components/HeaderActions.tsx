"use client";

/**
 * HeaderActions — cluster derecho del main bar del header del blog,
 * replica las acciones del header de mechatronicstore.cl.
 *
 * Pablo 21-may-2026: ajustes para mimic exacto del store:
 *   1. SUSCRÍBETE — yellow dot + texto. ANTES apuntaba a /suscribete/
 *      (404). AHORA hace scroll smooth al newsletter signup del footer
 *      + focus al input. Sin recargar página.
 *   2. 🛒 Cart — SVG "shopping bag" (Tabler-style) replica visual del
 *      icon-shopping-bag de Flatsome (bolsa con asas, NO caja).
 *      Linkea al cart del store con UTM.
 *   3. 👤 Cuenta — SVG silhouette + circle head, equivalente al
 *      icon-user de Flatsome.
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

      {/* Divider sutil entre suscribete y los icons */}
      <span
        className="hidden lg:inline-block w-px h-5"
        style={{ background: "var(--border-subtle)" }}
        aria-hidden
      />

      {/* Cart icon — shopping bag style (Flatsome icon-shopping-bag equivalent) */}
      <a
        href="https://www.mechatronicstore.cl/cart/?utm_source=blog&utm_medium=header&utm_campaign=cart"
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-[color:var(--bg-hover)]"
        style={{ color: "var(--text)" }}
        aria-label="Ver carrito"
        title="Carrito en MechatronicStore"
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
          {/* Bolsa: dos asas curvas + cuerpo trapezoide invertido */}
          <path d="M6 2h12l3 6v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8l3-6Z" />
          <path d="M3 8h18" />
          <path d="M9 13a3 3 0 0 0 6 0" />
        </svg>
      </a>

      {/* Account icon — user silhouette (Flatsome icon-user equivalent) */}
      <a
        href="https://www.mechatronicstore.cl/mi-cuenta/?utm_source=blog&utm_medium=header&utm_campaign=cuenta"
        className="hidden sm:flex items-center justify-center w-10 h-10 rounded-lg transition-colors hover:bg-[color:var(--bg-hover)]"
        style={{ color: "var(--text)" }}
        aria-label="Mi cuenta"
        title="Mi cuenta en MechatronicStore"
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
          {/* Cabeza redonda + hombros estilo Flatsome icon-user */}
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" />
        </svg>
      </a>
    </div>
  );
}
