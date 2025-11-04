/**
 * Cloudflare Bypass Handler
 * 使用 Puppeteer + Stealth 插件绕过 Cloudflare 保护
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteerCore from 'puppeteer-extra';
import logger from '../core/logger';
import fs from 'fs';
import path from 'path';

// 使用 stealth 插件
puppeteer.use(StealthPlugin());

interface CloudflareConfig {
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: string;
}

class CloudflareBypass {
  private browser: any = null;
  private page: any = null;
  private config: CloudflareConfig;

  constructor(config: CloudflareConfig = {}) {
    this.config = {
      headless: config.headless !== false, // 默认无头模式
      timeout: config.timeout || 30000,
      viewport: config.viewport || { width: 1920, height: 1080 },
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      proxy: config.proxy
    };
  }

  /**
   * 初始化浏览器
   */
  public async init(): Promise<void> {
    try {
      logger.info('正在启动 Puppeteer 浏览器...');

      const launchOptions: any = {
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-webgl',
          '--disable-3d-apis',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      };

      // 配置代理
      if (this.config.proxy) {
        try {
          const proxyUrl = new URL(this.config.proxy);
          launchOptions.args.push(
            `--proxy-server=${proxyUrl.protocol}//${proxyUrl.hostname}:${proxyUrl.port}`
          );
          logger.info(`使用代理: ${this.config.proxy}`);
        } catch (error) {
          logger.warn(`代理配置无效: ${this.config.proxy}`);
        }
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.page = await this.browser.newPage();

      // 设置视口
      await this.page.setViewport(this.config.viewport!);

      // 设置User-Agent
      await this.page.setUserAgent(this.config.userAgent!);

      // 设置超时
      this.page.setDefaultTimeout(this.config.timeout!);

      logger.info('Puppeteer 浏览器启动成功');
    } catch (error) {
      logger.error(`启动 Puppeteer 失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 访问页面并绕过 Cloudflare
   */
  public async bypassCloudflare(url: string): Promise<string> {
    if (!this.page) {
      throw new Error('请先调用 init() 方法初始化浏览器');
    }

    try {
      logger.info(`正在访问页面: ${url}`);

      // 访问页面
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });

      if (!response) {
        throw new Error('页面响应为空');
      }

      const status = response.status();
      logger.info(`页面状态码: ${status}`);

      // 检查是否有 Cloudflare 挑战页面
      const hasCloudflareChallenge = await this.page.evaluate(() => {
        // 检查常见的 Cloudflare 挑战标识
        const challenges = [
          'cf-browser-verification',
          'cf-im-under-attack',
          'cf-challenge-running',
          'cloudflare-turnstile',
          'jschl_vc',
          'pass',
          'captcha-bypass'
        ];

        return challenges.some(challenge =>
          document.body.innerHTML.includes(challenge) ||
          document.title.includes('Just a moment') ||
          document.title.includes('DDoS protection') ||
          window.location.href.includes('challenge')
        );
      });

      if (hasCloudflareChallenge) {
        logger.info('检测到 Cloudflare 挑战，正在等待解决...');

        // 等待 Cloudflare 挑战完成
        await this.waitForCloudflareChallenge();

        logger.info('Cloudflare 挑战已解决');
      }

      // 获取最终的页面内容
      const content = await this.page.content();

      // 获取当前页面的 Cookies
      const cookies = await this.page.cookies();
      const cookieString = cookies
        .map((cookie: any) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      logger.info(`获取到 ${cookies.length} 个 Cookies`);

      return content;
    } catch (error) {
      logger.error(`绕过 Cloudflare 失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取当前页面的 Cookies
   */
  public async getCookies(): Promise<string> {
    if (!this.page) {
      throw new Error('请先调用 init() 方法初始化浏览器');
    }

    try {
      const cookies = await this.page.cookies();
      const cookieString = cookies
        .map((cookie: any) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      logger.info(`获取到 ${cookies.length} 个 Cookies`);
      return cookieString;
    } catch (error) {
      logger.error(`获取 Cookies 失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 使用页面执行 AJAX 请求
   */
  public async executeAjax(url: string): Promise<any> {
    if (!this.page) {
      throw new Error('请先调用 init() 方法初始化浏览器');
    }

    try {
      logger.info(`执行 AJAX 请求: ${url}`);

      // 确保在正确的页面上下文中执行AJAX请求
      // 首先检查当前页面的URL是否与AJAX请求的域名匹配
      const currentUrl = this.page.url();
      const ajaxUrlObj = new URL(url);
      const currentUrlObj = new URL(currentUrl);

      if (ajaxUrlObj.hostname !== currentUrlObj.hostname) {
        logger.warn(`AJAX域名不匹配，当前页面: ${currentUrlObj.hostname}, AJAX请求: ${ajaxUrlObj.hostname}`);
        // 导航到正确的域名页面
        await this.page.goto(`${ajaxUrlObj.protocol}//${ajaxUrlObj.hostname}/`, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout
        });
        // 等待一段时间确保页面完全加载
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 使用原生JavaScript Promise，避免TypeScript编译后的__awaiter问题
      // 在页面上下文中直接执行AJAX请求，这样可以正确使用页面的cookies
      const result = await this.page.evaluate((ajaxUrl: string) => {
        return new Promise(function(resolve: any, reject: any) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', ajaxUrl, true);
          xhr.withCredentials = true;

          // 设置正确的请求头
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          xhr.setRequestHeader('Accept', '*/*');
          xhr.setRequestHeader('Cache-Control', 'no-cache');
          xhr.setRequestHeader('Pragma', 'no-cache');

          xhr.onload = function() {
            if (xhr.status === 200) {
              resolve({
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                headers: xhr.getAllResponseHeaders()
              });
            } else {
              reject(new Error('AJAX 请求失败: ' + xhr.status + ' ' + xhr.statusText));
            }
          };

          xhr.onerror = function() {
            reject(new Error('AJAX 网络错误'));
          };

          xhr.send();
        });
      }, url);

      const ajaxResult = result as { status: number; statusText: string; responseText: string; headers: string };
      logger.info(`AJAX 请求成功，状态码: ${ajaxResult.status}`);
      return ajaxResult.responseText;
    } catch (error) {
      logger.error(`AJAX 请求失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 等待 Cloudflare 挑战完成
   */
  private async waitForCloudflareChallenge(): Promise<void> {
    if (!this.page) return;

    try {
      // 等待挑战页面消失
      await this.page.waitForFunction(
        () => {
          return !document.body.innerHTML.includes('cf-browser-verification') &&
                 !document.body.innerHTML.includes('cf-im-under-attack') &&
                 !document.title.includes('Just a moment') &&
                 !document.title.includes('DDoS protection');
        },
        { timeout: 60000 }
      );

      // 额外等待一段时间确保页面完全加载
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      logger.warn(`等待 Cloudflare 挑战超时: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 保存 Cookies 到文件
   */
  public async saveCookies(filename: string = 'cloudflare_cookies.json'): Promise<void> {
    if (!this.page) {
      throw new Error('请先调用 init() 方法初始化浏览器');
    }

    try {
      const cookies = await this.page.cookies();
      const cookiesFile = path.join(process.cwd(), filename);

      fs.writeFileSync(cookiesFile, JSON.stringify(cookies, null, 2));
      logger.info(`Cookies 已保存到: ${cookiesFile}`);
    } catch (error) {
      logger.error(`保存 Cookies 失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 关闭浏览器
   */
  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      logger.info('Puppeteer 浏览器已关闭');
    }
  }
}

export default CloudflareBypass;