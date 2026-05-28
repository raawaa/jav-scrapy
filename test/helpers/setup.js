/**
 * 测试环境初始化
 * 静默 logger，避免测试输出被日志干扰
 */
process.env.NODE_ENV = 'test';

// 重定向 logger 到无操作函数
const noopLogger = {
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
  success: () => {},
  log: () => {}
};

// 替换模块级 logger 实例
require('../../dist/core/logger');
const loggerModule = require('../../dist/core/logger');
// 重置 transports 避免写文件
const logger = loggerModule.default || loggerModule;
if (logger.transports) {
  logger.transports.forEach((t) => { t.silent = true; });
}
