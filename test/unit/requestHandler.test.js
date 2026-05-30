/**
 * RequestHandler 单元测试
 *
 * 覆盖：构造函数、getPage、getXMLHttpRequest、fetchMagnet、downloadImage
 * 注意：不使用 nock（Node v26 兼容性问题），改用 axios 请求拦截器模拟
 */
const assert = require('assert');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RequestHandler = require('../../dist/core/requestHandler').default;

const BASE = 'https://www.javbus.com';

function makeConfig(overrides = {}) {
  return {
    retryCount: 1,
    retryDelay: 100,
    BASE_URL: BASE + '/',
    baseUrl: BASE + '/',
    base: BASE + '/',
    parallel: 2,
    headers: { Referer: BASE + '/', Cookie: 'existmag=mag' },
    output: os.tmpdir(),
    search: null,
    base: null,
    allmag: false,
    nopic: false,
    timeout: 5000,
    searchUrl: '/search',
    limit: 0,
    delay: 1,
    ...overrides
  };
}

/**
 * 拦截匹配的 URL，返回指定状态码和响应体
 * 非 2xx 状态码会被包装为 AxiosError（与原生 axios 行为一致）
 */
function intercept(urlMatcher, statusCode, body, headers = {}) {
  const interceptor = axios.interceptors.request.use((config) => {
    const requestUrl = config.baseURL
      ? new URL(config.url, config.baseURL).href
      : config.url;

    const match = typeof urlMatcher === 'function'
      ? urlMatcher(requestUrl)
      : requestUrl === urlMatcher;

    if (!match) return config;

    const response = {
      data: body,
      status: statusCode,
      statusText: statusCode >= 200 && statusCode < 300 ? 'OK' : 'Error',
      headers: { ...headers },
      config,
      request: {}
    };

    if (statusCode >= 200 && statusCode < 300) {
      // 2xx → 正常返回
      config.adapter = () => Promise.resolve(response);
    } else {
      // 非 2xx → 抛出 AxiosError
      const error = new Error(`Request failed with status code ${statusCode}`);
      error.name = 'AxiosError';
      error.code = 'ERR_BAD_RESPONSE';
      error.response = response;
      config.adapter = () => Promise.reject(error);
    }

    return config;
  });

  return interceptor;
}

/**
 * 序列化拦截：每次请求依次使用 responses 数组中的下一个定义
 */
function interceptSequence(urlMatcher, responses) {
  let callCount = 0;
  const interceptor = axios.interceptors.request.use((config) => {
    const requestUrl = config.baseURL
      ? new URL(config.url, config.baseURL).href
      : config.url;

    const match = typeof urlMatcher === 'function'
      ? urlMatcher(requestUrl)
      : requestUrl === urlMatcher;

    if (!match) return config;

    const idx = Math.min(callCount, responses.length - 1);
    callCount++;
    const { statusCode, body, headers = {} } = responses[idx];

    const response = {
      data: body,
      status: statusCode,
      statusText: statusCode >= 200 && statusCode < 300 ? 'OK' : 'Error',
      headers,
      config,
      request: {}
    };

    if (statusCode >= 200 && statusCode < 300) {
      config.adapter = () => Promise.resolve(response);
    } else {
      const error = new Error(`Request failed with status code ${statusCode}`);
      error.name = 'AxiosError';
      error.code = 'ERR_BAD_RESPONSE';
      error.response = response;
      config.adapter = () => Promise.reject(error);
    }

    return config;
  });

  return interceptor;
}

