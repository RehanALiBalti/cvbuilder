#!/usr/bin/env bash
# Install CV Builder on a server that already runs JAMS at /
# Result: JAMS → http://IP/   |   CV Builder → http://IP/cvbuilder/
#
# Run on Ubuntu server (as root):
#   sudo bash /opt/cvbuilder/deploy/install-alongside-jams.sh
#
# Or first-time (clone + install):
#   sudo git clone https://github.com/YOUR_USERNAME/cvbuilder.git /opt/cvbuilder
#   sudo bash /opt/cvbuilder/deploy/install-alongside-jams.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
JAMS_DIR="${JAMS_DIR:-/opt/jams}"
APP_USER="${APP_USER:-www-data}"
DOMAIN="${DOMAIN:-65.108.236.135}"

echo "==> CV Builder alongside JAMS"
echo "    JAMS:       http://$DOMAIN/"
echo "    CV Builder: http://$DOMAIN/cvbuilder/"

if [[ ! -d "$JAMS_DIR" ]]; then
  echo "WARNING: $JAMS_DIR not found — JAMS may not be installed yet."
fi

export DEBIAN_FRONTEND=noninteractive

# Python backend
if [[ -f "$APP_DIR/requirements.txt" ]]; then
  echo "==> Python venv"
  if [[ ! -d "$APP_DIR/.venv" ]]; then
    sudo -u "$APP_USER" python3 -m venv "$APP_DIR/.venv"
  fi
  sudo -u "$APP_USER" "$APP_DIR/.venv/bin/pip" install --upgrade pip -q
  sudo -u "$APP_USER" "$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/requirements.txt" -q
fi

# Frontend build (base path /cvbuilder/ is in vite.config.js)
if [[ -f "$APP_DIR/frontend/package.json" ]]; then
  echo "==> Build frontend for /cvbuilder/"
  NPM_CACHE="$APP_DIR/.npm-cache"
  APP_HOME="$APP_DIR/.home"
  mkdir -p "$NPM_CACHE" "$APP_HOME"
  chown -R "$APP_USER:$APP_USER" "$NPM_CACHE" "$APP_HOME" "$APP_DIR/frontend"
  rm -rf "$APP_DIR/frontend/node_modules" "$APP_DIR/frontend/dist"
  cd "$APP_DIR/frontend"
  sudo -u "$APP_USER" env \
    HOME="$APP_HOME" \
    NPM_CONFIG_CACHE="$NPM_CACHE" \
    npm install --no-audit --no-fund
  sudo -u "$APP_USER" env HOME="$APP_HOME" VITE_API_URL= npm run build
fi

# .env
if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/deploy/env.example" "$APP_DIR/.env"
fi
if ! grep -q "CVBUILDER_CORS_ORIGINS" "$APP_DIR/.env" 2>/dev/null; then
  echo "CVBUILDER_CORS_ORIGINS=http://$DOMAIN" >> "$APP_DIR/.env"
else
  sed -i "s|CVBUILDER_CORS_ORIGINS=.*|CVBUILDER_CORS_ORIGINS=http://$DOMAIN|" "$APP_DIR/.env" 2>/dev/null || true
fi

mkdir -p "$APP_DIR/data/cvs" "$APP_DIR/data/versions" "$APP_DIR/.home"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# systemd
echo "==> systemd cvbuilder-backend"
cp "$APP_DIR/deploy/cvbuilder-backend.service" /etc/systemd/system/cvbuilder-backend.service
systemctl daemon-reload
systemctl enable cvbuilder-backend
systemctl restart cvbuilder-backend

# nginx combined config (JAMS + CV Builder)
echo "==> nginx combined config"
sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx-combined.conf" > /etc/nginx/sites-available/jams
ln -sf /etc/nginx/sites-available/jams /etc/nginx/sites-enabled/jams
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Ollama model (shared with JAMS)
if command -v ollama &>/dev/null; then
  ollama pull qwen2.5:7b 2>/dev/null || true
fi

echo ""
echo "==> Done"
systemctl is-active jams-backend cvbuilder-backend nginx 2>/dev/null || true
curl -sf "http://127.0.0.1:8001/api/health" && echo "  CV Builder API OK" || echo "  CV Builder API FAILED"
curl -sf "http://127.0.0.1/api/health" >/dev/null && echo "  JAMS API OK" || echo "  JAMS API check (may be /api/stats)"
echo ""
echo "Open:"
echo "  JAMS:       http://$DOMAIN/"
echo "  CV Builder: http://$DOMAIN/cvbuilder/"
