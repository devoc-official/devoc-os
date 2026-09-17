import { config } from '../../config/index.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const logLevelSeverity: Record<LogLevel, number> = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const currentLevelSeverity = logLevelSeverity[config.LOG_LEVEL as LogLevel] || 2;

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (currentLevelSeverity <= logLevelSeverity.debug) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
  info: (message: string, meta?: Record<string, unknown>) => {
    if (currentLevelSeverity <= logLevelSeverity.info) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    if (currentLevelSeverity <= logLevelSeverity.warn) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    if (currentLevelSeverity <= logLevelSeverity.error) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
};
