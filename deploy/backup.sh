#!/usr/bin/env bash
# Nightly database backup. Run from cron on the VPS (see docs/VPS.md).
# Writes a gzipped SQL dump, verifies it, prunes old ones, and optionally copies it off the server.
#   BACKUP_DIR   where dumps go          (default /var/backups/wahednur)
#   KEEP_DAYS    how long to keep them   (default 14)
#   RCLONE_REMOTE  e.g. r2:wahednur-backups  (optional off-server copy)
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${BACKUP_DIR:-/var/backups/wahednur}"
KEEP="${KEEP_DAYS:-14}"
mkdir -p "$OUT"
file="$OUT/wahednur-$(date +%F-%H%M).sql.gz"
trap 'rm -f "$file.tmp"' EXIT   # never leave a half-written dump behind

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$file.tmp"
gzip -t "$file.tmp"                       # refuse a corrupt or empty dump
[ "$(gzip -dc "$file.tmp" | wc -c)" -gt 1000 ] || { echo "backup too small, aborting" >&2; rm -f "$file.tmp"; exit 1; }
mv "$file.tmp" "$file"
chmod 600 "$file"
find "$OUT" -name 'wahednur-*.sql.gz' -mtime +"$KEEP" -delete

if [ -n "${RCLONE_REMOTE:-}" ]; then
  rclone copy "$file" "$RCLONE_REMOTE"
fi
echo "backup ok: $file ($(du -h "$file" | cut -f1))"
