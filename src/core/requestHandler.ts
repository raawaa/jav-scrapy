/**
 * RequestHandler 类用于处理网络请求，提供页面内容获取、XMLHttpRequest 请求发送等功能。
 * 它借助 axios 库进行 HTTP 请求，并使用 axios-retry 库实现请求重试机制。
 */
import axios from 'axios';
import axiosRetry from 'axios-retry';
import tunnel from 'tunnel';
import { Config } from '../types/interfaces';
import { Metadata } from '../types/interfaces'; // 导入 Metadata 类型
import path from 'path'; // 导入 path 模块，用于处理文件路径
import fs from 'fs'; // 导入 fs 模块，用于文件操作

/**
 * 请求配置接口
 */
interface RequestConfig {
  timeout?: number;
  proxy?: string;
  cookie?: string;
  headers: {
    referer: string;
    scheme: string;
    accept: string;
    'accept-encoding': string;
    'accept-language': string;
    'cache-control': string;
    pragma: string;
    'user-agent': string;
    Cookie: string;
  };
}

/**
 * RequestHandler 类
 */
class RequestHandler {
  private requestConfig: RequestConfig;
  private config: Config;
  private retries: number;
  private retryDelay: number;

  /**
   * 构造函数
   * @param config 配置对象
   */
  constructor(config: Config) {
    this.config = config;
    this.requestConfig = {
      timeout: config.timeout,
      proxy: config.proxy,
      headers: {
        referer: this.config.headers.Referer,
        scheme: 'https',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
        Cookie: config.headers.Cookie || ''
      }
    };

    this.retries = 3; // 重试次数
    this.retryDelay = 1000; // 重试延迟

    axiosRetry(axios, {
      retries: this.retries,
      retryDelay: (retryCount) => {
        return retryCount * this.retryDelay; // 指数退避
      },
      retryCondition: (error) => {
        // 检查错误是否是网络错误或特定的状态码
        return (error.response && error.response.status >= 500) || error.code === 'ECONNABORTED';
      }
    });
    
    // 添加HTTPS代理拦截器
    axios.interceptors.request.use((config) => {
      if (this.requestConfig.proxy && config.url?.startsWith('https')) {
        const proxyUrl = new URL(this.requestConfig.proxy);
        const agent = tunnel.httpsOverHttp({
          proxy: {
            host: proxyUrl.hostname,
            port: parseInt(proxyUrl.port, 10)
          }
        });
        config.httpsAgent = agent;
        config.proxy = false;
      }
      return config;
    });
  }

  /**
   * 获取指定 URL 的页面内容
   * @param url 目标 URL
   * @param options 可选参数
   * @returns 包含状态码和页面内容的对象
   */
  async getPage(url: string, options: Record<string, any> = {}) {
    const mergedOptions = {
      ...this.requestConfig,
      ...options,
      url
    };
    try {
      const response = await axios.get(mergedOptions.url, {
          timeout: mergedOptions.timeout,
          headers: mergedOptions.headers
      });
      return { statusCode: response.status, body: response.data };
    } catch (err) {
      throw err;
    }
  }

  /**
   * 发送 XMLHttpRequest 请求
   * @param url 目标 URL
   * @param options 可选参数
   * @returns 包含状态码和响应内容的对象
   */
  async getXMLHttpRequest(url: string, options: Record<string, any> = {}) {
    const mergedOptions = {
      ...this.requestConfig,
      ...options,
      url
    };
    try {
      const response = await axios.get(mergedOptions.url, {
          timeout: mergedOptions.timeout,
          headers: {
              ...mergedOptions.headers,
              'X-Requested-With': 'XMLHttpRequest'
          }
      });
      return { statusCode: response.status, body: response.data };
    } catch (err) {
      throw err;
    }
  }

  /**
   * 从指定页面提取磁力链接，并返回最大文件大小对应的磁力链接
   * @param metadata 元数据对象
   * @returns 最大文件大小对应的磁力链接，如果没有找到则返回 null
   */
  public async fetchMagnet(metadata: Metadata) {
    const url = `https://www.fanbus.ink/ajax/uncledatoolsbyajax.php?gid=${metadata.gid}&lang=zh&img=${metadata.img}&uc=${metadata.uc}&floor=880`;
    const response = await this.getXMLHttpRequest(url);

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

    return maxSizePair ? maxSizePair.magnetLink : null;
  }

  /**
   * 下载图片到指定路径
   * @param url 图片 URL
   * @param filename 文件名
   * @returns 如果文件已存在则返回 false，否则返回 true
   */
  public async downloadImage(url: string, filename: string) {
    try {
      const filePath = path.join(this.config.output, filename);
      if (fs.existsSync(filePath)) {
        return false;
      }
      const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: this.requestConfig.timeout,
          headers: this.requestConfig.headers
      });
      fs.writeFileSync(filePath, Buffer.from(response.data, 'binary'));
      return true;
    } catch (err) {
      throw err;
    }
  }
}

export default RequestHandler;