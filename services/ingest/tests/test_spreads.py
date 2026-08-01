import time

from ingest.spreads import compute


def _row(asset, ann, mark=100.0, oi=1e9):
    return {
        "asset": asset,
        "annualized_pct": ann,
        "mark_price": mark,
        "oi_usd": oi,
        "raw_rate": 0.0,
        "interval_hours": 8,
        "next_funding_ts": None,
        "fetched_at": time.time(),
    }


def _state(venue_rates: dict[str, list], stale: set[str] = frozenset()):
    now = time.time()
    return {
        v: {
            "rates": rows,
            "hb": (now - 10_000) if v in stale else now,
            "err": {"consecutive_errors": 0, "last_error": None, "last_error_ts": None},
        }
        for v, rows in venue_rates.items()
    }


def test_basic_spread():
    state = _state({"a": [_row("BTC", 20.0)], "b": [_row("BTC", -5.0)]})
    out = compute(state)
    assert len(out["spreads"]) == 1
    s = out["spreads"][0]
    assert s["short_venue"] == "a" and s["long_venue"] == "b"
    assert abs(s["spread_apy"] - 25.0) < 1e-9


def test_stale_venue_excluded():
    state = _state({"a": [_row("BTC", 20.0)], "b": [_row("BTC", -5.0)]}, stale={"b"})
    out = compute(state)
    assert out["spreads"] == []
    assert any(v["status"] == "degraded" for v in out["venues"])


def test_mark_price_conflict_excluded():
    # same canonical symbol, 2x price disagreement => collision, excluded + reported
    state = _state({"a": [_row("XYZ", 50.0, mark=100.0)], "b": [_row("XYZ", -50.0, mark=200.0)]})
    out = compute(state)
    assert out["spreads"] == []
    assert out["symbol_conflicts"] == ["XYZ"]


def test_liquidity_floor():
    state = _state({"a": [_row("BTC", 20.0, oi=1000)], "b": [_row("BTC", -5.0)]})
    out = compute(state)
    assert out["spreads"] == []


def test_none_oi_passes_floor():
    # Binance-via-HL has oi_usd=None — must not be filtered
    state = _state({"a": [_row("BTC", 20.0, oi=None, mark=None)], "b": [_row("BTC", -5.0)]})
    out = compute(state)
    assert len(out["spreads"]) == 1
