"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const tunnel_1 = __importDefault(require("tunnel"));
const https_1 = __importDefault(require("https"));
const path_1 = __importDefault(require("path")); // 导入 path 模块，用于处理文件路径
const fs_1 = __importDefault(require("fs")); // 导入 fs 模块，用于文件操作
const constants_1 = require("./constants");
const errorHandler_1 = require("../utils/errorHandler");
const logger_1 = __importDefault(require("./logger"));
const cloudflareBypass_1 = __importDefault(require("../utils/cloudflareBypass"));
const puppeteerPool_1 = require("./puppeteerPool");
/**
 * RequestHandler 类
 */
class RequestHandler {
    /**
     * 构造函数
     * @param config 配置对象
     */
    constructor(config) {
        this.cloudflareBypass = null;
        this.cloudflareCookies = null;
        this.lastCookieRefresh = 0;
        this.cookieRefreshInterval = 30 * 60 * 1000; // 30分钟刷新一次cookies
        this.config = config;
        logger_1.default.debug(`RequestHandler constructor - proxy config: ${this.config.proxy}`);
        const userAgent = constants_1.USER_AGENTS[Math.floor(Math.random() * constants_1.USER_AGENTS.length)];
        const isChrome = userAgent.includes('Chrome');
        const isFirefox = userAgent.includes('Firefox');
        const isEdge = userAgent.includes('Edge');
        // 提取浏览器版本号
        const versionMatch = userAgent.match(/(Chrome|Firefox|Edge|Edg)[\/\s](\d+)/);
        const browserVersion = versionMatch ? versionMatch[2] : '119';
        // 设置 Sec-Ch-Ua 和浏览器指纹
        let secChUa = '';
        let platform = '"Windows"';
        let secChUaMobile = '?0';
        let secChUaPlatform = platform;
        if (isChrome || isEdge) {
            const brandVersion = isEdge ? 'Microsoft Edge' : 'Chromium';
            secChUa = `"${brandVersion}";v="${browserVersion}", "Not?A_Brand";v="99"`;
        }
        else if (isFirefox) {
            secChUa = `"Not.A/Brand";v="8", "Chromium";v="${browserVersion}", "Google Chrome";v="${browserVersion}"`;
        }
        else {
            secChUa = `"Chromium";v="${browserVersion}", "Not?A_Brand";v="99"`;
        }
        ;
        // 设置请求配置
        this.requestConfig = {
            timeout: config.timeout || 30000, // 默认30秒超时
            proxy: config.proxy,
            headers: {
                'authority': new URL(this.config.base || this.config.BASE_URL).hostname,
                'method': 'GET',
                'path': '/',
                'scheme': 'https',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
                'cache-control': 'no-cache',
                'sec-ch-ua': secChUa,
                'sec-ch-ua-mobile': secChUaMobile,
                'sec-ch-ua-platform': secChUaPlatform,
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'none',
                'sec-fetch-user': '?1',
                'upgrade-insecure-requests': '1',
                'user-agent': userAgent,
                'referer': new URL(this.config.base || this.config.BASE_URL).origin,
                'Cookie': this.config.headers.Cookie || 'existmag=mag',
                'Connection': 'keep-alive'
            }
        };
        this.retries = 3; // 减少重试次数，避免过度请求
        this.retryDelay = Math.max(this.config.delay || 2000, 3000); // 增加基础延迟，至少3秒
        // 获取共享的 PuppeteerPool 实例（不创建新实例，由 QueueManager 统一管理）
        this.puppeteerPool = puppeteerPool_1.PuppeteerPool.getInstance();
        // Cloudflare 绕过器将在需要时异步初始化
        // 配置axios重试
        (0, axios_retry_1.default)(axios_1.default, {
            retries: this.retries, // 使用配置的重试次数
            retryDelay: (retryCount) => {
                // 指数退避策略，加上随机延迟，基础延迟更长
                const baseDelay = Math.max(this.retryDelay, 3000); // 至少3秒基础延迟
                const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, retryCount), 30000); // 1.5倍指数增长
                const randomDelay = Math.floor(Math.random() * 2000); // 0-2秒随机延迟
                const totalDelay = exponentialDelay + randomDelay;
                logger_1.default.debug(`重试延迟计算: 基础=${Math.round(baseDelay / 1000)}秒, 指数增长=${Math.round(exponentialDelay / 1000)}秒, 随机=${Math.round(randomDelay / 1000)}秒, 总计=${Math.round(totalDelay / 1000)}秒 (重试次数: ${retryCount})`);
                return totalDelay;
            },
            retryCondition: (error) => {
                // 在以下情况下重试：
                // 1. 网络错误
                // 2. 5xx服务器错误
                // 3. 429 Too Many Requests
                // 4. 403 Forbidden (Cloudflare拦截)
                // 5. 超时错误
                // 6. SSL证书错误（首次重试时自动跳过验证）
                const currentRetry = (error.config && error.config['axios-retry'] && error.config['axios-retry'].retryCount) || 0;
                const isSSLError = error.code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
                    error.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
                    error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE';
                // 首次SSL错误：自动降级并跳过SSL验证
                if (isSSLError && currentRetry === 0 && this.config.strictSSL !== false) {
                    logger_1.default.warn(`检测到SSL证书错误: ${error.code}，将自动跳过验证进行重试`);
                    this.config.strictSSL = false; // 临时禁用SSL验证
                    return true; // 允许重试
                }
                const shouldRetry = axios_retry_1.default.isNetworkOrIdempotentRequestError(error) ||
                    (error.response?.status && [500, 502, 503, 504, 429, 403].includes(error.response.status)) ||
                    (error.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(error.code));
                if (shouldRetry) {
                    // 计算延迟时间
                    const baseDelay = Math.max(this.retryDelay, 3000);
                    const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, currentRetry), 30000);
                    const randomDelay = Math.floor(Math.random() * 2000);
                    const totalDelay = exponentialDelay + randomDelay;
                    if (isSSLError) {
                        logger_1.default.warn(`SSL证书错误，正在重试 (${currentRetry + 1}/5)，${Math.round(totalDelay / 1000)}秒后重试: ${error.config?.url || '未知URL'} - 错误: ${error.code} (已自动跳过验证)`);
                    }
                    else {
                        logger_1.default.warn(`请求失败，正在重试 (${currentRetry + 1}/5)，${Math.round(totalDelay / 1000)}秒后重试: ${error.config?.url || '未知URL'} - 错误: ${error.code || error.message}`);
                    }
                }
                return shouldRetry;
            },
            // 添加重试时更换User-Agent的逻辑
            onRetry: (retryCount, error, requestConfig) => {
                // 每次重试时更换User-Agent
                const newUserAgent = constants_1.USER_AGENTS[Math.floor(Math.random() * constants_1.USER_AGENTS.length)];
                if (requestConfig.headers) {
                    requestConfig.headers['User-Agent'] = newUserAgent;
                    // 同时更新 sec-ch-ua 以匹配新的 User-Agent
                    const isChrome = newUserAgent.includes('Chrome');
                    const isFirefox = newUserAgent.includes('Firefox');
                    const isEdge = newUserAgent.includes('Edge');
                    // 提取浏览器版本号
                    const versionMatch = newUserAgent.match(/(Chrome|Firefox|Edge|Edg)[\/\s](\d+)/);
                    const browserVersion = versionMatch ? versionMatch[2] : '119';
                    // 设置 Sec-Ch-Ua 和浏览器指纹
                    let secChUa = '';
                    if (isChrome || isEdge) {
                        const brandVersion = isEdge ? 'Microsoft Edge' : 'Chromium';
                        secChUa = `"${brandVersion}";v="${browserVersion}", "Not?A_Brand";v="99"`;
                    }
                    else if (isFirefox) {
                        secChUa = `"Not.A/Brand";v="8", "Chromium";v="${browserVersion}", "Google Chrome";v="${browserVersion}"`;
                    }
                    else {
                        secChUa = `"Chromium";v="${browserVersion}", "Not?A_Brand";v="99"`;
                    }
                    requestConfig.headers['Sec-Ch-Ua'] = secChUa;
                }
            }
        });
        // 添加HTTPS代理拦截器
        axios_1.default.interceptors.request.use((config) => {
            if (this.requestConfig.proxy && config.url?.startsWith('https')) {
                try {
                    const agent = this.createProxyAgent(this.requestConfig.proxy);
                    if (agent) {
                        config.httpsAgent = agent;
                        config.proxy = false; // 必须设置为false，否则axios会尝试使用自己的代理逻辑
                    }
                }
                catch (proxyError) {
                    errorHandler_1.ErrorHandler.handleNetworkError(proxyError, '配置代理');
                    // 可选择抛出错误或允许请求在没有代理的情况下继续
                    // throw proxyError;
                }
            }
            return config;
        });
    }
    /**
     * 获取指定 URL 的页面内容
     * @param url 目标 URL
     * @param options 可选参数
     * @returns 包含状态码和页面内容的对象
     */
    async getPage(url, options = {}) {
        // 验证URL格式，防止SSRF攻击
        try {
            new URL(url);
        }
        catch (error) {
            logger_1.default.error(`无效的URL格式: ${url}`);
            return null;
        }
        // 如果启用 Cloudflare 绕过，直接使用 Puppeteer
        if (this.config.useCloudflareBypass) {
            logger_1.default.debug(`getPage: 使用 Cloudflare 绕过模式: ${url}`);
            if (!this.cloudflareBypass) {
                logger_1.default.debug(`getPage: Cloudflare 绕过器未初始化，开始初始化...`);
                await this.initCloudflareBypass();
            }
            if (this.cloudflareBypass) {
                try {
                    logger_1.default.debug(`getPage: 开始使用 Puppeteer 获取页面: ${url}`);
                    const pageAccessStartTime = Date.now();
                    const pageContent = await this.cloudflareBypass.bypassCloudflare(url);
                    const pageAccessTime = Date.now() - pageAccessStartTime;
                    logger_1.default.debug(`getPage: Puppeteer 获取页面成功 (耗时: ${pageAccessTime}ms), 内容长度: ${pageContent.length}`);
                    return { statusCode: 200, body: pageContent };
                }
                catch (error) {
                    const pageAccessTime = Date.now() - this._pageAccessStartTime || 0;
                    logger_1.default.error(`getPage: Cloudflare 绕过获取页面失败: ${url}, 错误: ${error instanceof Error ? error.message : String(error)}`);
                    logger_1.default.error(`getPage: 错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
                    logger_1.default.error(`getPage: 错误耗时: ${pageAccessTime}ms`);
                    // 详细记录错误信息
                    logger_1.default.debug(`getPage: 完整错误对象: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
                    // 检查是否是网络错误，如果是则尝试常规HTTP请求作为fallback
                    const isNetworkError = error instanceof Error && (error.message.includes('net::ERR_ABORTED') ||
                        error.message.includes('net::ERR_CONNECTION') ||
                        error.message.includes('timeout') ||
                        error.message.includes('Navigation timeout') ||
                        error.message.includes('获取 Puppeteer 实例失败') // 添加池相关错误
                    );
                    const isPuppeteerError = error instanceof Error && (error.message.includes('Cannot read properties of null') ||
                        error.message.includes('page 为 null') ||
                        error.message.includes('从共享池获取的页面实例为 null'));
                    if (isNetworkError || isPuppeteerError) {
                        logger_1.default.warn(`getPage: Cloudflare 绕过遇到${isNetworkError ? '网络' : 'Puppeteer'}错误，尝试常规HTTP请求作为fallback: ${url}`);
                        logger_1.default.debug(`fallback原因: ${error instanceof Error ? error.message : String(error)}`);
                        logger_1.default.debug(`fallback错误类型: ${isNetworkError ? '网络错误' : 'Puppeteer错误'}`);
                        // 记录当前配置信息
                        logger_1.default.debug(`getPage: 当前配置 - timeout: ${this.config.timeout}, proxy: ${this.config.proxy || '无'}, cloudflare: ${this.config.useCloudflareBypass}`);
                        // 设置Cloudflare绕过器为null，强制使用常规请求
                        this.cloudflareBypass = null;
                        // 继续执行下面的常规HTTP请求逻辑
                    }
                    else {
                        // 非网络错误，直接抛出
                        logger_1.default.error(`getPage: 非网络错误，直接抛出: ${error instanceof Error ? error.message : String(error)}`);
                        logger_1.default.error(`getPage: 错误详情 - 类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}, 消息: ${error instanceof Error ? error.message : String(error)}`);
                        // 尝试记录错误时的堆栈信息
                        if (error instanceof Error && error.stack) {
                            logger_1.default.debug(`getPage: 错误堆栈前20行:\n${error.stack.split('\n').slice(0, 20).join('\n')}`);
                        }
                        throw error;
                    }
                }
            }
            else {
                logger_1.default.error(`getPage: Cloudflare 绕过器初始化失败: ${url}`);
                return null;
            }
        }
        // 未启用 Cloudflare 绕过，使用传统 HTTP 请求
        let attempts = 0;
        while (attempts <= this.config.retryCount) {
            try {
                logger_1.default.debug(`开始请求页面: ${url} (尝试 ${attempts + 1}/${this.config.retryCount + 1})`);
                const headers = { ...this.requestConfig.headers };
                // 检查是否已手动设置了cookies
                const hasManualCookies = this.config.headers && this.config.headers.Cookie &&
                    this.config.headers.Cookie !== 'existmag=mag';
                if (hasManualCookies) {
                    // 使用手动设置的cookies
                    headers.Cookie = this.config.headers.Cookie;
                    logger_1.default.debug(`使用手动设置的 Cookies: ${this.config.headers.Cookie}`);
                }
                else {
                    // 使用默认的existmag=mag
                    headers.Cookie = 'existmag=mag';
                    logger_1.default.debug('使用默认 Cookie: existmag=mag');
                }
                logger_1.default.debug(`请求头信息: ${JSON.stringify(headers)}`);
                // 使用 axios 发送请求
                const mergedOptions = {
                    ...this.requestConfig,
                    ...options,
                    url,
                    headers
                };
                const response = await axios_1.default.get(mergedOptions.url, {
                    timeout: mergedOptions.timeout,
                    headers: mergedOptions.headers
                });
                return { statusCode: response.status, body: response.data };
            }
            catch (error) {
                const err = error;
                logger_1.default.error(`请求页面 ${url} 失败: ${err.message}`);
                if (err.response) {
                    logger_1.default.error(`响应状态码: ${err.response.status}`);
                    if (err.response.data) {
                        const responseData = err.response.data;
                        // 如果是字符串且长度较短，记录详细内容
                        if (typeof responseData === 'string' && responseData.length < 1000) {
                            logger_1.default.error(`响应内容 (前500字符): ${responseData.substring(0, 500)}`);
                        }
                    }
                }
                if (axios_retry_1.default.isNetworkOrIdempotentRequestError(err) ||
                    (err.response?.status && [500, 429, 403].includes(err.response.status))) {
                    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempts)));
                    attempts++;
                }
                else {
                    throw err;
                }
            }
        }
        // 如果所有重试都失败了，返回 null
        return null;
    }
    async getXMLHttpRequest(url, options = {}) {
        // 验证URL格式，防止SSRF攻击
        try {
            new URL(url);
        }
        catch (error) {
            logger_1.default.error(`无效的URL格式: ${url}`);
            throw new Error(`无效的URL格式: ${url}`);
        }
        try {
            logger_1.default.debug(`开始发送AJAX请求: ${url}`);
            // 如果启用 Cloudflare 绕过且还没有获取 Cloudflare Cookies，先获取
            if (this.config.useCloudflareBypass && !this.cloudflareCookies) {
                await this.getCloudflareCookies();
            }
            // 构建AJAX专用请求头
            const urlObj = new URL(url);
            const headers = {
                'authority': urlObj.hostname,
                'method': 'GET',
                'path': urlObj.pathname + urlObj.search,
                'scheme': 'https',
                'accept': '*/*',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
                'cache-control': 'no-cache',
                'sec-ch-ua': this.requestConfig.headers['sec-ch-ua'] || '"Chromium";v="120", "Not?A_Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': this.requestConfig.headers['user-agent'],
                'referer': new URL(this.config.base || this.config.BASE_URL).origin,
                'X-Requested-With': 'XMLHttpRequest',
                'Connection': 'keep-alive'
            };
            // Cookie 优先级：手动设置 > Cloudflare Cookies > 默认 Cookies
            const hasManualCookies = this.config.headers && this.config.headers.Cookie &&
                this.config.headers.Cookie !== 'existmag=mag';
            let cookieSet = false;
            if (hasManualCookies) {
                // 使用安全Cookie设置方法
                cookieSet = this.setCookieHeader(headers, this.config.headers.Cookie);
                if (cookieSet) {
                    logger_1.default.debug(`在XMLHttpRequest中使用手动设置的 Cookies`);
                }
            }
            if (!cookieSet && this.cloudflareCookies) {
                // 使用 Cloudflare 绕过获取的 Cookies
                cookieSet = this.setCookieHeader(headers, this.cloudflareCookies);
                if (cookieSet) {
                    logger_1.default.debug('在XMLHttpRequest中使用 Cloudflare Cookies');
                }
            }
            // 如果所有Cookie都无效，使用默认Cookie
            if (!cookieSet) {
                headers.Cookie = 'existmag=mag';
                logger_1.default.debug('在XMLHttpRequest中使用默认 Cookie: existmag=mag');
            }
            logger_1.default.debug(`AJAX请求头信息: ${JSON.stringify({ ...headers, Cookie: headers.Cookie ? '[已设置]' : '[未设置]' })}`);
            // 构建请求配置
            const requestConfig = {
                timeout: this.requestConfig.timeout,
                headers,
                // 添加重试配置
                'axios-retry': {
                    retries: this.retries,
                    retryDelay: (retryCount) => {
                        // AJAX请求使用更长的延迟，避免被检测
                        const baseDelay = Math.max(this.retryDelay, 4000); // 至少4秒基础延迟
                        const exponentialDelay = Math.min(baseDelay * Math.pow(1.8, retryCount), 25000); // 1.8倍指数增长
                        const randomDelay = Math.floor(Math.random() * 3000); // 0-3秒随机延迟
                        const totalDelay = exponentialDelay + randomDelay;
                        logger_1.default.debug(`AJAX重试延迟计算: 基础=${Math.round(baseDelay / 1000)}秒, 指数增长=${Math.round(exponentialDelay / 1000)}秒, 随机=${Math.round(randomDelay / 1000)}秒, 总计=${Math.round(totalDelay / 1000)}秒 (重试次数: ${retryCount})`);
                        return totalDelay;
                    },
                    retryCondition: (error) => {
                        const shouldRetry = axios_retry_1.default.isNetworkOrIdempotentRequestError(error) ||
                            (error.response?.status && [500, 502, 503, 504, 429, 403].includes(error.response.status));
                        if (shouldRetry) {
                            const currentRetry = (error.config && error.config['axios-retry'] && error.config['axios-retry'].retryCount) || 0;
                            // 计算AJAX延迟时间
                            const baseDelay = Math.max(this.retryDelay, 4000);
                            const exponentialDelay = Math.min(baseDelay * Math.pow(1.8, currentRetry), 25000);
                            const randomDelay = Math.floor(Math.random() * 3000);
                            const totalDelay = exponentialDelay + randomDelay;
                            logger_1.default.warn(`AJAX请求失败，正在重试 (${currentRetry + 1}/3)，${Math.round(totalDelay / 1000)}秒后重试: ${url} - 错误: ${error.code || error.message}`);
                        }
                        return shouldRetry;
                    }
                }
            };
            // 如果有代理配置，添加代理设置
            if (this.requestConfig.proxy) {
                try {
                    const agent = this.createProxyAgent(this.requestConfig.proxy);
                    if (agent) {
                        requestConfig.httpsAgent = agent;
                    }
                }
                catch (proxyError) {
                    logger_1.default.warn(`AJAX请求代理配置失败: ${proxyError instanceof Error ? proxyError.message : String(proxyError)}`);
                }
            }
            // 发送请求
            const response = await axios_1.default.get(url, requestConfig);
            logger_1.default.debug(`AJAX请求成功: ${url}, 状态码: ${response.status}`);
            return { statusCode: response.status, body: response.data };
        }
        catch (err) {
            const error = err;
            logger_1.default.error(`AJAX请求失败: ${url}`);
            logger_1.default.error(`错误详情: ${error.message}`);
            if (error.response) {
                logger_1.default.error(`响应状态码: ${error.response.status}`);
                logger_1.default.error(`响应头: ${JSON.stringify(error.response.headers)}`);
                if (error.response.data) {
                    const responseData = error.response.data;
                    if (typeof responseData === 'string' && responseData.length < 500) {
                        logger_1.default.error(`响应内容: ${responseData}`);
                    }
                    else if (typeof responseData === 'object') {
                        logger_1.default.error(`响应内容: ${JSON.stringify(responseData).substring(0, 500)}`);
                    }
                }
            }
            errorHandler_1.ErrorHandler.handleNetworkError(error, `发送 XMLHttpRequest 到 ${url}`);
            throw error;
        }
    }
    /**
     * 从指定页面提取磁力链接，并返回最大文件大小对应的磁力链接
     * @param metadata 元数据对象
     * @returns 包含磁力链接信息的对象，如果没有找到则返回 null
     */
    async fetchMagnet(metadata) {
        const fetchStartTime = Date.now();
        logger_1.default.debug(`fetchMagnet: 开始获取磁力链接，影片: ${metadata.title}`);
        // 验证metadata参数，防止注入攻击
        if (!metadata.gid || !/^[a-zA-Z0-9]+$/.test(metadata.gid)) {
            logger_1.default.error(`fetchMagnet: 无效的gid参数: ${metadata.gid}`);
            return null;
        }
        if (!metadata.img || !/^[a-zA-Z0-9\/_.-]+$/.test(metadata.img)) {
            logger_1.default.error(`fetchMagnet: 无效的img参数: ${metadata.img}`);
            return null;
        }
        if (!metadata.uc || !/^[a-zA-Z0-9]+$/.test(metadata.uc)) {
            logger_1.default.error(`fetchMagnet: 无效的uc参数: ${metadata.uc}`);
            return null;
        }
        // 使用配置中的 BASE_URL 作为默认值，而不是空字符串
        const baseUrl = this.config.base || this.config.BASE_URL;
        const parsedBaseUrl = new URL(baseUrl);
        const baseDomain = `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`;
        const url = `${baseDomain}/ajax/uncledatoolsbyajax.php?gid=${metadata.gid}&lang=zh&img=${metadata.img}&uc=${metadata.uc}&floor=${Math.floor(1e3 * Math.random() + 1)}`;
        logger_1.default.debug(`fetchMagnet: 构建AJAX URL: ${url}`);
        let response = null;
        // 如果启用 Cloudflare 绕过，直接使用 Cloudflare 方式
        if (this.config.useCloudflareBypass) {
            logger_1.default.debug(`fetchMagnet: 使用 Cloudflare 绕过模式: ${metadata.title}`);
            if (!this.cloudflareBypass) {
                logger_1.default.debug(`fetchMagnet: Cloudflare 绕过器未初始化，开始初始化...`);
                await this.initCloudflareBypass();
            }
            if (this.cloudflareBypass) {
                try {
                    logger_1.default.debug(`fetchMagnet: 开始 Cloudflare AJAX 请求: ${metadata.title}`);
                    const cfAjaxStart = Date.now();
                    const cloudflareResponse = await this.executeAjaxWithCloudflare(url);
                    const cfAjaxTime = Date.now() - cfAjaxStart;
                    if (cloudflareResponse) {
                        response = { statusCode: 200, body: cloudflareResponse };
                        logger_1.default.info(`fetchMagnet: Cloudflare 绕过 AJAX 请求成功: ${metadata.title} (耗时: ${Math.round(cfAjaxTime / 1000)}s)`);
                    }
                    else {
                        logger_1.default.warn(`fetchMagnet: Cloudflare 绕过返回空响应: ${metadata.title}`);
                    }
                }
                catch (cfError) {
                    const cfFailedTime = Date.now() - fetchStartTime;
                    logger_1.default.error(`fetchMagnet: Cloudflare 绕过 AJAX 请求失败: ${metadata.title} (耗时: ${Math.round(cfFailedTime / 1000)}s)`);
                    logger_1.default.error(`错误类型: ${cfError instanceof Error ? cfError.constructor.name : '未知类型'}`);
                    logger_1.default.error(`错误信息: ${cfError instanceof Error ? cfError.message : String(cfError)}`);
                    // 如果是AxiosError，记录更详细的响应信息
                    if (cfError instanceof Error && cfError.name === 'AxiosError') {
                        const axiosError = cfError;
                        logger_1.default.error(`响应状态码: ${axiosError.response?.status || 'N/A'}`);
                        if (axiosError.response) {
                            logger_1.default.error(`完整响应数据: ${JSON.stringify(axiosError.response.data, null, 2)}`);
                            logger_1.default.error(`响应头: ${JSON.stringify(axiosError.response.headers || {}, null, 2)}`);
                        }
                        if (axiosError.config) {
                            logger_1.default.debug(`请求方法: ${axiosError.config.method || 'N/A'}`);
                            logger_1.default.debug(`请求头: ${JSON.stringify(axiosError.config.headers || {}, null, 2)}`);
                        }
                    }
                    logger_1.default.error(`错误堆栈: ${cfError instanceof Error ? cfError.stack : '无堆栈信息'}`);
                }
            }
            else {
                logger_1.default.warn(`fetchMagnet: Cloudflare 绕过器初始化失败: ${metadata.title}`);
            }
        }
        else {
            // 未启用 Cloudflare 绕过，使用传统 AJAX 请求
            try {
                logger_1.default.debug(`fetchMagnet: 开始尝试常规 AJAX 请求: ${metadata.title}`);
                const regularAjaxStart = Date.now();
                response = await this.getXMLHttpRequest(url);
                const regularAjaxTime = Date.now() - regularAjaxStart;
                logger_1.default.debug(`fetchMagnet: 常规 AJAX 请求完成: ${metadata.title} (耗时: ${Math.round(regularAjaxTime / 1000)}s)`);
            }
            catch (error) {
                const regularFailedTime = Date.now() - fetchStartTime;
                logger_1.default.warn(`fetchMagnet: 常规 AJAX 请求失败: ${metadata.title} (耗时: ${Math.round(regularFailedTime / 1000)}s), 错误: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        }
        if (!response) {
            const totalTime = Date.now() - fetchStartTime;
            logger_1.default.error(`fetchMagnet: 响应为空，返回null (总耗时: ${Math.round(totalTime / 1000)}s)`);
            return null;
        }
        const responseTime = Date.now() - fetchStartTime;
        logger_1.default.debug(`fetchMagnet: AJAX响应获取成功: ${metadata.title} (总耗时: ${Math.round(responseTime / 1000)}s)`);
        logger_1.default.debug(`fetchMagnet: AJAX响应内容长度: ${response.body.length}`);
        logger_1.default.debug(`fetchMagnet: AJAX响应内容前500字符: ${response.body.substring(0, 500)}`);
        logger_1.default.debug(`fetchMagnet: 开始解析磁力链接: ${metadata.title}`);
        const parseStartTime = Date.now();
        const magnetLinks = [...new Set(response.body.match(/magnet:\?xt=urn:btih:[A-F0-9]+&dn=[^&"']+/gi))];
        const sizes = response.body.match(/\d+(\.\d+)?[GM]B/g);
        const parseTime = Date.now() - parseStartTime;
        logger_1.default.debug(`fetchMagnet: 解析完成: ${metadata.title} (耗时: ${Math.round(parseTime / 1000)}s)`);
        logger_1.default.debug(`fetchMagnet: 解析到 ${magnetLinks ? magnetLinks.length : 0} 个磁力链接`);
        logger_1.default.debug(`fetchMagnet: 解析到 ${sizes ? sizes.length : 0} 个文件大小`);
        if (!magnetLinks || !sizes) {
            const totalTime = Date.now() - fetchStartTime;
            logger_1.default.error(`fetchMagnet: 未找到磁力链接或文件大小: ${metadata.title} (总耗时: ${Math.round(totalTime / 1000)}s)`);
            logger_1.default.debug(`fetchMagnet: 响应内容片段: ${response.body.substring(0, 500)}`);
            return null;
        }
        // 打印所有解析到的磁力链接
        magnetLinks.forEach((link, index) => {
            logger_1.default.debug(`fetchMagnet: 磁力链接 ${index + 1}: ${link.substring(0, 100)}...`);
        });
        logger_1.default.debug(`fetchMagnet: 开始计算最大文件大小: ${metadata.title}`);
        const calculateStartTime = Date.now();
        const parsedPairs = magnetLinks.map((magnetLink, index) => {
            const sizeStr = sizes[index];
            const sizeValue = parseFloat(sizeStr.replace(/GB|MB/, ''));
            const sizeInMB = sizeStr.includes('GB') ? sizeValue * 1024 : sizeValue;
            return { magnetLink, size: sizeInMB };
        });
        const calculateTime = Date.now() - calculateStartTime;
        const totalTime = Date.now() - fetchStartTime;
        logger_1.default.debug(`fetchMagnet: 磁力链接处理完成: ${metadata.title} (耗时: ${Math.round(calculateTime / 1000)}s)`);
        let result = null;
        if (this.config.allmag) {
            // 返回所有磁力链接的结构化数据
            const magnetLinks = parsedPairs.map(pair => ({
                link: pair.magnetLink,
                size: this.formatFileSize(pair.size)
            }));
            result = {
                magnet: parsedPairs.map(pair => pair.magnetLink).join('\n'), // 保持向后兼容
                magnetLinks: magnetLinks
            };
            logger_1.default.info(`fetchMagnet: 成功获取所有磁力链接: ${metadata.title} (共${parsedPairs.length}个) (总耗时: ${Math.round(totalTime / 1000)}s)`);
            logger_1.default.debug(`fetchMagnet: 返回所有磁力链接，预览: ${result.magnet.substring(0, 200)}...`);
        }
        else {
            // 返回最大的磁力链接（默认行为）
            const maxSizePair = parsedPairs.reduce((prev, current) => {
                return (prev.size > current.size) ? prev : current;
            }, parsedPairs[0]);
            if (maxSizePair) {
                result = {
                    magnet: maxSizePair.magnetLink,
                    magnetLinks: [{
                            link: maxSizePair.magnetLink,
                            size: this.formatFileSize(maxSizePair.size)
                        }]
                };
                logger_1.default.info(`fetchMagnet: 成功获取磁力链接: ${metadata.title} (总耗时: ${Math.round(totalTime / 1000)}s)`);
                logger_1.default.info(`fetchMagnet: 返回最大磁力链接: ${result.magnet.substring(0, 100)}...`);
            }
            else {
                logger_1.default.error(`fetchMagnet: 未能确定最大磁力链接: ${metadata.title} (总耗时: ${Math.round(totalTime / 1000)}s)`);
            }
        }
        return result;
    }
    /**
     * 格式化文件大小显示
     * @param sizeInMB 文件大小（MB为单位）
     * @returns 格式化的文件大小字符串
     */
    formatFileSize(sizeInMB) {
        if (sizeInMB >= 1024) {
            return `${(sizeInMB / 1024).toFixed(2)}GB`;
        }
        else {
            return `${sizeInMB.toFixed(2)}MB`;
        }
    }
    /**
     * 下载图片到指定路径
     * @param url 图片 URL
     * @param filename 文件名
     * @param referer 可选的Referer头，如果不提供则从图片URL自动生成
     * @returns 如果文件已存在则返回 false，否则返回 true
     */
    async downloadImage(url, filename, referer) {
        const dirPath = this.config.output; // 获取输出目录路径
        // 防止路径遍历攻击
        const sanitizedFilename = path_1.default.basename(filename);
        const originalFilePath = path_1.default.join(dirPath, sanitizedFilename);
        const ext = path_1.default.extname(sanitizedFilename); // 获取文件扩展名
        const baseFilename = path_1.default.basename(sanitizedFilename, ext); // 获取不带扩展名的文件名
        // 检查并创建目录 (如果之前没有添加的话)
        if (!fs_1.default.existsSync(dirPath)) {
            try {
                await fs_1.default.promises.mkdir(dirPath, { recursive: true });
            }
            catch (mkdirError) {
                errorHandler_1.ErrorHandler.handleFileError(mkdirError, `创建输出目录: ${dirPath}`);
                throw mkdirError; // 如果目录创建失败，后续操作也无法进行
            }
        }
        // 尝试保存文件
        try {
            if (fs_1.default.existsSync(originalFilePath)) {
                // console.log(`图片 ${filename} 已存在，跳过下载。`);
                return false;
            }
            // 准备请求头
            let headers = { ...this.requestConfig.headers };
            // 设置Referer头，优先使用传入的referer参数，否则从图片URL自动生成
            let refererUrl;
            if (referer) {
                refererUrl = referer;
                logger_1.default.debug(`downloadImage: 使用传入的Referer: ${refererUrl}`);
            }
            else {
                const imageUrl = new URL(url);
                refererUrl = `${imageUrl.protocol}//${imageUrl.hostname}/`;
                logger_1.default.debug(`downloadImage: 从图片URL自动生成Referer: ${refererUrl}`);
            }
            headers.referer = refererUrl;
            // 如果启用 Cloudflare 绕过，确保使用有效的 cookies
            if (this.config.useCloudflareBypass) {
                if (!this.cloudflareCookies) {
                    logger_1.default.debug(`downloadImage: 获取 Cloudflare Cookies 用于图片下载`);
                    await this.getCloudflareCookies();
                }
                if (this.cloudflareCookies) {
                    headers.Cookie = this.cloudflareCookies;
                    logger_1.default.debug(`downloadImage: 使用 Cloudflare Cookies 下载图片: ${filename}, Referer: ${refererUrl}`);
                }
            }
            // 创建 HTTPS Agent 用于图片下载（支持 SSL 配置）
            const httpsAgent = this.createHttpsAgent();
            const response = await axios_1.default.get(url, {
                responseType: 'arraybuffer',
                timeout: this.requestConfig.timeout,
                headers,
                httpsAgent
            });
            fs_1.default.writeFileSync(originalFilePath, Buffer.from(response.data, 'binary'));
            return true;
        }
        catch (err) {
            const error = err; // 明确类型为文件系统错误
            // 检查是否是文件路径过长或非法字符导致的错误
            if (error.code === 'ENOENT' || error.code === 'ENAMETOOLONG') {
                logger_1.default.warn(`保存图片失败，文件名可能过长或包含非法字符，尝试简化文件名: ${filename}`);
                // 简化文件名，例如保留部分原文件名和哈希值
                const simplifiedFilename = `${baseFilename.substring(0, 50)}_..._${baseFilename.substring(baseFilename.length - 10)}${ext}`.replace(/[^a-zA-Z0-9_\-. ]/g, '_'); // 简单替换非法字符
                const simplifiedFilePath = path_1.default.join(dirPath, simplifiedFilename);
                try {
                    if (fs_1.default.existsSync(simplifiedFilePath)) {
                        logger_1.default.info(`简化后的图片 ${simplifiedFilename} 已存在，跳过下载。`);
                        return false;
                    }
                    // 准备请求头（简化文件名情况下）
                    let simplifiedHeaders = { ...this.requestConfig.headers };
                    // 设置Referer头，优先使用传入的referer参数，否则从图片URL自动生成
                    let simplifiedRefererUrl;
                    if (referer) {
                        simplifiedRefererUrl = referer;
                        logger_1.default.debug(`downloadImage (简化): 使用传入的Referer: ${simplifiedRefererUrl}`);
                    }
                    else {
                        const imageUrl = new URL(url);
                        simplifiedRefererUrl = `${imageUrl.protocol}//${imageUrl.hostname}/`;
                        logger_1.default.debug(`downloadImage (简化): 从图片URL自动生成Referer: ${simplifiedRefererUrl}`);
                    }
                    simplifiedHeaders.referer = simplifiedRefererUrl;
                    // 如果启用 Cloudflare 绕过，确保使用有效的 cookies
                    if (this.config.useCloudflareBypass) {
                        if (!this.cloudflareCookies) {
                            logger_1.default.debug(`downloadImage (简化): 获取 Cloudflare Cookies 用于图片下载`);
                            await this.getCloudflareCookies();
                        }
                        if (this.cloudflareCookies) {
                            simplifiedHeaders.Cookie = this.cloudflareCookies;
                            logger_1.default.debug(`downloadImage (简化): 使用 Cloudflare Cookies 下载图片: ${simplifiedFilename}, Referer: ${simplifiedRefererUrl}`);
                        }
                    }
                    // 创建 HTTPS Agent 用于简化文件名图片下载
                    const httpsAgent = this.createHttpsAgent();
                    const response = await axios_1.default.get(url, {
                        responseType: 'arraybuffer',
                        timeout: this.requestConfig.timeout,
                        headers: simplifiedHeaders,
                        httpsAgent
                    });
                    await fs_1.default.promises.writeFile(simplifiedFilePath, Buffer.from(response.data, 'binary'));
                    logger_1.default.info(`图片已使用简化文件名保存: ${simplifiedFilename}`);
                    return true;
                }
                catch (simplifyErr) {
                    const simplifyError = simplifyErr; // Simplification attempt error
                    // 记录简化文件名尝试的详细错误信息
                    logger_1.default.error(`使用简化文件名下载图片失败: ${simplifiedFilename}`);
                    logger_1.default.error(`错误类型: ${simplifyError.constructor.name}`);
                    logger_1.default.error(`错误信息: ${simplifyError.message}`);
                    // 如果是AxiosError，记录更详细的响应信息
                    if (simplifyError.name === 'AxiosError') {
                        const axiosError = simplifyError;
                        logger_1.default.error(`响应状态码: ${axiosError.response?.status || 'N/A'}`);
                        if (axiosError.response) {
                            logger_1.default.error(`完整响应数据: ${JSON.stringify(axiosError.response.data, null, 2)}`);
                            logger_1.default.error(`响应头: ${JSON.stringify(axiosError.response.headers || {}, null, 2)}`);
                        }
                        if (axiosError.config) {
                            logger_1.default.debug(`请求方法: ${axiosError.config.method || 'N/A'}`);
                            logger_1.default.debug(`请求头: ${JSON.stringify(axiosError.config.headers || {}, null, 2)}`);
                        }
                    }
                    logger_1.default.error(`错误堆栈: ${simplifyError.stack}`);
                    errorHandler_1.ErrorHandler.handleFileError(simplifyError, `使用简化文件名保存图片: ${simplifiedFilename}`);
                    throw simplifyError; // 简化文件名后仍然失败，抛出错误
                }
            }
            else {
                // 其他类型的错误，直接抛出
                errorHandler_1.ErrorHandler.handleFileError(error, `保存图片: ${filename}`);
                throw error;
            }
        }
    }
    /**
       * 初始化Cloudflare绕过器
       */
    async initCloudflareBypass() {
        try {
            logger_1.default.info('正在初始化Cloudflare绕过器...');
            // 不再创建新的CloudflareBypass实例，而是使用共享池
            this.cloudflareBypass = new cloudflareBypass_1.default({
                headless: true,
                timeout: this.requestConfig.timeout,
                proxy: this.requestConfig.proxy,
                puppeteerPool: this.puppeteerPool // 传入共享池
            });
            await this.cloudflareBypass.init();
            logger_1.default.info('Cloudflare绕过器初始化成功');
            // 设置年龄认证相关Cookie
            logger_1.default.info('正在设置年龄认证相关Cookie...');
            await this.cloudflareBypass.setAgeVerificationCookies();
            logger_1.default.info('年龄认证Cookie设置完成');
        }
        catch (error) {
            logger_1.default.error('Cloudflare绕过器初始化失败:', error);
            this.cloudflareBypass = null;
            throw error;
        }
    }
    /**
     * 获取 Cloudflare Cookies
     */
    async getCloudflareCookies() {
        if (!this.config.useCloudflareBypass) {
            logger_1.default.debug('Cloudflare绕过未启用，跳过获取Cookies');
            return null;
        }
        const currentTime = Date.now();
        // 检查是否需要刷新cookies（从未获取或超过刷新间隔）
        if (this.cloudflareCookies && (currentTime - this.lastCookieRefresh) < this.cookieRefreshInterval) {
            logger_1.default.debug(`使用缓存的 Cloudflare Cookies (剩余有效时间: ${Math.floor((this.cookieRefreshInterval - (currentTime - this.lastCookieRefresh)) / 1000 / 60)} 分钟)`);
            return this.cloudflareCookies;
        }
        // 如果还没有初始化，先初始化
        if (!this.cloudflareBypass) {
            logger_1.default.debug('Cloudflare绕过器未初始化，开始初始化...');
            await this.initCloudflareBypass();
        }
        if (!this.cloudflareBypass) {
            logger_1.default.warn('Cloudflare绕过器初始化失败，无法获取Cookies');
            return null;
        }
        try {
            const baseUrl = this.config.base || this.config.BASE_URL;
            if (this.cloudflareCookies) {
                logger_1.default.info('Cloudflare Cookies 已过期，正在刷新...');
            }
            else {
                logger_1.default.info('正在通过 Cloudflare 绕过获取 Cookies...');
            }
            logger_1.default.debug(`目标URL: ${baseUrl}`);
            // 先尝试绕过 Cloudflare
            await this.cloudflareBypass.bypassCloudflare(baseUrl);
            // 获取 cookies
            logger_1.default.debug('正在从页面获取Cookies...');
            const cookies = await this.cloudflareBypass.getCookies();
            if (cookies && cookies.trim().length > 0) {
                this.cloudflareCookies = cookies;
                this.lastCookieRefresh = currentTime;
                logger_1.default.info(`Cloudflare Cookies 获取成功: ${cookies.split(';').length} 个 cookies，有效期 ${this.cookieRefreshInterval / 1000 / 60} 分钟`);
                logger_1.default.debug(`获取到的Cookies: ${cookies}`);
                // 验证获取到的cookies是否有效
                const isValid = this.isValidCookieString(cookies);
                logger_1.default.debug(`Cookie验证结果: ${isValid}`);
                if (isValid) {
                    return cookies;
                }
                else {
                    logger_1.default.warn('获取到的 Cloudflare Cookies 包含无效字符');
                    return null;
                }
            }
            else {
                logger_1.default.warn('未获取到有效的 Cloudflare Cookies');
                return null;
            }
        }
        catch (error) {
            logger_1.default.error(`获取 Cloudflare Cookies 失败: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            return null;
        }
    }
    /**
     * 使用 Cloudflare 绕过器执行 AJAX 请求
     */
    async executeAjaxWithCloudflare(url) {
        const cfStartTime = Date.now();
        if (!this.cloudflareBypass) {
            logger_1.default.warn('executeAjaxWithCloudflare: Cloudflare绕过器未初始化，无法执行AJAX请求');
            return null;
        }
        try {
            logger_1.default.info('executeAjaxWithCloudflare: 正在使用 Cloudflare 绕过器执行 AJAX 请求...');
            logger_1.default.debug(`executeAjaxWithCloudflare: AJAX请求URL: ${url}`);
            logger_1.default.debug(`executeAjaxWithCloudflare: 开始调用 bypass.executeAjax`);
            const executeStart = Date.now();
            const result = await this.cloudflareBypass.executeAjax(url);
            const executeTime = Date.now() - executeStart;
            if (result) {
                const totalTime = Date.now() - cfStartTime;
                logger_1.default.info(`executeAjaxWithCloudflare: AJAX 请求成功，状态码: 200`);
                logger_1.default.debug(`executeAjaxWithCloudflare: AJAX 响应详情: status=200, statusText=, responseLength=${result.length}`);
                logger_1.default.debug(`executeAjaxWithCloudflare: 执行耗时: ${Math.round(executeTime / 1000)}s, 总耗时: ${Math.round(totalTime / 1000)}s`);
                logger_1.default.debug(`executeAjaxWithCloudflare: AJAX 响应内容 (前500字符): ${result.substring(0, 500)}`);
                return result;
            }
            else {
                const totalTime = Date.now() - cfStartTime;
                logger_1.default.warn(`executeAjaxWithCloudflare: AJAX 请求返回空响应 (耗时: ${Math.round(totalTime / 1000)}s)`);
                return null;
            }
        }
        catch (error) {
            const totalTime = Date.now() - cfStartTime;
            logger_1.default.error(`executeAjaxWithCloudflare: AJAX 请求失败 (耗时: ${Math.round(totalTime / 1000)}s)`);
            logger_1.default.error(`executeAjaxWithCloudflare: 错误详情: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`executeAjaxWithCloudflare: 错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            // 如果是AxiosError，记录更详细的响应信息
            if (error instanceof Error && error.name === 'AxiosError') {
                const axiosError = error;
                logger_1.default.error(`executeAjaxWithCloudflare: 响应状态码: ${axiosError.response?.status || 'N/A'}`);
                if (axiosError.response) {
                    logger_1.default.error(`executeAjaxWithCloudflare: 完整响应数据: ${JSON.stringify(axiosError.response.data, null, 2)}`);
                    logger_1.default.error(`executeAjaxWithCloudflare: 响应头: ${JSON.stringify(axiosError.response.headers || {}, null, 2)}`);
                }
                if (axiosError.config) {
                    logger_1.default.debug(`executeAjaxWithCloudflare: 请求方法: ${axiosError.config.method || 'N/A'}`);
                    logger_1.default.debug(`executeAjaxWithCloudflare: 请求头: ${JSON.stringify(axiosError.config.headers || {}, null, 2)}`);
                }
            }
            logger_1.default.error(`executeAjaxWithCloudflare: 错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            return null;
        }
    }
    /**
     * 验证Cookie值是否有效
     */
    isValidCookieValue(value) {
        // 检查值是否包含非可打印字符或控制字符
        // 允许的字符：字母、数字、常见符号、空格等
        if (!value || typeof value !== 'string') {
            return false;
        }
        // 检查长度，太长的Cookie可能有问题
        if (value.length > 4096) {
            return false;
        }
        // 检查是否只包含可打印ASCII字符和常见Unicode字符
        // 排除控制字符（0-31和127）
        for (let i = 0; i < value.length; i++) {
            const charCode = value.charCodeAt(i);
            if (charCode < 32 || charCode === 127) {
                return false;
            }
        }
        return true;
    }
    /**
     * 安全地设置Cookie到请求头
     */
    setCookieHeader(headers, cookieString) {
        try {
            // 首先验证Cookie字符串是否有效
            if (!this.isValidCookieString(cookieString)) {
                logger_1.default.warn('Cookie字符串验证失败，包含无效字符');
                return false;
            }
            headers.Cookie = cookieString;
            logger_1.default.debug('Cookie已安全设置到请求头');
            return true;
        }
        catch (error) {
            logger_1.default.warn(`设置Cookie时发生错误: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }
    /**
     * 创建代理agent
     * @param proxyUrl 代理URL
     * @returns 代理agent或null
     */
    createProxyAgent(proxyUrl) {
        try {
            const url = new URL(proxyUrl);
            const agentOptions = {
                proxy: {
                    host: url.hostname,
                    port: parseInt(url.port, 10),
                    // 可选：如果代理需要认证
                    // proxyAuth: 'username:password'
                }
            };
            return url.protocol === 'http:'
                ? tunnel_1.default.httpsOverHttp(agentOptions)
                : tunnel_1.default.httpsOverHttps(agentOptions);
        }
        catch (error) {
            logger_1.default.error(`创建代理agent失败: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    /**
     * 验证Cookie字符串是否有效
     */
    isValidCookieString(cookieString) {
        if (!cookieString || typeof cookieString !== 'string') {
            return false;
        }
        // 检查总长度
        if (cookieString.length > 8192) {
            return false;
        }
        // 分割并验证每个Cookie
        const cookies = cookieString.split(';');
        for (const cookie of cookies) {
            const trimmedCookie = cookie.trim();
            if (trimmedCookie.length === 0) {
                continue;
            }
            // 检查Cookie格式（至少包含一个=）
            const equalIndex = trimmedCookie.indexOf('=');
            if (equalIndex <= 0 || equalIndex >= trimmedCookie.length - 1) {
                return false;
            }
            // 验证Cookie名称
            const name = trimmedCookie.substring(0, equalIndex).trim();
            if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
                return false;
            }
            // 验证Cookie值
            const value = trimmedCookie.substring(equalIndex + 1).trim();
            if (!this.isValidCookieValue(value)) {
                return false;
            }
        }
        return true;
    }
    /**
     * 创建 HTTPS Agent，支持代理和 SSL 配置
     * @returns HTTPS Agent 实例
     */
    createHttpsAgent() {
        // 默认严格验证 SSL 证书
        const strictSSL = this.config.strictSSL !== false; // 默认为 true
        // 代理配置
        const proxyOptions = {};
        if (this.config.proxy) {
            try {
                const proxyUrl = new URL(this.config.proxy);
                proxyOptions.proxy = {
                    host: proxyUrl.hostname,
                    port: parseInt(proxyUrl.port) || (proxyUrl.protocol === 'https:' ? 443 : 80)
                };
                // 如果代理需要认证
                if (proxyUrl.username && proxyUrl.password) {
                    proxyOptions.proxy.headers = {
                        'Proxy-Authorization': `Basic ${Buffer.from(`${proxyUrl.username}:${proxyUrl.password}`).toString('base64')}`
                    };
                }
            }
            catch (error) {
                logger_1.default.warn(`代理URL解析失败: ${this.config.proxy}，将使用默认代理设置`);
            }
        }
        return new https_1.default.Agent({
            rejectUnauthorized: strictSSL,
            ...proxyOptions
        });
    }
    /**
     * 关闭 Cloudflare 绕过器
     */
    async close() {
        if (this.cloudflareBypass) {
            await this.cloudflareBypass.close();
            this.cloudflareBypass = null;
        }
    }
}
exports.default = RequestHandler;
//# sourceMappingURL=requestHandler.js.map