import async from 'async';
import { FilmData, DetailPageTask, IndexPageTask, Metadata } from '../types/interfaces';
import { Config } from '../types/interfaces';
import logger from './logger';
import RequestHandler from './requestHandler';
import FileHandler from './fileHandler';
import Parser from './parser';


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
            this.imageDownloadQueue = async.queue(async (metadata: Metadata, callback) => {
                const baseUrl = this.config.base || this.config.BASE_URL;
                const parsedUrl = new URL(baseUrl); // 解析 baseUrl 为 URL 对象
                const domainOnly = `${parsedUrl.protocol}//${parsedUrl.hostname}`; // 提取域名部分            


                const imageUrl = `${domainOnly.replace(/\/+$/, '')}/${metadata.img.replace(/^\/+/, '')}`;
                await this.requestHandler.downloadImage(imageUrl, metadata.title + '.jpg');
                callback();
            }, this.config.parallel);
        }
        return this.imageDownloadQueue;
    }

    /**
     * 获取文件写入队列
     * @returns {async.QueueObject<FilmData>} 文件写入队列实例
     */
    public getFileWriteQueue(): async.QueueObject<FilmData> {
        if (!this.fileWriteQueue) {
            this.fileWriteQueue = async.queue(async (filmData: FilmData, callback) => {
                await this.fileHandler.writeFilmDataToFile(filmData);
                callback();
            }, this.config.parallel);
        }
        return this.fileWriteQueue;
    }

    /**
     * 获取详情页处理队列
     * @returns {async.QueueObject<DetailPageTask>} 详情页处理队列实例
     */
    public getDetailPageQueue(): async.QueueObject<DetailPageTask> {
        if (!this.detailPageQueue) {
            this.detailPageQueue = async.queue(async (task: DetailPageTask, callback) => {
                try {
                    this.emit({ type: QueueEventType.DETAIL_PAGE_START, data: { link: task.link } }); // 触发页面请求事件
                    const response = await this.requestHandler.getPage(task.link);
                    if (response?.body) {
                        const metadata = Parser.parseMetadata(response.body);
                        const magnet = await this.requestHandler.fetchMagnet(metadata);
                        const filmData = Parser.parseFilmData(metadata, magnet as string, task.link);
                        this.emit({
                            type: QueueEventType.DETAIL_PAGE_PROCESSED,
                            data: { filmData, metadata }
                        });
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    callback();
                } catch (error) {
                    console.error(`处理详情页 ${task.link} 时出错:`, error);
                    // 不中断队列处理，继续处理下一个任务
                    callback();
                }
            }, this.config.parallel);
        }
        return this.detailPageQueue;
    }

    /**
     * 获取索引页处理队列
     * @returns {async.QueueObject<IndexPageTask>} 索引页处理队列实例
     */
    public getIndexPageQueue(): async.QueueObject<IndexPageTask> {
        if (!this.indexPageQueue) {
            this.indexPageQueue = async.queue(async (task: IndexPageTask, callback) => {
                // logger.info(`开始抓取 ${task.url} `);
                this.emit({ type: QueueEventType.INDEX_PAGE_START, data: { link: task.url } }); // 触发页面请求事件
                const response = await this.requestHandler.getPage(task.url);
                const links: string[] = response?.body ? Parser.parsePageLinks(response.body) : [];
                // logger.info(`第 ${task.url} 页抓取完成，共找到 ${links.length} 条链接`);
                this.emit({
                    type: QueueEventType.INDEX_PAGE_PROCESSED,
                    data: { links }
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                callback();
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

    private emit(event: QueueEvent): void {
        const handlers = this.eventHandlers.get(event.type);
        handlers?.forEach(handler => handler(event));
    }

}

export default QueueManager;
