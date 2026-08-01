# ChainMatch dev tasks

# start redis + ingest (docker) and the web app
dev:
    docker compose up -d redis ingest
    pnpm --filter web dev

# start only redis (docker), run ingest locally with hot reload (faster iteration)
ingest:
    docker compose up -d redis
    cd services/ingest && REDIS_URL=redis://localhost:6379/0 uv run uvicorn ingest.main:app --port 8100 --reload

# run the web app only (expects INGEST_API_URL in apps/web/.env.local)
web:
    pnpm --filter web dev

# ingest unit tests
test:
    cd services/ingest && uv run pytest -q

# stop all containers
down:
    docker compose down

# deploy ingest service to Fly.io (context = repo root so shared/ is included)
deploy-ingest:
    fly deploy --config services/ingest/fly.toml --dockerfile services/ingest/Dockerfile .
