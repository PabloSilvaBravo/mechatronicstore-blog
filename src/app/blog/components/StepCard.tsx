interface Props {
  position: number;
  name: string;
  text: string;
  imageUrl?: string;
}

/**
 * Step card con número grande sidebar + texto + imagen opcional.
 * Estilo periodístico — el número sirve como ancla visual fuerte.
 */
export default function StepCard({ position, name, text, imageUrl }: Props) {
  return (
    <li
      className="relative pl-16 sm:pl-20 pb-6"
      style={{ listStyle: "none" }}
    >
      {/* Número grande en sidebar */}
      <div
        className="absolute left-0 top-0 flex items-start justify-center w-12 sm:w-14"
        aria-hidden
      >
        <div
          className="font-serif font-bold leading-none"
          style={{
            fontSize: "clamp(2.5rem, 2rem + 2vw, 3.5rem)",
            color: "var(--brand-purple)",
            letterSpacing: "-0.04em",
            lineHeight: 0.85,
          }}
        >
          {String(position).padStart(2, "0")}
        </div>
      </div>

      {/* Vertical line connector (excepto el último step, pero CSS la pinta para todos) */}
      <div
        className="absolute left-6 sm:left-7 top-12 bottom-0 w-px"
        style={{ backgroundColor: "var(--border-subtle)" }}
        aria-hidden
      />

      {/* Contenido */}
      <div>
        <h3
          className="font-bold mb-2"
          style={{
            color: "var(--text)",
            fontSize: "1.25rem",
            lineHeight: 1.3,
          }}
        >
          {name}
        </h3>
        <p
          className="leading-relaxed mb-3"
          style={{
            color: "var(--text-muted)",
            fontSize: "1rem",
            lineHeight: 1.7,
          }}
        >
          {text}
        </p>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Paso ${position}: ${name}`}
            className="rounded-lg max-w-full h-auto border mt-3"
            style={{ borderColor: "var(--border-subtle)" }}
            loading="lazy"
          />
        )}
      </div>
    </li>
  );
}
