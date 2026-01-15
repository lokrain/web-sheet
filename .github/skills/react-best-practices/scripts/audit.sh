#!/bin/bash
set -e

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"

failures=()
warnings=()

required_files=(
  "$skill_dir/SKILL.md"
  "$skill_dir/AGENTS.md"
  "$skill_dir/README.md"
  "$skill_dir/metadata.json"
)

for f in "${required_files[@]}"; do
  if [ ! -f "$f" ]; then
    failures+=("missing_required_file:$f")
  fi
done

if [ ! -d "$skill_dir/scripts" ]; then
  failures+=("missing_required_dir:$skill_dir/scripts")
fi

if [ ! -d "$skill_dir/rules" ]; then
  failures+=("missing_required_dir:$skill_dir/rules")
else
  rule_count=$(find "$skill_dir/rules" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
  if [ "$rule_count" -lt 5 ]; then
    warnings+=("unexpected_low_rule_count:$rule_count")
  fi
fi

if [ -f "$skill_dir/SKILL.md" ]; then
  name_line=$(grep -E '^name: ' "$skill_dir/SKILL.md" | head -n 1 || true)
  if [ -z "$name_line" ]; then
    failures+=("skill_md_missing_frontmatter_name")
  else
    name_value="${name_line#name: }"
    if [ "$name_value" != "react-best-practices" ]; then
      warnings+=("skill_md_name_mismatch:${name_value}")
    fi
  fi

  line_count=$(wc -l "$skill_dir/SKILL.md" | awk '{print $1}')
  if [ "$line_count" -gt 500 ]; then
    warnings+=("skill_md_over_500_lines:$line_count")
  fi
fi

zip_path="$skill_dir/../react-best-practices.zip"
zip_exists=false
if [ -f "$zip_path" ]; then
  zip_exists=true
fi

ok=true
if [ ${#failures[@]} -gt 0 ]; then
  ok=false
fi

# Status messages to stderr
if [ "$ok" = true ]; then
  echo "react-best-practices: audit OK" >&2
else
  echo "react-best-practices: audit FAILED" >&2
fi

# Machine-readable JSON to stdout
failures_nl=""
for x in "${failures[@]}"; do failures_nl+="$x"$'\n'; done
warnings_nl=""
for x in "${warnings[@]}"; do warnings_nl+="$x"$'\n'; done

OK="$ok" SKILL_DIR="$skill_dir" ZIP_PATH="$zip_path" ZIP_EXISTS="$zip_exists" FAILURES_NL="$failures_nl" WARNINGS_NL="$warnings_nl" python3 - <<'PY'
import json
import os

def split_nl(value: str):
  value = (value or "").strip("\n")
  if not value:
    return []
  return value.split("\n")

data = {
  "ok": os.environ.get("OK") == "true",
  "skillDir": os.environ["SKILL_DIR"],
  "zipExpectedPath": os.environ["ZIP_PATH"],
  "zipExists": os.environ.get("ZIP_EXISTS") == "true",
  "failures": split_nl(os.environ.get("FAILURES_NL", "")),
  "warnings": split_nl(os.environ.get("WARNINGS_NL", "")),
}

print(json.dumps(data, indent=2))
PY
