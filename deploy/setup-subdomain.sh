#!/usr/bin/env bash
# Point cv.buzzwaretech.com at BuzzCVPilot (root path, not /cvbuilder/)
#
# Prerequisites:
#   - DNS A record: cv.buzzwaretech.com → your server IP (65.108.236.135)
#   - JAMS stays on main IP/domain; this only adds a new nginx site
#
# Run on Ubuntu server:
#   sudo SUBDOMAIN=cv.buzzwaretech.com bash /opt/cvbuilder/deploy/setup-subdomain.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
SUBDOMAIN="${SUBDOMAIN:-cv.buzzwaretech.com}"
MAIN_IP="${MAIN_IP:-65.108.236.135}"
NPM_CACHE="$APP_DIR/.npm-cache"
APP_HOME="$APP_DIR/.home"
FRONTEND_ENV="$APP_DIR/frontend/.env.production"

echo "==> BuzzCVPilot subdomain setup"
echo "    URL: http://$SUBDOMAIN/"

mkdir -p "$NPM_CACHE" "$APP_HOME"
chown -R "$APP_USER:$APP_USER" "$NPM_CACHE" "$APP_HOME" "$APP_DIR/frontend"

echo "==> Build frontend for root path (/)"
cd "$APP_DIR/frontend"
sudo -u "$APP_USER" env \
  HOME="$APP_HOME" \
  NPM_CONFIG_CACHE="$NPM_CACHE" \
  npm install --no-audit --no-fund
sudo -u "$APP_USER" env \
  HOME="$APP_HOME" \
  VITE_BASE_PATH=/ \
  VITE_API_URL= \
  npm run build
chown -R "$APP_USER:$APP_USER" "$APP_DIR/frontend/dist"

echo "==> nginx site for $SUBDOMAIN"
cp "$APP_DIR/deploy/nginx-cv-subdomain.conf" /etc/nginx/sites-available/cv-buzzware
sed -i "s/cv.buzzwaretech.com/$SUBDOMAIN/g" /etc/nginx/sites-available/cv-buzzware
ln -sf /etc/nginx/sites-available/cv-buzzware /etc/nginx/sites-enabled/cv-buzzware
nginx -t
systemctl reload nginx

echo "==> Update backend .env (CORS + public URL)"
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

upsert_env "CVBUILDER_PUBLIC_URL" "http://$SUBDOMAIN"
upsert_env "CVBUILDER_CORS_ORIGINS" "http://$SUBDOMAIN,http://$MAIN_IP"

systemctl restart cvbuilder-backend

echo ""
echo "==> Done"
echo "Open: http://$SUBDOMAIN/"
echo ""
echo "Also do (one-time):"
echo "  1. Firebase Console → Authentication → Settings → Authorized domains"
echo "     Add: $SUBDOMAIN"
echo "  2. Stripe webhook / checkout URLs (if used):"
echo "     http://$SUBDOMAIN/api/billing/webhook"
echo "  3. Optional HTTPS:"
echo "     sudo certbot --nginx -d $SUBDOMAIN"
echo "     Then set CVBUILDER_PUBLIC_URL=https://$SUBDOMAIN in $ENV_FILE"
echo ""
curl -sf "http://127.0.0.1:8001/api/health" | head -c 200 && echo "" || echo "API health check failed"
