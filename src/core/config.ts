import path from 'path';
import userHome from 'user-home';
import { Command } from 'commander'; // 引入 Commander 库中的 Command 类型
import { Config } from '../types/interfaces'; // 引入 Config 接口的路径，根据实际情况调整路径



class ConfigManager {
    private config: Config;

    constructor() {
        this.config = {
            DEFAULT_TIMEOUT: 30000,
            BASE_URL: 'https://www.fanbus.ink/',
            parallel: 2,
            headers: {
                Referer: 'https://www.fanbus.ink/',
                Cookie: 'existmag=mag'
            },
            output: path.join(userHome, 'magnets'),
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
        this.config.output = (program.opts().output || path.join(userHome, 'magnets')).replace(/['"]/g, '');
        this.config.search = program.opts().search;
        this.config.base = program.opts().base;
        this.config.nomag = program.opts().nomag;
        this.config.allmag = program.opts().allmag;
        this.config.nopic = program.opts().nopic;
    }

    getConfig() {
        return this.config;
    }
}

export default ConfigManager;
export { Config };