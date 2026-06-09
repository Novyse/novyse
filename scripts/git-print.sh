#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Help/Usage function
usage() {
  echo "Usage: $0 -id <COMMIT_HASH>"
  echo "Example: $0 -id 1f8ab5264a594201cc624eb42e4b4836f4b6c036"
  exit 1
}

# Parse options
COMMIT_ID=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -id)
      if [[ -n "$2" && "$2" != -* ]]; then
        COMMIT_ID="$2"
        shift 2
      else
        echo "Error: Missing value for -id"
        usage
      fi
      ;;
    *)
      # Fallback to positional argument if -id is not specified
      if [[ -z "$COMMIT_ID" ]]; then
        COMMIT_ID="$1"
        shift
      else
        echo "Error: Unknown argument '$1'"
        usage
      fi
      ;;
  esac
done

if [[ -z "$COMMIT_ID" ]]; then
  echo "Error: Commit ID is required."
  usage
fi

# Check if the commit exists in the repo
if ! git rev-parse --verify "$COMMIT_ID" &>/dev/null; then
  echo "Error: Commit '$COMMIT_ID' not found in this repository."
  exit 1
fi

# Run the git log command
git log --oneline "${COMMIT_ID}^..HEAD"
