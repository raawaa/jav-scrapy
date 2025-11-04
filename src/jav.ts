#!/usr/bin/env node

import logger from './core/logger';
import { program } from 'commander';
import ConfigManager from './core/config';
import QueueManager from './core/queueManager';
import { QueueEventType } from './core/queueManager';
import { Config } from './types/interfaces';
import * as cliProgress from 'cli-progress';
import chalk from 'chalk';
import Parser from './core/parser';
import RequestHandler from './core/requestHandler';
import { getSystemProxy, parseProxyServer } from './utils/systemProxy';
import fs from 'fs';
import * as path from 'path';
import { ErrorHandler } from './utils/errorHandler';
import { getRandomDelay, getExponentialBackoffDelay } from './core/constants';

// 版本号
const version = '0.8.0';


program
    .version(version);

program
    .command('crawl', { isDefault: true })
    .description('启动爬虫')
    .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2')
    .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：30000毫秒')
    .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0')
    .option('-o, --output <file_path>', '设置磁链和封面抓取结果的保存位置，默认为当前工作目录')
    .option('-s, --search <string>', '搜索关键词，可只抓取搜索结果的磁链或封面')
    .option('-b, --base <url>', '自定义抓取的起始页')
    .option('-x, --proxy <url>', '使用代理服务器, 例：-x http://127.0.0.1:8087')
    .option('-d, --delay <num>', '设置请求间隔时间(秒)。默认值：2秒')
    .option('-n, --nomag', '是否抓取尚无磁链的影片')
    .option('-a, --allmag', '是否抓取影片的所有磁链(默认只抓取文件体积最大的磁链)')
    .option('-N, --nopic', '不抓取图片')
    .option('-c, --cookies <string>', '手动设置Cookies，格式: "key1=value1; key2=value2"')
    .option('--cloudflare', '启用 Cloudflare 绕过功能')
    .action(async (options, program) => {
        const configManager = new ConfigManager();
        await configManager.updateFromProgram(program);
        const PROGRAM_CONFIG = configManager.getConfig();
        
        // 设置默认延迟为2秒
        if (!PROGRAM_CONFIG.delay) {
            PROGRAM_CONFIG.delay = 2;
        }

        logger.debug('程序配置初始化完成');
        logger.debug(`完整配置: ${JSON.stringify(PROGRAM_CONFIG, null, 2)}`);

        const requestHandler = new RequestHandler(PROGRAM_CONFIG);
        const scraper = new JavScraper(PROGRAM_CONFIG, requestHandler);

        // 添加信号处理
        process.on('SIGINT', () => {
            logger.info('\n收到退出信号，正在清理资源...');
            scraper.destroy();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            logger.info('\n收到终止信号，正在清理资源...');
            scraper.destroy();
            process.exit(0);
        });

        try {
            await scraper.mainExecution();
        } catch (error) {
            ErrorHandler.handleGenericError(error, '程序执行');
            scraper.destroy();
            process.exit(1);
        }
    });

