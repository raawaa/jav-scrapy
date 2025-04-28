const axios = require('axios');
const axiosRetry = require('axios-retry').default;

class RequestHandler {
  constructor(config) {
    this.config = {
      timeout: config.timeout || 30000,
      proxy: config.proxy,
      headers: {
        // 模仿浏览器访问时的 headers
        'referer': 'https://www.fanbus.ink/',
        // ':authority:': 'www.fanbus.ink',
        // ':method:': 'GET',
        // ':path:': '/',
        'scheme': 'https',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'priority': 'u=0, i',
        'sec-ch-ua': '"Microsoft Edge";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
        // 保留原有的 cookie 字段
        'Cookie': config.cookie || ''
      }
    };
    
    this.retries = config.retries || 3;
    this.retryDelay = 1000;
    
    axiosRetry(axios, {
      retries: this.retries,
      retryDelay: (retryCount) => {
        return this.retryDelay;
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status >= 500;
      }
    });
  }

  // 异步方法，用于获取指定 URL 的页面内容。
  // 参数:
  // url - 要请求的页面的 URL。
  // options - 可选参数，用于覆盖默认的请求配置。
  async getPage(url, options = {}) {
    const mergedOptions = {
      ...this.config,
      ...options,
      url
    };
    try {
      const response = await require('axios').get(mergedOptions.url, {
        timeout: mergedOptions.timeout,
        proxy: mergedOptions.proxy,
        headers: mergedOptions.headers
      });
      return { statusCode: response.status, body: response.data };
    } catch (err) {
      throw err;
    }
  }

  async getXMLHttpRequest(url, options = {}) {
    const mergedOptions = {
      ...this.config,
      ...options,
      url
    };
    try {
      const response = await require('axios').get(mergedOptions.url, {
        timeout: mergedOptions.timeout,
        proxy: mergedOptions.proxy,
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




module.exports = RequestHandler;