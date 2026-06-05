#!/usr/bin/env bash
# Fail if any source or public file still references the legacy healthos.vn host.
# Excludes i18n message files (user-facing copy may legitimately mention the old name)
# and the seo __tests__ directory.
set -euo pipefail

PATTERN="healthos\.vn"
DIRS="src public"
EXCLUDES=(
  "--exclude-dir=__tests__"
  "--exclude=*.json"
)

if grep -rIn "${EXCLUDES[@]}" "$PATTERN" $DIRS 2>/dev/null; then
  echo ""
  echo "ERROR: Found references to legacy host 'healthos.vn' in source files."
  echo "Replace them with 'healthos.page' and re-run."
  exit 1
fi

echo "OK: No legacy healthos.vn references found."
