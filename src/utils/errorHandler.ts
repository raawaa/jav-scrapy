/**
 * @file errorHandler.ts
 * @description 统一错误处理模块
 */

import logger from '../core/logger';

/**
 * 统一错误处理函数
 */
export class ErrorHandler {
  public static handleError(error: unknown, context: string = ''): void {
    if (error instanceof Error) {
      logger.error(`${context ? `[${context}] ` : ''}${error.message}`);
      if (error.constructor.name !== 'Error') {
        logger.error(`类型: ${error.constructor.name}`);
      }
      const axiosError = error as any;
      if (axiosError.response?.status) {
        logger.error(`状态码: ${axiosError.response.status}`);
      }
      if (axiosError.code) {
        logger.error(`代码: ${axiosError.code}`);
      }
    } else {
      logger.error(`${context ? `[${context}] ` : ''}未知错误: ${String(error)}`);
    }
  }
}
