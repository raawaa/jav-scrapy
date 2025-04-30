/**
 * @file types/interfaces.ts
 * @description 定义了程序中使用的接口，包括配置、任务和数据结构。
 * @module types/interfaces
 * @exports Config - 配置接口。
 * @exports IndexPageTask - 索引页任务接口。
 * @exports DetailPageTask - 详情页任务接口。
 * @exports Metadata - 元数据接口。
 * @exports FilmData - 影片数据接口。
 * @author raawaa
 */

interface Config {
  DEFAULT_TIMEOUT: number;
  BASE_URL: string;
  parallel: number;
  proxy?: string;
  headers: {
    Referer: string;
    Cookie: string;
  };
  output: string;
  search: string | null;
  base: string | null;
  nomag: boolean;
  allmag: boolean;
  nopic: boolean;
  timeout?: number;
  searchUrl: string;
  limit: number;
}

interface IndexPageTask {
  url: string;
}

interface DetailPageTask {
  link: string;
}

/**
 * @interface Metadata
 * @description 元数据接口，用于描述影片的基本信息。
 * @property {string} title - 影片标题。
 * @property {string} gid - 影片的唯一标识符。
 * @property {string} img - 影片的图片链接。
 * @property {string} uc - 影片的用户标识。
 * @property {string[]} category - 影片的分类标签数组。
 * @property {string[]} actress - 影片的演员数组。
 */
interface Metadata {
  title: string;
  gid: string;
  img: string;
  uc: string;
  category: string[];
  actress: string[];
}

interface FilmData {
  title: string;
  magnet: string;
  category: string[];
  actress: string[];
}

export { Config, IndexPageTask, DetailPageTask, Metadata, FilmData };