#!/bin/bash
set -e

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
skill_name="$(basename "$skill_dir")"

out="${1:-"$skill_dir/../$skill_name.zip"}"

tmp=""
cleanup() {
  if [ -n "$tmp" ] && [ -f "$tmp" ]; then
    rm -f "$tmp"
  fi
}
trap cleanup EXIT

tmp="$(mktemp)"

echo "packing skill: $skill_name -> $out" >&2

SKILL_DIR="$skill_dir" OUT_ZIP_TMP="$tmp" python3 - <<'PY'
import os
import zipfile

skill_dir = os.environ["SKILL_DIR"]
out_tmp = os.environ["OUT_ZIP_TMP"]

with zipfile.ZipFile(out_tmp, "w", compression=zipfile.ZIP_DEFLATED) as z:
  for root, dirs, files in os.walk(skill_dir):
    # avoid zipping transient folders if they exist
    dirs[:] = [d for d in dirs if d not in {"node_modules", ".next", ".turbo", "dist", "build"}]
    for fn in files:
      p = os.path.join(root, fn)
      rel = os.path.relpath(p, os.path.dirname(skill_dir))
      z.write(p, rel)
PY

mkdir -p "$(dirname "$out")"
mv -f "$tmp" "$out"
tmp=""

echo "packed skill OK" >&2

python3 - <<PY
import json
print(json.dumps({
  "ok": True,
  "skill": "${skill_name}",
  "zipPath": "${out}"
}, indent=2))
PY
