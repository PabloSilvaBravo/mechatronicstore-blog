import type { TutorialPublished } from "@/lib/db/queries";
import TrackableLink from "./TrackableLink";

interface Props {
  materials: TutorialPublished["materials_list"];
  linkedProducts: TutorialPublished["linked_products"];
  slug: string;
}

function buildProductUrl(
  rawUrl: string,
  slug: string,
  productId: number,
): string {
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("utm_source", "blog");
    u.searchParams.set("utm_medium", "tutorial");
    u.searchParams.set("utm_campaign", slug);
    u.searchParams.set("utm_content", String(productId));
    return u.toString();
  } catch {
    return rawUrl;
  }
}

// Keywords técnicos ÚNICOS de componentes: si aparece UNO de estos en
// ambos lados (material + producto) → match aunque sea el único token
// compartido. Son IDs únicos del catálogo electrónico — sin colisiones.
const UNIQUE_TECH_KEYWORDS = new Set([
  // Microcontroladores
  "esp32", "esp8266", "esp32c3", "esp32s3", "esp32s2", "esp32c6",
  "arduino", "raspberry", "rpi", "pico", "rp2040", "rp2350",
  "atmega", "attiny", "stm32", "samd21", "nrf52",
  // Drivers display 7-seg / LED matrix
  "tm1637", "max7219", "ht16k33",
  // Pantallas OLED/LCD
  "ssd1306", "ssh1106", "hd44780", "pcd8544",
  // TFT
  "ili9341", "st7735", "st7789", "st7796", "gc9a01",
  // LEDs direccionables
  "ws2812", "ws2812b", "ws2811", "sk6812", "neopixel", "apa102",
  // Sensores
  "dht11", "dht22", "ds18b20", "bme280", "bmp280", "bme680",
  "mpu6050", "mpu9250", "mlx90614", "max30100", "max30102",
  "hc-sr04", "hcsr04", "vl53l0x", "tcs34725", "tcrt5000",
  "mq2", "mq3", "mq4", "mq6", "mq7", "mq135",
  // Drivers motor
  "l298n", "l293d", "a4988", "drv8825", "tmc2208", "tmc2209", "tmc5160",
  // Módulos
  "nrf24l01", "hc05", "hc06", "rfid", "rc522", "pn532",
  "max31855", "max31865", "ads1115", "mcp23017", "pca9685",
  // Cámaras
  "ov2640", "ov7670", "ov5640",
]);

// Componentes GENÉRICOS comunes (no únicos): solo matchean si comparten
// también un valor (220, 5mm, 10k, etc.).
const GENERIC_COMPONENTS = new Set([
  "led", "leds", "resistencia", "resistencias", "resistor",
  "diodo", "diodos", "transistor", "transistores",
  "capacitor", "capacitores", "condensador",
  "potenciometro", "potenciómetro", "trimpot",
  "protoboard", "breadboard", "matriz", "jumper", "jumpers",
  "boton", "botón", "pulsador", "switch", "rele", "relé",
  "servo", "motor", "stepper", "encoder",
  "buzzer", "altavoz", "speaker", "microfono", "micrófono",
  "fuente", "regulador", "bateria", "batería", "cargador",
]);

// Tokens numéricos / valores: 220, 220k, 5mm, 10uf, 3v3, etc.
const VALUE_RE = /^\d+(?:[a-zA-Z]+|[.,]\d+)?$/;

function tokenize(s: string): string[] {
  const raw = s
    .toLowerCase()
    .split(/[^a-záéíóúñ0-9]+/i)
    .filter((t) => t.length > 0);

  // Pablo 18-may-2026: bug "LED 5 mm" no matcheaba con "LED 5mm rojo"
  // porque "5 mm" tokeniza como ["5", "mm"] vs "5mm" como ["5mm"]. Acá
  // sintetizamos también la concatenación `\d+` + adyacente alfa → "5mm",
  // así ambos lados comparten el mismo token-valor.
  const synthesized: string[] = [];
  for (let i = 0; i < raw.length; i++) {
    synthesized.push(raw[i]);
    if (
      /^\d+$/.test(raw[i]) &&
      i + 1 < raw.length &&
      /^[a-záéíóúñ]+$/i.test(raw[i + 1])
    ) {
      synthesized.push(raw[i] + raw[i + 1]);
    }
  }
  return synthesized;
}

/**
 * Match producto ↔ material. Tres reglas crecientes:
 *
 *  R1. Exact match `name_original` == `material.name` (case-insensitive).
 *  R2. ≥2 tokens (4+ chars) compartidos — fuzzy original.
 *  R3. ≥1 keyword técnico ÚNICO compartido (ESP32, TM1637, DHT22, etc.)
 *      Estos son IDs de chip — sin ambigüedad.
 *  R4. ≥1 componente genérico compartido (led, resistencia…) + ≥1 valor
 *      numérico compartido (220, 5mm, 10k…). "LED 5mm" matchea con
 *      "LED 5mm rojo", "Resistencia 220Ω" matchea con "Resistencias 220Ω".
 *
 * Pablo 18-may-2026: el fuzzy R2 solo era muy estricto — productos que
 * existían en catálogo aparecían "no disponible" porque el LLM nombró el
 * producto en inglés ("ESP32 development board") vs el material en español
 * ("Placa ESP32 DevKit").
 */
