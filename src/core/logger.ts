import { createLogger, format, transports, Logger } from 'winston';
import chalk from 'chalk';

declare module 'winston' {
  interface Logger {
    success: (message: string) => void;
  }
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

logger.success = (message: string) => logger.info(chalk.green(`✅ ${message}`));

export default logger;