program
    .command('update')
    .description('更新防屏蔽地址')
    .action(async () => {
        const configManager = new ConfigManager();
        // 直接在这里读取并应用系统代理配置
        const systemProxy = await getSystemProxy();
        logger.info(`系统代理设置: ${JSON.stringify(systemProxy)}`);

        const config = configManager.getConfig(); // 获取当前配置
        if (systemProxy.enabled && systemProxy.server) {
            // 将系统代理设置到获取到的 config 对象中
            config.proxy = parseProxyServer(systemProxy.server);
        }

        logger.info('🚀 开始检测最新防屏蔽地址...');

        // 复用爬虫的地址获取逻辑
        // 使用可能包含系统代理的 config 来创建 RequestHandler
        const requestHandler = new RequestHandler(config);
        const pageData = await requestHandler.getPage(config.base || config.BASE_URL);
        const antiBlockUrls = Parser.extractAntiBlockUrls(pageData?.body || '');

        const homeDir = (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME) || process.cwd();
        // 定义保存防屏蔽地址的文件路径
        const antiblockUrlsFilePath = path.join(homeDir, '.jav-scrapy-antiblock-urls.json');
        let existingUrls: string[] = [];

        // 读取现有防屏蔽地址文件
        try {
            if (fs.existsSync(antiblockUrlsFilePath)) {
                const data = fs.readFileSync(antiblockUrlsFilePath, 'utf-8');
                existingUrls = JSON.parse(data);
                if (!Array.isArray(existingUrls)) {
                    existingUrls = []; // 如果文件内容不是数组，则重置
                }
            }
        } catch (error) {
            logger.error(`读取防屏蔽地址文件失败: ${error instanceof Error ? error.message : String(error)}`);
            existingUrls = []; // 读取失败也重置
        }

        if (antiBlockUrls.length > 0) {
            // 合并新旧地址并去重
            const allUrls = Array.from(new Set([...existingUrls, ...antiBlockUrls]));

            // 保存更新后的地址数组到文件
            try {
                fs.writeFileSync(antiblockUrlsFilePath, JSON.stringify(allUrls, null, 2));
                logger.success(`检测到 ${antiBlockUrls.length} 个新的防屏蔽地址，已更新到文件: ${chalk.underline.blue(antiblockUrlsFilePath)}`);
            } catch (error) {
                ErrorHandler.handleFileError(error, '保存防屏蔽地址文件');
            }

        } else if (existingUrls.length > 0) {
            logger.warn(`未找到新的防屏蔽地址，当前文件共有 ${existingUrls.length} 个记录`);
        }
        else {
            logger.warn('未找到新的防屏蔽地址，且不存在历史记录。');
        }


    });

class JavScraper {
    private config: Config;
    private pageIndex: number;
    private filmCount: number = 0;
    public multibar: cliProgress.MultiBar | null = null;
    public progressBar: cliProgress.SingleBar | null = null;
    private requestHandler: RequestHandler;

