/**
 * UtilityBar — banner top con mensaje "Envío gratis".
 *
 * Pablo 23-may-2026 v9 — replica EXACTA del banner del store. Auditoría
 * del HTML real reveló los valores precisos (commit del fix v8 anterior
 * tenía bg morado e inventé un link 404). HTML real del store:
 *
 *   <div class="banner-container-fixed">
 *     <p style="margin: 0; line-height: 1.4; color: #fff; font-weight: 500; text-align: center;">
 *       ¡<span style="color: #ffef37;">Envío gratis</span> a todo Chile
 *       en compras sobre <span style="color: #ffef37;">$19.990</span>!
 *     </p>
 *     <style>.banner-container-fixed { background-color: #000; padding: 8px 12px; font-size: 15px; }</style>
 *   </div>
 *
 * Notas críticas:
 *   - bg `#000` (no morado, no gradient)
 *   - "Envío gratis" y "$19.990" en `#ffef37` (amarillo brillante)
 *   - NO ES LINK — es un `<p>` no un `<a>`. Mi versión anterior tenía
 *     href a /envios-y-despachos/ que devuelve 404.
 *   - font-weight 500, font-size 15px, line-height 1.4, padding 8px 12px
 *
 * Server component sin JS.
 */
export default function UtilityBar() {
  // Pablo 23-may-2026 v10 — Pablo señaló que el bg del store NO es plano
  // negro sino un GRADIENT animado. Playwright reveló los valores reales:
  //
  //   background: #000 linear-gradient(#121212 -50%, #6017B1 200%, #000000 250%)
  //               0% 0% / 140% 100% repeat;
  //   animation: bannerShift 22s ease-in-out infinite alternate;
  //
  // Los stops fuera de rango (-50%, 200%, 250%) hacen que el viewport
  // muestre solo una franja del gradient — predominantemente negro con
  // tinte morado que se desplaza horizontalmente cada 22s.
  //
  // @keyframes bannerShift en globals.css.
  return (
    <div
      className="banner-container-fixed"
      style={{
        backgroundColor: "#000",
        backgroundImage:
          "linear-gradient(#121212 -50%, #6017B1 200%, #000000 250%)",
        backgroundSize: "140% 100%",
        backgroundRepeat: "repeat",
        animation: "bannerShift 22s ease-in-out infinite alternate",
        padding: "8px 12px",
        fontSize: "15px",
      }}
    >
      <p
        style={{
          margin: 0,
          lineHeight: 1.4,
          color: "#ffffff",
          fontWeight: 500,
          textAlign: "center",
        }}
      >
        ¡<span style={{ color: "#ffef37" }}>Envío gratis</span> a todo Chile en
        compras sobre <span style={{ color: "#ffef37" }}>$19.990</span>!
      </p>
    </div>
  );
}
