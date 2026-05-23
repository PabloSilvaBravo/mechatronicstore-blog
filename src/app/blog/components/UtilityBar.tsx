/**
 * UtilityBar — banner top con mensaje "Envío gratis".
 *
 * Pablo 23-may-2026 v7 — auditoría Playwright del store confirmó:
 * banner-container-fixed del store es bg NEGRO sólido #000000, h 44px,
 * fontSize 15px, color texto blanco PLANO (sin acentos amarillos).
 * Versiones anteriores tenían gradient morado + palabras amarillas
 * — eso era invención que no existe en el store.
 *
 * Server component sin JS.
 */
export default function UtilityBar() {
  return (
    <a
      href="https://www.mechatronicstore.cl/envios-y-despachos/?utm_source=blog&utm_medium=utility_bar&utm_campaign=envio_gratis"
      className="block w-full text-center font-medium hover:opacity-90 transition-opacity"
      style={{
        background: "#000000",
        color: "#ffffff",
        fontSize: "15px",
        padding: "8px 12px",
        letterSpacing: "0.01em",
      }}
    >
      ¡Envío gratis a todo Chile en compras sobre <strong>$19.990</strong>!
    </a>
  );
}
