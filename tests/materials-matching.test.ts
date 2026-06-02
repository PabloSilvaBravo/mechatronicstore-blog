import { describe, it, expect } from "vitest";
import { matchProductToMaterial } from "../src/lib/materials-matching";

const PI = { name_original: "Raspberry Pi 4 Model B", product_id: "GS3-1", wc_id: 1, price_clp: 49990, stock_available: true, product_url: "", image_url: "", matched_material: "Raspberry Pi (Pi Zero 2 W, Pi 3, Pi 4 o Pi 5)" };
const SD_PROD = { name_original: "Tarjeta microSD 32GB", product_id: "C-901", wc_id: 2, price_clp: 6990, stock_available: true, product_url: "", image_url: "", matched_material: "Tarjeta microSD 8 GB o más con Raspberry Pi OS" };

describe("matchProductToMaterial — mapeo explícito", () => {
  it("la microSD NO matchea el producto Raspberry Pi (bug histórico)", () => {
    const m = matchProductToMaterial("Tarjeta microSD 8 GB o más con Raspberry Pi OS", [PI, SD_PROD]);
    expect(m?.product_id).toBe("C-901");
  });
  it("el material Raspberry Pi matchea SOLO el producto Pi", () => {
    const m = matchProductToMaterial("Raspberry Pi (Pi Zero 2 W, Pi 3, Pi 4 o Pi 5)", [PI, SD_PROD]);
    expect(m?.product_id).toBe("GS3-1");
  });
  it("un producto sin material correspondiente no se devuelve para materiales ajenos", () => {
    const ORPHAN = { name_original: "Protoboard 830", product_id: "C-302", wc_id: 3, price_clp: 3790, stock_available: true, product_url: "", image_url: "", matched_material: "Protoboard" };
    const m = matchProductToMaterial("Cámara USB", [ORPHAN]);
    expect(m).toBeUndefined();
  });
});
