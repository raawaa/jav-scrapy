import axios, { AxiosError } from 'axios';
import tunnel from 'tunnel';
import https from 'https';
import { Koon } from 'koonjs';
import { Config, Metadata, MagnetResult } from '../types/interfaces';
import path from 'path';
import fs from 'fs';
import { USER_AGENTS } from './constants';
import { ErrorHandler } from '../utils/errorHandler';
import { extractMagnetLinks } from './parser';
import logger from './logger';
/**
 * 请求配置接口
 */
interface RequestConfig {
  timeout?: number;
  proxy?: string;
  cookie?: string;
  headers: {
    'accept'?: string;
    'accept-encoding'?: string;
    'accept-language'?: string;
    'cache-control'?: string;
    'user-agent': string;
    'referer'?: string;
    'Cookie'?: string;
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
  private koonClient: Koon | null = null;
  /**
   * 构造函数
   * @param config 配置对象
   */
  constructor(config: Config) {
    this.config = config;
    logger.debug(`RequestHandler constructor - proxy config: ${this.config.proxy}`);
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
    };
    // 设置请求配置
    this.requestConfig = {
      timeout: config.timeout || 30000, // 默认30秒超时
      proxy: config.proxy,
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
        'cache-control': 'no-cache',
        'user-agent': userAgent,
        'Cookie': this.config.headers.Cookie || 'existmag=mag'
      }
    };
    this.retries = 3; // 重试次数
    this.retryDelay = Math.max(this.config.delay || 2000, 3000); // 基础延迟，至少3秒
    // 添加HTTPS代理拦截器
    axios.interceptors.request.use((config) => {
      if (this.requestConfig.proxy && config.url?.startsWith('https')) {
        try {
          const agent = this.createProxyAgent(this.requestConfig.proxy);
          if (agent) {
            config.httpsAgent = agent;
            config.proxy = false; // 必须设置为false，否则axios会尝试使用自己的代理逻辑
          }
        } catch (proxyError) {
          ErrorHandler.handleError(proxyError, '配置代理');
        }
      }
      return config;
    });

