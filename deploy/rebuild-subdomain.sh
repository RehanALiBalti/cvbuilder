#!/usr/bin/env bash
# Rebuild subdomain frontend only (dist-subdomain/). Does NOT touch dist/ for /cvbuilder/.
# Run after code updates when using cv.buzzwaretech.com:
#   sudo bash /opt/cvbuilder/deploy/rebuild-subdomain.sh
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
sudo -u "$APP_USER" env \
  HOME="$APP_HOME" \
  VITE_BASE_PATH=/ \
  VITE_OUT_DIR=dist-subdomain \
  VITE_API_URL= \
  npm run build

chown -R "$APP_USER:$APP_USER" "$APP_DIR/frontend/dist-subdomain"
systemctl reload nginx 2>/dev/null || true
echo "Subdomain frontend rebuilt (dist-subdomain/). Main IP /cvbuilder/ dist/ unchanged."
