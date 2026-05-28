/**
 * ErrorHandler 单元测试
 *
 * 覆盖：handleNetworkError, handleFileError, handleParseError,
 *       handleGenericError, retryWithBackoff
 */
const assert = require('assert');
const { ErrorHandler, retryWithBackoff } = require('../../dist/utils/errorHandler');

describe('ErrorHandler', function () {
  // ─── handleNetworkError ────────────────────────────────
  describe('handleNetworkError', function () {
    it('处理网络错误不抛异常', function () {
      const error = new Error('connect ECONNREFUSED 127.0.0.1:8080');
      assert.doesNotThrow(() => ErrorHandler.handleNetworkError(error, '测试网络错误'));
    });

    it('处理 403 响应不抛异常', function () {
      const error = new Error('Request failed with status code 403');
      assert.doesNotThrow(() => ErrorHandler.handleNetworkError(error, '403测试'));
    });
  });

  // ─── handleFileError ────────────────────────────────
  describe('handleFileError', function () {
    it('处理文件不存在错误不抛异常', function () {
      const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      assert.doesNotThrow(() => ErrorHandler.handleFileError(error, '/tmp/nonexistent/file.txt'));
    });

    it('处理权限错误不抛异常', function () {
      const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      assert.doesNotThrow(() => ErrorHandler.handleFileError(error, '/root/secret.txt'));
    });
  });

  // ─── handleParseError ────────────────────────────────
  describe('handleParseError', function () {
    it('处理解析错误不抛异常', function () {
      const error = new Error('Unexpected token < in JSON at position 0');
      assert.doesNotThrow(() => ErrorHandler.handleParseError(error, '<html>not json</html>', 'JSON解析'));
    });

    it('处理空数据不抛异常', function () {
      assert.doesNotThrow(() => ErrorHandler.handleParseError(new Error('空数据'), '', '空数据测试'));
    });
  });

  // ─── handleGenericError ────────────────────────────────
  describe('handleGenericError', function () {
    it('处理任意错误不抛异常', function () {
      assert.doesNotThrow(() => ErrorHandler.handleGenericError(new Error('未知错误'), '通用测试'));
    });

    it('处理字符串类型错误不抛异常', function () {
      assert.doesNotThrow(() => ErrorHandler.handleGenericError('字符串错误', '字符串测试'));
    });
  });

  // ─── retryWithBackoff ────────────────────────────────
  describe('retryWithBackoff', function () {
    it('第一次就成功返回结果', async function () {
      const result = await retryWithBackoff(async () => 'success', 3, 1);
      assert.strictEqual(result, 'success');
    });

    it('第 N 次重试成功', async function () {
      let attempts = 0;
      const result = await retryWithBackoff(async () => {
        attempts++;
        if (attempts < 3) throw new Error(`attempt ${attempts} failed`);
        return 'ok';
      }, 5, 1);
      assert.strictEqual(result, 'ok');
      assert.strictEqual(attempts, 3);
    });

    it('始终失败则抛出最后一次错误', async function () {
      let attempts = 0;
      await assert.rejects(
        retryWithBackoff(async () => {
          attempts++;
          throw new Error(`always fail ${attempts}`);
        }, 2, 1),
        /always fail/
      );
      assert.strictEqual(attempts, 3); // 初始 + 2次重试
    });

    it('maxRetries = 0 时只执行一次', async function () {
      let attempts = 0;
      await assert.rejects(
        retryWithBackoff(async () => {
          attempts++;
          throw new Error('fail');
        }, 0, 1),
        /fail/
      );
      assert.strictEqual(attempts, 1);
    });
  });
});
