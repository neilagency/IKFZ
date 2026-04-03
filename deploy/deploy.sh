#!/bin/bash
# =================================================================
# Deployment Script for ikfzdigitalzulassung.de on Hostinger VPS
# =================================================================
# Usage: bash deploy/deploy.sh
# Run this script on the VPS after git pull
#
# DATABASE: The production SQLite database lives at a PERSISTENT
# path outside the build directory and is NEVER overwritten.
# =================================================================

set -e

APP_DIR="/var/www/ikfzdigitalzulassung.de"
PM2_APP_NAME="ikfz-app"

# ── Persistent data directory (NEVER deleted on deploy) ──
DATA_DIR="$APP_DIR/data"
DB_FILE="$DATA_DIR/production.db"

echo "🚀 Starting deployment..."
echo "─────────────────────────────────────────"

cd "$APP_DIR"

# 0. Ensure persistent data directory exists BEFORE build
mkdir -p "$DATA_DIR"

# 0.1 Initialize production DB only if it doesn't exist yet
if [ ! -f "$DB_FILE" ]; then
    if [ -f "prisma/dev.db" ]; then
        echo "📋 First deploy: seeding production database from dev.db..."
        cp prisma/dev.db "$DB_FILE"
    else
        echo "⚠️  No database found. Create one with: npx prisma migrate deploy"
    fi
else
    echo "✅ Production database exists at $DB_FILE — NOT overwriting"
fi

# 0.2 Export DB_PATH so next build pre-renders pages from production DB
export DB_PATH="$DB_FILE"
echo "📍 DB_PATH=$DB_PATH (used for build-time page rendering)"

# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# 3. Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# 3.1 Apply any pending migrations to production DB
echo "🔄 Applying pending migrations to production database..."
DB_PATH="$DB_FILE" npx prisma migrate deploy 2>&1 || echo "⚠️  Migration warning (may be OK if no pending migrations)"

# 4. Build Next.js (standalone mode) — reads from production DB via DB_PATH
echo "🏗️  Building Next.js with DB_PATH=$DB_PATH ..."
npm run build

# 5. Copy static files & public to standalone
echo "📁 Copying static and public files to standalone..."
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 5.1 Persist uploads directory across deployments
UPLOADS_DIR="$DATA_DIR/uploads"
mkdir -p "$UPLOADS_DIR/documents"
# If standalone already has uploaded files, move them to persistent dir
if [ -d ".next/standalone/public/uploads/documents" ] && [ "$(ls -A .next/standalone/public/uploads/documents 2>/dev/null)" ]; then
    cp -rn .next/standalone/public/uploads/documents/* "$UPLOADS_DIR/documents/" 2>/dev/null || true
fi
# Remove the build copy and symlink to persistent storage
rm -rf .next/standalone/public/uploads/documents
mkdir -p .next/standalone/public/uploads
ln -sf "$UPLOADS_DIR/documents" .next/standalone/public/uploads/documents
echo "✅ Uploads symlinked to persistent $UPLOADS_DIR"

# 5.2 Symlink database into standalone so the app can find it
mkdir -p .next/standalone/prisma
ln -sf "$DB_FILE" .next/standalone/prisma/production.db

# 6. Copy .env to standalone directory
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
    fi
    cp "$ENV_FILE" .next/standalone/.env
fi

ENV_PROD_FILE=".env.production.local"
if [ -f "$ENV_PROD_FILE" ]; then
    cp "$ENV_PROD_FILE" .next/standalone/.env.production.local
fi

# Ensure DB_PATH is set in standalone .env
if [ -f .next/standalone/.env ]; then
    grep -q '^DB_PATH=' .next/standalone/.env || echo "DB_PATH=$DB_FILE" >> .next/standalone/.env
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
echo "💾 Database:      $DB_FILE"
echo ""

# 8. Quick health check
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed (HTTP $HTTP_STATUS)"
else
    echo "⚠️  Health check returned HTTP $HTTP_STATUS — check logs: pm2 logs $PM2_APP_NAME --lines 50"
fi
