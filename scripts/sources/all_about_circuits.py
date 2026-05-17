"""
All About Circuits parser.
Feed: https://www.allaboutcircuits.com/feeds/articles/
Filtra: solo /technical-articles/ y /projects/.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scraper import fetch_rss
from sources.base import DraftCandidate


def discover(source: dict, limit: int = 20) -> list[DraftCandidate]:
    items = fetch_rss(source["feed_url"], limit=limit * 2)
    candidates = []
    for item in items:
        if not item.url:
            continue
        if "/technical-articles/" not in item.url and "/projects/" not in item.url:
            continue
        candidates.append(
            DraftCandidate(
                source_id=source["id"],
                source_url=item.url,
                title_en=item.title,
                summary_en=item.summary,
                published_at=item.published_at,
                author=item.author or "All About Circuits",
            )
        )
        if len(candidates) >= limit:
            break
    return candidates
