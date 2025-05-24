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
import { getSystemProxy, parseProxyServer } from '../utils/systemProxy';



class ConfigManager {
    private config: Config;

    constructor() {
        this.config = {
            BASE_URL: 'https://www.javbus.com/',
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
    }

    public async updateFromProgram(program: Command): Promise<void> {
        // 先读取系统代理设置
        const systemProxy = await getSystemProxy();
        console.log('系统代理设置:', systemProxy);
        if (systemProxy.enabled && systemProxy.server) {
            this.config.proxy = parseProxyServer(systemProxy.server);
        }

        // 命令行参数覆盖系统代理设置
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

    public getConfig() {
        return this.config;
    }
}

export default ConfigManager;
export { Config };