import logger from '../../src/logger';
import RequestHandler from './requestHandler';
import { Config, Metadata } from '../types/interfaces';



class Parser {
  private config: Config;
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
  constructor(config: Config) {
    this.config = config;
  }

  /**
   * 解析页面中的电影链接
   * @param {string} html - 页面HTML内容
   * @returns {Array<string>} 电影详情页链接数组
   */
  static parsePageLinks(html: string) {
    const $ = require('cheerio').load(html);
    // 为参数 i 显式指定类型为 number，解决隐式 any 类型的问题
    // 引入 CheerioElement 类型，解决找不到名称的问题
    return $('a.movie-box').map((i: number, el: cheerio.Element) => $(el).attr('href')).get();
  }

  /**
   * 解析电影元数据
   * @param {string} html - 电影详情页HTML内容
   * @returns {Object} Metadata 电影元数据对象
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

    return {
      gid: gidMatch[1],
      uc: ucMatch[1],
      img: imgMatch[1],
      title: $('h3').text(),
      category: this.parseCategories($),
      actress: this.parseActress($)
    };
  }

  /**
   * 解析电影分类
   * @param {string|Object} html - HTML内容或cheerio对象
   * @returns {Array<string>} 电影分类数组
   */
  static parseCategories(html:string) {
    const $ = require('cheerio').load(html);
    return $('span.genre label a').map((i: number, el: cheerio.Element) => $(el).text()).get();
  }

  /**
   * 解析女演员信息
   * @param {string|Object} html - HTML内容或cheerio对象
   * @returns {Array<string>} 女演员数组
   */
  static parseActress(html: string) {
    const $ = require('cheerio').load(html);
    return $('span.genre[onmouseover] a').map((i:number, el:cheerio.Element) => $(el).text()).get();
  }
  /**
   * 解析磁力链接
   * @param {Object} metadata - 电影元数据对象
   * @returns {Promise<string|null>} 最大的磁力链接或null
   */
  async fetchMagnet(metadata: Metadata) {
    const url = `https://www.fanbus.ink/ajax/uncledatoolsbyajax.php?gid=${metadata.gid}&lang=zh&img=${metadata.img}&uc=${metadata.uc}&floor=880`;
    const requestHandler = new RequestHandler(this.config);
    const response = await requestHandler.getXMLHttpRequest(url);

    const magnetLinks = [...new Set(response.body.match(/magnet:\?xt=urn:btih:[A-F0-9]+&dn=[^&"']+/gi))];
    const sizes = response.body.match(/\d+\.\d+GB|\d+MB/g);

    if (!magnetLinks || !sizes) return null;

    const parsedPairs = magnetLinks.map((magnetLink, index) => {
      const sizeStr = sizes[index];
      const sizeValue = parseFloat(sizeStr.replace(/GB|MB/, ''));
      const sizeInMB = sizeStr.includes('GB') ? sizeValue * 1024 : sizeValue;
      return { magnetLink, size: sizeInMB };
    });

    const maxSizePair = parsedPairs.reduce((prev, current) => {
      return (prev.size > current.size) ? prev : current;
    }, parsedPairs[0]);

    // 返回最大 size 对应的磁力链接
    return maxSizePair ? maxSizePair.magnetLink : null;

  }

}

export default Parser;