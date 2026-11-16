#!/bin/bash
# The backup container's entry point: runs fpr-backup on BACKUP_SCHEDULE, or
# idles when BACKUP_S3_BUCKET is empty, so an instance without a backup bucket
# still starts with a plain `docker compose up`. With a command, such as
# `fpr-restore list`, it runs that instead.
set -euo pipefail
[ $# -gt 0 ] && exec "$@"
source /usr/local/lib/fpr-backup/common.sh

if [ -z "${BACKUP_S3_BUCKET:-}" ]; then
  log warn "Backups are off: BACKUP_S3_BUCKET is empty"
  exec sleep infinity
fi
backup_configured || exit 1

if ! output=$(rclone lsf "$BACKUP_ROOT" --max-depth 1 2>&1); then
  log error "The backup bucket can't be reached" output "$(printf '%s' "$output" | tail -n 5)"
  exit 1
fi

schedule=${BACKUP_SCHEDULE:-0 3 * * *}
printf '%s fpr-backup\n' "$schedule" >/tmp/crontab
log info "Backups scheduled" schedule "$schedule" retentionDays "${BACKUP_RETENTION_DAYS:-30}"
exec supercronic -json -quiet -passthrough-logs /tmp/crontab