function findProduct(
  materialName: string,
  products: Props["linkedProducts"],
): Props["linkedProducts"][number] | undefined {
  const ml = materialName.toLowerCase();

  // R1: exact match
  const exact = products.find((p) => p.name_original.toLowerCase() === ml);
  if (exact) return exact;

  const mlTokensAll = tokenize(ml);
  const mlTokens4 = new Set(mlTokensAll.filter((t) => t.length >= 4));
  const mlTechKeys = new Set(mlTokensAll.filter((t) => UNIQUE_TECH_KEYWORDS.has(t)));
  const mlGenericComps = new Set(mlTokensAll.filter((t) => GENERIC_COMPONENTS.has(t)));
  const mlValues = new Set(mlTokensAll.filter((t) => VALUE_RE.test(t)));

  for (const p of products) {
    const plTokensAll = tokenize(p.name_original);
    const plTokens4 = new Set(plTokensAll.filter((t) => t.length >= 4));

    // R2: ≥2 tokens 4+ chars
    const overlap4 = [...plTokens4].filter((t) => mlTokens4.has(t)).length;
    if (overlap4 >= 2) return p;

    // R3: ≥1 keyword técnico único compartido
    const plTechKeys = new Set(plTokensAll.filter((t) => UNIQUE_TECH_KEYWORDS.has(t)));
    const techOverlap = [...plTechKeys].filter((t) => mlTechKeys.has(t));
    if (techOverlap.length >= 1) return p;

    // R4: componente genérico + valor numérico compartidos
    const plGenericComps = new Set(plTokensAll.filter((t) => GENERIC_COMPONENTS.has(t)));
    const plValues = new Set(plTokensAll.filter((t) => VALUE_RE.test(t)));
    const compOverlap = [...plGenericComps].filter((t) => mlGenericComps.has(t)).length;
    const valOverlap = [...plValues].filter((t) => mlValues.has(t)).length;
    if (compOverlap >= 1 && valOverlap >= 1) return p;
  }

  return undefined;
}

export default function MaterialsList({
  materials,
  linkedProducts,
  slug,
}: Props) {
  const linked = materials
    .map((m) => ({ m, product: findProduct(m.name, linkedProducts) }))
    .filter((x) => x.product);
  const unlinked = materials
    .map((m) => ({ m, product: findProduct(m.name, linkedProducts) }))
    .filter((x) => !x.product);

  return (
    <section
      className="my-10 overflow-hidden rounded-xl border"
      style={{
        borderColor: "var(--border-strong)",
        backgroundColor: "var(--bg-elevated)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 border-b flex items-center gap-3"
        style={{
          borderColor: "var(--border-subtle)",
          backgroundColor: "color-mix(in srgb, var(--brand-purple) 8%, transparent)",
        }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
          style={{ backgroundColor: "var(--brand-purple)" }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="white"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
            />
          </svg>
        </div>
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: "var(--text-accent)" }}
          >
            Necesitás
          </div>
          <h2
            className="font-headline text-xl"
            style={{ color: "var(--text)" }}
          >
            Lista de materiales
          </h2>
        </div>
      </div>

      {/* Lista */}
      <ul>
        {[...linked, ...unlinked].map(({ m, product }, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-4 px-5 py-4 border-b last:border-b-0"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className="mt-1 flex-shrink-0 w-5 h-5 flex items-center justify-center"
                style={{ color: product ? "var(--brand-yellow)" : "var(--text-dim)" }}
              >
                {product ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="font-semibold leading-snug"
                  style={{ color: "var(--text)" }}
                >
                  {m.name}
                  {m.qty && m.qty > 1 ? (
                    <span
                      className="ml-2 text-sm font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      ×{m.qty}
                    </span>
                  ) : null}
                </div>
                {m.role && (
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {m.role}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {product ? (
                <>
                  <span
                    className="text-sm font-bold whitespace-nowrap"
                    style={{ color: "var(--text)" }}
                  >
                    ${product.price_clp.toLocaleString("es-CL")}
                  </span>
                  <TrackableLink
                    href={buildProductUrl(product.product_url, slug, product.product_id)}
                    slug={slug}
                    source="material_list"
                    productId={String(product.product_id)}
                    productName={product.name_original}
                    className="btn-luis inline-flex items-center gap-1 text-xs font-bold rounded-md whitespace-nowrap"
                    style={{
                      backgroundColor: "var(--brand-yellow)",
                      color: "var(--text-on-yellow)",
                      padding: "0.4rem 0.75rem",
                      borderRadius: "0.375rem",
                    }}
                  >
                    Agregar →
                  </TrackableLink>
                </>
              ) : (
                <span
                  className="text-xs italic whitespace-nowrap"
                  style={{ color: "var(--text-dim)" }}
                >
                  no disponible
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
