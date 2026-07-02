#!/usr/bin/env bash
# Finish CV Builder setup if ubuntu-setup.sh stopped early.
# Run: sudo DOMAIN=YOUR_IP bash /opt/cvbuilder/deploy/finish-setup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
DOMAIN="${DOMAIN:-_}"

echo "==> Finish CV Builder setup"

if [[ ! -f "$APP_DIR/frontend/dist/index.html" ]]; then
  echo "==> Build frontend"
  NPM_CACHE="$APP_DIR/.npm-cache"
  APP_HOME="$APP_DIR/.home"
  mkdir -p "$NPM_CACHE" "$APP_HOME"
  chown -R "$APP_USER:$APP_USER" "$NPM_CACHE" "$APP_HOME" "$APP_DIR/frontend"
  rm -rf "$APP_DIR/frontend/node_modules"
  cd "$APP_DIR/frontend"
  sudo -u "$APP_USER" env \
    HOME="$APP_HOME" \
    NPM_CONFIG_CACHE="$NPM_CACHE" \
    npm install --no-audit --no-fund
  sudo -u "$APP_USER" env HOME="$APP_HOME" VITE_API_URL= npm run build
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/deploy/env.example" "$APP_DIR/.env"
  sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/.env" 2>/dev/null || true
fi

mkdir -p "$APP_DIR/data/cvs" "$APP_DIR/data/versions" "$APP_DIR/.npm-cache" "$APP_DIR/.home"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

cp "$APP_DIR/deploy/cvbuilder-backend.service" /etc/systemd/system/cvbuilder-backend.service
systemctl daemon-reload
systemctl enable cvbuilder-backend

sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx-cvbuilder.conf" > /etc/nginx/sites-available/cvbuilder
ln -sf /etc/nginx/sites-available/cvbuilder /etc/nginx/sites-enabled/cvbuilder
rm -f /etc/nginx/sites-enabled/default
nginx -t

systemctl enable ollama 2>/dev/null || true
systemctl start ollama 2>/dev/null || true
ollama pull qwen2.5:7b 2>/dev/null || true

systemctl restart cvbuilder-backend
systemctl reload nginx

echo ""
echo "==> Status"
systemctl is-active cvbuilder-backend nginx || true
curl -sf http://127.0.0.1:8001/api/health && echo "" || echo "Backend not responding on :8001"
curl -sf "http://127.0.0.1/api/health" && echo "" || echo "Nginx /api proxy not working"

echo ""
echo "Open: http://$DOMAIN"
