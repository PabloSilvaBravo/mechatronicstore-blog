"""Source parsers registry."""
from . import generic_rss
from . import instructables
from . import adafruit_learn
from . import sparkfun
from . import all_about_circuits

PARSERS = {
    "generic_rss": generic_rss,
    "instructables": instructables,
    "adafruit_learn": adafruit_learn,
    "sparkfun": sparkfun,
    "all_about_circuits": all_about_circuits,
}


def get(parser_id: str):
    if parser_id not in PARSERS:
        raise ValueError(f"Unknown parser_id: {parser_id}. Valid: {list(PARSERS)}")
    return PARSERS[parser_id]
