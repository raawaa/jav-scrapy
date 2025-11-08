"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueEventType = void 0;
const async_1 = __importDefault(require("async"));
const logger_1 = __importDefault(require("./logger"));
const requestHandler_1 = __importDefault(require("./requestHandler"));
const fileHandler_1 = __importDefault(require("./fileHandler"));
const parser_1 = __importDefault(require("./parser"));
const errorHandler_1 = require("../utils/errorHandler");
const delayManager_1 = require("../utils/delayManager");
const puppeteerPool_1 = require("./puppeteerPool");
const resourceMonitor_1 = require("./resourceMonitor");
var QueueEventType;
(function (QueueEventType) {
    QueueEventType["INDEX_PAGE_START"] = "index_page_start";
    QueueEventType["INDEX_PAGE_PROCESSED"] = "index_page_processed";
    QueueEventType["DETAIL_PAGE_START"] = "detail_page_start";
    QueueEventType["DETAIL_PAGE_PROCESSED"] = "detail_page_processed";
    QueueEventType["FILM_DATA_SAVED"] = "film_data_saved";
})(QueueEventType || (exports.QueueEventType = QueueEventType = {}));
/**
 * 队列管理器，负责创建和管理不同类型的异步任务队列
 * @class
 */
class QueueManager {
    /**
    * 创建队列管理器实例
    * @constructor
    * @param {Config} config - 配置对象
    */
    constructor(config) {
        this.resourceMonitor = null;
        // 队列相关
        this.fileWriteQueue = null;
        this.detailPageQueue = null;
        this.indexPageQueue = null;
        this.imageDownloadQueue = null;
        // 事件相关
        this.eventHandlers = new Map();
        // 监控相关
        this.queueStatsInterval = null;
        this.lastTaskStartTimes = new Map();
        this.isShuttingDown = false;
        this.config = config;
        // 初始化Puppeteer池（如果需要Cloudflare绕过）
        if (config.useCloudflareBypass) {
            this.puppeteerPool = puppeteerPool_1.PuppeteerPool.getInstance({
                maxSize: Math.max(2, Math.floor(config.parallel / 1.5)), // 根据并发数动态调整
                maxIdleTime: 5 * 60 * 1000, // 5分钟
                healthCheckInterval: 30 * 1000, // 30秒
                requestTimeout: 60000, // 1分钟
                retryAttempts: 3
            });
            // 启动资源监控
            this.resourceMonitor = resourceMonitor_1.ResourceMonitor.getInstance(this.puppeteerPool);
            this.resourceMonitor.startMonitoring(30000); // 30秒监控间隔
            logger_1.default.info('QueueManager: 已启用Puppeteer池和资源监控');
        }
        else {
            // 仍然创建池实例以保持兼容性，但不启用监控
            this.puppeteerPool = puppeteerPool_1.PuppeteerPool.getInstance({
                maxSize: 1,
                maxIdleTime: 10 * 60 * 1000,
                healthCheckInterval: 60 * 1000,
                requestTimeout: 60000,
                retryAttempts: 3
            });
        }
        this.requestHandler = new requestHandler_1.default(config);
        this.fileHandler = new fileHandler_1.default(config.output);
        // 启动队列状态监控
        this.startQueueMonitoring();
        logger_1.default.debug('QueueManager: 队列管理器初始化完成，已启动状态监控');
    }
    // 队列获取方法
    /**
     * 获取图片下载队列
     * @returns {async.QueueObject<Metadata>} 图片下载队列实例
     */
    getImageDownloadQueue() {
        if (!this.imageDownloadQueue) {
            logger_1.default.debug('QueueManager: 创建图片下载队列');
            // 图片下载队列使用较低的并发数，避免被检测
            const imageConcurrency = Math.max(1, Math.floor(this.config.parallel / 2));
            logger_1.default.debug(`QueueManager: 图片下载队列并发数: ${imageConcurrency}`);
            this.imageDownloadQueue = async_1.default.queue(async (metadata) => {
                const taskKey = `image-${metadata.title}`;
                const startTime = Date.now();
                this.lastTaskStartTimes.set(taskKey, startTime);
                logger_1.default.debug(`QueueManager: [图片下载] 开始任务: ${metadata.title}`);
                try {
                    const baseUrl = this.config.base || this.config.BASE_URL;
                    const parsedUrl = new URL(baseUrl); // 解析 baseUrl 为 URL 对象
                    const domainOnly = `${parsedUrl.protocol}//${parsedUrl.hostname}`; // 提取域名部分
                    // 确保图片路径正确处理
                    let imagePath = metadata.img;
                    if (imagePath.startsWith('/')) {
                        imagePath = imagePath.substring(1);
                    }
                    const imageUrl = `${domainOnly.replace(/\/+$/, '')}/${imagePath}`;
                    logger_1.default.debug(`QueueManager: [图片下载] 构建图片URL: ${imageUrl}`);
                    logger_1.default.debug(`QueueManager: [图片下载] 使用Referer: ${baseUrl}`);
                    // 传递正确的Referer信息给downloadImage方法
                    await this.requestHandler.downloadImage(imageUrl, metadata.title + '.jpg', baseUrl);
                    const downloadTime = Date.now() - startTime;
                    logger_1.default.info(`QueueManager: [图片下载] 完成下载: ${metadata.title} (耗时: ${Math.round(downloadTime / 1000)}s)`);
                    // 延迟由外部管理器处理，任务完成后立即释放
                    logger_1.default.debug(`QueueManager: [图片下载] 任务完成: ${metadata.title}`);
                }
                catch (error) {
                    const failedTime = Date.now() - startTime;
                    logger_1.default.error(`QueueManager: [图片下载] 任务失败: ${metadata.title} (耗时: ${Math.round(failedTime / 1000)}s), 错误: ${error instanceof Error ? error.message : String(error)}`);
                    throw error;
                }
                finally {
                    this.lastTaskStartTimes.delete(taskKey);
                }
            }, imageConcurrency);
            // 添加队列事件监听
            this.imageDownloadQueue.error((error, task) => {
                logger_1.default.error(`QueueManager: [图片下载] 队列错误，任务: ${task.title}，错误: ${error instanceof Error ? error.message : String(error)}`);
            });
            logger_1.default.debug('QueueManager: 图片下载队列创建完成');
        }
        return this.imageDownloadQueue;
    }
    /**
     * 获取文件写入队列
     * @returns {async.QueueObject<FilmData>} 文件写入队列实例
     */
    getFileWriteQueue() {
        if (!this.fileWriteQueue) {
            logger_1.default.debug('QueueManager: 创建文件写入队列');
            // 文件写入队列可以使用较高并发数（主要是本地IO操作）
            const fileWriteConcurrency = Math.max(2, this.config.parallel * 2);
            logger_1.default.debug(`QueueManager: 文件写入队列并发数: ${fileWriteConcurrency}`);
            this.fileWriteQueue = async_1.default.queue(async (filmData) => {
                const taskKey = `file-${filmData.title}`;
                const startTime = Date.now();
                this.lastTaskStartTimes.set(taskKey, startTime);
                logger_1.default.debug(`QueueManager: [文件写入] 开始任务: ${filmData.title}`);
                try {
                    await this.fileHandler.writeFilmDataToFile(filmData);
                    const writeTime = Date.now() - startTime;
                    logger_1.default.info(`QueueManager: [文件写入] 完成写入: ${filmData.title} (耗时: ${Math.round(writeTime / 1000)}s)`);
                }
                catch (error) {
                    const failedTime = Date.now() - startTime;
                    logger_1.default.error(`QueueManager: [文件写入] 任务失败: ${filmData.title} (耗时: ${Math.round(failedTime / 1000)}s), 错误: ${error instanceof Error ? error.message : String(error)}`);
                    throw error;
                }
                finally {
                    this.lastTaskStartTimes.delete(taskKey);
                }
            }, fileWriteConcurrency);
            // 添加队列事件监听
            this.fileWriteQueue.error((error, task) => {
                logger_1.default.error(`QueueManager: [文件写入] 队列错误，任务: ${task.title}，错误: ${error instanceof Error ? error.message : String(error)}`);
            });
            logger_1.default.debug('QueueManager: 文件写入队列创建完成');
        }
        return this.fileWriteQueue;
    }
    /**
     * 获取详情页处理队列
     * @returns {async.QueueObject<DetailPageTask>} 详情页处理队列实例
     */
    getDetailPageQueue() {
        if (!this.detailPageQueue) {
            logger_1.default.debug('QueueManager: 创建详情页处理队列');
            // 根据资源状态动态调整并发数
            let detailPageConcurrency = Math.max(1, Math.floor(this.config.parallel * 0.75));
            if (this.config.useCloudflareBypass && this.resourceMonitor) {
                const poolStats = this.puppeteerPool.getStats();
                // 如果Puppeteer池使用率过高，进一步降低并发
                if (poolStats.inUse >= poolStats.total * 0.8) {
                    detailPageConcurrency = Math.max(1, Math.floor(detailPageConcurrency * 0.6));
                    logger_1.default.debug(`QueueManager: Puppeteer池使用率高，降低详情页队列并发数至 ${detailPageConcurrency}`);
                }
            }
            logger_1.default.debug(`QueueManager: 详情页队列并发数: ${detailPageConcurrency}`);
            this.detailPageQueue = async_1.default.queue(async (task) => {
                const taskKey = `detail-${task.link}`;
                const startTime = Date.now();
                this.lastTaskStartTimes.set(taskKey, startTime);
                logger_1.default.debug(`QueueManager: [详情页] 开始处理: ${task.link}`);
                try {
                    this.emit({ type: QueueEventType.DETAIL_PAGE_START, data: { link: task.link } });
                    logger_1.default.debug(`QueueManager: [详情页] 触发页面请求事件: ${task.link}`);
                    logger_1.default.debug(`QueueManager: [详情页] 开始请求页面内容: ${task.link}`);
                    const response = await this.requestHandler.getPage(task.link);
                    const requestTime = Date.now() - startTime;
                    logger_1.default.debug(`QueueManager: [详情页] 页面请求完成: ${task.link} (耗时: ${Math.round(requestTime / 1000)}s)`);
                    if (response?.body) {
                        logger_1.default.debug(`QueueManager: [详情页] 成功获取页面内容，长度: ${response.body.length}`);
                        logger_1.default.debug(`QueueManager: [详情页] 开始解析元数据: ${task.link}`);
                        const metadata = parser_1.default.parseMetadata(response.body);
                        const parseTime = Date.now() - startTime;
                        logger_1.default.debug(`QueueManager: [详情页] 元数据解析完成: ${metadata.title} (总耗时: ${Math.round(parseTime / 1000)}s)`);
                        logger_1.default.debug(`QueueManager: [详情页] 开始获取磁力链接: ${metadata.title}`);
                        const magnetFetchStart = Date.now();
                        const magnetResult = await this.requestHandler.fetchMagnet(metadata);
                        const magnetFetchTime = Date.now() - magnetFetchStart;
                        if (magnetResult) {
                            logger_1.default.info(`QueueManager: [详情页] 磁力链接获取成功: ${metadata.title} (耗时: ${Math.round(magnetFetchTime / 1000)}s)`);
                        }
                        else {
                            logger_1.default.warn(`QueueManager: [详情页] 磁力链接获取失败: ${metadata.title}`);
                        }
                        logger_1.default.debug(`QueueManager: [详情页] 开始解析影片数据: ${metadata.title}`);
                        const filmData = parser_1.default.parseFilmData(metadata, task.link);
                        // 添加结构化的磁力链接数据
                        if (magnetResult?.magnetLinks) {
                            filmData.magnetLinks = magnetResult.magnetLinks;
                        }
                        logger_1.default.debug(`QueueManager: [详情页] 影片数据解析完成: ${metadata.title}`);
                        this.emit({
                            type: QueueEventType.DETAIL_PAGE_PROCESSED,
                            data: { filmData, metadata }
                        });
                        logger_1.default.debug(`QueueManager: [详情页] 任务处理完成: ${task.link}`);
                    }
                    else {
                        logger_1.default.warn(`QueueManager: [详情页] 页面响应为空: ${task.link}`);
                    }
                    // 延迟由外部管理器处理，任务完成后立即释放
                    logger_1.default.debug(`QueueManager: [详情页] 任务完成: ${task.link}`);
                }
                catch (error) {
                    const failedTime = Date.now() - startTime;
                    logger_1.default.error(`QueueManager: [详情页] 任务失败: ${task.link} (耗时: ${Math.round(failedTime / 1000)}s), 错误: ${error instanceof Error ? error.message : String(error)}`);
                    errorHandler_1.ErrorHandler.handleGenericError(error, `处理详情页 ${task.link}`);
                    // 不中断队列处理，继续处理下一个任务
                }
                finally {
                    this.lastTaskStartTimes.delete(taskKey);
                }
            }, detailPageConcurrency);
            // 添加队列事件监听
            this.detailPageQueue.error((error, task) => {
                logger_1.default.error(`QueueManager: [详情页] 队列错误，任务: ${task.link}，错误: ${error instanceof Error ? error.message : String(error)}`);
            });
            logger_1.default.debug('QueueManager: 详情页处理队列创建完成');
        }
        return this.detailPageQueue;
    }
    /**
     * 获取索引页处理队列
     * @returns {async.QueueObject<IndexPageTask>} 索引页处理队列实例
     */
    getIndexPageQueue() {
        if (!this.indexPageQueue) {
            logger_1.default.debug('QueueManager: 创建索引页队列');
            // 根据资源状态动态调整并发数
            let concurrency = this.config.parallel;
            if (this.config.useCloudflareBypass && this.resourceMonitor) {
                const poolStats = this.puppeteerPool.getStats();
                // 如果Puppeteer池使用率过高，降低并发
                if (poolStats.inUse >= poolStats.total * 0.8) {
                    concurrency = Math.max(1, Math.floor(concurrency * 0.7));
                    logger_1.default.debug(`QueueManager: Puppeteer池使用率高，降低索引页队列并发数至 ${concurrency}`);
                }
            }
            logger_1.default.debug(`QueueManager: 索引页队列并发数: ${concurrency}`);
            this.indexPageQueue = async_1.default.queue(async (task) => {
                const taskKey = `index-${task.url}`;
                const startTime = Date.now();
                this.lastTaskStartTimes.set(taskKey, startTime);
                logger_1.default.debug(`QueueManager: [索引页] 开始处理: ${task.url}`);
                logger_1.default.debug(`QueueManager: [索引页] 队列当前状态 - 等待: ${this.indexPageQueue?.length()}, 运行: ${this.indexPageQueue?.running()}`);
                try {
                    this.emit({ type: QueueEventType.INDEX_PAGE_START, data: { link: task.url } });
                    logger_1.default.debug(`QueueManager: [索引页] 触发页面请求事件: ${task.url}`);
                    const response = await this.requestHandler.getPage(task.url);
                    const requestTime = Date.now() - startTime;
                    logger_1.default.debug(`QueueManager: [索引页] 页面请求完成: ${task.url} (耗时: ${Math.round(requestTime / 1000)}s)`);
                    if (!response || !response.body) {
                        logger_1.default.warn(`QueueManager: [索引页] 页面响应为空: ${task.url}`);
                        this.emit({
                            type: QueueEventType.INDEX_PAGE_PROCESSED,
                            data: { links: [] }
                        });
                        return;
                    }
                    logger_1.default.debug(`QueueManager: [索引页] 开始解析页面链接: ${task.url}`);
                    const links = parser_1.default.parsePageLinks(response.body);
                    const parseTime = Date.now() - startTime;
                    logger_1.default.debug(`QueueManager: [索引页] 页面解析完成: ${task.url}，找到 ${links.length} 条链接 (总耗时: ${Math.round(parseTime / 1000)}s)`);
                    if (links.length === 0) {
                        logger_1.default.warn(`QueueManager: [索引页] 未解析到影片链接: ${task.url}`);
                        logger_1.default.debug(`QueueManager: [索引页] 页面内容片段 (前1000字符): ${response.body.substring(0, 1000)}`);
                    }
                    this.emit({
                        type: QueueEventType.INDEX_PAGE_PROCESSED,
                        data: { links }
                    });
                    // 延迟由外部管理器处理，任务完成后立即释放
                    logger_1.default.debug(`QueueManager: [索引页] 任务完成: ${task.url}`);
                }
                catch (error) {
                    const failedTime = Date.now() - startTime;
                    logger_1.default.error(`QueueManager: [索引页] 任务失败: ${task.url} (耗时: ${Math.round(failedTime / 1000)}s), 错误: ${error instanceof Error ? error.message : String(error)}`);
                    throw error;
                }
                finally {
                    this.lastTaskStartTimes.delete(taskKey);
                }
            }, concurrency);
            // 添加队列事件监听
            this.indexPageQueue.error((error, task) => {
                logger_1.default.error(`QueueManager: [索引页] 队列错误，任务: ${task.url}，错误: ${error instanceof Error ? error.message : String(error)}`);
            });
            logger_1.default.debug('QueueManager: 索引页队列创建完成');
        }
        return this.indexPageQueue;
    }
    /**
     * 创建一个错误处理函数，用于处理队列任务执行过程中发生的错误。
     * @static
     * @param {string} queueName - 队列的名称，用于在日志中标识出错的队列。
     * @returns {(err: Error, task: any) => void} 一个错误处理函数，接收错误对象和任务对象作为参数。
     */
    static createErrorHandler(queueName) {
        return (err, task) => {
            logger_1.default.error(`[${queueName}] 处理任务时出错: ${err.message}`);
            // logger.debug(`错误详情: ${err.stack}`);
        };
    }
    /**
     * 注册事件监听器
     * @param {QueueEventType} eventType - 事件类型
     * @param {EventHandler} handler - 事件处理函数
     * @returns {void}
     */
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType)?.push(handler);
    }
    /**
     * 获取队列状态统计信息
     * @returns {Object} 包含各队列统计信息的对象
     */
    getQueueStats() {
        return {
            indexPageQueue: {
                waiting: this.indexPageQueue?.length() || 0,
                running: this.indexPageQueue?.running() || 0
            },
            detailPageQueue: {
                waiting: this.detailPageQueue?.length() || 0,
                running: this.detailPageQueue?.running() || 0
            },
            fileWriteQueue: {
                waiting: this.fileWriteQueue?.length() || 0,
                running: this.fileWriteQueue?.running() || 0
            },
            imageDownloadQueue: {
                waiting: this.imageDownloadQueue?.length() || 0,
                running: this.imageDownloadQueue?.running() || 0
            }
        };
    }
    /**
     * 检查是否所有队列都已完成
     * @returns {boolean} 如果所有队列都已完成返回 true
     */
    areAllQueuesFinished() {
        const stats = this.getQueueStats();
        return (stats.indexPageQueue.waiting === 0 && stats.indexPageQueue.running === 0 &&
            stats.detailPageQueue.waiting === 0 && stats.detailPageQueue.running === 0 &&
            stats.fileWriteQueue.waiting === 0 && stats.fileWriteQueue.running === 0 &&
            stats.imageDownloadQueue.waiting === 0 && stats.imageDownloadQueue.running === 0);
    }
    emit(event) {
        const handlers = this.eventHandlers.get(event.type);
        handlers?.forEach(handler => handler(event));
    }
    /**
     * 启动队列状态监控
     * @private
     */
    startQueueMonitoring() {
        this.queueStatsInterval = setInterval(() => {
            if (this.isShuttingDown)
                return;
            const stats = this.getQueueStats();
            const runningTasks = this.lastTaskStartTimes.size;
            const currentTime = Date.now();
            // 检查长时间运行的任务
            const longRunningTasks = [];
            for (const [taskKey, startTime] of this.lastTaskStartTimes.entries()) {
                const runTime = currentTime - startTime;
                if (runTime > 60000) { // 超过1分钟的任务
                    longRunningTasks.push(`${taskKey} (${Math.round(runTime / 1000)}s)`);
                }
            }
            // 每30秒输出一次状态报告
            if (runningTasks > 0 || longRunningTasks.length > 0) {
                logger_1.default.info(`QueueManager: [心跳] 队列状态 - 索引(等待:${stats.indexPageQueue.waiting}, 运行:${stats.indexPageQueue.running}) ` +
                    `详情(等待:${stats.detailPageQueue.waiting}, 运行:${stats.detailPageQueue.running}) ` +
                    `文件(等待:${stats.fileWriteQueue.waiting}, 运行:${stats.fileWriteQueue.running}) ` +
                    `图片(等待:${stats.imageDownloadQueue.waiting}, 运行:${stats.imageDownloadQueue.running}) ` +
                    `活跃任务:${runningTasks}`);
                if (longRunningTasks.length > 0) {
                    logger_1.default.warn(`QueueManager: [警告] 长时间运行的任务: ${longRunningTasks.join(', ')}`);
                }
            }
        }, 30000); // 每30秒检查一次
    }
    /**
     * 停止队列监控并清理资源
     */
    shutdown() {
        logger_1.default.info('QueueManager: 开始关闭队列管理器...');
        this.isShuttingDown = true;
        // 关闭延迟管理器
        logger_1.default.debug('QueueManager: 正在关闭延迟管理器...');
        this.interruptAllDelays();
        if (this.queueStatsInterval) {
            clearInterval(this.queueStatsInterval);
            this.queueStatsInterval = null;
        }
        // 清理所有队列
        const queues = [
            { queue: this.indexPageQueue, name: '索引页队列' },
            { queue: this.detailPageQueue, name: '详情页队列' },
            { queue: this.fileWriteQueue, name: '文件写入队列' },
            { queue: this.imageDownloadQueue, name: '图片下载队列' }
        ];
        for (const { queue, name } of queues) {
            if (queue) {
                queue.empty();
                queue.kill();
                logger_1.default.debug(`QueueManager: 已清理${name}`);
            }
        }
        // 检查未完成的任务
        if (this.lastTaskStartTimes.size > 0) {
            logger_1.default.warn(`QueueManager: 关闭时仍有 ${this.lastTaskStartTimes.size} 个任务在运行`);
            for (const [taskKey, startTime] of this.lastTaskStartTimes.entries()) {
                const runTime = Date.now() - startTime;
                logger_1.default.warn(`QueueManager: 未完成任务: ${taskKey} (运行时间: ${Math.round(runTime / 1000)}s)`);
            }
        }
        logger_1.default.info('QueueManager: 队列管理器关闭完成');
    }
    /**
     * 创建延迟任务
     */
    async createDelay(type, id) {
        return delayManager_1.delayManager.createDelay(type, id);
    }
    /**
     * 获取延迟统计信息
     */
    getDelayStats() {
        return delayManager_1.delayManager.getDelayStats();
    }
    /**
     * 检查是否有活跃的延迟
     */
    hasActiveDelays() {
        return delayManager_1.delayManager.hasActiveDelays();
    }
    /**
     * 等待所有延迟完成
     */
    async waitForDelays() {
        await delayManager_1.delayManager.waitForAllDelays();
    }
    /**
     * 中断所有延迟
     */
    interruptAllDelays() {
        return delayManager_1.delayManager.interruptAllDelays();
    }
    /**
     * 改进的队列完成检查 - 区分实际工作和延迟
     */
    areWorkQueuesFinished() {
        const stats = this.getQueueStats();
        return (stats.indexPageQueue.waiting === 0 &&
            stats.indexPageQueue.running === 0 &&
            stats.detailPageQueue.waiting === 0 &&
            stats.detailPageQueue.running === 0 &&
            stats.fileWriteQueue.waiting === 0 &&
            stats.fileWriteQueue.running === 0 &&
            stats.imageDownloadQueue.waiting === 0 &&
            stats.imageDownloadQueue.running === 0);
    }
    /**
     * 获取详细的队列状态信息
     */
    getDetailedQueueStatus() {
        const stats = this.getQueueStats();
        const runningTasks = Array.from(this.lastTaskStartTimes.entries())
            .map(([key, start]) => `${key} (${Math.round((Date.now() - start) / 1000)}s)`);
        return `队列状态详细报告:
索引页队列: 等待${stats.indexPageQueue.waiting}, 运行${stats.indexPageQueue.running}
详情页队列: 等待${stats.detailPageQueue.waiting}, 运行${stats.detailPageQueue.running}
文件写入队列: 等待${stats.fileWriteQueue.waiting}, 运行${stats.fileWriteQueue.running}
图片下载队列: 等待${stats.imageDownloadQueue.waiting}, 运行${stats.imageDownloadQueue.running}
活跃任务: ${runningTasks.length > 0 ? runningTasks.join(', ') : '无'}`;
    }
}
exports.default = QueueManager;
//# sourceMappingURL=queueManager.js.map