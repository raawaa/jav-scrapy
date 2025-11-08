"use strict";
/**
 * @file delayManager.ts
 * @description 延迟管理器，用于管理请求间的延迟，避免被网站封禁
 * @module delayManager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.delayManager = exports.DelayType = void 0;
var DelayType;
(function (DelayType) {
    DelayType["INDEX_PAGE"] = "index_page";
    DelayType["DETAIL_PAGE"] = "detail_page";
    DelayType["IMAGE_DOWNLOAD"] = "image_download";
    DelayType["ERROR_RETRY"] = "error_retry";
})(DelayType || (exports.DelayType = DelayType = {}));
/**
 * 延迟管理器类
 * 负责管理所有请求间延迟，提供可中断的延迟机制
 */
class DelayManager {
    constructor() {
        this.activeDelays = new Map();
        this.delaySettings = new Map();
        this.isShutdown = false;
        // 初始化默认延迟设置
        this.delaySettings.set(DelayType.INDEX_PAGE, { min: 1000, max: 3000 });
        this.delaySettings.set(DelayType.DETAIL_PAGE, { min: 3000, max: 6000 });
        this.delaySettings.set(DelayType.IMAGE_DOWNLOAD, { min: 2000, max: 5000 });
        this.delaySettings.set(DelayType.ERROR_RETRY, { min: 5000, max: 10000 });
    }
    /**
     * 设置特定类型的延迟范围
     */
    setDelayRange(type, minMs, maxMs) {
        this.delaySettings.set(type, { min: minMs, max: maxMs });
    }
    /**
     * 获取特定类型的延迟范围
     */
    getDelayRange(type) {
        return this.delaySettings.get(type) || { min: 1000, max: 3000 };
    }
    /**
     * 创建一个可中断的延迟
     */
    async createDelay(type, id) {
        if (this.isShutdown) {
            return;
        }
        const delayId = id || this.generateId();
        const range = this.delaySettings.get(type);
        if (!range) {
            throw new Error(`未找到延迟类型 ${type} 的设置`);
        }
        const duration = this.randomBetween(range.min, range.max);
        return new Promise((resolve) => {
            const task = {
                id: delayId,
                type,
                startTime: Date.now(),
                duration,
                resolve,
                isInterrupted: false
            };
            this.activeDelays.set(delayId, task);
            const checkDelay = () => {
                const currentTask = this.activeDelays.get(delayId);
                if (!currentTask || currentTask.isInterrupted) {
                    this.activeDelays.delete(delayId);
                    return;
                }
                const elapsed = Date.now() - currentTask.startTime;
                if (elapsed >= duration) {
                    this.activeDelays.delete(delayId);
                    resolve();
                }
                else {
                    setTimeout(checkDelay, 100); // 每100ms检查一次
                }
            };
            setTimeout(checkDelay, 100);
        });
    }
    /**
     * 中断特定延迟
     */
    interruptDelay(id) {
        const task = this.activeDelays.get(id);
        if (task && !task.isInterrupted) {
            task.isInterrupted = true;
            task.resolve();
            this.activeDelays.delete(id);
            return true;
        }
        return false;
    }
    /**
     * 中断特定类型的所有延迟
     */
    interruptDelaysByType(type) {
        let interrupted = 0;
        for (const [id, task] of this.activeDelays.entries()) {
            if (task.type === type && !task.isInterrupted) {
                this.interruptDelay(id);
                interrupted++;
            }
        }
        return interrupted;
    }
    /**
     * 中断所有延迟
     */
    interruptAllDelays() {
        let interrupted = 0;
        for (const id of this.activeDelays.keys()) {
            if (this.interruptDelay(id)) {
                interrupted++;
            }
        }
        return interrupted;
    }
    /**
     * 获取活跃延迟统计信息
     */
    getDelayStats() {
        const byType = {
            [DelayType.INDEX_PAGE]: 0,
            [DelayType.DETAIL_PAGE]: 0,
            [DelayType.IMAGE_DOWNLOAD]: 0,
            [DelayType.ERROR_RETRY]: 0
        };
        let totalRemainingTime = 0;
        for (const task of this.activeDelays.values()) {
            if (!task.isInterrupted) {
                byType[task.type]++;
                const remaining = Math.max(0, task.duration - (Date.now() - task.startTime));
                totalRemainingTime += remaining;
            }
        }
        return {
            total: this.activeDelays.size,
            byType,
            averageRemainingTime: this.activeDelays.size > 0 ? totalRemainingTime / this.activeDelays.size : 0
        };
    }
    /**
     * 检查是否还有活跃的延迟
     */
    hasActiveDelays() {
        return this.activeDelays.size > 0;
    }
    /**
     * 等待所有延迟完成
     */
    async waitForAllDelays() {
        while (this.activeDelays.size > 0 && !this.isShutdown) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    /**
     * 关闭延迟管理器
     */
    shutdown() {
        this.isShutdown = true;
        this.interruptAllDelays();
    }
    /**
     * 生成唯一ID
     */
    generateId() {
        return `delay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 在指定范围内生成随机数
     */
    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
// 创建全局延迟管理器实例
exports.delayManager = new DelayManager();
exports.default = DelayManager;
//# sourceMappingURL=delayManager.js.map