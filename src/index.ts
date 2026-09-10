import { createApp } from './app.js';
import { config } from './config/index.js';
import { runMigrations } from './database/migrate.js';
import { logger } from './shared/logging/logger.js';

const startServer = async () => {
  try {
    logger.info('Starting DeVoc OS Server...');
    await runMigrations();

    const app = createApp();
    app.listen(config.PORT, () => {
      logger.info(`🚀 DeVoc OS running on port ${config.PORT} [${config.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Failed to start server:', { error: (err as Error).message });
    process.exit(1);
  }
};

startServer();
