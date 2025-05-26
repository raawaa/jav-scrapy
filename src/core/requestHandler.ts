/**
 * RequestHandler 类用于处理网络请求，提供页面内容获取、XMLHttpRequest 请求发送等功能。
 * 它借助 axios 库进行 HTTP 请求，并使用 axios-retry 库实现请求重试机制。
 */
import axios, { AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import tunnel from 'tunnel';
import { Config } from '../types/interfaces';
import { Metadata } from '../types/interfaces'; // 导入 Metadata 类型
import path from 'path'; // 导入 path 模块，用于处理文件路径
import fs from 'fs'; // 导入 fs 模块，用于文件操作



// 常见浏览器User-Agent列表（定期更新）
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

// 随机延迟函数
const randomDelay = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * 请求配置接口
 */
interface RequestConfig {
  timeout?: number;
  proxy?: string;
  cookie?: string;
  headers: {
    'authority'?: string;
    'method'?: string;
    'path'?: string;
    'scheme'?: string;
    'accept'?: string;
    'accept-encoding'?: string;
    'accept-language'?: string;
    'cache-control'?: string;
    'sec-ch-ua'?: string;
    'sec-ch-ua-mobile'?: string;
    'sec-ch-ua-platform'?: string;
    'sec-fetch-dest'?: string;
    'sec-fetch-mode'?: string;
    'sec-fetch-site'?: string;
    'sec-fetch-user'?: string;
    'upgrade-insecure-requests'?: string;
    'user-agent': string;
    'referer': string;
    'Cookie': string;
    'Connection': string;
    'X-Requested-With'?: string;
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
    console.log('RequestHandler constructor - proxy config:', this.config.proxy);
    const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const isChrome = userAgent.includes('Chrome');
    const isFirefox = userAgent.includes('Firefox');
    const isEdge = userAgent.includes('Edge');
    
    // 提取浏览器版本号
    const versionMatch = userAgent.match(/(Chrome|Firefox|Edge|Edg)[\/\s](\d+)/);
    const browserVersion = versionMatch ? versionMatch[2] : '119';
    
    // 设置 Sec-Ch-Ua 和浏览器指纹
    let secChUa = '';
    let platform = '"Windows"';
    let secChUaMobile = '?0';
    let secChUaPlatform = platform;
    
    if (isChrome || isEdge) {
      const brandVersion = isEdge ? 'Microsoft Edge' : 'Chromium';
      secChUa = `"${brandVersion}";v="${browserVersion}", "Not?A_Brand";v="99"`;
    } else if (isFirefox) {
      secChUa = `"Not.A/Brand";v="8", "Chromium";v="${browserVersion}", "Google Chrome";v="${browserVersion}"`;
    } else {
      secChUa = `"Chromium";v="${browserVersion}", "Not?A_Brand";v="99"`;
    }
    
    // 设置请求配置
    this.requestConfig = {
      timeout: config.timeout || 30000, // 默认30秒超时
      proxy: config.proxy,
      headers: {
        'authority': new URL(this.config.base || this.config.BASE_URL).hostname,
        'method': 'GET',
        'path': '/',
        'scheme': 'https',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'max-age=0',
        'sec-ch-ua': secChUa,
        'sec-ch-ua-mobile': secChUaMobile,
        'sec-ch-ua-platform': secChUaPlatform,
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': userAgent,
        'referer': new URL(this.config.base || this.config.BASE_URL).origin,
        'Cookie': this.config.headers.Cookie || 'existmag=mag;',
        'Connection': 'keep-alive'
      }
    };

    this.retries = 5;
    this.retryDelay = 5000;    // 配置axios重试
    axiosRetry(axios, {
      retries: 5, // 增加重试次数
      retryDelay: (retryCount) => {
        // 指数退避策略，加上随机延迟
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        return delay + randomDelay(500, 1500);
      },
      retryCondition: (error: any) => {
        // 在以下情况下重试：
        // 1. 网络错误
        // 2. 5xx服务器错误
        // 3. 429 Too Many Requests
        // 4. 403 Forbidden (Cloudflare拦截)
        const shouldRetry = axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                         (error.response?.status && [500, 429, 403].includes(error.response.status));
        
        if (shouldRetry) {
          const currentRetry = (error.config && error.config['axios-retry'] && error.config['axios-retry'].retryCount) || 0;
          console.warn(`请求失败，正在重试 (${currentRetry + 1}/5)... 错误: ${error.code || error.message}`);
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
    let attempts = 0;
    while (attempts <= this.config.retryCount) {
      try {
        const mergedOptions = {
          ...this.requestConfig,
          ...options,
          url
        };
        const response = await axios.get(mergedOptions.url, {
          timeout: mergedOptions.timeout,
          headers: mergedOptions.headers
        });
        return { statusCode: response.status, body: response.data };
      } catch (error) {
        const err = error as AxiosError;
        if (axiosRetry.isNetworkOrIdempotentRequestError(err) ||
          (err.response?.status && [500, 429, 403].includes(err.response.status))) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempts)));
          attempts++;
        } else {
          throw err;
        }
      }
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
      const error = err as AxiosError;
      console.error(`发送 XMLHttpRequest 到 ${mergedOptions.url} 失败: ${error.message}`, error.code ? `错误码: ${error.code}` : '');
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
    const url = `${baseDomain}/ajax/uncledatoolsbyajax.php?gid=${metadata.gid}&lang=zh&img=${metadata.img}&uc=${metadata.uc}&floor=${Math.floor(1e3 * Math.random() + 1)}`;
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
    const dirPath = this.config.output; // 获取输出目录路径
    const originalFilePath = path.join(dirPath, filename);
    const ext = path.extname(filename); // 获取文件扩展名
    const baseFilename = path.basename(filename, ext); // 获取不带扩展名的文件名

    // 检查并创建目录 (如果之前没有添加的话)
    if (!fs.existsSync(dirPath)) {
      try {
        await fs.promises.mkdir(dirPath, { recursive: true });
      } catch (mkdirError) {
        console.error(`创建输出目录失败: ${dirPath}`, mkdirError);
        throw mkdirError; // 如果目录创建失败，后续操作也无法进行
      }
    }

    // 尝试保存文件
    try {
      if (fs.existsSync(originalFilePath)) {
        // console.log(`图片 ${filename} 已存在，跳过下载。`);
        return false;
      }
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.requestConfig.timeout,
        headers: this.requestConfig.headers
      });
      fs.writeFileSync(originalFilePath, Buffer.from(response.data, 'binary'));
      return true;
    } catch (err) {
      const error = err as NodeJS.ErrnoException; // 明确类型为文件系统错误

      // 检查是否是文件路径过长或非法字符导致的错误
      if (error.code === 'ENOENT' || error.code === 'ENAMETOOLONG') {
        console.warn(`保存图片失败，文件名可能过长或包含非法字符，尝试简化文件名: ${filename}`);

        // 简化文件名，例如保留部分原文件名和哈希值
        const simplifiedFilename = `${baseFilename.substring(0, 50)}_..._${baseFilename.substring(baseFilename.length - 10)}${ext}`.replace(/[^a-zA-Z0-9_\-. ]/g, '_'); // 简单替换非法字符
        const simplifiedFilePath = path.join(dirPath, simplifiedFilename);

        try {
          if (fs.existsSync(simplifiedFilePath)) {
            console.log(`简化后的图片 ${simplifiedFilename} 已存在，跳过下载。`);
            return false;
          }
          const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: this.requestConfig.timeout,
            headers: this.requestConfig.headers
          });
          fs.writeFileSync(simplifiedFilePath, Buffer.from(response.data, 'binary'));
          console.log(`图片已使用简化文件名保存: ${simplifiedFilename}`);
          return true;
        } catch (simplifyErr) {
          const simplifyError = simplifyErr as Error; // Simplification attempt error
          console.error(`使用简化文件名保存图片也失败: ${simplifiedFilename}`, simplifyError);
          throw simplifyError; // 简化文件名后仍然失败，抛出错误
        }

      } else {
        // 其他类型的错误，直接抛出
        console.error(`保存图片失败: ${filename}`, error);
        throw error;
      }
    }
  }
}

export default RequestHandler;
