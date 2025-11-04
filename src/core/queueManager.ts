import async from 'async';
import { FilmData, DetailPageTask, IndexPageTask, Metadata } from '../types/interfaces';
import { Config } from '../types/interfaces';
import logger from './logger';
import RequestHandler from './requestHandler';
import FileHandler from './fileHandler';
import Parser from './parser';
import { ErrorHandler } from '../utils/errorHandler';
import { getRandomDelay } from './constants';


export interface QueueTask {
    execute(): Promise<void>;
}

export interface QueueHandler {
    handle(task: any): Promise<void>;
}

export enum QueueEventType {
    INDEX_PAGE_START = 'index_page_start',
    INDEX_PAGE_PROCESSED = 'index_page_processed',
    DETAIL_PAGE_START = 'detail_page_start',
    DETAIL_PAGE_PROCESSED = 'detail_page_processed',
    FILM_DATA_SAVED = 'film_data_saved'
}

export interface QueueEvent {
    type: QueueEventType;
    data?: any;
}

export type EventHandler = (event: QueueEvent) => void;

/**
 * 队列管理器，负责创建和管理不同类型的异步任务队列
 * @class
 */
class QueueManager {
    // 配置相关
    private config: Config;
    private requestHandler: RequestHandler;
    private fileHandler: FileHandler;

    // 队列相关
    private fileWriteQueue: async.QueueObject<FilmData> | null = null;
    private detailPageQueue: async.QueueObject<DetailPageTask> | null = null;
    private indexPageQueue: async.QueueObject<IndexPageTask> | null = null;
    private imageDownloadQueue: async.QueueObject<Metadata> | null = null;

    // 事件相关
    private eventHandlers: Map<QueueEventType, EventHandler[]> = new Map();


    /**
    * 创建队列管理器实例
    * @constructor
    * @param {Config} config - 配置对象
    */
    constructor(config: Config) {
        this.config = config;
        this.requestHandler = new RequestHandler(config);
        this.fileHandler = new FileHandler(config.output);
    }

    // 队列获取方法

    /**
     * 获取图片下载队列
     * @returns {async.QueueObject<Metadata>} 图片下载队列实例
     */
    public getImageDownloadQueue(): async.QueueObject<Metadata> {
        if (!this.imageDownloadQueue) {
            // 图片下载队列使用较低的并发数，避免被检测
            const imageConcurrency = Math.max(1, Math.floor(this.config.parallel / 2));
            this.imageDownloadQueue = async.queue(async (metadata: Metadata) => {
                const baseUrl = this.config.base || this.config.BASE_URL;
                const parsedUrl = new URL(baseUrl); // 解析 baseUrl 为 URL 对象
                const domainOnly = `${parsedUrl.protocol}//${parsedUrl.hostname}`; // 提取域名部分

                const imageUrl = `${domainOnly.replace(/\/+$/, '')}/${metadata.img.replace(/^\/+/, '')}`;
                await this.requestHandler.downloadImage(imageUrl, metadata.title + '.jpg');
            }, imageConcurrency);
        }
        return this.imageDownloadQueue;
    }

    /**
     * 获取文件写入队列
     * @returns {async.QueueObject<FilmData>} 文件写入队列实例
     */
    public getFileWriteQueue(): async.QueueObject<FilmData> {
        if (!this.fileWriteQueue) {
            logger.debug('QueueManager: 创建文件写入队列');
            // 文件写入队列可以使用较高并发数（主要是本地IO操作）
            const fileWriteConcurrency = Math.max(2, this.config.parallel * 2);
            this.fileWriteQueue = async.queue(async (filmData: FilmData) => {
                logger.debug(`QueueManager: 开始文件写入任务，标题: ${filmData.title}`);
                try {
                    await this.fileHandler.writeFilmDataToFile(filmData);
                    logger.debug(`QueueManager: 文件写入任务完成，标题: ${filmData.title}`);
                } catch (error) {
                    logger.error(`QueueManager: 文件写入任务失败，标题: ${filmData.title}，错误: ${error instanceof Error ? error.message : String(error)}`);
                    throw error;
                }
            }, fileWriteConcurrency);
            
            // 添加队列事件监听
            this.fileWriteQueue.error((error, task) => {
                logger.error(`QueueManager: 文件写入队列错误，任务: ${task.title}，错误: ${error instanceof Error ? error.message : String(error)}`);
            });
        }
        return this.fileWriteQueue;
    }

