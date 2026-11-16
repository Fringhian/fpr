# The scheduled backup: Postgres 18's client tools, rclone and supercronic,
# with FPR's backup and restore scripts.
FROM postgres:18.6-alpine3.23

ARG TARGETARCH
ARG RCLONE_VERSION=1.75.2
ARG SUPERCRONIC_VERSION=0.2.50

RUN set -eu; \
  case "$TARGETARCH" in \
    amd64) \
      rclone_sha=349ac8fba6ff65d6247043f1750cdcb518ec5d500ef91463a10d37c0ccdf3702; \
      supercronic_sha=d2d7c97fbfefc763d5bbcbbb3f8d61f9dd3410ce5d05a737c414994b80b8cdd0 ;; \
    arm64) \
      rclone_sha=7e1e8d69654941b7b7df84ee74c5f7fb09cce7d5496947fb7bf16b55ff427d10; \
      supercronic_sha=a1c0af9872e8de89a1ce5c1b596e26c42917d5a2cf914d98faee2e28156899e2 ;; \
    *) echo "No backup build for $TARGETARCH" >&2; exit 1 ;; \
  esac; \
  cd /tmp; \
  rclone=rclone-v$RCLONE_VERSION-linux-$TARGETARCH; \
  wget -q "https://github.com/rclone/rclone/releases/download/v$RCLONE_VERSION/$rclone.zip"; \
  echo "$rclone_sha  $rclone.zip" | sha256sum -c -; \
  unzip -q "$rclone.zip"; \
  install -m 0755 "$rclone/rclone" /usr/local/bin/rclone; \
  wget -q -O supercronic "https://github.com/aptible/supercronic/releases/download/v$SUPERCRONIC_VERSION/supercronic-linux-$TARGETARCH"; \
  echo "$supercronic_sha  supercronic" | sha256sum -c -; \
  install -m 0755 supercronic /usr/local/bin/supercronic; \
  rm -rf /tmp/*

COPY deploy/backup/common.sh /usr/local/lib/fpr-backup/common.sh
COPY --chmod=0755 deploy/backup/backup.sh /usr/local/bin/fpr-backup
COPY --chmod=0755 deploy/backup/restore.sh /usr/local/bin/fpr-restore
COPY --chmod=0755 deploy/backup/start.sh /usr/local/bin/fpr-backup-start

USER postgres
ENTRYPOINT ["fpr-backup-start"]
CMD []
