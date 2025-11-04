/**
 * @file delayManager.ts
 * @description 延迟管理器，用于管理请求间的延迟，避免被网站封禁
 * @module delayManager
 */

export enum DelayType {
    INDEX_PAGE = 'index_page',
    DETAIL_PAGE = 'detail_page',
    IMAGE_DOWNLOAD = 'image_download',
    ERROR_RETRY = 'error_retry'
}

interface DelayTask {
    id: string;
    type: DelayType;
    startTime: number;
    duration: number;
    resolve: () => void;
    isInterrupted: boolean;
}

/**
 * 延迟管理器类
 * 负责管理所有请求间延迟，提供可中断的延迟机制
 */
class DelayManager {
    private activeDelays: Map<string, DelayTask> = new Map();
    private delaySettings: Map<DelayType, { min: number; max: number }> = new Map();
    private isShutdown: boolean = false;

    constructor() {
        // 初始化默认延迟设置
        this.delaySettings.set(DelayType.INDEX_PAGE, { min: 1000, max: 3000 });
        this.delaySettings.set(DelayType.DETAIL_PAGE, { min: 3000, max: 6000 });
        this.delaySettings.set(DelayType.IMAGE_DOWNLOAD, { min: 2000, max: 5000 });
        this.delaySettings.set(DelayType.ERROR_RETRY, { min: 5000, max: 10000 });
    }

    /**
     * 设置特定类型的延迟范围
     */
    public setDelayRange(type: DelayType, minMs: number, maxMs: number): void {
        this.delaySettings.set(type, { min: minMs, max: maxMs });
    }

    /**
     * 获取特定类型的延迟范围
     */
    public getDelayRange(type: DelayType): { min: number; max: number } {
        return this.delaySettings.get(type) || { min: 1000, max: 3000 };
    }

    /**
     * 创建一个可中断的延迟
     */
    public async createDelay(type: DelayType, id?: string): Promise<void> {
        if (this.isShutdown) {
            return;
        }

        const delayId = id || this.generateId();
        const range = this.delaySettings.get(type);

        if (!range) {
            throw new Error(`未找到延迟类型 ${type} 的设置`);
        }

        const duration = this.randomBetween(range.min, range.max);

        return new Promise<void>((resolve) => {
            const task: DelayTask = {
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
                } else {
                    setTimeout(checkDelay, 100); // 每100ms检查一次
                }
            };

            setTimeout(checkDelay, 100);
        });
    }

    /**
     * 中断特定延迟
     */
    public interruptDelay(id: string): boolean {
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
    public interruptDelaysByType(type: DelayType): number {
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
    public interruptAllDelays(): number {
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
    public getDelayStats(): {
        total: number;
        byType: Record<DelayType, number>;
        averageRemainingTime: number;
    } {
        const byType: Record<DelayType, number> = {
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
    public hasActiveDelays(): boolean {
        return this.activeDelays.size > 0;
    }

    /**
     * 等待所有延迟完成
     */
    public async waitForAllDelays(): Promise<void> {
        while (this.activeDelays.size > 0 && !this.isShutdown) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    /**
     * 关闭延迟管理器
     */
    public shutdown(): void {
        this.isShutdown = true;
        this.interruptAllDelays();
    }

    /**
     * 生成唯一ID
     */
    private generateId(): string {
        return `delay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 在指定范围内生成随机数
     */
    private randomBetween(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

// 创建全局延迟管理器实例
export const delayManager = new DelayManager();

export default DelayManager;