    // 初始化 koonjs TLS 指纹客户端（惰性初始化，首次 AJAX 请求时创建）
  }
  /**
   * 获取指定 URL 的页面内容
   * @param url 目标 URL
   * @param options 可选参数
   * @returns 包含状态码和页面内容的对象
   */

  async getPage(url: string, options: Record<string, any> = {}): Promise<{ statusCode: number; body: string } | null> {
    // 验证URL格式，防止SSRF攻击
    try {
      new URL(url);
    } catch (error) {
      logger.error(`无效的URL格式: ${url}`);
      return null;
    }

    // 使用传统 HTTP 请求
    const maxAttempts = this.config.retryCount + 1;
    let attempts = 0;
    while (attempts < maxAttempts) {

      try {
        logger.debug(`开始请求页面: ${url} (尝试 ${attempts + 1}/${maxAttempts})`);
        const headers = { ...this.requestConfig.headers };
        // 检查是否已手动设置了cookies
        const hasManualCookies = this.config.headers && this.config.headers.Cookie &&
                                this.config.headers.Cookie !== 'existmag=mag';
        if (hasManualCookies) {
          headers.Cookie = this.config.headers.Cookie;
          logger.debug(`使用手动设置的 Cookies: ${this.config.headers.Cookie}`);
        } else {
          headers.Cookie = 'existmag=mag';
          logger.debug('使用默认 Cookie: existmag=mag');
        }

        // 非首次尝试时轮换 User-Agent
        if (attempts > 0) {
          const newUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
          headers['user-agent'] = newUserAgent;
          logger.debug(`重试时轮换了 User-Agent: ${newUserAgent}`);
        }

        const response = await axios.get(url, {
          timeout: this.requestConfig.timeout,
          headers
        });
        return { statusCode: response.status, body: response.data };
      } catch (error) {
        const err = error as AxiosError;
        const statusCode = err.response?.status;

        // 检测是否被重定向到驾考题页面（年龄验证）
        if (statusCode === 302) {
          const redirectUrl = err.response?.headers?.['location'];
          if (redirectUrl && redirectUrl.includes('driver-verify')) {
            logger.error(`请求被重定向到年龄验证页面。这可能是由于请求头不完整被识别为机器人。`);
            logger.error(`建议: 检查代理是否有效，或尝试在浏览器中访问 ${url} 确认是否可正常打开`);
            return null;
          }
        }

        // 403 友好提示
        if (statusCode === 403) {
          logger.error(`请求被拒绝 (403): ${url}`);
          logger.error(`这可能是由于以下原因:`);
          logger.error(`  1. 代理 IP 被 Cloudflare 封禁 — 尝试更换代理或使用住宅代理`);
          logger.error(`  2. 请求头不完整 — 更新 User-Agent`);
          logger.error(`  3. 请求过于频繁 — 尝试增加延迟 (--delay) 或降低并发 (--parallel)`);
          if (err.response?.data) {
            const responseData = err.response.data as string;
            if (typeof responseData === 'string' && responseData.length < 1000) {
              logger.error(`响应内容: ${responseData.substring(0, 500)}`);
            }
          }
        } else {
          logger.error(`请求页面 ${url} 失败: ${err.message}`);
          if (statusCode) {
            logger.error(`响应状态码: ${statusCode}`);
          }
        }

        // 判断是否可以重试
        const isRetryable = !err.response || // 无响应（网络错误）
          (statusCode && [500, 502, 503, 504, 429, 403].includes(statusCode)) ||
          (err.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(err.code));

        if (isRetryable && attempts < maxAttempts - 1) {
          attempts++;
          const delay = this.config.retryDelay * Math.pow(2, attempts - 1);
          logger.warn(`将在 ${Math.round(delay / 1000)} 秒后重试 (${attempts}/${maxAttempts - 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error(`请求失败，已耗尽所有重试次数: ${url}`);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * 使用 koonjs 发送 AJAX 请求（绕过 Node.js TLS 指纹检测）
   *
   * koonjs 使用 Rust + BoringSSL，其 TLS/HTTP2 指纹与 Chrome 浏览器一致，
   * 可避免被 Cloudflare 通过 JA3 指纹识别为爬虫。
   */
  private async koonRequest(url: string): Promise<{ statusCode: number; body: string }> {
    // 惰性初始化 koonjs 客户端
    if (!this.koonClient) {
      this.koonClient = new Koon({
        browser: 'chrome145',
        proxy: this.requestConfig.proxy || undefined
      });
    }

    try {
      const resp = await this.koonClient.get(url, {
        headers: {
          'Accept': '*/*',
          'Referer': new URL(this.config.base || this.config.BASE_URL).origin + '/',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': this.config.headers.Cookie || 'existmag=mag'
        }
      });
      return { statusCode: resp.status, body: resp.text() };
    } catch (error) {
      logger.error(`koonjs 请求失败: ${url}`);
      logger.error(`错误: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 从指定页面提取磁力链接，并返回最大文件大小对应的磁力链接
   * @param metadata 元数据对象
   * @returns 包含磁力链接信息的对象，如果没有找到则返回 null
   */
  public async fetchMagnet(metadata: Metadata): Promise<MagnetResult | null> {
    const fetchStartTime = Date.now();
    logger.debug(`fetchMagnet: 开始获取磁力链接，影片: ${metadata.title}`);

    // 验证metadata参数，防止注入攻击
    if (!metadata.gid || !/^[a-zA-Z0-9]+$/.test(metadata.gid)) {
      logger.error(`fetchMagnet: 无效的gid参数: ${metadata.gid}`);
      return null;
    }
    if (!metadata.img || !/^[a-zA-Z0-9\/_.-]+$/.test(metadata.img)) {
      logger.error(`fetchMagnet: 无效的img参数: ${metadata.img}`);
      return null;
    }
    if (!metadata.uc || !/^[a-zA-Z0-9]+$/.test(metadata.uc)) {
      logger.error(`fetchMagnet: 无效的uc参数: ${metadata.uc}`);
      return null;
    }

    // 使用配置中的 BASE_URL 作为默认值，而不是空字符串
    const baseUrl = this.config.base || this.config.BASE_URL;
    const parsedBaseUrl = new URL(baseUrl);
    const baseDomain = `${parsedBaseUrl.protocol}//${parsedBaseUrl.host}`;
    const url = `${baseDomain}/ajax/uncledatoolsbyajax.php?gid=${metadata.gid}&lang=zh&img=${metadata.img}&uc=${metadata.uc}&floor=${Math.floor(1e3 * Math.random() + 1)}`;

    logger.debug(`fetchMagnet: 构建AJAX URL: ${url}`);

    // 通过 koonjs（TLS 指纹客户端）发送 AJAX 请求
    let response: { statusCode: number; body: string };
    try {
      logger.debug(`fetchMagnet: 开始尝试 AJAX 请求: ${metadata.title}`);
      const ajaxStart = Date.now();
      response = await this.koonRequest(url);
      const ajaxTime = Date.now() - ajaxStart;
      logger.debug(`fetchMagnet: AJAX 请求完成: ${metadata.title} (耗时: ${Math.round(ajaxTime/1000)}s)`);
    } catch (error) {
      const failedTime = Date.now() - fetchStartTime;
      logger.warn(`fetchMagnet: AJAX 请求失败: ${metadata.title} (耗时: ${Math.round(failedTime/1000)}s), 错误: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }

    logger.debug(`fetchMagnet: AJAX响应获取成功: ${metadata.title} (总耗时: ${Math.round((Date.now() - fetchStartTime)/1000)}s)`);
    logger.debug(`fetchMagnet: AJAX响应内容长度: ${response.body.length}`);
    logger.debug(`fetchMagnet: AJAX响应内容前500字符: ${response.body.substring(0, 500)}`);

    // 解析逻辑委派给纯函数 extractMagnetLinks（无副作用、可独立测试）
    const result = extractMagnetLinks(response.body, { allmag: this.config.allmag });

    const totalTime = Date.now() - fetchStartTime;
    if (result) {
      logger.debug(`fetchMagnet: 成功获取磁力链接: ${metadata.title} (总耗时: ${Math.round(totalTime/1000)}s)`);
    } else {
      logger.error(`fetchMagnet: 未找到磁力链接或文件大小: ${metadata.title} (总耗时: ${Math.round(totalTime/1000)}s)`);
    }

    return result;
  }

  /**
   * 下载图片到指定路径
   * @param url 图片 URL
   * @param filename 文件名
   * @param referer 可选的Referer头，如果不提供则从图片URL自动生成
   * @returns 如果文件已存在则返回 false，否则返回 true
   */
  public async downloadImage(url: string, filename: string, referer?: string) {
    const dirPath = this.config.output; // 获取输出目录路径
    // 防止路径遍历攻击
    const sanitizedFilename = path.basename(filename);
    const originalFilePath = path.join(dirPath, sanitizedFilename);
    const ext = path.extname(sanitizedFilename); // 获取文件扩展名
    const baseFilename = path.basename(sanitizedFilename, ext); // 获取不带扩展名的文件名
    // 检查并创建目录 (如果之前没有添加的话)
    if (!fs.existsSync(dirPath)) {
      try {
        await fs.promises.mkdir(dirPath, { recursive: true });
      } catch (mkdirError) {
        ErrorHandler.handleError(mkdirError, `创建输出目录: ${dirPath}`);
        throw mkdirError; // 如果目录创建失败，后续操作也无法进行
      }
    }
    // 尝试保存文件
    try {
      if (fs.existsSync(originalFilePath)) {
        // console.log(`图片 ${filename} 已存在，跳过下载。`);
        return false;
      }

      // 准备请求头
      let headers = { ...this.requestConfig.headers };

      // 设置Referer头，优先使用传入的referer参数，否则从图片URL自动生成
      let refererUrl: string;
      if (referer) {
        refererUrl = referer;
        logger.debug(`downloadImage: 使用传入的Referer: ${refererUrl}`);
      } else {
        const imageUrl = new URL(url);
        refererUrl = `${imageUrl.protocol}//${imageUrl.hostname}/`;
        logger.debug(`downloadImage: 从图片URL自动生成Referer: ${refererUrl}`);
      }
      headers.referer = refererUrl;

      // 创建 HTTPS Agent 用于图片下载（支持 SSL 配置）
      const httpsAgent = this.createHttpsAgent();

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.requestConfig.timeout,
        headers,
        httpsAgent
      });
      fs.writeFileSync(originalFilePath, Buffer.from(response.data, 'binary'));
      return true;
    } catch (err) {
        const error = err as NodeJS.ErrnoException; // 明确类型为文件系统错误
        
        // 检查是否是文件路径过长或非法字符导致的错误
        if (error.code === 'ENOENT' || error.code === 'ENAMETOOLONG') {
          logger.warn(`保存图片失败，文件名可能过长或包含非法字符，尝试简化文件名: ${filename}`);
          // 简化文件名，例如保留部分原文件名和哈希值
          const simplifiedFilename = `${baseFilename.substring(0, 50)}_..._${baseFilename.substring(baseFilename.length - 10)}${ext}`.replace(/[^a-zA-Z0-9_\-. ]/g, '_'); // 简单替换非法字符
          const simplifiedFilePath = path.join(dirPath, simplifiedFilename);
        try {
            if (fs.existsSync(simplifiedFilePath)) {
              logger.info(`简化后的图片 ${simplifiedFilename} 已存在，跳过下载。`);
              return false;
            }
            // 准备请求头（简化文件名情况下）
            let simplifiedHeaders = { ...this.requestConfig.headers };
            
            // 设置Referer头，优先使用传入的referer参数，否则从图片URL自动生成
            let simplifiedRefererUrl: string;
            if (referer) {
              simplifiedRefererUrl = referer;
              logger.debug(`downloadImage (简化): 使用传入的Referer: ${simplifiedRefererUrl}`);
            } else {
              const imageUrl = new URL(url);
              simplifiedRefererUrl = `${imageUrl.protocol}//${imageUrl.hostname}/`;
              logger.debug(`downloadImage (简化): 从图片URL自动生成Referer: ${simplifiedRefererUrl}`);
            }
            simplifiedHeaders.referer = simplifiedRefererUrl;

            // 创建 HTTPS Agent 用于简化文件名图片下载
            const httpsAgent = this.createHttpsAgent();

            const response = await axios.get(url, {
              responseType: 'arraybuffer',
              timeout: this.requestConfig.timeout,
              headers: simplifiedHeaders,
              httpsAgent
            });
            await fs.promises.writeFile(simplifiedFilePath, Buffer.from(response.data, 'binary'));
            logger.info(`图片已使用简化文件名保存: ${simplifiedFilename}`);
            return true;
          } catch (simplifyErr) {
          const simplifyError = simplifyErr as Error; // Simplification attempt error
            // 记录简化文件名尝试的详细错误信息
            logger.error(`使用简化文件名下载图片失败: ${simplifiedFilename}`);
            logger.error(`错误类型: ${simplifyError.constructor.name}`);
            logger.error(`错误信息: ${simplifyError.message}`);
            
            // 如果是AxiosError，记录更详细的响应信息
            if (simplifyError.name === 'AxiosError') {
              const axiosError = simplifyError as any;
              logger.error(`响应状态码: ${axiosError.response?.status || 'N/A'}`);
              if (axiosError.response) {
                logger.error(`完整响应数据: ${JSON.stringify(axiosError.response.data, null, 2)}`);
                logger.error(`响应头: ${JSON.stringify(axiosError.response.headers || {}, null, 2)}`);
              }
              if (axiosError.config) {
                logger.debug(`请求方法: ${axiosError.config.method || 'N/A'}`);
                logger.debug(`请求头: ${JSON.stringify(axiosError.config.headers || {}, null, 2)}`);
              }
            }
            
            logger.error(`错误堆栈: ${simplifyError.stack}`);
            ErrorHandler.handleError(simplifyError, `使用简化文件名保存图片: ${simplifiedFilename}`);
            throw simplifyError; // 简化文件名后仍然失败，抛出错误
          }
        } else {
          // 其他类型的错误，直接抛出
          ErrorHandler.handleError(error, `保存图片: ${filename}`);
          throw error;
        }
    }
  }
  /**
   * 验证Cookie值是否有效
   */
  private isValidCookieValue(value: string): boolean {
    // 检查值是否包含非可打印字符或控制字符
    // 允许的字符：字母、数字、常见符号、空格等
    if (!value || typeof value !== 'string') {
      return false;
    }
    // 检查长度，太长的Cookie可能有问题
    if (value.length > 4096) {
      return false;
    }
    // 检查是否只包含可打印ASCII字符和常见Unicode字符
    // 排除控制字符（0-31和127）
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      if (charCode < 32 || charCode === 127) {
        return false;
      }
    }
    return true;
  }
  /**
   * 安全地设置Cookie到请求头
   */
  private setCookieHeader(headers: Record<string, string>, cookieString: string): boolean {
    try {
      // 首先验证Cookie字符串是否有效
      if (!this.isValidCookieString(cookieString)) {
        logger.warn('Cookie字符串验证失败，包含无效字符');
        return false;
      }
      headers.Cookie = cookieString;
      logger.debug('Cookie已安全设置到请求头');
      return true;
    } catch (error) {
      logger.warn(`设置Cookie时发生错误: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  /**
   * 创建代理agent
   * @param proxyUrl 代理URL
   * @returns 代理agent或null
   */
  private createProxyAgent(proxyUrl: string): any | null {
    try {
      const url = new URL(proxyUrl);
      const agentOptions = {
        proxy: {
          host: url.hostname,
          port: parseInt(url.port, 10),
          // 可选：如果代理需要认证
          // proxyAuth: 'username:password'
        }
      };
      return url.protocol === 'http:'
        ? tunnel.httpsOverHttp(agentOptions)
        : tunnel.httpsOverHttps(agentOptions);
    } catch (error) {
      logger.error(`创建代理agent失败: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
  /**
   * 验证Cookie字符串是否有效
   */
  private isValidCookieString(cookieString: string): boolean {
    if (!cookieString || typeof cookieString !== 'string') {
      return false;
    }
    // 检查总长度
    if (cookieString.length > 8192) {
      return false;
    }
    // 分割并验证每个Cookie
    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
      const trimmedCookie = cookie.trim();
      if (trimmedCookie.length === 0) {
        continue;
      }
      // 检查Cookie格式（至少包含一个=）
      const equalIndex = trimmedCookie.indexOf('=');
      if (equalIndex <= 0 || equalIndex >= trimmedCookie.length - 1) {
        return false;
      }
      // 验证Cookie名称
      const name = trimmedCookie.substring(0, equalIndex).trim();
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return false;
      }
      // 验证Cookie值
      const value = trimmedCookie.substring(equalIndex + 1).trim();
      if (!this.isValidCookieValue(value)) {
        return false;
      }
    }
    return true;
  }
  /**
   * 创建 HTTPS Agent，支持代理和 SSL 配置
   * @returns HTTPS Agent 实例
   */
  private createHttpsAgent(): https.Agent {
    // 默认严格验证 SSL 证书
    const strictSSL = this.config.strictSSL !== false; // 默认为 true

    // 代理配置
    const proxyOptions: any = {};
    if (this.config.proxy) {
      try {
        const proxyUrl = new URL(this.config.proxy);
        proxyOptions.proxy = {
          host: proxyUrl.hostname,
          port: parseInt(proxyUrl.port) || (proxyUrl.protocol === 'https:' ? 443 : 80)
        };
        // 如果代理需要认证
        if (proxyUrl.username && proxyUrl.password) {
          proxyOptions.proxy.headers = {
            'Proxy-Authorization': `Basic ${Buffer.from(`${proxyUrl.username}:${proxyUrl.password}`).toString('base64')}`
          };
        }
      } catch (error) {
        logger.warn(`代理URL解析失败: ${this.config.proxy}，将使用默认代理设置`);
      }
    }

    return new https.Agent({
      rejectUnauthorized: strictSSL,
      ...proxyOptions
    });
  }

  /**
   * 关闭请求处理器（清理资源）
   */
  public async close(): Promise<void> {
    // 无需清理的资源（Cloudflare 绕过器已移除）
  }
}

export default RequestHandler;