    constructor(config: Config, requestHandler?: RequestHandler) {
        this.config = config;
        this.pageIndex = 1;
        this.requestHandler = requestHandler || new RequestHandler(config);
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
        
        // 输出更详细的配置信息
        logger.debug(`代理设置: ${this.config.proxy || '未设置'}`);
        logger.debug(`起始URL: ${this.config.base || this.config.BASE_URL}`);
        logger.debug(`并行数: ${this.config.parallel}`);
        logger.debug(`超时时间: ${this.config.timeout}ms`);

        const queueManager = new QueueManager(this.config);
        let shouldStop = false;

        queueManager.on(QueueEventType.INDEX_PAGE_START, (event) => {
            if (event.data && 'link' in event.data) {
                logger.debug(`开始抓取索引页: ${event.data.link}`);
                this.logInfo(`正在抓取第${this.pageIndex}页: ${event.data.link}`);
            }
        });

        queueManager.on(QueueEventType.INDEX_PAGE_PROCESSED, (event) => {
            if (event.data && 'links' in event.data) {
                const links = event.data.links;
                logger.debug(`第${this.pageIndex}页解析完成，找到 ${links.length} 部影片链接`);
                this.logInfo(`第${this.pageIndex}页抓取到${links.length}部影片`);
                
                if (links.length === 0) {
                    logger.warn(`第${this.pageIndex}页未找到任何影片，可能需要检查页面内容或代理设置`);
                }
                
                queueManager.getDetailPageQueue().push(links.map((link: string) => ({ link })));
            }
        });

        queueManager.on(QueueEventType.DETAIL_PAGE_START, (event) => {
            if (event.data && 'link' in event.data) {
                logger.debug(`开始处理详情页: ${event.data.link}`);
                this.logInfo(`开始处理详情页: ${event.data.link}`);
            }
        });

        queueManager.on(QueueEventType.DETAIL_PAGE_PROCESSED, (event) => {
            this.filmCount++;

            if (event.data && 'filmData' in event.data) {
                if (this.progressBar) {
                    this.progressBar.update(this.filmCount);
                    this.logInfo(`${chalk.yellowBright('已处理:')} ${event.data.filmData.title}`);
                } else {
                    logger.debug(`影片数据已处理: ${event.data.filmData.title}`);
                    this.logInfo(`已抓取 ${event.data.filmData.title}`);
                }

                if (this.config.limit > 0 && this.filmCount >= this.config.limit) {
                    logger.debug(`达到限制数量 ${this.config.limit}，停止抓取`);
                    shouldStop = true;
                    queueManager.getDetailPageQueue().kill();
                }
                if (event.data && 'metadata' in event.data) {
                    queueManager.getFileWriteQueue().push(event.data.filmData);
                    queueManager.getImageDownloadQueue().push(event.data.metadata);
                }
            }
        });

        queueManager.getIndexPageQueue().error(QueueManager.createErrorHandler('indexPageQueue'));
        queueManager.getDetailPageQueue().error(QueueManager.createErrorHandler('detailPageQueue'));
        queueManager.getFileWriteQueue().error(QueueManager.createErrorHandler('fileWriteQueue'));
        queueManager.getImageDownloadQueue().error(QueueManager.createErrorHandler('imageDownloadQueue'));

        while (!shouldStop) {
            try {
                const currentUrl = this.getCurrentIndexPageUrl();
                this.logInfo(`正在抓取第${this.pageIndex}页: ${currentUrl}`);
                await queueManager.getIndexPageQueue().push({ url: currentUrl });
                this.pageIndex++;
                // 添加随机延迟，避免请求过于频繁
                const randomDelayMs = getRandomDelay(this.config.delay || 8, (this.config.delay || 8) + 7);
                this.logInfo(`等待 ${Math.round(randomDelayMs / 1000)} 秒后继续...`);
                await new Promise(resolve => setTimeout(resolve, randomDelayMs));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                this.logInfo(`抓取第${this.pageIndex}页时出错: ${errorMessage}`);
                logger.error(`页面抓取错误 [第${this.pageIndex}页]: ${errorMessage}`);
                
                // 如果是网络相关错误，使用指数退避等待更长时间再重试
                if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ENOTFOUND')) {
                    const backoffDelay = getExponentialBackoffDelay(10000, 1, 30000);
                    this.logInfo(`检测到网络错误，等待 ${Math.round(backoffDelay / 1000)} 秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                } else {
                    const errorDelay = getRandomDelay(5, 10);
                    this.logInfo(`等待 ${Math.round(errorDelay / 1000)} 秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, errorDelay));
                }
            }
        }

        // 在 shouldStop 变为 true 后，等待所有队列任务完成
        this.logInfo('抓取停止条件已满足，等待队列清空...');
        
        // 检查队列状态
        const indexQueue = queueManager.getIndexPageQueue();
        const detailQueue = queueManager.getDetailPageQueue();
        const fileWriteQueue = queueManager.getFileWriteQueue();
        const imageDownloadQueue = queueManager.getImageDownloadQueue();
        
        this.logInfo(`队列状态 - 索引页队列: ${indexQueue.length()} 等待中`);
        this.logInfo(`队列状态 - 详情页队列: ${detailQueue.length()} 等待中`);
        this.logInfo(`队列状态 - 文件写入队列: ${fileWriteQueue.length()} 等待中`);
        this.logInfo(`队列状态 - 图片下载队列: ${imageDownloadQueue.length()} 等待中`);
        
        // 等待所有队列完成
        this.logInfo('等待索引页队列完成...');
        await indexQueue.drain();
        this.logInfo('索引页队列已完成');
        
        this.logInfo('等待详情页队列完成...');
        await detailQueue.drain();
        this.logInfo('详情页队列已完成');
        
        this.logInfo('等待文件写入队列完成...');
        await fileWriteQueue.drain();
        this.logInfo('文件写入队列已完成');
        
        this.logInfo('等待图片下载队列完成...');
        await imageDownloadQueue.drain();
        this.logInfo('图片下载队列已完成');

        this.logInfo('所有抓取任务完成。');
        this.destroy(); // 调用 cleanup 方法并输出完成信息
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

program.parse();


