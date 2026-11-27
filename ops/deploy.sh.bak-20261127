#!/bin/sh
# Pull, migrate, rebuild, restart. Run as developer; no root needed.
set -e
export PATH=/usr/lib/postgresql/16/bin:$PATH
cd /home/developer/learner
git checkout -- . 2>/dev/null || true
git fetch --all -q
git reset --hard origin/main

# schema + seed are idempotent; a failure here must not take the app down
if grep -q '^DATABASE_URL=' .env; then
  DBURL=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
  psql "$DBURL" -q -v ON_ERROR_STOP=1 -f db/migrate-prod.sql || echo "migrate: warning"
  psql "$DBURL" -q -v ON_ERROR_STOP=1 -f db/seed.sql || echo "seed: warning"
  if [ -f db/seed-f2.sql ]; then
    psql "$DBURL" -q -v ON_ERROR_STOP=1 -f db/seed-f2.sql || echo "seed-f2: warning"
  fi
fi

npm ci --no-audit --no-fund
NEXT_TELEMETRY_DISABLED=1 npm run build
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
systemctl --user restart learner.service
sleep 2
curl -s -o /dev/null -w "learner: %{http_code}\n" http://127.0.0.1:3000/learner
