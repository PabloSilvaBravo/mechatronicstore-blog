"""
Turso (libsql) client para scripts Python del blog.

Carga TURSO_DATABASE_URL + TURSO_AUTH_TOKEN desde .env.local automáticamente.
"""
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

import libsql

_url = os.environ.get("TURSO_DATABASE_URL")
_token = os.environ.get("TURSO_AUTH_TOKEN")

if not _url:
    print("ERROR: TURSO_DATABASE_URL no seteado en env", file=sys.stderr)
    sys.exit(1)

_conn = libsql.connect(database=_url, auth_token=_token)


def execute(sql: str, args: list | tuple | None = None):
    """Ejecuta SQL devolviendo cursor. Para SELECTs usar .fetchall()."""
    return _conn.execute(sql, args or [])


def execute_many(sql: str, rows: list[tuple]):
    """Ejecuta SQL en batch con múltiples filas (insert/update)."""
    return _conn.executemany(sql, rows)


def commit():
    """Commit explícito (libsql no auto-commit por default)."""
    _conn.commit()


def get_setting(key: str, default=None):
    """Lee settings.value (si la tabla settings existe — opcional)."""
    try:
        r = execute("SELECT value FROM settings WHERE key = ?", [key]).fetchone()
        return r[0] if r else default
    except Exception:
        return default


if __name__ == "__main__":
    r = execute("SELECT 1").fetchone()
    print(f"DB connection OK: SELECT 1 → {r}")
    r = execute("SELECT COUNT(*) FROM tutorials").fetchone()
    print(f"tutorials count: {r[0]}")
    r = execute("SELECT COUNT(*) FROM sources").fetchone()
    print(f"sources count: {r[0]}")
