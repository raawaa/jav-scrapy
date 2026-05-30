"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRunId = setRunId;
exports.setConsoleLevel = setConsoleLevel;
exports.writeRunSeparator = writeRunSeparator;
const winston_1 = require("winston");
const chalk_1 = __importDefault(require("chalk"));
const paths_1 = require("./paths");
const fs_1 = __importDefault(require("fs"));
// 当前运行 ID（由 jav.ts 在 mainExecution 开始时设置）
let currentRunId = '';
function setRunId(id) {
    currentRunId = id;
}
// 通用日志格式：带 runId 前缀（如果有）
const logFormat = winston_1.format.printf(({ timestamp, level, message }) => {
    const prefix = currentRunId ? `[${currentRunId}]` : '';
    return `${prefix}[${timestamp}] ${level.toUpperCase()}: ${message}`;
});
// 控制台传输（默认 warn，通过 --verbose/--quiet 调整）
const consoleTransport = new winston_1.transports.Console({
    level: 'warn',
    format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`))
});
// 文件格式（无颜色）
const fileFormat = winston_1.format.combine(winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat);
const logger = (0, winston_1.createLogger)({
    level: 'debug',
    format: fileFormat,
    transports: [
        consoleTransport,
        new winston_1.transports.File({
            filename: (0, paths_1.getMainLogPath)(),
            format: fileFormat
        }),
        new winston_1.transports.File({
            filename: (0, paths_1.getErrorLogPath)(),
            level: 'error',
            format: fileFormat
        })
    ]
});
logger.success = (message) => {
    return logger.info(chalk_1.default.green(`✅ ${message}`));
};
logger.progress = (message) => {
    return logger.info(chalk_1.default.blue(`🔄 ${message}`));
};
logger.network = (message) => {
    return logger.info(chalk_1.default.yellow(`🌐 ${message}`));
};
logger.debugDetailed = (message, data) => {
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
function setConsoleLevel(level) {
    consoleTransport.level = level;
}
/**
 * 写入运行分隔标记到日志文件
 * 在每次 mainExecution 开始时调用，帮助区分多次运行的日志
 */
function writeRunSeparator(id) {
    const line = `\n${'='.repeat(80)}\n[${new Date().toISOString()}] === 运行 ${id} 开始 ===\n`;
    try {
        fs_1.default.appendFileSync((0, paths_1.getMainLogPath)(), line);
        fs_1.default.appendFileSync((0, paths_1.getErrorLogPath)(), line);
    }
    catch {
        // 忽略写入分隔符失败
    }
}
exports.default = logger;
//# sourceMappingURL=logger.js.map