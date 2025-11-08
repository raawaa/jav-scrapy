"use strict";
/**
 * Cloudflare Bypass Handler
 * 使用 Puppeteer 绕过 Cloudflare 保护
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const logger_1 = __importDefault(require("../core/logger"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Handle Puppeteer configuration for packaged environments
const getPuppeteerExecutablePath = () => {
    // Check if running in packaged environment
    // NOTE: Binary packaging support removed - keeping for reference
    /*
    if ((process as any).pkg) {
      // In packaged environment, try to find system Chrome/Chromium
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
        // Linux
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/local/bin/chrome',
        '/usr/local/bin/chromium'
      ];
  
      for (const browserPath of possiblePaths) {
        const expandedPath = browserPath.replace('%USERNAME%', process.env.USERNAME || '');
        if (fs.existsSync(expandedPath)) {
          return expandedPath;
        }
      }
  
      logger.warn('Running in packaged environment but no system Chrome/Chromium found. Puppeteer may fail to launch.');
      return undefined;
    }
    */
    return undefined;
};
class CloudflareBypass {
    constructor(config = {}) {
        this.browser = null;
        this.page = null;
        this.puppeteerPool = null;
        this.currentInstance = null;
        this.config = {
            headless: config.headless !== false, // 默认无头模式
            timeout: config.timeout || 45000, // 增加到45秒，给Cloudflare挑战更多时间
            viewport: config.viewport || { width: 1920, height: 1080 },
            userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            proxy: config.proxy
        };
        this.puppeteerPool = config.puppeteerPool || null;
    }
    /**
  
     * 初始化浏览器
  
     */
    async init() {
        try {
            logger_1.default.info('正在初始化 Cloudflare 绕过器...');
            // 如果有共享池，使用共享池
            if (this.puppeteerPool) {
                logger_1.default.info('使用共享 Puppeteer 池');
                await this.puppeteerPool.initialize();
                return;
            }
            // 否则创建独立实例（向后兼容）
            logger_1.default.info('创建独立的 Puppeteer 实例');
            const launchOptions = {
                headless: this.config.headless,
                args: [
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
                ]
            };
            // 在打包环境中使用系统Chrome/Chromium
            const systemChromePath = getPuppeteerExecutablePath();
            if (systemChromePath) {
                launchOptions.executablePath = systemChromePath;
                logger_1.default.info(`使用系统Chrome/Chromium: ${systemChromePath}`);
            }
            // 配置代理
            if (this.config.proxy) {
                try {
                    const proxyUrl = new URL(this.config.proxy);
                    launchOptions.args.push(`--proxy-server=${proxyUrl.protocol}//${proxyUrl.hostname}:${proxyUrl.port}`);
                    logger_1.default.info(`使用代理: ${this.config.proxy}`);
                    logger_1.default.debug(`代理配置详情: protocol=${proxyUrl.protocol}, hostname=${proxyUrl.hostname}, port=${proxyUrl.port}`);
                }
                catch (error) {
                    // 尝试手动解析代理URL格式
                    if (typeof this.config.proxy === 'string') {
                        // 支持如 "http://127.0.0.1:10809" 或 "127.0.0.1:10809" 的格式
                        let proxyMatch = this.config.proxy.match(/^https?:\/\/(.+)$/i);
                        if (proxyMatch) {
                            launchOptions.args.push(`--proxy-server=${proxyMatch[1]}`);
                            logger_1.default.info(`使用代理 (手动解析): ${this.config.proxy}`);
                            logger_1.default.debug(`代理配置详情 (手动解析): ${proxyMatch[1]}`);
                        }
                        else {
                            launchOptions.args.push(`--proxy-server=${this.config.proxy}`);
                            logger_1.default.info(`使用代理 (直接使用): ${this.config.proxy}`);
                            logger_1.default.debug(`代理配置详情 (直接使用): ${this.config.proxy}`);
                        }
                    }
                    else {
                        logger_1.default.warn(`代理配置无效: ${this.config.proxy}`);
                    }
                }
            }
            logger_1.default.debug(`Puppeteer 启动参数: ${JSON.stringify(launchOptions, null, 2)}`);
            this.browser = await puppeteer_core_1.default.launch(launchOptions);
            logger_1.default.debug(`Puppeteer 浏览器已启动，进程ID: ${this.browser.process().pid}`);
            this.page = await this.browser.newPage();
            logger_1.default.debug(`Puppeteer 页面已创建`);
            // 设置视口
            await this.page.setViewport(this.config.viewport);
            logger_1.default.debug(`页面视口已设置: ${JSON.stringify(this.config.viewport)}`);
            // 设置User-Agent
            await this.page.setUserAgent(this.config.userAgent);
            logger_1.default.debug(`User-Agent 已设置: ${this.config.userAgent}`);
            // 设置超时
            this.page.setDefaultTimeout(this.config.timeout);
            logger_1.default.debug(`页面超时已设置: ${this.config.timeout}ms`);
            // 设置年龄认证相关的Cookie
            await this.page.setExtraHTTPHeaders({
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            });
            logger_1.default.debug('额外HTTP头已设置');
            // 设置年龄认证相关的Cookie（在访问页面之前）
            const cookiesToSet = [
                {
                    name: 'age_verified',
                    value: 'true',
                    domain: '.javbus.com',
                    path: '/',
                    expires: Date.now() + 31536000000 // 1年后过期
                },
                {
                    name: 'adult_verified',
                    value: 'true',
                    domain: '.javbus.com',
                    path: '/',
                    expires: Date.now() + 31536000000
                },
                {
                    name: 'age_verification',
                    value: '1',
                    domain: '.javbus.com',
                    path: '/',
                    expires: Date.now() + 31536000000
                },
                {
                    name: 'is_adult',
                    value: 'true',
                    domain: '.javbus.com',
                    path: '/',
                    expires: Date.now() + 31536000000
                },
                {
                    name: 'javbus_age',
                    value: '1',
                    domain: '.javbus.com',
                    path: '/',
                    expires: Date.now() + 31536000000
                }
            ];
            try {
                await this.page.setCookie(...cookiesToSet);
                logger_1.default.debug('年龄认证相关的Cookie已设置');
            }
            catch (error) {
                logger_1.default.warn(`设置Cookie失败: ${error instanceof Error ? error.message : String(error)}`);
                // 设置Cookie失败不应该阻止程序继续运行
            }
            logger_1.default.info('Puppeteer 浏览器启动成功');
        }
        catch (error) {
            logger_1.default.error(`启动 Puppeteer 失败: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            // 记录完整的错误信息
            logger_1.default.debug(`init: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 记录系统环境信息
            try {
                logger_1.default.debug(`init: 系统平台: ${process.platform}`);
                logger_1.default.debug(`init: Node.js版本: ${process.version}`);
                logger_1.default.debug(`init: 当前工作目录: ${process.cwd()}`);
                logger_1.default.debug(`init: 内存使用: ${JSON.stringify(process.memoryUsage(), null, 2)}`);
                // 记录Puppeteer配置信息
                logger_1.default.debug(`init: Puppeteer配置: ${JSON.stringify(this.config, null, 2)}`);
                // 检查是否有其他浏览器进程
                const { execSync } = require('child_process');
                try {
                    if (process.platform === 'win32') {
                        const processes = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV', { encoding: 'utf8' });
                        logger_1.default.debug(`init: Chrome进程列表: ${processes}`);
                    }
                    else if (process.platform === 'linux') {
                        const processes = execSync('ps aux | grep chrome', { encoding: 'utf8' });
                        logger_1.default.debug(`init: Chrome进程列表: ${processes}`);
                    }
                }
                catch (processError) {
                    logger_1.default.debug(`init: 获取Chrome进程列表失败: ${processError instanceof Error ? processError.message : String(processError)}`);
                }
            }
            catch (envError) {
                logger_1.default.debug(`init: 获取环境信息失败: ${envError instanceof Error ? envError.message : String(envError)}`);
            }
            // 清理可能已创建的资源
            try {
                if (this.page) {
                    await this.page.close();
                    this.page = null;
                    logger_1.default.debug('init: 已清理页面资源');
                }
            }
            catch (pageCloseError) {
                logger_1.default.debug(`init: 清理页面资源失败: ${pageCloseError instanceof Error ? pageCloseError.message : String(pageCloseError)}`);
            }
            try {
                if (this.browser) {
                    await this.browser.close();
                    this.browser = null;
                    logger_1.default.debug('init: 已清理浏览器资源');
                }
            }
            catch (browserCloseError) {
                logger_1.default.debug(`init: 清理浏览器资源失败: ${browserCloseError instanceof Error ? browserCloseError.message : String(browserCloseError)}`);
            }
            throw error;
        }
    }
    /**
     * 访问页面并绕过 Cloudflare
     */
    async bypassCloudflare(url) {
        try {
            // 如果有共享池，从池中获取实例
            if (this.puppeteerPool) {
                logger_1.default.debug(`从共享池获取 Puppeteer 实例: ${url}`);
                // 简化实例获取，只传递优先级
                this.currentInstance = await this.puppeteerPool.getInstance(undefined, 1); // 高优先级
                this.page = this.currentInstance.page;
                // 验证页面是否正确获取
                if (!this.page || !this.currentInstance) {
                    throw new Error('从共享池获取的页面实例为 null');
                }
                logger_1.default.debug(`成功获取 Puppeteer 实例: ${this.currentInstance.id}`);
            }
            else if (!this.page) {
                throw new Error('请先调用 init() 方法初始化浏览器');
            }
        }
        catch (error) {
            logger_1.default.error('获取 Puppeteer 实例失败:', error);
            logger_1.default.error(`错误详情: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
        try {
            logger_1.default.info(`正在访问页面: ${url}`);
            logger_1.default.debug(`页面访问参数: waitUntil=domcontentloaded, timeout=${this.config.timeout}`);
            // 记录开始时间，用于计算实际耗时
            const pageAccessStartTime = Date.now();
            // 访问页面 - 使用 load 等待策略确保 DOM 完全加载
            logger_1.default.debug(`[TIMING] 开始导航到页面: ${new Date().toISOString()}`);
            const response = await this.page.goto(url, {
                waitUntil: 'load',
                timeout: this.config.timeout
            });
            const loadTime = Date.now() - pageAccessStartTime;
            logger_1.default.debug(`[TIMING] load 完成，耗时: ${loadTime}ms`);
            if (!response) {
                throw new Error('页面响应为空');
            }
            const status = response.status();
            const headers = response.headers();
            const totalAccessTime = Date.now() - pageAccessStartTime;
            logger_1.default.info(`页面状态码: ${status} (总耗时: ${totalAccessTime}ms)`);
            logger_1.default.debug(`页面响应头: ${JSON.stringify(headers, null, 2)}`);
            // 检查是否有 Cloudflare 挑战页面
            const hasCloudflareChallenge = await this.page.evaluate(() => {
                // 检查常见的 Cloudflare 挑战标识
                const challenges = [
                    'cf-browser-verification',
                    'cf-im-under-attack',
                    'cf-challenge-running',
                    'cloudflare-turnstile',
                    'jschl_vc',
                    'pass',
                    'captcha-bypass'
                ];
                return challenges.some(challenge => document.body.innerHTML.includes(challenge) ||
                    document.title.includes('Just a moment') ||
                    document.title.includes('DDoS protection') ||
                    window.location.href.includes('challenge'));
            });
            // 检查是否有年龄认证页面
            const hasAgeVerification = await this.page.evaluate(() => {
                // 检查常见的年龄认证标识
                const ageVerificationIndicators = [
                    'Age Verification',
                    '年龄认证',
                    'age verification',
                    '18+',
                    'adult content',
                    'adult only'
                ];
                return ageVerificationIndicators.some(indicator => document.title.includes(indicator) ||
                    document.body.innerText.toLowerCase().includes(indicator.toLowerCase()));
            });
            logger_1.default.debug(`Cloudflare 挑战检测结果: ${hasCloudflareChallenge}`);
            logger_1.default.debug(`年龄认证检测结果: ${hasAgeVerification}`);
            if (hasCloudflareChallenge) {
                logger_1.default.info('检测到 Cloudflare 挑战，正在等待解决...');
                // 等待 Cloudflare 挑战完成
                await this.waitForCloudflareChallenge();
                logger_1.default.info('Cloudflare 挑战已解决');
            }
            else if (hasAgeVerification) {
                logger_1.default.info('检测到年龄认证页面，正在尝试处理...');
                // 尝试处理年龄认证
                await this.handleAgeVerification();
                logger_1.default.info('年龄认证处理完成');
            }
            else {
                logger_1.default.debug('未检测到 Cloudflare 挑战或年龄认证');
            }
            // 获取最终的页面内容
            const content = await this.page.content();
            logger_1.default.debug(`页面内容长度: ${content.length}`);
            // 获取当前页面的 Cookies
            const cookies = await this.page.cookies();
            const cookieString = cookies
                .map((cookie) => `${cookie.name}=${cookie.value}`)
                .join('; ');
            logger_1.default.info(`获取到 ${cookies.length} 个 Cookies`);
            logger_1.default.debug(`Cookies 详情: ${JSON.stringify(cookies, null, 2)}`);
            // 如果使用共享池，释放实例回池
            if (this.puppeteerPool && this.currentInstance) {
                logger_1.default.debug(`释放 Puppeteer 实例回共享池: ${this.currentInstance.id}`);
                this.puppeteerPool.releaseInstance(this.currentInstance);
                this.currentInstance = null;
                this.page = null;
            }
            return content;
        }
        catch (error) {
            logger_1.default.error(`绕过 Cloudflare 失败: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            // 记录完整的错误信息
            logger_1.default.debug(`bypassCloudflare: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 尝试获取当前页面信息
            try {
                if (this.page) {
                    const pageUrl = this.page.url();
                    const pageTitle = await this.page.title();
                    const pageContent = await this.page.content();
                    logger_1.default.debug(`bypassCloudflare: 当前页面URL: ${pageUrl}`);
                    logger_1.default.debug(`bypassCloudflare: 当前页面标题: ${pageTitle}`);
                    logger_1.default.debug(`bypassCloudflare: 页面内容长度: ${pageContent.length}`);
                    // 记录页面内容的前2000个字符（增加内容长度）
                    if (pageContent.length > 0) {
                        logger_1.default.debug(`bypassCloudflare: 页面内容前2000字符:\n${pageContent.substring(0, 2000)}`);
                    }
                    // 如果内容较短，记录更多内容
                    if (pageContent.length < 5000 && pageContent.length > 0) {
                        logger_1.default.debug(`bypassCloudflare: 完整页面内容:\n${pageContent}`);
                    }
                    // 检查是否有特定的错误页面
                    const hasCloudflareError = pageContent.includes('cf-error-details') ||
                        pageContent.includes('Cloudflare Ray ID') ||
                        pageContent.includes('error code:');
                    if (hasCloudflareError) {
                        logger_1.default.debug(`bypassCloudflare: 检测到Cloudflare错误页面`);
                    }
                    // 检查是否有年龄认证页面
                    const hasAgeVerification = pageContent.includes('Age Verification') ||
                        pageContent.includes('年龄认证') ||
                        pageContent.includes('age verification');
                    if (hasAgeVerification) {
                        logger_1.default.debug(`bypassCloudflare: 检测到年龄认证页面`);
                    }
                    // 额外检查：是否有特定的 Cloudflare 提示
                    const hasJustAMoment = pageContent.includes('Just a moment') ||
                        pageContent.includes('Please enable cookies') ||
                        pageContent.includes('Checking your browser');
                    if (hasJustAMoment) {
                        logger_1.default.debug(`bypassCloudflare: 检测到Cloudflare检查提示页面`);
                    }
                    // 记录页面关键元素
                    try {
                        const pageInfo = await this.page.evaluate(() => {
                            return {
                                title: document.title,
                                url: window.location.href,
                                readyState: document.readyState,
                                bodyLength: document.body ? document.body.innerHTML.length : 0,
                                hasJQuery: typeof window.jQuery !== 'undefined',
                                scriptsCount: document.scripts.length,
                                imagesCount: document.images.length,
                                linksCount: document.links.length
                            };
                        });
                        logger_1.default.debug(`bypassCloudflare: 页面详细状态: ${JSON.stringify(pageInfo, null, 2)}`);
                    }
                    catch (evalError) {
                        logger_1.default.debug(`bypassCloudflare: 获取页面详细状态失败: ${evalError instanceof Error ? evalError.message : String(evalError)}`);
                    }
                }
            }
            catch (pageInfoError) {
                logger_1.default.debug(`bypassCloudflare: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
            }
            // 确保在错误情况下也释放实例回池
            if (this.puppeteerPool && this.currentInstance) {
                logger_1.default.debug(`错误情况下释放 Puppeteer 实例回共享池: ${this.currentInstance.id}`);
                this.puppeteerPool.releaseInstance(this.currentInstance);
                this.currentInstance = null;
                this.page = null;
            }
            throw error;
        }
    }
    /**
     * 获取当前页面的 Cookies
     * 如果 page 为空，会自动重新获取页面实例
     */
    async getCookies() {
        if (!this.page) {
            logger_1.default.warn('getCookies: page 为空，可能需要重新获取页面实例');
            // 如果有共享池，尝试重新获取一个实例
            if (this.puppeteerPool) {
                try {
                    logger_1.default.debug('getCookies: 正在从共享池重新获取页面实例...');
                    this.currentInstance = await this.puppeteerPool.getInstance(undefined, 1); // 高优先级
                    this.page = this.currentInstance.page;
                    if (!this.page || !this.currentInstance) {
                        throw new Error('从共享池重新获取页面实例失败');
                    }
                    logger_1.default.debug(`getCookies: 成功重新获取页面实例: ${this.currentInstance.id}`);
                }
                catch (poolError) {
                    logger_1.default.error(`getCookies: 从共享池重新获取页面实例失败: ${poolError instanceof Error ? poolError.message : String(poolError)}`);
                    throw new Error('无法获取页面实例来获取 Cookies，请确保 Puppeteer 池可用');
                }
            }
            else {
                throw new Error('请先调用 bypassCloudflare() 方法获取页面实例');
            }
        }
        try {
            const cookies = await this.page.cookies();
            // 记录所有获取到的cookies，用于调试
            logger_1.default.debug(`getCookies: 获取到的所有cookies:`);
            cookies.forEach((cookie) => {
                logger_1.default.debug(`  ${cookie.name}=${cookie.value} (domain: ${cookie.domain}, path: ${cookie.path})`);
            });
            // 确保包含年龄验证相关的cookies
            const ageVerificationCookies = ['age_verified', 'adult_verified', 'age_verification_passed', 'is_adult', 'verified_adult'];
            const hasAgeVerificationCookies = ageVerificationCookies.some(name => cookies.some((cookie) => cookie.name === name));
            if (!hasAgeVerificationCookies) {
                logger_1.default.warn('getCookies: 未找到年龄验证相关的cookies，可能影响图片下载');
                // 尝试重新设置年龄验证cookies
                await this.setAgeVerificationCookies();
                // 重新获取cookies
                const updatedCookies = await this.page.cookies();
                logger_1.default.debug(`getCookies: 重新设置后获取到的cookies数量: ${updatedCookies.length}`);
                const cookieString = updatedCookies
                    .map((cookie) => `${cookie.name}=${cookie.value}`)
                    .join('; ');
                logger_1.default.info(`获取到 ${updatedCookies.length} 个 Cookies (包含年龄验证)`);
                return cookieString;
            }
            const cookieString = cookies
                .map((cookie) => `${cookie.name}=${cookie.value}`)
                .join('; ');
            logger_1.default.info(`获取到 ${cookies.length} 个 Cookies`);
            return cookieString;
        }
        catch (error) {
            logger_1.default.error(`获取 Cookies 失败: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
    /**
     * 使用页面执行 AJAX 请求
     */
    async executeAjax(url) {
        const ajaxStartTime = Date.now();
        logger_1.default.debug(`executeAjax: 开始执行 AJAX 请求: ${url}`);
        // 从 Puppeteer 池获取页面实例
        let instance = null;
        let page = null;
        try {
            if (!this.puppeteerPool) {
                throw new Error('executeAjax: Puppeteer 池未初始化');
            }
            logger_1.default.debug(`executeAjax: 从池中获取页面实例用于 AJAX 请求`);
            instance = await this.puppeteerPool.getInstance();
            page = instance.page;
            logger_1.default.debug(`executeAjax: 成功获取页面实例 ${instance.id}`);
            logger_1.default.info(`executeAjax: 执行 AJAX 请求: ${url}`);
            logger_1.default.debug(`executeAjax: AJAX 请求详情: withCredentials=true`);
            // 确保在正确的页面上下文中执行AJAX请求
            // 首先检查当前页面的URL是否与AJAX请求的域名匹配
            const currentUrl = page.url();
            const ajaxUrlObj = new URL(url);
            const currentUrlObj = new URL(currentUrl);
            logger_1.default.debug(`executeAjax: 当前页面URL: ${currentUrl}`);
            logger_1.default.debug(`executeAjax: AJAX请求URL: ${url}`);
            logger_1.default.debug(`executeAjax: 域名匹配检查: 当前=${currentUrlObj.hostname}, AJAX=${ajaxUrlObj.hostname}`);
            if (ajaxUrlObj.hostname !== currentUrlObj.hostname) {
                logger_1.default.warn(`executeAjax: AJAX域名不匹配，当前页面: ${currentUrlObj.hostname}, AJAX请求: ${ajaxUrlObj.hostname}`);
                // 导航到正确的域名页面 - 使用更短的超时和 domcontentloaded
                const navigationStart = Date.now();
                logger_1.default.debug(`executeAjax: 正在导航到: ${ajaxUrlObj.protocol}//${ajaxUrlObj.hostname}/`);
                const ajaxTimeout = this.config.timeout || 45000;
                try {
                    await page.goto(`${ajaxUrlObj.protocol}//${ajaxUrlObj.hostname}/`, {
                        waitUntil: 'domcontentloaded',
                        timeout: Math.max(ajaxTimeout, 15000) // AJAX导航使用15秒超时
                    });
                }
                catch (navError) {
                    logger_1.default.warn(`executeAjax: domcontentloaded 失败，尝试 load: ${navError instanceof Error ? navError.message : String(navError)}`);
                    await page.goto(`${ajaxUrlObj.protocol}//${ajaxUrlObj.hostname}/`, {
                        waitUntil: 'load',
                        timeout: Math.max(ajaxTimeout, 15000)
                    });
                }
                const navigationTime = Date.now() - navigationStart;
                logger_1.default.debug(`executeAjax: 页面导航完成 (耗时: ${Math.round(navigationTime / 1000)}s)`);
                // 等待一段时间确保页面完全加载
                logger_1.default.debug(`executeAjax: 等待2秒确保页面完全加载`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                logger_1.default.debug(`executeAjax: 页面稳定等待完成`);
            }
            // 使用原生JavaScript Promise，避免TypeScript编译后的__awaiter问题
            // 在页面上下文中直接执行AJAX请求，这样可以正确使用页面的cookies
            logger_1.default.debug(`executeAjax: 在页面上下文中执行AJAX请求`);
            const evaluateStart = Date.now();
            const result = await page.evaluate((ajaxUrl) => {
                return new Promise(function (resolve, reject) {
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', ajaxUrl, true);
                    xhr.withCredentials = true;
                    // 设置正确的请求头
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    xhr.setRequestHeader('Accept', '*/*');
                    xhr.setRequestHeader('Cache-Control', 'no-cache');
                    xhr.setRequestHeader('Pragma', 'no-cache');
                    xhr.onload = function () {
                        if (xhr.status === 200) {
                            resolve({
                                status: xhr.status,
                                statusText: xhr.statusText,
                                responseText: xhr.responseText,
                                headers: xhr.getAllResponseHeaders()
                            });
                        }
                        else {
                            reject(new Error('AJAX 请求失败: ' + xhr.status + ' ' + xhr.statusText));
                        }
                    };
                    xhr.onerror = function () {
                        reject(new Error('AJAX 网络错误'));
                    };
                    xhr.send();
                });
            }, url);
            const evaluateTime = Date.now() - evaluateStart;
            const ajaxResult = result;
            const totalTime = Date.now() - ajaxStartTime;
            logger_1.default.info(`executeAjax: AJAX 请求成功，状态码: ${ajaxResult.status}`);
            logger_1.default.debug(`executeAjax: AJAX 响应详情: status=${ajaxResult.status}, statusText=${ajaxResult.statusText}, responseLength=${ajaxResult.responseText.length}`);
            logger_1.default.debug(`executeAjax: 执行耗时: ${Math.round(evaluateTime / 1000)}s, 总耗时: ${Math.round(totalTime / 1000)}s`);
            logger_1.default.debug(`executeAjax: AJAX 响应头: ${ajaxResult.headers}`);
            // 如果响应内容较短，记录完整内容
            if (ajaxResult.responseText.length < 1000) {
                logger_1.default.debug(`executeAjax: AJAX 响应内容: ${ajaxResult.responseText}`);
            }
            else {
                logger_1.default.debug(`executeAjax: AJAX 响应内容 (前500字符): ${ajaxResult.responseText.substring(0, 500)}`);
            }
            return ajaxResult.responseText;
        }
        catch (error) {
            const totalTime = Date.now() - ajaxStartTime;
            logger_1.default.error(`executeAjax: AJAX 请求失败 (耗时: ${Math.round(totalTime / 1000)}s)`);
            logger_1.default.error(`executeAjax: 错误详情: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`executeAjax: 错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            logger_1.default.error(`executeAjax: 错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            // 记录完整的错误信息
            logger_1.default.debug(`executeAjax: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 检查浏览器进程状态
            try {
                if (page && instance) {
                    const browser = instance.browser;
                    if (browser && browser.process()) {
                        logger_1.default.debug(`executeAjax: 浏览器进程状态: PID=${browser.process().pid}, 是否连接=${browser.isConnected()}`);
                    }
                    else {
                        logger_1.default.warn('executeAjax: 浏览器进程不可用');
                    }
                }
                else {
                    logger_1.default.warn('executeAjax: 页面实例不可用，无法检查浏览器进程状态');
                }
            }
            catch (processError) {
                logger_1.default.warn(`executeAjax: 检查浏览器进程失败: ${processError instanceof Error ? processError.message : String(processError)}`);
            }
            // 获取页面错误信息
            if (page) {
                try {
                    const pageErrors = await page.evaluate(() => {
                        // 尝试获取页面上的错误信息
                        const errorElements = Array.from(document.querySelectorAll('body *')).filter(el => el.textContent && (el.textContent.includes('error') || el.textContent.includes('Error') || el.textContent.includes('403') || el.textContent.includes('Forbidden')));
                        return errorElements.map(el => el.textContent).slice(0, 5); // 只返回前5个错误信息
                    });
                    if (pageErrors && pageErrors.length > 0) {
                        logger_1.default.debug(`executeAjax: 页面错误信息: ${JSON.stringify(pageErrors, null, 2)}`);
                    }
                }
                catch (pageError) {
                    logger_1.default.debug(`executeAjax: 获取页面错误信息失败: ${pageError instanceof Error ? pageError.message : String(pageError)}`);
                }
                // 尝试获取页面内容和URL
                try {
                    const pageUrl = page.url();
                    const pageTitle = await page.title();
                    const pageContent = await page.content();
                    logger_1.default.debug(`executeAjax: 当前页面URL: ${pageUrl}`);
                    logger_1.default.debug(`executeAjax: 当前页面标题: ${pageTitle}`);
                    logger_1.default.debug(`executeAjax: 页面内容长度: ${pageContent.length}`);
                    // 记录页面内容的前1000个字符
                    if (pageContent.length > 0) {
                        logger_1.default.debug(`executeAjax: 页面内容前1000字符: ${pageContent.substring(0, 1000)}`);
                    }
                }
                catch (pageInfoError) {
                    logger_1.default.debug(`executeAjax: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
                }
            }
            throw error;
        }
        finally {
            // 确保页面实例被释放回池
            if (instance && this.puppeteerPool) {
                logger_1.default.debug(`executeAjax: 释放页面实例 ${instance.id} 回池`);
                this.puppeteerPool.releaseInstance(instance);
            }
        }
    }
    /**
     * 等待 Cloudflare 挑战完成
     */
    async waitForCloudflareChallenge() {
        if (!this.page)
            return;
        const challengeStartTime = Date.now();
        logger_1.default.debug(`[CHALLENGE] 开始等待Cloudflare挑战完成...`);
        try {
            // 等待挑战页面消失
            logger_1.default.debug(`[CHALLENGE] 等待挑战页面消失 (最长60秒)...`);
            const challengeResult = await this.page.waitForFunction(() => {
                const hasBrowserVerification = document.body.innerHTML.includes('cf-browser-verification');
                const hasUnderAttack = document.body.innerHTML.includes('cf-im-under-attack');
                const hasJustAMoment = document.title.includes('Just a moment');
                const hasDdosProtection = document.title.includes('DDoS protection');
                return !hasBrowserVerification && !hasUnderAttack && !hasJustAMoment && !hasDdosProtection;
            }, { timeout: 60000 });
            const challengeTime = Date.now() - challengeStartTime;
            logger_1.default.debug(`[CHALLENGE] 挑战完成，耗时: ${challengeTime}ms`);
            // 额外等待一段时间确保页面完全加载
            logger_1.default.debug(`[CHALLENGE] 等待3秒确保页面完全加载...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            logger_1.default.debug(`[CHALLENGE] 等待完成`);
        }
        catch (error) {
            const challengeTime = Date.now() - challengeStartTime;
            logger_1.default.warn(`[CHALLENGE] 等待 Cloudflare 挑战超时 (耗时: ${challengeTime}ms): ${error instanceof Error ? error.message : String(error)}`);
            // 记录完整的错误信息
            logger_1.default.debug(`waitForCloudflareChallenge: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            logger_1.default.debug(`waitForCloudflareChallenge: 错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            logger_1.default.debug(`waitForCloudflareChallenge: 错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            // 尝试获取当前页面信息
            try {
                if (this.page) {
                    const pageUrl = this.page.url();
                    const pageTitle = await this.page.title();
                    const pageContent = await this.page.content();
                    logger_1.default.debug(`[CHALLENGE-TIMEOUT] 当前页面URL: ${pageUrl}`);
                    logger_1.default.debug(`[CHALLENGE-TIMEOUT] 当前页面标题: ${pageTitle}`);
                    logger_1.default.debug(`[CHALLENGE-TIMEOUT] 页面内容长度: ${pageContent.length}`);
                    // 记录页面内容的前1500个字符
                    if (pageContent.length > 0) {
                        logger_1.default.debug(`[CHALLENGE-TIMEOUT] 页面内容前1500字符:\n${pageContent.substring(0, 1500)}`);
                    }
                    // 检查是否有特定的Cloudflare挑战页面
                    const hasChallenge = pageContent.includes('cf-browser-verification') ||
                        pageContent.includes('cf-im-under-attack') ||
                        pageContent.includes('Just a moment') ||
                        pageContent.includes('DDoS protection');
                    if (hasChallenge) {
                        logger_1.default.debug(`[CHALLENGE-TIMEOUT] 仍在Cloudflare挑战页面`);
                        // 记录具体的挑战标识
                        if (pageContent.includes('cf-browser-verification')) {
                            logger_1.default.debug(`[CHALLENGE-TIMEOUT] 检测到: cf-browser-verification`);
                        }
                        if (pageContent.includes('cf-im-under-attack')) {
                            logger_1.default.debug(`[CHALLENGE-TIMEOUT] 检测到: cf-im-under-attack`);
                        }
                        if (pageTitle.includes('Just a moment')) {
                            logger_1.default.debug(`[CHALLENGE-TIMEOUT] 检测到: Just a moment (title)`);
                        }
                        if (pageTitle.includes('DDoS protection')) {
                            logger_1.default.debug(`[CHALLENGE-TIMEOUT] 检测到: DDoS protection (title)`);
                        }
                    }
                    // 检查是否有年龄认证页面
                    const hasAgeVerification = pageContent.includes('Age Verification') ||
                        pageContent.includes('年龄认证') ||
                        pageContent.includes('age verification');
                    if (hasAgeVerification) {
                        logger_1.default.debug(`[CHALLENGE-TIMEOUT] 检测到年龄认证页面`);
                    }
                    // 检查是否有错误页面
                    const hasError = pageContent.includes('cf-error-details') ||
                        pageContent.includes('Cloudflare Ray ID') ||
                        pageContent.includes('error code:');
                    if (hasError) {
                        logger_1.default.debug(`[CHALLENGE-TIMEOUT] 检测到Cloudflare错误页面`);
                    }
                    // 记录页面状态信息
                    try {
                        const pageState = await this.page.evaluate(() => {
                            return {
                                readyState: document.readyState,
                                title: document.title,
                                url: window.location.href,
                                bodyLength: document.body ? document.body.innerHTML.length : 0,
                                hasJQuery: typeof window.jQuery !== 'undefined',
                                scriptsCount: document.scripts.length,
                                imagesCount: document.images.length,
                                linksCount: document.links.length
                            };
                        });
                        logger_1.default.debug(`[CHALLENGE-TIMEOUT] 页面状态: ${JSON.stringify(pageState, null, 2)}`);
                    }
                    catch (stateError) {
                        logger_1.default.debug(`[CHALLENGE-TIMEOUT] 获取页面状态失败: ${stateError instanceof Error ? stateError.message : String(stateError)}`);
                    }
                }
            }
            catch (pageInfoError) {
                logger_1.default.debug(`waitForCloudflareChallenge: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
            }
        }
    }
    /**
     * 处理年龄认证页面
     */
    async handleAgeVerification() {
        if (!this.page)
            return;
        try {
            logger_1.default.info('开始处理年龄认证页面');
            // 尝试查找并点击年龄认证按钮
            const ageButtonClicked = await this.page.evaluate(() => {
                // 查找可能的年龄认证按钮
                const possibleSelectors = [
                    'button[type="submit"]',
                    'button:contains("Enter")',
                    'button:contains("进入")',
                    'button:contains("I am over 18")',
                    'button:contains("我已满18岁")',
                    'button:contains("Yes")',
                    'button:contains("是")',
                    'input[type="submit"]',
                    'a:contains("Enter")',
                    'a:contains("进入")',
                    'a:contains("I am over 18")',
                    'a:contains("我已满18岁")',
                    'a:contains("Yes")',
                    'a:contains("是")',
                    '.btn-primary',
                    '.btn-success',
                    '.age-verify-btn',
                    '.enter-btn',
                    '.verification-btn',
                    '#enter',
                    '#age-verify',
                    '#confirm-age',
                    '#age-verification'
                ];
                // 尝试通过文本内容查找按钮
                const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
                for (const button of allButtons) {
                    const text = button.textContent?.toLowerCase() || '';
                    if (text.includes('enter') || text.includes('进入') ||
                        text.includes('18') || text.includes('yes') || text.includes('是') ||
                        text.includes('confirm') || text.includes('确认')) {
                        button.click();
                        return true;
                    }
                }
                // 尝试通过选择器查找按钮
                for (const selector of possibleSelectors) {
                    try {
                        const element = document.querySelector(selector);
                        if (element) {
                            element.click();
                            return true;
                        }
                    }
                    catch (e) {
                        // 忽略无效选择器
                    }
                }
                return false;
            });
            if (ageButtonClicked) {
                logger_1.default.info('已点击年龄认证按钮');
                // 等待页面跳转或更新
                await new Promise(resolve => setTimeout(resolve, 3000));
                // 检查是否还在年龄认证页面
                const stillOnAgeVerification = await this.page.evaluate(() => {
                    const ageVerificationIndicators = [
                        'Age Verification',
                        '年龄认证',
                        'age verification',
                        '18+',
                        'adult content',
                        'adult only'
                    ];
                    return ageVerificationIndicators.some(indicator => document.title.includes(indicator) ||
                        document.body.innerText.toLowerCase().includes(indicator.toLowerCase()));
                });
                if (stillOnAgeVerification) {
                    logger_1.default.warn('点击按钮后仍在年龄认证页面，尝试其他方法');
                    // 尝试设置年龄认证Cookie
                    await this.page.evaluate(() => {
                        // 尝试设置常见的年龄认证Cookie
                        document.cookie = 'age_verified=true; path=/; max-age=31536000';
                        document.cookie = 'adult_verified=true; path=/; max-age=31536000';
                        document.cookie = 'age_verification=1; path=/; max-age=31536000';
                        document.cookie = 'is_adult=true; path=/; max-age=31536000';
                        document.cookie = 'javbus_age=1; path=/; max-age=31536000';
                    });
                    // 刷新页面 - 使用 load 标准和更短的超时
                    const ageVerifyTimeout = this.config.timeout || 45000;
                    try {
                        await this.page.reload({
                            waitUntil: 'load',
                            timeout: Math.max(ageVerifyTimeout, 20000) // 20秒超时
                        });
                    }
                    catch (reloadError) {
                        logger_1.default.warn(`年龄认证页面 reload 失败，尝试 domcontentloaded: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}`);
                        await this.page.reload({
                            waitUntil: 'domcontentloaded',
                            timeout: Math.max(ageVerifyTimeout, 20000)
                        });
                    }
                    logger_1.default.info('已设置年龄认证Cookie并刷新页面');
                }
            }
            else {
                logger_1.default.warn('未找到年龄认证按钮，尝试设置Cookie');
                // 尝试设置年龄认证Cookie
                await this.page.evaluate(() => {
                    document.cookie = 'age_verified=true; path=/; max-age=31536000';
                    document.cookie = 'adult_verified=true; path=/; max-age=31536000';
                    document.cookie = 'age_verification=1; path=/; max-age=31536000';
                    document.cookie = 'is_adult=true; path=/; max-age=31536000';
                    document.cookie = 'javbus_age=1; path=/; max-age=31536000';
                });
                // 刷新页面 - 使用 load 标准和更短的超时
                const ageVerifyTimeout2 = this.config.timeout || 45000;
                try {
                    await this.page.reload({
                        waitUntil: 'load',
                        timeout: Math.max(ageVerifyTimeout2, 20000) // 20秒超时
                    });
                }
                catch (reloadError) {
                    logger_1.default.warn(`年龄认证页面 reload 失败，尝试 domcontentloaded: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}`);
                    await this.page.reload({
                        waitUntil: 'domcontentloaded',
                        timeout: Math.max(ageVerifyTimeout2, 20000)
                    });
                }
                logger_1.default.info('已设置年龄认证Cookie并刷新页面');
            }
            // 再次检查是否还在年龄认证页面
            const stillOnAgeVerification = await this.page.evaluate(() => {
                const ageVerificationIndicators = [
                    'Age Verification',
                    '年龄认证',
                    'age verification',
                    '18+',
                    'adult content',
                    'adult only'
                ];
                return ageVerificationIndicators.some(indicator => document.title.includes(indicator) ||
                    document.body.innerText.toLowerCase().includes(indicator.toLowerCase()));
            });
            if (stillOnAgeVerification) {
                logger_1.default.error('年龄认证处理失败，仍在认证页面');
                throw new Error('无法绕过年龄认证');
            }
            else {
                logger_1.default.info('年龄认证处理成功');
            }
        }
        catch (error) {
            logger_1.default.error(`处理年龄认证失败: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            logger_1.default.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            // 记录完整的错误信息
            logger_1.default.debug(`handleAgeVerification: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 尝试获取当前页面信息
            try {
                if (this.page) {
                    const pageUrl = this.page.url();
                    const pageTitle = await this.page.title();
                    const pageContent = await this.page.content();
                    logger_1.default.debug(`handleAgeVerification: 当前页面URL: ${pageUrl}`);
                    logger_1.default.debug(`handleAgeVerification: 当前页面标题: ${pageTitle}`);
                    logger_1.default.debug(`handleAgeVerification: 页面内容长度: ${pageContent.length}`);
                    // 记录页面内容的前1000个字符
                    if (pageContent.length > 0) {
                        logger_1.default.debug(`handleAgeVerification: 页面内容前1000字符: ${pageContent.substring(0, 1000)}`);
                    }
                    // 获取当前Cookie状态
                    const currentCookies = await this.page.cookies();
                    logger_1.default.debug(`handleAgeVerification: 当前Cookie数量: ${currentCookies.length}`);
                    logger_1.default.debug(`handleAgeVerification: 当前Cookie列表: ${JSON.stringify(currentCookies, null, 2)}`);
                }
            }
            catch (pageInfoError) {
                logger_1.default.debug(`handleAgeVerification: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
            }
            throw error;
        }
    }
    /**
     * 保存 Cookies 到文件
     */
    async saveCookies(filename = 'cloudflare_cookies.json') {
        if (!this.page) {
            throw new Error('请先调用 init() 方法初始化浏览器');
        }
        try {
            const cookies = await this.page.cookies();
            const cookiesFile = path_1.default.join(process.cwd(), filename);
            fs_1.default.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));
            logger_1.default.info(`Cookies 已保存到: ${cookiesFile}`);
        }
        catch (error) {
            logger_1.default.error(`保存 Cookies 失败: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            logger_1.default.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            // 记录完整的错误信息
            logger_1.default.debug(`saveCookies: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 记录文件路径信息
            try {
                const cookiesFile = path_1.default.join(process.cwd(), filename);
                logger_1.default.debug(`saveCookies: 尝试保存到文件路径: ${cookiesFile}`);
                logger_1.default.debug(`saveCookies: 当前工作目录: ${process.cwd()}`);
                logger_1.default.debug(`saveCookies: 文件名: ${filename}`);
                // 检查目录是否存在
                const dirExists = fs_1.default.existsSync(path_1.default.dirname(cookiesFile));
                logger_1.default.debug(`saveCookies: 目录是否存在: ${dirExists}`);
                // 尝试获取Cookie信息
                if (this.page) {
                    const cookies = await this.page.cookies();
                    logger_1.default.debug(`saveCookies: Cookie数量: ${cookies.length}`);
                    logger_1.default.debug(`saveCookies: Cookie内容: ${JSON.stringify(cookies, null, 2)}`);
                }
            }
            catch (debugError) {
                logger_1.default.debug(`saveCookies: 获取调试信息失败: ${debugError instanceof Error ? debugError.message : String(debugError)}`);
            }
            throw error;
        }
    }
    /**
     * 设置年龄认证相关Cookie
     */
    async setAgeVerificationCookies() {
        try {
            // 设置年龄认证相关的Cookie
            const cookies = [
                {
                    name: 'age_verified',
                    value: '1',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                },
                {
                    name: 'adult_verified',
                    value: '1',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                },
                {
                    name: 'age_verification_passed',
                    value: 'true',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                },
                {
                    name: 'is_adult',
                    value: '1',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                },
                {
                    name: 'verified_adult',
                    value: 'true',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                }
            ];
            // 检查页面是否存在
            if (!this.page) {
                logger_1.default.warn('setAgeVerificationCookies: page 为 null，跳过 Cookie 设置');
                return;
            }
            // 设置Cookie
            for (const cookie of cookies) {
                await this.page.setCookie(cookie);
            }
            logger_1.default.info('已设置年龄认证相关Cookie');
        }
        catch (error) {
            logger_1.default.error(`设置年龄认证Cookie失败: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            logger_1.default.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            // 记录完整的错误信息
            logger_1.default.debug(`setAgeVerificationCookies: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 尝试获取当前页面信息
            try {
                if (this.page) {
                    const pageUrl = this.page.url();
                    const pageTitle = await this.page.title();
                    logger_1.default.debug(`setAgeVerificationCookies: 当前页面URL: ${pageUrl}`);
                    logger_1.default.debug(`setAgeVerificationCookies: 当前页面标题: ${pageTitle}`);
                    // 获取当前Cookie状态
                    const currentCookies = await this.page.cookies();
                    logger_1.default.debug(`setAgeVerificationCookies: 当前Cookie数量: ${currentCookies.length}`);
                    logger_1.default.debug(`setAgeVerificationCookies: 当前Cookie列表: ${JSON.stringify(currentCookies, null, 2)}`);
                }
            }
            catch (pageInfoError) {
                logger_1.default.debug(`setAgeVerificationCookies: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
            }
        }
    }
    /**
     * 关闭浏览器
     */
    async close() {
        try {
            if (this.browser) {
                logger_1.default.debug(`close: 准备关闭浏览器，当前状态: isConnected=${this.browser.isConnected()}`);
                // 尝试获取浏览器进程信息
                try {
                    if (this.browser.process()) {
                        logger_1.default.debug(`close: 浏览器进程PID: ${this.browser.process().pid}`);
                    }
                }
                catch (processError) {
                    logger_1.default.debug(`close: 获取浏览器进程信息失败: ${processError instanceof Error ? processError.message : String(processError)}`);
                }
                await this.browser.close();
                this.browser = null;
                this.page = null;
                logger_1.default.info('浏览器已关闭');
            }
            else {
                logger_1.default.debug('close: 浏览器未初始化，无需关闭');
            }
        }
        catch (error) {
            logger_1.default.error(`关闭浏览器失败: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            logger_1.default.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            // 记录完整的错误信息
            logger_1.default.debug(`close: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            // 强制清理引用
            this.browser = null;
            this.page = null;
            throw error;
        }
    }
}
exports.default = CloudflareBypass;
//# sourceMappingURL=cloudflareBypass.js.map