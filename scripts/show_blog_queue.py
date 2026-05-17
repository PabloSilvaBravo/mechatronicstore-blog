"""Admin: muestra estado del queue del blog."""
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", default=None)
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    where = "WHERE 1=1"
    args_sql: list = []
    if args.status:
        where += " AND status = ?"
        args_sql.append(args.status)

    rows = db.execute(
        f"""SELECT id, status, COALESCE(combined_score, 0) AS cs,
                   COALESCE(title_es, title_en) AS title,
                   source_id, ingested_at, ranked_at
            FROM tutorials
            {where}
            ORDER BY combined_score DESC, ingested_at DESC
            LIMIT ?""",
        args_sql + [args.limit],
    ).fetchall()

    print(f"\n{'STATUS':10} {'CS':>5} {'SOURCE':22} {'TITLE'}")
    print("-" * 110)
    for r in rows:
        title = (r[3] or "")[:55]
        print(f"{r[1]:10} {r[2]:>5.2f} {r[4]:22} {title}")
    print(f"\nTotal: {len(rows)}")

    summary = db.execute(
        "SELECT status, COUNT(*) FROM tutorials GROUP BY status"
    ).fetchall()
    print("\nResumen por status:")
    for s, n in summary:
        print(f"  {s}: {n}")


if __name__ == "__main__":
    main()
