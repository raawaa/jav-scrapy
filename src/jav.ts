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
import Parser from './core/parser';  // Adjust the path if needed, e.g., '../core/parser'
import RequestHandler from './core/requestHandler';  // 确认路径正确


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
            logger.info(message);
        }
    }

    /**
     * 获取当前页面的 URL
     * @returns {string} 当前页面的 URL
     */
    private getCurrentIndexPageUrl(): string {
        const baseUrl = (this.config.base || this.config.BASE_URL).replace(/\/$/, ''); // 移除末尾斜杠
        const pagePart = this.pageIndex === 1 ? '' : `/${this.pageIndex}`;

        if (this.config.search) {
            // 如果存在搜索关键词，则 URL 结构为 baseUrl/searchUrl/encodedSearch/pageIndex
            return `${baseUrl}${this.config.searchUrl ? `/${this.config.searchUrl}` : ''}/${encodeURIComponent(this.config.search)}${pagePart}`;
        } else if (baseUrl.includes('/genre/') || baseUrl.includes('/search/')) {
            // 如果baseUrl已经包含 /genre/ 或 /search/，则直接在后面跟页码
            return `${baseUrl}${pagePart}`;
        } else {
            // 否则，正常在后面跟 /page/pageIndex
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

        // 注册事件处理器
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
                // Log below the progress bar after updating it
                // This requires the bar to be stopped and restarted or using a method that logs without interference
                // For simplicity, we'll log directly, assuming the update will redraw over it or it's acceptable.
                // A more robust solution might involve a dedicated logging area or a different progress bar library.
                this.logInfo(`${chalk.yellowBright('已处理:')} ${event.data.filmData.title}`);
            } else {
                logger.info(`已抓取 ${event.data.filmData.title}`);
            }

            if (this.config.limit > 0 && this.filmCount >= this.config.limit) {
                shouldStop = true;

                if (this.progressBar) {
                    // this.progressBar.stop(); // Stop is handled in cleanup
                    // Log completion message
                    console.log(`已完成抓取 ${this.config.limit} 部影片。`);
                } else {
                    logger.info(`已抓取 ${this.config.limit} 部影片，停止抓取。`);
                }

                queueManager.getDetailPageQueue().kill();
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
                    // logger.error(`抓取第${this.pageIndex}页时出错: ${err.message}`);
                } else {
                    // logger.error(`抓取第${this.pageIndex}页时出错: ${String(err)}`);
                }
                // 错误恢复 - 等待5秒后重试
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    /**
     * 清理资源，停止进度条
     */
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
        const wasActive = !!this.progressBar;
        this.cleanup();
        if (wasActive) {
            if (this.multibar) {
                this.multibar.log('资源清理完成。\n');
            } else {
                console.log('资源清理完成。');
            }
        } else {
            logger.info('资源清理完成。');
        }
    }

}


async function initializeScraper() {
    // 确保配置更新完成
    const configManager = new ConfigManager();
    await configManager.updateFromProgram(program);
    const PROGRAM_CONFIG = configManager.getConfig();

    const requestHandler = new RequestHandler(PROGRAM_CONFIG);  // 已修正
    const pageData = await requestHandler.getPage(PROGRAM_CONFIG.base || PROGRAM_CONFIG.BASE_URL);
    const html = pageData.body;
    const antiBlockUrls = Parser.extractAntiBlockUrls(html);
    if (antiBlockUrls.length > 0) {
        // 随机选择一个防屏蔽地址
        const randomIndex = Math.floor(Math.random() * antiBlockUrls.length);
        PROGRAM_CONFIG.base = antiBlockUrls[randomIndex];
    }

    // 实例化 JavScraper 并使用最新配置
    const scraper = new JavScraper(PROGRAM_CONFIG);
    return scraper;
}


(async () => {
    const scraper = await initializeScraper();

    process.on('SIGINT', () => {
        if (scraper.progressBar) {
            scraper.progressBar.stop();
            if (scraper.multibar) {
                scraper.multibar.log('收到退出信号，开始清理...\n');
            } else {
                console.log('收到退出信号，开始清理...');
            }
        } else {
            logger.info('收到退出信号，开始清理...');
        }
        scraper.destroy();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        if (scraper.progressBar) {
            scraper.progressBar.stop();
            if (scraper.multibar) {
                scraper.multibar.log('收到终止信号，开始清理...\n');
            } else {
                console.log('收到终止信号，开始清理...');
            }
        } else {
            logger.info('收到终止信号，开始清理...');
        }
        scraper.destroy();
        process.exit(0);
    });

    try {
        // Initial logs moved to mainExecution
        await scraper.mainExecution();
    } catch (error) {
        // logger.error('程序执行出错:', error);
        console.error('程序执行出错:', error);
        scraper.destroy(); // destroy will log completion
        process.exit(1);
    } finally {
        // Ensure destroy is called, which also logs completion
        // but only if not already exited by SIGINT/SIGTERM or error handling
        if (process.exitCode === undefined) { // Check if exit hasn't been called
            scraper.destroy();
        }
    }
})();
