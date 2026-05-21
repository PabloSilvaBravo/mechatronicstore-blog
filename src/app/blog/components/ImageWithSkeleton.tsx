"use client";

import { useState, type ImgHTMLAttributes } from "react";

// Pablo 21-may-2026 Tier A: img con skeleton loader gris animado.
// Reemplaza el flash blanco/transparente mientras la img carga. Inspirado
// en MechaNoticias/ImageWithSkeleton.tsx.
//
// Uso:
//   <ImageWithSkeleton src={hero} alt="..." className="card-img w-full h-44" />
//
// Mantiene compatibilidad con todos los attrs nativos (referrerPolicy,
// loading, etc.). El skeleton se desvanece smooth cuando onLoad dispara.

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError"> {
  aspectRatio?: string;     // "16/9", "3/2"; default sin aspect-ratio (usa className)
  rounded?: boolean;        // round corners on skeleton (default true)
}

export default function ImageWithSkeleton({
  src,
  alt,
  className = "",
  style,
  aspectRatio,
  rounded = true,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src) return null;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        ...style,
        aspectRatio: aspectRatio ?? (style as { aspectRatio?: string })?.aspectRatio,
        background: loaded || errored ? "transparent" : "var(--bg-elevated)",
      }}
    >
      {!loaded && !errored && (
        <div
          aria-hidden
          className={`absolute inset-0 ${rounded ? "" : ""}`}
          style={{
            background:
              "linear-gradient(90deg, var(--bg-elevated) 0%, color-mix(in srgb, var(--brand-purple) 8%, var(--bg-elevated)) 50%, var(--bg-elevated) 100%)",
            backgroundSize: "200% 100%",
            animation: "blog-skel-shimmer 1.4s ease-in-out infinite",
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        loading={rest.loading ?? "lazy"}
        referrerPolicy={rest.referrerPolicy ?? "no-referrer"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: loaded ? 1 : 0,
          transition: "opacity 280ms ease-out",
        }}
        {...rest}
      />
    </div>
  );
}
