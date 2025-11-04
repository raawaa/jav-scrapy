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


import { Command } from 'commander'; // 引入 Commander 库中的 Command 类型
import { Config } from '../types/interfaces'; // 引入 Config 接口的路径，根据实际情况调整路径
import { getSystemProxy, parseProxyServer } from '../utils/systemProxy';
import logger from './logger'; // 引入日志记录器模块
import fs from 'fs'; // 引入文件系统模块
import chalk from 'chalk'; // 引入 chalk 库用于美化输出
import * as path from 'path';
import { DEFAULT_CONFIG, BASE_URL, DEFAULT_HEADERS } from './constants';
import { ErrorHandler } from '../utils/errorHandler';


class ConfigManager {
    private config: Config;
    private configPath: string;

    constructor() {
        this.config = {
            retryCount: DEFAULT_CONFIG.retryCount,
            retryDelay: DEFAULT_CONFIG.retryDelay,
            BASE_URL: BASE_URL,
            baseUrl: BASE_URL,
            searchUrl: DEFAULT_CONFIG.searchUrl,
            parallel: DEFAULT_CONFIG.parallel,
            headers: {
                ...DEFAULT_HEADERS
            },
            output: process.cwd(),
            timeout: DEFAULT_CONFIG.timeout,
            search: null,
            base: null,
            nomag: false,
            allmag: false,
            nopic: false,
            limit: 0,
            delay: 2, // 添加默认延迟参数
            proxy: undefined,
            useCloudflareBypass: false // 默认不启用 Cloudflare 绕过
        };
        this.configPath = `${process.env.HOME}/.config.json`; // 配置文件路径
    }

    public async updateFromProgram(program: Command): Promise<void> {
        // 先读取系统代理设置
        const systemProxy = await getSystemProxy();
        logger.info(`系统代理设置: ${JSON.stringify(systemProxy)}`);
        if (systemProxy.enabled && systemProxy.server) {
            this.config.proxy = parseProxyServer(systemProxy.server);
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

            logger.info(`使用本地保存的防屏蔽地址作为 baseUrl: ${chalk.underline.blue(selectedUrl)}`);
        }
        

        // 命令行参数覆盖本地设置和系统代理设置
        if (program.opts().proxy) {
            this.config.proxy = program.opts().proxy;
        }
        if (program.opts().cookies) {
            // 解析手动设置的cookies
            const cookiesObj: Record<string, string> = {};
            const cookiesStr = program.opts().cookies;
            const cookiesPairs = cookiesStr.split(';').map((pair: string) => pair.trim());
            
            for (const pair of cookiesPairs) {
                const [key, value] = pair.split('=');
                if (key && value) {
                    cookiesObj[key.trim()] = value.trim();
                }
            }
            
            // 更新请求头中的Cookie
            if (Object.keys(cookiesObj).length > 0) {
                this.config.headers.Cookie = program.opts().cookies;
                logger.info(`使用手动设置的 Cookies: ${Object.keys(cookiesObj).join(', ')}`);
            }
        }
        this.config.parallel = parseInt(program.opts().parallel) || DEFAULT_CONFIG.parallel;
        this.config.timeout = parseInt(program.opts().timeout) || DEFAULT_CONFIG.timeout;
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
            } catch (error) {
                logger.warn(`无法解析base参数URL: ${baseParam}，使用默认Referer`);
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
        if(program.opts().limit!== undefined && program.opts().limit!== null){
            this.config.limit = parseInt(program.opts().limit);
        }
        if(program.opts().delay!== undefined && program.opts().delay!== null){
            this.config.delay = parseInt(program.opts().delay);
        }

        // 处理 Cloudflare 绕过选项
        if (program.opts().cloudflare) {
            this.config.useCloudflareBypass = true;
            logger.info('已启用 Cloudflare 绕过功能');
        }
    }

    public updateConfig(newConfig: Partial<Config>): void {
        logger.debug(`正在保存配置到: ${this.configPath}`);
        this.config = { ...this.config, ...newConfig };
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            logger.debug('配置保存成功');
        } catch (error) {
            ErrorHandler.handleFileError(error, '更新配置文件');
        }
    }

    public getConfig() {
        return this.config;
    }

    private loadAntiBlockUrls(): string[] {
        const homeDir = (process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME) || process.cwd();
        const antiblockUrlsFilePath = path.join(homeDir, '.jav-scrapy-antiblock-urls.json');
        try {
            if (fs.existsSync(antiblockUrlsFilePath)) {
                const data = fs.readFileSync(antiblockUrlsFilePath, 'utf-8');
                const parsedUrls = JSON.parse(data);
                if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
                    return parsedUrls;
                }
            }
        } catch (error) {
            logger.error(`读取或解析防屏蔽地址文件失败，不使用本地地址作为默认baseUrl: ${error instanceof Error ? error.message : String(error)}`);
        }
        return [];
    }
}

export default ConfigManager;
export { Config };