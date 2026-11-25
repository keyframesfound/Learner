#!/bin/sh
set -e
export PATH=/usr/lib/postgresql/16/bin:$PATH
cd /home/developer

# connection string (trust auth on the user-space cluster)
grep -v '^DATABASE_URL=' learner/.env > learner/.env.tmp || true
echo 'DATABASE_URL=postgres://developer@127.0.0.1:5433/learner' >> learner/.env.tmp
mv learner/.env.tmp learner/.env
chmod 600 learner/.env

# a unit so the cluster comes back after a reboot
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/learner-db.service <<'EOF'
[Unit]
Description=Learner postgres (user-space cluster)

[Service]
ExecStart=/usr/lib/postgresql/16/bin/postgres -D /home/developer/pgdata -p 5433 -k /tmp
ExecStop=/usr/lib/postgresql/16/bin/pg_ctl -D /home/developer/pgdata stop
Restart=always
RestartSec=2

[Install]
WantedBy=default.target
EOF

pg_ctl -D /home/developer/pgdata stop >/dev/null 2>&1 || true
sleep 1
systemctl --user daemon-reload
systemctl --user enable learner-db.service >/dev/null 2>&1
systemctl --user restart learner-db.service
sleep 3

# fall back to a manual start if the unit refused
if ! pg_isready -h 127.0.0.1 -p 5433 >/dev/null 2>&1; then
  pg_ctl -D /home/developer/pgdata -o "-p 5433 -k /tmp" -l /home/developer/pg.log start >/dev/null 2>&1 || true
  sleep 2
fi
pg_isready -h 127.0.0.1 -p 5433

systemctl --user restart learner.service
sleep 3
curl -s -o /dev/null -w "app %{http_code}\n" http://127.0.0.1:3000/learner/api/auth/ok
