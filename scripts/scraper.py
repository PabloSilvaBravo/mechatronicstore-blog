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


def fetch_adafruit_multipage(url: str) -> FullPage:
    """
    Fetch tutorial Adafruit Learn que está distribuido en múltiples subpages.

    Adafruit Learn tutoriales tienen estructura:
        /<slug>           ← overview (página landing)
        /<slug>/overview
        /<slug>/pinouts
        /<slug>/hardware
        /<slug>/wiring
        /<slug>/software
        /<slug>/code
        /<slug>/downloads
        /<slug>/featured_products
        ... etc (varía por tutorial)

    Pablo 19-may-2026: el scraper genérico (fetch_full_page) solo traía el
    overview → la mayoría de tutoriales Adafruit quedaban rejected con
    `no_code, steps_below_5, no_materials_list` aunque las subpages tenían
    todo. Esta función:
      1. Fetch el overview
      2. Enumera links a subpages siguiendo el patrón /<slug>/<subpage>
      3. Fetch cada subpage (con sleep entre requests para no saturar)
      4. Concatena bodies HTML en orden + dedupe título
      5. Devuelve FullPage con body_html = concatenación

    Si el tutorial es de 1 sola página (sin subpages), se comporta igual
    que fetch_full_page.
    """
    import time

    # Paso 1: fetch overview
    overview = fetch_full_page(url)
    if overview.error or overview.status_code >= 400:
        return overview

    soup = BeautifulSoup(overview.body_html, "lxml")

    # Paso 2: detectar slug base
    m = re.match(r"(https?://learn\.adafruit\.com/[^/?#]+)", overview.final_url)
    if not m:
        return overview  # No es Adafruit, devolver lo del overview
    base = m.group(1)

    # Paso 3: extraer subpages únicas
    subpage_urls: list[str] = []
    seen = {overview.final_url.rstrip("/")}
    # Buscar en TODO el HTML de la página (no solo body), porque el nav suele
    # estar fuera del <article>
    full_soup = BeautifulSoup(_get_raw(url), "lxml")
    for a in full_soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("/"):
            href = "https://learn.adafruit.com" + href
        if not href.startswith(base + "/"):
            continue
        tail = href[len(base) + 1:]
        # Solo subpages directas, sin query/fragment, no auxiliares
        if not tail or "/" in tail or "?" in tail or "#" in tail:
            continue
        if tail in ("featured_products",):  # skip product listing
            continue
        if href.rstrip("/") in seen:
            continue
        seen.add(href.rstrip("/"))
        subpage_urls.append(href)

    if not subpage_urls:
        return overview  # Tutorial de 1 sola página

    # Paso 4: fetch cada subpage + concatenar
    combined_html = overview.body_html
    combined_text = overview.body_text
    extras = list(overview.extra_images)

    for sub_url in subpage_urls[:10]:  # cap 10 subpages para evitar abuso
        try:
            sub = fetch_full_page(sub_url)
            if sub.error or sub.status_code >= 400:
                continue
            combined_html += f"\n<!-- subpage: {sub_url} -->\n" + sub.body_html
            combined_text += "\n\n" + sub.body_text
            for img in sub.extra_images:
                if img not in extras:
                    extras.append(img)
            time.sleep(0.8)  # sleep entre subpages, evitar rate limit
        except Exception:
            continue

    return FullPage(
        url=overview.url,
        final_url=overview.final_url,
        title=overview.title,
        body_html=combined_html,
        body_text=combined_text,
        main_image_url=overview.main_image_url,
        extra_images=extras[:30],
        status_code=200,
    )


def _get_raw(url: str) -> str:
    """Helper interno: fetch HTML raw sin parsing — para multi-pass extraction."""
    try:
        resp = requests.get(
            url,
            timeout=TIMEOUT_S,
            headers={"User-Agent": USER_AGENT},
            allow_redirects=True,
        )
        return resp.text if resp.status_code < 400 else ""
    except Exception:
        return ""


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
