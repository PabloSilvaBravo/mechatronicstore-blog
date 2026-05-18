/**
 * UtilityBar — banner top con mensaje "Envío gratis" que replica
 * literal el de mechatronicstore.cl.
 *
 * Pablo 18-may-2026 audit "harmonizar header con store": esta es la
 * primera fila del header del store y es la que más unifica los dos
 * sitios visualmente. El usuario que viene de la tienda al blog la ve
 * arriba de todo y registra "es el mismo sitio".
 *
 * Adaptado: misma estructura, mismo gradient purple, "Envío gratis"
 * y monto en yellow. Único cambio: linkeable a /envios del store para
 * que el clic lleve a más info.
 *
 * Server component sin JS.
 */
export default function UtilityBar() {
  return (
    <a
      href="https://www.mechatronicstore.cl/envios-y-despachos/?utm_source=blog&utm_medium=utility_bar&utm_campaign=envio_gratis"
      className="block w-full text-center text-[13px] sm:text-sm py-2.5 font-medium hover:opacity-90 transition-opacity"
      style={{
        background:
          "linear-gradient(90deg, #2a0f57 0%, #4a1296 50%, #2a0f57 100%)",
        color: "#ffffff",
        letterSpacing: "0.01em",
      }}
    >
      <span style={{ color: "var(--brand-yellow)", fontWeight: 700 }}>
        ¡Envío gratis
      </span>{" "}
      a todo Chile en compras sobre{" "}
      <span style={{ color: "var(--brand-yellow)", fontWeight: 700 }}>
        $19.990
      </span>
      !
    </a>
  );
}
