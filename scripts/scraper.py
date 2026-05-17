"""
Scraper helpers — fetch RSS feed, fetch full HTML body, extract images.
"""
import re
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urljoin

import feedparser
import requests
from bs4 import BeautifulSoup


USER_AGENT = (
    "MechatronicStoreBlog/0.2 "
    "(+https://www.mechatronicstore.cl/blog; tutorials aggregator) "
    "compatible"
)
TIMEOUT_S = 25


@dataclass
class FeedItem:
    title: str
    url: str
    summary: str = ""
    published_at: Optional[str] = None
    author: Optional[str] = None


@dataclass
class FullPage:
    url: str
    final_url: str
    title: str
    body_html: str
    body_text: str
    main_image_url: Optional[str] = None
    extra_images: list[str] = field(default_factory=list)
    status_code: int = 200
    error: Optional[str] = None


def fetch_rss(feed_url: str, limit: int = 30) -> list[FeedItem]:
    """Parsea RSS feed."""
    parsed = feedparser.parse(
        feed_url,
        request_headers={"User-Agent": USER_AGENT},
    )
    items: list[FeedItem] = []
    for entry in parsed.entries[:limit]:
        items.append(
            FeedItem(
                title=entry.get("title", "").strip(),
                url=entry.get("link", "").strip(),
                summary=BeautifulSoup(
                    entry.get("summary", ""), "html.parser"
                ).get_text(" ", strip=True)[:500],
                published_at=entry.get("published") or entry.get("updated"),
                author=(
                    entry.get("author")
                    or (entry.get("authors", [{}])[0].get("name") if entry.get("authors") else None)
                ),
            )
        )
    return items


def fetch_full_page(url: str) -> FullPage:
    """Fetch página completa con HTML + texto + imágenes."""
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=TIMEOUT_S,
            allow_redirects=True,
        )
    except requests.RequestException as e:
        return FullPage(
            url=url, final_url=url, title="", body_html="", body_text="",
            status_code=0, error=f"fetch_error: {e.__class__.__name__}: {str(e)[:200]}",
        )

    if resp.status_code >= 400:
        return FullPage(
            url=url, final_url=resp.url, title="", body_html="", body_text="",
            status_code=resp.status_code, error=f"http_{resp.status_code}",
        )

    soup = BeautifulSoup(resp.text, "lxml")
    title = (soup.title.string or "").strip() if soup.title else ""

    main_image = None
    og = soup.find("meta", attrs={"property": "og:image"})
    if og and og.get("content"):
        main_image = og.get("content")

    extras: list[str] = []
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src")
        if src:
            extras.append(urljoin(resp.url, src))

    main_el = soup.find("article") or soup.find("main") or soup.body
    body_html = str(main_el) if main_el else resp.text
    body_text = (
        main_el.get_text(" ", strip=True) if main_el else
        BeautifulSoup(resp.text, "lxml").get_text(" ", strip=True)
    )

    return FullPage(
        url=url,
        final_url=resp.url,
        title=title,
        body_html=body_html,
        body_text=body_text,
        main_image_url=main_image,
        extra_images=extras[:20],
        status_code=resp.status_code,
    )


def slugify(text: str, max_len: int = 80) -> str:
    """URL-safe slug lower case."""
    s = text.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s).strip("-")
    return s[:max_len]


def short_hash(s: str, length: int = 12) -> str:
    """Hash hex 12-char para IDs."""
    import hashlib
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:length]


if __name__ == "__main__":
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 else "https://hackaday.com/category/how-to/feed/"
    print(f"Fetching RSS: {url}")
    items = fetch_rss(url, limit=3)
    for i, item in enumerate(items, 1):
        print(f"\n{i}. {item.title}")
        print(f"   {item.url}")
        print(f"   ({item.author}) — {item.summary[:80]}...")
