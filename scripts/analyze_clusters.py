"""
Analiza si vale la pena implementar clustering (Fase 2 del editorial overhaul).

Pablo 20-may-2026: antes de gastar 4h en implementar clustering en
Routines B+C, medir cuántos clusters reales hay en el material existente.

Estrategia: por cada par de tutoriales (drafts + ranked + rejected),
calcular similitud basada en:
- title keywords overlap (Jaccard) — peso 0.40
- component tokens overlap (ESP32, DHT22, etc.) — peso 0.30
- category match — peso 0.20
- title sequence similarity (SequenceMatcher) — peso 0.10

Reportar pares con similitud >= 0.55 (umbral generoso para no perderse
clusters reales). Decisión: si hay ≥5 clusters de ≥2 miembros, vale
implementar Fase 2.
"""
import sys
import re
import json
from itertools import combinations
from pathlib import Path
from collections import defaultdict
from difflib import SequenceMatcher

sys.path.insert(0, str(Path(__file__).parent))
import db

# Keywords técnicas conocidas — overlap por SET en lugar de fuzzy
COMPONENT_TOKENS = {
    # Microcontroladores
    "esp32", "esp8266", "esp32c3", "esp32s3", "esp32s2", "esp32c6",
    "arduino", "uno", "nano", "mega", "pico", "rp2040", "rp2350",
    "raspberry", "rpi", "stm32", "samd21",
    # Displays
    "tm1637", "max7219", "ssd1306", "ili9341", "st7735", "st7789",
    "oled", "lcd", "tft", "e-paper", "epaper", "neopixel", "ws2812",
    # Sensores
    "dht11", "dht22", "ds18b20", "bme280", "bmp280", "bme680",
    "mpu6050", "mpu9250", "hc-sr04", "vl53l0x", "tcs34725",
    "mq2", "mq135", "ldr", "pir", "tcrt5000",
    # Drivers motor
    "l298n", "a4988", "drv8825", "tmc2208", "tmc2209",
    # Módulos comm
    "nrf24l01", "hc05", "hc06", "rfid", "rc522", "lora", "wifi",
    "bluetooth", "ble", "mqtt", "homekit", "esp-now", "espnow",
    # Cámaras / specialty
    "ov2640", "ov7670", "esp32cam", "esp32-cam",
    # Domótica
    "home-assistant", "zigbee", "thread", "matter",
    # IDE/lang
    "micropython", "circuitpython", "platformio", "arduino-ide",
    "esp-idf", "tasmota",
}

CATEGORY_TOKENS = {
    "tutorial", "diy", "guide", "project", "iot", "domotica", "robot",
}


def normalize(text):
    if not text:
        return set()
    txt = re.sub(r"[^a-z0-9\-\s]", " ", text.lower())
    return set(t for t in txt.split() if len(t) >= 3)


def extract_components(text):
    """Extrae tokens técnicos conocidos del texto."""
    if not text:
        return set()
    tokens = normalize(text)
    return tokens & COMPONENT_TOKENS


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def similarity(t1, t2):
    """Score 0-1. >=0.55 = cluster candidato."""
    # Title keywords
    title_sim = jaccard(normalize(t1["title"]), normalize(t2["title"]))

    # Components shared
    comp_sim = jaccard(t1["components"], t2["components"])

    # Category match
    cat_sim = 1.0 if (t1["category"] and t1["category"] == t2["category"]) else 0.0

    # Title char similarity
    seq_sim = SequenceMatcher(None, t1["title"].lower(), t2["title"].lower()).ratio()

    return (
        0.40 * title_sim +
        0.30 * comp_sim +
        0.20 * cat_sim +
        0.10 * seq_sim
    )


