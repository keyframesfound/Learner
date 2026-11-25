#!/bin/sh
# One-time: install Postgres if missing, create the learner role + database,
# apply the schema, point .env at it. Needs root: sudo sh ops/init-db.sh
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

# fresh install: the database holds nothing yet, so drop and rebuild the schema
PGPASSWORD="$PW" psql -h 127.0.0.1 -U learner -d learner -q \
  -c 'drop schema if exists public cascade; create schema public;'

PGPASSWORD="$PW" psql -h 127.0.0.1 -U learner -d learner -q -v ON_ERROR_STOP=1 -f "$DB_SQL"

if grep -q '^DATABASE_URL=' "$ENV"; then
  sed -i "s#^DATABASE_URL=.*#DATABASE_URL=postgres://learner:$PW@127.0.0.1:5432/learner#" "$ENV"
else
  echo "DATABASE_URL=postgres://learner:$PW@127.0.0.1:5432/learner" >> "$ENV"
fi

chown developer:developer "$ENV"
chmod 600 "$ENV"

echo "postgres ready, schema applied, .env updated"
