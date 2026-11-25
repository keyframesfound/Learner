#!/bin/sh
# Pull, rebuild, restart. Run as developer; no root needed.
set -e
cd /home/developer/learner
git checkout -- . 2>/dev/null || true
git fetch --all -q
git reset --hard origin/main
npm ci --no-audit --no-fund
NEXT_TELEMETRY_DISABLED=1 npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
systemctl --user restart learner.service
sleep 2
curl -s -o /dev/null -w "learner: %{http_code}\n" http://127.0.0.1:3000/learner
