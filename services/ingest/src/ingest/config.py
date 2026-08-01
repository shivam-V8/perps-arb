from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    poll_interval_s: int = 30
    stale_after_s: int = 180
    min_spread_oi_usd: float = 250_000
    allowed_origins: str = "http://localhost:3000"
    # Assets whose cross-venue mark prices disagree by more than this fraction
    # are excluded from spreads (symbol-collision guard).
    mark_price_tolerance: float = 0.05
    request_timeout_s: float = 10.0

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


def find_aliases_file() -> Path:
    """Locate shared/symbol-aliases.json from repo layout or Docker layout."""
    here = Path(__file__).resolve()
    for base in [*here.parents, Path("/app")]:
        candidate = base / "shared" / "symbol-aliases.json"
        if candidate.exists():
            return candidate
    raise FileNotFoundError("shared/symbol-aliases.json not found")


settings = Settings()
