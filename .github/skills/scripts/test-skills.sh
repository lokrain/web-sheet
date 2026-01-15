#!/bin/bash
set -e

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
skills_root="$repo_root/.github/skills"

tmpdir=""
cleanup() {
  if [ -n "$tmpdir" ] && [ -d "$tmpdir" ]; then
    rm -rf "$tmpdir"
  fi
}
trap cleanup EXIT

tmpdir="$(mktemp -d)"
results_jsonl="$tmpdir/results.jsonl"
: > "$results_jsonl"

if [ ! -d "$skills_root" ]; then
  echo "skills root missing: $skills_root" >&2
  python3 - <<PY
import json
print(json.dumps({"ok": False, "error": "skills_root_missing", "skillsRoot": "${skills_root}"}, indent=2))
PY
  exit 1
fi

ok=true

shopt -s nullglob
for skill_dir in "$skills_root"/*/ ; do
  skill_dir="${skill_dir%/}"
  name="$(basename "$skill_dir")"
  record_tmp="$tmpdir/$name.json"

  failures=()
  warnings=()

  if [ ! -f "$skill_dir/SKILL.md" ]; then
    failures+=("missing:SKILL.md")
  fi
  if [ ! -d "$skill_dir/scripts" ]; then
    failures+=("missing:scripts/")
  fi

  audit_path="$skill_dir/scripts/audit.sh"
  pack_path="$skill_dir/scripts/pack.sh"

  audit_ok=false
  pack_ok=false

  if [ -x "$audit_path" ]; then
    echo "audit $name" >&2
    audit_json="$tmpdir/$name.audit.json"
    if "$audit_path" > "$audit_json"; then
      audit_ok=$(python3 - <<PY
import json
with open('${audit_json}', 'r', encoding='utf-8') as f:
  d=json.load(f)
print('true' if d.get('ok') else 'false')
PY
)
      if [ "$audit_ok" != "true" ]; then
        failures+=("audit_failed")
      fi
    else
      failures+=("audit_script_error")
    fi
  else
    warnings+=("missing_or_not_executable:scripts/audit.sh")
  fi

  zip_expected="$skills_root/$name.zip"

  if [ -x "$pack_path" ]; then
    echo "pack $name" >&2
    pack_json="$tmpdir/$name.pack.json"
    if "$pack_path" "$zip_expected" > "$pack_json"; then
      pack_ok=$(python3 - <<PY
import json
with open('${pack_json}', 'r', encoding='utf-8') as f:
  d=json.load(f)
print('true' if d.get('ok') else 'false')
PY
)
      if [ "$pack_ok" != "true" ]; then
        failures+=("pack_failed")
      fi
    else
      failures+=("pack_script_error")
    fi
  else
    warnings+=("missing_or_not_executable:scripts/pack.sh")
  fi

  zip_exists=false
  if [ -f "$zip_expected" ]; then
    zip_exists=true
  else
    failures+=("missing_zip:${name}.zip")
  fi

  if [ ${#failures[@]} -gt 0 ]; then
    ok=false
  fi

  FAILURES_NL="$(printf '%s\n' "${failures[@]}")" \
  WARNINGS_NL="$(printf '%s\n' "${warnings[@]}")" \
  NAME="$name" \
  SKILL_DIR="$skill_dir" \
  AUDIT_OK="$audit_ok" \
  PACK_OK="$pack_ok" \
  ZIP_EXPECTED="$zip_expected" \
  ZIP_EXISTS="$zip_exists" \
  python3 - <<'PY' > "$record_tmp"
import json
import os

def split_nl(v: str):
  v = (v or '').strip('\n')
  return v.split('\n') if v else []

print(json.dumps({
  "name": os.environ["NAME"],
  "skillDir": os.environ["SKILL_DIR"],
  "auditOk": os.environ.get("AUDIT_OK") == "true",
  "packOk": os.environ.get("PACK_OK") == "true",
  "zipExpected": os.environ["ZIP_EXPECTED"],
  "zipExists": os.environ.get("ZIP_EXISTS") == "true",
  "failures": split_nl(os.environ.get("FAILURES_NL", "")),
  "warnings": split_nl(os.environ.get("WARNINGS_NL", "")),
}, indent=2))
PY

  cat "$record_tmp" >> "$results_jsonl"
  echo >> "$results_jsonl"

done

OK="$ok" SKILLS_ROOT="$skills_root" RESULTS_JSONL="$results_jsonl" python3 - <<'PY'
import json
import pathlib
import os

p = pathlib.Path(os.environ["RESULTS_JSONL"])
items = []
for block in p.read_text(encoding='utf-8').strip().split("\n\n"):
  if not block.strip():
    continue
  items.append(json.loads(block))

skills_root = os.environ.get("SKILLS_ROOT")

print(json.dumps({
  "ok": os.environ.get("OK") == "true",
  "skillsRoot": os.environ["SKILLS_ROOT"],
  "skills": items,
}, indent=2))
PY
