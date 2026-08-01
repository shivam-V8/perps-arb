from typing import Protocol

import httpx

from ..models import NormalizedRate


class VenueAdapter(Protocol):
    name: str

    async def fetch(self, http: httpx.AsyncClient) -> list[NormalizedRate]:
        """Fetch and normalize all funding rates for this venue.

        Must raise on total failure (poller records the error); individual
        bad rows are dropped, never raised.
        """
        ...


def safe_float(value, default: float | None = None) -> float | None:
    """Parse venue numerics (usually strings, e.g. '4.4392e-06'). None/'' -> default."""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
