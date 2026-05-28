#!/usr/bin/env node

import logger, { setConsoleLevel, setRunId, writeRunSeparator } from './core/logger';
import { getMainLogPath, getLogDir, getAntiBlockUrlsPath } from './core/paths';
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
import os from 'os';
import { ErrorHandler } from './utils/errorHandler';
import { getRandomDelay, getExponentialBackoffDelay } from './core/constants';
import { delayManager, DelayType } from './utils/delayManager';
import { Output } from './output';

// 版本号 - 从package.json动态读取
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;


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
    .option('--no-strict-ssl', '禁用SSL证书严格验证（用于代理SSL证书问题）')
    .option('-v, --verbose', '显示详细调试信息')
    .option('-q, --quiet', '静默模式，只显示错误和最终摘要')
    .action(async (options, program) => {
        const configManager = new ConfigManager();
        await configManager.updateFromProgram(program);
        const PROGRAM_CONFIG = configManager.getConfig();
        
        // 设置默认延迟为2秒
        if (!PROGRAM_CONFIG.delay) {
            PROGRAM_CONFIG.delay = 2;
        }

        // 根据命令行参数设置日志级别
        if (options.verbose) {
            setConsoleLevel('debug');
            logger.debug('已启用详细日志模式 (--verbose)');
        }
        if (options.quiet) {
            setConsoleLevel('error');
            logger.debug('已启用静默模式 (--quiet)');
        }

        logger.debug('程序配置初始化完成');

        const requestHandler = new RequestHandler(PROGRAM_CONFIG);
        const scraper = new JavScraper(PROGRAM_CONFIG, requestHandler);

        try {
            await scraper.mainExecution();
        } catch (error) {
            ErrorHandler.handleGenericError(error, '程序执行');
            scraper.destroy();
            process.exit(1);
        }
    });

