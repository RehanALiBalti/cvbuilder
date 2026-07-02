#!/usr/bin/env bash
# Rebuild frontend after code changes.
# Run: sudo bash /opt/cvbuilder/deploy/rebuild-frontend.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
NPM_CACHE="$APP_DIR/.npm-cache"
APP_HOME="$APP_DIR/.home"

mkdir -p "$NPM_CACHE" "$APP_HOME"
chown -R "$APP_USER:$APP_USER" "$NPM_CACHE" "$APP_HOME" "$APP_DIR/frontend"

cd "$APP_DIR/frontend"
sudo -u "$APP_USER" env \
  HOME="$APP_HOME" \
  NPM_CONFIG_CACHE="$NPM_CACHE" \
  npm install --no-audit --no-fund
sudo -u "$APP_USER" env HOME="$APP_HOME" VITE_API_URL= npm run build

chown -R "$APP_USER:$APP_USER" "$APP_DIR/frontend/dist"
systemctl reload nginx
echo "Frontend rebuilt."
