#!/usr/bin/env node

import logger from './core/logger';
import { program } from 'commander';
import ConfigManager from './core/config';
import { version } from '../package.json';
import QueueManager from './core/queueManager';
import { QueueEventType } from './core/queueManager';
import { Config } from './types/interfaces';
import * as cliProgress from 'cli-progress';
import chalk from 'chalk';
import Parser from './core/parser';  
import RequestHandler from './core/requestHandler';  


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


class JavScraper {
    private config: Config;
    private pageIndex: number;
    private filmCount: number = 0;
    public multibar: cliProgress.MultiBar | null = null;
    public progressBar: cliProgress.SingleBar | null = null;

    constructor(config: Config) {
        this.config = config;
        this.pageIndex = 1;
        if (this.config.limit > 0) {
            this.multibar = new cliProgress.MultiBar({
                format: '下载进度 |{bar}| {percentage}% | {value}/{total} 部影片 | 剩余: {eta}s',
                barCompleteChar: '█',
                barIncompleteChar: '░',
                hideCursor: true
            }, cliProgress.Presets.shades_classic);
            this.progressBar = this.multibar.create(this.config.limit, 0);
        }
    }

    private logInfo(message: string): void {
        if (this.multibar) {
            this.multibar.log(message + '\n');
        } else {
            console.log(message);
        }
    }

    private getCurrentIndexPageUrl(): string {
        const baseUrl = (this.config.base || this.config.BASE_URL).replace(/\/$/, ''); 
        const pagePart = this.pageIndex === 1 ? '' : `/${this.pageIndex}`;

        if (this.config.search) {
            return `${baseUrl}${this.config.searchUrl ? `/${this.config.searchUrl}` : ''}/${encodeURIComponent(this.config.search)}${pagePart}`;
        } else if (baseUrl.includes('/genre/') || baseUrl.includes('/search/')) {
            return `${baseUrl}${pagePart}`;
        } else {
            return `${baseUrl}${this.pageIndex === 1 ? '' : `/page${pagePart}`}`;
        }
    }

    async mainExecution(): Promise<void> {
        this.logInfo('开始抓取 Jav 影片...');
        if (this.config.limit > 0) {
            this.logInfo(`目标抓取数量: ${this.config.limit} 部影片`);
        }
        this.logInfo(`使用配置: ${JSON.stringify(this.config, null, 2)}`);

        const queueManager = new QueueManager(this.config);
        let shouldStop = false;

        queueManager.on(QueueEventType.INDEX_PAGE_START, (event) => {
            this.logInfo(`开始抓取第${this.pageIndex}页: ${event.data.link}`);
        });

        queueManager.on(QueueEventType.INDEX_PAGE_PROCESSED, (event) => {
            const links = event.data.links;
            console.log(`第${this.pageIndex}页抓取到${links.length}部影片`);
            queueManager.getDetailPageQueue().push(links.map((link: string) => ({ link })));
        });

        queueManager.on(QueueEventType.DETAIL_PAGE_START, (event) => {
            this.logInfo(`开始处理详情页: ${event.data.link}`);
        });

        queueManager.on(QueueEventType.DETAIL_PAGE_PROCESSED, (event) => {
            this.filmCount++;

            if (this.progressBar) {
                this.progressBar.update(this.filmCount);
                this.logInfo(`${chalk.yellowBright('已处理:')} ${event.data.filmData.title}`);
            } else {
                console.log(`已抓取 ${event.data.filmData.title}`);
            }

            if (this.config.limit > 0 && this.filmCount >= this.config.limit) {
                shouldStop = true;
                queueManager.getDetailPageQueue().kill();
            }
            if (!shouldStop) {
                queueManager.getFileWriteQueue().push(event.data.filmData);
                queueManager.getImageDownloadQueue().push(event.data.metadata);
            }
        });

        const handleQueueError = QueueManager.createErrorHandler;
        queueManager.getIndexPageQueue().error(handleQueueError('indexPageQueue'));
        queueManager.getDetailPageQueue().error(handleQueueError('detailPageQueue'));
        queueManager.getFileWriteQueue().error(handleQueueError('fileWriteQueue'));
        queueManager.getImageDownloadQueue().error(handleQueueError('imageDownloadQueue'));

        while (!shouldStop) {
            try {
                await queueManager.getIndexPageQueue().push({ url: this.getCurrentIndexPageUrl() });
                this.pageIndex++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (err) {
                console.error(`抓取第${this.pageIndex}页时出错: ${err instanceof Error ? err.message : String(err)}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    private cleanup(): void {
        if (this.progressBar) {
            this.progressBar.stop();
            this.progressBar = null;
        }
        if (this.multibar) {
            this.multibar.stop();
            this.multibar = null;
        }
    }

    public destroy(): void {
        this.cleanup();
        console.log('资源清理完成。');
    }
}

async function initializeScraper() {
    const configManager = new ConfigManager();
    await configManager.updateFromProgram(program);
    const PROGRAM_CONFIG = configManager.getConfig();

    const requestHandler = new RequestHandler(PROGRAM_CONFIG);
    const pageData = await requestHandler.getPage(PROGRAM_CONFIG.base || PROGRAM_CONFIG.BASE_URL);
    const html = pageData.body;
    const antiBlockUrls = Parser.extractAntiBlockUrls(html);
    if (antiBlockUrls.length > 0) {
        const randomIndex = Math.floor(Math.random() * antiBlockUrls.length);
        PROGRAM_CONFIG.base = antiBlockUrls[randomIndex];
    }

    return new JavScraper(PROGRAM_CONFIG);
}

(async () => {
    const scraper = await initializeScraper();

    // 添加信号处理
    process.on('SIGINT', () => {
        console.log('\n收到退出信号，正在清理资源...');
        scraper.destroy();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n收到终止信号，正在清理资源...');
        scraper.destroy();
        process.exit(0);
    });

    try {
        await scraper.mainExecution();
    } catch (error) {
        console.error('程序执行出错:', error);
        scraper.destroy();
        process.exit(1);
    }
})();
