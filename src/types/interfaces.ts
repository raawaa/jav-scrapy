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