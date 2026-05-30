import { createLogger, format, transports, Logger } from 'winston';
import chalk from 'chalk';
import { LOG_DIR, getMainLogPath, getErrorLogPath } from './paths';
import fs from 'fs';

// 扩展 Logger 接口
declare module 'winston' {
  interface Logger {
    success: (message: string) => Logger;
    progress: (message: string) => Logger;
    network: (message: string) => Logger;
    debugDetailed: (message: string, data?: any) => Logger;
  }
}

// 当前运行 ID（由 jav.ts 在 mainExecution 开始时设置）
let currentRunId = '';

export function setRunId(id: string): void {
  currentRunId = id;
}

// 通用日志格式：带 runId 前缀（如果有）
const logFormat = format.printf(({ timestamp, level, message }) => {
  const prefix = currentRunId ? `[${currentRunId}]` : '';
  return `${prefix}[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

// 控制台传输（默认 warn，通过 --verbose/--quiet 调整）
const consoleTransport = new transports.Console({
  level: 'warn',
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  )
});

// 文件格式（无颜色）
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  logFormat
);

const logger = createLogger({
  level: 'debug',
  format: fileFormat,
  transports: [
    consoleTransport,
    new transports.File({
      filename: getMainLogPath(),
      format: fileFormat
    }),
    new transports.File({
      filename: getErrorLogPath(),
      level: 'error',
      format: fileFormat
    })
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

/**
 * 动态设置控制台传输的日志级别
 * - 'debug': 显示所有日志（--verbose）
 * - 'warn': 只显示警告和错误（默认）
 * - 'error': 只显示错误（--quiet）
 */
export function setConsoleLevel(level: string): void {
  consoleTransport.level = level;
}

/**
 * 写入运行分隔标记到日志文件
 * 在每次 mainExecution 开始时调用，帮助区分多次运行的日志
 */
export function writeRunSeparator(id: string): void {
  const line = `\n${'='.repeat(80)}\n[${new Date().toISOString()}] === 运行 ${id} 开始 ===\n`;
  try {
    fs.appendFileSync(getMainLogPath(), line);
    fs.appendFileSync(getErrorLogPath(), line);
  } catch {
    // 忽略写入分隔符失败
  }
}

export default logger;
