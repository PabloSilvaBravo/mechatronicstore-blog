"""Admin: muestra estado del queue del blog."""
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import db

BASE_URL = "https://www.mechatronicstore.cl"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", default=None)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--published", action="store_true",
                        help="Shortcut: --status=published con info extra (slug, URL)")
    args = parser.parse_args()

    if args.published:
        args.status = "published"

    where = "WHERE 1=1"
    args_sql: list = []
    if args.status:
        where += " AND status = ?"
        args_sql.append(args.status)

    rows = db.execute(
        f"""SELECT id, status, COALESCE(combined_score, 0) AS cs,
                   COALESCE(title_es, title_en) AS title,
                   slug, source_id, ingested_at, ranked_at, published_at,
                   category, difficulty, estimated_time_minutes
            FROM tutorials
            {where}
            ORDER BY combined_score DESC, ingested_at DESC
            LIMIT ?""",
        args_sql + [args.limit],
    ).fetchall()

    if args.published:
        print(f"\n{'STATUS':10} {'CS':>5} {'CAT':12} {'DIFF':12} {'TIME':>5} TITLE")
        print("-" * 130)
        for r in rows:
            title = (r[3] or "")[:50]
            cat = (r[9] or "?")[:10]
            diff = (r[10] or "?")[:10]
            mins = r[11] or 0
            print(f"{r[1]:10} {r[2]:>5.2f} {cat:12} {diff:12} {mins:>5}m {title}")
            print(f"           URL: {BASE_URL}/blog/{r[4]}")
    else:
        print(f"\n{'STATUS':10} {'CS':>5} {'SOURCE':22} {'TITLE'}")
        print("-" * 110)
        for r in rows:
            title = (r[3] or "")[:55]
            print(f"{r[1]:10} {r[2]:>5.2f} {r[5]:22} {title}")
    print(f"\nTotal: {len(rows)}")

    summary = db.execute(
        "SELECT status, COUNT(*) FROM tutorials GROUP BY status"
    ).fetchall()
    print("\nResumen por status:")
    for s, n in summary:
        print(f"  {s}: {n}")


if __name__ == "__main__":
    main()
