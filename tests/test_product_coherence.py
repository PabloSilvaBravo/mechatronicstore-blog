import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from content_swarm_lib import validate_product_coherence

MATERIALS = [
    {"name": "D-Robotics RDK X5 (placa con NPU integrada)"},
    {"name": "Cámara USB"},
]

def test_descarta_producto_huerfano():
    prods = [
        {"name_original": "Cable macho a hembra 10 cm", "matched_material": None},
        {"name_original": "Protoboard 830 puntos", "matched_material": None},
    ]
    clean, dropped = validate_product_coherence(MATERIALS, prods)
    assert clean == []
    assert len(dropped) == 2

def test_mantiene_producto_con_material_mapeado():
    prods = [{"name_original": "Cámara USB OV5640", "matched_material": "Cámara USB"}]
    clean, dropped = validate_product_coherence(MATERIALS, prods)
    assert len(clean) == 1
    assert dropped == []

def test_legacy_sin_mapeo_usa_fuzzy_r2_dos_tokens():
    # R2: "Robotics RDK X5" comparte "robotics"+"placa" NO; pero "rdk" es 3 chars.
    # Caso limpio R2: placa ESP32 WROOM comparte "wroom"+"esp32" (via R3 de hecho).
    # Usamos un caso de R2 puro: 2 tokens 4+ chars compartidos.
    mats = [{"name": "Sensor DHT22 temperatura humedad"}]
    prods = [{"name_original": "Sensor DHT22 temperatura ambiente", "matched_material": None}]
    clean, dropped = validate_product_coherence(mats, prods)
    # "sensor","dht22","temperatura","humedad" vs "sensor","dht22","temperatura","ambiente"
    # tokens 4+ compartidos: "sensor","dht22","temperatura" -> 3 >= 2 -> R2 match
    assert len(clean) == 1


def test_mantiene_led_5mm_rojo_para_material_led_5mm():
    # FALSO POSITIVO historico: el frontend SI muestra "LED 5mm rojo" para "LED 5mm" (R4)
    mats = [{"name": "LED 5mm"}, {"name": "Resistencia 220"}]
    prods = [{"name_original": "LED 5mm rojo", "matched_material": None}]
    clean, dropped = validate_product_coherence(mats, prods)
    assert len(clean) == 1, "el LED 5mm rojo debe mantenerse (R4 generico+valor)"


def test_mantiene_esp32_por_keyword_tecnico():
    mats = [{"name": "Placa ESP32 WROOM 32D"}]
    prods = [{"name_original": "Modulo ESP32 DevKit", "matched_material": None}]
    clean, dropped = validate_product_coherence(mats, prods)
    assert len(clean) == 1, "comparten keyword tecnico unico esp32 (R3)"


def test_sigue_descartando_basura_real():
    mats = [{"name": "D-Robotics RDK X5"}, {"name": "Cámara USB"}]
    prods = [
        {"name_original": "Cable macho a hembra 10 cm", "matched_material": None},
        {"name_original": "Protoboard 830 puntos", "matched_material": None},
    ]
    clean, dropped = validate_product_coherence(mats, prods)
    assert clean == [] and len(dropped) == 2, "cable+protoboard son basura real (no matchean R1-R5)"
