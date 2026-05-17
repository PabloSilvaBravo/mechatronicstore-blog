"""
Adafruit Learn parser.
Feed: https://learn.adafruit.com/feed
Filtra URLs sin query params raros.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scraper import fetch_rss
from sources.base import DraftCandidate


def discover(source: dict, limit: int = 20) -> list[DraftCandidate]:
    items = fetch_rss(source["feed_url"], limit=limit)
    candidates = []
    for item in items:
        if not item.url or "?" in item.url:
            continue
        candidates.append(
            DraftCandidate(
                source_id=source["id"],
                source_url=item.url,
                title_en=item.title,
                summary_en=item.summary,
                published_at=item.published_at,
                author=item.author or "Adafruit Learning System",
            )
        )
    return candidates
