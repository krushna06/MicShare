const http = require('node:http');
const { loadEnv } = require('@micshare/shared/src/env');
const { getDbConfig } = require('@micshare/shared/src/db-config');
const { getServerConfig } = require('./config');
const logger = require('./logger');
const { createApp } = require('./app');
const { createSocketServer } = require('./socket');
const { getPool, checkHealth } = require('./db/connection');

async function main() {
  loadEnv();
  const serverConfig = getServerConfig();
  const dbConfig = getDbConfig();
  const environment = process.env.NODE_ENV || 'development';

  logger.info(`Mic Share backend initializing (${environment})`);
  logger.info(`Connecting to MySQL at ${dbConfig.DB_HOST}:${dbConfig.DB_PORT}/${dbConfig.DB_NAME}`);

  await checkHealth();
  logger.info('Database connection OK');

  const app = createApp();
  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer, { origin: [serverConfig.CLIENT_URL, 'null'] });
  app.set('io', io);

  httpServer.listen(serverConfig.SERVER_PORT, () => {
    logger.info(`HTTP server listening on http://localhost:${serverConfig.SERVER_PORT}`);
    logger.info(`WebSocket server attached (Socket.IO)`);
  });

  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(async () => {
      try {
        await getPool().end();
        logger.info('Database pool closed');
      } catch (err) {
        logger.error('Error closing database pool', { error: err.message });
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.stack || err.message });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason.stack || reason.message : String(reason);
  logger.error('Unhandled promise rejection', { error });
  process.exit(1);
});

main().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
