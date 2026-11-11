#!/usr/bin/env bash
# PreToolUse hook on Edit|Write|NotebookEdit.
# Blocks an edit until the session has loaded the skills its file needs.
set -euo pipefail

input=$(cat)
file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
transcript=$(jq -r '.agent_transcript_path // .transcript_path // empty' <<<"$input")
agent_id=$(jq -r '.agent_id // empty' <<<"$input")
[[ -z "$file" ]] && exit 0

# A subagent loads its skills into its own transcript, next to the session's.
if [[ -n "$agent_id" && -n "$transcript" ]] && jq -e 'has("agent_transcript_path") | not' <<<"$input" >/dev/null; then
  candidate="${transcript%.jsonl}/subagents/agent-$agent_id.jsonl"
  [[ -f "$candidate" ]] && transcript=$candidate
fi

# Resolve the repository that holds the file (a worktree counts as its own root).
dir=$(dirname "$file")
while [[ ! -d "$dir" && "$dir" != "/" ]]; do dir=$(dirname "$dir"); done
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || exit 0
rel=${file#"$root"/}

case "$rel" in
  */node_modules/* | node_modules/* | */dist/* | *.gen.ts | *.d.ts) exit 0 ;;
esac

required=()
case "$rel" in
  apps/web/*.ts | apps/web/*.tsx)
    required+=(react-best-practices fpr-ui typescript-advanced-types) ;;
  apps/web/*.css)
    required+=(fpr-ui) ;;
  *.ts | *.tsx | *.mts | *.cts)
    required+=(typescript-advanced-types) ;;
esac
case "$rel" in
  packages/db/* | *.sql | */migrations/*)
    required+=(supabase-postgres-best-practices) ;;
esac
[[ ${#required[@]} -eq 0 ]] && exit 0

missing=()
for skill in "${required[@]}"; do
  if [[ -z "$transcript" || ! -f "$transcript" ]] ||
    ! grep -qE "\"skill\" *: *\"$skill\"|<command-name>/?$skill</command-name>" "$transcript"; then
    missing+=("$skill")
  fi
done
[[ ${#missing[@]} -eq 0 ]] && exit 0

{
  echo "Blocked: editing $rel requires these skills, not yet loaded in this session: ${missing[*]}."
  echo "Load each one with the Skill tool, apply its guidance, then retry the edit."
} >&2
exit 2
