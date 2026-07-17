#!/usr/bin/env bash
# Attach buzzcvpilot.com to the existing BuzzCVPilot app (same server as cv.buzzwaretech.com).
#
# Prerequisites (DNS):
#   buzzcvpilot.com     A → 65.108.236.135
#   www.buzzcvpilot.com A → 65.108.236.135  (or CNAME → buzzcvpilot.com)
#
# Run:
#   sudo bash /opt/cvbuilder/deploy/setup-buzzcvpilot.sh
#
# Then SSL:
#   sudo CERTBOT_EMAIL=you@example.com bash /opt/cvbuilder/deploy/setup-ssl-buzzcvpilot.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
DOMAIN="${DOMAIN:-buzzcvpilot.com}"
WWW="www.${DOMAIN}"
OLD_DOMAIN="${OLD_DOMAIN:-cv.buzzwaretech.com}"
MAIN_IP="${MAIN_IP:-65.108.236.135}"
NPM_CACHE="$APP_DIR/.npm-cache"
APP_HOME="$APP_DIR/.home"
SITE_AVAIL="/etc/nginx/sites-available/buzzcvpilot"
SITE_ENABLED="/etc/nginx/sites-enabled/buzzcvpilot"

echo "==> BuzzCVPilot domain attach"
echo "    New:  http://$DOMAIN/  (+ http://$WWW/)"
echo "    Keep: http://$OLD_DOMAIN/ (unchanged if already installed)"
echo "    IP:   http://$MAIN_IP/cvbuilder/ (unchanged)"

mkdir -p "$NPM_CACHE" "$APP_HOME"
chown -R "$APP_USER:$APP_USER" "$NPM_CACHE" "$APP_HOME" "$APP_DIR/frontend"

if [[ ! -d "$APP_DIR/frontend/dist-subdomain" ]]; then
  echo "==> Build subdomain frontend → frontend/dist-subdomain/"
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
else
  echo "==> OK: frontend/dist-subdomain/ already exists"
fi

echo "==> nginx site for $DOMAIN"
cp "$APP_DIR/deploy/nginx-buzzcvpilot.conf" "$SITE_AVAIL"
# Allow custom DOMAIN override in the conf copy
sed -i "s/buzzcvpilot.com/$DOMAIN/g" "$SITE_AVAIL"
# After sed, www line becomes www.<domain> twice if DOMAIN was buzzcvpilot.com — normalize
# server_name should be: domain www.domain
if ! grep -q "server_name $DOMAIN www.$DOMAIN;" "$SITE_AVAIL"; then
  sed -i "s/server_name .*/server_name $DOMAIN www.$DOMAIN;/" "$SITE_AVAIL"
fi
ln -sf "$SITE_AVAIL" "$SITE_ENABLED"
nginx -t
systemctl reload nginx

echo "==> Local Host header test"
TITLE=$(curl -sS -H "Host: $DOMAIN" "http://127.0.0.1/" | grep -oi '<title>[^<]*</title>' | head -1 || true)
echo "    Page title: ${TITLE:-unknown}"
if echo "$TITLE" | grep -qi "JAMS"; then
  echo "WARNING: Still serving JAMS for Host=$DOMAIN — check nginx site priority / default_server"
fi

echo "==> Update backend .env (CORS for new + old domain)"
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

# Prefer new domain as public URL; keep old domain + IP in CORS
upsert_env "CVBUILDER_PUBLIC_URL" "http://$DOMAIN"
upsert_env "CVBUILDER_CORS_ORIGINS" "http://$DOMAIN,https://$DOMAIN,http://$WWW,https://$WWW,http://$OLD_DOMAIN,https://$OLD_DOMAIN,http://$MAIN_IP"

systemctl restart cvbuilder-backend

echo ""
echo "==> Done (HTTP)"
echo "  New site:   http://$DOMAIN/"
echo "  Also:       http://$WWW/"
echo "  Old site:   http://$OLD_DOMAIN/ (if previously configured)"
echo ""
echo "Next steps:"
echo "  1) DNS A records must point to $MAIN_IP (wait for propagation)"
echo "  2) Firebase → Authentication → Authorized domains → add $DOMAIN and $WWW"
echo "  3) SSL: sudo CERTBOT_EMAIL=you@example.com bash $APP_DIR/deploy/setup-ssl-buzzcvpilot.sh"
echo ""
curl -sf "http://127.0.0.1:8001/api/health" | head -c 200 && echo "" || echo "API health check failed"
