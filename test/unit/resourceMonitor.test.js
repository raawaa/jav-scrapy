/**
 * ResourceMonitor 单元测试
 *
 * 覆盖：getInstance, getCurrentStats, getStatsHistory,
 *       getAverageStats, isHealthy, shutdown
 */
const assert = require('assert');

// 模拟 PuppeteerPool
const mockPool = {
  getStats: () => ({
    total: 2,
    available: 1,
    inUse: 1,
    queueLength: 0
  })
};

// 高负载模拟
const overloadedPool = {
  getStats: () => ({
    total: 2,
    available: 0,
    inUse: 2,
    queueLength: 15
  })
};

// 空池模拟
const emptyPool = {
  getStats: () => ({
    total: 0,
    available: 0,
    inUse: 0,
    queueLength: 0
  })
};

const { ResourceMonitor } = require('../../dist/core/resourceMonitor');

describe('ResourceMonitor', function () {
  afterEach(function () {
    // 每次测试后重置单例状态
    const monitor = ResourceMonitor.getInstance(mockPool);
    monitor.shutdown();
  });

  // ─── getInstance ────────────────────────────────
  describe('getInstance', function () {
    it('多次调用返回同一实例', function () {
      const a = ResourceMonitor.getInstance(mockPool);
      const b = ResourceMonitor.getInstance(mockPool);
      assert.strictEqual(a, b);
    });
  });

  // ─── getCurrentStats ────────────────────────────────
  describe('getCurrentStats', function () {
    it('无历史记录返回 null', function () {
      const monitor = ResourceMonitor.getInstance(mockPool);
      assert.strictEqual(monitor.getCurrentStats(), null);
    });
  });

  // ─── getStatsHistory ────────────────────────────────
  describe('getStatsHistory', function () {
    it('返回历史记录的副本', function () {
      const monitor = ResourceMonitor.getInstance(mockPool);
      const history = monitor.getStatsHistory();
      assert.ok(Array.isArray(history));
      assert.strictEqual(history.length, 0);
    });
  });

  // ─── getAverageStats ────────────────────────────────
  describe('getAverageStats', function () {
    it('无历史记录返回 null', function () {
      const monitor = ResourceMonitor.getInstance(mockPool);
      assert.strictEqual(monitor.getAverageStats(), null);
    });
  });

  // ─── isHealthy ────────────────────────────────
  describe('isHealthy', function () {
    it('无历史记录时默认为健康', function () {
      const monitor = ResourceMonitor.getInstance(mockPool);
      assert.strictEqual(monitor.isHealthy(), true);
    });
  });

  // ─── startMonitoring / stopMonitoring ────────────
  describe('startMonitoring / stopMonitoring', function () {
    it('启动和停止不抛异常', function () {
      const monitor = ResourceMonitor.getInstance(mockPool);
      assert.doesNotThrow(() => monitor.startMonitoring(5000));
      assert.doesNotThrow(() => monitor.stopMonitoring());
    });

    it('重复停止不抛异常', function () {
      const monitor = ResourceMonitor.getInstance(mockPool);
      assert.doesNotThrow(() => monitor.stopMonitoring());
      assert.doesNotThrow(() => monitor.stopMonitoring());
    });
  });

  // ─── shutdown ────────────────────────────────
  describe('shutdown', function () {
    it('shutdown 后 getInstance 创建新实例', function () {
      const monitor = ResourceMonitor.getInstance(mockPool);
      monitor.shutdown();
      const newMonitor = ResourceMonitor.getInstance(mockPool);
      // shutdown 重置了 instance，应返回新实例
      assert.notStrictEqual(monitor, newMonitor);
    });
  });
});
