#!/usr/bin/env bash
# Deploy ChainMatch to the AWS server with zero downtime.
#   scripts/deploy-aws.sh            build + release + pm2 reload
#   scripts/deploy-aws.sh rollback   switch back to the previous release
# Needs `Host chainmatch-ec2` in ~/.ssh/config and the server env file at
# /srv/chainmatch/shared/.env.production.local (never in git).
set -euo pipefail

HOST=${DEPLOY_HOST:-chainmatch-ec2}
APP=/srv/chainmatch
cd "$(dirname "$0")/.."

if [ "${1:-}" = "rollback" ]; then
  ssh "$HOST" "set -e; cd $APP/releases; prev=\$(ls -1 | sort | tail -2 | head -1); cur=\$(readlink $APP/current | xargs basename);
    [ \"\$prev\" != \"\$cur\" ] || { echo 'no older release'; exit 1; };
    ln -sfn $APP/releases/\$prev $APP/current.tmp && mv -T $APP/current.tmp $APP/current;
    pm2 reload chainmatch --update-env; echo \"rolled back to \$prev\""
  exit 0
fi

REL=$(date -u +%Y%m%d%H%M%S)
echo "== upload release $REL"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .next-build --exclude .open-next --exclude .wrangler \
  --exclude '.env*.local' --exclude .dev.vars --exclude .git --exclude '*.tsbuildinfo' \
  ./ "$HOST:$APP/releases/$REL/"

echo "== build on server"
ssh "$HOST" "set -euo pipefail
  cd $APP/releases/$REL
  ln -sfn $APP/shared/.env.production.local apps/web/.env.production.local
  CI=1 pnpm install --frozen-lockfile --prod=false >/dev/null
  cd apps/web
  NODE_OPTIONS=--max-old-space-size=1536 pnpm build
  set -a; . ./.env.production.local; set +a
  npx drizzle-kit migrate
  ln -sfn $APP/releases/$REL $APP/current.tmp && mv -T $APP/current.tmp $APP/current
  if pm2 describe chainmatch >/dev/null 2>&1; then pm2 reload chainmatch --update-env; else pm2 start ecosystem.config.cjs && pm2 save; fi
  cd $APP/releases && ls -1 | sort | head -n -3 | xargs -r rm -rf
  echo \"live: $REL\""
