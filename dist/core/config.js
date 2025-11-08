"use strict";
/**
 * @file config.ts
 * @description 配置管理模块，用于管理和更新程序的配置信息。
 * @module config
 * @requires commander - 用于解析命令行参数的库。
 * @requires user-home - 用于获取用户主目录路径的库。
 * @requires types/interfaces - 包含 Config 接口的路径。
 * @requires logger - 日志记录器模块。
 * @requires fs - 文件系统模块。
 * @exports ConfigManager - 配置管理类的导出。
 * @exports Config - Config 接口的导出。
 * @author raawaa
 */
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
const systemProxy_1 = require("../utils/systemProxy");
const logger_1 = __importDefault(require("./logger")); // 引入日志记录器模块
const fs_1 = __importDefault(require("fs")); // 引入文件系统模块
const chalk_1 = __importDefault(require("chalk")); // 引入 chalk 库用于美化输出
const path = __importStar(require("path"));
const constants_1 = require("./constants");
const errorHandler_1 = require("../utils/errorHandler");
class ConfigManager {
    constructor() {
        this.config = {
            retryCount: constants_1.DEFAULT_CONFIG.retryCount,
            retryDelay: constants_1.DEFAULT_CONFIG.retryDelay,
            BASE_URL: constants_1.BASE_URL,
            baseUrl: constants_1.BASE_URL,
            searchUrl: constants_1.DEFAULT_CONFIG.searchUrl,
            parallel: constants_1.DEFAULT_CONFIG.parallel,
            headers: {
                ...constants_1.DEFAULT_HEADERS
            },
            output: process.cwd(),
            timeout: constants_1.DEFAULT_CONFIG.timeout,
            search: null,
            base: null,
            nomag: false,
            allmag: false,
            nopic: false,
            limit: 0,
            delay: 2, // 添加默认延迟参数
            strictSSL: constants_1.DEFAULT_CONFIG.strictSSL, // 是否严格验证SSL证书
            proxy: undefined,
            useCloudflareBypass: false, // 默认不启用 Cloudflare 绕过
            // Puppeteer池配置 - 优化内存使用
            puppeteerPool: {
                maxSize: Math.max(1, Math.min(2, Math.floor(constants_1.DEFAULT_CONFIG.parallel / 2))), // 限制最大实例数，减少内存占用
                maxIdleTime: 3 * 60 * 1000, // 3分钟（从5分钟降低）
                healthCheckInterval: 30 * 1000, // 30秒
                requestTimeout: 60000, // 1分钟
                retryAttempts: 3
            }
        };
        this.configPath = `${process.env.HOME}/.config.json`; // 配置文件路径
    }
    async updateFromProgram(program) {
        // 先读取系统代理设置
        const systemProxy = await (0, systemProxy_1.getSystemProxy)();
        logger_1.default.info(`系统代理设置: ${JSON.stringify(systemProxy)}`);
        if (systemProxy.enabled && systemProxy.server) {
            this.config.proxy = (0, systemProxy_1.parseProxyServer)(systemProxy.server);
        }
        // === 添加加载本地防屏蔽地址作为默认baseUrl的逻辑 ===
        const antiblockUrls = this.loadAntiBlockUrls();
        if (antiblockUrls.length > 0) {
            // 随机选择一个作为默认baseUrl
            const randomIndex = Math.floor(Math.random() * antiblockUrls.length);
            const selectedUrl = antiblockUrls[randomIndex];
            // 统一设置所有URL字段
            this.config.base = selectedUrl;
            this.config.baseUrl = selectedUrl;
            this.config.BASE_URL = selectedUrl.endsWith('/') ? selectedUrl.slice(0, -1) : selectedUrl; // 确保末尾没有/
            this.config.headers.Referer = selectedUrl;
            logger_1.default.info(`使用本地保存的防屏蔽地址作为 baseUrl: ${chalk_1.default.underline.blue(selectedUrl)}`);
        }
        // 命令行参数覆盖本地设置和系统代理设置
        if (program.opts().proxy) {
            this.config.proxy = program.opts().proxy;
        }
        if (program.opts().cookies) {
            // 解析手动设置的cookies
            const cookiesObj = {};
            const cookiesStr = program.opts().cookies;
            const cookiesPairs = cookiesStr.split(';').map((pair) => pair.trim());
            for (const pair of cookiesPairs) {
                const [key, value] = pair.split('=');
                if (key && value) {
                    cookiesObj[key.trim()] = value.trim();
                }
            }
            // 更新请求头中的Cookie
            if (Object.keys(cookiesObj).length > 0) {
                this.config.headers.Cookie = program.opts().cookies;
                logger_1.default.info(`使用手动设置的 Cookies: ${Object.keys(cookiesObj).join(', ')}`);
            }
        }
        this.config.parallel = parseInt(program.opts().parallel) || constants_1.DEFAULT_CONFIG.parallel;
        this.config.timeout = parseInt(program.opts().timeout) || constants_1.DEFAULT_CONFIG.timeout;
        if (program.opts().output !== undefined && program.opts().output !== null) {
            this.config.output = program.opts().output;
        }
        if (program.opts().search !== undefined && program.opts().search !== null) {
            this.config.search = program.opts().search;
        }
        if (program.opts().base !== undefined && program.opts().base !== null) {
            const baseParam = program.opts().base;
            // 统一设置所有URL字段
            this.config.base = baseParam;
            this.config.baseUrl = baseParam;
            this.config.BASE_URL = baseParam.endsWith('/') ? baseParam.slice(0, -1) : baseParam; // 确保末尾没有/
            try {
                const baseUrl = new URL(baseParam);
                this.config.headers.Referer = `${baseUrl.protocol}//${baseUrl.hostname}/`;
            }
            catch (error) {
                logger_1.default.warn(`无法解析base参数URL: ${baseParam}，使用默认Referer`);
                // 保持原有Referer
            }
        }
        if (program.opts().nomag !== undefined && program.opts().nomag !== null) {
            this.config.nomag = program.opts().nomag;
        }
        if (program.opts().allmag !== undefined && program.opts().allmag !== null) {
            this.config.allmag = program.opts().allmag;
        }
        if (program.opts().nopic !== undefined && program.opts().nopic !== null) {
            this.config.nopic = program.opts().nopic;
        }
        if (program.opts().limit !== undefined && program.opts().limit !== null) {
            this.config.limit = parseInt(program.opts().limit);
        }
        if (program.opts().delay !== undefined && program.opts().delay !== null) {
            this.config.delay = parseInt(program.opts().delay);
        }
        // 处理 Cloudflare 绕过选项
        if (program.opts().cloudflare) {
            this.config.useCloudflareBypass = true;
            logger_1.default.info('已启用 Cloudflare 绕过功能');
        }
        // 处理SSL验证选项（--no-strict-ssl）
        // 注意：--no-xxx选项在Commander中会设置为undefined，我们需要特殊处理
        const hasStrictSSLFlag = Object.prototype.hasOwnProperty.call(program.opts(), 'strictSSL');
        logger_1.default.debug(`strictSSL option exists: ${hasStrictSSLFlag}, value: ${program.opts().strictSSL}`);
        if (hasStrictSSLFlag) {
            // 如果选项存在，则使用其值（false表示--no-strict-ssl，true表示--strict-ssl）
            this.config.strictSSL = program.opts().strictSSL !== false;
            if (!this.config.strictSSL) {
                logger_1.default.warn('已禁用SSL证书严格验证，可能存在安全风险');
            }
        }
    }
    updateConfig(newConfig) {
        logger_1.default.debug(`正在保存配置到: ${this.configPath}`);
        this.config = { ...this.config, ...newConfig };
        try {
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            logger_1.default.debug('配置保存成功');
        }
        catch (error) {
            errorHandler_1.ErrorHandler.handleFileError(error, '更新配置文件');
        }
    }
    getConfig() {
        return this.config;
    }
    loadAntiBlockUrls() {
        const homeDir = (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME) || process.cwd();
        const antiblockUrlsFilePath = path.join(homeDir, '.jav-scrapy-antiblock-urls.json');
        try {
            if (fs_1.default.existsSync(antiblockUrlsFilePath)) {
                const data = fs_1.default.readFileSync(antiblockUrlsFilePath, 'utf-8');
                const parsedUrls = JSON.parse(data);
                if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
                    return parsedUrls;
                }
            }
        }
        catch (error) {
            logger_1.default.error(`读取或解析防屏蔽地址文件失败，不使用本地地址作为默认baseUrl: ${error instanceof Error ? error.message : String(error)}`);
        }
        return [];
    }
}
exports.default = ConfigManager;
//# sourceMappingURL=config.js.map