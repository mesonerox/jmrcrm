#!/bin/bash
CMD=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.command // empty')

if echo "$CMD" | grep -qE 'rm -rf|DROP TABLE|git push.*main|git reset --hard'; then
  echo "Blocked: $CMD" >&2
  exit 2
fi
exit 0
