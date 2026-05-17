#!/usr/bin/env python3
"""
Pipeline healthcheck — detecta silent failures del blog pipeline y envía
email CRIT a Pablo via Resend si hay problemas.

Corre cada 6h (GH Actions workflow .github/workflows/pipeline-healthcheck.yml).

Alertas (CRIT → mandan email; WARN → solo log stdout):
  - CRIT: sin publicaciones en >7 días (Routine C/translate roto)
  - CRIT: sin ingest en >48h (Routine A/ingest roto)
  - CRIT: 5+ tutoriales 'ranked' esperando >48h (translation atascada)
  - WARN: 50+ drafts queue (ranking lento o threshold muy estricto)

Lección operacional (Pablo 17-may-2026, post-Week 8): sin este watchdog
el pipeline puede romperse silenciosamente durante semanas — la única
señal serían 0 emails del weekly digest los lunes, y si Routine F también
está rota tampoco hay señal. Mejor avisar proactivamente al primer signo
de problema.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

import libsql
import requests


# Env vars lazy-leídos en `main()` para que el módulo sea importable en
# tests sin variables (e.g. tests/test_alerts.py).
TURSO_DATABASE_URL = ""
TURSO_AUTH_TOKEN = ""
RESEND_API_KEY = ""
DIGEST_TO_EMAIL = ""
DIGEST_FROM_EMAIL = ""


def hours_since(sqlite_ts: str | None) -> float | None:
    """Convierte 'YYYY-MM-DD HH:MM:SS' (UTC) a horas desde ahora."""
    if not sqlite_ts:
        return None
    try:
        dt = datetime.strptime(sqlite_ts, "%Y-%m-%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )
    except ValueError:
        return None
    return (datetime.now(timezone.utc) - dt).total_seconds() / 3600.0


def query_pipeline_state() -> dict:
    """Lee timestamps + counts de Turso. Single round-trip."""
    client = libsql.connect(
        TURSO_DATABASE_URL.replace("libsql://", "https://"),
        auth_token=TURSO_AUTH_TOKEN,
    )

    def first(sql: str, default=None):
        cur = client.execute(sql)
        rows = cur.fetchall()
        if not rows:
            return default
        return rows[0][0] if rows[0][0] is not None else default

    last_ingested = first(
        "SELECT MAX(ingested_at) FROM tutorials"
    )
    last_ranked = first(
        "SELECT MAX(ranked_at) FROM tutorials WHERE ranked_at IS NOT NULL"
    )
    last_published = first(
        "SELECT MAX(published_at) FROM tutorials WHERE status='published'"
    )
    pending_drafts = first(
        "SELECT COUNT(*) FROM tutorials WHERE status='draft'", default=0
    )
    pending_ranked = first(
        "SELECT COUNT(*) FROM tutorials WHERE status='ranked'", default=0
    )

    return {
        "last_ingested": last_ingested,
        "last_ranked": last_ranked,
        "last_published": last_published,
        "pending_drafts": int(pending_drafts or 0),
        "pending_ranked": int(pending_ranked or 0),
        "hours_since_ingested": hours_since(last_ingested),
        "hours_since_ranked": hours_since(last_ranked),
        "hours_since_published": hours_since(last_published),
    }


def evaluate_alerts(state: dict) -> tuple[list[str], list[str]]:
    """Returns (crit_alerts, warn_alerts)."""
    crit: list[str] = []
    warn: list[str] = []

    h_pub = state["hours_since_published"]
    h_ing = state["hours_since_ingested"]
    pending_ranked = state["pending_ranked"]
    pending_drafts = state["pending_drafts"]

    if h_pub is None:
        crit.append(
            "CRIT: ningún tutorial publicado nunca. Pipeline nunca llegó a status='published'."
        )
    elif h_pub > 168:  # 7 días
        crit.append(
            f"CRIT: sin publicaciones en {h_pub:.0f}h (>7 días). "
            f"Routine C (translate) probablemente rota."
        )

    if h_ing is None:
        crit.append("CRIT: ningún registro de ingest. Routine A nunca corrió.")
    elif h_ing > 48:
        crit.append(
            f"CRIT: sin ingest en {h_ing:.0f}h (>48h). "
            f"GH Actions workflow blog-ingest.yml probablemente roto."
        )

    if pending_ranked >= 5 and (h_pub is None or h_pub > 48):
        crit.append(
            f"CRIT: {pending_ranked} tutoriales en status='ranked' esperando >48h. "
            f"Translation pipeline atascada."
        )

    if pending_drafts >= 50:
        warn.append(
            f"WARN: {pending_drafts} drafts acumulados. Ranking lento o threshold cs muy alto."
        )

    return crit, warn


def send_alert_email(crit: list[str], state: dict) -> None:
    """Manda email vía Resend HTTP API directamente (sin SDK)."""
    if not RESEND_API_KEY:
        print("RESEND_API_KEY no seteado, no se puede enviar email.", file=sys.stderr)
        return

    bullets = "\n".join(f"  - {line}" for line in crit)
    body_text = (
        f"Pipeline healthcheck del blog detectó {len(crit)} problema(s) críticos:\n\n"
        f"{bullets}\n\n"
        f"Estado actual del pipeline:\n"
        f"  • Último ingest:    {state['last_ingested'] or 'NUNCA'}\n"
        f"  • Último ranking:   {state['last_ranked'] or 'NUNCA'}\n"
        f"  • Último publish:   {state['last_published'] or 'NUNCA'}\n"
        f"  • Drafts pendientes: {state['pending_drafts']}\n"
        f"  • Ranked pendientes: {state['pending_ranked']}\n\n"
        f"Próximos pasos:\n"
        f"  1. https://www.mechatronicstore.cl/admin/blog/queue — ver backlog\n"
        f"  2. https://github.com/PabloSilvaBravo/mechatronicstore-blog/actions — ver runs GH Actions\n"
        f"  3. claude.ai/code/routines — ver corridas CCR (Routines B/C)\n"
        f"  4. Vercel logs si endpoints fallan\n\n"
        f"— Pipeline Watchdog (scripts/pipeline_healthcheck.py)\n"
    )

    body_html = (
        "<h2>🚨 Pipeline healthcheck — alertas críticas</h2>"
        "<p>Detectados <b>"
        + str(len(crit))
        + "</b> problemas:</p><ul>"
        + "".join(f"<li>{c}</li>" for c in crit)
        + "</ul>"
        "<h3>Estado actual</h3>"
        "<pre>"
        f"Último ingest:    {state['last_ingested'] or 'NUNCA'}\n"
        f"Último ranking:   {state['last_ranked'] or 'NUNCA'}\n"
        f"Último publish:   {state['last_published'] or 'NUNCA'}\n"
        f"Drafts pendientes: {state['pending_drafts']}\n"
        f"Ranked pendientes: {state['pending_ranked']}"
        "</pre>"
        "<h3>Próximos pasos</h3><ol>"
        '<li><a href="https://www.mechatronicstore.cl/admin/blog/queue">/admin/blog/queue</a></li>'
        '<li><a href="https://github.com/PabloSilvaBravo/mechatronicstore-blog/actions">GH Actions runs</a></li>'
        '<li><a href="https://claude.ai/code/routines">CCR Routines</a></li>'
        "<li>Vercel logs si endpoints fallan</li>"
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
                "subject": f"🚨 Blog pipeline: {len(crit)} alerta(s) crítica(s)",
                "html": body_html,
                "text": body_text,
            }
        ),
        timeout=15,
    )

    if r.status_code >= 300:
        print(
            f"Resend API rechazó el email: HTTP {r.status_code} {r.text[:200]}",
            file=sys.stderr,
        )
        sys.exit(1)
    print(f"Alerta CRIT enviada vía Resend: {r.json().get('id')}")


def _load_env() -> None:
    """Carga env vars al modo módulo. Llamar antes de usar query/send."""
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
    crit, warn = evaluate_alerts(state)

    print("=" * 60)
    print("PIPELINE HEALTHCHECK")
    print("=" * 60)
    print(json.dumps(state, indent=2, default=str))

    if warn:
        print("\nWARNINGS (no se envía email):")
        for w in warn:
            print(f"  {w}")

    if crit:
        print(f"\n🚨 {len(crit)} ALERTAS CRÍTICAS:")
        for c in crit:
            print(f"  {c}")
        send_alert_email(crit, state)
        # Exit 0 igual — no queremos que el workflow falle y dispare otra
        # alerta de GitHub. El email ya avisó.
        return 0

    print("\n✅ Pipeline saludable.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
