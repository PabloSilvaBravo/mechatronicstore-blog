/**
 * CategoryIcon — SVG outline minimalista por categoría del blog.
 *
 * Pablo 18-may-2026 (Fase 2 header): el dropdown anterior usaba
 * emojis (🔌 📡 🍓 etc) — funcional pero "consumer". Para el mega
 * menú quedamos con iconos SVG outline custom estilo Luis / Stripe
 * docs, que dan vibe técnico/engineering sin perder personalidad.
 *
 * Cada icono es 24×24 stroke 1.75, color heredado de `currentColor`
 * para que matchee con el tema (purple en hover, muted en base).
 *
 * Server component — pure render, sin estado.
 */

interface Props {
  slug: string;
  className?: string;
  size?: number;
}

export default function CategoryIcon({ slug, className = "", size = 24 }: Props) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (slug) {
    case "arduino":
      // Chip / IC rectangular con pines a los lados
      return (
        <svg {...props}>
          <rect x="6" y="7" width="12" height="10" rx="1.5" />
          <path d="M3 10v1M3 13v1M21 10v1M21 13v1" />
          <path d="M4 10.5h2M4 13.5h2M18 10.5h2M18 13.5h2" />
          <circle cx="10" cy="12" r="0.6" fill="currentColor" />
          <circle cx="14" cy="12" r="0.6" fill="currentColor" />
        </svg>
      );

    case "esp32":
      // WiFi waves + chip pequeño
      return (
        <svg {...props}>
          <path d="M5 13a10 10 0 0 1 14 0" />
          <path d="M8 16a6 6 0 0 1 8 0" />
          <path d="M11 19a1.5 1.5 0 0 1 2 0" />
          <rect x="9" y="4" width="6" height="4" rx="0.75" />
        </svg>
      );

    case "rpi":
      // Frambuesa estilizada (3 círculos en triángulo + tallo)
      return (
        <svg {...props}>
          <circle cx="12" cy="9" r="2.2" />
          <circle cx="8.5" cy="13.5" r="2.2" />
          <circle cx="15.5" cy="13.5" r="2.2" />
          <circle cx="12" cy="17" r="2.2" />
          <path d="M11 6.5 L13 4 L15 5.5" />
        </svg>
      );

    case "robotica":
      // Cabeza robot minimal (caja con ojos + antena)
      return (
        <svg {...props}>
          <rect x="5" y="9" width="14" height="10" rx="1.5" />
          <circle cx="9" cy="14" r="1.2" fill="currentColor" />
          <circle cx="15" cy="14" r="1.2" fill="currentColor" />
          <path d="M10 18.5h4" />
          <path d="M12 9V6" />
          <circle cx="12" cy="5" r="1" fill="currentColor" />
        </svg>
      );

    case "sensores":
      // Sensor de pulsos / onda
      return (
        <svg {...props}>
          <path d="M3 12h3l2-5 4 10 2-5 2 2h5" />
          <circle cx="6" cy="12" r="1" fill="currentColor" />
          <circle cx="18" cy="12" r="1" fill="currentColor" />
        </svg>
      );

    case "3d":
      // Cubo isométrico
      return (
        <svg {...props}>
          <path d="M12 4 L4 8 V16 L12 20 L20 16 V8 Z" />
          <path d="M12 4 V12 M4 8 L12 12 M20 8 L12 12" />
        </svg>
      );

    case "otros":
    default:
      // Engranaje / settings
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.6A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
        </svg>
      );
  }
}
