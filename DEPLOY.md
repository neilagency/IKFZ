# Deployment Guide — ikfzdigitalzulassung.de

## Platform
Hostinger Shared Hosting + LiteSpeed Passenger (Node.js 20)

## Deploy Commands

```bash
bash deploy/deploy.sh             # Full build + deploy
bash deploy/deploy.sh --quick     # Skip build, upload + restart only
bash deploy/deploy.sh --setup     # First-time: install cron jobs on server
```

## How It Works

1. **Build** locally on macOS (`npx prisma generate` + `npm run build`)
2. **Cross-compile** — downloads prebuilt `better-sqlite3` Linux binary from GitHub
3. **Upload** via `rsync --delete` to `/home/u104276643/domains/ikfzdigitalzulassung.de/nodejs/`
4. **Server setup** — copies `.env`, symlinks DB, installs `sharp` for Linux, enforces `NODE_ENV=production`
5. **Restart** — `touch tmp/restart.txt` triggers Passenger reload
6. **Health check** — curls the site to verify HTTP 200

## First-Time Setup

### 1. Server Environment File
```bash
ssh -p 65002 u104276643@88.223.85.114
mkdir -p ~/env
nano ~/env/ikfzdigitalzulassung.env
```

### 2. Generate Secrets
```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 32   # CRON_SECRET
```

### 3. Setup Cron Jobs
```bash
bash deploy/deploy.sh --setup
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Admin authentication |
| `NEXTAUTH_SECRET` | ✅ | NextAuth/customer auth |
| `CRON_SECRET` | ✅ | Cron endpoint auth |
| `PAYPAL_CLIENT_ID` | ✅ | PayPal REST API |
| `PAYPAL_CLIENT_SECRET` | ✅ | PayPal REST API |
| `PAYPAL_MODE` | ✅ | `live` or `sandbox` |
| `MOLLIE_API_KEY` | ✅ | Mollie payments |
| `SMTP_HOST` | ✅ | Email server |
| `SMTP_PORT` | ✅ | Email port (465) |
| `SMTP_USER` | ✅ | Email username |
| `SMTP_PASS` | ✅ | Email password |
| `SITE_URL` | ✅ | https://ikfzdigitalzulassung.de |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Public site URL |

## Monitoring
```bash
# View logs
ssh -p 65002 u104276643@88.223.85.114 'tail -f ~/domains/ikfzdigitalzulassung.de/nodejs/console.log'

# Force restart
ssh -p 65002 u104276643@88.223.85.114 'touch ~/domains/ikfzdigitalzulassung.de/nodejs/tmp/restart.txt'
```
