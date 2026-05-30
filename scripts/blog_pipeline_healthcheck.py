#!/usr/bin/env python3
"""
Watchdog del limbo del pipeline del blog.

Corre cada 6h (GH Actions: .github/workflows/blog-pipeline-healthcheck.yml).
Detecta el bug del limbo descubierto el 30-may-2026 y otros sintomas de cola
muerta, y manda email CRIT a Pablo via Resend si encuentra problemas.

El bug del limbo (resumen): refetch_rejected.py regresaba tutoriales a
status='draft' sin limpiar combined_score / cs_* / ranked_at. Esas filas
quedaban invisibles para ambos dumps remotos:
  - dump_blog_rank_input.py pide combined_score IS NULL  (las salta)
  - dump_blog_translate_input.py pide status='ranked'    (las salta)
Resultado: la cola rankeable mas traducible se vacia, no hay traducciones
nuevas y los publicados por dia se desploman (paso de 11/dia a 1/dia tras
21-may-2026). El watchdog detecta justo esa firma antes de que pasen
semanas sin que nadie lo note.

Alertas (todas CRIT, mandan un solo email con la lista):
  (a) LIMBO: filas status='draft' con combined_score no-nulo cuyo ranked_at
      es mas viejo que 24h. Son filas varadas por el bug del limbo.
  (b) SIN PUBLICAR: cero publicados en las ultimas 48h.
  (c) COLA VACIA: la cola rankeable mas traducible lleva mas de 24h en cero
      (ningun draft sin score, ningun ranked, y nada rankeable o traducible
      transiciono en el ultimo dia).

Mensajes de log y email en espanol, sin emoji.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

import libsql
import requests


# Env vars lazy-leidos en main() para que el modulo sea importable en tests.
TURSO_DATABASE_URL = ""
TURSO_AUTH_TOKEN = ""
RESEND_API_KEY = ""
DIGEST_TO_EMAIL = ""
DIGEST_FROM_EMAIL = ""

# Umbrales (horas). Espejan exactamente la spec de la tarea.
LIMBO_MAX_AGE_HOURS = 24
PUBLISH_SILENCE_HOURS = 48
QUEUE_EMPTY_HOURS = 24


def query_pipeline_state() -> dict:
    """Lee los counts y timestamps relevantes de Turso en un solo cliente."""
    # Misma forma de conexión que scripts/db.py: database= con la URL
    # libsql:// cruda (sin convertir a https://). Evita divergir del patrón
    # probado del resto de scripts del blog.
    client = libsql.connect(
        database=TURSO_DATABASE_URL,
        auth_token=TURSO_AUTH_TOKEN,
    )

    def scalar(sql: str, default=0):
        rows = client.execute(sql).fetchall()
        if not rows or rows[0][0] is None:
            return default
        return rows[0][0]

    # (a) Detector del limbo: drafts con score viejo (>24h en ese estado).
    limbo_count = scalar(
        "SELECT COUNT(*) FROM tutorials "
        "WHERE status='draft' AND combined_score IS NOT NULL "
        "  AND ranked_at < datetime('now','-24 hours')"
    )
    # Sample de ids para el cuerpo del email (hasta 10).
    limbo_sample_rows = client.execute(
        "SELECT id, source_id, combined_score, ranked_at FROM tutorials "
        "WHERE status='draft' AND combined_score IS NOT NULL "
        "  AND ranked_at < datetime('now','-24 hours') "
        "ORDER BY ranked_at LIMIT 10"
    ).fetchall()
    limbo_sample = [
        {
            "id": r[0],
            "source_id": r[1],
            "combined_score": r[2],
            "ranked_at": r[3],
        }
        for r in limbo_sample_rows
    ]

    # (b) Publicados en las ultimas 48h.
    published_48h = scalar(
        "SELECT COUNT(*) FROM tutorials "
        "WHERE status='published' "
        "  AND published_at >= datetime('now','-48 hours')"
    )
    last_published = client.execute(
        "SELECT MAX(published_at) FROM tutorials WHERE status='published'"
    ).fetchall()
    last_published = last_published[0][0] if last_published else None

    # (c) Cola rankeable mas traducible: drafts sin score (rankeables) +
    # ranked (traducibles). Si esta vacia Y no hubo actividad reciente en
    # ninguna de las dos colas en 24h, la cola lleva >24h muerta.
    rankable_now = scalar(
        "SELECT COUNT(*) FROM tutorials "
        "WHERE status='draft' AND combined_score IS NULL"
    )
    translatable_now = scalar(
        "SELECT COUNT(*) FROM tutorials WHERE status='ranked'"
    )
    # Actividad reciente: cualquier fila rankeada en las ultimas 24h, o
    # cualquier draft ingestado en las ultimas 24h. Si hubo ingest o ranking
    # reciente, la cola no esta "muerta" aunque ahora mismo este en cero.
    ranked_last_24h = scalar(
        "SELECT COUNT(*) FROM tutorials "
        "WHERE ranked_at >= datetime('now','-24 hours')"
    )
    ingested_last_24h = scalar(
        "SELECT COUNT(*) FROM tutorials "
        "WHERE ingested_at >= datetime('now','-24 hours')"
    )

    return {
        "limbo_count": int(limbo_count),
        "limbo_sample": limbo_sample,
        "published_48h": int(published_48h),
        "last_published": last_published,
        "rankable_now": int(rankable_now),
        "translatable_now": int(translatable_now),
        "ranked_last_24h": int(ranked_last_24h),
        "ingested_last_24h": int(ingested_last_24h),
    }


def evaluate_alerts(state: dict) -> list[str]:
    """Devuelve la lista de alertas CRIT (vacia si todo OK)."""
    crit: list[str] = []

    # (a) Limbo.
    if state["limbo_count"] > 0:
        ids = ", ".join(r["id"] for r in state["limbo_sample"])
        crit.append(
            f"LIMBO: {state['limbo_count']} fila(s) status='draft' con "
            f"combined_score no-nulo y ranked_at mas viejo que "
            f"{LIMBO_MAX_AGE_HOURS}h. Estan varadas (invisibles para los dumps "
            f"de rank y de translate). Ejemplos: {ids}. "
            "Correr el SQL de rescate (reset de columnas de ranking) o "
            "refetch_rejected.py ya parchado."
        )

    # (b) Sin publicar en 48h.
    if state["published_48h"] == 0:
        crit.append(
            f"SIN PUBLICAR: cero tutoriales publicados en las ultimas "
            f"{PUBLISH_SILENCE_HOURS}h. Ultimo publish: "
            f"{state['last_published'] or 'NUNCA'}. Routine D o la cola rio "
            "arriba probablemente atascada."
        )

    # (c) Cola vacia mas de 24h.
    queue_size = state["rankable_now"] + state["translatable_now"]
    recent_activity = state["ranked_last_24h"] + state["ingested_last_24h"]
    if queue_size == 0 and recent_activity == 0:
        crit.append(
            f"COLA VACIA: la cola rankeable mas traducible esta en cero y no "
            f"hubo ingest ni ranking en las ultimas {QUEUE_EMPTY_HOURS}h "
            "(rankeables=0, traducibles=0, ingest_24h=0, ranked_24h=0). "
            "Routine A (ingest) o Routine B (rank) probablemente rotas."
        )

    return crit


def send_alert_email(crit: list[str], state: dict) -> None:
    """Manda el email CRIT via Resend HTTP API (mismo patron que el resto)."""
    if not RESEND_API_KEY:
        print(
            "RESEND_API_KEY no seteado, no se puede enviar email.",
            file=sys.stderr,
        )
        return

    bullets_txt = "\n".join(f"  - {line}" for line in crit)
    body_text = (
        f"El watchdog del limbo del blog detecto {len(crit)} problema(s) "
        f"critico(s):\n\n"
        f"{bullets_txt}\n\n"
        f"Estado actual de la cola:\n"
        f"  Limbo (draft + score, ranked_at >24h): {state['limbo_count']}\n"
        f"  Rankeables ahora (draft sin score):     {state['rankable_now']}\n"
        f"  Traducibles ahora (status ranked):      {state['translatable_now']}\n"
        f"  Publicados ultimas 48h:                 {state['published_48h']}\n"
        f"  Ingest ultimas 24h:                     {state['ingested_last_24h']}\n"
        f"  Rankeados ultimas 24h:                  {state['ranked_last_24h']}\n"
        f"  Ultimo publish:                         "
        f"{state['last_published'] or 'NUNCA'}\n\n"
        f"Proximos pasos:\n"
        f"  1. https://github.com/PabloSilvaBravo/mechatronicstore-blog/actions "
        f"para ver corridas de GH Actions.\n"
        f"  2. claude.ai/code/routines para ver las Routines A/B/C/D.\n"
        f"  3. Si es limbo: correr el UPDATE de rescate que resetea "
        f"combined_score, los cs_*, ranked_at, is_blocked y blocked_reason.\n\n"
        f"Watchdog del limbo (scripts/blog_pipeline_healthcheck.py)\n"
    )

    rows_html = "".join(f"<li>{c}</li>" for c in crit)
    body_html = (
        "<h2>Watchdog del limbo del blog: alertas criticas</h2>"
        f"<p>Detectados <b>{len(crit)}</b> problema(s):</p>"
        f"<ul>{rows_html}</ul>"
        "<h3>Estado actual de la cola</h3><pre>"
        f"Limbo (draft + score, ranked_at &gt;24h): {state['limbo_count']}\n"
        f"Rankeables ahora (draft sin score):       {state['rankable_now']}\n"
        f"Traducibles ahora (status ranked):        {state['translatable_now']}\n"
        f"Publicados ultimas 48h:                   {state['published_48h']}\n"
        f"Ingest ultimas 24h:                       {state['ingested_last_24h']}\n"
        f"Rankeados ultimas 24h:                    {state['ranked_last_24h']}\n"
        f"Ultimo publish:                           "
        f"{state['last_published'] or 'NUNCA'}"
        "</pre>"
        "<h3>Proximos pasos</h3><ol>"
        '<li><a href="https://github.com/PabloSilvaBravo/mechatronicstore-blog/actions">'
        "Corridas de GH Actions</a></li>"
        '<li><a href="https://claude.ai/code/routines">Routines A/B/C/D</a></li>'
        "<li>Si es limbo: correr el UPDATE de rescate que resetea las "
        "columnas de ranking.</li>"
        "</ol>"
    )

    r = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        data=json.dumps(
            {
                "from": DIGEST_FROM_EMAIL,
                "to": DIGEST_TO_EMAIL,
                "subject": f"Blog pipeline limbo: {len(crit)} alerta(s) critica(s)",
                "html": body_html,
                "text": body_text,
            }
        ),
        timeout=15,
    )

    if r.status_code >= 300:
        print(
            f"Resend API rechazo el email: HTTP {r.status_code} {r.text[:200]}",
            file=sys.stderr,
        )
        sys.exit(1)
    print(f"Alerta CRIT enviada via Resend: {r.json().get('id')}")


def _load_env() -> None:
    """Carga env vars al modo modulo. Llamar antes de usar query/send."""
    global TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
    global RESEND_API_KEY, DIGEST_TO_EMAIL, DIGEST_FROM_EMAIL
    TURSO_DATABASE_URL = os.environ["TURSO_DATABASE_URL"]
    TURSO_AUTH_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "")
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
    DIGEST_TO_EMAIL = os.environ.get(
        "DIGEST_TO_EMAIL", "pablo.silva.bravo.92@gmail.com"
    )
    DIGEST_FROM_EMAIL = os.environ.get(
        "DIGEST_FROM_EMAIL", "blog@mechatronicstore.cl"
    )


def main() -> int:
    _load_env()
    state = query_pipeline_state()
    crit = evaluate_alerts(state)

    print("=" * 60)
    print("WATCHDOG DEL LIMBO DEL BLOG")
    print("=" * 60)
    print(json.dumps(state, indent=2, default=str))

    if crit:
        print(f"\n{len(crit)} ALERTAS CRITICAS:")
        for c in crit:
            print(f"  {c}")
        send_alert_email(crit, state)
        # Exit 0 igual: el email ya aviso, no queremos que GH Actions dispare
        # ademas su propia alerta de workflow fallido.
        return 0

    print("\nCola del blog saludable: sin limbo, con publicaciones recientes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
