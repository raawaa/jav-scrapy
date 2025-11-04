/**
 * @file errorHandler.ts
 * @description 统一错误处理模块
 * @module utils/errorHandler
 */

import logger from '../core/logger';

/**
 * 统一错误处理函数
 */
export class ErrorHandler {
  /**
   * 处理网络请求错误
   * @param error 错误对象
   * @param context 错误上下文信息
   */
  public static handleNetworkError(error: unknown, context: string = ''): void {
    if (error instanceof Error) {
      logger.error(`网络请求错误 ${context ? `[${context}]` : ''}: ${error.message}`);

      // 根据错误类型提供更具体的处理
      if (error.name === 'AxiosError') {
        const axiosError = error as any;
        const statusCode = axiosError.response?.status;
        const requestUrl = axiosError.config?.url;

        logger.error(`响应状态码: ${statusCode || 'N/A'}`);
        logger.error(`请求URL: ${requestUrl || 'N/A'}`);

        // 针对特定错误代码提供建议
        if (statusCode === 403) {
          logger.warn('403 Forbidden: 可能是反爬虫机制，建议：');
          logger.warn('  1. 检查代理设置是否正确');
          logger.warn('  2. 尝试更新防屏蔽地址 (jav update)');
          logger.warn('  3. 增加请求延迟时间 (-d 参数)');
        } else if (statusCode === 429) {
          logger.warn('429 Too Many Requests: 请求过于频繁，建议：');
          logger.warn('  1. 增加请求延迟时间 (-d 参数)');
          logger.warn('  2. 降低并发数 (-p 参数)');
        } else if (statusCode === 401 || statusCode === 403) {
          logger.warn(`${statusCode}: 认证失败，建议：`);
          logger.warn('  1. 检查Cookie是否有效');
          logger.warn('  2. 尝试手动设置Cookies (-c 参数)');
        } else if (!statusCode) {
          logger.warn('无响应状态码，可能是网络连接问题：');
          logger.warn('  1. 检查网络连接');
          logger.warn('  2. 验证代理设置');
          logger.warn('  3. 检查防火墙设置');
        }

        // 如果是AJAX请求，提供额外信息
        if (requestUrl && requestUrl.includes('/ajax/')) {
          logger.warn('AJAX请求失败，这可能是因为：');
          logger.warn('  1. 会话Cookie过期或无效');
          logger.warn('  2. 网站检测到自动化行为');
          logger.warn('  3. 请求头信息不正确');
          logger.debug('建议尝试：');
          logger.debug('  1. 手动访问网站更新会话');
          logger.debug('  2. 使用不同的代理服务器');
          logger.debug('  3. 暂停一段时间后重试');
        }

        // 记录响应头信息（如果有）
        if (axiosError.response?.headers) {
          logger.debug(`响应头: ${JSON.stringify(axiosError.response.headers, null, 2)}`);
        }
      } else {
        // 处理其他类型的网络错误
        const errorCode = (error as any).code;
        if (errorCode) {
          switch (errorCode) {
            case 'ECONNRESET':
              logger.error('连接被重置，可能是服务器或代理问题');
              logger.debug('建议：更换代理服务器或稍后重试');
              break;
            case 'ETIMEDOUT':
              logger.error('连接超时，可能是网络慢或服务器响应慢');
              logger.debug('建议：增加超时时间 (-t 参数) 或检查网络');
              break;
            case 'ENOTFOUND':
              logger.error('域名解析失败，可能是网络连接或DNS问题');
              logger.debug('建议：检查网络连接和DNS设置');
              break;
            case 'ECONNREFUSED':
              logger.error('连接被拒绝，可能是代理设置问题');
              logger.debug('建议：检查代理服务器地址和端口');
              break;
            default:
              logger.error(`网络错误代码: ${errorCode}`);
          }
        }
      }
    } else {
      logger.error(`未知网络错误 ${context ? `[${context}]` : ''}: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 处理文件操作错误
   * @param error 错误对象
   * @param context 错误上下文信息
   */
  public static handleFileError(error: unknown, context: string = ''): void {
    if (error instanceof Error) {
      logger.error(`文件操作错误 ${context ? `[${context}]` : ''}: ${error.message}`);
      
      // 根据错误代码提供更具体的处理
      const code = (error as NodeJS.ErrnoException).code;
      if (code) {
        switch (code) {
          case 'ENOENT':
            logger.error('文件或目录不存在');
            break;
          case 'EACCES':
            logger.error('权限不足，无法访问文件或目录');
            break;
          case 'ENOSPC':
            logger.error('磁盘空间不足');
            break;
          case 'ENAMETOOLONG':
            logger.error('文件名过长');
            break;
          case 'EEXIST':
            logger.warn('文件已存在，跳过操作');
            break;
          default:
            logger.error(`错误代码: ${code}`);
        }
      }
    } else {
      logger.error(`未知文件错误 ${context ? `[${context}]` : ''}: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 处理解析错误
   * @param error 错误对象
   * @param context 错误上下文信息
   */
  public static handleParseError(error: unknown, context: string = ''): void {
    if (error instanceof Error) {
      logger.error(`解析错误 ${context ? `[${context}]` : ''}: ${error.message}`);
      logger.debug(`错误堆栈: ${error.stack}`);
    } else {
      logger.error(`未知解析错误 ${context ? `[${context}]` : ''}: ${JSON.stringify(error)}`);
    }
  }

  /**
   * 处理通用错误
   * @param error 错误对象
   * @param context 错误上下文信息
   */
  public static handleGenericError(error: unknown, context: string = ''): void {
    if (error instanceof Error) {
      logger.error(`错误 ${context ? `[${context}]` : ''}: ${error.message}`);
      logger.debug(`错误堆栈: ${error.stack}`);
    } else {
      logger.error(`未知错误 ${context ? `[${context}]` : ''}: ${JSON.stringify(error)}`);
    }
  }
}

/**
 * 重试函数
 * @param fn 要执行的函数
 * @param retries 重试次数
 * @param delay 延迟时间
 * @param context 上下文信息
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000,
  context: string = ''
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(`操作失败 ${context ? `[${context}]` : ''}，正在重试 (${i + 1}/${retries}): ${(error as Error).message}`);

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  logger.error(`操作最终失败 ${context ? `[${context}]` : ''}，已重试 ${retries} 次`);
  throw lastError;
}