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
import stat

skill_dir = os.environ["SKILL_DIR"]
out_tmp = os.environ["OUT_ZIP_TMP"]

EXCLUDED_DIRS = {"node_modules", ".next", ".turbo", "dist", "build"}
FIXED_DATE_TIME = (1980, 1, 1, 0, 0, 0)

def iter_files(root_dir: str):
  for root, dirs, files in os.walk(root_dir):
    dirs[:] = sorted([d for d in dirs if d not in EXCLUDED_DIRS])
    for fn in sorted(files):
      abs_path = os.path.join(root, fn)
      rel = os.path.relpath(abs_path, os.path.dirname(root_dir))
      rel = rel.replace(os.sep, "/")
      yield abs_path, rel

with zipfile.ZipFile(out_tmp, "w", compression=zipfile.ZIP_DEFLATED) as z:
  for abs_path, rel in iter_files(skill_dir):
    with open(abs_path, "rb") as f:
      data = f.read()

    st = os.stat(abs_path)
    mode = stat.S_IMODE(st.st_mode)

    info = zipfile.ZipInfo(rel)
    info.date_time = FIXED_DATE_TIME
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (mode & 0xFFFF) << 16

    z.writestr(info, data)
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
