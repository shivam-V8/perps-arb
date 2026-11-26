#!/usr/bin/env bash
# One-time setup of the ChainMatch EC2 host (Ubuntu 22.04/24.04). Run as the ubuntu user:
#   ssh chainmatch-ec2 'bash -s' < scripts/server-setup.sh
# Idempotent: safe to run again.
set -euo pipefail

APP=/srv/chainmatch
NODE_MAJOR=22

echo "== packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg nginx postgresql postgresql-contrib unattended-upgrades ufw rsync jq xz-utils

echo "== swap (2G) for builds"
if ! sudo swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "== node $NODE_MAJOR + pnpm + pm2"
if ! node -v 2>/dev/null | grep -q "^v$NODE_MAJOR"; then
  # official binary from nodejs.org (works on any Ubuntu release), checksum-verified
  V=$(curl -fsSL https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/SHASUMS256.txt | grep -oE "node-v[0-9.]+-linux-x64.tar.xz" | head -1)
  TMP=$(mktemp -d)
  curl -fsSL -o "$TMP/$V" "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/$V"
  curl -fsSL "https://nodejs.org/dist/latest-v${NODE_MAJOR}.x/SHASUMS256.txt" | grep " $V\$" | (cd "$TMP" && sha256sum -c -)
  sudo tar -xJf "$TMP/$V" -C /usr/local --strip-components=1
  rm -rf "$TMP"
fi
sudo corepack enable
sudo npm install -g pm2@latest >/dev/null
pm2 install pm2-logrotate >/dev/null 2>&1 || true
sudo env PATH=$PATH pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

echo "== app dirs"
sudo mkdir -p $APP/releases $APP/shared $APP/backups
sudo chown -R "$USER:$USER" $APP
chmod 700 $APP/shared $APP/backups

echo "== postgres (localhost only)"
if [ ! -f $APP/shared/db-password ]; then
  openssl rand -hex 24 > $APP/shared/db-password && chmod 600 $APP/shared/db-password
fi
DBPW=$(cat $APP/shared/db-password)
sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='chainmatch'" | grep -q 1 \
  || sudo -u postgres psql -c "create role chainmatch login password '$DBPW'"
sudo -u postgres psql -c "alter role chainmatch password '$DBPW'" >/dev/null
sudo -u postgres psql -tAc "select 1 from pg_database where datname='chainmatch'" | grep -q 1 \
  || sudo -u postgres createdb -O chainmatch chainmatch

echo "== nightly backups (keep 14)"
cat > $APP/backup.sh <<'EOS'
#!/usr/bin/env bash
set -euo pipefail
D=/srv/chainmatch/backups
PGPASSWORD=$(cat /srv/chainmatch/shared/db-password) pg_dump -h 127.0.0.1 -U chainmatch -Fc chainmatch > "$D/chainmatch-$(date +%F).dump"
ls -1t $D/*.dump | tail -n +15 | xargs -r rm --
EOS
chmod 700 $APP/backup.sh
{ crontab -l 2>/dev/null | grep -v 'chainmatch/backup.sh' || true; echo "17 3 * * * /srv/chainmatch/backup.sh >> /srv/chainmatch/backups/backup.log 2>&1"; } | crontab -

echo "== firewall"
sudo ufw allow OpenSSH >/dev/null
sudo ufw allow 'Nginx Full' >/dev/null
sudo ufw --force enable >/dev/null

echo "== done: $(node -v), pnpm via corepack, pm2 $(pm2 -v), $(psql --version | head -1), nginx $(nginx -v 2>&1 | cut -d/ -f2)"
