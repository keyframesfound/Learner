#!/bin/sh
# One-time: install Postgres if missing, create the learner role + database, record
# the connection string in .env, then apply the schema. Needs root:
#   sudo sh ops/init-db.sh
set -e
ENV=/home/developer/learner/.env
DB_SQL=/home/developer/learner/db/schema.sql

if ! command -v psql >/dev/null 2>&1; then
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql >/dev/null
fi
systemctl enable --now postgresql >/dev/null 2>&1 || true

PW=$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='learner'" | grep -q 1; then
  sudo -u postgres psql -q -c "ALTER ROLE learner WITH LOGIN PASSWORD '$PW'"
else
  sudo -u postgres psql -q -c "CREATE ROLE learner WITH LOGIN PASSWORD '$PW'"
fi

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='learner'" | grep -q 1; then
  sudo -u postgres createdb -O learner learner
fi

# 1. the connection string first: even if the schema fails, the app can connect
if grep -q '^DATABASE_URL=' "$ENV"; then
  sed -i "s#^DATABASE_URL=.*#DATABASE_URL=postgres://learner:$PW@127.0.0.1:5432/learner#" "$ENV"
else
  echo "DATABASE_URL=postgres://learner:$PW@127.0.0.1:5432/learner" >> "$ENV"
fi
chown developer:developer "$ENV"
chmod 600 "$ENV"
echo "1/2 database url written"

# 2. empty database, so rebuild the schema from scratch
PGPASSWORD="$PW" psql -h 127.0.0.1 -U learner -d learner -q \
  -c 'drop schema if exists public cascade; create schema public;'

set +e
PGPASSWORD="$PW" psql -h 127.0.0.1 -U learner -d learner -v ON_ERROR_STOP=1 -f "$DB_SQL"
RC=$?
set -e
if [ "$RC" -ne 0 ]; then
  echo "2/2 schema failed at the statement above; the connection string is set, fix the SQL and run:"
  echo "    PGPASSWORD=... psql -h 127.0.0.1 -U learner -d learner -f db/schema.sql"
  exit 1
fi
echo "2/2 schema applied"
