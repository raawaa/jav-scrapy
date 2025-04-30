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
    INDEX_PAGE_PROCESSED = 'index_page_processed',
    DETAIL_PAGE_PROCESSED = 'detail_page_processed',
    FILM_DATA_SAVED = 'film_data_saved'
}

export interface QueueEvent {
    type: QueueEventType;
    data?: any;
}

export type EventHandler = (event: QueueEvent) => void;

export class QueueManager {
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
    constructor(config: Config) {
        this.config = config;
        this.requestHandler = new RequestHandler(config);
        this.fileHandler = new FileHandler(config.output);
    }
    // 队列获取方法
    public getImageDownloadQueue() {
        if (!this.imageDownloadQueue) {
            this.imageDownloadQueue = async.queue(async (metadata: Metadata, callback) => {
                const baseUrl = this.config.base || this.config.BASE_URL;
                const imageUrl = `${baseUrl.replace(/\/+$/, '')}/${metadata.img.replace(/^\/+/, '')}`;
                await this.requestHandler.downloadImage(imageUrl, metadata.title + '.jpg');
                callback();
            }, this.config.parallel);
        }
        return this.imageDownloadQueue;
    }

    public getFileWriteQueue() {
        if (!this.fileWriteQueue) {
            this.fileWriteQueue = async.queue(async (filmData: FilmData, callback) => {
                await this.fileHandler.writeFilmDataToFile(filmData);
                callback();
            }, this.config.parallel);
        }
        return this.fileWriteQueue;
    }

    public getDetailPageQueue() {
        if (!this.detailPageQueue) {
            this.detailPageQueue = async.queue(async (task: DetailPageTask, callback) => {
                logger.info(`开始处理详情页 ${task.link}`);
                const response = await this.requestHandler.getPage(task.link);
                const metadata = Parser.parseMetadata(response.body);
                const magnet = await this.requestHandler.fetchMagnet(metadata);
                const filmData = Parser.parseFilmData(metadata, magnet as string, task.link);
                this.emit({
                    type: QueueEventType.DETAIL_PAGE_PROCESSED,
                    data: { filmData, metadata }
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                callback();
            }, this.config.parallel);
        }
        return this.detailPageQueue;
    }

    public getIndexPageQueue() {
        if (!this.indexPageQueue) {
            this.indexPageQueue = async.queue(async (task: IndexPageTask, callback) => {
                logger.info(`开始抓取 ${task.url} `);
                const response = await this.requestHandler.getPage(task.url);
                const links: string[] = Parser.parsePageLinks(response.body);
                logger.info(`第 ${task.url} 页抓取完成，共找到 ${links.length} 条链接`);
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

    public static createErrorHandler(queueName: string) {
        return (err: Error, task: any) => {
            logger.error(`[${queueName}] 处理任务时出错: ${err.message}`);
            logger.debug(`错误详情: ${err.stack}`);
        };
    }

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

