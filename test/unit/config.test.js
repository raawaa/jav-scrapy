/**
 * Config 单元测试
 *
 * 覆盖：默认配置、updateFromProgram（CLI 参数覆盖、防屏蔽地址加载、代理合并）
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ConfigManager = require('../../dist/core/config').default;
const { getAntiBlockUrlsPath } = require('../../dist/core/paths');

describe('ConfigManager', function () {

  // ─── 默认配置 ──────────────────────────────────
  describe('默认配置', function () {
    it('应返回包含所有必要字段的配置对象', function () {
      const mgr = new ConfigManager();
      const config = mgr.getConfig();

      assert.ok(config, '配置对象不应为空');
      assert.ok(typeof config.retryCount === 'number');
      assert.ok(typeof config.parallel === 'number');
      assert.ok(typeof config.timeout === 'number');
      assert.ok(typeof config.BASE_URL === 'string');
      assert.ok(typeof config.headers === 'object');
      assert.ok(typeof config.headers.Cookie === 'string');
      assert.ok(typeof config.headers.Referer === 'string');
    });

    it('默认 parallel 为 2', function () {
      const mgr = new ConfigManager();
      assert.strictEqual(mgr.getConfig().parallel, 2);
    });

    it('默认 timeout 为 30000', function () {
      const mgr = new ConfigManager();
      assert.strictEqual(mgr.getConfig().timeout, 30000);
    });

    it('默认 base 为 null', function () {
      const mgr = new ConfigManager();
      assert.strictEqual(mgr.getConfig().base, null);
    });

    it('默认 Cookie 为 existmag=mag', function () {
      const mgr = new ConfigManager();
      assert.strictEqual(mgr.getConfig().headers.Cookie, 'existmag=mag');
    });
  });

  // ─── updateFromProgram ──────────────────────────
  describe('updateFromProgram', function () {
    function makeProgram(opts = {}) {
      return {
        opts: () => ({
          proxy: undefined,
          cookies: undefined,
          parallel: undefined,
          timeout: undefined,
          output: undefined,
          search: undefined,
          base: undefined,
          allmag: undefined,
          nopic: undefined,
          limit: undefined,
          delay: undefined,
          strictSSL: undefined,
          ...opts
        })
      };
    }

    it('覆盖 parallel 参数', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ parallel: '8' }));
      assert.strictEqual(mgr.getConfig().parallel, 8);
    });

    it('覆盖 timeout 参数', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ timeout: '60000' }));
      assert.strictEqual(mgr.getConfig().timeout, 60000);
    });

    it('覆盖 output 目录', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ output: '/tmp/jav-test' }));
      assert.strictEqual(mgr.getConfig().output, '/tmp/jav-test');
    });

    it('覆盖 search 参数', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ search: 'TEST' }));
      assert.strictEqual(mgr.getConfig().search, 'TEST');
    });

    it('覆盖 proxy 参数', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ proxy: 'http://127.0.0.1:8888' }));
      assert.strictEqual(mgr.getConfig().proxy, 'http://127.0.0.1:8888');
    });

    it('通过 CLI 设置代理覆盖系统代理', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ proxy: 'socks5://127.0.0.1:1080' }));
      assert.strictEqual(mgr.getConfig().proxy, 'socks5://127.0.0.1:1080');
    });

    it('设置 allmag 标志', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ allmag: true }));
      assert.strictEqual(mgr.getConfig().allmag, true);
    });

    it('设置 nopic 标志', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ nopic: true }));
      assert.strictEqual(mgr.getConfig().nopic, true);
    });

    it('设置 limit 参数', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ limit: '50' }));
      assert.strictEqual(mgr.getConfig().limit, 50);
    });

    it('设置 delay 参数', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ delay: '5' }));
      assert.strictEqual(mgr.getConfig().delay, 5);
    });

    it('解析 cookies 字符串', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ cookies: 'existmag=mag; test=value' }));
      assert.ok(mgr.getConfig().headers.Cookie.includes('existmag=mag'));
      assert.ok(mgr.getConfig().headers.Cookie.includes('test=value'));
    });

    it('base 参数覆盖所有 URL 字段', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ base: 'https://alt.javbus.com' }));
      const config = mgr.getConfig();
      assert.strictEqual(config.base, 'https://alt.javbus.com');
      assert.strictEqual(config.baseUrl, 'https://alt.javbus.com');
      assert.strictEqual(config.BASE_URL, 'https://alt.javbus.com');
    });

    it('base 参数末尾斜杠被移除（BASE_URL）', async function () {
      const mgr = new ConfigManager();
      await mgr.updateFromProgram(makeProgram({ base: 'https://alt.javbus.com/' }));
      assert.strictEqual(mgr.getConfig().BASE_URL, 'https://alt.javbus.com');
    });

    describe('strictSSL 处理', function () {
      it('--no-strict-ssl 设置 strictSSL=false', async function () {
        const mgr = new ConfigManager();
        await mgr.updateFromProgram(makeProgram({ strictSSL: false }));
        assert.strictEqual(mgr.getConfig().strictSSL, false);
      });

      it('省略 --strict-ssl 时保持默认 true（来自 DEFAULT_CONFIG）', async function () {
        const mgr = new ConfigManager();
        await mgr.updateFromProgram(makeProgram());
        // 未指定时使用 DEFAULT_CONFIG.strictSSL = true
        assert.strictEqual(mgr.getConfig().strictSSL, true);
      });

      it('--strict-ssl 设为 true', async function () {
        const mgr = new ConfigManager();
        await mgr.updateFromProgram(makeProgram({ strictSSL: true }));
        assert.strictEqual(mgr.getConfig().strictSSL, true);
      });
    });
  });

  // ─── 防屏蔽地址加载 ────────────────────────────
  describe('防屏蔽地址加载', function () {
    let antiblockPath;

    before(function () {
      antiblockPath = getAntiBlockUrlsPath();
    });

    afterEach(function () {
      try { fs.unlinkSync(antiblockPath); } catch {}
    });

    it('本地存在防屏蔽地址时设置为 base', async function () {
      // 确保目录存在
      fs.mkdirSync(path.dirname(antiblockPath), { recursive: true });
      fs.writeFileSync(antiblockPath, JSON.stringify(['https://mirror.javbus.com']), 'utf-8');

      const mgr = new ConfigManager();
      await mgr.updateFromProgram(require('../../dist/core/config').default.makeProgram ? undefined : makeProgram());

      const config = mgr.getConfig();
      assert.ok(config.base === 'https://mirror.javbus.com' || config.baseUrl === 'https://mirror.javbus.com',
        `base 应为防屏蔽地址，实际为 ${config.base}`);
    });

    function makeProgram(opts = {}) {
      return {
        opts: () => ({
          proxy: undefined, cookies: undefined, parallel: undefined,
          timeout: undefined, output: undefined, search: undefined,
          base: undefined, allmag: undefined, nopic: undefined,
          limit: undefined, delay: undefined, strictSSL: undefined,
          ...opts
        })
      };
    }
  });

});
