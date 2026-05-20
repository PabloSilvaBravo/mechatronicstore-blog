"""
Health-check del pipeline de blog. Corre cada 2h via GH Actions.

Pablo 20-may-2026: con 42 sources activas + pipeline editorial complejo,
necesitamos visibilidad continua. Si algo falla en silencio (Routine B
no corre, scoring 0%, source bloqueada), perdemos throughput sin enterarnos.

Métricas que se chequean:
1. Drafts pendientes — alerta si >150 (cola creciendo, Routine B no procesa)
2. Published últimas 24h — alerta si =0 (pipeline congelado)
3. Ranked stuck — alerta si >5 (Routine C no traduce)
4. Rejected ratio últimas 48h — alerta si >95% (filtros mal calibrados)
5. Sources sin polleo últimas 48h — alerta si >25% (workflow ingest roto)
6. Editorial rejected ratio últimas 48h — alerta si >50% (Routine C produce
   muchos warnings de checklist)

Output:
- data/pipeline-health.json siempre (estado actual)
- stdout con "::error::" si hay alertas (GH Actions notifica al usuario)
- exit code 1 si alguna alerta crítica
"""
import os
import sys
import json
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db


# Thresholds — calibrados para volumen actual ~50 drafts/día, ~5 publish/día
ALERTS = {
    "drafts_pending_max": 150,        # cola normal <100
    "published_24h_min": 1,            # algo se publica cada día
    "ranked_stuck_max": 10,            # ranked esperando translate >10 = problema
    "rejected_ratio_48h_max": 0.95,   # 95%+ rejected = filtros mal
    "sources_silent_pct_max": 0.30,   # 30%+ sources sin pollear = ingest roto
    "editorial_rejected_ratio_48h_max": 0.60,  # >60% pegado por checklist = prompt mal
    "hero_images_4xx_max": 0,          # Pablo 20-may: cero tolerancia a heros muertos
}


