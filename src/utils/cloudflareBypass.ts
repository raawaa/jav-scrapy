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
import { PuppeteerPool, PuppeteerInstance } from '../core/puppeteerPool';

// 使用 stealth 插件
puppeteer.use(StealthPlugin());

interface CloudflareConfig {
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  proxy?: string;
  puppeteerPool?: PuppeteerPool;
}

class CloudflareBypass {
  private browser: any = null;
  private page: any = null;
  private config: CloudflareConfig;
  private puppeteerPool: PuppeteerPool | null = null;
  private currentInstance: PuppeteerInstance | null = null;

  constructor(config: CloudflareConfig = {}) {
    this.config = {
      headless: config.headless !== false, // 默认无头模式
      timeout: config.timeout || 30000,
      viewport: config.viewport || { width: 1920, height: 1080 },
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      proxy: config.proxy
    };
    this.puppeteerPool = config.puppeteerPool || null;
  }

  /**

   * 初始化浏览器

   */

  public async init(): Promise<void> {
    try {
      logger.info('正在初始化 Cloudflare 绕过器...');

      // 如果有共享池，使用共享池
      if (this.puppeteerPool) {
        logger.info('使用共享 Puppeteer 池');
        await this.puppeteerPool.initialize();
        return;
      }

      // 否则创建独立实例（向后兼容）
      logger.info('创建独立的 Puppeteer 实例');
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

          logger.debug(`代理配置详情: protocol=${proxyUrl.protocol}, hostname=${proxyUrl.hostname}, port=${proxyUrl.port}`);

        } catch (error) {

          // 尝试手动解析代理URL格式

          if (typeof this.config.proxy === 'string') {

            // 支持如 "http://127.0.0.1:10809" 或 "127.0.0.1:10809" 的格式

            let proxyMatch = this.config.proxy.match(/^https?:\/\/(.+)$/i);

            if (proxyMatch) {

              launchOptions.args.push(`--proxy-server=${proxyMatch[1]}`);

              logger.info(`使用代理 (手动解析): ${this.config.proxy}`);

              logger.debug(`代理配置详情 (手动解析): ${proxyMatch[1]}`);

            } else {

              launchOptions.args.push(`--proxy-server=${this.config.proxy}`);

              logger.info(`使用代理 (直接使用): ${this.config.proxy}`);

              logger.debug(`代理配置详情 (直接使用): ${this.config.proxy}`);

            }

          } else {

            logger.warn(`代理配置无效: ${this.config.proxy}`);

          }

        }

      }



      logger.debug(`Puppeteer 启动参数: ${JSON.stringify(launchOptions, null, 2)}`);

      this.browser = await puppeteer.launch(launchOptions);

      logger.debug(`Puppeteer 浏览器已启动，进程ID: ${(this.browser as any).process().pid}`);

      this.page = await this.browser.newPage();

      logger.debug(`Puppeteer 页面已创建`);



      // 设置视口
      await this.page.setViewport(this.config.viewport!);
      logger.debug(`页面视口已设置: ${JSON.stringify(this.config.viewport)}`);

      // 设置User-Agent
      await this.page.setUserAgent(this.config.userAgent!);
      logger.debug(`User-Agent 已设置: ${this.config.userAgent}`);

      // 设置超时
      this.page.setDefaultTimeout(this.config.timeout!);
      logger.debug(`页面超时已设置: ${this.config.timeout}ms`);

