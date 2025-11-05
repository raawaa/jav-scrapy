/**
 * 资源监控器
 * 监控Puppeteer池和系统资源使用情况
 */

import logger from './logger';
import { PuppeteerPool } from './puppeteerPool';

export interface ResourceStats {
  timestamp: Date;
  puppeteerPool: {
    total: number;
    available: number;
    inUse: number;
    queueLength: number;
  };
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
    };
  };
}

export class ResourceMonitor {
  private static instance: ResourceMonitor;
  private puppeteerPool: PuppeteerPool;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private statsHistory: ResourceStats[] = [];
  private maxHistorySize = 100; // 保留最近100条记录

  private constructor(puppeteerPool: PuppeteerPool) {
    this.puppeteerPool = puppeteerPool;
  }

  public static getInstance(puppeteerPool: PuppeteerPool): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor(puppeteerPool);
    }
    return ResourceMonitor.instance;
  }

  public startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      logger.warn('ResourceMonitor: 监控已在运行中');
      return;
    }

    logger.info(`ResourceMonitor: 开始资源监控，间隔 ${intervalMs}ms`);
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        const stats = await this.collectStats();
        this.statsHistory.push(stats);

        // 保持历史记录大小
        if (this.statsHistory.length > this.maxHistorySize) {
          this.statsHistory.shift();
        }

        this.logStats(stats);

        // 检查资源告警
        this.checkResourceAlerts(stats);
      } catch (error) {
        logger.error(`ResourceMonitor: 监控失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.warn('ResourceMonitor: 监控未在运行');
      return;
    }

    logger.info('ResourceMonitor: 停止资源监控');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async collectStats(): Promise<ResourceStats> {
    const poolStats = this.puppeteerPool.getStats();

    // 获取系统内存使用情况
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    };

    // CPU使用率（简化版本）
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: new Date(),
      puppeteerPool: poolStats,
      system: {
        memory: systemMemory,
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000 // 转换为秒
        }
      }
    };
  }

  private logStats(stats: ResourceStats): void {
    logger.debug(`ResourceMonitor: Puppeteer池状态 - 总计:${stats.puppeteerPool.total}, 可用:${stats.puppeteerPool.available}, 使用中:${stats.puppeteerPool.inUse}, 队列:${stats.puppeteerPool.queueLength}`);
    logger.debug(`ResourceMonitor: 内存使用 - ${stats.system.memory.percentage.toFixed(1)}% (${(stats.system.memory.used / 1024 / 1024).toFixed(1)}MB/${(stats.system.memory.total / 1024 / 1024).toFixed(1)}MB)`);
  }

  private checkResourceAlerts(stats: ResourceStats): void {
    // 检查内存使用率
    if (stats.system.memory.percentage > 85) {
      logger.warn(`ResourceMonitor: 内存使用率过高 (${stats.system.memory.percentage.toFixed(1)}%)`);
    }

    // 检查Puppeteer池资源
    if (stats.puppeteerPool.total > 0) {
      const utilizationRate = (stats.puppeteerPool.inUse / stats.puppeteerPool.total) * 100;
      if (utilizationRate >= 90) {
        logger.warn(`ResourceMonitor: Puppeteer池使用率过高 (${utilizationRate.toFixed(1)}%)`);
      }
    } else {
      logger.warn('ResourceMonitor: Puppeteer池为空，无法计算使用率');
    }

    if (stats.puppeteerPool.queueLength > 10) {
      logger.warn(`ResourceMonitor: Puppeteer池队列过长 (${stats.puppeteerPool.queueLength} 个请求等待)`);
    }
  }

  public getCurrentStats(): ResourceStats | null {
    if (this.statsHistory.length === 0) {
      return null;
    }
    return this.statsHistory[this.statsHistory.length - 1];
  }

  public getStatsHistory(): ResourceStats[] {
    return [...this.statsHistory];
  }

  public getAverageStats(minutes: number = 5): ResourceStats | null {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const recentStats = this.statsHistory.filter(stat => stat.timestamp >= cutoff);

    if (recentStats.length === 0) {
      return null;
    }

    // 计算平均值
    const avgStats: ResourceStats = {
      timestamp: new Date(),
      puppeteerPool: {
        total: recentStats[0].puppeteerPool.total, // 总数不变
        available: recentStats.reduce((sum, stat) => sum + stat.puppeteerPool.available, 0) / recentStats.length,
        inUse: recentStats.reduce((sum, stat) => sum + stat.puppeteerPool.inUse, 0) / recentStats.length,
        queueLength: recentStats.reduce((sum, stat) => sum + stat.puppeteerPool.queueLength, 0) / recentStats.length
      },
      system: {
        memory: {
          used: recentStats.reduce((sum, stat) => sum + stat.system.memory.used, 0) / recentStats.length,
          total: recentStats[0].system.memory.total, // 总内存不变
          percentage: recentStats.reduce((sum, stat) => sum + stat.system.memory.percentage, 0) / recentStats.length
        },
        cpu: {
          usage: recentStats.reduce((sum, stat) => sum + stat.system.cpu.usage, 0) / recentStats.length
        }
      }
    };

    return avgStats;
  }

  public isHealthy(): boolean {
    const current = this.getCurrentStats();
    if (!current) {
      return true;
    }

    // 检查关键指标
    const memoryOk = current.system.memory.percentage < 90;
    const poolOk = current.puppeteerPool.queueLength < 20;
    // 只有当池不为空时才检查使用率
    const utilizationOk = current.puppeteerPool.total === 0 ||
                         current.puppeteerPool.inUse < current.puppeteerPool.total;

    return memoryOk && poolOk && utilizationOk;
  }

  public shutdown(): void {
    this.stopMonitoring();
    this.statsHistory = [];
    ResourceMonitor.instance = null as any;
  }
}

export default ResourceMonitor;