def _check_hero_image(url: str, timeout: float = 5.0) -> int:
    """
    HEAD request a hero_image_url. Devuelve status code o -1 si timeout/error.
    Mandamos UA + Referer realistas para no falsear contra Cloudflare/WAF
    que devuelve 403 a curl pero 200 a navegador real.
    """
    try:
        req = urllib.request.Request(
            url,
            method="HEAD",
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/130.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.mechatronicstore.cl/",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return -1


def main():
    now = datetime.now(timezone.utc)
    report = {
        "checked_at": now.isoformat(),
        "metrics": {},
        "alerts": [],
        "status": "ok",
    }

    # === Métrica 1: Drafts pendientes ===
    r = db.execute(
        "SELECT COUNT(*) FROM tutorials WHERE status='draft' AND combined_score IS NULL"
    ).fetchone()
    drafts_pending = r[0]
    report["metrics"]["drafts_pending"] = drafts_pending
    if drafts_pending > ALERTS["drafts_pending_max"]:
        report["alerts"].append({
            "severity": "warning",
            "metric": "drafts_pending",
            "value": drafts_pending,
            "threshold": ALERTS["drafts_pending_max"],
            "message": f"Cola de drafts creciendo ({drafts_pending}). Routine B puede estar fallando o cron deshabilitado.",
        })

    # === Métrica 2: Published últimas 24h ===
    r = db.execute(
        "SELECT COUNT(*) FROM tutorials WHERE status='published' AND published_at >= datetime('now', '-24 hours')"
    ).fetchone()
    published_24h = r[0]
    report["metrics"]["published_24h"] = published_24h
    if published_24h < ALERTS["published_24h_min"]:
        report["alerts"].append({
            "severity": "critical",
            "metric": "published_24h",
            "value": published_24h,
            "threshold": ALERTS["published_24h_min"],
            "message": "Cero publicaciones en últimas 24h. Pipeline congelado — revisar Routine C + workflow translate-persist.",
        })

    # === Métrica 3: Ranked stuck ===
    r = db.execute("SELECT COUNT(*) FROM tutorials WHERE status='ranked'").fetchone()
    ranked_stuck = r[0]
    report["metrics"]["ranked_stuck"] = ranked_stuck
    if ranked_stuck > ALERTS["ranked_stuck_max"]:
        report["alerts"].append({
            "severity": "warning",
            "metric": "ranked_stuck",
            "value": ranked_stuck,
            "threshold": ALERTS["ranked_stuck_max"],
            "message": f"{ranked_stuck} tutoriales ranked esperando traducción. Routine C lenta o atascada.",
        })

    # === Métrica 4: Rejected ratio últimas 48h ===
    r = db.execute("""
        SELECT
          SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rej,
          SUM(CASE WHEN status='published' THEN 1 ELSE 0 END) AS pub,
          SUM(CASE WHEN status IN ('rejected', 'published') THEN 1 ELSE 0 END) AS total
        FROM tutorials
        WHERE updated_at >= datetime('now', '-48 hours')
    """).fetchone()
    rej_48h, pub_48h, total_48h = r[0] or 0, r[1] or 0, r[2] or 0
    rejected_ratio = (rej_48h / total_48h) if total_48h > 0 else 0
    report["metrics"]["rejected_ratio_48h"] = round(rejected_ratio, 3)
    report["metrics"]["published_48h"] = pub_48h
    report["metrics"]["rejected_48h"] = rej_48h
    if total_48h >= 10 and rejected_ratio > ALERTS["rejected_ratio_48h_max"]:
        report["alerts"].append({
            "severity": "warning",
            "metric": "rejected_ratio_48h",
            "value": round(rejected_ratio, 3),
            "threshold": ALERTS["rejected_ratio_48h_max"],
            "message": f"{rejected_ratio*100:.0f}% rejected en últimas 48h ({rej_48h}/{total_48h}). Filtros/threshold pueden estar mal calibrados.",
        })

    # === Métrica 5: Sources silenciosas ===
    # Pablo 20-may-2026: sources creadas hace <48h tienen grace period
    # (todavía no las pollearon, pero no es bug — es esperado).
    r = db.execute("""
        SELECT
          COUNT(*) AS total,
          SUM(CASE
              WHEN (last_polled_at IS NULL OR last_polled_at < datetime('now', '-48 hours'))
                   AND created_at < datetime('now', '-48 hours')
              THEN 1 ELSE 0
          END) AS silent
        FROM sources WHERE is_active=1
    """).fetchone()
    sources_total, sources_silent = r[0], r[1]
    silent_pct = (sources_silent / sources_total) if sources_total > 0 else 0
    report["metrics"]["sources_active"] = sources_total
    report["metrics"]["sources_silent_48h"] = sources_silent
    report["metrics"]["sources_silent_pct"] = round(silent_pct, 3)
    if silent_pct > ALERTS["sources_silent_pct_max"]:
        report["alerts"].append({
            "severity": "warning",
            "metric": "sources_silent_pct",
            "value": round(silent_pct, 3),
            "threshold": ALERTS["sources_silent_pct_max"],
            "message": f"{sources_silent}/{sources_total} sources sin pollear hace 48h. Workflow ingest puede estar roto.",
        })

    # === Métrica 6: Editorial rejected ratio ===
    r = db.execute("""
        SELECT COUNT(*) FROM tutorials
        WHERE status='rejected'
          AND rejected_reason LIKE 'editorial:%'
          AND updated_at >= datetime('now', '-48 hours')
    """).fetchone()
    editorial_rej = r[0]
    editorial_total = pub_48h + editorial_rej
    editorial_ratio = (editorial_rej / editorial_total) if editorial_total > 0 else 0
    report["metrics"]["editorial_rejected_48h"] = editorial_rej
    report["metrics"]["editorial_rejected_ratio"] = round(editorial_ratio, 3)
    if editorial_total >= 5 and editorial_ratio > ALERTS["editorial_rejected_ratio_48h_max"]:
        report["alerts"].append({
            "severity": "warning",
            "metric": "editorial_rejected_ratio",
            "value": round(editorial_ratio, 3),
            "threshold": ALERTS["editorial_rejected_ratio_48h_max"],
            "message": f"{editorial_rej}/{editorial_total} traducciones bloqueadas por checklist editorial. Prompt Routine C puede ser muy estricto.",
        })

    # === Métrica 7: Hero images muertas (cheap daily check) ===
    # Pablo 20-may-2026: tras encontrar 2/25 imgs broken por hotlink/WAF
    # (studiopieters.nl devolvía 200 a curl pero 0×0 al browser), agregamos
    # check HEAD a los heros de las últimas 30 publicaciones. No detecta
    # hotlink-block en navegador real (eso lo hace el workflow Playwright),
    # pero sí detecta 4xx/5xx puros + URLs eliminadas en el upstream.
    r = db.execute("""
        SELECT id, hero_image_url
        FROM tutorials
        WHERE status = 'published'
          AND hero_image_url IS NOT NULL
          AND hero_image_url != ''
        ORDER BY published_at DESC
        LIMIT 30
    """).fetchall()
    hero_checks = []
    if r:
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(_check_hero_image, row[1]): row for row in r}
            for fut in as_completed(futures):
                tid, url = futures[fut]
                status = fut.result()
                hero_checks.append({"tutorial_id": tid, "url": url, "status": status})
    heros_4xx = [h for h in hero_checks if h["status"] >= 400 or h["status"] == -1]
    report["metrics"]["heros_checked"] = len(hero_checks)
    report["metrics"]["heros_broken"] = len(heros_4xx)
    if heros_4xx:
        # Lista solo URLs (no IDs) para no inflar el JSON en logs públicos
        report["metrics"]["heros_broken_urls"] = [
            {"status": h["status"], "url": h["url"]} for h in heros_4xx[:10]
        ]
    if len(heros_4xx) > ALERTS["hero_images_4xx_max"]:
        report["alerts"].append({
            "severity": "warning",
            "metric": "heros_broken",
            "value": len(heros_4xx),
            "threshold": ALERTS["hero_images_4xx_max"],
            "message": (
                f"{len(heros_4xx)}/{len(hero_checks)} hero images devuelven 4xx/5xx/timeout. "
                f"Verificá hotlink-protection, dominios caídos, o URLs cambiadas en upstream. "
                f"Para detectar 0×0 in-browser corré el workflow blog-visual-audit (Playwright)."
            ),
        })

    # === Counts globales ===
    counts = dict(
        db.execute("SELECT status, COUNT(*) FROM tutorials GROUP BY status").fetchall()
    )
    report["metrics"]["counts_by_status"] = counts

    # Determinar status overall
    severities = [a["severity"] for a in report["alerts"]]
    if "critical" in severities:
        report["status"] = "critical"
    elif "warning" in severities:
        report["status"] = "warning"

    # Output
    out_path = Path(__file__).parent.parent / "data" / "pipeline-health.json"
    out_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print(f"Pipeline status: {report['status'].upper()}")
    print(f"Metrics: {json.dumps(report['metrics'], indent=2)}")
    print()
    if report["alerts"]:
        for a in report["alerts"]:
            sev = a["severity"].upper()
            # GH Actions ::error:: → email automático en failure
            tag = "::error::" if a["severity"] == "critical" else "::warning::"
            print(f"{tag} [{sev}] {a['metric']}: {a['message']}")

    # Exit code para que GH Actions marque failure si crítico
    if report["status"] == "critical":
        sys.exit(1)


if __name__ == "__main__":
    main()
