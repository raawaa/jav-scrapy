import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * 获取应用数据目录（跨平台兼容）
 * 所有持久化数据（配置、缓存、日志等）统一放在此目录下。
 */
function getAppDataDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE || home, 'jav-scrapy');
    case 'darwin':
      return path.join(home, '.jav-scrapy');
    default:
      const xdgData = process.env.XDG_DATA_HOME || path.join(home, '.local', 'share');
      return path.join(xdgData, 'jav-scrapy');
  }
}

export const APP_DATA_DIR = getAppDataDir();

// 日志目录（创建失败时回退到 tmp）
let resolvedLogDir = path.join(APP_DATA_DIR, 'logs');
try {
  fs.mkdirSync(resolvedLogDir, { recursive: true });
} catch {
  resolvedLogDir = path.join(os.tmpdir(), 'jav-scrapy-logs');
  fs.mkdirSync(resolvedLogDir, { recursive: true });
}
export const LOG_DIR = resolvedLogDir;

export function getLogDir(): string {
  return LOG_DIR;
}

export function getMainLogPath(): string {
  return path.join(LOG_DIR, 'jav-scrapy.log');
}

export function getErrorLogPath(): string {
  return path.join(LOG_DIR, 'error.log');
}

/**
 * 防屏蔽地址文件路径
 * 兼容旧位置 ~/.jav-scrapy-antiblock-urls.json，迁移到新位置 ~/.jav-scrapy/antiblock-urls.json
 */
export function getAntiBlockUrlsPath(): string {
  const newPath = path.join(APP_DATA_DIR, 'antiblock-urls.json');
  const oldPath = path.join(os.homedir(), '.jav-scrapy-antiblock-urls.json');

  // 旧位置存在且新位置不存在时，自动迁移
  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    try {
      fs.mkdirSync(APP_DATA_DIR, { recursive: true });
      fs.copyFileSync(oldPath, newPath);
      fs.unlinkSync(oldPath);
    } catch {
      return oldPath;
    }
  }

  return newPath;
}
