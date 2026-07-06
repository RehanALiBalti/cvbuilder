#!/usr/bin/env bash
# Rebuild frontend after code changes.
# Run: sudo bash /opt/cvbuilder/deploy/rebuild-frontend.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
NPM_CACHE="$APP_DIR/.npm-cache"
APP_HOME="$APP_DIR/.home"
FRONTEND_ENV="$APP_DIR/frontend/.env.production"

mkdir -p "$NPM_CACHE" "$APP_HOME"
chown -R "$APP_USER:$APP_USER" "$NPM_CACHE" "$APP_HOME" "$APP_DIR/frontend"

# Vite reads frontend/.env.production automatically during `npm run build`.
if [[ ! -f "$FRONTEND_ENV" ]]; then
  echo ""
  echo "WARNING: $FRONTEND_ENV not found."
  echo "Firebase signup/login will NOT work until you create it:"
  echo "  sudo cp $APP_DIR/frontend/.env.production.example $FRONTEND_ENV"
  echo "  sudo nano $FRONTEND_ENV   # paste VITE_FIREBASE_* from Firebase Console"
  echo "  sudo chown www-data:www-data $FRONTEND_ENV"
  echo ""
elif ! grep -qE '^VITE_FIREBASE_API_KEY=.+' "$FRONTEND_ENV" 2>/dev/null; then
  echo ""
  echo "WARNING: VITE_FIREBASE_API_KEY is empty in $FRONTEND_ENV"
  echo "Edit the file and rebuild: sudo nano $FRONTEND_ENV"
  echo ""
fi

cd "$APP_DIR/frontend"
sudo -u "$APP_USER" env \
  HOME="$APP_HOME" \
  NPM_CONFIG_CACHE="$NPM_CACHE" \
  npm install --no-audit --no-fund
sudo -u "$APP_USER" env HOME="$APP_HOME" VITE_API_URL= npm run build

chown -R "$APP_USER:$APP_USER" "$APP_DIR/frontend/dist"
systemctl reload nginx 2>/dev/null || true
echo "Frontend rebuilt for /cvbuilder/ (dist/)."
echo "If you use cv.buzzwaretech.com, also run: sudo bash $APP_DIR/deploy/rebuild-subdomain.sh"
