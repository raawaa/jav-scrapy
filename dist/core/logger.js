"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = require("winston");
const chalk_1 = __importDefault(require("chalk"));
const logger = (0, winston_1.createLogger)({
    level: 'debug',
    format: winston_1.format.combine(winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)),
    transports: [
        new winston_1.transports.Console({
            format: winston_1.format.combine(winston_1.format.colorize(), winston_1.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`))
        }),
        new winston_1.transports.File({ filename: 'error.log', level: 'error' }),
        new winston_1.transports.File({ filename: 'combined.log' }),
        new winston_1.transports.File({ filename: 'debug.log', level: 'debug' })
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
exports.default = logger;
//# sourceMappingURL=logger.js.map