      // 设置年龄认证相关的Cookie
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      });
      logger.debug('额外HTTP头已设置');

      // 设置年龄认证相关的Cookie（在访问页面之前）
      const cookiesToSet = [
        {
          name: 'age_verified',
          value: 'true',
          domain: '.javbus.com',
          path: '/',
          expires: Date.now() + 31536000000 // 1年后过期
        },
        {
          name: 'adult_verified',
          value: 'true',
          domain: '.javbus.com',
          path: '/',
          expires: Date.now() + 31536000000
        },
        {
          name: 'age_verification',
          value: '1',
          domain: '.javbus.com',
          path: '/',
          expires: Date.now() + 31536000000
        },
        {
          name: 'is_adult',
          value: 'true',
          domain: '.javbus.com',
          path: '/',
          expires: Date.now() + 31536000000
        },
        {
          name: 'javbus_age',
          value: '1',
          domain: '.javbus.com',
          path: '/',
          expires: Date.now() + 31536000000
        }
      ];

      try {
        await this.page.setCookie(...cookiesToSet);
        logger.debug('年龄认证相关的Cookie已设置');
      } catch (error) {
        logger.warn(`设置Cookie失败: ${error instanceof Error ? error.message : String(error)}`);
        // 设置Cookie失败不应该阻止程序继续运行
      }

      logger.info('Puppeteer 浏览器启动成功');

    } catch (error) {
      logger.error(`启动 Puppeteer 失败: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
      
      // 记录完整的错误信息
      logger.debug(`init: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
      
      // 记录系统环境信息
      try {
        logger.debug(`init: 系统平台: ${process.platform}`);
        logger.debug(`init: Node.js版本: ${process.version}`);
        logger.debug(`init: 当前工作目录: ${process.cwd()}`);
        logger.debug(`init: 内存使用: ${JSON.stringify(process.memoryUsage(), null, 2)}`);
        
        // 记录Puppeteer配置信息
        logger.debug(`init: Puppeteer配置: ${JSON.stringify(this.config, null, 2)}`);
        
        // 检查是否有其他浏览器进程
        const { execSync } = require('child_process');
        try {
          if (process.platform === 'win32') {
            const processes = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /FO CSV', { encoding: 'utf8' });
            logger.debug(`init: Chrome进程列表: ${processes}`);
          } else if (process.platform === 'linux') {
            const processes = execSync('ps aux | grep chrome', { encoding: 'utf8' });
            logger.debug(`init: Chrome进程列表: ${processes}`);
          }
        } catch (processError) {
          logger.debug(`init: 获取Chrome进程列表失败: ${processError instanceof Error ? processError.message : String(processError)}`);
        }
      } catch (envError) {
        logger.debug(`init: 获取环境信息失败: ${envError instanceof Error ? envError.message : String(envError)}`);
      }
      
      // 清理可能已创建的资源
      try {
        if (this.page) {
          await this.page.close();
          this.page = null;
          logger.debug('init: 已清理页面资源');
        }
      } catch (pageCloseError) {
        logger.debug(`init: 清理页面资源失败: ${pageCloseError instanceof Error ? pageCloseError.message : String(pageCloseError)}`);
      }
      
      try {
        if (this.browser) {
          await this.browser.close();
          this.browser = null;
          logger.debug('init: 已清理浏览器资源');
        }
      } catch (browserCloseError) {
        logger.debug(`init: 清理浏览器资源失败: ${browserCloseError instanceof Error ? browserCloseError.message : String(browserCloseError)}`);
      }
      
      throw error;
    }

  }

  /**
   * 访问页面并绕过 Cloudflare
   */
  public async bypassCloudflare(url: string): Promise<string> {
    try {
      // 如果有共享池，从池中获取实例
      if (this.puppeteerPool) {
        logger.debug(`从共享池获取 Puppeteer 实例: ${url}`);
        // 简化实例获取，只传递优先级
        this.currentInstance = await this.puppeteerPool.getInstance(undefined, 1); // 高优先级
        this.page = this.currentInstance.page;

        // 验证页面是否正确获取
        if (!this.page || !this.currentInstance) {
          throw new Error('从共享池获取的页面实例为 null');
        }

        logger.debug(`成功获取 Puppeteer 实例: ${this.currentInstance.id}`);
      } else if (!this.page) {
        throw new Error('请先调用 init() 方法初始化浏览器');
      }
    } catch (error) {
      logger.error('获取 Puppeteer 实例失败:', error);
      logger.error(`错误详情: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }

    try {
      logger.info(`正在访问页面: ${url}`);
      logger.debug(`页面访问参数: waitUntil=networkidle2, timeout=${this.config.timeout}`);

      // 访问页面
      const response = await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });

      if (!response) {
        throw new Error('页面响应为空');
      }

      const status = response.status();
      const headers = response.headers();
      logger.info(`页面状态码: ${status}`);
      logger.debug(`页面响应头: ${JSON.stringify(headers, null, 2)}`);

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

      // 检查是否有年龄认证页面
      const hasAgeVerification = await this.page.evaluate(() => {
        // 检查常见的年龄认证标识
        const ageVerificationIndicators = [
          'Age Verification',
          '年龄认证',
          'age verification',
          '18+',
          'adult content',
          'adult only'
        ];

        return ageVerificationIndicators.some(indicator =>
          document.title.includes(indicator) ||
          document.body.innerText.toLowerCase().includes(indicator.toLowerCase())
        );
      });

      logger.debug(`Cloudflare 挑战检测结果: ${hasCloudflareChallenge}`);
      logger.debug(`年龄认证检测结果: ${hasAgeVerification}`);

      if (hasCloudflareChallenge) {
        logger.info('检测到 Cloudflare 挑战，正在等待解决...');
        // 等待 Cloudflare 挑战完成
        await this.waitForCloudflareChallenge();
        logger.info('Cloudflare 挑战已解决');
      } else if (hasAgeVerification) {
        logger.info('检测到年龄认证页面，正在尝试处理...');
        // 尝试处理年龄认证
        await this.handleAgeVerification();
        logger.info('年龄认证处理完成');
      } else {
        logger.debug('未检测到 Cloudflare 挑战或年龄认证');
      }

      // 获取最终的页面内容
      const content = await this.page.content();
      logger.debug(`页面内容长度: ${content.length}`);

      // 获取当前页面的 Cookies
      const cookies = await this.page.cookies();
      const cookieString = cookies
        .map((cookie: any) => `${cookie.name}=${cookie.value}`)
        .join('; ');

      logger.info(`获取到 ${cookies.length} 个 Cookies`);
      logger.debug(`Cookies 详情: ${JSON.stringify(cookies, null, 2)}`);

      // 如果使用共享池，释放实例回池
      if (this.puppeteerPool && this.currentInstance) {
        logger.debug(`释放 Puppeteer 实例回共享池: ${this.currentInstance.id}`);
        this.puppeteerPool.releaseInstance(this.currentInstance);
        this.currentInstance = null;
        this.page = null;
      }

      return content;
    } catch (error) {
      logger.error(`绕过 Cloudflare 失败: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
      
      // 记录完整的错误信息
      logger.debug(`bypassCloudflare: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
      
      // 尝试获取当前页面信息
      try {
        if (this.page) {
          const pageUrl = this.page.url();
          const pageTitle = await this.page.title();
          const pageContent = await this.page.content();
          
          logger.debug(`bypassCloudflare: 当前页面URL: ${pageUrl}`);
          logger.debug(`bypassCloudflare: 当前页面标题: ${pageTitle}`);
          logger.debug(`bypassCloudflare: 页面内容长度: ${pageContent.length}`);
          
          // 记录页面内容的前1000个字符
          if (pageContent.length > 0) {
            logger.debug(`bypassCloudflare: 页面内容前1000字符: ${pageContent.substring(0, 1000)}`);
          }
          
          // 检查是否有特定的错误页面
          const hasCloudflareError = pageContent.includes('cf-error-details') || 
                                     pageContent.includes('Cloudflare Ray ID') ||
                                     pageContent.includes('error code:');
          
          if (hasCloudflareError) {
            logger.debug(`bypassCloudflare: 检测到Cloudflare错误页面`);
          }
          
          // 检查是否有年龄认证页面
          const hasAgeVerification = pageContent.includes('Age Verification') ||
                                     pageContent.includes('年龄认证') ||
                                     pageContent.includes('age verification');
          
          if (hasAgeVerification) {
            logger.debug(`bypassCloudflare: 检测到年龄认证页面`);
          }
        }
      } catch (pageInfoError) {
        logger.debug(`bypassCloudflare: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
      }

      // 确保在错误情况下也释放实例回池
      if (this.puppeteerPool && this.currentInstance) {
        logger.debug(`错误情况下释放 Puppeteer 实例回共享池: ${this.currentInstance.id}`);
        this.puppeteerPool.releaseInstance(this.currentInstance);
        this.currentInstance = null;
        this.page = null;
      }

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
      
      // 记录所有获取到的cookies，用于调试
      logger.debug(`getCookies: 获取到的所有cookies:`);
      cookies.forEach((cookie: any) => {
        logger.debug(`  ${cookie.name}=${cookie.value} (domain: ${cookie.domain}, path: ${cookie.path})`);
      });
      
      // 确保包含年龄验证相关的cookies
      const ageVerificationCookies = ['age_verified', 'adult_verified', 'age_verification_passed', 'is_adult', 'verified_adult'];
      const hasAgeVerificationCookies = ageVerificationCookies.some(name => 
        cookies.some((cookie: any) => cookie.name === name)
      );
      
      if (!hasAgeVerificationCookies) {
        logger.warn('getCookies: 未找到年龄验证相关的cookies，可能影响图片下载');
        // 尝试重新设置年龄验证cookies
        await this.setAgeVerificationCookies();
        
        // 重新获取cookies
        const updatedCookies = await this.page.cookies();
        logger.debug(`getCookies: 重新设置后获取到的cookies数量: ${updatedCookies.length}`);
        
        const cookieString = updatedCookies
          .map((cookie: any) => `${cookie.name}=${cookie.value}`)
          .join('; ');
        
        logger.info(`获取到 ${updatedCookies.length} 个 Cookies (包含年龄验证)`);
        return cookieString;
      }
      
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
    const ajaxStartTime = Date.now();
    logger.debug(`executeAjax: 开始执行 AJAX 请求: ${url}`);

    // 从 Puppeteer 池获取页面实例
    let instance: PuppeteerInstance | null = null;
    let page: any = null;

    try {
      if (!this.puppeteerPool) {
        throw new Error('executeAjax: Puppeteer 池未初始化');
      }

      logger.debug(`executeAjax: 从池中获取页面实例用于 AJAX 请求`);
      instance = await this.puppeteerPool.getInstance();
      page = instance.page;
      logger.debug(`executeAjax: 成功获取页面实例 ${instance.id}`);

      logger.info(`executeAjax: 执行 AJAX 请求: ${url}`);
      logger.debug(`executeAjax: AJAX 请求详情: withCredentials=true`);

      // 确保在正确的页面上下文中执行AJAX请求
      // 首先检查当前页面的URL是否与AJAX请求的域名匹配
      const currentUrl = page.url();
      const ajaxUrlObj = new URL(url);
      const currentUrlObj = new URL(currentUrl);

      logger.debug(`executeAjax: 当前页面URL: ${currentUrl}`);
      logger.debug(`executeAjax: AJAX请求URL: ${url}`);
      logger.debug(`executeAjax: 域名匹配检查: 当前=${currentUrlObj.hostname}, AJAX=${ajaxUrlObj.hostname}`);

      if (ajaxUrlObj.hostname !== currentUrlObj.hostname) {
        logger.warn(`executeAjax: AJAX域名不匹配，当前页面: ${currentUrlObj.hostname}, AJAX请求: ${ajaxUrlObj.hostname}`);
        // 导航到正确的域名页面
        const navigationStart = Date.now();
        logger.debug(`executeAjax: 正在导航到: ${ajaxUrlObj.protocol}//${ajaxUrlObj.hostname}/`);
        await page.goto(`${ajaxUrlObj.protocol}//${ajaxUrlObj.hostname}/`, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout
        });
        const navigationTime = Date.now() - navigationStart;
        logger.debug(`executeAjax: 页面导航完成 (耗时: ${Math.round(navigationTime/1000)}s)`);

        // 等待一段时间确保页面完全加载
        logger.debug(`executeAjax: 等待2秒确保页面完全加载`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        logger.debug(`executeAjax: 页面稳定等待完成`);
      }

      // 使用原生JavaScript Promise，避免TypeScript编译后的__awaiter问题
      // 在页面上下文中直接执行AJAX请求，这样可以正确使用页面的cookies
      logger.debug(`executeAjax: 在页面上下文中执行AJAX请求`);
      const evaluateStart = Date.now();

      const result = await page.evaluate((ajaxUrl: string) => {
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

      const evaluateTime = Date.now() - evaluateStart;
      const ajaxResult = result as { status: number; statusText: string; responseText: string; headers: string };
      const totalTime = Date.now() - ajaxStartTime;

      logger.info(`executeAjax: AJAX 请求成功，状态码: ${ajaxResult.status}`);
      logger.debug(`executeAjax: AJAX 响应详情: status=${ajaxResult.status}, statusText=${ajaxResult.statusText}, responseLength=${ajaxResult.responseText.length}`);
      logger.debug(`executeAjax: 执行耗时: ${Math.round(evaluateTime/1000)}s, 总耗时: ${Math.round(totalTime/1000)}s`);
      logger.debug(`executeAjax: AJAX 响应头: ${ajaxResult.headers}`);

      // 如果响应内容较短，记录完整内容
      if (ajaxResult.responseText.length < 1000) {
        logger.debug(`executeAjax: AJAX 响应内容: ${ajaxResult.responseText}`);
      } else {
        logger.debug(`executeAjax: AJAX 响应内容 (前500字符): ${ajaxResult.responseText.substring(0, 500)}`);
      }

      return ajaxResult.responseText;
    } catch (error) {
      const totalTime = Date.now() - ajaxStartTime;
      logger.error(`executeAjax: AJAX 请求失败 (耗时: ${Math.round(totalTime/1000)}s)`);
      logger.error(`executeAjax: 错误详情: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`executeAjax: 错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
      logger.error(`executeAjax: 错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);

      // 记录完整的错误信息
      logger.debug(`executeAjax: 完整错误对象: ${JSON.stringify(error, null, 2)}`);

      // 检查浏览器进程状态
      try {
        if (page && instance) {
          const browser = instance.browser;
          if (browser && browser.process()) {
            logger.debug(`executeAjax: 浏览器进程状态: PID=${browser.process().pid}, 是否连接=${browser.isConnected()}`);
          } else {
            logger.warn('executeAjax: 浏览器进程不可用');
          }
        } else {
          logger.warn('executeAjax: 页面实例不可用，无法检查浏览器进程状态');
        }
      } catch (processError) {
        logger.warn(`executeAjax: 检查浏览器进程失败: ${processError instanceof Error ? processError.message : String(processError)}`);
      }

      // 获取页面错误信息
      if (page) {
        try {
          const pageErrors = await page.evaluate(() => {
            // 尝试获取页面上的错误信息
            const errorElements = Array.from(document.querySelectorAll('body *')).filter(el =>
              el.textContent && (el.textContent.includes('error') || el.textContent.includes('Error') || el.textContent.includes('403') || el.textContent.includes('Forbidden'))
            );
            return errorElements.map(el => el.textContent).slice(0, 5); // 只返回前5个错误信息
          });
          if (pageErrors && pageErrors.length > 0) {
            logger.debug(`executeAjax: 页面错误信息: ${JSON.stringify(pageErrors, null, 2)}`);
          }
        } catch (pageError) {
          logger.debug(`executeAjax: 获取页面错误信息失败: ${pageError instanceof Error ? pageError.message : String(pageError)}`);
        }

        // 尝试获取页面内容和URL
        try {
          const pageUrl = page.url();
          const pageTitle = await page.title();
          const pageContent = await page.content();

          logger.debug(`executeAjax: 当前页面URL: ${pageUrl}`);
          logger.debug(`executeAjax: 当前页面标题: ${pageTitle}`);
          logger.debug(`executeAjax: 页面内容长度: ${pageContent.length}`);

          // 记录页面内容的前1000个字符
          if (pageContent.length > 0) {
            logger.debug(`executeAjax: 页面内容前1000字符: ${pageContent.substring(0, 1000)}`);
          }
        } catch (pageInfoError) {
          logger.debug(`executeAjax: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
        }
      }

      throw error;
    } finally {
      // 确保页面实例被释放回池
      if (instance && this.puppeteerPool) {
        logger.debug(`executeAjax: 释放页面实例 ${instance.id} 回池`);
        this.puppeteerPool.releaseInstance(instance);
      }
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
      
      // 记录完整的错误信息
      logger.debug(`waitForCloudflareChallenge: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
      logger.debug(`waitForCloudflareChallenge: 错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
      logger.debug(`waitForCloudflareChallenge: 错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
      
      // 尝试获取当前页面信息
      try {
        if (this.page) {
          const pageUrl = this.page.url();
          const pageTitle = await this.page.title();
          const pageContent = await this.page.content();
          
          logger.debug(`waitForCloudflareChallenge: 当前页面URL: ${pageUrl}`);
          logger.debug(`waitForCloudflareChallenge: 当前页面标题: ${pageTitle}`);
          logger.debug(`waitForCloudflareChallenge: 页面内容长度: ${pageContent.length}`);
          
          // 记录页面内容的前1000个字符
          if (pageContent.length > 0) {
            logger.debug(`waitForCloudflareChallenge: 页面内容前1000字符: ${pageContent.substring(0, 1000)}`);
          }
          
          // 检查是否有特定的Cloudflare挑战页面
          const hasChallenge = pageContent.includes('cf-browser-verification') ||
                               pageContent.includes('cf-im-under-attack') ||
                               pageContent.includes('Just a moment') ||
                               pageContent.includes('DDoS protection');
          
          if (hasChallenge) {
            logger.debug(`waitForCloudflareChallenge: 仍在Cloudflare挑战页面`);
          }
          
          // 检查是否有年龄认证页面
          const hasAgeVerification = pageContent.includes('Age Verification') ||
                                     pageContent.includes('年龄认证') ||
                                     pageContent.includes('age verification');
          
          if (hasAgeVerification) {
            logger.debug(`waitForCloudflareChallenge: 检测到年龄认证页面`);
          }
          
          // 检查是否有错误页面
          const hasError = pageContent.includes('cf-error-details') ||
                           pageContent.includes('Cloudflare Ray ID') ||
                           pageContent.includes('error code:');
          
          if (hasError) {
            logger.debug(`waitForCloudflareChallenge: 检测到Cloudflare错误页面`);
          }
        }
      } catch (pageInfoError) {
        logger.debug(`waitForCloudflareChallenge: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
      }
    }
  }

  /**
   * 处理年龄认证页面
   */
  private async handleAgeVerification(): Promise<void> {
    if (!this.page) return;

    try {
      logger.info('开始处理年龄认证页面');

      // 尝试查找并点击年龄认证按钮
      const ageButtonClicked = await this.page.evaluate(() => {
        // 查找可能的年龄认证按钮
        const possibleSelectors = [
          'button[type="submit"]',
          'button:contains("Enter")',
          'button:contains("进入")',
          'button:contains("I am over 18")',
          'button:contains("我已满18岁")',
          'button:contains("Yes")',
          'button:contains("是")',
          'input[type="submit"]',
          'a:contains("Enter")',
          'a:contains("进入")',
          'a:contains("I am over 18")',
          'a:contains("我已满18岁")',
          'a:contains("Yes")',
          'a:contains("是")',
          '.btn-primary',
          '.btn-success',
          '.age-verify-btn',
          '.enter-btn',
          '.verification-btn',
          '#enter',
          '#age-verify',
          '#confirm-age',
          '#age-verification'
        ];

        // 尝试通过文本内容查找按钮
        const allButtons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
        for (const button of allButtons) {
          const text = button.textContent?.toLowerCase() || '';
          if (text.includes('enter') || text.includes('进入') || 
              text.includes('18') || text.includes('yes') || text.includes('是') ||
              text.includes('confirm') || text.includes('确认')) {
            (button as HTMLElement).click();
            return true;
          }
        }

        // 尝试通过选择器查找按钮
        for (const selector of possibleSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              (element as HTMLElement).click();
              return true;
            }
          } catch (e) {
            // 忽略无效选择器
          }
        }

        return false;
      });

      if (ageButtonClicked) {
        logger.info('已点击年龄认证按钮');
        // 等待页面跳转或更新
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查是否还在年龄认证页面
        const stillOnAgeVerification = await this.page.evaluate(() => {
          const ageVerificationIndicators = [
            'Age Verification',
            '年龄认证',
            'age verification',
            '18+',
            'adult content',
            'adult only'
          ];

          return ageVerificationIndicators.some(indicator =>
            document.title.includes(indicator) ||
            document.body.innerText.toLowerCase().includes(indicator.toLowerCase())
          );
        });

        if (stillOnAgeVerification) {
          logger.warn('点击按钮后仍在年龄认证页面，尝试其他方法');
          
          // 尝试设置年龄认证Cookie
          await this.page.evaluate(() => {
            // 尝试设置常见的年龄认证Cookie
            document.cookie = 'age_verified=true; path=/; max-age=31536000';
            document.cookie = 'adult_verified=true; path=/; max-age=31536000';
            document.cookie = 'age_verification=1; path=/; max-age=31536000';
            document.cookie = 'is_adult=true; path=/; max-age=31536000';
            document.cookie = 'javbus_age=1; path=/; max-age=31536000';
          });
          
          // 刷新页面
          await this.page.reload({ waitUntil: 'networkidle2' });
          logger.info('已设置年龄认证Cookie并刷新页面');
        }
      } else {
        logger.warn('未找到年龄认证按钮，尝试设置Cookie');
        
        // 尝试设置年龄认证Cookie
        await this.page.evaluate(() => {
          document.cookie = 'age_verified=true; path=/; max-age=31536000';
          document.cookie = 'adult_verified=true; path=/; max-age=31536000';
          document.cookie = 'age_verification=1; path=/; max-age=31536000';
          document.cookie = 'is_adult=true; path=/; max-age=31536000';
          document.cookie = 'javbus_age=1; path=/; max-age=31536000';
        });
        
        // 刷新页面
        await this.page.reload({ waitUntil: 'networkidle2' });
        logger.info('已设置年龄认证Cookie并刷新页面');
      }

      // 再次检查是否还在年龄认证页面
      const stillOnAgeVerification = await this.page.evaluate(() => {
        const ageVerificationIndicators = [
          'Age Verification',
          '年龄认证',
          'age verification',
          '18+',
          'adult content',
          'adult only'
        ];

        return ageVerificationIndicators.some(indicator =>
          document.title.includes(indicator) ||
          document.body.innerText.toLowerCase().includes(indicator.toLowerCase())
        );
      });

      if (stillOnAgeVerification) {
        logger.error('年龄认证处理失败，仍在认证页面');
        throw new Error('无法绕过年龄认证');
      } else {
        logger.info('年龄认证处理成功');
      }
    } catch (error) {
      logger.error(`处理年龄认证失败: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
      logger.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
      
      // 记录完整的错误信息
      logger.debug(`handleAgeVerification: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
      
      // 尝试获取当前页面信息
      try {
        if (this.page) {
          const pageUrl = this.page.url();
          const pageTitle = await this.page.title();
          const pageContent = await this.page.content();
          
          logger.debug(`handleAgeVerification: 当前页面URL: ${pageUrl}`);
          logger.debug(`handleAgeVerification: 当前页面标题: ${pageTitle}`);
          logger.debug(`handleAgeVerification: 页面内容长度: ${pageContent.length}`);
          
          // 记录页面内容的前1000个字符
          if (pageContent.length > 0) {
            logger.debug(`handleAgeVerification: 页面内容前1000字符: ${pageContent.substring(0, 1000)}`);
          }
          
          // 获取当前Cookie状态
          const currentCookies = await this.page.cookies();
          logger.debug(`handleAgeVerification: 当前Cookie数量: ${currentCookies.length}`);
          logger.debug(`handleAgeVerification: 当前Cookie列表: ${JSON.stringify(currentCookies, null, 2)}`);
        }
      } catch (pageInfoError) {
        logger.debug(`handleAgeVerification: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
      }
      
      throw error;
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
      logger.error(`错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
      logger.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
      
      // 记录完整的错误信息
      logger.debug(`saveCookies: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
      
      // 记录文件路径信息
      try {
        const cookiesFile = path.join(process.cwd(), filename);
        logger.debug(`saveCookies: 尝试保存到文件路径: ${cookiesFile}`);
        logger.debug(`saveCookies: 当前工作目录: ${process.cwd()}`);
        logger.debug(`saveCookies: 文件名: ${filename}`);
        
        // 检查目录是否存在
        const dirExists = fs.existsSync(path.dirname(cookiesFile));
        logger.debug(`saveCookies: 目录是否存在: ${dirExists}`);
        
        // 尝试获取Cookie信息
        if (this.page) {
          const cookies = await this.page.cookies();
          logger.debug(`saveCookies: Cookie数量: ${cookies.length}`);
          logger.debug(`saveCookies: Cookie内容: ${JSON.stringify(cookies, null, 2)}`);
        }
      } catch (debugError) {
        logger.debug(`saveCookies: 获取调试信息失败: ${debugError instanceof Error ? debugError.message : String(debugError)}`);
      }
      
      throw error;
    }
  }

    /**
     * 设置年龄认证相关Cookie
     */
    async setAgeVerificationCookies(): Promise<void> {
        try {
            // 设置年龄认证相关的Cookie
            const cookies = [
                {
                    name: 'age_verified',
                    value: '1',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                },
                {
                    name: 'adult_verified',
                    value: '1',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                },
                {
                    name: 'age_verification_passed',
                    value: 'true',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                },
                {
                    name: 'is_adult',
                    value: '1',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                },
                {
                    name: 'verified_adult',
                    value: 'true',
                    domain: '.javbus.com',
                    path: '/',
                    expires: (new Date().getTime() / 1000) + (365 * 24 * 60 * 60) // 1年过期
                }
            ];

            // 检查页面是否存在
            if (!this.page) {
                logger.warn('setAgeVerificationCookies: page 为 null，跳过 Cookie 设置');
                return;
            }

            // 设置Cookie
            for (const cookie of cookies) {
                await this.page.setCookie(cookie);
            }

            logger.info('已设置年龄认证相关Cookie');
        } catch (error) {
            logger.error(`设置年龄认证Cookie失败: ${error instanceof Error ? error.message : String(error)}`);
            logger.error(`错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            logger.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            
            // 记录完整的错误信息
            logger.debug(`setAgeVerificationCookies: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            
            // 尝试获取当前页面信息
            try {
                if (this.page) {
                    const pageUrl = this.page.url();
                    const pageTitle = await this.page.title();
                    
                    logger.debug(`setAgeVerificationCookies: 当前页面URL: ${pageUrl}`);
                    logger.debug(`setAgeVerificationCookies: 当前页面标题: ${pageTitle}`);
                    
                    // 获取当前Cookie状态
                    const currentCookies = await this.page.cookies();
                    logger.debug(`setAgeVerificationCookies: 当前Cookie数量: ${currentCookies.length}`);
                    logger.debug(`setAgeVerificationCookies: 当前Cookie列表: ${JSON.stringify(currentCookies, null, 2)}`);
                }
            } catch (pageInfoError) {
                logger.debug(`setAgeVerificationCookies: 获取页面信息失败: ${pageInfoError instanceof Error ? pageInfoError.message : String(pageInfoError)}`);
            }
        }
    }

    /**
     * 关闭浏览器
     */
    async close(): Promise<void> {
        try {
            if (this.browser) {
                logger.debug(`close: 准备关闭浏览器，当前状态: isConnected=${this.browser.isConnected()}`);
                
                // 尝试获取浏览器进程信息
                try {
                    if (this.browser.process()) {
                        logger.debug(`close: 浏览器进程PID: ${this.browser.process().pid}`);
                    }
                } catch (processError) {
                    logger.debug(`close: 获取浏览器进程信息失败: ${processError instanceof Error ? processError.message : String(processError)}`);
                }
                
                await this.browser.close();
                this.browser = null;
                this.page = null;
                logger.info('浏览器已关闭');
            } else {
                logger.debug('close: 浏览器未初始化，无需关闭');
            }
        } catch (error) {
            logger.error(`关闭浏览器失败: ${error instanceof Error ? error.message : String(error)}`);
            logger.error(`错误类型: ${error instanceof Error ? error.constructor.name : 'Unknown'}`);
            logger.error(`错误堆栈: ${error instanceof Error ? error.stack : '无堆栈信息'}`);
            
            // 记录完整的错误信息
            logger.debug(`close: 完整错误对象: ${JSON.stringify(error, null, 2)}`);
            
            // 强制清理引用
            this.browser = null;
            this.page = null;
            
            throw error;
        }
    }
}

export default CloudflareBypass;