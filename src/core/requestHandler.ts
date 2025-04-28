// 由于后面有 ES 模块导入的 axios，这里删除重复的 CommonJS 导入
// const axios = require('axios'); 注释掉或删除此代码以解决冲突
// 由于后续有 ES 模块导入的 axiosRetry，移除重复的 CommonJS 导入，此代码删除后不会影响后续使用

// 由于原代码中 RequestHandler 类重复，这里删除多余的类声明，保留后面完整的类定义，此行为占位行
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { Config } from '../types/interfaces';
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
    priority: string;
    'sec-ch-ua': string;
    'sec-ch-ua-mobile': string;
    'sec-ch-ua-platform': string;
    'sec-fetch-dest': string;
    'sec-fetch-mode': string;
    'sec-fetch-site': string;
    'sec-fetch-user': string;
    'upgrade-insecure-requests': string;
    'user-agent': string;
    Cookie: string;
  };
}

class RequestHandler {
  private config: RequestConfig;
  private retries: number;
  private retryDelay: number;

  constructor(config: Config) {
    this.config = {
      timeout: config.timeout || 30000,
      proxy: config.proxy,
      headers: {
        referer: 'https://www.fanbus.ink/',
        scheme: 'https',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        priority: 'u=0, i',
        'sec-ch-ua': '"Microsoft Edge";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
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
    })



  }

  // 异步方法，用于获取指定 URL 的页面内容。
  // 参数:
  // url - 要请求的页面的 URL。
  // options - 可选参数，用于覆盖默认的请求配置。
  async getPage(url: string, options: Record<string, any> = {}) {
    const mergedOptions = {
      ...this.config,
      ...options,
      url
    };
    try {
      const response = await axios.get(mergedOptions.url, {
        timeout: mergedOptions.timeout,
        // 将 string 类型的 proxy 转换为 AxiosProxyConfig 类型
        proxy: mergedOptions.proxy ? {
          host: mergedOptions.proxy.split(':')[0],
          port: parseInt(mergedOptions.proxy.split(':')[1], 10)
        } : undefined,
        headers: mergedOptions.headers
      });
      return { statusCode: response.status, body: response.data };
    } catch (err) {
      throw err;
    }
  }

  async getXMLHttpRequest(url: string, options: Record<string, any> = {}) {
    const mergedOptions = {
      ...this.config,
      ...options,
      url
    };
    try {
      const response = await axios.get(mergedOptions.url, {
        timeout: mergedOptions.timeout,
        // 将 string 类型的 proxy 转换为 AxiosProxyConfig 类型，若 proxy 不存在则为 undefined
        proxy: mergedOptions.proxy ? {
          host: mergedOptions.proxy.split(':')[0],
          port: parseInt(mergedOptions.proxy.split(':')[1], 10)
        } : undefined,
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
}




export default RequestHandler;