program
    .command('logs')
    .description('查看日志')
    .option('--tail <num>', '显示最后 N 行日志', parseInt)
    .option('--export', '导出日志到当前目录')
    .action((options) => {
        const logPath = getMainLogPath();
        const logDir = getLogDir();

        console.log(`📁 日志目录: ${chalk.cyan(logDir)}`);
        console.log(`📄 日志文件: ${chalk.cyan(logPath)}`);

        if (!fs.existsSync(logPath)) {
            console.log(chalk.yellow('暂无日志记录。'));
            return;
        }

        if (options.export) {
            const exportName = `jav-scrapy-logs-${Date.now()}.log`;
            fs.copyFileSync(logPath, exportName);
            console.log(`✅ 已导出到: ${chalk.green(exportName)}`);
            return;
        }

        if (options.tail) {
            const content = fs.readFileSync(logPath, 'utf-8');
            const lines = content.split('\n').filter(Boolean);
            const tailLines = lines.slice(-options.tail);
            console.log('');
            console.log(chalk.gray(`--- 最后 ${options.tail} 行 ---`));
            tailLines.forEach(line => console.log(line));
            return;
        }

        console.log('');
        console.log(chalk.gray('使用 --tail N 查看最后 N 行，或 --export 导出日志。'));
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

        // 防屏蔽地址文件路径（统一管理，包含旧位置迁移）
        const antiblockUrlsFilePath = getAntiBlockUrlsPath();
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
    private filmsQueued: number = 0; // 已加入队列的影片数
    private filmsAttempted: number = 0; // 开始处理的影片数
    public multibar: cliProgress.MultiBar | null = null;
    public progressBar: cliProgress.SingleBar | null = null;
    private requestHandler: RequestHandler | null = null;

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
            Output.setMultibar(this.multibar);
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
        const executionStartTime = Date.now();

        // 生成运行 ID
        const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setRunId(runId);
        writeRunSeparator(runId);

        // 启动快照：记录运行环境和配置到日志
        logger.info(`运行 ${runId} 开始`);
        logger.info(`版本: ${version}`);
        logger.info(`Node.js: ${process.version}, 平台: ${process.platform}, 架构: ${process.arch}`);
        logger.info(`主机: ${os.hostname()}, 用户: ${os.userInfo().username}`);
        logger.info(`内存: ${Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10}GB 总计`);
        logger.info(`配置: ${JSON.stringify({
            parallel: this.config.parallel,
            delay: this.config.delay,
            limit: this.config.limit,
            timeout: this.config.timeout,
            proxy: this.config.proxy ? '[已设置]' : '未设置',
            nomag: this.config.nomag,
            allmag: this.config.allmag,
            nopic: this.config.nopic,
            output: this.config.output,
            base: this.config.base || this.config.BASE_URL,
            search: this.config.search
        })}`);
        logger.debug(`完整配置: ${JSON.stringify(this.config, (key, value) =>
            key === 'headers' ? '[REDACTED]' : value, 2)}`);

        // 启动横幅
        Output.banner(this.config, version);

        const queueManager = new QueueManager(this.config);
        logger.debug(`mainExecution: QueueManager 初始化完成`);
        let shouldStop = false;

        // 未捕获异常处理
        const handleUncaught = (error: Error) => {
            logger.error(`未捕获的异常: ${error.message}`);
            logger.error(`错误堆栈: ${error.stack || ''}`);
            try {
                logger.error(`最终队列状态: ${queueManager.getDetailedQueueStatus()}`);
            } catch { /* 队列可能未初始化 */ }
            logger.info(`运行 ${runId} 异常结束`);
            process.exit(1);
        };
        process.on('uncaughtException', handleUncaught);
        process.on('unhandledRejection', (reason) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            handleUncaught(error);
        });

        // 添加信号处理
        const setupSignalHandlers = () => {
            const handleShutdown = async (signal: string) => {
                logger.info(`收到${signal}信号，开始优雅退出...`);
                logger.info(`最终队列状态: ${queueManager.getDetailedQueueStatus()}`);
                queueManager.shutdown();
                try {
                    await this.destroy();
                    logger.info(`${signal}信号处理完成`);
                    logger.info(`运行 ${runId} 被${signal}中断`);
                    process.exit(0);
                } catch (error) {
                    logger.error(`销毁过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
                    logger.info(`运行 ${runId} 销毁失败`);
                    process.exit(1);
                }
            };

            process.on('SIGINT', () => handleShutdown('SIGINT'));
            process.on('SIGTERM', () => handleShutdown('SIGTERM'));
        };

        setupSignalHandlers();

        queueManager.on(QueueEventType.INDEX_PAGE_START, (event) => {
            if (event.data && 'link' in event.data) {
                logger.debug(`开始抓取索引页: ${event.data.link}`);
            }
        });

        queueManager.on(QueueEventType.INDEX_PAGE_PROCESSED, (event) => {
            if (event.data && 'links' in event.data) {
                const links = event.data.links;
                logger.debug(`第${this.pageIndex}页解析完成，找到 ${links.length} 部影片链接`);
                Output.pageProgress(this.pageIndex, links.length);

                if (links.length === 0) {
                    logger.warn(`第${this.pageIndex}页未找到任何影片，可能需要检查页面内容或代理设置`);
                }

                // 计算剩余需要加入队列的影片数
                if (this.config.limit > 0) {
                    const remaining = this.config.limit - this.filmsQueued;
                    if (remaining <= 0) {
                        logger.debug(`已达到影片限制 ${this.config.limit}，停止添加新影片到队列`);
                        return;
                    }

                    // 只加入所需数量的影片链接
                    const linksToAdd = links.slice(0, remaining);
                    this.filmsQueued += linksToAdd.length;

                    logger.debug(`本页添加 ${linksToAdd.length} 个影片到队列，总共已加入 ${this.filmsQueued}/${this.config.limit} 个影片`);
                    Output.filmQueued(linksToAdd.length, this.filmsQueued, this.config.limit);

                    queueManager.getDetailPageQueue().push(linksToAdd.map((link: string) => ({ link })));
                } else {
                    // 如果没有设置限制，添加所有链接
                    this.filmsQueued += links.length;
                    queueManager.getDetailPageQueue().push(links.map((link: string) => ({ link })));
                }
            }
        });

        queueManager.on(QueueEventType.DETAIL_PAGE_START, (event) => {
            if (event.data && 'link' in event.data) {
                this.filmsAttempted++;
                logger.debug(`开始处理详情页: ${event.data.link} (第 ${this.filmsAttempted} 个影片)`);
            }
        });

        queueManager.on(QueueEventType.DETAIL_PAGE_PROCESSED, (event) => {
            // 处理成功的影片数据（无论是否达到限制都要保存）
            if (event.data && 'filmData' in event.data) {
                // 只有在未达到限制数量时才更新计数
                if (this.config.limit <= 0 || this.filmCount < this.config.limit) {
                    this.filmCount++;

                    if (this.progressBar) {
                        const progressValue = Math.min(this.filmCount, this.config.limit);
                        this.progressBar.update(progressValue);
                    } else {
                        Output.filmResult(event.data.filmData.title, !!event.data.filmData.magnetLinks?.length);
                    }
                }

                // 无论是否达到限制，都要保存成功处理的影片数据
                if (event.data && 'metadata' in event.data) {
                    queueManager.getFileWriteQueue().push(event.data.filmData);
                    // 只有在 nopic 为 false 时才下载图片
                    if (!this.config.nopic) {
                        queueManager.getImageDownloadQueue().push(event.data.metadata);
                    } else {
                        logger.debug(`跳过图片下载 (nopic=true): ${event.data.metadata.title}`);
                    }
                }
            }

            // 检查是否达到限制数量
            if (this.config.limit > 0 && this.filmCount >= this.config.limit) {
                logger.debug(`达到限制数量 ${this.config.limit}，停止抓取`);
                shouldStop = true;
                // 杀掉索引页队列，防止继续添加新的详情页任务
                logger.debug(`开始杀掉索引页队列...`);
                const indexQueue = queueManager.getIndexPageQueue();
                const indexStats = queueManager.getQueueStats();
                logger.debug(`杀掉前的索引队列状态 - 等待: ${indexStats.indexPageQueue.waiting}, 运行: ${indexStats.indexPageQueue.running}`);
                indexQueue.kill();
                logger.debug(`索引页队列已杀掉`);
            }
        });

        queueManager.getIndexPageQueue().error(QueueManager.createErrorHandler('indexPageQueue'));
        queueManager.getDetailPageQueue().error(QueueManager.createErrorHandler('detailPageQueue'));
        queueManager.getFileWriteQueue().error(QueueManager.createErrorHandler('fileWriteQueue'));
        queueManager.getImageDownloadQueue().error(QueueManager.createErrorHandler('imageDownloadQueue'));

        while (!shouldStop) {
            try {
                const currentUrl = this.getCurrentIndexPageUrl();
                await queueManager.getIndexPageQueue().push({ url: currentUrl });
                this.pageIndex++;

                // 检查是否达到限制数量，如果达到则停止循环
                if (this.config.limit > 0 && this.filmsQueued >= this.config.limit) {
                    logger.debug(`已加入队列的影片数达到限制 ${this.config.limit}，停止索引页抓取`);
                    const queueStats = queueManager.getQueueStats();
                    logger.debug(`停止时的队列状态 - 索引等待: ${queueStats.indexPageQueue.waiting}, 索引运行: ${queueStats.indexPageQueue.running}, 详情等待: ${queueStats.detailPageQueue.waiting}, 详情运行: ${queueStats.detailPageQueue.running}`);
                    shouldStop = true;
                    break;
                }

                // 添加随机延迟，避免请求过于频繁
                const randomDelayMs = getRandomDelay(this.config.delay || 8, (this.config.delay || 8) + 7);
                logger.debug(`页面抓取延迟: ${Math.round(randomDelayMs/1000)}秒`);
                Output.delay(Math.round(randomDelayMs / 1000));
                await new Promise(resolve => setTimeout(resolve, randomDelayMs));
                logger.debug(`页面抓取延迟等待完成，准备抓取第${this.pageIndex}页`);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                Output.pageError(this.pageIndex, errorMessage);
                logger.error(`页面抓取错误 [第${this.pageIndex}页]: ${errorMessage}`);

                // 如果是网络相关错误，使用指数退避等待更长时间再重试
                if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ENOTFOUND')) {
                    const backoffDelay = getExponentialBackoffDelay(10000, 1, 30000);
                    Output.networkRetry(Math.round(backoffDelay / 1000));
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                } else {
                    const errorDelay = getRandomDelay(5, 10);
                    Output.genericRetry(Math.round(errorDelay / 1000));
                    await new Promise(resolve => setTimeout(resolve, errorDelay));
                    logger.debug(`一般错误延迟等待完成，准备重试第${this.pageIndex}页`);
                }
            }
        }

        // 在 shouldStop 变为 true 后，等待所有队列任务完成
        const stopTime = Date.now();
        const executionSoFar = Math.round((stopTime - executionStartTime) / 1000);
        logger.info(`mainExecution: 抓取停止条件已满足，开始等待队列清空 (已执行 ${executionSoFar}s)`);
        Output.waitingForDrain();

        // 等待工作队列完成
        const queueWaitStart = Date.now();
        let lastDot = 0;
        while (!queueManager.areWorkQueuesFinished()) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const elapsed = Math.round((Date.now() - queueWaitStart) / 1000);
            if (elapsed > 10 && elapsed > lastDot) {
                lastDot = elapsed;
            }
        }

        const queueWaitTime = Math.round((Date.now() - queueWaitStart) / 1000);
        logger.info(`mainExecution: 工作队列完成 (耗时: ${queueWaitTime}s)`);

        // 等待所有延迟完成
        await queueManager.waitForDelays();

        const totalExecutionTime = Math.round((Date.now() - executionStartTime) / 1000);

        // 最终统计摘要
        const summary = {
            totalTime: totalExecutionTime,
            pages: this.pageIndex - 1,
            filmsFound: this.filmsQueued,
            filmsCompleted: this.filmCount,
            filmsFailed: Math.max(0, this.filmsAttempted - this.filmCount),
            output: this.config.output
        };
        Output.summary(summary);
        logger.info(`运行 ${runId} 完成: 耗时 ${summary.totalTime}s, ` +
            `页面 ${summary.pages}, 发现 ${summary.filmsFound}, ` +
            `完成 ${summary.filmsCompleted}, 失败 ${summary.filmsFailed}`);
    }

    private async cleanup(): Promise<void> {
        logger.debug(`mainExecution: 开始清理资源`);

        // 清理进度条
        if (this.progressBar) {
            this.progressBar.stop();
            this.progressBar = null;
            logger.debug(`mainExecution: 进度条已停止`);
        }
        if (this.multibar) {
            this.multibar.stop();
            this.multibar = null;
            logger.debug(`mainExecution: 多进度条已停止`);
        }

        logger.debug(`mainExecution: 不需要关闭 RequestHandler (无需要清理的资源)`);

        // 关闭延迟管理器
        if (delayManager) {
            try {
                delayManager.shutdown();
                logger.debug(`mainExecution: 延迟管理器已关闭`);
            } catch (error) {
                logger.warn(`mainExecution: 关闭延迟管理器失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        logger.debug(`mainExecution: 资源清理完成`);
    }

    public async destroy(): Promise<void> {
        logger.info(`mainExecution: 开始销毁程序实例`);
        await this.cleanup();
        console.log('资源清理完成。');
        logger.info(`mainExecution: 程序实例销毁完成`);

        // 在正常完成时退出进程
        setTimeout(() => {
            logger.info('mainExecution: 进程即将退出');
            process.exit(0);
        }, 100);
    }
}

program.parse();