    /**
     * 获取详情页处理队列
     * @returns {async.QueueObject<DetailPageTask>} 详情页处理队列实例
     */
    public getDetailPageQueue(): async.QueueObject<DetailPageTask> {
        if (!this.detailPageQueue) {
            logger.debug('QueueManager: 创建详情页处理队列');
            // 详情页队列使用较低的并发数，避免对服务器造成压力
            const detailPageConcurrency = Math.max(1, Math.floor(this.config.parallel * 0.75));
            this.detailPageQueue = async.queue(async (task: DetailPageTask) => {
                logger.debug(`QueueManager: 开始处理详情页任务: ${task.link}`);
                try {
                    this.emit({ type: QueueEventType.DETAIL_PAGE_START, data: { link: task.link } }); // 触发页面请求事件
                    const response = await this.requestHandler.getPage(task.link);
                    if (response?.body) {
                        logger.debug(`QueueManager: 成功获取详情页内容，长度: ${response.body.length}`);
                        const metadata = Parser.parseMetadata(response.body);
                        logger.debug(`QueueManager: 解析到影片元数据，标题: ${metadata.title}`);
                        const magnet = await this.requestHandler.fetchMagnet(metadata);
                        if (magnet) {
                            logger.debug(`QueueManager: 成功获取磁力链接`);
                        } else {
                            logger.warn(`QueueManager: 未能获取磁力链接`);
                        }
                        const filmData = Parser.parseFilmData(metadata, magnet as string, task.link);
                        logger.debug(`QueueManager: 解析影片数据完成`);
                        this.emit({
                            type: QueueEventType.DETAIL_PAGE_PROCESSED,
                            data: { filmData, metadata }
                        });
                    } else {
                        logger.warn(`QueueManager: 详情页响应为空: ${task.link}`);
                    }
                    // 增加详情页处理后的延迟，避免请求过于频繁
                    const randomDelay = getRandomDelay(Math.max(this.config.delay || 2, 3), Math.max((this.config.delay || 2) * 2, 6)); // 使用配置延迟或3-6秒
                    logger.debug(`QueueManager: 详情页任务完成，等待 ${randomDelay}ms`);
                    await new Promise(resolve => setTimeout(resolve, randomDelay));
                } catch (error) {
                    logger.error(`QueueManager: 详情页处理失败: ${task.link}，错误: ${error instanceof Error ? error.message : String(error)}`);
                    ErrorHandler.handleGenericError(error, `处理详情页 ${task.link}`);
                    // 不中断队列处理，继续处理下一个任务
                }
            }, detailPageConcurrency);
            
            // 添加队列事件监听
            this.detailPageQueue.error((error, task) => {
                logger.error(`QueueManager: 详情页队列错误，任务: ${task.link}，错误: ${error instanceof Error ? error.message : String(error)}`);
            });
        }
        return this.detailPageQueue;
    }

    /**
     * 获取索引页处理队列
     * @returns {async.QueueObject<IndexPageTask>} 索引页处理队列实例
     */
    public getIndexPageQueue(): async.QueueObject<IndexPageTask> {
        if (!this.indexPageQueue) {
            this.indexPageQueue = async.queue(async (task: IndexPageTask) => {
                logger.debug(`开始处理索引页任务: ${task.url}`);
                this.emit({ type: QueueEventType.INDEX_PAGE_START, data: { link: task.url } }); // 触发页面请求事件
                const response = await this.requestHandler.getPage(task.url);

                if (!response || !response.body) {
                    logger.warn(`索引页 ${task.url} 返回空内容`);
                    this.emit({
                        type: QueueEventType.INDEX_PAGE_PROCESSED,
                        data: { links: [] }
                    });
                    return;
                }

                const links: string[] = Parser.parsePageLinks(response.body);
                logger.debug(`索引页 ${task.url} 解析完成，共找到 ${links.length} 条链接`);

                if (links.length === 0) {
                    logger.warn(`索引页 ${task.url} 未解析到任何影片链接`);
                    logger.debug(`页面内容片段 (前1000字符): ${response.body.substring(0, 1000)}`);
                }

                this.emit({
                    type: QueueEventType.INDEX_PAGE_PROCESSED,
                    data: { links }
                });
                const randomDelay = getRandomDelay(1, 3); // 1-3秒随机延迟
                await new Promise(resolve => setTimeout(resolve, randomDelay));
            }, this.config.parallel);
        }
        return this.indexPageQueue;
    }


    /**
     * 创建一个错误处理函数，用于处理队列任务执行过程中发生的错误。
     * @static
     * @param {string} queueName - 队列的名称，用于在日志中标识出错的队列。
     * @returns {(err: Error, task: any) => void} 一个错误处理函数，接收错误对象和任务对象作为参数。
     */
    public static createErrorHandler(queueName: string): (err: Error, task: any) => void {
        return (err: Error, task: any) => {
            logger.error(`[${queueName}] 处理任务时出错: ${err.message}`);
            // logger.debug(`错误详情: ${err.stack}`);
        };
    }

    /**
     * 注册事件监听器
     * @param {QueueEventType} eventType - 事件类型
     * @param {EventHandler} handler - 事件处理函数
     * @returns {void}
     */
    public on(eventType: QueueEventType, handler: EventHandler): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType)?.push(handler);
    }

    /**
     * 获取队列状态统计信息
     * @returns {Object} 包含各队列统计信息的对象
     */
    public getQueueStats(): {
        indexPageQueue: { waiting: number; running: number };
        detailPageQueue: { waiting: number; running: number };
        fileWriteQueue: { waiting: number; running: number };
        imageDownloadQueue: { waiting: number; running: number };
    } {
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
    public areAllQueuesFinished(): boolean {
        const stats = this.getQueueStats();
        return (
            stats.indexPageQueue.waiting === 0 && stats.indexPageQueue.running === 0 &&
            stats.detailPageQueue.waiting === 0 && stats.detailPageQueue.running === 0 &&
            stats.fileWriteQueue.waiting === 0 && stats.fileWriteQueue.running === 0 &&
            stats.imageDownloadQueue.waiting === 0 && stats.imageDownloadQueue.running === 0
        );
    }

    private emit(event: QueueEvent): void {
        const handlers = this.eventHandlers.get(event.type);
        handlers?.forEach(handler => handler(event));
    }

}

export default QueueManager;
