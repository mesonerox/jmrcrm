#!/bin/bash
echo "{\"additionalContext\": \"Branch: $(git branch --show-current). Last commit: $(git log -1 --format='%s')\"}"
exit 0
