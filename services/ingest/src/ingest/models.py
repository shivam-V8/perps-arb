from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class NormalizedRate:
    venue: str
    asset: str  # canonical, e.g. "BTC", "PEPE"
    venue_symbol: str  # raw symbol as the venue reports it
    raw_rate: float  # per-interval funding rate (decimal)
    interval_hours: float
    annualized_pct: float  # raw_rate * (24/interval_hours) * 365 * 100
    mark_price: float | None
    oi_usd: float | None
    next_funding_ts: int | None  # unix seconds
    fetched_at: float  # unix seconds

    def to_dict(self) -> dict:
        return asdict(self)


def annualize_pct(raw_rate: float, interval_hours: float) -> float:
    return raw_rate * (24 / interval_hours) * 365 * 100
