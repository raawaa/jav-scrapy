/**
 * ErrorHandler 单元测试
 *
 * 覆盖：handleError 单一入口
 */
const assert = require('assert');
const { ErrorHandler } = require('../../dist/utils/errorHandler');

describe('ErrorHandler', function () {
  describe('handleError', function () {
    it('处理网络错误不抛异常', function () {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:8080');
      assert.doesNotThrow(() => ErrorHandler.handleError(error, '测试网络错误'));
    });

    it('处理 403 响应不抛异常', function () {
      const error = new Error('Request failed with status code 403');
      assert.doesNotThrow(() => ErrorHandler.handleError(error, '403测试'));
    });

    it('处理文件不存在错误不抛异常', function () {
      const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      assert.doesNotThrow(() => ErrorHandler.handleError(error, '文件不存在'));
    });

    it('处理权限错误不抛异常', function () {
      const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      assert.doesNotThrow(() => ErrorHandler.handleError(error, '权限错误'));
    });

    it('处理解析错误不抛异常', function () {
      const error = new Error('Unexpected token < in JSON at position 0');
      assert.doesNotThrow(() => ErrorHandler.handleError(error, 'JSON解析'));
    });

    it('处理空数据不抛异常', function () {
      assert.doesNotThrow(() => ErrorHandler.handleError(new Error('空数据'), '空数据测试'));
    });

    it('处理任意错误不抛异常', function () {
      assert.doesNotThrow(() => ErrorHandler.handleError(new Error('未知错误'), '通用测试'));
    });

    it('处理字符串类型错误不抛异常', function () {
      assert.doesNotThrow(() => ErrorHandler.handleError('字符串错误', '字符串测试'));
    });
  });
});
