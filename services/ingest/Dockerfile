# Build context is the REPO ROOT (needs shared/symbol-aliases.json):
#   docker build -f services/ingest/Dockerfile .
# docker-compose and fly.toml are both configured accordingly.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY services/ingest/pyproject.toml services/ingest/uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY services/ingest/src ./src
RUN uv sync --frozen --no-dev

COPY shared ./shared

EXPOSE 8100
CMD ["uv", "run", "--no-sync", "uvicorn", "ingest.main:app", "--host", "0.0.0.0", "--port", "8100"]
