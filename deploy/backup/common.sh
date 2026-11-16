# Shared by fpr-backup, fpr-restore and the entry point: JSON log lines and the
# rclone remotes, configured from the environment only.

# One JSON line on standard output, read by vector like the apps' pino lines:
# log <level> <message> [key value]...
log() {
  local level=$1 message=$2
  shift 2
  local line
  line=$(printf '{"time":"%s","level":"%s","service":"backup","message":"%s"' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$level" "$(json_escape "$message")")
  while [ $# -ge 2 ]; do
    line+=$(printf ',"%s":"%s"' "$1" "$(json_escape "$2")")
    shift 2
  done
  printf '%s}\n' "$line"
}

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/\t/\\t/g' | awk 'NR > 1 { printf "\\n" } { printf "%s", $0 }'
}

# `backup:` is the backup bucket, `pictures:` the app's picture storage. No
# rclone config file: the remotes exist only in the environment.
export RCLONE_CONFIG=/dev/null
export RCLONE_CONFIG_BACKUP_TYPE=s3
export RCLONE_CONFIG_BACKUP_PROVIDER=Other
export RCLONE_CONFIG_BACKUP_ENDPOINT=${BACKUP_S3_ENDPOINT:-}
export RCLONE_CONFIG_BACKUP_REGION=${BACKUP_S3_REGION:-}
export RCLONE_CONFIG_BACKUP_ACCESS_KEY_ID=${BACKUP_S3_ACCESS_KEY_ID:-}
export RCLONE_CONFIG_BACKUP_SECRET_ACCESS_KEY=${BACKUP_S3_SECRET_ACCESS_KEY:-}
# A bucket-scoped key can't create or check buckets.
export RCLONE_CONFIG_BACKUP_NO_CHECK_BUCKET=true

export RCLONE_CONFIG_PICTURES_TYPE=s3
export RCLONE_CONFIG_PICTURES_PROVIDER=Other
export RCLONE_CONFIG_PICTURES_ENDPOINT=${S3_ENDPOINT:-}
export RCLONE_CONFIG_PICTURES_REGION=${S3_REGION:-}
export RCLONE_CONFIG_PICTURES_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID:-}
export RCLONE_CONFIG_PICTURES_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY:-}
export RCLONE_CONFIG_PICTURES_NO_CHECK_BUCKET=true

BACKUP_ROOT="backup:${BACKUP_S3_BUCKET:-}"
PICTURES_ROOT="pictures:${S3_BUCKET:-}"

# Every BACKUP_S3_* variable is set. Logs the missing ones otherwise.
backup_configured() {
  local missing=() name
  for name in BACKUP_S3_ENDPOINT BACKUP_S3_REGION BACKUP_S3_BUCKET BACKUP_S3_ACCESS_KEY_ID BACKUP_S3_SECRET_ACCESS_KEY; do
    [ -n "${!name:-}" ] || missing+=("$name")
  done
  [ ${#missing[@]} -eq 0 ] && return 0
  log error "Backup storage is not fully configured" missing "${missing[*]}"
  return 1
}

# Runs a command, and logs its last output lines at error when it fails.
run_step() {
  local step=$1 output
  shift
  if output=$("$@" 2>&1); then
    return 0
  fi
  log error "Backup step failed" run "${stamp:-}" step "$step" output "$(printf '%s' "$output" | tail -n 20)"
  return 1
}
