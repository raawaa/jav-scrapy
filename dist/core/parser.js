"use strict";
/**
 * @file parser.ts
 * @description 解析器模块，用于解析页面内容和提取所需信息。
 * @module parser
 * @requires cheerio - 用于解析HTML的库。
 * @exports parsePageLinks - 解析页面中的电影链接。
 * @exports parseMetadata - 解析页面中的元数据。
 * @exports parseCategories - 解析页面中的分类信息。
 * @exports parseActress - 解析页面中的演员信息。
 * @exports parseFilmData - 解析页面中的影片数据。
 * @author raawaa
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./logger"));
class Parser {
    constructor(config) {
        this.config = config;
    }
    /**
     * 解析页面中的电影链接
     * @param {string} html - 页面HTML内容
     * @returns {Array<string>} 电影详情页链接数组
     */
    static parsePageLinks(html) {
        const $ = require('cheerio').load(html);
        // 检查页面内容是否为空
        if (!html || html.length === 0) {
            logger_1.default.warn('parsePageLinks: 接收到空的HTML内容');
            return [];
        }
        const links = $('a.movie-box').map((i, el) => $(el).attr('href')).get();
        logger_1.default.debug(`解析到 ${links.length} 个影片链接`);
        if (links.length === 0) {
            // 只在调试模式下输出完整HTML或其片段，避免日志过长
            logger_1.default.debug('页面中未找到影片链接，页面内容片段 (前1000字符):');
            logger_1.default.debug(html.substring(0, 1000));
        }
        return links;
    }
    /**
     * 解析页面中的元数据
     * @param {string} html - 页面 HTML 内容
     * @returns {Metadata} 包含影片元数据的对象
     * @throws {Error} 当无法从脚本中解析出所需元数据时抛出错误
     * @description 从页面 HTML 内容中提取影片的 gid、uc、img、标题、分类和演员信息
     */
    static parseMetadata(html) {
        if (!html || typeof html !== 'string') {
            logger_1.default.warn('parseMetadata: HTML内容为空或不是字符串');
            throw new Error('Invalid HTML content for metadata parsing');
        }
        if (html.length === 0) {
            logger_1.default.warn('parseMetadata: HTML内容长度为0');
            throw new Error('Empty HTML content for metadata parsing');
        }
        const $ = require('cheerio').load(html);
        const scripts = $('script', 'body');
        logger_1.default.debug(`parseMetadata: 页面中找到 ${scripts.length} 个script标签`);
        // 尝试不同的script位置
        let script = null;
        if (scripts.length >= 3) {
            script = scripts.eq(2).html();
            logger_1.default.debug('parseMetadata: 使用第3个script标签');
        }
        else if (scripts.length >= 2) {
            script = scripts.eq(1).html();
            logger_1.default.debug('parseMetadata: 使用第2个script标签');
        }
        else if (scripts.length >= 1) {
            script = scripts.eq(0).html();
            logger_1.default.debug('parseMetadata: 使用第1个script标签');
        }
        if (!script) {
            logger_1.default.warn('parseMetadata: 未找到脚本内容，可能页面结构已改变');
            logger_1.default.debug('页面内容片段 (前1000字符):');
            logger_1.default.debug(html.substring(0, 1000));
            // 检查是否有其他可能包含元数据的元素
            const hasH3 = $('h3').length > 0;
            const hasGenre = $('.genre').length > 0;
            const hasStarBox = $('.star-box').length > 0;
            logger_1.default.debug(`parseMetadata: 页面检查 - h3:${hasH3}, genre:${hasGenre}, starbox:${hasStarBox}`);
            if (hasH3) {
                logger_1.default.debug(`parseMetadata: 页面包含标题: ${$('h3').text()}`);
            }
            throw new Error('Failed to parse required metadata from script: no script found');
        }
        const gidMatch = /gid\s*=\s*(\d+)/.exec(script);
        const ucMatch = /uc\s*=\s*(\d+)/.exec(script);
        const imgRegex = /img\s*=\s*'([^']+)'/;
        const imgMatch = imgRegex.exec(script);
        logger_1.default.debug(`解析脚本内容: gidMatch=${!!gidMatch}, ucMatch=${!!ucMatch}, imgMatch=${!!imgMatch}`);
        logger_1.default.debug(`脚本长度: ${script.length} 字符`);
        if (!gidMatch || !ucMatch || !imgMatch) {
            logger_1.default.warn('parseMetadata: 无法从脚本中解析出所需元数据');
            logger_1.default.debug(`脚本内容: ${script.substring(0, 500)}`);
            // 检查是否有其他可能的gid/uc提取方式
            const bodyText = $('body').text();
            const altGidMatch = /gid[:\s=]\s*(\d+)/.exec(bodyText);
            const altUcMatch = /uc[:\s=]\s*(\d+)/.exec(bodyText);
            logger_1.default.debug(`尝试替代解析: altGidMatch=${!!altGidMatch}, altUcMatch=${altUcMatch}`);
            throw new Error('Failed to parse required metadata from script');
        }
        const metadata = {
            gid: gidMatch[1],
            uc: ucMatch[1],
            img: imgMatch[1],
            title: $('h3').text(),
            category: this.parseCategories($),
            actress: this.parseActress($)
        };
        logger_1.default.debug(`解析到影片元数据: 标题=${metadata.title}, gid=${metadata.gid}, uc=${metadata.uc}`);
        return metadata;
    }
    /**
     * 解析HTML内容中的影片分类信息
     * @param {any} $ - Cheerio对象或包含分类信息的HTML字符串
     * @returns {Array<string>} 返回分类名称的数组
     * @description 从HTML中提取所有位于<span class="genre">标签内，
     * 且嵌套在<label><a>结构中的文本内容作为分类名称
     */
    static parseCategories($) {
        // 如果传入的是HTML字符串，则加载为Cheerio对象
        if (typeof $ === 'string') {
            if (!$ || $.length === 0) {
                logger_1.default.warn('parseCategories: HTML内容为空或不是字符串');
                return [];
            }
            $ = require('cheerio').load($);
        }
        else if (!$ || typeof $ !== 'function') {
            logger_1.default.warn('parseCategories: 传入的不是有效的Cheerio对象或HTML字符串');
            return [];
        }
        // 检查页面是否包含关键HTML结构
        const hasGenreElements = $('span.genre').length > 0;
        const hasLabelElements = $('span.genre label').length > 0;
        const hasAnchorElements = $('span.genre a').length > 0;
        if (!hasGenreElements) {
            logger_1.default.debug('parseCategories: 页面中没有找到 span.genre 元素');
            logger_1.default.debug(`页面片段: ${$.html ? $.html().substring(0, 500) : '无法获取HTML内容'}`);
        }
        if (!hasLabelElements && hasGenreElements) {
            logger_1.default.debug('parseCategories: 找到 span.genre 但没有找到 label 元素');
        }
        if (!hasAnchorElements && hasLabelElements) {
            logger_1.default.debug('parseCategories: 找到 label 但没有找到 a 元素');
        }
        const categories = $('span.genre label a').map((i, el) => $(el).text()).get();
        logger_1.default.debug(`解析到 ${categories.length} 个分类: ${categories.join(', ')}`);
        if (categories.length === 0 && hasGenreElements) {
            logger_1.default.debug('parseCategories: 页面包含genre元素但未能解析到分类文本');
            // 输出一些元素用于调试
            const sampleGenre = $('span.genre').first();
            if (sampleGenre.length > 0) {
                logger_1.default.debug(`第一个genre元素HTML: ${sampleGenre.html()}`);
            }
        }
        return categories;
    }
    /**
     * 解析HTML内容中的女演员信息
     * @param {any} $ - Cheerio对象或包含演员信息的HTML字符串
     * @returns {Array<string>} 返回女演员名称的数组
     * @description 从HTML中提取所有位于.star-name .a标签内的文本内容作为女演员名称
     */
    static parseActress($) {
        // 如果传入的是HTML字符串，则加载为Cheerio对象
        if (typeof $ === 'string') {
            if (!$ || $.length === 0) {
                logger_1.default.warn('parseActress: HTML内容为空或不是字符串');
                return [];
            }
            $ = require('cheerio').load($);
        }
        else if (!$ || typeof $ !== 'function') {
            logger_1.default.warn('parseActress: 传入的不是有效的Cheerio对象或HTML字符串');
            return [];
        }
        // 检查页面是否包含关键HTML结构
        const hasStarNameElements = $('.star-name').length > 0;
        const hasStarBoxElements = $('.star-box').length > 0;
        const hasAnchorElements = $('.star-name a').length > 0;
        const hasActressSection = $.html ? ($.html().includes('演員') || $.html().includes('女優')) : false;
        if (!hasActressSection) {
            logger_1.default.debug('parseActress: 页面中没有找到演员相关文字');
        }
        if (!hasStarNameElements && hasStarBoxElements) {
            logger_1.default.debug('parseActress: 找到 star-box 但没有找到 star-name 元素');
        }
        if (!hasAnchorElements && hasStarNameElements) {
            logger_1.default.debug('parseActress: 找到 star-name 但没有找到 a 元素');
        }
        const actresses = $('.star-name a').map((i, el) => $(el).text()).get();
        logger_1.default.debug(`解析到 ${actresses.length} 个演员: ${actresses.join(', ')}`);
        if (actresses.length === 0 && hasStarBoxElements) {
            logger_1.default.debug('parseActress: 页面包含star-box元素但未能解析到演员信息');
            // 输出一些元素用于调试
            const sampleStarBox = $('.star-box').first();
            if (sampleStarBox.length > 0) {
                logger_1.default.debug(`第一个star-box元素HTML: ${sampleStarBox.html()}`);
            }
        }
        return actresses;
    }
    /**
     * 将解析的元数据和磁力链接组合成影片数据对象
     * @param {Metadata} metadata - 包含影片元数据的对象
     * @param {string} magnet - 影片的磁力链接，如果没有则为null
     * @param {string} link - 影片详情页链接
     * @returns {FilmData} 返回包含完整影片数据的对象
     * @description 将影片标题、分类、演员信息和磁力链接组合成一个完整的数据对象，
     * 便于后续处理和存储
     */
    static parseFilmData(metadata, link) {
        const filmData = {
            title: metadata.title,
            category: metadata.category,
            actress: metadata.actress
        };
        return filmData;
    }
    /**
     * 提取防屏蔽地址
     * @param {string} html - 页面HTML内容
     * @returns {Array<string>} 防屏蔽地址数组
     * @description 从页面中提取所有包含防屏蔽地址的链接
     */
    static extractAntiBlockUrls(html) {
        const $ = require('cheerio').load(html);
        const antiBlockUrls = [];
        // 定位到包含防屏蔽地址的警告框
        const alertBox = $('.alert.alert-info');
        // 遍历所有包含防屏蔽地址的列
        alertBox.find('.col-xs-12.col-md-6.col-lg-3.text-center').each((i, elem) => {
            const strongText = $(elem).find('strong').text().trim();
            // 验证是否是防屏蔽地址条目
            if (strongText.includes('防屏蔽地址')) {
                const url = $(elem).find('a').attr('href').trim();
                antiBlockUrls.push(url);
            }
        });
        return antiBlockUrls;
    }
}
exports.default = Parser;
//# sourceMappingURL=parser.js.map