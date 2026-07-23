#!/usr/bin/env bash
# PostToolUse hook: auto-format .tsx/.jsx/.md files with Prettier (+ ESLint for .tsx/.jsx)
set -uo pipefail

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

[ -z "$file_path" ] && exit 0

case "$file_path" in
  *.tsx|*.jsx)
    npx prettier --write "$file_path" >/dev/null 2>&1
    npx eslint --fix "$file_path" >/dev/null 2>&1
    ;;
  *.md)
    npx prettier --write "$file_path" >/dev/null 2>&1
    ;;
esac

exit 0
