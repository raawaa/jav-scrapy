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
exports.PuppeteerPool = void 0;
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const logger_1 = __importDefault(require("./logger"));
const fs = __importStar(require("fs"));
// Handle Puppeteer configuration for packaged environments
const getPuppeteerExecutablePath = () => {
    // Try to find system Chrome/Chromium (both packaged and development environments)
    const possiblePaths = [
        // Windows
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Chromium\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
        // macOS
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        // macOS development paths
        '/usr/local/Caskroom/google-chrome/latest/Google Chrome.app/Contents/MacOS/Google Chrome',
        // Linux
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/local/bin/chrome',
        '/usr/local/bin/chromium',
        // Common development paths
        '/usr/bin/chromium'
    ];
    for (const browserPath of possiblePaths) {
        const expandedPath = browserPath.replace('%USERNAME%', process.env.USERNAME || '');
        if (fs.existsSync(expandedPath)) {
            logger_1.default.info(`Found Chrome/Chromium at: ${expandedPath}`);
            return expandedPath;
        }
    }
    // If no system Chrome found, try to use puppeteer's bundled Chrome
    try {
        // Import puppeteer to get the bundled browser path
        const puppeteer = require('puppeteer');
        const browserPath = puppeteer.executablePath();
        if (browserPath && fs.existsSync(browserPath)) {
            logger_1.default.info(`Using bundled Chrome: ${browserPath}`);
            return browserPath;
        }
    }
    catch (error) {
        logger_1.default.debug('Bundled Chrome not found:', error instanceof Error ? error.message : String(error));
    }
    // If still not found, log detailed information
    logger_1.default.error('No Chrome/Chromium found. Please install Google Chrome or Chromium.');
    logger_1.default.error('Tried the following paths:');
    for (const browserPath of possiblePaths) {
        const expandedPath = browserPath.replace('%USERNAME%', process.env.USERNAME || '');
        logger_1.default.error(`  ${expandedPath} - ${fs.existsSync(expandedPath) ? 'EXISTS' : 'NOT FOUND'}`);
    }
    return undefined;
};
class PuppeteerPool {
    constructor(config) {
        this.pool = [];
        this.requestQueue = [];
        this.healthCheckTimer = null;
        this.isInitialized = false;
        this.config = { ...config };
    }
    static getInstance(config) {
        if (!PuppeteerPool.instance) {
            const defaultConfig = {
                maxSize: 5, // 增加池大小，减少创建销毁频率
                maxIdleTime: 2 * 60 * 1000, // 减少空闲时间到2分钟
                healthCheckInterval: 20 * 1000, // 更频繁的健康检查
                requestTimeout: 30000, // 减少请求超时
                retryAttempts: 2 // 减少重试次数
            };
            PuppeteerPool.instance = new PuppeteerPool(config || defaultConfig);
        }
        return PuppeteerPool.instance;
    }
    async initialize(config) {
        if (this.isInitialized) {
            return;
        }
        logger_1.default.info('PuppeteerPool: 初始化Puppeteer池');
        // Start with minimum instances
        const initialSize = Math.min(this.config.maxSize, 2);
        for (let i = 0; i < initialSize; i++) {
            try {
                const instance = await this.createInstance(config);
                this.pool.push(instance);
                logger_1.default.debug(`PuppeteerPool: 创建实例 ${instance.id}`);
            }
            catch (error) {
                logger_1.default.error('PuppeteerPool: 创建实例失败:', error);
                logger_1.default.error(`错误详情: ${error instanceof Error ? error.message : String(error)}`);
                logger_1.default.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            }
        }
        this.startHealthCheck();
        this.isInitialized = true;
        logger_1.default.info(`PuppeteerPool: 池初始化完成，当前实例数: ${this.pool.length}/${this.config.maxSize}`);
    }
    async createInstance(config) {
        const instanceId = `puppeteer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        logger_1.default.info(`PuppeteerPool: 开始创建实例 ${instanceId}`);
        // 记录系统资源状态
        const memUsage = process.memoryUsage();
        logger_1.default.debug(`PuppeteerPool: 当前内存使用 - RSS: ${(memUsage.rss / 1024 / 1024).toFixed(1)}MB, Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
        const puppeteerArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-webgl',
            '--disable-3d-apis',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
            // Removed '--single-process' to improve stability
        ];
        // Add proxy if configured
        if (config?.proxy) {
            puppeteerArgs.push(`--proxy-server=${config.proxy}`);
            logger_1.default.debug(`PuppeteerPool: 使用代理 ${config.proxy}`);
        }
        logger_1.default.debug(`PuppeteerPool: 启动参数 ${puppeteerArgs.length} 个: ${puppeteerArgs.slice(0, 3).join(', ')}...`);
        logger_1.default.info(`PuppeteerPool: 正在启动浏览器 ${instanceId}`);
        // 在打包环境中使用系统Chrome/Chromium
        const launchOptions = {
            headless: true,
            args: puppeteerArgs,
            defaultViewport: { width: 1920, height: 1080 }
        };
        const systemChromePath = getPuppeteerExecutablePath();
        if (systemChromePath) {
            launchOptions.executablePath = systemChromePath;
            logger_1.default.info(`PuppeteerPool: 使用系统Chrome/Chromium: ${systemChromePath}`);
        }
        const browser = await puppeteer_core_1.default.launch(launchOptions);
        logger_1.default.info(`PuppeteerPool: 浏览器启动成功 ${instanceId}`);
        const page = await browser.newPage();
        // Set default headers
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        });
        // Set age verification cookies if available
        if (config?.headers?.Cookie) {
            const cookies = this.parseCookies(config.headers.Cookie);
            for (const cookie of cookies) {
                await page.setCookie(cookie);
            }
        }
        const instance = {
            browser,
            page,
            id: instanceId,
            createdAt: new Date(),
            lastUsed: new Date(),
            isAvailable: true,
            isHealthy: true
        };
        logger_1.default.info(`PuppeteerPool: 实例创建完成 ${instanceId}`);
        return instance;
    }
    parseCookies(cookieString) {
        const cookies = [];
        const cookiePairs = cookieString.split(';');
        for (const pair of cookiePairs) {
            const [name, value] = pair.trim().split('=');
            if (name && value) {
                cookies.push({
                    name: name.trim(),
                    value: value.trim(),
                    domain: '.javbus.com',
                    path: '/',
                    httpOnly: false,
                    secure: false
                });
            }
        }
        return cookies;
    }
    async getInstance(config, priority = 0) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            // Try to get available instance
            const availableInstance = this.getAvailableInstance();
            if (availableInstance) {
                availableInstance.isAvailable = false;
                availableInstance.lastUsed = new Date();
                resolve(availableInstance);
                return;
            }
            // If no available instance and pool is not full, create new one
            if (this.pool.length < this.config.maxSize) {
                this.createInstance(config)
                    .then(instance => {
                    this.pool.push(instance);
                    instance.isAvailable = false;
                    instance.lastUsed = new Date();
                    resolve(instance);
                })
                    .catch(reject);
                return;
            }
            // Add to queue
            const request = {
                id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                url: '',
                resolve,
                reject,
                createdAt: new Date(),
                priority
            };
            this.requestQueue.push(request);
            this.sortRequestQueue();
            // Set timeout
            setTimeout(() => {
                const index = this.requestQueue.findIndex(req => req.id === request.id);
                if (index !== -1) {
                    this.requestQueue.splice(index, 1);
                    reject(new Error('PuppeteerPool: 请求超时'));
                }
            }, this.config.requestTimeout);
        });
    }
    releaseInstance(instance) {
        const foundInstance = this.pool.find(inst => inst.id === instance.id);
        if (foundInstance) {
            foundInstance.isAvailable = true;
            foundInstance.lastUsed = new Date();
            // Process waiting queue
            this.processQueue();
        }
    }
    getAvailableInstance() {
        return this.pool.find(instance => instance.isAvailable && instance.isHealthy) || null;
    }
    sortRequestQueue() {
        this.requestQueue.sort((a, b) => b.priority - a.priority);
    }
    processQueue() {
        const availableInstance = this.getAvailableInstance();
        if (!availableInstance || this.requestQueue.length === 0) {
            return;
        }
        const request = this.requestQueue.shift();
        if (request) {
            availableInstance.isAvailable = false;
            availableInstance.lastUsed = new Date();
            request.resolve(availableInstance);
        }
    }
    async healthCheck() {
        const now = new Date();
        for (let i = this.pool.length - 1; i >= 0; i--) {
            const instance = this.pool[i];
            // Check if instance is too old
            if (now.getTime() - instance.createdAt.getTime() > 10 * 60 * 1000) { // 10 minutes max lifetime (减少内存泄漏)
                logger_1.default.info(`PuppeteerPool: 实例 ${instance.id} 已达到最大生命周期(10分钟)，准备销毁`);
                await this.destroyInstance(i);
                continue;
            }
            // Check if instance has been idle too long
            if (instance.isAvailable &&
                now.getTime() - instance.lastUsed.getTime() > this.config.maxIdleTime &&
                this.pool.length > 1) {
                logger_1.default.info(`PuppeteerPool: 实例 ${instance.id} 空闲时间过长，准备销毁`);
                await this.destroyInstance(i);
                continue;
            }
            // Health check
            if (!instance.isHealthy) {
                logger_1.default.warn(`PuppeteerPool: 实例 ${instance.id} 不健康，准备销毁`);
                await this.destroyInstance(i);
                continue;
            }
            // Ping browser to check if still responsive
            try {
                const process = await instance.browser.process();
                if (!process || process.killed) {
                    logger_1.default.warn(`PuppeteerPool: 实例 ${instance.id} 进程已终止，准备销毁`);
                    await this.destroyInstance(i);
                }
            }
            catch (error) {
                logger_1.default.error(`PuppeteerPool: 检查实例 ${instance.id} 健康状态失败: ${error instanceof Error ? error.message : String(error)}`);
                instance.isHealthy = false;
            }
        }
        // Ensure minimum pool size
        if (this.pool.length === 0) {
            logger_1.default.warn('PuppeteerPool: 池为空，创建新实例');
            try {
                const instance = await this.createInstance();
                this.pool.push(instance);
                logger_1.default.info(`PuppeteerPool: 重建实例 ${instance.id}`);
            }
            catch (error) {
                logger_1.default.error('PuppeteerPool: 重建实例失败:', error);
                logger_1.default.error(`重建错误详情: ${error instanceof Error ? error.message : String(error)}`);
                logger_1.default.error(`重建错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            }
        }
    }
    async destroyInstance(index) {
        const instance = this.pool[index];
        const beforeMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        try {
            // 关闭页面
            if (instance.page && !instance.page.isClosed()) {
                await instance.page.close();
                logger_1.default.debug(`PuppeteerPool: 页面 ${instance.id} 已关闭`);
            }
            // 关闭浏览器
            if (instance.browser && !instance.browser.process().killed) {
                await instance.browser.close();
                logger_1.default.debug(`PuppeteerPool: 浏览器 ${instance.id} 已关闭`);
            }
            // 强制垃圾回收提示（如果可用）
            if (global.gc) {
                global.gc();
            }
            logger_1.default.debug(`PuppeteerPool: 销毁实例 ${instance.id} 完成，内存释放: ${beforeMemory.toFixed(1)}MB`);
        }
        catch (error) {
            logger_1.default.error(`PuppeteerPool: 销毁实例 ${instance.id} 失败:`, error);
            logger_1.default.error(`销毁错误详情: ${error instanceof Error ? error.message : String(error)}`);
        }
        this.pool.splice(index, 1);
        const afterMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        logger_1.default.debug(`PuppeteerPool: 销毁后内存使用: ${afterMemory.toFixed(1)}MB`);
    }
    startHealthCheck() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        this.healthCheckTimer = setInterval(async () => {
            await this.healthCheck();
        }, this.config.healthCheckInterval);
    }
    getStats() {
        const available = this.pool.filter(instance => instance.isAvailable && instance.isHealthy).length;
        const inUse = this.pool.filter(instance => !instance.isAvailable).length;
        return {
            total: this.pool.length,
            available,
            inUse,
            queueLength: this.requestQueue.length
        };
    }
    async shutdown() {
        logger_1.default.info('PuppeteerPool: 关闭所有实例');
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        for (const instance of this.pool) {
            try {
                if (instance.browser && !instance.browser.process().killed) {
                    await instance.browser.close();
                }
            }
            catch (error) {
                logger_1.default.error(`PuppeteerPool: 关闭实例 ${instance.id} 失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        this.pool = [];
        this.requestQueue = [];
        this.isInitialized = false;
    }
}
exports.PuppeteerPool = PuppeteerPool;
//# sourceMappingURL=puppeteerPool.js.map