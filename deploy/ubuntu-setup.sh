#!/usr/bin/env bash
# AI CV Builder — one-time Ubuntu server setup
# Run: sudo DOMAIN=YOUR_IP bash /opt/cvbuilder/deploy/ubuntu-setup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
DOMAIN="${DOMAIN:-_}"

echo "==> CV Builder setup — app dir: $APP_DIR"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
  python3 python3-venv python3-pip \
  nginx git curl ca-certificates unzip \
  build-essential

if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v ollama &>/dev/null; then
  curl -fsSL https://ollama.com/install.sh | sh
fi

mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR" 2>/dev/null || true

if [[ -f "$APP_DIR/requirements.txt" ]]; then
  echo "==> Python venv + dependencies"
  sudo -u "$APP_USER" python3 -m venv "$APP_DIR/.venv"
  sudo -u "$APP_USER" "$APP_DIR/.venv/bin/pip" install --upgrade pip
  sudo -u "$APP_USER" "$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/requirements.txt"
fi

if [[ -f "$APP_DIR/frontend/package.json" ]]; then
  echo "==> Build frontend"
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
  chown -R "$APP_USER:$APP_USER" "$APP_DIR/frontend/dist"
fi

if [[ ! -f "$APP_DIR/.env" && -f "$APP_DIR/deploy/env.example" ]]; then
  cp "$APP_DIR/deploy/env.example" "$APP_DIR/.env"
  sed -i "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/.env" 2>/dev/null || true
  echo "==> Created $APP_DIR/.env — verify CORS_ORIGINS"
fi

mkdir -p "$APP_DIR/data/cvs" "$APP_DIR/data/versions" "$APP_DIR/.npm-cache" "$APP_DIR/.home"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/data" "$APP_DIR/.npm-cache" "$APP_DIR/.home" 2>/dev/null || true

echo "==> Install systemd service"
cp "$APP_DIR/deploy/cvbuilder-backend.service" /etc/systemd/system/cvbuilder-backend.service
systemctl daemon-reload
systemctl enable cvbuilder-backend

echo "==> Configure nginx"
sed "s/YOUR_DOMAIN/$DOMAIN/g" "$APP_DIR/deploy/nginx-cvbuilder.conf" > /etc/nginx/sites-available/cvbuilder
ln -sf /etc/nginx/sites-available/cvbuilder /etc/nginx/sites-enabled/cvbuilder
rm -f /etc/nginx/sites-enabled/default
nginx -t

echo "==> Pull Ollama model (may take a few minutes)"
systemctl enable ollama 2>/dev/null || true
systemctl start ollama 2>/dev/null || true
ollama pull qwen2.5:1.5b || true

echo ""
echo "Done. Next steps:"
echo "  1. Edit $APP_DIR/.env"
echo "  2. sudo systemctl start cvbuilder-backend"
echo "  3. sudo systemctl reload nginx"
echo "  4. Open http://$DOMAIN in browser"
