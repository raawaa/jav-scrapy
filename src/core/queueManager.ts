import async from 'async';
import { FilmData, DetailPageTask, IndexPageTask } from '../types/interfaces';
import { Config } from '../types/interfaces';
import logger from '../logger';
import RequestHandler from './requestHandler';
import FileHandler from './fileHandler';
import Parser from './parser';


export interface QueueTask {
  execute(): Promise<void>;
}

export interface QueueHandler {
  handle(task: any): Promise<void>;
}

export class QueueManager {
  private config: Config;
  private requestHandler: RequestHandler;
  private fileHandler: FileHandler;
  private fileWriteQueue: async.QueueObject<FilmData> | null = null;
  private detailPageQueue: async.QueueObject<DetailPageTask> | null = null;
  private indexPageQueue: async.QueueObject<IndexPageTask> | null = null;

  constructor(config: Config) {
    this.config = config;
    this.requestHandler = new RequestHandler(config);
    this.fileHandler = new FileHandler(config.output);
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
        this.getFileWriteQueue().push(filmData); // 确保 fileWriteQueue 不为 null 后再调用 push 方法
        await new Promise(resolve => setTimeout(resolve, 1000));
        callback();
      }, this.config.parallel);
    }
    return this.detailPageQueue;
  }

  public getIndexPageQueue(getPageUrl: (pageIndex: number) => string) {
    if (!this.indexPageQueue) {
      this.indexPageQueue = async.queue(async (task: IndexPageTask, callback) => {
        logger.info(`开始抓取第 ${task.pageIndex} 页`);
        const response = await this.requestHandler.getPage(getPageUrl(task.pageIndex));
        const links: string[] = Parser.parsePageLinks(response.body);
        logger.info(`第 ${task.pageIndex} 页抓取完成，共找到 ${links.length} 条链接`);
        this.getDetailPageQueue().push(links.map(link => ({ link })));
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
}

export default QueueManager;