/**
 * UtilityBar — banner top con mensaje "Envío gratis".
 *
 * Pablo 23-may-2026 v8 — CORRECCIÓN tras review visual de Pablo: la
 * utility bar del store NO es negra. Es MORADO OSCURO (~#3c1171), no
 * el negro `#000000` que medía el JS (probablemente leyó
 * backgroundColor pero el bg visible viene de un layer encima).
 *
 * Server component sin JS.
 */
export default function UtilityBar() {
  return (
    <a
      href="https://www.mechatronicstore.cl/envios-y-despachos/?utm_source=blog&utm_medium=utility_bar&utm_campaign=envio_gratis"
      className="block w-full text-center font-medium hover:opacity-90 transition-opacity"
      style={{
        background: "#3c1171",
        color: "#ffffff",
        fontSize: "14px",
        padding: "10px 12px",
        letterSpacing: "0.01em",
      }}
    >
      ¡Envío gratis a todo Chile en compras sobre <strong>$19.990</strong>!
    </a>
  );
}
