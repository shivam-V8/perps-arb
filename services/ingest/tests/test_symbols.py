from ingest.models import annualize_pct
from ingest.symbols import canonicalize


def test_quote_suffix_stripping():
    assert canonicalize("BTCUSDT") == ("BTC", 1.0)
    assert canonicalize("BTC-USD-PERP") == ("BTC", 1.0)
    assert canonicalize("ETH-PERP") == ("ETH", 1.0)
    assert canonicalize("SOLUSDC") == ("SOL", 1.0)
    assert canonicalize("BTC") == ("BTC", 1.0)


def test_multiplier_aliases():
    assert canonicalize("kPEPE") == ("PEPE", 1000.0)
    assert canonicalize("1000PEPEUSDT") == ("PEPE", 1000.0)
    assert canonicalize("kBONK") == ("BONK", 1000.0)
    assert canonicalize("1MBABYDOGEUSDT") == ("BABYDOGE", 1000000.0)


def test_suffix_not_stripped_to_empty():
    # a symbol that IS a suffix must not become empty
    assert canonicalize("USDT")[0] != ""


def test_annualization():
    # hourly: x24x365; 8h: x3x365
    assert abs(annualize_pct(1e-5, 1) - 1e-5 * 24 * 365 * 100) < 1e-9
    assert abs(annualize_pct(1e-4, 8) - 1e-4 * 3 * 365 * 100) < 1e-9
    assert abs(annualize_pct(1e-4, 4) - 1e-4 * 6 * 365 * 100) < 1e-9
