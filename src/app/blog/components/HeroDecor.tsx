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
 * Pablo 23-may-2026 fix FOUC v2: TODO está inline. Antes del fix, en el
 * primer paint del HTML server-rendered (cuando el browser todavía no
 * aplicó las clases Tailwind como `overflow-hidden`, `opacity-[0.07]`,
 * `opacity-50`), pasaba esto durante 16–80ms:
 *   - El wrapper outer no tenía overflow:hidden → los blobs (560×560
 *     posicionados en top:-120, left:-180) se ESCAPABAN del header y
 *     se veían como una mancha purpura cubriendo área del viewport
 *     fuera del bounding del header. Ese era el "recuadro purpura"
 *     que Pablo veía.
 *   - El <svg> de circuit traces tenía opacity:1 default (en lugar de
 *     0.07) → las líneas con gradient purple→yellow se veían bien
 *     marcadas, contribuyendo al "recuadro".
 *   - El dot-grid tenía opacity:1 → no aporta a flash visible porque
 *     su background depende de class CSS (sin class no hay dots), pero
 *     se inlinea por defensa en cuanto la class entre.
 *
 * Server component — sin JS runtime. Solo CSS animations.
 */
export default function HeroDecor() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: -10,
        overflow: "hidden",
      }}
    >
      {/* Dot grid con fade radial — solo se ve en el centro. El
          background-image / mask-image quedan en la CSS class (usan
          color-mix con var, son complejos). Sin CSS cargado, el div
          no tiene background → invisible → no flashea. La opacity se
          inlinea por defensa. */}
      <div
        className="bg-dot-grid bg-dot-grid-fade"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
        }}
      />

      {/* Blob purple top-left — vibe orgánico.
          Pablo 22-may-2026 fix FOUC: TODOS los estilos del blob están
          inline (border-radius, gradient, blur). Si solo usás clase
          .bg-blob-purple, durante los ms previos a hidratar el CSS, el
          div se ve como rectángulo sólido — bug visible al recargar. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          pointerEvents: "none",
          width: "560px",
          height: "560px",
          top: "-120px",
          left: "-180px",
          opacity: 0.5,
          borderRadius: "9999px",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand-purple) 35%, transparent) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Blob yellow bottom-right — idem inline fix FOUC */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          pointerEvents: "none",
          width: "440px",
          height: "440px",
          bottom: "-100px",
          right: "-120px",
          opacity: 0.35,
          borderRadius: "9999px",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand-yellow) 25%, transparent) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* SVG circuit traces — líneas decorativas estilo PCB.
          Pablo 23-may-2026 fix FOUC v2: opacity inline (era class
          `opacity-[0.07]`). Sin esta línea, antes de que Tailwind
          aplique la clase, el SVG aparece a opacity:1 — el gradient
          purple→yellow de las traces se ve grueso y marcado, lo que
          combinado con el blob purple sin overflow:hidden producía
          el "recuadro purple" que se veía al recargar. */}
      <svg
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.07,
        }}
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
