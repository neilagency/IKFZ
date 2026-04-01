/**
 * PM2 Ecosystem Configuration
 * ========================================
 * For Hostinger VPS deployment with PM2.
 *
 * All secrets are loaded from environment variables.
 * Set them in .env.production.local or your hosting panel.
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ikfz-app
 *   pm2 logs ikfz-app
 */

module.exports = {
  apps: [
    {
      name: 'ikfz-app',
      script: '.next/standalone/server.js',
      cwd: '/var/www/ikfzdigitalzulassung.de',
      env_file: '.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        DB_PATH: '/var/www/ikfzdigitalzulassung.de/data/production.db',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/ikfz-error.log',
      out_file: '/var/log/pm2/ikfz-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      instances: 2,
      exec_mode: 'cluster',
    },
  ],
};
