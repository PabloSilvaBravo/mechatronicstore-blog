"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme !== "light";
  const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

  const handle = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);
    }
    toggleTheme();
  };

  // Pablo 21-may-2026 (header alignment con store): el theme toggle vive
  // junto a los iconos cart/user/cotizar del cluster derecho del header.
  // Para que se vea coherente con esos botones, le damos la misma
  // estética — cuadrado púrpura sólido 36×36 con icono blanco.
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className="header-icon-btn relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center transition-colors"
      style={{
        background: "var(--brand-purple)",
        color: "#ffffff",
        borderRadius: "4px",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Moon (dark mode) — stroke blanco para contraste sobre púrpura */}
      <svg
        className={`absolute h-5 w-5 transition-all duration-300 ${
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="#ffffff"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
      </svg>

      {/* Sun (light mode) — stroke blanco para contraste sobre púrpura */}
      <svg
        className={`absolute h-5 w-5 transition-all duration-300 ${
          !isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="#ffffff"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
    </button>
  );
}
