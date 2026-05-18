/**
 * HeroDecor — decoraciones SVG para la hero section del blog.
 *
 * Pablo 18-may-2026 audit "luisllamas style": el hero tiene que tener
 * profundidad visual sin distraer. Tres capas:
 *   1. Dot grid sutil con fade radial.
 *   2. Blob purple top-left (mancha gradient blureada).
 *   3. Blob yellow bottom-right.
 *   4. SVG circuit-traces decorativas (líneas que vibran levemente
 *      con animación CSS).
 *
 * Server component — sin JS runtime. Solo CSS animations.
 */
export default function HeroDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Dot grid con fade radial — solo se ve en el centro */}
      <div
        className="absolute inset-0 bg-dot-grid bg-dot-grid-fade opacity-50"
      />

      {/* Blob purple top-left — vibe orgánico */}
      <div
        className="bg-blob-purple"
        style={{
          width: "560px",
          height: "560px",
          top: "-120px",
          left: "-180px",
          opacity: 0.5,
        }}
      />

      {/* Blob yellow bottom-right */}
      <div
        className="bg-blob-yellow"
        style={{
          width: "440px",
          height: "440px",
          bottom: "-100px",
          right: "-120px",
          opacity: 0.35,
        }}
      />

      {/* SVG circuit traces — líneas decorativas estilo PCB.
          Animadas con stroke-dashoffset para sensación "de movimiento".
       */}
      <svg
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full opacity-[0.07]"
        fill="none"
      >
        <defs>
          <linearGradient id="circuit-trace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brand-purple)" />
            <stop offset="100%" stopColor="var(--brand-yellow)" />
          </linearGradient>
        </defs>
        <g stroke="url(#circuit-trace)" strokeWidth="1.5">
          {/* Trace 1: horizontal con codos */}
          <path d="M -20 80 L 200 80 L 240 120 L 480 120 L 520 160 L 800 160" />
          <circle cx="200" cy="80" r="4" fill="url(#circuit-trace)" />
          <circle cx="480" cy="120" r="4" fill="url(#circuit-trace)" />
          <circle cx="800" cy="160" r="6" fill="url(#circuit-trace)" />

          {/* Trace 2: diagonal */}
          <path d="M 100 540 L 280 540 L 320 500 L 620 500 L 660 460 L 900 460" />
          <circle cx="280" cy="540" r="4" fill="url(#circuit-trace)" />
          <circle cx="900" cy="460" r="6" fill="url(#circuit-trace)" />

          {/* Trace 3: vertical right */}
          <path d="M 1100 -20 L 1100 200 L 1060 240 L 1060 380" />
          <circle cx="1100" cy="200" r="4" fill="url(#circuit-trace)" />
          <circle cx="1060" cy="380" r="6" fill="url(#circuit-trace)" />

          {/* Trace 4: short connecting */}
          <path d="M 880 280 L 920 280 L 960 320 L 1020 320" />
          <circle cx="1020" cy="320" r="4" fill="url(#circuit-trace)" />
        </g>
      </svg>
    </div>
  );
}
