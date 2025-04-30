#!/usr/bin/env node

import logger from './core/logger';
import { program } from 'commander';
import ConfigManager from './core/config';
import { version } from '../package.json';
import Scraper from './core/scraper';

const configManager = new ConfigManager();
configManager.updateFromProgram(program);
const PROGRAM_CONFIG = configManager.getConfig();


program
    .version(version)
    .usage('[options] [command]')

// 添加 search 子命令
program.command('search <keyword>')
    .description('搜索内容并抓取')
    .action((keyword) => {
        program.opts().search = keyword;
        const configManager = new ConfigManager();
        configManager.updateFromProgram(program);
        const PROGRAM_CONFIG = configManager.getConfig();
        const scraper = new Scraper(PROGRAM_CONFIG);
        scraper.mainExecution();
    });

// 添加 cat 子命令
program.command('cat <type>')
    .description('抓取特定类型影片')
    .action((type) => {
        // 这里需要根据类型实现具体逻辑
        console.log(`开始抓取 ${type} 类型的影片`);
    });

// 添加 act 子命令
program.command('act <actress>')
    .description('抓取特定女优影片')
    .action((actress) => {
        // 这里需要根据女优名字实现具体逻辑
        console.log(`开始抓取 ${actress} 的影片`);
    });

// 添加 pull 子命令
program.command('pull')
    .description('抓取所有影片')
    .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2')
    .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：30000毫秒')
    .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0')
    .option('-o, --output <file_path>', '设置磁链和封面抓取结果的保存位置，默认为当前工作目录')
    .option('-s, --search <string>', '搜索关键词，可只抓取搜索结果的磁链或封面')
    .option('-b, --base <url>', '自定义抓取的起始页')
    .option('-x, --proxy <url>', '使用代理服务器, 例：-x http://127.0.0.1:8087')
    .option('-n, --nomag', '是否抓取尚无磁链的影片')
    .option('-a, --allmag', '是否抓取影片的所有磁链(默认只抓取文件体积最大的磁链)')
    .option('-N, --nopic', '不抓取图片')
    .action(() => {
        // 这里需要实现抓取所有影片的逻辑
        console.log('开始抓取所有影片');
        const scraper = new Scraper(PROGRAM_CONFIG);
        logger.info('开始抓取 Jav 影片...');
        logger.info(`使用配置: ${JSON.stringify(PROGRAM_CONFIG, null, 2)}`);
        scraper.mainExecution();
    });

program.parse(process.argv);







