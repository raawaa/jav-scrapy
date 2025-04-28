const logger = require('../logger');
const RequestHandler = require('./requestHandler');

class Parser {

  /**
   * 构造函数
   * @param {Object} config - 配置对象
   */
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
    return $('a.movie-box').map((i, el) => $(el).attr('href')).get();
  }

  /**
   * 解析电影元数据
   * @param {string} html - 电影详情页HTML内容
   * @returns {Object} 包含电影元数据的对象
   * @property {string} gid - 电影ID
   * @property {string} uc - 未知参数
   * @property {string} img - 封面图片URL
   * @property {string} title - 电影标题
   * @property {Array<string>} category - 电影分类数组
   * @property {Array<string>} actress - 女演员数组
   */
  static parseMetadata(html) {
    const $ = require('cheerio').load(html);
    const script = $('script', 'body').eq(2).html();

    const gid = /gid\s+=\s+(\d+)/.exec(script)[1];
    const uc = /uc\s+=\s(\d+)/.exec(script)[1];
    const imgRegex = /img\s+=\s+'([^']+)'/;

    return {
      gid,
      uc,
      img: imgRegex.exec(script)[1],
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
  static parseCategories(html) {
    const $ = require('cheerio').load(html);
    return $('span.genre label a').map((i, el) => $(el).text()).get();
  }

  /**
   * 解析女演员信息
   * @param {string|Object} html - HTML内容或cheerio对象
   * @returns {Array<string>} 女演员数组
   */
  static parseActress(html) {
    const $ = require('cheerio').load(html);
    return $('span.genre[onmouseover] a').map((i, el) => $(el).text()).get();
  }
  /**
   * 解析磁力链接
   * @param {Object} metadata - 电影元数据对象
   * @returns {Promise<string|null>} 最大的磁力链接或null
   */
  async parseMagnet(metadata) {
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

    return parsedPairs.reduce((max, current) =>
      current.size > max.size ? current : max,
      { size: 0 }
    ).magnetLink;
  }

}

module.exports = Parser;