#!/bin/bash
FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.file_path // empty')

if [[ "$FILE_PATH" == *.ts ]] || [[ "$FILE_PATH" == *.tsx ]]; then
  npx prettier --write "$FILE_PATH" 2>/dev/null
  pnpm typecheck --noEmit 2>&1 | tail -5
fi
exit 0
