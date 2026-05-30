/**
 * Paths 单元测试
 *
 * 覆盖：APP_DATA_DIR, LOG_DIR, getLogDir, getMainLogPath, getErrorLogPath, getAntiBlockUrlsPath
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 重新加载 paths 模块以捕获模块初始化时的状态
delete require.cache[require.resolve('../../dist/core/paths')];
const paths = require('../../dist/core/paths');

describe('Paths', function () {

  describe('APP_DATA_DIR', function () {
    it('是非空字符串且为绝对路径', function () {
      assert.ok(typeof paths.APP_DATA_DIR === 'string');
      assert.ok(paths.APP_DATA_DIR.length > 0);
      assert.ok(path.isAbsolute(paths.APP_DATA_DIR));
    });

    it('以 jav-scrapy 结尾', function () {
      assert.ok(paths.APP_DATA_DIR.endsWith('jav-scrapy'),
        `APP_DATA_DIR (${paths.APP_DATA_DIR}) 应以 jav-scrapy 结尾`);
    });
  });

  describe('LOG_DIR', function () {
    it('是非空字符串且为绝对路径', function () {
      assert.ok(typeof paths.LOG_DIR === 'string');
      assert.ok(path.isAbsolute(paths.LOG_DIR));
    });

    it('是 APP_DATA_DIR 的子目录或以 tmp 回退', function () {
      // 要么在 APP_DATA_DIR 下，要么在 tmp 下
      const isInAppData = paths.LOG_DIR.startsWith(paths.APP_DATA_DIR);
      const isInTmp = paths.LOG_DIR.startsWith(os.tmpdir());
      assert.ok(isInAppData || isInTmp,
        `LOG_DIR ${paths.LOG_DIR} 应在 APP_DATA_DIR 或 tmp 下`);
    });

    it('目录已存在', function () {
      assert.ok(fs.existsSync(paths.LOG_DIR));
      assert.ok(fs.statSync(paths.LOG_DIR).isDirectory());
    });
  });

  describe('getLogDir', function () {
    it('返回 LOG_DIR 相同的值', function () {
      assert.strictEqual(paths.getLogDir(), paths.LOG_DIR);
    });
  });

  describe('getMainLogPath', function () {
    it('以 jav-scrapy.log 结尾', function () {
      const logPath = paths.getMainLogPath();
      assert.ok(logPath.endsWith('jav-scrapy.log'));
      assert.ok(path.isAbsolute(logPath));
    });

    it('在 LOG_DIR 下', function () {
      assert.ok(paths.getMainLogPath().startsWith(paths.LOG_DIR));
    });
  });

  describe('getErrorLogPath', function () {
    it('以 error.log 结尾', function () {
      const logPath = paths.getErrorLogPath();
      assert.ok(logPath.endsWith('error.log'));
      assert.ok(path.isAbsolute(logPath));
    });

    it('在 LOG_DIR 下', function () {
      assert.ok(paths.getErrorLogPath().startsWith(paths.LOG_DIR));
    });
  });

  describe('getAntiBlockUrlsPath', function () {
    const OLD_PATH = path.join(os.homedir(), '.jav-scrapy-antiblock-urls.json');

    afterEach(function () {
      // 清理测试创建的文件
      try { fs.unlinkSync(OLD_PATH); } catch {}
    });

    it('返回新路径（在 APP_DATA_DIR 下）', function () {
      const result = paths.getAntiBlockUrlsPath();
      assert.ok(result.startsWith(paths.APP_DATA_DIR));
      assert.ok(result.endsWith('antiblock-urls.json'));
    });

    it('旧位置存在且新位置不存在时迁移', function () {
      // 确保新位置不存在
      const newPath = path.join(paths.APP_DATA_DIR, 'antiblock-urls.json');
      try { fs.unlinkSync(newPath); } catch {}

      // 在旧位置创建测试文件
      fs.writeFileSync(OLD_PATH, '["https://example.com"]', 'utf-8');

      const result = paths.getAntiBlockUrlsPath();
      assert.strictEqual(result, newPath);
      // 验证旧文件已删除
      assert.ok(!fs.existsSync(OLD_PATH), '旧文件应被删除');
      // 验证新文件存在
      assert.ok(fs.existsSync(newPath), '新文件应存在');

      // 清理
      try { fs.unlinkSync(newPath); } catch {}
    });
  });

});
