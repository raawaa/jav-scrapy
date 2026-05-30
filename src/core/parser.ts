/**
 * @file parser.ts
 * @description 解析器模块，用于解析页面内容和提取所需信息。
 * @module parser
 * @requires cheerio - 用于解析HTML的库。
 */

import { Metadata, FilmData } from '../types/interfaces';
import logger from './logger';

/**
 * 解析页面中的电影链接
 */
export function parsePageLinks(html: string): Array<string> {
  const $ = require('cheerio').load(html);

  if (!html || html.length === 0) {
    logger.warn('parsePageLinks: 接收到空的HTML内容');
    return [];
  }

  const links = $('a.movie-box').map((i: number, el: cheerio.Element) => $(el).attr('href')).get();

  logger.debug(`解析到 ${links.length} 个影片链接`);
  if (links.length === 0) {
    logger.debug('页面中未找到影片链接，页面内容片段 (前1000字符):');
    logger.debug(html.substring(0, 1000));
  }

  return links;
}


/**
 * 解析页面中的元数据
 */
export function parseMetadata(html: string): Metadata {
  if (!html || typeof html !== 'string') {
    logger.warn('parseMetadata: HTML内容为空或不是字符串');
    throw new Error('Invalid HTML content for metadata parsing');
  }

  if (html.length === 0) {
    logger.warn('parseMetadata: HTML内容长度为0');
    throw new Error('Empty HTML content for metadata parsing');
  }

  const $ = require('cheerio').load(html);
  const scripts = $('script', 'body');

  logger.debug(`parseMetadata: 页面中找到 ${scripts.length} 个script标签`);

  let script = null;
  if (scripts.length >= 3) {
    script = scripts.eq(2).html();
  } else if (scripts.length >= 2) {
    script = scripts.eq(1).html();
  } else if (scripts.length >= 1) {
    script = scripts.eq(0).html();
  }

  if (!script) {
    logger.warn('parseMetadata: 未找到脚本内容');
    if (html.length < 1000) logger.debug(html);
    throw new Error('Failed to parse required metadata from script: no script found');
  }

  const gidMatch = /gid\s*=\s*(\d+)/.exec(script);
  const ucMatch = /uc\s*=\s*(\d+)/.exec(script);
  const imgRegex = /img\s*=\s*'([^']+)'/;
  const imgMatch = imgRegex.exec(script);

  logger.debug(`解析脚本内容: gidMatch=${!!gidMatch}, ucMatch=${!!ucMatch}, imgMatch=${!!imgMatch}`);

  if (!gidMatch || !ucMatch || !imgMatch) {
    logger.warn('parseMetadata: 无法从脚本中解析出所需元数据');
    throw new Error('Failed to parse required metadata from script');
  }

  const metadata: Metadata = {
    gid: gidMatch[1],
    uc: ucMatch[1],
    img: imgMatch[1],
    title: $('h3').text(),
    category: parseCategories($),
    actress: parseActress($)
  };

  logger.debug(`解析到影片元数据: 标题=${metadata.title}, gid=${metadata.gid}, uc=${metadata.uc}`);
  return metadata;
}


/**
 * 解析HTML内容中的影片分类信息
 */
export function parseCategories($: any): Array<string> {
  if (typeof $ === 'string') {
    if (!$ || $.length === 0) {
      logger.warn('parseCategories: HTML内容为空');
      return [];
    }
    $ = require('cheerio').load($);
  } else if (!$ || typeof $ !== 'function') {
    logger.warn('parseCategories: 传入的不是有效的Cheerio对象');
    return [];
  }

  const categories = $('span.genre label a').map((i: number, el: cheerio.Element) => $(el).text()).get();
  logger.debug(`解析到 ${categories.length} 个分类: ${categories.join(', ')}`);

  return categories;
}


/**
 * 解析HTML内容中的女演员信息
 */
export function parseActress($: any): Array<string> {
  if (typeof $ === 'string') {
    if (!$ || $.length === 0) {
      logger.warn('parseActress: HTML内容为空');
      return [];
    }
    $ = require('cheerio').load($);
  } else if (!$ || typeof $ !== 'function') {
    logger.warn('parseActress: 传入的不是有效的Cheerio对象');
    return [];
  }

  const actresses = $('.star-name a').map((i: number, el: cheerio.Element) => $(el).text()).get();
  logger.debug(`解析到 ${actresses.length} 个演员: ${actresses.join(', ')}`);

  return actresses;
}


/**
 * 将解析的元数据和磁力链接组合成影片数据对象
 */
export function parseFilmData(metadata: Metadata, link: string): FilmData {
  return {
    title: metadata.title,
    category: metadata.category,
    actress: metadata.actress
  };
}


/**
 * 提取防屏蔽地址
 */
export function extractAntiBlockUrls(html: string): Array<string> {
  const $ = require('cheerio').load(html);
  const antiBlockUrls: Array<string> = [];

  const alertBox = $('.alert.alert-info');

  alertBox.find('.col-xs-12.col-md-6.col-lg-3.text-center').each((i: number, elem: cheerio.Element) => {
    const strongText = $(elem).find('strong').text().trim();

    if (strongText.includes('防屏蔽地址')) {
      const url = $(elem).find('a').attr('href').trim();
      antiBlockUrls.push(url);
    }
  });

  return antiBlockUrls;
}
