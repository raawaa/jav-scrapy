/**
 * @file parser.ts
 * @description 解析器模块，用于解析页面内容和提取所需信息。
 * @module parser
 * @requires cheerio - 用于解析HTML的库。
 */

import { Metadata, FilmData, MagnetResult, MagnetLink } from '../types/interfaces';
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
    originalLink: link,
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

/**
 * 格式化文件大小显示（MB → MB/GB）
 * @param sizeInMB 文件大小（MB为单位）
 * @returns 格式化的文件大小字符串
 */
function formatFileSize(sizeInMB: number): string {
  if (sizeInMB >= 1024) {
    return `${(sizeInMB / 1024).toFixed(2)}GB`;
  } else {
    return `${sizeInMB.toFixed(2)}MB`;
  }
}

/**
 * 从 AJAX 响应正文中提取磁力链接（纯函数，无副作用）
 *
 * 这是原 RequestHandler.fetchMagnet 中解析逻辑的 1:1 提取，保留全部既有行为
 * （含其 quirks）：Set 去重磁链但不去重大小、按位置下标配对 magnets[i] <-> sizes[i]、
 * GB/MB 统一换算为 MB、largest-vs-allmag 选择、以及 '\n'-joined .magnet 兼容字段。
 *
 * @param body AJAX 响应正文
 * @param options.allmag true=返回所有磁链；false/缺省=仅返回最大的一条
 * @returns MagnetResult 或 null
 */
export function extractMagnetLinks(
  body: string,
  { allmag }: { allmag: boolean }
): MagnetResult | null {
  // Set 去重磁链；body.match 在无匹配时返回 null，new Set(null) 为空集合，
  // [...空集合] 得到 []（truthy），后续 guard 因此被放行——此 quirk 已被
  // characterization 测试钉住，重构时必须原样保留。
  const magnetLinks = [...new Set(body.match(/magnet:\?xt=urn:btih:[A-F0-9]+&dn=[^&"']+/gi))];
  const sizes = body.match(/\d+(\.\d+)?[GM]B/g);

  logger.debug(`extractMagnetLinks: 解析到 ${magnetLinks ? magnetLinks.length : 0} 个磁力链接`);
  logger.debug(`extractMagnetLinks: 解析到 ${sizes ? sizes.length : 0} 个文件大小`);

  if (!magnetLinks || !sizes) {
    logger.error('extractMagnetLinks: 未找到磁力链接或文件大小');
    return null;
  }

  // 按位置下标将每个磁链与对应大小配对，GB 换算为 MB。
  // 注意：magnets 与 sizes 来自两条独立正则，数量可能不一致；下标越界时会抛错——
  // TODO(harden): 当 magnets 多于 sizes 时此处会抛异常；改为返回 null 是一个
  // 延后跟进项，明确超出本次重构切片范围，此处不改其行为。
  const parsedPairs = magnetLinks.map((magnetLink, index) => {
    const sizeStr = sizes[index];
    const sizeValue = parseFloat(sizeStr.replace(/GB|MB/, ''));
    const sizeInMB = sizeStr.includes('GB') ? sizeValue * 1024 : sizeValue;
    return { magnetLink, size: sizeInMB };
  });

  let result: MagnetResult | null = null;

  if (allmag) {
    // 返回所有磁力链接的结构化数据
    const magnetLinks: MagnetLink[] = parsedPairs.map(pair => ({
      link: pair.magnetLink,
      size: formatFileSize(pair.size)
    }));

    result = {
      magnet: parsedPairs.map(pair => pair.magnetLink).join('\n'), // 保持向后兼容
      magnetLinks: magnetLinks
    };

    logger.debug(`extractMagnetLinks: 成功获取所有磁力链接 (共${parsedPairs.length}个)`);
  } else {
    // 返回最大的磁力链接（默认行为）
    const maxSizePair = parsedPairs.reduce((prev, current) => {
      return (prev.size > current.size) ? prev : current;
    }, parsedPairs[0]);

    if (maxSizePair) {
      result = {
        magnet: maxSizePair.magnetLink,
        magnetLinks: [{
          link: maxSizePair.magnetLink,
          size: formatFileSize(maxSizePair.size)
        }]
      };

      logger.debug('extractMagnetLinks: 成功获取磁力链接');
    } else {
      logger.error('extractMagnetLinks: 未能确定最大磁力链接');
    }
  }

  return result;
}
