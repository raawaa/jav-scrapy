#!/usr/bin/env node

import logger from './core/logger';
import { program } from 'commander';
import ConfigManager from './core/config';
import { version } from '../package.json';
import QueueManager from './core/queueManager';
import { QueueEventType } from './core/queueManager';
import { Config } from './types/interfaces';


program
    .version(version)
    .usage('[options]')
    .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2')
    .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：30000毫秒')
    .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0')
    .option('-o, --output <file_path>', '设置磁链和封面抓取结果的保存位置，默认为当前工作目录')
    .option('-s, --search <string>', '搜索关键词，可只抓取搜索结果的磁链或封面')
    .option('-b, --base <url>', '自定义抓取的起始页')
    .option('-x, --proxy <url>', '使用代理服务器, 例：-x http://127.0.0.1:8087')
    .option('-n, --nomag', '是否抓取尚无磁链的影片')
    .option('-a, --allmag', '是否抓取影片的所有磁链(默认只抓取文件体积最大的磁链)')
    .option('-N, --nopic', '不抓取图片')
    .parse(process.argv);


const configManager = new ConfigManager();
configManager.updateFromProgram(program);
const PROGRAM_CONFIG = configManager.getConfig();


class JavScraper {
    private config: Config;
    private pageIndex: number;
    private filmCount: number = 0;

    constructor(config: Config) {
        this.config = config;
        this.pageIndex = 1;
    }

    private getCurrentIndexPageUrl(): string {
        function cleanUrl(url: string): string {
            return url.endsWith('/') ? url.slice(0, -1) : url;
        }
        const baseUrl = cleanUrl(this.config.base || this.config.BASE_URL);
        if (this.config.search) {
            const index = this.pageIndex === 1 ? '' : `/${this.pageIndex}`; // 检查是否为第一页，如果是则不添加 page 部分到 URL 中
            return `${baseUrl}${this.config.searchUrl}/${encodeURIComponent(this.config.search)}${index}`;
        } else {
            const index = this.pageIndex === 1 ? '' : `/page/${this.pageIndex}`; // 检查是否为第一页，如果是则不添加 page 部分到 URL 中
            return `${baseUrl}${index}`;
        }
    }

    async mainExecution(): Promise<void> {
        const queueManager = new QueueManager(this.config);
        let shouldStop = false;

        // 注册事件处理器
        queueManager.on(QueueEventType.INDEX_PAGE_PROCESSED, (event) => {
            const links = event.data.links;
            queueManager.getDetailPageQueue().push(links.map((link: string) => ({ link })));
        });
        queueManager.on(QueueEventType.DETAIL_PAGE_PROCESSED, (event) => {
            logger.info(`已抓取 ${event.data.filmData.title}`); // 输出日志，显示已抓取的影片数量，用于调试和监控
            this.filmCount++; // 每次处理完一个详情页，增加计数器
            if(this.config.limit > 0 && this.filmCount > this.config.limit) { // 如果设置了抓取数量限制，并且当前抓取数量达到限制
                shouldStop = true; // 设置停止标志为 true
                logger.info(`已抓取 ${this.config.limit} 部影片，停止抓取。`);
                queueManager.getDetailPageQueue().kill(); // 停止详情页队列的处理
            }
            if (!shouldStop) { // 如果未设置抓取数量限制，或者当前抓取数量未达到限制
                queueManager.getFileWriteQueue().push(event.data.filmData); // 处理完成后将影片数据推送到文件写入队列
                queueManager.getImageDownloadQueue().push(event.data.metadata); // 处理完成后将影片元数据推送到图片下载队列
            }
        });


        // 统一错误处理
        const handleQueueError = QueueManager.createErrorHandler;
        queueManager.getIndexPageQueue().error(handleQueueError('indexPageQueue'));
        queueManager.getDetailPageQueue().error(handleQueueError('detailPageQueue'));
        queueManager.getFileWriteQueue().error(handleQueueError('fileWriteQueue'));
        queueManager.getImageDownloadQueue().error(handleQueueError('imageDownloadQueue'));

        // 启动抓取
        while (!shouldStop) {
            try {
                await queueManager.getIndexPageQueue().push({ url: this.getCurrentIndexPageUrl() });
                this.pageIndex++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                if (err instanceof Error) {
                    logger.error(`抓取第${this.pageIndex}页时出错: ${err.message}`);
                } else {
                    logger.error(`抓取第${this.pageIndex}页时出错: ${String(err)}`);
                }
                // 错误恢复 - 等待5秒后重试
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

}


(async () => {
    const scraper = new JavScraper(PROGRAM_CONFIG);
    logger.info('开始抓取 Jav 影片...');
    logger.info(`使用配置: ${JSON.stringify(PROGRAM_CONFIG, null, 2)}`);
    await scraper.mainExecution();
})();