#!/usr/bin/env bash
# Helper: load nvm and run a command from the project root (used for tooling).
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
cd "$(dirname "$0")"
exec "$@"
