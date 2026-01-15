#!/bin/bash
set -euo pipefail

# Wrapper kept for backward compatibility with package.json scripts.
# Canonical implementation lives under .github/skills/scripts.

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

exec bash "$repo_root/.github/skills/scripts/clean.sh"
