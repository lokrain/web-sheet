#!/bin/bash
set -e

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

paths_to_remove=(
  "$repo_root/.next"
  "$repo_root/out"
  "$repo_root/coverage"
  "$repo_root/.test-dist"
  "$repo_root/.tmp-tscheck"
  "$repo_root/bench/results.json"
  "$repo_root/.jest-localstorage"
)

removed=()
missing=()

for p in "${paths_to_remove[@]}"; do
  if [ -e "$p" ]; then
    rm -rf "$p"
    removed+=("$p")
  else
    missing+=("$p")
  fi
done

echo "clean complete" >&2

REMOVED_NL="$(printf '%s\n' "${removed[@]}")" MISSING_NL="$(printf '%s\n' "${missing[@]}")" python3 - <<'PY'
import json
import os

def split_nl(v: str):
  v = (v or '').strip('\n')
  return v.split('\n') if v else []

print(json.dumps({
  "ok": True,
  "removed": split_nl(os.environ.get("REMOVED_NL", "")),
  "missing": split_nl(os.environ.get("MISSING_NL", "")),
}, indent=2))
PY
