#!/bin/bash
# Brings an instance's data back from the backup bucket. Run inside the backup
# container, with the same variables as the instance:
#
#   fpr-restore list                list the database dumps, oldest first
#   fpr-restore database [KEY]      restore a dump, the latest by default, into
#                                   DATABASE_URL, which must have no tables yet
#   fpr-restore pictures            copy the backed-up pictures into S3_BUCKET
#   fpr-restore logs DIRECTORY      copy the backed-up logs into DIRECTORY, the
#                                   VictoriaLogs volume mounted writable, with
#                                   victorialogs stopped
set -euo pipefail
source /usr/local/lib/fpr-backup/common.sh

backup_configured || exit 1

latest_dump() {
  rclone lsf "$BACKUP_ROOT/postgres" --files-only | sort | tail -n 1
}

restore_database() {
  local key=${1:-$(latest_dump)}
  [ -n "$key" ] || { log error "No database dump in the backup bucket"; exit 1; }
  key=${key#postgres/}

  # Refuses a database that already holds tables: a restore never mixes with,
  # or overwrites, live data.
  local tables
  tables=$(psql --dbname="$DATABASE_URL" --tuples-only --no-align --command \
    "select count(*) from pg_tables where schemaname not in ('pg_catalog', 'information_schema')")
  if [ "$tables" != "0" ]; then
    log error "The database already has tables; restore into an empty one" tables "$tables"
    exit 1
  fi

  local dump=/tmp/$key
  rclone copyto "$BACKUP_ROOT/postgres/$key" "$dump"
  pg_restore --dbname="$DATABASE_URL" --no-owner --no-acl --exit-on-error --single-transaction "$dump"
  rm -f "$dump"
  log info "Database restored" key "postgres/$key"
}

case "${1:-}" in
  list)
    rclone lsf "$BACKUP_ROOT/postgres" --files-only --format sp --separator ' ' | sort -k2
    ;;
  database)
    restore_database "${2:-}"
    ;;
  pictures)
    rclone copy "$BACKUP_ROOT/pictures/current" "$PICTURES_ROOT"
    log info "Pictures restored"
    ;;
  logs)
    [ -n "${2:-}" ] || { echo "Usage: fpr-restore logs DIRECTORY" >&2; exit 2; }
    rclone copy "$BACKUP_ROOT/logs/current" "$2"
    log info "Logs restored" directory "$2"
    ;;
  *)
    sed -n '2,12s/^# \{0,1\}//p' "$0" >&2
    exit 2
    ;;
esac
