"""
Parser genérico para feeds RSS WordPress-style.
Funciona para Hackaday How-Tos, Random Nerd, Make, Last Minute Engineers,
DroneBot Workshop, Tom's Hardware DIY.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scraper import fetch_rss
from sources.base import DraftCandidate


def discover(source: dict, limit: int = 20) -> list[DraftCandidate]:
    items = fetch_rss(source["feed_url"], limit=limit)
    return [
        DraftCandidate(
            source_id=source["id"],
            source_url=item.url,
            title_en=item.title,
            summary_en=item.summary,
            published_at=item.published_at,
            author=item.author,
        )
        for item in items
        if item.url
    ]