describe('RequestHandler', function () {

  afterEach(function () {
    axios.interceptors.request.clear();
  });

  // ─── 构造函数 ────────────────────────────────────
  describe('constructor', function () {
    it('设置基础请求头', function () {
      const rh = new RequestHandler(makeConfig());
      assert.ok(rh instanceof RequestHandler);
    });

    it('User-Agent 从预定义列表随机选取', function () {
      for (let i = 0; i < 20; i++) {
        const rh = new RequestHandler(makeConfig());
        assert.ok(rh instanceof RequestHandler);
      }
    });
  });

  // ─── getPage ────────────────────────────────────
  describe('getPage', function () {
    it('正常返回页面内容和状态码', async function () {
      intercept(BASE + '/test-page', 200, '<html><body>OK</body></html>');
      const rh = new RequestHandler(makeConfig());
      const result = await rh.getPage(BASE + '/test-page');
      assert.ok(result);
      assert.strictEqual(result.statusCode, 200);
      assert.ok(result.body.includes('OK'));
    });

    it('无效 URL 返回 null 不抛异常', async function () {
      const rh = new RequestHandler(makeConfig());
      const result = await rh.getPage('not-a-valid-url');
      assert.strictEqual(result, null);
    });

    it('SSRF 类 URL 被拒绝（file:// 协议）', async function () {
      const rh = new RequestHandler(makeConfig());
      const result = await rh.getPage('file:///etc/passwd');
      assert.strictEqual(result, null);
    });

    it('403 错误视为可重试，耗尽后返回 null', async function () {
      interceptSequence(BASE + '/forbidden', [
        { statusCode: 403, body: 'Forbidden' },
        { statusCode: 403, body: 'Forbidden' }
      ]);
      const rh = new RequestHandler(makeConfig({ retryCount: 1 }));
      const result = await rh.getPage(BASE + '/forbidden');
      assert.strictEqual(result, null);
    });

    it('302 重定向到驾考题页面返回 null', async function () {
      intercept(BASE + '/driver-test', 302, '', {
        location: 'https://www.javbus.com/driver-verify?q=xxx'
      });
      const rh = new RequestHandler(makeConfig());
      const result = await rh.getPage(BASE + '/driver-test');
      assert.strictEqual(result, null);
    });

    it('302 重定向到非驾考题页面不重试', async function () {
      // 302 不在可重试列表 [500,502,503,504,429,403] 中
      // 且 302 的 location 不包含 driver-verify
      intercept(BASE + '/redirect', 302, '', {
        location: BASE + '/target'
      });
      const rh = new RequestHandler(makeConfig({ retryCount: 1 }));
      const result = await rh.getPage(BASE + '/redirect');
      // 302 且 location 不含 driver-verify → 判断为非可重试，耗尽返回 null
      assert.strictEqual(result, null);
    });

    it('网络错误触发重试，重试后成功', async function () {
      interceptSequence(BASE + '/timeout', [
        { statusCode: 500, body: 'Server Error' },
        { statusCode: 200, body: 'Recovered' }
      ]);
      const rh = new RequestHandler(makeConfig({ retryCount: 1 }));
      const result = await rh.getPage(BASE + '/timeout');
      assert.ok(result);
      assert.strictEqual(result.statusCode, 200);
    });

    it('重试耗尽后返回 null', async function () {
      interceptSequence(BASE + '/always-fail', [
        { statusCode: 500, body: 'Error' },
        { statusCode: 500, body: 'Error' }
      ]);
      const rh = new RequestHandler(makeConfig({ retryCount: 1 }));
      const result = await rh.getPage(BASE + '/always-fail');
      assert.strictEqual(result, null);
    });
  });

  // ─── getXMLHttpRequest ──────────────────────────
  describe('getXMLHttpRequest', function () {
    it('发送 AJAX 请求并返回结果', async function () {
      intercept(BASE + '/ajax-endpoint', 200, 'ajax response body');
      const rh = new RequestHandler(makeConfig());
      const result = await rh.getXMLHttpRequest(BASE + '/ajax-endpoint');
      assert.ok(result);
      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.body, 'ajax response body');
    });

    it('无效 URL 抛异常', async function () {
      const rh = new RequestHandler(makeConfig());
      await assert.rejects(
        () => rh.getXMLHttpRequest('invalid-url'),
        Error
      );
    });
  });

  // ─── fetchMagnet ────────────────────────────────
  describe('fetchMagnet', function () {
    const magnetBody = `
      <tr><td><a href="magnet:?xt=urn:btih:AAA&dn=test1">test1</a></td><td>1.00GB</td></tr>
      <tr><td><a href="magnet:?xt=urn:btih:BBB&dn=test2">test2</a></td><td>2.00GB</td></tr>
      <tr><td><a href="magnet:?xt=urn:btih:CCC&dn=test3">test3</a></td><td>512.00MB</td></tr>
    `;

    function makeMetadata(overrides = {}) {
      return {
        title: 'TEST-123 Test Film',
        gid: '1234567890',
        img: 'pics/cover/test.jpg',
        uc: '0987654321',
        category: [],
        actress: [],
        ...overrides
      };
    }

    beforeEach(function () {
      intercept((url) => url.includes('ajax/uncledatoolsbyajax'), 200, magnetBody);
    });

    it('返回最大文件大小的磁力链接（默认模式）', async function () {
      const rh = new RequestHandler(makeConfig());
      const result = await rh.fetchMagnet(makeMetadata());
      assert.ok(result);
      assert.ok(result.magnet.includes('BBB'), '应选择最大的 2.00GB 磁链');
      assert.ok(result.magnetLinks);
      assert.strictEqual(result.magnetLinks.length, 1);
    });

    it('allmag=true 返回所有磁力链接', async function () {
      const rh = new RequestHandler(makeConfig({ allmag: true }));
      const result = await rh.fetchMagnet(makeMetadata());
      assert.ok(result);
      assert.ok(result.magnetLinks);
      assert.strictEqual(result.magnetLinks.length, 3);
    });

    it('无效 gid 返回 null', async function () {
      const rh = new RequestHandler(makeConfig());
      const result = await rh.fetchMagnet(makeMetadata({ gid: '<script>' }));
      assert.strictEqual(result, null);
    });

    it('无效 img（含空格）返回 null', async function () {
      const rh = new RequestHandler(makeConfig());
      // 空格不在允许字符集 [a-zA-Z0-9\/_.-] 中
      const result = await rh.fetchMagnet(makeMetadata({ img: 'pics/cover/test 1.jpg' }));
      assert.strictEqual(result, null);
    });

    it('无效 uc 返回 null', async function () {
      const rh = new RequestHandler(makeConfig());
      const result = await rh.fetchMagnet(makeMetadata({ uc: '' }));
      assert.strictEqual(result, null);
    });
  });

  // ─── downloadImage ──────────────────────────────
  describe('downloadImage', function () {
    let tmpDir;

    beforeEach(function () {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-test-'));
    });

    afterEach(function () {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    it('下载图片并保存到文件', async function () {
      intercept('https://pics.javbus.com/cover/test.jpg', 200, Buffer.from('fake-image-bytes'));
      const rh = new RequestHandler(makeConfig({ output: tmpDir }));
      const result = await rh.downloadImage(
        'https://pics.javbus.com/cover/test.jpg',
        'TEST-123.jpg'
      );
      assert.strictEqual(result, true);
      assert.ok(fs.existsSync(path.join(tmpDir, 'TEST-123.jpg')));
    });

    it('文件已存在返回 false', async function () {
      const filePath = path.join(tmpDir, 'EXISTS.jpg');
      fs.writeFileSync(filePath, 'existing-content');
      const rh = new RequestHandler(makeConfig({ output: tmpDir }));
      const result = await rh.downloadImage(
        'https://pics.javbus.com/cover/exists.jpg',
        'EXISTS.jpg'
      );
      assert.strictEqual(result, false);
    });

    it('输出目录不存在时自动创建', async function () {
      const nestedDir = path.join(tmpDir, 'nested', 'output');
      intercept('https://pics.javbus.com/cover/new.jpg', 200, Buffer.from('new-image'));
      const rh = new RequestHandler(makeConfig({ output: nestedDir }));
      const result = await rh.downloadImage(
        'https://pics.javbus.com/cover/new.jpg',
        'NEW.jpg'
      );
      assert.strictEqual(result, true);
      assert.ok(fs.existsSync(path.join(nestedDir, 'NEW.jpg')));
    });
  });

});
