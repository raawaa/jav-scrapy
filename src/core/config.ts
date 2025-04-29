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
            nopic: false
        };
    }

    public updateFromProgram(program: Command): void {
        this.config.parallel = parseInt(program.opts().parallel) || 2;
        // 原代码中 Config 接口不存在 timeout 属性，应使用 DEFAULT_TIMEOUT 属性
        this.config.DEFAULT_TIMEOUT = parseInt(program.opts().timeout) || 30000;
        this.config.proxy = process.env.http_proxy || program.opts().proxy;
        if (program.opts().output !== undefined && program.opts().output !== null) {
            this.config.output = program.opts().output;
        }
        if (program.opts().search !== undefined && program.opts().search !== null) {
            this.config.search = program.opts().search;
        }
        if (program.opts().base !== undefined && program.opts().base !== null) {
            this.config.base = program.opts().base;
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
    }

    public getConfig() {
        return this.config;
    }
}

export default ConfigManager;
export { Config };