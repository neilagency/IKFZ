# Deployment Guide — ikfzdigitalzulassung.de

## Prerequisites
- Node.js 20+ on the server
- SSH access to Hostinger
- Domain pointed to server IP

## Quick Deployment

### Option 1: Hostinger Shared Hosting (Passenger)
```bash
bash deploy/hostinger-deploy.sh
```

### Option 2: VPS with PM2
```bash
bash deploy/deploy.sh
```

### Option 3: Quick Deploy (skip build)
```bash
bash deploy/hostinger-deploy.sh --quick
```

## Initial Setup

### 1. Server Environment File
Create the env file on server:
```bash
ssh -p 65002 <USER>@<SERVER_IP>
mkdir -p ~/env
nano ~/env/ikfzdigitalzulassung.env
```
Paste contents from `.env.production` (on Desktop) and fill in real values.

### 2. Generate Secrets
```bash
# JWT Secret
openssl rand -base64 48

# Cron Secret
openssl rand -base64 32

# SMTP Password (base64)
echo -n 'your-password' | base64
```

### 3. Setup Cron Jobs (on server)
```bash
bash deploy/setup-cron.sh
```

### 4. NGINX (VPS only)
```bash
sudo cp deploy/nginx/ikfzdigitalzulassung.de.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/ikfzdigitalzulassung.de /etc/nginx/sites-enabled/
sudo certbot --nginx -d ikfzdigitalzulassung.de -d www.ikfzdigitalzulassung.de
sudo nginx -t && sudo systemctl reload nginx
```

## Build Process
```bash
npx prisma generate    # Generate Prisma client
npm run build          # Build Next.js (standalone output)
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
| `EMAIL_FROM` | ⬜ | Sender email |
| `EMAIL_FROM_NAME` | ⬜ | Sender display name |
| `CONTACT_PHONE` | ⬜ | Support phone |
| `CONTACT_EMAIL` | ⬜ | Support email |

## Monitoring
```bash
# View server logs
ssh -p 65002 <USER>@<SERVER_IP> 'tail -f ~/domains/ikfzdigitalzulassung.de/nodejs/console.log'

# Force restart
ssh -p 65002 <USER>@<SERVER_IP> 'touch ~/domains/ikfzdigitalzulassung.de/nodejs/tmp/restart.txt'

# PM2 logs (VPS)
pm2 logs ikfz-app
```
