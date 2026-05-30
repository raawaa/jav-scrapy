/**
 * Constants 单元测试
 *
 * 覆盖：getRandomDelay, getExponentialBackoffDelay
 */
const assert = require('assert');
const { getRandomDelay, getExponentialBackoffDelay } = require("../../dist/core/constants");

describe('Constants', function () {

  describe('getRandomDelay', function () {
    it('返回指定范围内的延迟毫秒数', function () {
      for (let i = 0; i < 50; i++) {
        const delay = getRandomDelay(2, 5);
        assert.ok(delay >= 2000 && delay < 5000,
          `延迟 ${delay}ms 应在 [2000, 5000) 范围内`);
      }
    });

    it('默认使用 5-15 秒范围', function () {
      for (let i = 0; i < 50; i++) {
        const delay = getRandomDelay();
        assert.ok(delay >= 5000 && delay < 15000,
          `延迟 ${delay}ms 应在 [5000, 15000) 范围内`);
      }
    });

    it('min 等于 max 时返回固定值', function () {
      const delay = getRandomDelay(10, 10);
      assert.strictEqual(delay, 10000);
    });

    it('返回整数毫秒值', function () {
      const delay = getRandomDelay(3, 7);
      assert.strictEqual(Number.isInteger(delay), true);
    });
  });

  describe('getExponentialBackoffDelay', function () {
    it('随尝试次数指数增长', function () {
      const base = 1000;
      const d1 = getExponentialBackoffDelay(base, 0); // 1000 + jitter
      const d2 = getExponentialBackoffDelay(base, 1); // 2000 + jitter
      const d3 = getExponentialBackoffDelay(base, 2); // 4000 + jitter
      assert.ok(d2 > d1, `第2次(${d2})应大于第1次(${d1})`);
      assert.ok(d3 > d2, `第3次(${d3})应大于第2次(${d2})`);
    });

    it('不超过最大延迟上限', function () {
      for (let i = 0; i < 20; i++) {
        const delay = getExponentialBackoffDelay(10000, 5, 30000);
        assert.ok(delay <= 30000, `延迟 ${delay} 不应超过 30000`);
      }
    });

    it('attempt=0 时接近基础延迟', function () {
      const delay = getExponentialBackoffDelay(2000, 0, 30000);
      assert.ok(delay >= 2000 && delay < 3500,
        `基础延迟 2000, attempt=0 应在 [2000, 3500) 范围内，实际 ${delay}`);
    });

    it('包含随机抖动', function () {
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        results.add(getExponentialBackoffDelay(1000, 0));
      }
      assert.ok(results.size > 1, '多次调用应产生不同的抖动值');
    });

    it('最大延迟默认为 30000', function () {
      const delay = getExponentialBackoffDelay(20000, 2);
      assert.ok(delay <= 30000);
    });
  });

});
