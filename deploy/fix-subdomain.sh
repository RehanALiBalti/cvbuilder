#!/usr/bin/env bash
# Fix cv.buzzwaretech.com showing JAMS instead of BuzzCVPilot.
# Run on server:
#   sudo bash /opt/cvbuilder/deploy/fix-subdomain.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cvbuilder}"
APP_USER="${APP_USER:-www-data}"
SUBDOMAIN="${SUBDOMAIN:-cv.buzzwaretech.com}"
MAIN_IP="${MAIN_IP:-65.108.236.135}"

echo "==> Fix subdomain: $SUBDOMAIN → BuzzCVPilot"

if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: $APP_DIR not found"
  exit 1
fi

# 1) Build dist-subdomain if missing
if [[ ! -f "$APP_DIR/frontend/dist-subdomain/index.html" ]]; then
  echo "==> dist-subdomain missing — building..."
  bash "$APP_DIR/deploy/setup-subdomain.sh"
  exit 0
fi

# 2) Install nginx site
echo "==> Install nginx site cv-buzzware"
cp "$APP_DIR/deploy/nginx-cv-subdomain.conf" /etc/nginx/sites-available/cv-buzzware
sed -i "s/cv.buzzwaretech.com/$SUBDOMAIN/g" /etc/nginx/sites-available/cv-buzzware
ln -sf /etc/nginx/sites-available/cv-buzzware /etc/nginx/sites-enabled/cv-buzzware

# 3) Ensure JAMS site only answers IP (not default catch-all for wrong host)
JAMS_SITE="/etc/nginx/sites-available/jams"
if [[ -f "$JAMS_SITE" ]]; then
  if grep -q "default_server" "$JAMS_SITE"; then
    echo "==> Removing default_server from JAMS config (was catching subdomain)"
    sed -i 's/listen 80 default_server/listen 80/g' "$JAMS_SITE"
    sed -i 's/listen \[::\]:80 default_server/listen [::]:80/g' "$JAMS_SITE"
  fi
  if ! grep -q "server_name $MAIN_IP" "$JAMS_SITE"; then
    echo "==> Setting JAMS server_name to $MAIN_IP only"
    sed -i "s/server_name .*/server_name $MAIN_IP;/" "$JAMS_SITE"
  fi
fi

nginx -t
systemctl reload nginx

echo ""
echo "==> Verify (should show buzzcvpilot / CV builder, NOT JAMS)"
TITLE=$(curl -sS -H "Host: $SUBDOMAIN" "http://127.0.0.1/" | grep -oi '<title>[^<]*</title>' | head -1 || true)
echo "    Title: ${TITLE:-<not found>}"

API=$(curl -sS -H "Host: $SUBDOMAIN" "http://127.0.0.1/api/health" | head -c 120 || true)
echo "    API:   $API"

if echo "$TITLE" | grep -qi "JAMS"; then
  echo ""
  echo "ERROR: Still serving JAMS. Check:"
  echo "  ls -la /etc/nginx/sites-enabled/"
  echo "  grep server_name /etc/nginx/sites-enabled/*"
  exit 1
fi

echo ""
echo "OK — open http://$SUBDOMAIN/ in browser (Ctrl+F5)"
