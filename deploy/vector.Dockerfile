# vector with FPR's log collection built in, so no host path is mounted for it.
FROM timberio/vector:0.60.0-alpine
COPY deploy/vector.yaml /etc/vector/vector.yaml
