import { FilmData, Metadata, MagnetResult } from '../../types/interfaces';
import RequestHandler from '../requestHandler';
import { parseMetadata, parseFilmData } from '../parser';
import { ErrorHandler } from '../../utils/errorHandler';
import logger from '../logger';

/**
 * 详情页管线：拉取单部影片的详情页 → 解析元数据 → 拉取磁链 → 投影 FilmData。
 *
 * 单一对外方法 `process(link)` 把"详情页处理"封装在一个地方，让调用方不用关心
 * 五步流程的细节；磁链获取失败作为软失败被吞掉，仅页面/元数据层面的硬失败
 * 才以 `null` 返回，让调用方跳过整条记录（见 ADR-0002）。
 */
class DetailPagePipeline {
  private requestHandler: RequestHandler;

  constructor(requestHandler: RequestHandler) {
    this.requestHandler = requestHandler;
  }

  async process(link: string): Promise<{ filmData: FilmData; metadata: Metadata } | null> {
    logger.debug(`DetailPagePipeline: 开始处理: ${link}`);

    const page = await this.requestHandler.getPage(link);
    if (!page?.body) {
      logger.warn(`DetailPagePipeline: 页面响应为空: ${link}`);
      return null;
    }

    let metadata: Metadata;
    try {
      metadata = parseMetadata(page.body);
    } catch (e) {
      ErrorHandler.handleError(e, `解析详情页元数据 ${link}`);
      return null;
    }

    const magnetResult = await this.fetchMagnetsOrNull(metadata);

    const filmData = parseFilmData(metadata, link);
    if (magnetResult?.magnetLinks) {
      filmData.magnetLinks = magnetResult.magnetLinks;
    }

    logger.debug(`DetailPagePipeline: 处理完成: ${metadata.title}`);
    return { filmData, metadata };
  }

  /**
   * 拉取磁链并把所有失败模式压成 `null`（软失败）。
   * 原 RequestHandler 的硬失败（抛错）行为在这里被规范化——koonjs 瞬断
   * 不应让已经解析完元数据的影片整条丢失。
   */
  private async fetchMagnetsOrNull(metadata: Metadata): Promise<MagnetResult | null> {
    try {
      const result = await this.requestHandler.fetchMagnet(metadata);
      if (result) {
        logger.debug(`DetailPagePipeline: 磁链获取成功: ${metadata.title}`);
      } else {
        logger.warn(`DetailPagePipeline: 磁链获取为空: ${metadata.title}`);
      }
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logger.warn(`DetailPagePipeline: 磁链获取异常: ${metadata.title} (${message})`);
      return null;
    }
  }
}

export default DetailPagePipeline;
