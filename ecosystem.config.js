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
      // Memory limit: restart process if RSS exceeds 400MB
      // Prevents one app from consuming all shared server memory
      max_memory_restart: '400M',
      error_file: '/var/log/pm2/ikfz-error.log',
      out_file: '/var/log/pm2/ikfz-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Single instance to avoid cache/rate-limit isolation issues
      // on shared hosting with limited resources
      instances: 1,
      exec_mode: 'fork',
      // Graceful shutdown: allow 5s for in-flight requests
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Exponential backoff on restarts
      exp_backoff_restart_delay: 100,
    },
  ],
};
