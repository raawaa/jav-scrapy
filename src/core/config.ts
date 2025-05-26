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


class ConfigManager {
    private config: Config;
    private configPath: string;

    constructor() {
        this.config = {
            retryCount: 3,
            retryDelay: 1000,
            BASE_URL: 'https://www.javbus.com/',
            baseUrl: 'https://www.javbus.com/',
            searchUrl: '/search',
            parallel: 2,
            headers: {
                Referer: 'https://www.javbus.com/',
                Cookie: 'existmag=mag'
            },
            output: process.cwd(),
            timeout: 30000,
            search: null,
            base: null,
            nomag: false,
            allmag: false,
            nopic: false,
            limit: 0,
            proxy: undefined
        };
        this.configPath = `${process.env.HOME}/.config.json`; // 配置文件路径
    }

    public async updateFromProgram(program: Command): Promise<void> {
        // 先读取系统代理设置
        const systemProxy = await getSystemProxy();
        console.log('系统代理设置:', systemProxy);
        if (systemProxy.enabled && systemProxy.server) {
            this.config.proxy = parseProxyServer(systemProxy.server);
        }

        // === 添加加载本地防屏蔽地址作为默认baseUrl的逻辑 ===
        const antiblockUrlsFilePath = `${process.env.HOME}/.jav-scrapy-antiblock-urls.json`;
        let existingUrls: string[] = [];
        try {
            if (fs.existsSync(antiblockUrlsFilePath)) {
                const data = fs.readFileSync(antiblockUrlsFilePath, 'utf-8');
                const parsedUrls = JSON.parse(data);
                if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
                    existingUrls = parsedUrls;
                    // 随机选择一个作为默认baseUrl
                    const randomIndex = Math.floor(Math.random() * existingUrls.length);
                    this.config.base = existingUrls[randomIndex];
                    logger.info(`使用本地保存的防屏蔽地址作为 baseUrl: ${chalk.underline.blue(this.config.base)}`);
                }
            }
        } catch (error) {
            logger.error(`读取或解析防屏蔽地址文件失败，不使用本地地址作为默认baseUrl: ${error instanceof Error ? error.message : String(error)}`);
        }
        // === 结束加载本地防屏蔽地址的逻辑 ===

        // 命令行参数覆盖本地设置和系统代理设置
        if (program.opts().proxy) {
            this.config.proxy = program.opts().proxy;
        }
        this.config.parallel = parseInt(program.opts().parallel) || 2;
        this.config.timeout = parseInt(program.opts().timeout) || 30000;
        if (program.opts().output !== undefined && program.opts().output !== null) {
            this.config.output = program.opts().output;
        }
        if (program.opts().search !== undefined && program.opts().search !== null) {
            this.config.search = program.opts().search;
        }
        if (program.opts().base !== undefined && program.opts().base !== null) {
            this.config.base = program.opts().base;
            try {
                const baseUrl = new URL(program.opts().base);
                this.config.headers.Referer = `${baseUrl.protocol}//${baseUrl.hostname}/`;
            } catch (error) {
                // 忽略解析错误，保持原有Referer
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
    }

    public updateConfig(newConfig: Partial<Config>): void {
        logger.debug(`正在保存配置到: ${this.configPath}`);
        this.config = { ...this.config, ...newConfig };
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        logger.debug('配置保存成功');
    }

    public getConfig() {
        return this.config;
    }
}

export default ConfigManager;
export { Config };