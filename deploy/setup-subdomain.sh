#!/usr/bin/env bash
# BuzzCVPilot on subdomain ONLY — does NOT change main IP /cvbuilder/ build.
#
# Main IP keeps:
#   http://65.108.236.135/          → JAMS (unchanged)
#   http://65.108.236.135/cvbuilder/ → BuzzCVPilot (dist/, base /cvbuilder/)
#
# Subdomain gets its own build:
#   http://cv.buzzwaretech.com/     → BuzzCVPilot (dist-subdomain/, base /)
#
# Run:
#   sudo SUBDOMAIN=cv.buzzwaretech.com bash /opt/cvbuilder/deploy/setup-subdomain.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
SUBDOMAIN="${SUBDOMAIN:-cv.buzzwaretech.com}"
MAIN_IP="${MAIN_IP:-65.108.236.135}"
NPM_CACHE="$APP_DIR/.npm-cache"
APP_HOME="$APP_DIR/.home"

echo "==> BuzzCVPilot subdomain (main IP unchanged)"
echo "    Subdomain: http://$SUBDOMAIN/"
echo "    Main IP:   http://$MAIN_IP/cvbuilder/ (kept as-is)"

mkdir -p "$NPM_CACHE" "$APP_HOME"
chown -R "$APP_USER:$APP_USER" "$NPM_CACHE" "$APP_HOME" "$APP_DIR/frontend"

echo "==> Build subdomain frontend → frontend/dist-subdomain/ (root path)"
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

if [[ -d "$APP_DIR/frontend/dist" ]]; then
  echo "==> OK: frontend/dist/ (/cvbuilder/) left untouched"
else
  echo "==> NOTE: frontend/dist/ missing — run install-alongside-jams.sh for IP /cvbuilder/"
fi

echo "==> nginx site for $SUBDOMAIN"
cp "$APP_DIR/deploy/nginx-cv-subdomain.conf" /etc/nginx/sites-available/cv-buzzware
sed -i "s/cv.buzzwaretech.com/$SUBDOMAIN/g" /etc/nginx/sites-available/cv-buzzware
ln -sf /etc/nginx/sites-available/cv-buzzware /etc/nginx/sites-enabled/cv-buzzware
nginx -t
systemctl reload nginx

echo "==> Verify subdomain nginx (local test)"
TITLE=$(curl -sS -H "Host: $SUBDOMAIN" "http://127.0.0.1/" | grep -oi '<title>[^<]*</title>' | head -1 || true)
echo "    Page title: ${TITLE:-unknown}"
if echo "$TITLE" | grep -qi "JAMS"; then
  echo "WARNING: Still serving JAMS — run: sudo bash $APP_DIR/deploy/fix-subdomain.sh"
fi

echo "==> Update backend .env (CORS — both subdomain + main IP)"
ENV_FILE="$APP_DIR/.env"
touch "$ENV_FILE"
chown "$APP_USER:$APP_USER" "$ENV_FILE"

upsert_env() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

# Billing/checkout primary URL = subdomain; CORS allows both entry points
upsert_env "CVBUILDER_PUBLIC_URL" "http://$SUBDOMAIN"
upsert_env "CVBUILDER_CORS_ORIGINS" "http://$SUBDOMAIN,http://$MAIN_IP"

systemctl restart cvbuilder-backend

echo ""
echo "==> Done"
echo "  Subdomain:  http://$SUBDOMAIN/"
echo "  Main IP:    http://$MAIN_IP/cvbuilder/  (unchanged)"
echo ""
echo "One-time:"
echo "  Firebase → Authorized domains → add $SUBDOMAIN"
echo "  HTTPS: sudo CERTBOT_EMAIL=you@example.com bash $APP_DIR/deploy/setup-ssl-subdomain.sh"
echo ""
curl -sf "http://127.0.0.1:8001/api/health" | head -c 200 && echo "" || echo "API health check failed"
