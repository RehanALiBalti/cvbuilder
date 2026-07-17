#!/usr/bin/env bash
# Install Let's Encrypt SSL for buzzcvpilot.com (+ www)
#
# Prerequisites:
#   - DNS A records: buzzcvpilot.com and www.buzzcvpilot.com → server IP
#   - HTTP site working: sudo bash deploy/setup-buzzcvpilot.sh
#   - Ports 80 and 443 open
#
# Run:
#   sudo CERTBOT_EMAIL=you@example.com bash /opt/cvbuilder/deploy/setup-ssl-buzzcvpilot.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
DOMAIN="${DOMAIN:-buzzcvpilot.com}"
WWW="www.${DOMAIN}"
OLD_DOMAIN="${OLD_DOMAIN:-cv.buzzwaretech.com}"
MAIN_IP="${MAIN_IP:-65.108.236.135}"
EMAIL="${CERTBOT_EMAIL:-}"
SITE_ENABLED="/etc/nginx/sites-enabled/buzzcvpilot"

if [[ -z "$EMAIL" ]]; then
  echo "ERROR: Set your email for Let's Encrypt:"
  echo "  sudo CERTBOT_EMAIL=you@example.com bash $APP_DIR/deploy/setup-ssl-buzzcvpilot.sh"
  exit 1
fi

if [[ ! -f "$SITE_ENABLED" ]]; then
  echo "ERROR: Nginx site buzzcvpilot not found. Run setup-buzzcvpilot.sh first."
  exit 1
fi

echo "==> Install certbot (if needed)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

echo "==> Open firewall for HTTPS (if ufw active)"
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full' || true
fi

echo "==> Request SSL certificate for $DOMAIN and $WWW"
certbot --nginx \
  -d "$DOMAIN" \
  -d "$WWW" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

nginx -t
systemctl reload nginx

echo "==> Update .env for HTTPS (primary = $DOMAIN)"
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

upsert_env "CVBUILDER_PUBLIC_URL" "https://$DOMAIN"
upsert_env "CVBUILDER_CORS_ORIGINS" "https://$DOMAIN,https://$WWW,http://$DOMAIN,http://$WWW,https://$OLD_DOMAIN,http://$OLD_DOMAIN,http://$MAIN_IP"

systemctl restart cvbuilder-backend

echo ""
echo "==> SSL installed"
echo "  Primary: https://$DOMAIN/"
echo "  WWW:     https://$WWW/"
echo "  HTTP redirects to HTTPS automatically."
echo ""
echo "Also update:"
echo "  Firebase → Authorized domains → $DOMAIN , $WWW"
echo "  Stripe  → Webhook: https://$DOMAIN/api/billing/webhook"
echo "  Stripe  → Checkout success/cancel URLs use CVBUILDER_PUBLIC_URL"
echo ""
echo "Renewal test: sudo certbot renew --dry-run"
curl -sS "https://$DOMAIN/api/health" | head -c 200 && echo "" || echo "(curl failed — wait for DNS/propagation)"
