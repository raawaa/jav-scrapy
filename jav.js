#!/usr/bin/env node

'use strict';
const logger = require('./src/logger');
var async = require('async');
const { program } = require('commander');
var userHome = require('user-home');
var path = require('path');
const configManager = require('./src/core/config.js');
const { version } = require('./package.json');
const searchUrl = '/search';


program
    .version(version)
    .usage('[options]')
    .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2', 2)
    .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：30000毫秒')
    .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0', 0)
    .option('-o, --output <file_path>', '设置磁链和封面抓取结果的保存位置，默认为当前用户的主目录下的 magnets 文件夹', path.join(userHome, 'magnets'))
    .option('-s, --search <string>', '搜索关键词，可只抓取搜索结果的磁链或封面')
    .option('-b, --base <url>', '自定义抓取的起始页')
    .option('-x, --proxy <url>', '使用代理服务器, 例：-x http://127.0.0.1:8087')
    .option('-n, --nomag', '是否抓取尚无磁链的影片')
    .option('-a, --allmag', '是否抓取影片的所有磁链(默认只抓取文件体积最大的磁链)')
    .option('-N, --nopic', '不抓取图片')
    .parse(process.argv);


configManager.updateFromProgram(program);
const PROGRAM_CONFIG = configManager.getConfig();


const RequestHandler = require('./src/core/requestHandler');
const FileHandler = require('./src/core/fileHandler');
const Parser = require('./src/core/parser');
const { Logform } = require('winston');

class JavScraper {
    constructor(config) {
        this.config = config;
        this.requestHandler = new RequestHandler(config);
        this.fileHandler = new FileHandler({ outputDir: config.output });
        this.parser = new Parser(config);
        this.pageIndex = 1;
    }

    async mainExecution() {
        const detailPageQueue = async.queue(async (task) => {
            try {
                const response = await this.requestHandler.getPage(task.link);
                const metadata = Parser.parseMetadata(response.body);
                const magnet = await this.parser.parseMagnet(metadata);
                logger.info(`成功抓取 ${metadata.title} 的磁链: ${magnet}`);
            } catch (err) {
                logger.error(`处理详情页 ${task.link} 时出错: ${err.message}`);
            }
        }, this.config.parallel);

        const indexPageQueue = async.queue(async (task) => {
            try {
                logger.info(`开始抓取第 ${task.pageIndex} 页`);
                const response = await this.requestHandler.getPage(this.getCurrentPageUrl(task.pageIndex));
                const links = Parser.parsePageLinks(response.body);
                logger.info(`第 ${task.pageIndex} 页抓取完成，共找到 ${links.length} 条链接`);
                links.forEach(link => {
                    detailPageQueue.push({ link });
                });
                this.pageIndex++;
            } catch (err) {
                logger.error(`抓取第 ${task.pageIndex} 页时出错: ${err.message}`);
            }
        }, this.config.parallel);

        // 统一错误处理
        const handleQueueError = (queueName) => (err, task) => {
            logger.error(`[${queueName}] 处理任务时出错: ${err.message}`);
            logger.debug(`错误详情: ${err.stack}`);
        };

        indexPageQueue.error(handleQueueError('indexPageQueue'));
        detailPageQueue.error(handleQueueError('detailPageQueue'));

        // 启动抓取
        while (true) {
            await indexPageQueue.push({ pageIndex: this.pageIndex });

            // 添加延迟避免过快请求
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    }


    getCurrentPageUrl(pageIndex) {
        // 封装生成页码后缀的函数，提高代码复用性
        const generatePageSuffix = (index) => index === 1 ? '' : `/page/${index}`;
        // 根据不同条件生成 URL
        let url;
        if (this.config.search) {
            // 确保BASE_URL末尾没有斜杠
            const cleanUrl = this.config.BASE_URL.endsWith('/') ? this.config.BASE_URL.slice(0, -1) : this.config.BASE_URL;
            url = `${cleanUrl}${searchUrl}/${encodeURIComponent(this.config.search)}${generatePageSuffix(pageIndex)}`;
        } else if (this.config.base) {
            // Ensure base URL ends with slash if it doesn't already
            const base = this.config.base.endsWith('/') ? this.config.base.slice(0, -1) : this.config.base;
            url = `${base}${generatePageSuffix(pageIndex)}`;
        } else {
            const cleanUrl = this.config.BASE_URL.endsWith('/') ? this.config.BASE_URL.slice(0, -1) : this.config.BASE_URL;
            url = `${cleanUrl}${generatePageSuffix(pageIndex)}`;
        }
        return url;
    }
}


(async () => {
    const scraper = new JavScraper(PROGRAM_CONFIG);
    logger.info('开始抓取 Jav 影片...');
    logger.info(`使用配置: ${JSON.stringify(PROGRAM_CONFIG, null, 2)}`);
    await scraper.mainExecution();
})();