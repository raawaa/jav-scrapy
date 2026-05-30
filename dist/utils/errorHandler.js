"use strict";
/**
 * @file errorHandler.ts
 * @description 统一错误处理模块
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const logger_1 = __importDefault(require("../core/logger"));
/**
 * 统一错误处理函数
 */
class ErrorHandler {
    static handleError(error, context = '') {
        if (error instanceof Error) {
            logger_1.default.error(`${context ? `[${context}] ` : ''}${error.message}`);
            if (error.constructor.name !== 'Error') {
                logger_1.default.error(`类型: ${error.constructor.name}`);
            }
            const axiosError = error;
            if (axiosError.response?.status) {
                logger_1.default.error(`状态码: ${axiosError.response.status}`);
            }
            if (axiosError.code) {
                logger_1.default.error(`代码: ${axiosError.code}`);
            }
        }
        else {
            logger_1.default.error(`${context ? `[${context}] ` : ''}未知错误: ${String(error)}`);
        }
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=errorHandler.js.map