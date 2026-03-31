#!/bin/bash
# =================================================================
# Deployment Script for ikfzdigitalzulassung.de on Hostinger VPS
# =================================================================
# Usage: bash deploy/deploy.sh
# Run this script on the VPS after git pull
# =================================================================

set -e

APP_DIR="/var/www/ikfzdigitalzulassung.de"
PM2_APP_NAME="ikfz-app"

echo "🚀 Starting deployment..."
echo "─────────────────────────────────────────"

cd "$APP_DIR"

# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# 3. Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# 4. Build Next.js (standalone mode)
echo "🏗️  Building Next.js..."
npm run build

# 5. Copy static files & public to standalone
echo "📁 Copying static and public files to standalone..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 5.1 Copy database to standalone
if [ -f "prisma/dev.db" ]; then
    mkdir -p .next/standalone/prisma
    cp prisma/dev.db .next/standalone/prisma/dev.db
fi

# 6. Copy .env to standalone directory
if [ -f ".env.production.local" ]; then
    cp .env.production.local .next/standalone/.env.production.local
    echo "✅ Env file copied to standalone"
fi
if [ -f ".env" ]; then
    cp .env .next/standalone/.env
fi

# 6.1 Verify required env vars exist in .env
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    MISSING=""
    for VAR in PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET SMTP_HOST SMTP_PASS MOLLIE_API_KEY JWT_SECRET; do
        if ! grep -q "$VAR" "$ENV_FILE"; then
            MISSING="$MISSING $VAR"
        fi
    done
    if [ -n "$MISSING" ]; then
        echo "⚠️  Missing env vars in .env:$MISSING"
        echo "   Set them in .env.production.local or your hosting panel."
    fi
    cp "$ENV_FILE" .next/standalone/.env
fi

ENV_PROD_FILE=".env.production.local"
if [ -f "$ENV_PROD_FILE" ]; then
    cp "$ENV_PROD_FILE" .next/standalone/.env.production.local
fi

# 7. Restart PM2
echo "🔄 Restarting PM2..."
pm2 reload "$PM2_APP_NAME" --update-env 2>/dev/null || pm2 start ecosystem.config.js
pm2 save

echo "─────────────────────────────────────────"
echo "✅ Deployment complete!"
echo ""
echo "📊 Check status:  pm2 status"
echo "📋 View logs:     pm2 logs $PM2_APP_NAME"
echo "🌐 Site:          https://ikfzdigitalzulassung.de"
echo ""

# 8. Quick health check
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed (HTTP $HTTP_STATUS)"
else
    echo "⚠️  Health check returned HTTP $HTTP_STATUS — check logs: pm2 logs $PM2_APP_NAME --lines 50"
fi
