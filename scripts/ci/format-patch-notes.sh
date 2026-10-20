#!/usr/bin/env bash
# Format and normalize release patch notes for GitHub Actions releases.
# Handles:
#   - Flattened single-line Markdown
#   - Escaped newline characters (\n, \r\n)
#   - Existing multiline Markdown (preserves structure)
#
# Usage:
#   bash scripts/ci/format-patch-notes.sh "<raw_notes>" [output_file]
#   echo "<raw_notes>" | bash scripts/ci/format-patch-notes.sh - [output_file]
set -e

raw_input="${1:-}"
if [ -z "$raw_input" ] || [ "$raw_input" = "-" ]; then
  raw_input="$(cat)"
fi

# 1. Unescape literal \n and \r\n
formatted=$(printf "%b" "$raw_input")

# 2. If the text has no newlines, it was flattened into a single line by the web input.
# Reconstruct markdown line breaks based on standard delimiters:
if [[ "$formatted" != *$'\n'* ]]; then
  # Step 1: Put double newline before headers (##, ###, etc.)
  # Note: The H1 title ("# Novyse ... - Subtitle") is preserved intact
  formatted=$(printf "%s" "$formatted" | sed -E 's/ +(#{1,6} +)/\n\n\1/g')

  # Step 2: Separate the first bullet following a section or category header (## or ###, never #)
  formatted=$(printf "%s" "$formatted" | sed -E 's/^(#{2,6} [^\n*•-]+) +([*•] +)/\1\n\n\2/gm')
  formatted=$(printf "%s" "$formatted" | sed -E 's/^(#{2,6} [^\n*•-]+) +(- [A-Z*#])/\1\n\n\2/gm')

  # Step 3: For lines that do NOT start with #, separate subsequent bullets into new lines
  formatted=$(printf "%s" "$formatted" | sed -E '/^#/! s/ +([*•] +)/\n\1/g')
  formatted=$(printf "%s" "$formatted" | sed -E '/^#/! s/ +(- [A-Z*#])/\n\1/g')

  # Step 4: Numbered lists (1. Item)
  formatted=$(printf "%s" "$formatted" | sed -E 's/ +([0-9]+\. +)/\n\1/g')

  # Step 5: Blockquotes (> Note)
  formatted=$(printf "%s" "$formatted" | sed -E 's/ +(> +)/\n\n\1/g')

  # Step 6: Horizontal dividers (---)
  formatted=$(printf "%s" "$formatted" | sed -E 's/ +(---)/\n\n---\n\n/g')
fi

# 3. Clean up excessive blank lines (max 1 blank line between sections)
formatted=$(printf "%s\n" "$formatted" | awk '
  NF == 0 { blank++; if (blank <= 1) print ""; next }
  { blank = 0; print }
')

# 4. Output to file or stdout
output_file="${2:-}"
if [ -n "$output_file" ]; then
  printf "%s\n" "$formatted" > "$output_file"
else
  printf "%s\n" "$formatted"
fi
