/**
 * PM2 Ecosystem Configuration — FarmerPay Platform
 * Production process management with clustering, auto-restart, and log rotation.
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 stop farmerpay-platform
 *   pm2 restart farmerpay-platform
 *   pm2 logs farmerpay-platform
 */
module.exports = {
  apps: [
    {
      name: 'farmerpay-platform',
      script: 'src/app.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Auto-restart
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 8000,
      shutdown_with_message: true,
    },
    {
      name: 'farmerpay-audit-worker',
      script: 'src/workers/auditConsumer.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      kill_timeout: 15000,
      env: { NODE_ENV: 'production' },
      error_file: 'logs/audit-worker-error.log',
      out_file: 'logs/audit-worker-out.log',
    },
    {
      name: 'farmerpay-media-worker',
      script: 'src/workers/mediaConsumer.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      kill_timeout: 15000,
      env: { NODE_ENV: 'production' },
      error_file: 'logs/media-worker-error.log',
      out_file: 'logs/media-worker-out.log',
    },
  ],
};
