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
  static parsePageLinks(html: string) {
    const $ = require('cheerio').load(html);

    return $('a.movie-box').map((i: number, el: cheerio.Element) => $(el).attr('href')).get();
  }


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


  static parseCategories(html: string) {
    const $ = require('cheerio').load(html);
    return $('span.genre label a').map((i: number, el: cheerio.Element) => $(el).text()).get();
  }


  static parseActress(html: string) {
    const $ = require('cheerio').load(html);
    return $('span.genre[onmouseover] a').map((i: number, el: cheerio.Element) => $(el).text()).get();
  }

  static parseFilmData(metadata: Metadata, magnet: string, link: string) {
    const filmData: FilmData = {
      title: metadata.title,
      magnet: magnet,
      category: metadata.category,
      actress: metadata.actress
    }
    return filmData;
  }

}

export default Parser;