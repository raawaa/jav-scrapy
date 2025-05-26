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
import { getSystemProxy, parseProxyServer } from './utils/systemProxy';
import fs from 'fs';


program
    .version(version);

program
    .command('crawl')
    .description('启动爬虫')
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
    .action(async (options, program) => {
        const configManager = new ConfigManager();
        await configManager.updateFromProgram(program);
        const PROGRAM_CONFIG = configManager.getConfig();

        const requestHandler = new RequestHandler(PROGRAM_CONFIG);
        const scraper = new JavScraper(PROGRAM_CONFIG);

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
    });

program
    .command('update')
    .description('更新防屏蔽地址')
    .action(async () => {
        const configManager = new ConfigManager();
        // 直接在这里读取并应用系统代理配置
        const systemProxy = await getSystemProxy();
        console.log('系统代理设置:', systemProxy);
        
        const config = configManager.getConfig(); // 获取当前配置
        if (systemProxy.enabled && systemProxy.server) {
            // 将系统代理设置到获取到的 config 对象中
            config.proxy = parseProxyServer(systemProxy.server);
        }

        console.log('🚀 开始检测最新防屏蔽地址...');
        logger.info('🚀 开始检测最新防屏蔽地址...');
        
        // 复用爬虫的地址获取逻辑
        // 使用可能包含系统代理的 config 来创建 RequestHandler
        const requestHandler = new RequestHandler(config);
        const pageData = await requestHandler.getPage(config.base || config.BASE_URL);
        const antiBlockUrls = Parser.extractAntiBlockUrls(pageData?.body || '');
        
        // 定义保存防屏蔽地址的文件路径
        const antiblockUrlsFilePath = `${process.env.HOME}/.jav-scrapy-antiblock-urls.json`;
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
                logger.error(`保存防屏蔽地址文件失败: ${error instanceof Error ? error.message : String(error)}`);
            }

        } else if (existingUrls.length > 0) {
             logger.warn(`未找到新的防屏蔽地址，当前文件共有 ${existingUrls.length} 个记录`);
        }
        else {
            logger.warn('未找到新的防屏蔽地址，且不存在历史记录。');
        }

        // 移除更新主配置文件 base 字段的逻辑
        // if (antiBlockUrls.length > 0) {
        //     const newUrl = antiBlockUrls[Math.floor(Math.random() * antiBlockUrls.length)];
        //     // 只更新并保存配置中的 base 字段
        //     const configPath = `${process.env.HOME}/.config.json`;
        //     let currentConfig = {};
        //     try {
        //         if (fs.existsSync(configPath)) {
        //             currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        //         }
        //     } catch (error) {
        //         logger.error(`读取配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
        //         // 如果读取失败，使用当前内存中的config作为基础
        //         currentConfig = config;
        //     }
        //     // 更新 base 字段
        //     currentConfig = { ...currentConfig, base: newUrl };
        //     try {
        //         fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
        //         logger.success(`防屏蔽地址已更新为：${chalk.underline.blue(newUrl)} 并已保存到配置文件`);
        //     } catch (error) {
        //         logger.error(`保存配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
        //     }
        // } else {
        //     logger.warn('未找到新的防屏蔽地址，使用备用地址');
        //     const backupUrl = backupUrls[Math.floor(Math.random() * backupUrls.length)];
        //     // 备份地址不自动保存到配置文件，只在当前运行中使用
        //     // configManager.updateConfig({ base: backupUrl }); // 不在这里保存
        //     logger.info(`本次使用备用地址：${backupUrl}`);
        // }

    });

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

        // 在 shouldStop 变为 true 后，等待所有队列任务完成
        console.log('抓取停止条件已满足，等待队列清空...');
        await queueManager.getIndexPageQueue().idle();
        await queueManager.getDetailPageQueue().idle();
        await queueManager.getFileWriteQueue().idle();
        await queueManager.getImageDownloadQueue().idle();

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