def main():
    # Cargar tutoriales con material útil (no los puramente rejected sin body)
    rows = db.execute("""
        SELECT id, source_id, status, title_en, title_es, category,
               SUBSTR(COALESCE(body_en, ''), 1, 2000) AS body_sample,
               source_language
        FROM tutorials
        WHERE COALESCE(title_en, title_es, '') != ''
          AND status IN ('draft', 'ranked', 'rejected', 'published')
    """).fetchall()

    items = []
    for r in rows:
        title = r[3] or r[4] or ""
        items.append({
            "id": r[0],
            "source_id": r[1],
            "status": r[2],
            "title": title,
            "category": r[5],
            "components": extract_components(title + " " + (r[6] or "")),
            "source_language": r[7] or "other",
        })

    print(f"Total items: {len(items)}")
    by_status = defaultdict(int)
    by_lang = defaultdict(int)
    for it in items:
        by_status[it["status"]] += 1
        by_lang[it["source_language"]] += 1
    print(f"  by status: {dict(by_status)}")
    print(f"  by language: {dict(by_lang)}")

    # Buscar pares similares
    pairs = []
    for a, b in combinations(items, 2):
        # No mezclar published con drafts (no se puede re-clusterizar lo publicado)
        if a["status"] == "published" and b["status"] == "published":
            continue
        sim = similarity(a, b)
        if sim >= 0.55:
            pairs.append((sim, a, b))

    pairs.sort(key=lambda x: -x[0])
    print(f"\nPares con similitud >= 0.55: {len(pairs)}")

    # Construir clusters (transitive closure: si A~B y B~C, cluster {A,B,C})
    parent = {it["id"]: it["id"] for it in items}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[rx] = ry

    for sim, a, b in pairs:
        union(a["id"], b["id"])

    clusters = defaultdict(list)
    for it in items:
        clusters[find(it["id"])].append(it)
    multi_clusters = {k: v for k, v in clusters.items() if len(v) >= 2}

    print(f"\nClusters de ≥2 miembros: {len(multi_clusters)}")
    print(f"Items en clusters: {sum(len(v) for v in multi_clusters.values())}")

    # Mostrar clusters detalladamente
    sorted_clusters = sorted(multi_clusters.values(), key=lambda c: -len(c))
    print(f"\n=== TOP {min(20, len(sorted_clusters))} CLUSTERS ===\n")
    for i, c in enumerate(sorted_clusters[:20]):
        # Mezcla de status interesante
        langs = set(it["source_language"] for it in c)
        statuses = set(it["status"] for it in c)
        sources = set(it["source_id"] for it in c)
        print(f"#{i+1} Cluster ({len(c)} miembros) — langs={langs}  statuses={statuses}  sources={len(sources)}")
        for it in c:
            print(f"    [{it['status']:9s}|{it['source_language']:5s}] {it['source_id']:25s}  {it['title'][:55]}")
        print()

    # Métricas para decisión
    es_clusters = [c for c in multi_clusters.values() if any(it["source_language"] == "es" for it in c)]
    print(f"=== DECISIÓN ===")
    print(f"Clusters totales: {len(multi_clusters)}")
    print(f"Clusters con ≥1 item en español: {len(es_clusters)}")
    print(f"Items totales en clusters: {sum(len(v) for v in multi_clusters.values())}")

    # Output JSON
    out = {
        "analyzed_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "total_items": len(items),
        "total_clusters_multi": len(multi_clusters),
        "es_clusters": len(es_clusters),
        "items_in_clusters": sum(len(v) for v in multi_clusters.values()),
        "clusters": [
            {
                "size": len(c),
                "languages": list(set(it["source_language"] for it in c)),
                "statuses": list(set(it["status"] for it in c)),
                "sources": list(set(it["source_id"] for it in c)),
                "members": [
                    {"id": it["id"], "status": it["status"], "lang": it["source_language"],
                     "source": it["source_id"], "title": it["title"]}
                    for it in c
                ]
            }
            for c in sorted_clusters
        ],
    }
    out_path = Path(__file__).parent.parent / "data" / "cluster-analysis.json"
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(f"\n✓ Wrote {out_path}")


if __name__ == "__main__":
    main()
