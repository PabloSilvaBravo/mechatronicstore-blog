/**
 * materials-matching.ts
 *
 * Lógica de match material ↔ producto para la lista de materiales de un
 * tutorial. Extraída de MaterialsList.tsx para poder testearse de forma
 * aislada y usarse desde otros módulos.
 *
 * Estrategia:
 *  1. Si el producto trae `matched_material` (campo explícito del pipeline AI)
 *     → match exacto normalizado. Evita falsos positivos fuzzy (el bug clásico:
 *     "Tarjeta microSD con Raspberry Pi OS" matcheaba por token "Raspberry Pi").
 *  2. Si ningún producto con matched_material hizo match, se intenta el fuzzy
 *     legacy (R1-R5) SOLO contra productos SIN matched_material — retrocompat.
 */

// ---------------------------------------------------------------------------
// Constantes y helpers del fuzzy legacy (movidas desde MaterialsList.tsx)
// ---------------------------------------------------------------------------

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
// también un valor (220, 5mm, 10k, etc.) — regla R4.
// O via R5 (Pablo 22-may-2026): single-token generic matchea contra
// catálogo con mismo token, sin necesidad de valor numérico.
const GENERIC_COMPONENTS = new Set([
  "led", "leds", "resistencia", "resistencias", "resistor",
  "diodo", "diodos", "transistor", "transistores",
  "capacitor", "capacitores", "condensador", "condensadores",
  "potenciometro", "potenciómetro", "trimpot",
  "protoboard", "breadboard", "matriz", "jumper", "jumpers",
  "boton", "botón", "pulsador", "pulsadores", "switch", "rele", "relé",
  "servo", "servomotor", "motor", "stepper", "encoder",
  "buzzer", "altavoz", "speaker", "microfono", "micrófono",
  "fuente", "fuentes", "regulador", "reguladores",
  "bateria", "batería", "baterias", "baterías",
  "cargador", "cargadores", "powerbank", "pila", "pilas",
  "cable", "cables", "header", "headers", "conector", "conectores",
  "modulo", "módulo", "modulos", "módulos",
  "antena", "antenas",
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
 * Fuzzy legacy: Match producto ↔ material. Cuatro reglas crecientes:
 *
 *  R1. Exact match `name_original` == `material.name` (case-insensitive).
 *  R2. ≥2 tokens (4+ chars) compartidos — fuzzy original.
 *  R3. ≥1 keyword técnico ÚNICO compartido (ESP32, TM1637, DHT22, etc.)
 *      Estos son IDs de chip — sin ambigüedad.
 *  R4. ≥1 componente genérico compartido (led, resistencia…) + ≥1 valor
 *      numérico compartido (220, 5mm, 10k…). "LED 5mm" matchea con
 *      "LED 5mm rojo", "Resistencia 220Ω" matchea con "Resistencias 220Ω".
 *  R5. Material es UN solo token GENÉRICO → matchea contra cualquier
 *      producto que tenga ese mismo token genérico.
 *
 * Pablo 18-may-2026: el fuzzy R2 solo era muy estricto — productos que
 * existían en catálogo aparecían "no disponible" porque el LLM nombró el
 * producto en inglés ("ESP32 development board") vs el material en español
 * ("Placa ESP32 DevKit").
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fuzzyMatch<T extends { name_original: string; [k: string]: any }>(
  materialName: string,
  products: T[],
): T | undefined {
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

    // R5 (Pablo 22-may-2026): material es UN solo token GENÉRICO
    // (protoboard, jumpers, servo, buzzer, fuente) → matchea contra
    // cualquier producto que tenga ese MISMO token genérico.
    // Safe porque el LLM ya filtró por match_score ≥ 0.7 al guardar en
    // linked_products — los matches son editorialmente aprobados.
    // Sin R5, materiales single-token quedaban como "no disponible"
    // aunque el producto SÍ estaba en linked_products (e.g. "Protoboard"
    // como material no matcheaba "Protoboard 830 puntos" del catálogo
    // porque solo comparte 1 token de 4+ chars).
    if (mlTokensAll.length <= 2 && mlGenericComps.size >= 1) {
      const sharedGeneric = [...plGenericComps].some((t) => mlGenericComps.has(t));
      if (sharedGeneric) return p;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

function norm(s: string): string {
  return (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

type P = { name_original: string; matched_material?: string | null; [k: string]: unknown };

/**
 * Encuentra el producto de `products` que corresponde al material `materialName`.
 *
 * Estrategia de dos capas:
 *  1. Si algún producto tiene `matched_material` igual al nombre del material
 *     (normalizado), ese es el match — sin fuzzy, sin ambigüedad.
 *  2. Si ningún producto con `matched_material` matchea, aplica el fuzzy
 *     legacy (R1-R5) SOLO contra los productos que NO tienen `matched_material`.
 *     Esto preserva la retrocompat con tutoriales viejos sin ese campo.
 *
 * Si TODOS los productos tienen `matched_material` pero ninguno matchea el
 * material actual → retorna `undefined` (el material no tiene producto).
 */
export function matchProductToMaterial<T extends P>(
  materialName: string,
  products: T[],
): T | undefined {
  const ml = norm(materialName);

  // Capa 1: match explícito por matched_material
  const explicit = products
    .filter((p) => p.matched_material != null)
    .find((p) => norm(p.matched_material as string) === ml);
  if (explicit) return explicit;

  // Capa 2: fuzzy legacy solo contra productos sin matched_material
  const unmapped = products.filter((p) => p.matched_material == null);
  if (unmapped.length === 0) return undefined;
  return fuzzyMatch(materialName, unmapped) as T | undefined;
}
