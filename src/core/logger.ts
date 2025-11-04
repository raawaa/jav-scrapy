import { createLogger, format, transports, Logger } from 'winston';
import chalk from 'chalk';

// 扩展 Logger 接口
declare module 'winston' {
  interface Logger {
    success: (message: string) => Logger;
    progress: (message: string) => Logger;
    network: (message: string) => Logger;
    debugDetailed: (message: string, data?: any) => Logger;
  }
}

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
      )
    }),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
    new transports.File({ filename: 'debug.log', level: 'debug' })
  ]
});

logger.success = (message: string) => {
  return logger.info(chalk.green(`✅ ${message}`));
};

logger.progress = (message: string) => {
  return logger.info(chalk.blue(`🔄 ${message}`));
};

logger.network = (message: string) => {
  return logger.info(chalk.yellow(`🌐 ${message}`));
};

logger.debugDetailed = (message: string, data?: any) => {
  if (data) {
    return logger.debug(`${message} | 数据: ${JSON.stringify(data, null, 2)}`);
  }
  return logger.debug(message);
};

export default logger;