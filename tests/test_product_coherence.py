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

def test_legacy_sin_mapeo_usa_fuzzy_por_token_unico():
    prods = [{"name_original": "Cámara USB OV5640", "matched_material": None}]
    clean, dropped = validate_product_coherence(MATERIALS, prods)
    assert len(clean) == 1
