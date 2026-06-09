#!/usr/bin/env bash
# Fail if any source or public file still references a legacy public host.
# Excludes i18n message files (user-facing copy may legitimately mention the old name)
# and the seo __tests__ directory.
#
# Patterns are anchored with non-word boundaries so the current production host
# `healthos.io.vn` does NOT match the legacy substring `healthos.vn`.
set -euo pipefail

# Each pattern is a Perl-compatible regex; bracket classes [^a-z0-9.] ensure
# we do not match the new domain `healthos.io.vn` (which contains the substring).
PATTERNS=(
  "(^|[^a-z0-9.-])healthos\.vn([^a-z0-9.-]|$)"
  "(^|[^a-z0-9.-])healthos\.page([^a-z0-9.-]|$)"
)
DIRS="src public"
EXCLUDES=(
  "--exclude-dir=__tests__"
  "--exclude=*.json"
)

found=0
for pattern in "${PATTERNS[@]}"; do
  if grep -rInE "${EXCLUDES[@]}" "$pattern" $DIRS 2>/dev/null; then
    found=1
  fi
done

if [ "$found" -ne 0 ]; then
  echo ""
  echo "ERROR: Found references to legacy host(s) in source files."
  echo "Current public hosts: healthos.io.vn (FE), healthos.shop (BFF/API/WS)."
  exit 1
fi

echo "OK: No legacy host references found."
