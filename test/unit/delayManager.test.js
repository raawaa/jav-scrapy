/**
 * DelayManager 单元测试
 *
 * 覆盖：setDelayRange, getDelayRange, createDelay, interruptDelay,
 *       interruptDelaysByType, interruptAllDelays, getDelayStats,
 *       hasActiveDelays, waitForAllDelays, shutdown
 */
const assert = require('assert');
const { delayManager, DelayType } = require('../../dist/utils/delayManager');

describe('DelayManager', function () {
  // 短延迟用于常规测试
  const SHORT_RANGE = { min: 1, max: 5 };
  // 稍长延迟用于中断测试（确保中断先于超时完成）
  const INTERRUPT_RANGE = { min: 500, max: 1000 };

  beforeEach(function () {
    // 重置 shutdown 状态（TypeScript private 属性，JS 直接访问）
    delayManager['isShutdown'] = false;
    // 设置为短延迟范围
    delayManager.setDelayRange(DelayType.INDEX_PAGE, SHORT_RANGE.min, SHORT_RANGE.max);
    delayManager.setDelayRange(DelayType.DETAIL_PAGE, SHORT_RANGE.min, SHORT_RANGE.max);
    delayManager.setDelayRange(DelayType.IMAGE_DOWNLOAD, SHORT_RANGE.min, SHORT_RANGE.max);
    delayManager.setDelayRange(DelayType.ERROR_RETRY, SHORT_RANGE.min, SHORT_RANGE.max);
  });

  afterEach(function () {
    delayManager.interruptAllDelays();
  });

  // ─── setDelayRange / getDelayRange ────────────────────
  describe('setDelayRange / getDelayRange', function () {
    it('设置并获取延迟范围', function () {
      delayManager.setDelayRange(DelayType.INDEX_PAGE, 100, 500);
      const range = delayManager.getDelayRange(DelayType.INDEX_PAGE);
      assert.strictEqual(range.min, 100);
      assert.strictEqual(range.max, 500);
    });

    it('获取未设置的类型返回默认值', function () {
      // 先设一个已知值，然后检查
      const range = delayManager.getDelayRange(DelayType.ERROR_RETRY);
      assert.ok(range.min >= 0);
      assert.ok(range.max > range.min);
    });
  });

  // ─── createDelay ────────────────────────────────────
  describe('createDelay', function () {
    it('正常等待后解析', async function () {
      const start = Date.now();
      await delayManager.createDelay(DelayType.INDEX_PAGE, 'test-wait');
      const elapsed = Date.now() - start;
      assert.ok(elapsed >= 0, '应等待至少 0ms');
    });

    it('不传 ID 自动生成', async function () {
      await delayManager.createDelay(DelayType.INDEX_PAGE);
      // 没有 ID 也能正常完成
    });
  });

  // ─── interruptDelay ────────────────────────────────────
  describe('interruptDelay', function () {
    it('中断指定 ID 的延迟返回 true', async function () {
      delayManager.setDelayRange(DelayType.IMAGE_DOWNLOAD, INTERRUPT_RANGE.min, INTERRUPT_RANGE.max);
      const delayPromise = delayManager.createDelay(DelayType.IMAGE_DOWNLOAD, 'interrupt-me');
      // 确保延迟已注册
      assert.ok(delayManager.hasActiveDelays(), '延迟应已注册');
      const result = delayManager.interruptDelay('interrupt-me');
      assert.strictEqual(result, true, '中断成功应返回 true');
      await delayPromise; // 应立即解析
    });

    it('中断不存在的 ID 返回 false', function () {
      assert.strictEqual(delayManager.interruptDelay('nonexistent'), false);
    });
  });

  // ─── interruptDelaysByType ────────────────────────────
  describe('interruptDelaysByType', function () {
    it('中断指定类型的所有延迟', async function () {
      delayManager.setDelayRange(DelayType.INDEX_PAGE, INTERRUPT_RANGE.min, INTERRUPT_RANGE.max);
      const p1 = delayManager.createDelay(DelayType.INDEX_PAGE, 'id1');
      const p2 = delayManager.createDelay(DelayType.INDEX_PAGE, 'id2');
      const count = delayManager.interruptDelaysByType(DelayType.INDEX_PAGE);
      assert.strictEqual(count, 2, '应中断 2 个延迟');
      await Promise.all([p1, p2]);
    });

    it('没有活跃延迟时返回 0', function () {
      assert.strictEqual(delayManager.interruptDelaysByType(DelayType.INDEX_PAGE), 0);
    });
  });

  // ─── interruptAllDelays ────────────────────────────
  describe('interruptAllDelays', function () {
    it('中断所有延迟返回计数', async function () {
      delayManager.setDelayRange(DelayType.INDEX_PAGE, INTERRUPT_RANGE.min, INTERRUPT_RANGE.max);
      delayManager.setDelayRange(DelayType.DETAIL_PAGE, INTERRUPT_RANGE.min, INTERRUPT_RANGE.max);
      delayManager.createDelay(DelayType.INDEX_PAGE, 'a');
      delayManager.createDelay(DelayType.DETAIL_PAGE, 'b');
      const count = delayManager.interruptAllDelays();
      assert.strictEqual(count, 2);
    });
  });

  // ─── hasActiveDelays ────────────────────────────
  describe('hasActiveDelays', function () {
    it('有活跃延迟时返回 true', function () {
      delayManager.setDelayRange(DelayType.INDEX_PAGE, INTERRUPT_RANGE.min, INTERRUPT_RANGE.max);
      delayManager.createDelay(DelayType.INDEX_PAGE, 'active-test');
      assert.strictEqual(delayManager.hasActiveDelays(), true);
    });

    it('延迟完成后返回 false', async function () {
      await delayManager.createDelay(DelayType.INDEX_PAGE, 'done-test');
      assert.strictEqual(delayManager.hasActiveDelays(), false);
    });
  });

  // ─── getDelayStats ────────────────────────────
  describe('getDelayStats', function () {
    it('无延迟时统计为零', function () {
      const stats = delayManager.getDelayStats();
      assert.strictEqual(stats.total, 0);
    });

    it('有延迟时按类型分组', function () {
      delayManager.setDelayRange(DelayType.INDEX_PAGE, INTERRUPT_RANGE.min, INTERRUPT_RANGE.max);
      delayManager.setDelayRange(DelayType.DETAIL_PAGE, INTERRUPT_RANGE.min, INTERRUPT_RANGE.max);
      delayManager.createDelay(DelayType.INDEX_PAGE, 's1');
      delayManager.createDelay(DelayType.DETAIL_PAGE, 's2');
      const stats = delayManager.getDelayStats();
      assert.strictEqual(stats.total, 2);
      assert.ok(stats.byType[DelayType.INDEX_PAGE] > 0);
      assert.ok(stats.byType[DelayType.DETAIL_PAGE] > 0);
    });
  });

  // ─── shutdown ────────────────────────────
  describe('shutdown', function () {
    it('关闭后所有延迟被中断', function () {
      delayManager.createDelay(DelayType.INDEX_PAGE, 'shutdown-test');
      delayManager.shutdown();
      assert.strictEqual(delayManager.hasActiveDelays(), false);
    });
  });
});
