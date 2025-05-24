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



// 常见浏览器User-Agent列表（定期更新）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/121.0'
];

/**
 * 请求配置接口
 */
interface RequestConfig {
  timeout?: number;
  proxy?: string;
  cookie?: string;
  headers: {
    referer: string;
    'user-agent': string;
    Cookie: string;
    'Sec-Fetch-Dest': string;
    'Sec-Fetch-Mode': string;
    'Sec-Fetch-Site': string;
    'Sec-Fetch-User': string;
    'Sec-Ch-Ua': string;
    'Sec-Ch-Ua-Mobile': string;
    'Sec-Ch-Ua-Platform': string;
    'Accept': string;
    'Accept-Language': string;
    'Cache-Control': string;
    'Connection': string;
    'Upgrade-Insecure-Requests': string;
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
        'referer': new URL(this.config.base || this.config.BASE_URL).origin,
        'Cookie': this.config.headers.Cookie || '',
        'Sec-Ch-Ua': '"Chromium";v="119", "Not?A_Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'user-agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    this.retries = 5;
    this.retryDelay = 5000; // 增加重试延迟到5秒

    axiosRetry(axios, {
      retries: this.retries,
      retryDelay: (retryCount) => {
        return retryCount * this.retryDelay + Math.random() * 1000; // 添加随机延迟
      },
      retryCondition: (error) => {
        // 检查错误是否是网络错误、ECONNRESET、超时或特定的状态码
        const shouldRetry =
          (error.response && (error.response.status >= 500 || error.response.status === 429)) ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED';
        if (shouldRetry) {
          console.warn(`请求失败，正在重试... 错误: ${error.code || error.message}`);
        }
        return shouldRetry;
      }
    });

    // 添加HTTPS代理拦截器
    axios.interceptors.request.use((config) => {
      if (this.requestConfig.proxy && config.url?.startsWith('https')) {
        try {
          const proxyUrl = new URL(this.requestConfig.proxy);
          const agentOptions = {
            proxy: {
              host: proxyUrl.hostname,
              port: parseInt(proxyUrl.port, 10),
              // 可选：如果代理需要认证
              // proxyAuth: 'username:password'
            }
          };
          const agent = proxyUrl.protocol === 'http:'
            ? tunnel.httpsOverHttp(agentOptions)
            : tunnel.httpsOverHttps(agentOptions);
          config.httpsAgent = agent;
          config.proxy = false; // 必须设置为false，否则axios会尝试使用自己的代理逻辑
        } catch (proxyError) {
          // console.error(`配置代理时出错: ${proxyError instanceof Error ? proxyError.message : String(proxyError)}`);
          // 可选择抛出错误或允许请求在没有代理的情况下继续
          // throw proxyError;
        }
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
      const error = err as any;
      console.error(`获取页面 ${mergedOptions.url} 失败: ${error.message}`, error.code ? `错误码: ${error.code}` : '');
      throw error;
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
      const error = err as any;
      // console.error(`发送 XMLHttpRequest 到 ${mergedOptions.url} 失败: ${error.message}`, error.code ? `错误码: ${error.code}` : '');
      throw error;
    }
  }

  /**
   * 从指定页面提取磁力链接，并返回最大文件大小对应的磁力链接
   * @param metadata 元数据对象
   * @returns 最大文件大小对应的磁力链接，如果没有找到则返回 null
   */
  public async fetchMagnet(metadata: Metadata) {
    // 使用配置中的 BASE_URL 作为默认值，而不是空字符串
    const baseUrl = this.config.base || this.config.BASE_URL;
    const parsedBaseUrl = new URL(baseUrl);
    const baseDomain = `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`;
    const url = `${baseDomain}/ajax/uncledatoolsbyajax.php?gid=${metadata.gid}&lang=zh&img=${metadata.img}&uc=${metadata.uc}&floor=880`;
    const response = await this.getXMLHttpRequest(url);

    const magnetLinks = [...new Set(response.body.match(/magnet:\?xt=urn:btih:[A-F0-9]+&dn=[^&"']+/gi))];
    const sizes = response.body.match(/\d+(\.\d+)?[GM]B/g);

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
        // console.log(`图片 ${filename} 已存在，跳过下载。`);
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
      const error = err as any;
      // console.error(`下载图片 ${url} 失败: ${error.message}`, error.code ? `错误码: ${error.code}` : '');
      throw error;
    }
  }
}

export default RequestHandler;
