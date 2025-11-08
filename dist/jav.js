#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./core/logger"));
const commander_1 = require("commander");
const config_1 = __importDefault(require("./core/config"));
const queueManager_1 = __importDefault(require("./core/queueManager"));
const queueManager_2 = require("./core/queueManager");
const cliProgress = __importStar(require("cli-progress"));
const chalk_1 = __importDefault(require("chalk"));
const parser_1 = __importDefault(require("./core/parser"));
const requestHandler_1 = __importDefault(require("./core/requestHandler"));
const systemProxy_1 = require("./utils/systemProxy");
const fs_1 = __importDefault(require("fs"));
const path = __importStar(require("path"));
const errorHandler_1 = require("./utils/errorHandler");
const constants_1 = require("./core/constants");
const delayManager_1 = require("./utils/delayManager");
// 版本号 - 从package.json动态读取
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;
commander_1.program
    .version(version);
commander_1.program
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
    .option('--no-strict-ssl', '禁用SSL证书严格验证（用于代理SSL证书问题）')
    .action(async (options, program) => {
    const configManager = new config_1.default();
    await configManager.updateFromProgram(program);
    const PROGRAM_CONFIG = configManager.getConfig();
    // 设置默认延迟为2秒
    if (!PROGRAM_CONFIG.delay) {
        PROGRAM_CONFIG.delay = 2;
    }
    logger_1.default.debug('程序配置初始化完成');
    logger_1.default.debug(`完整配置: ${JSON.stringify(PROGRAM_CONFIG, null, 2)}`);
    const requestHandler = new requestHandler_1.default(PROGRAM_CONFIG);
    const scraper = new JavScraper(PROGRAM_CONFIG, requestHandler);
    try {
        await scraper.mainExecution();
    }
    catch (error) {
        errorHandler_1.ErrorHandler.handleGenericError(error, '程序执行');
        scraper.destroy();
        process.exit(1);
    }
});
commander_1.program
    .command('update')
    .description('更新防屏蔽地址')
    .action(async () => {
    const configManager = new config_1.default();
    // 直接在这里读取并应用系统代理配置
    const systemProxy = await (0, systemProxy_1.getSystemProxy)();
    logger_1.default.info(`系统代理设置: ${JSON.stringify(systemProxy)}`);
    const config = configManager.getConfig(); // 获取当前配置
    if (systemProxy.enabled && systemProxy.server) {
        // 将系统代理设置到获取到的 config 对象中
        config.proxy = (0, systemProxy_1.parseProxyServer)(systemProxy.server);
    }
    logger_1.default.info('🚀 开始检测最新防屏蔽地址...');
    // 复用爬虫的地址获取逻辑
    // 使用可能包含系统代理的 config 来创建 RequestHandler
    const requestHandler = new requestHandler_1.default(config);
    const pageData = await requestHandler.getPage(config.base || config.BASE_URL);
    const antiBlockUrls = parser_1.default.extractAntiBlockUrls(pageData?.body || '');
    const homeDir = (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME) || process.cwd();
    // 定义保存防屏蔽地址的文件路径
    const antiblockUrlsFilePath = path.join(homeDir, '.jav-scrapy-antiblock-urls.json');
    let existingUrls = [];
    // 读取现有防屏蔽地址文件
    try {
        if (fs_1.default.existsSync(antiblockUrlsFilePath)) {
            const data = fs_1.default.readFileSync(antiblockUrlsFilePath, 'utf-8');
            existingUrls = JSON.parse(data);
            if (!Array.isArray(existingUrls)) {
                existingUrls = []; // 如果文件内容不是数组，则重置
            }
        }
    }
    catch (error) {
        logger_1.default.error(`读取防屏蔽地址文件失败: ${error instanceof Error ? error.message : String(error)}`);
        existingUrls = []; // 读取失败也重置
    }
    if (antiBlockUrls.length > 0) {
        // 合并新旧地址并去重
        const allUrls = Array.from(new Set([...existingUrls, ...antiBlockUrls]));
        // 保存更新后的地址数组到文件
        try {
            fs_1.default.writeFileSync(antiblockUrlsFilePath, JSON.stringify(allUrls, null, 2));
            logger_1.default.success(`检测到 ${antiBlockUrls.length} 个新的防屏蔽地址，已更新到文件: ${chalk_1.default.underline.blue(antiblockUrlsFilePath)}`);
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handleFileError(error, '保存防屏蔽地址文件');
        }
    }
    else if (existingUrls.length > 0) {
        logger_1.default.warn(`未找到新的防屏蔽地址，当前文件共有 ${existingUrls.length} 个记录`);
    }
    else {
        logger_1.default.warn('未找到新的防屏蔽地址，且不存在历史记录。');
    }
});
class JavScraper {
    constructor(config, requestHandler) {
        this.filmCount = 0;
        this.filmsQueued = 0; // 已加入队列的影片数
        this.filmsAttempted = 0; // 开始处理的影片数
        this.multibar = null;
        this.progressBar = null;
        this.requestHandler = null;
        this.config = config;
        this.pageIndex = 1;
        this.requestHandler = requestHandler || new requestHandler_1.default(config);
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
    logInfo(message) {
        if (this.multibar) {
            this.multibar.log(message + '\n');
        }
        else {
            console.log(message);
        }
    }
    getCurrentIndexPageUrl() {
        const baseUrl = (this.config.base || this.config.BASE_URL).replace(/\/$/, '');
        const pagePart = this.pageIndex === 1 ? '' : `/${this.pageIndex}`;
        if (this.config.search) {
            return `${baseUrl}${this.config.searchUrl ? `/${this.config.searchUrl}` : ''}/${encodeURIComponent(this.config.search)}${pagePart}`;
        }
        else if (baseUrl.includes('/genre/') || baseUrl.includes('/search/')) {
            return `${baseUrl}${pagePart}`;
        }
        else {
            return `${baseUrl}${this.pageIndex === 1 ? '' : `/page${pagePart}`}`;
        }
    }
    async mainExecution() {
        const executionStartTime = Date.now();
        logger_1.default.info(`mainExecution: 开始执行程序，启动时间: ${new Date().toISOString()}`);
        this.logInfo('开始抓取 Jav 影片...');
        if (this.config.limit > 0) {
            this.logInfo(`目标抓取数量: ${this.config.limit} 部影片`);
        }
        this.logInfo(`使用配置: ${JSON.stringify(this.config, null, 2)}`);
        // 输出更详细的配置信息
        logger_1.default.debug(`mainExecution: 代理设置: ${this.config.proxy || '未设置'}`);
        logger_1.default.debug(`mainExecution: 起始URL: ${this.config.base || this.config.BASE_URL}`);
        logger_1.default.debug(`mainExecution: 并行数: ${this.config.parallel}`);
        logger_1.default.debug(`mainExecution: 超时时间: ${this.config.timeout}ms`);
        const queueManager = new queueManager_1.default(this.config);
        logger_1.default.debug(`mainExecution: QueueManager 初始化完成`);
        let shouldStop = false;
        // 添加信号处理
        const setupSignalHandlers = () => {
            const handleShutdown = async (signal) => {
                logger_1.default.info(`mainExecution: 收到${signal}信号，开始优雅退出...`);
                logger_1.default.info(`mainExecution: 最终队列状态: ${queueManager.getDetailedQueueStatus()}`);
                queueManager.shutdown();
                try {
                    await this.destroy();
                    logger_1.default.info(`mainExecution: ${signal}信号处理完成`);
                    process.exit(0);
                }
                catch (error) {
                    logger_1.default.error(`mainExecution: 销毁过程中发生错误: ${error instanceof Error ? error.message : String(error)}`);
                    process.exit(1);
                }
            };
            process.on('SIGINT', () => handleShutdown('SIGINT'));
            process.on('SIGTERM', () => handleShutdown('SIGTERM'));
        };
        setupSignalHandlers();
        queueManager.on(queueManager_2.QueueEventType.INDEX_PAGE_START, (event) => {
            if (event.data && 'link' in event.data) {
                logger_1.default.debug(`开始抓取索引页: ${event.data.link}`);
                this.logInfo(`正在抓取第${this.pageIndex}页: ${event.data.link}`);
            }
        });
        queueManager.on(queueManager_2.QueueEventType.INDEX_PAGE_PROCESSED, (event) => {
            if (event.data && 'links' in event.data) {
                const links = event.data.links;
                logger_1.default.debug(`第${this.pageIndex}页解析完成，找到 ${links.length} 部影片链接`);
                this.logInfo(`第${this.pageIndex}页抓取到${links.length}部影片`);
                if (links.length === 0) {
                    logger_1.default.warn(`第${this.pageIndex}页未找到任何影片，可能需要检查页面内容或代理设置`);
                }
                // 计算剩余需要加入队列的影片数
                if (this.config.limit > 0) {
                    const remaining = this.config.limit - this.filmsQueued;
                    if (remaining <= 0) {
                        logger_1.default.debug(`已达到影片限制 ${this.config.limit}，停止添加新影片到队列`);
                        return;
                    }
                    // 只加入所需数量的影片链接
                    const linksToAdd = links.slice(0, remaining);
                    this.filmsQueued += linksToAdd.length;
                    logger_1.default.debug(`本页添加 ${linksToAdd.length} 个影片到队列，总共已加入 ${this.filmsQueued}/${this.config.limit} 个影片`);
                    this.logInfo(`已添加 ${linksToAdd.length} 个影片到处理队列 (${this.filmsQueued}/${this.config.limit})`);
                    queueManager.getDetailPageQueue().push(linksToAdd.map((link) => ({ link })));
                }
                else {
                    // 如果没有设置限制，添加所有链接
                    this.filmsQueued += links.length;
                    queueManager.getDetailPageQueue().push(links.map((link) => ({ link })));
                }
            }
        });
        queueManager.on(queueManager_2.QueueEventType.DETAIL_PAGE_START, (event) => {
            if (event.data && 'link' in event.data) {
                this.filmsAttempted++;
                logger_1.default.debug(`开始处理详情页: ${event.data.link} (第 ${this.filmsAttempted} 个影片)`);
                this.logInfo(`开始处理详情页: ${event.data.link}`);
            }
        });
        queueManager.on(queueManager_2.QueueEventType.DETAIL_PAGE_PROCESSED, (event) => {
            // 处理成功的影片数据（无论是否达到限制都要保存）
            if (event.data && 'filmData' in event.data) {
                // 只有在未达到限制数量时才更新计数
                if (this.config.limit <= 0 || this.filmCount < this.config.limit) {
                    this.filmCount++;
                    if (this.progressBar) {
                        // 确保进度条不超过限制数量
                        const progressValue = Math.min(this.filmCount, this.config.limit);
                        this.progressBar.update(progressValue);
                        this.logInfo(`${chalk_1.default.yellowBright('已处理:')} ${event.data.filmData.title}`);
                    }
                    else {
                        logger_1.default.debug(`影片数据已处理: ${event.data.filmData.title}`);
                        this.logInfo(`已抓取 ${event.data.filmData.title}`);
                    }
                }
                // 无论是否达到限制，都要保存成功处理的影片数据
                if (event.data && 'metadata' in event.data) {
                    queueManager.getFileWriteQueue().push(event.data.filmData);
                    // 只有在 nopic 为 false 时才下载图片
                    if (!this.config.nopic) {
                        queueManager.getImageDownloadQueue().push(event.data.metadata);
                    }
                    else {
                        logger_1.default.debug(`跳过图片下载 (nopic=true): ${event.data.metadata.title}`);
                    }
                }
            }
            // 检查是否达到限制数量
            if (this.config.limit > 0 && this.filmCount >= this.config.limit) {
                logger_1.default.debug(`达到限制数量 ${this.config.limit}，停止抓取`);
                shouldStop = true;
                // 杀掉索引页队列，防止继续添加新的详情页任务
                logger_1.default.debug(`开始杀掉索引页队列...`);
                const indexQueue = queueManager.getIndexPageQueue();
                const indexStats = queueManager.getQueueStats();
                logger_1.default.debug(`杀掉前的索引队列状态 - 等待: ${indexStats.indexPageQueue.waiting}, 运行: ${indexStats.indexPageQueue.running}`);
                indexQueue.kill();
                logger_1.default.debug(`索引页队列已杀掉`);
            }
        });
        queueManager.getIndexPageQueue().error(queueManager_1.default.createErrorHandler('indexPageQueue'));
        queueManager.getDetailPageQueue().error(queueManager_1.default.createErrorHandler('detailPageQueue'));
        queueManager.getFileWriteQueue().error(queueManager_1.default.createErrorHandler('fileWriteQueue'));
        queueManager.getImageDownloadQueue().error(queueManager_1.default.createErrorHandler('imageDownloadQueue'));
        while (!shouldStop) {
            try {
                const currentUrl = this.getCurrentIndexPageUrl();
                this.logInfo(`正在抓取第${this.pageIndex}页: ${currentUrl}`);
                await queueManager.getIndexPageQueue().push({ url: currentUrl });
                this.pageIndex++;
                // 检查是否达到限制数量，如果达到则停止循环
                if (this.config.limit > 0 && this.filmsQueued >= this.config.limit) {
                    logger_1.default.debug(`已加入队列的影片数达到限制 ${this.config.limit}，停止索引页抓取`);
                    const queueStats = queueManager.getQueueStats();
                    logger_1.default.debug(`停止时的队列状态 - 索引等待: ${queueStats.indexPageQueue.waiting}, 索引运行: ${queueStats.indexPageQueue.running}, 详情等待: ${queueStats.detailPageQueue.waiting}, 详情运行: ${queueStats.detailPageQueue.running}`);
                    shouldStop = true;
                    break;
                }
                // 添加随机延迟，避免请求过于频繁
                const randomDelayMs = (0, constants_1.getRandomDelay)(this.config.delay || 8, (this.config.delay || 8) + 7);
                logger_1.default.debug(`页面抓取延迟配置: 基础延迟=${this.config.delay || 8}秒, 随机延迟=${Math.round(randomDelayMs / 1000)}秒`);
                this.logInfo(`等待 ${Math.round(randomDelayMs / 1000)} 秒后继续抓取下一页...`);
                await new Promise(resolve => setTimeout(resolve, randomDelayMs));
                logger_1.default.debug(`页面抓取延迟等待完成，准备抓取第${this.pageIndex}页`);
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                this.logInfo(`抓取第${this.pageIndex}页时出错: ${errorMessage}`);
                logger_1.default.error(`页面抓取错误 [第${this.pageIndex}页]: ${errorMessage}`);
                // 如果是网络相关错误，使用指数退避等待更长时间再重试
                if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ENOTFOUND')) {
                    const backoffDelay = (0, constants_1.getExponentialBackoffDelay)(10000, 1, 30000);
                    logger_1.default.debug(`网络错误指数退避延迟: ${Math.round(backoffDelay / 1000)}秒 (基础: 10秒)`);
                    this.logInfo(`检测到网络错误，等待 ${Math.round(backoffDelay / 1000)} 秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                    logger_1.default.debug(`网络错误延迟等待完成，准备重试第${this.pageIndex}页`);
                }
                else {
                    const errorDelay = (0, constants_1.getRandomDelay)(5, 10);
                    logger_1.default.debug(`一般错误延迟: ${Math.round(errorDelay / 1000)}秒 (随机范围: 5-10秒)`);
                    this.logInfo(`等待 ${Math.round(errorDelay / 1000)} 秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, errorDelay));
                    logger_1.default.debug(`一般错误延迟等待完成，准备重试第${this.pageIndex}页`);
                }
            }
        }
        // 在 shouldStop 变为 true 后，等待所有队列任务完成
        const stopTime = Date.now();
        const executionSoFar = Math.round((stopTime - executionStartTime) / 1000);
        logger_1.default.info(`mainExecution: 抓取停止条件已满足，开始等待队列清空 (已执行 ${executionSoFar}s)`);
        this.logInfo('抓取停止条件已满足，等待队列清空...');
        // 检查队列状态
        const queueStats = queueManager.getQueueStats();
        this.logInfo(`队列状态统计:`);
        this.logInfo(`  索引页队列: ${queueStats.indexPageQueue.waiting} 等待中, ${queueStats.indexPageQueue.running} 运行中`);
        this.logInfo(`  详情页队列: ${queueStats.detailPageQueue.waiting} 等待中, ${queueStats.detailPageQueue.running} 运行中`);
        this.logInfo(`  文件写入队列: ${queueStats.fileWriteQueue.waiting} 等待中, ${queueStats.fileWriteQueue.running} 运行中`);
        this.logInfo(`  图片下载队列: ${queueStats.imageDownloadQueue.waiting} 等待中, ${queueStats.imageDownloadQueue.running} 运行中`);
        this.logInfo(`影片处理统计: 已加入队列 ${this.filmsQueued} 个, 开始处理 ${this.filmsAttempted} 个, 成功完成 ${this.filmCount} 个`);
        logger_1.default.debug(`mainExecution: 详细队列状态: ${queueManager.getDetailedQueueStatus()}`);
        // 使用新的状态检测等待所有工作队列完成
        this.logInfo('等待所有工作队列完成...');
        logger_1.default.info(`mainExecution: 开始使用精确状态检测等待队列完成`);
        let waitCount = 0;
        const queueCheckInterval = setInterval(() => {
            waitCount++;
            const areFinished = queueManager.areWorkQueuesFinished();
            const delayStats = queueManager.hasActiveDelays();
            const stats = queueManager.getQueueStats();
            this.logInfo(`[队列等待 ${waitCount}] 工作队列${areFinished ? '已完成' : '进行中'}, 延迟${delayStats ? '进行中' : '已完成'}`);
            logger_1.default.debug(`mainExecution: 索引:等待${stats.indexPageQueue.waiting}+运行${stats.indexPageQueue.running}, ` +
                `详情:等待${stats.detailPageQueue.waiting}+运行${stats.detailPageQueue.running}, ` +
                `文件:等待${stats.fileWriteQueue.waiting}+运行${stats.fileWriteQueue.running}, ` +
                `图片:等待${stats.imageDownloadQueue.waiting}+运行${stats.imageDownloadQueue.running}`);
            if (areFinished && !delayStats) {
                clearInterval(queueCheckInterval);
                logger_1.default.debug('mainExecution: 队列状态检测interval清理完成');
            }
        }, 2000);
        // 等待工作队列完成（使用新的检测方法）
        const queueWaitStart = Date.now();
        while (!queueManager.areWorkQueuesFinished()) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        const queueWaitTime = Math.round((Date.now() - queueWaitStart) / 1000);
        this.logInfo('所有工作队列已完成');
        logger_1.default.info(`mainExecution: 工作队列完成 (耗时: ${queueWaitTime}s)`);
        // 等待所有延迟完成
        this.logInfo('等待所有延迟完成...');
        const delayWaitStart = Date.now();
        await queueManager.waitForDelays();
        const delayWaitTime = Math.round((Date.now() - delayWaitStart) / 1000);
        this.logInfo('所有延迟已完成');
        logger_1.default.info(`mainExecution: 延迟等待完成 (耗时: ${delayWaitTime}s)`);
        // 清理检查interval
        clearInterval(queueCheckInterval);
        this.logInfo('所有抓取任务完成。');
        const totalExecutionTime = Math.round((Date.now() - executionStartTime) / 1000);
        logger_1.default.info(`mainExecution: 程序执行完成，总耗时: ${totalExecutionTime}s`);
        logger_1.default.info(`mainExecution: 最终统计 - 加入队列: ${this.filmsQueued}, 开始处理: ${this.filmsAttempted}, 成功完成: ${this.filmCount}`);
        await this.destroy(); // 调用 cleanup 方法并输出完成信息
    }
    async cleanup() {
        logger_1.default.debug(`mainExecution: 开始清理资源`);
        // 清理进度条
        if (this.progressBar) {
            this.progressBar.stop();
            this.progressBar = null;
            logger_1.default.debug(`mainExecution: 进度条已停止`);
        }
        if (this.multibar) {
            this.multibar.stop();
            this.multibar = null;
            logger_1.default.debug(`mainExecution: 多进度条已停止`);
        }
        // 关闭RequestHandler (这会关闭Cloudflare绕过器和Puppeteer浏览器)
        if (this.requestHandler) {
            try {
                await this.requestHandler.close();
                this.requestHandler = null;
                logger_1.default.debug(`mainExecution: RequestHandler已关闭`);
            }
            catch (error) {
                logger_1.default.warn(`mainExecution: 关闭RequestHandler失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        // 关闭延迟管理器
        if (delayManager_1.delayManager) {
            try {
                delayManager_1.delayManager.shutdown();
                logger_1.default.debug(`mainExecution: 延迟管理器已关闭`);
            }
            catch (error) {
                logger_1.default.warn(`mainExecution: 关闭延迟管理器失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        logger_1.default.debug(`mainExecution: 资源清理完成`);
    }
    async destroy() {
        logger_1.default.info(`mainExecution: 开始销毁程序实例`);
        await this.cleanup();
        console.log('资源清理完成。');
        logger_1.default.info(`mainExecution: 程序实例销毁完成`);
        // 在正常完成时退出进程
        setTimeout(() => {
            logger_1.default.info('mainExecution: 进程即将退出');
            process.exit(0);
        }, 100);
    }
}
commander_1.program.parse();
//# sourceMappingURL=jav.js.map