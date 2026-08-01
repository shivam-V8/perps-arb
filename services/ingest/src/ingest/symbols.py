"""Symbol canonicalization — the highest-risk correctness code in the service.

A collision (two different tokens mapping to one canonical symbol) manufactures
a fake cross-venue spread. Defense in depth:
1. explicit alias map (shared/symbol-aliases.json)
2. cross-venue mark-price sanity gate in spreads.py
"""

import json
from functools import lru_cache

from .config import find_aliases_file

# Order matters: longest quote suffixes stripped first.
_QUOTE_SUFFIXES = ("-USD-PERP", "-PERP", "USDT", "USDC", "USD")


@lru_cache(maxsize=1)
def _aliases() -> dict[str, dict]:
    raw = json.loads(find_aliases_file().read_text())
    return {k.upper(): v for k, v in raw.items() if not k.startswith("_")}


def canonicalize(venue_symbol: str) -> tuple[str, float]:
    """Return (canonical_asset, price_multiplier).

    mark_price should be divided by price_multiplier so all venues quote
    per-token (kPEPE / 1000PEPE marks are per-1000 tokens).
    """
    sym = venue_symbol.upper().strip()
    for suffix in _QUOTE_SUFFIXES:
        if sym.endswith(suffix) and len(sym) > len(suffix):
            sym = sym[: -len(suffix)]
            break
    alias = _aliases().get(sym)
    if alias:
        return alias["canonical"], float(alias.get("multiplier", 1))
    return sym, 1.0
