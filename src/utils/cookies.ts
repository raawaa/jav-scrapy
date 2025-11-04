/**
 * 浏览器 Cookies 读取工具
 * 用于从 Chromium 系浏览器中提取网站的 Cookies
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import logger from '../core/logger';

interface BrowserProfile {
  profile: string;
  site: string;
  cookies: Record<string, string>;
}

class CookiesManager {
  private static instance: CookiesManager;
  private cookiesCache: BrowserProfile[] = [];

  private constructor() {}

  public static getInstance(): CookiesManager {
    if (!CookiesManager.instance) {
      CookiesManager.instance = new CookiesManager();
    }
    return CookiesManager.instance;
  }

  /**
   * 获取系统上的所有 Chromium 系浏览器的 Cookies
   */
  public async getBrowserCookies(hostPattern: string = 'javbus%.com'): Promise<BrowserProfile[]> {
    if (this.cookiesCache.length > 0) {
      return this.cookiesCache;
    }

    const platform = os.platform();
    let userDirs: Record<string, string> = {};

    if (platform === 'win32') {
      userDirs = {
        'Chrome': path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data'),
        'Chrome Beta': path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome Beta/User Data'),
        'Chrome Canary': path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome SxS/User Data'),
        'Chromium': path.join(process.env.LOCALAPPDATA || '', 'Google/Chromium/User Data'),
        'Edge': path.join(process.env.LOCALAPPDATA || '', 'Microsoft/Edge/User Data'),
        'Vivaldi': path.join(process.env.LOCALAPPDATA || '', 'Vivaldi/User Data')
      };
    } else if (platform === 'darwin') {
      const homeDir = os.homedir();
      userDirs = {
        'Chrome': path.join(homeDir, 'Library/Application Support/Google/Chrome'),
        'Chrome Beta': path.join(homeDir, 'Library/Application Support/Google/Chrome Beta'),
        'Chrome Canary': path.join(homeDir, 'Library/Application Support/Google/Chrome Canary'),
        'Chromium': path.join(homeDir, 'Library/Application Support/Chromium'),
        'Edge': path.join(homeDir, 'Library/Application Support/Microsoft Edge'),
        'Vivaldi': path.join(homeDir, 'Library/Application Support/Vivaldi')
      };
    } else {
      // Linux
      const homeDir = os.homedir();
      userDirs = {
        'Chrome': path.join(homeDir, '.config/google-chrome'),
        'Chrome Beta': path.join(homeDir, '.config/google-chrome-beta'),
        'Chrome Canary': path.join(homeDir, '.config/google-chrome-canary'),
        'Chromium': path.join(homeDir, '.config/chromium'),
        'Edge': path.join(homeDir, '.config/microsoft-edge'),
        'Vivaldi': path.join(homeDir, '.config/vivaldi')
      };
    }

    for (const [browser, userDir] of Object.entries(userDirs)) {
      if (!fs.existsSync(userDir)) {
        continue;
      }

      const localStatePath = path.join(userDir, 'Local State');
      if (!fs.existsSync(localStatePath)) {
        continue;
      }

      try {
        const key = await this.decryptKey(localStatePath);
        const cookiesFiles = [
          ...this.globSync(path.join(userDir, '*/Cookies')),
          ...this.globSync(path.join(userDir, '*/Network/Cookies'))
        ];
        
        logger.debug(`浏览器 ${browser} 的用户目录: ${userDir}`);
        logger.debug(`找到的Cookies文件: ${cookiesFiles.join(', ')}`);

        for (const cookiesFile of cookiesFiles) {
          try {
            const profile = `${browser}: ${path.relative(userDir, path.dirname(cookiesFile))}`;
            const cookies = await this.getCookies(cookiesFile, key, hostPattern);
            
            if (Object.keys(cookies).length > 0) {
              const hostname = Object.keys(cookies)[0];
              this.cookiesCache.push({
                profile,
                site: hostname,
                cookies: cookies[hostname]
              });
              logger.info(`成功获取到 ${hostname} 的cookies，共 ${Object.keys(cookies[hostname]).length} 个`);
            }
          } catch (error) {
            logger.warn(`无法解析 Cookies 文件 ${cookiesFile}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error) {
        logger.debug(`处理浏览器 ${browser} 时出错: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return this.cookiesCache;
  }

  /**
   * 从 Local State 文件中提取并解密出 Cookies 文件的密钥
   */
  private async decryptKey(localStatePath: string): Promise<Buffer> {
    try {
      const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf-8'));
      
      if (!localState.os_crypt || !localState.os_crypt.encrypted_key) {
        logger.debug('未找到加密密钥，将尝试读取未加密的cookies');
        return Buffer.alloc(0);
      }
      
      const encryptedKey = Buffer.from(localState.os_crypt.encrypted_key, 'base64');
      
      if (os.platform() === 'win32') {
        // Windows 使用 DPAPI
        logger.warn('Windows 平台的 Cookies 解密功能有限');
        return Buffer.alloc(0);
      } else if (os.platform() === 'darwin') {
        // macOS 使用 Keychain
        // 对于未加密的cookies，我们可以直接读取
        if (encryptedKey.length > 5 && encryptedKey.slice(0, 5).toString() === 'v10') {
          // 这是v10格式的密钥，需要解密
          const key = encryptedKey.slice(5);
          return key;
        } else {
          logger.debug('使用未加密的cookies读取模式');
          return Buffer.alloc(0);
        }
      } else {
        // Linux
        const key = encryptedKey.slice(5); // 移除 'DPAPI' 前缀
        return key;
      }
    } catch (error) {
      logger.warn(`读取Local State文件失败，使用未加密模式: ${error instanceof Error ? error.message : String(error)}`);
      return Buffer.alloc(0);
    }
  }

  /**
   * 从 cookies 文件中查找指定站点的所有 Cookies
   */
  private async getCookies(cookiesFile: string, key: Buffer, hostPattern: string): Promise<Record<string, Record<string, string>>> {
    const tempDir = os.tmpdir();
    const tempCookie = path.join(tempDir, `cookies_${Date.now()}`);
    
    // 复制 Cookies 文件到临时目录
    fs.copyFileSync(cookiesFile, tempCookie);

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(tempCookie);
      const sql = `SELECT host_key, name, encrypted_value, value FROM cookies WHERE host_key LIKE ? OR host_key LIKE ?`;
      
      db.all(sql, [hostPattern, `%.${hostPattern.replace('%', '')}`], (err, rows: any[]) => {
        if (err) {
          db.close();
          fs.unlinkSync(tempCookie);
          return reject(err);
        }
        if (err) {
          db.close();
          fs.unlinkSync(tempCookie);
          return reject(err);
        }

        const records: Record<string, Record<string, string>> = {};
        
        for (const row of rows) {
          const hostKey = row.host_key;
          if (!records[hostKey]) {
            records[hostKey] = {};
          }
          
          try {
            let decryptedValue = '';
            
            // 首先尝试使用未加密的value字段
            if (row.value && row.value.length > 0) {
              decryptedValue = row.value;
            } else if (row.encrypted_value && row.encrypted_value.length > 0) {
              // 如果有加密值，尝试解密
              if (key.length === 0) {
                // 没有密钥，可能是未加密的cookies
                decryptedValue = row.encrypted_value.toString('utf8').replace(/\0/g, '');
              } else {
                // 有密钥，尝试解密
                try {
                  decryptedValue = this.decryptCookieValue(row.encrypted_value, key);
                } catch (decryptError) {
                  logger.debug(`解密 Cookie ${row.name} 失败，尝试使用原始值: ${decryptError instanceof Error ? decryptError.message : String(decryptError)}`);
                  decryptedValue = row.encrypted_value.toString('utf8').replace(/\0/g, '');
                }
              }
            }
            
            // 验证解密后的cookie值是否有效
            if (decryptedValue && this.isValidCookieValue(decryptedValue)) {
              records[hostKey][row.name] = decryptedValue;
            } else if (decryptedValue) {
              logger.debug(`跳过无效的 Cookie ${row.name}: 值包含非可打印字符`);
            }
          } catch (error) {
            logger.debug(`处理 Cookie ${row.name} 时出错: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        db.close();
        try {
          fs.unlinkSync(tempCookie);
        } catch (unlinkError) {
          logger.debug(`删除临时文件失败: ${unlinkError instanceof Error ? unlinkError.message : String(unlinkError)}`);
        }
        resolve(records);
      });
    });
  }

  /**
   * 验证Cookie值是否有效（严格多层验证）
   */
  private isValidCookieValue(value: string): boolean {
    // 基本检查
    if (!value || typeof value !== 'string') {
      return false;
    }

    // 长度检查
    if (value.length === 0 || value.length > 4096) {
      return false;
    }

    // 严格检查控制字符（包括所有ASCII控制字符）
    // 排除：ASCII 0-31, 127, 以及所有Unicode控制字符
    if (/[\x00-\x1F\x7F\u0000-\u001F\u007F-\u009F]/.test(value)) {
      return false;
    }

    // 检查是否包含二进制数据或加密后的内容
    if (/[\x80-\xFF]/.test(value) && !/^[\x80-\xFF]*[\x20-\x7E]+$/.test(value)) {
      return false;
    }

    // Cookie有效字符模式（符合RFC标准）
    return /^[a-zA-Z0-9._~!$&'()*+,;=:@% \-]+$/.test(value);
  }

  /**
   * 解密单个Cookie值 - 改进版本
   */
  private decryptCookieValue(encryptedValue: any, key: Buffer): string {
    try {
      // 检查是否是Buffer对象
      if (!Buffer.isBuffer(encryptedValue)) {
        // 如果不是Buffer，可能是字符串，直接验证返回
        const value = String(encryptedValue);
        return this.isValidCookieValue(value) ? value : '';
      }

      // 检查加密值长度
      if (encryptedValue.length === 0) {
        return '';
      }

      // 首先尝试作为未加密字符串处理（向后兼容）
      const asString = encryptedValue.toString('utf8').replace(/\0/g, '');
      if (this.isValidCookieValue(asString) && asString.length > 0) {
        return asString;
      }

      // 检查是否是v10格式的加密cookie（Chrome 80+）
      if (encryptedValue.length > 3 && encryptedValue[0] === 0x76 && encryptedValue[1] === 0x31 && encryptedValue[2] === 0x30) {
        const encryptedData = encryptedValue.slice(3); // 移除'v10'前缀

        // 针对macOS Chrome的改进解密
        if (os.platform() === 'darwin') {
          return this.decryptMacOSCookie(encryptedData);
        }
      }

      // 尝试其他格式
      const fallbackValue = encryptedValue.toString('utf8').replace(/\0/g, '').trim();
      return this.isValidCookieValue(fallbackValue) ? fallbackValue : '';

    } catch (error) {
      logger.debug(`Cookie解密失败: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  /**
   * 解密macOS Chrome Cookie
   */
  private decryptMacOSCookie(encryptedData: Buffer): string {
    try {
      const crypto = require('crypto');

      // 改进的解密参数（更兼容新版本Chrome）
      const password = 'peanuts';
      const salt = Buffer.from('saltysalt', 'utf8');
      const iterations = 1003; // Chrome标准迭代次数
      const keyLen = 16;

      // 生成密钥（使用正确的PBKDF2参数）
      const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keyLen, 'sha1');
      const iv = Buffer.alloc(16, 0); // Chrome使用零IV

      // 尝试不同的解密方式
      try {
        // 方法1: 标准AES-128-CBC
        const decipher1 = crypto.createDecipheriv('aes-128-cbc', derivedKey, iv);
        let decrypted1 = decipher1.update(encryptedData);
        decrypted1 = Buffer.concat([decrypted1, decipher1.final()]);

        const result1 = decrypted1.toString('utf8').replace(/[\x00-\x1F\x7F]/g, '').trim();
        if (this.isValidCookieValue(result1) && result1.length > 0) {
          return result1;
        }
      } catch (e1) {
        // 继续尝试下一种方法
      }

      try {
        // 方法2: 尝试无填充模式（某些Chrome版本使用）
        const decipher2 = crypto.createDecipheriv('aes-128-cbc', derivedKey, iv);
        decipher2.setAutoPadding(false);
        let decrypted2 = decipher2.update(encryptedData);
        decrypted2 = Buffer.concat([decrypted2, decipher2.final()]);

        const result2 = decrypted2.toString('utf8').replace(/[\x00-\x1F\x7F]/g, '').trim();
        if (this.isValidCookieValue(result2) && result2.length > 0) {
          return result2;
        }
      } catch (e2) {
        // 继续尝试下一种方法
      }

      // 如果所有解密方法都失败，返回空字符串
      logger.debug('所有macOS Cookie解密方法都失败');
      return '';

    } catch (error) {
      logger.debug(`macOS Cookie解密错误: ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }

  /**
   * 简单的 glob 实现
   */
  private globSync(pattern: string): string[] {
    const files: string[] = [];
    
    // 处理通配符模式
    if (pattern.includes('*')) {
      const parts = pattern.split('*');
      const baseDir = parts[0];
      
      if (!fs.existsSync(baseDir)) {
        return files;
      }
      
      try {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        const remainingPattern = parts.slice(1).join('*');
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subPath = path.join(baseDir, entry.name);
            if (remainingPattern) {
              const newPattern = path.join(subPath, remainingPattern);
              files.push(...this.globSync(newPattern));
            } else {
              // 如果没有剩余模式，查找该目录下的Cookies文件
              const cookiesFile = path.join(subPath, 'Cookies');
              if (fs.existsSync(cookiesFile)) {
                files.push(cookiesFile);
              }
            }
          }
        }
      } catch (error) {
        logger.warn(`读取目录 ${baseDir} 失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // 处理无通配符的普通路径
      if (fs.existsSync(pattern)) {
        files.push(pattern);
      }
    }

    return files;
  }

  /**
   * 获取有效的 Cookies
   */
  public async getValidCookies(site: string): Promise<Record<string, string> | null> {
    const allCookies = await this.getBrowserCookies();
    
    for (const cookieProfile of allCookies) {
      if (cookieProfile.site.includes(site)) {
        // 简单验证 Cookie 是否有效
        if (Object.keys(cookieProfile.cookies).length > 0) {
          return cookieProfile.cookies;
        }
      }
    }
    
    return null;
  }
}

export default CookiesManager;