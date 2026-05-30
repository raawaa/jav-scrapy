/**
 * SystemProxy 单元测试
 *
 * 覆盖：parseProxyServer
 * 说明：getSystemProxy 依赖平台命令执行，不在单元测试覆盖范围内
 */
const assert = require('assert');
const { parseProxyServer } = require("../../dist/utils/systemProxy");

describe('SystemProxy', function () {

  describe('parseProxyServer', function () {

    it('IP:端口格式返回 http:// 前缀', function () {
      const result = parseProxyServer('192.168.1.1:8080');
      assert.strictEqual(result, 'http://192.168.1.1:8080');
    });

    it('完整 URL 格式直接返回', function () {
      const result = parseProxyServer('http://proxy.example.com:3128');
      assert.strictEqual(result, 'http://proxy.example.com:3128');
    });

    it('HTTPS URL 格式保持不变', function () {
      const result = parseProxyServer('https://proxy.example.com:3128');
      assert.strictEqual(result, 'https://proxy.example.com:3128');
    });

    it('SOCKS5 URL 格式保持不变', function () {
      const result = parseProxyServer('socks5://127.0.0.1:1080');
      assert.strictEqual(result, 'socks5://127.0.0.1:1080');
    });

    it('undefined 返回 undefined', function () {
      assert.strictEqual(parseProxyServer(undefined), undefined);
    });

    it('空字符串返回 undefined', function () {
      assert.strictEqual(parseProxyServer(''), undefined);
    });

    it('无效地址返回 undefined', function () {
      assert.strictEqual(parseProxyServer('not-a-proxy'), undefined);
    });

    it('仅 IP 无端口返回 undefined', function () {
      assert.strictEqual(parseProxyServer('192.168.1.1'), undefined);
    });

  });

});
