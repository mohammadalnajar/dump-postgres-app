#!/usr/bin/env bash
set -euo pipefail

# Usage:
# ./scripts/backup.sh --host H --port 5432 --db mydb --user u --password p --format custom --include-owner true

# defaults
FORMAT="plain"
INCLUDE_OWNER=""
COMPRESS_LEVEL="0"
ONLY_SCHEMA=""
ONLY_DATA=""
EXCLUDE_SCHEMA=""
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --db) DB="$2"; shift 2 ;;
    --user) USERNAME="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    --include-owner) INCLUDE_OWNER="$2"; shift 2 ;;
    --compress-level) COMPRESS_LEVEL="$2"; shift 2 ;;
    --only-schema) ONLY_SCHEMA="$2"; shift 2 ;;
    --only-data) ONLY_DATA="$2"; shift 2 ;;
    --exclude-schema) EXCLUDE_SCHEMA="$2"; shift 2 ;;
    --extra-args) EXTRA_ARGS="$2"; shift 2 ;;
    *) echo "Unknown arg $1"; exit 1 ;;
  esac
done

STAMP=$(date +"%Y%m%d_%H%M%S")
SAFE_DB=$(echo "${DB:-db}" | sed 's/[^a-zA-Z0-9._-]/_/g')
EXT=".sql"
if [[ "$FORMAT" == "custom" ]]; then EXT=".dump"; fi
if [[ "$FORMAT" == "tar" ]]; then EXT=".tar"; fi
if [[ "$FORMAT" == "directory" ]]; then EXT=""; fi

OUT="/app/backups/${SAFE_DB}_${STAMP}${EXT}"

ARGS=()
[[ -n "${HOST:-}" ]] && ARGS+=("-h" "$HOST")
[[ -n "${PORT:-}" ]] && ARGS+=("-p" "$PORT")
[[ -n "${USERNAME:-}" ]] && ARGS+=("-U" "$USERNAME")
[[ -n "${FORMAT:-}" ]] && ARGS+=("-F" "$FORMAT")

if [[ "$INCLUDE_OWNER" == "false" ]]; then
  ARGS+=("--no-owner")
fi
[[ -n "${ONLY_SCHEMA:-}" ]] && ARGS+=("--schema" "$ONLY_SCHEMA")
[[ "$ONLY_DATA" == "true" ]] && ARGS+=("--data-only")
[[ -n "${EXCLUDE_SCHEMA:-}" ]] && ARGS+=("--exclude-schema" "$EXCLUDE_SCHEMA")
if [[ "$FORMAT" == "custom" || "$FORMAT" == "tar" ]]; then
  ARGS+=("-Z" "$COMPRESS_LEVEL")
fi
if [[ -n "${EXTRA_ARGS:-}" ]]; then
  # shellcheck disable=SC2206
  EXTRA=($EXTRA_ARGS)
  ARGS+=("${EXTRA[@]}")
fi

if [[ "$FORMAT" == "directory" ]]; then
  mkdir -p "$OUT"
  ARGS+=("-f" "$OUT")
else
  ARGS+=("-f" "$OUT")
fi

PGPASSWORD="${PASSWORD:-}" pg_dump "${ARGS[@]}" "$DB"
echo "Backup created: $OUT"
