#!/bin/bash
# One backup run: the database dump, the pictures and the logs volume, copied to
# the backup bucket, then backups older than BACKUP_RETENTION_DAYS deleted.
#
# Layout in the backup bucket:
#   postgres/fpr-<stamp>.dump      one pg_dump custom-format file per run
#   pictures/current/              mirror of the pictures bucket
#   pictures/replaced/<stamp>/     pictures that run deleted or overwritten
#   logs/current/                  mirror of the VictoriaLogs data directory
#   logs/replaced/<stamp>/         log files that run deleted or overwritten
# <stamp> is the run's UTC time, YYYYMMDDTHHMMSSZ, so names sort by time.
set -uo pipefail
source /usr/local/lib/fpr-backup/common.sh

backup_configured || exit 1

stamp=$(date -u +%Y%m%dT%H%M%SZ)
started=$(date +%s)
dump=/tmp/fpr-$stamp.dump
failed=()
log info "Backup started" run "$stamp"

if run_step postgres pg_dump --format=custom --file="$dump" --dbname="$DATABASE_URL" &&
  run_step postgres pg_restore --list "$dump" &&
  run_step postgres rclone copyto "$dump" "$BACKUP_ROOT/postgres/fpr-$stamp.dump"; then
  log info "Database backed up" run "$stamp" key "postgres/fpr-$stamp.dump" bytes "$(stat -c %s "$dump")"
else
  failed+=(postgres)
fi
rm -f "$dump"

# A mirror plus a dated folder of what each run replaced: a deleted picture or
# log file stays restorable for the retention period.
if run_step pictures rclone sync "$PICTURES_ROOT" "$BACKUP_ROOT/pictures/current" \
  --backup-dir "$BACKUP_ROOT/pictures/replaced/$stamp"; then
  log info "Pictures backed up" run "$stamp"
else
  failed+=(pictures)
fi

if run_step logs rclone sync /logs "$BACKUP_ROOT/logs/current" \
  --backup-dir "$BACKUP_ROOT/logs/replaced/$stamp" --exclude flock.lock; then
  log info "Logs backed up" run "$stamp"
else
  failed+=(logs)
fi

if [ ${#failed[@]} -gt 0 ]; then
  log error "Backup failed" run "$stamp" failed "${failed[*]}"
  exit 1
fi

# Pruning runs only after a complete run, so failing runs never delete the last
# good backup. Ages come from the names: a moved file keeps its old modification
# time.
cutoff=$(date -u -d "@$((started - ${BACKUP_RETENTION_DAYS:-30} * 86400))" +%Y%m%dT%H%M%SZ)
pruned=0
for key in $(rclone lsf "$BACKUP_ROOT/postgres" --files-only); do
  name=${key#fpr-}
  if [[ ${name%.dump} < $cutoff ]]; then
    run_step prune rclone deletefile "$BACKUP_ROOT/postgres/$key" && pruned=$((pruned + 1))
  fi
done
for prefix in pictures/replaced logs/replaced; do
  for folder in $(rclone lsf "$BACKUP_ROOT/$prefix" --dirs-only 2>/dev/null); do
    if [[ ${folder%/} < $cutoff ]]; then
      run_step prune rclone purge "$BACKUP_ROOT/$prefix/${folder%/}" && pruned=$((pruned + 1))
    fi
  done
done

log info "Backup finished" run "$stamp" seconds "$(($(date +%s) - started))" pruned "$pruned"
