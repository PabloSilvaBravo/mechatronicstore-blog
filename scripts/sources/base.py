"""
Base abstraction: cada parser implementa `discover(source) -> list[DraftCandidate]`.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class DraftCandidate:
    """Una entrada que el parser detectó. Mínimo viable para procesar después."""
    source_id: str
    source_url: str
    title_en: str
    summary_en: str = ""
    published_at: Optional[str] = None
    author: Optional[str] = None
    body_html: str = ""
    body_text: str = ""
    hero_image_url: Optional[str] = None
