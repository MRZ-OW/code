#!/usr/bin/env bash
# Create a NEW PRIVATE GitHub repo from this folder and push it.
#
# Why this exists: the automated session that scaffolded VoiceBridge could not
# create a repo for you (the GitHub integration lacked repo-creation
# permission), so it left you this one-shot script. Run it from inside the
# `voicebridge/` folder on your own machine.
#
# Requirements: git, and EITHER the GitHub CLI (`gh`, recommended) OR a remote
# you create yourself in the browser.
#
# Usage:
#   ./scripts/bootstrap_private_repo.sh [repo-name]
# Default repo name: voicebridge
set -euo pipefail

REPO_NAME="${1:-voicebridge}"

cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  git init
fi
git add -A
git commit -m "Initial commit: VoiceBridge real-time AI voice changer" || true
git branch -M main

if command -v gh >/dev/null 2>&1; then
  echo "Creating private repo '$REPO_NAME' via GitHub CLI..."
  gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
  echo "Done: $(gh repo view "$REPO_NAME" --json url -q .url)"
else
  cat <<EOF

GitHub CLI ('gh') not found. Do it manually:
  1. Create a new PRIVATE repo named '$REPO_NAME' at https://github.com/new
     (do NOT add a README/license - this folder already has them).
  2. Then run:
       git remote add origin git@github.com:<your-username>/$REPO_NAME.git
       git push -u origin main

Or install gh (https://cli.github.com) and re-run this script.
EOF
fi
