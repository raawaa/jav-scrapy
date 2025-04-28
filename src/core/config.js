const path = require('path');
const userHome = require('user-home');

class ConfigManager {
    constructor() {
        this.config = {
            DEFAULT_TIMEOUT: 30000,
            BASE_URL: 'https://www.fanbus.ink/',
            parallel: 2,
            proxy: null,
            headers: {
                'Referer': 'http://www.javbus2.pw',
                'Cookie': 'existmag=mag; PHPSESSID=4p7qb93bj920lemlmrpk9tu4m4'
            },
            output: path.join(userHome, 'magnets'),
            search: null,
            base: null,
            nomag: false,
            allmag: false,
            nopic: false
        };
    }

    updateFromProgram(program) {
        this.config.parallel = parseInt(program.opts().parallel) || 2;
        this.config.timeout = parseInt(program.opts().timeout) || 30000;
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

module.exports = new ConfigManager();