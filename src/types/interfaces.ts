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
  pageIndex: number;
}

interface DetailPageTask {
  link: string;
}

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