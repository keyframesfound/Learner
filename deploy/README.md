# Deploy

Target: one Ubuntu 24.04 box, 2 vCPU / 4 GB, Docker installed.

## First time

    cp .env.example .env        # set POSTGRES_PASSWORD, AUTH_SECRET, SITE_ADDRESS
    make up                     # build and start db, app, caddy, backup
    make migrate                # apply db/schema.sql
    make seed                   # import content/*.json

Point an A record at the box. Caddy obtains the certificate automatically once
SITE_ADDRESS is the real hostname.

## Operations

    make logs          # tail all services
    make psql          # open a shell on the database
    make dump          # write backups/learner-YYYY-MM-DD.sql now
    make export        # write the lesson tree back to content/*.json
    make deploy        # pull, rebuild, restart app only

## Sizing

Postgres is configured for a 4 GB box (shared_buffers 256 MB, max_connections 100).
A class of 30 in a drill session produces roughly 30 writes per six minutes, which
is nothing. The load that matters is the first Pyodide download, and that is served
from a CDN, not from this box.

## Time

Everything is pinned to Asia/Hong_Kong: container timezone, Postgres timezone, and
the day boundary in the daily board. A leaderboard that resets at 08:00 because the
server runs UTC is the kind of bug nobody reports and everybody stops trusting.

## Backups

The backup service dumps daily and keeps 7 days. Copy backups/ off the box weekly
with rsync or rclone; a backup that only lives on the machine it backs up is not a
backup.
