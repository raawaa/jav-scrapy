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

import { Config, Metadata, FilmData } from '../types/interfaces';

class Parser {
  private config: Config;

  public constructor(config: Config) {
    this.config = config;
  }

  /**
   * 解析页面中的电影链接
   * @param {string} html - 页面HTML内容
   * @returns {Array<string>} 电影详情页链接数组
   */
  static parsePageLinks(html: string): Array<string> {
    const $ = require('cheerio').load(html);

    return $('a.movie-box').map((i: number, el: cheerio.Element) => $(el).attr('href')).get();
  }


  /**
   * 解析页面中的元数据
   * @param {string} html - 页面 HTML 内容
   * @returns {Metadata} 包含影片元数据的对象
   * @throws {Error} 当无法从脚本中解析出所需元数据时抛出错误
   * @description 从页面 HTML 内容中提取影片的 gid、uc、img、标题、分类和演员信息
   */
  static parseMetadata(html: string) {
    const $ = require('cheerio').load(html);
    const script = $('script', 'body').eq(2).html();

    const gidMatch = /gid\s+=\s+(\d+)/.exec(script);
    const ucMatch = /uc\s+=\s(\d+)/.exec(script);
    const imgRegex = /img\s+=\s+'([^']+)'/;
    const imgMatch = imgRegex.exec(script);

    if (!gidMatch || !ucMatch || !imgMatch) {
      throw new Error('Failed to parse required metadata from script');
    }
    const metadata: Metadata = {
      gid: gidMatch[1],
      uc: ucMatch[1],
      img: imgMatch[1],
      title: $('h3').text(),
      category: this.parseCategories($),
      actress: this.parseActress($)
    };
    return metadata;
  }


  /**
   * 解析HTML内容中的影片分类信息
   * @param {string} html - 包含分类信息的HTML字符串
   * @returns {Array<string>} 返回分类名称的数组
   * @description 从HTML中提取所有位于<span class="genre">标签内，
   * 且嵌套在<label><a>结构中的文本内容作为分类名称
   */
  static parseCategories(html: string): Array<string> {
    const $ = require('cheerio').load(html);
    return $('span.genre label a').map((i: number, el: cheerio.Element) => $(el).text()).get();
  }


  /**
   * 解析HTML内容中的女演员信息
   * @param {string} html - 包含演员信息的HTML字符串
   * @returns {Array<string>} 返回女演员名称的数组
   * @description 从HTML中提取所有具有onmouseover属性的<span class="genre">标签内，
   * 嵌套在<a>标签中的文本内容作为女演员名称
   */
  static parseActress(html: string): Array<string> {
    const $ = require('cheerio').load(html);
    return $('span.genre[onmouseover] a').map((i: number, el: cheerio.Element) => $(el).text()).get();
  }

  /**
   * 将解析的元数据和磁力链接组合成影片数据对象
   * @param {Metadata} metadata - 包含影片元数据的对象
   * @param {string} magnet - 影片的磁力链接
   * @param {string} link - 影片详情页链接
   * @returns {FilmData} 返回包含完整影片数据的对象
   * @description 将影片标题、分类、演员信息和磁力链接组合成一个完整的数据对象，
   * 便于后续处理和存储
   */
  static parseFilmData(metadata: Metadata, magnet: string, link: string): FilmData {
    const filmData: FilmData = {
      title: metadata.title,
      magnet: magnet,
      category: metadata.category,
      actress: metadata.actress
    }
    return filmData;
  }

  /**
   * 提取防屏蔽地址
   * @param {string} html - 页面HTML内容
   * @returns {Array<string>} 防屏蔽地址数组
   * @description 从页面中提取所有包含防屏蔽地址的链接
   */
  static extractAntiBlockUrls(html: string): Array<string> {
    const $ = require('cheerio').load(html);
    const antiBlockUrls: Array<string> = [];

    // 定位到包含防屏蔽地址的警告框
    const alertBox = $('.alert.alert-info');
    
    // 遍历所有包含防屏蔽地址的列
    alertBox.find('.col-xs-12.col-md-6.col-lg-3.text-center').each((i: number, elem: cheerio.Element) => {
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

export default Parser;