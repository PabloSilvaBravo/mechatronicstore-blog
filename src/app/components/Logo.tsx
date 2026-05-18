/* eslint-disable @next/next/no-img-element */
interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Logo del Blog MechatronicStore — usa la misma técnica que mechanews:
 * SVG vectorial "mechatronic" (purple #6017b1) + span complementario
 * "BLOG" (yellow brand) con Baloo, alineado abajo a la derecha.
 *
 * Pablo 18-may-2026: "el logo quiero hacer lo mismo que hicimos en
 * mecha noticias — mechatronic morado + blog amarillo".
 */
export default function Logo({ className = "", size = "md" }: LogoProps) {
  // "BLOG" debe ser ~45-55% del height de "mechatronic", colocado abajo.
  const config = {
    sm: { imgH: 24, fontSize: 13, letterSpacing: "0.14em" },
    md: { imgH: 38, fontSize: 20, letterSpacing: "0.15em" },
    lg: { imgH: 56, fontSize: 28, letterSpacing: "0.15em" },
  };
  const { imgH, fontSize, letterSpacing } = config[size];

  return (
    <div
      className={`inline-flex flex-col ${className}`}
      style={{ lineHeight: 1 }}
    >
      <img
        src="/logo-mechastore-blog.svg?v=1"
        alt="Blog MechatronicStore"
        style={{ height: `${imgH}px`, width: "auto", display: "block" }}
      />
      <span
        style={{
          fontFamily: "var(--font-baloo), system-ui, sans-serif",
          fontWeight: 800,
          color: "var(--brand-yellow)",
          fontSize: `${fontSize}px`,
          letterSpacing,
          marginTop: "2px",
          alignSelf: "flex-end",
          paddingRight: `${imgH * 0.05}px`,
          lineHeight: 1,
        }}
      >
        BLOG
      </span>
    </div>
  );
}
