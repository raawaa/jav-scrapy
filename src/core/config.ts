/**
 * @file config.ts
 * @description 配置管理模块，用于管理和更新程序的配置信息。
 * @module config
 * @requires commander - 用于解析命令行参数的库。
 * @requires user-home - 用于获取用户主目录路径的库。
 * @requires types/interfaces - 包含 Config 接口的路径。
 * @requires logger - 日志记录器模块。
 * @exports ConfigManager - 配置管理类的导出。
 * @exports Config - Config 接口的导出。
 * @author raawaa
 */


import { Command } from 'commander'; // 引入 Commander 库中的 Command 类型
import { Config } from '../types/interfaces'; // 引入 Config 接口的路径，根据实际情况调整路径



class ConfigManager {
    private config: Config;

    constructor() {
        this.config = {
            DEFAULT_TIMEOUT: 30000,
            BASE_URL: 'https://www.fanbus.ink',
            searchUrl: '/search',
            parallel: 2,
            headers: {
                Referer: 'https://www.fanbus.ink/',
                Cookie: 'existmag=mag'
            },
            output: process.cwd(),
            search: null,
            base: null,
            nomag: false,
            allmag: false,
            nopic: false,
            limit: 0,
        };
    }

    public updateFromProgram(options: any): void {
        this.config.parallel = parseInt(options.parallel) || this.config.parallel;
        // 原代码中 Config 接口不存在 timeout 属性，应使用 DEFAULT_TIMEOUT 属性
        this.config.DEFAULT_TIMEOUT = parseInt(options.timeout) || this.config.DEFAULT_TIMEOUT;
        this.config.proxy = process.env.http_proxy || options.proxy;
        if (options.output !== undefined && options.output !== null) {
            this.config.output = options.output;
        }
        if (options.search !== undefined && options.search !== null) {
            this.config.search = options.search;
        }
        if (options.base !== undefined && options.base !== null) {
            this.config.base = options.base;
            try {
                const baseUrl = new URL(options.base);
                this.config.headers.Referer = `${baseUrl.protocol}//${baseUrl.hostname}/`;
            } catch (error) {
                // 忽略解析错误，保持原有Referer
            }
        }

        if (options.nomag !== undefined && options.nomag !== null) {
            this.config.nomag = options.nomag;
        }
        if (options.allmag !== undefined && options.allmag !== null) {
            this.config.allmag = options.allmag;
        }
        if (options.nopic !== undefined && options.nopic !== null) {
            this.config.nopic = options.nopic;
        }
        if (options.limit !== undefined && options.limit !== null) {
            this.config.limit = parseInt(options.limit);
        }
    }

    public getConfig() {
        return this.config;
    }
}

export default ConfigManager;
export { Config };