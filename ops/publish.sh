#!/bin/sh
# Publish the deployed working tree to GitHub.
export PATH=/usr/local/bin:/usr/bin:/bin
# The server tree is the source of truth for what is running at /learner, so any
# uncommitted change here is a change that is live but missing from the repo.
#   ops/publish.sh            commit + push if dirty (quiet when clean)
# Always safe to run repeatedly.
set -e
cd /home/developer/learner
export GIT_TERMINAL_PROMPT=0

dirty=$(git status --porcelain --untracked-files=normal)
if [ -z "$dirty" ]; then
  exit 0
fi

git add -A
# never publish a half-written build artefact or a secret
git reset -q -- .next node_modules .env 2>/dev/null || true

msg="chore(sync): $1 $(date '+%Y-%m-%d %H:%M')"
git -c user.name="learner-deploy" -c user.email="developer@ssc.edu.hk" commit -q -m "$msg" || exit 0

if git push -q origin main 2>/tmp/learner-push.err; then
  echo "$(date '+%F %T') published: $msg"
else
  echo "$(date '+%F %T') PUSH FAILED: $msg"
  cat /tmp/learner-push.err
  exit 1
fi
