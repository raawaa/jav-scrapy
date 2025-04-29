#!/usr/bin/env node

import logger from './logger';
import async from 'async';
import { program } from 'commander';
import userHome from 'user-home';
import path from 'path';
import ConfigManager from './core/config';
import { version } from '../package.json';
import QueueManager from './core/queueManager';


import { Config, IndexPageTask, DetailPageTask, Metadata, FilmData } from './types/interfaces';
const searchUrl = '/search';


program
    .version(version)
    .usage('[options]')
    .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2', '2')
    .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：30000毫秒')
    .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0', '0')
    .option('-o, --output <file_path>', '设置磁链和封面抓取结果的保存位置，默认为当前用户的主目录下的 magnets 文件夹', path.join(userHome, 'magnets'))
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


import RequestHandler from './core/requestHandler';
import FileHandler from './core/fileHandler';
import Parser from './core/parser';
import { Logform } from 'winston';

class JavScraper {
    private config: Config;
    private requestHandler: RequestHandler;
    private fileHandler: FileHandler;
    private parser: Parser;
    private pageIndex: number;

    constructor(config: Config) {
        this.config = config;
        this.requestHandler = new RequestHandler(config);
        this.fileHandler = new FileHandler(config.output);
        this.parser = new Parser(config);
        this.pageIndex = 1;
    }

    async mainExecution(): Promise<void> {
        const queueManager = new QueueManager(this.config);
        const fileWriteQueue = queueManager.createFileWriteQueue();
        const detailPageQueue = queueManager.createDetailPageQueue();
        const indexPageQueue = queueManager.createIndexPageQueue(this.getCurrentPageUrl.bind(this));


        // 统一错误处理
        const handleQueueError = QueueManager.createErrorHandler;

        indexPageQueue.error(handleQueueError('indexPageQueue'));
        detailPageQueue.error(handleQueueError('detailPageQueue'));
        fileWriteQueue.error(handleQueueError('fileWriteQueue'));

        // 启动抓取
        while (true) {
            try {
                await indexPageQueue.push({ pageIndex: this.pageIndex });
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


    private cleanUrl(url: string): string {
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }

    private getCurrentPageUrl(pageIndex: number): string {
        const baseUrl = this.cleanUrl(this.config.base || this.config.BASE_URL);
        if (this.config.search) {
            const index = this.pageIndex === 1 ? '' : `/${this.pageIndex}`; // 检查是否为第一页，如果是则不添加 page 部分到 URL 中
            return `${baseUrl}${searchUrl}/${encodeURIComponent(this.config.search)}${index}`;
        } else {
            const index = this.pageIndex === 1 ? '' : `/page/${this.pageIndex}`; // 检查是否为第一页，如果是则不添加 page 部分到 URL 中
            return `${baseUrl}${index}`;
        }
    }
}


(async () => {
    const scraper = new JavScraper(PROGRAM_CONFIG);
    logger.info('开始抓取 Jav 影片...');
    logger.info(`使用配置: ${JSON.stringify(PROGRAM_CONFIG, null, 2)}`);
    await scraper.mainExecution();
})();