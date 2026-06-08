import https from 'https';
import fs from 'fs';
import path from 'path';
import { APP_DATA_DIR } from './paths';

const CACHE_FILE = path.join(APP_DATA_DIR, 'version-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface VersionCache {
  latestVersion: string;
  checkedAt: number;
}

export function fetchLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const req = https.get(
      'https://api.github.com/repos/raawaa/jav-scrapy/releases/latest',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'jav-scrapy',
        },
        timeout: 5000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const tag = parsed.tag_name as string | undefined;
            resolve(tag ? tag.replace(/^v/, '') : null);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

function readCache(): VersionCache | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return null;
}

function writeCache(version: string): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify({ latestVersion: version, checkedAt: Date.now() }),
    );
  } catch {
    // ignore
  }
}

/**
 * 检查是否有新版本可用。
 * 通过 GitHub API 查询最新 Release 版本号，
 * 结果缓存 24 小时以规避 GitHub API 限流。
 * 请求失败时静默忽略，不阻塞启动。
 */
export async function checkLatestVersion(currentVersion: string): Promise<string | null> {
  const cache = readCache();
  if (cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
    if (cache.latestVersion && cache.latestVersion !== currentVersion) {
      return cache.latestVersion;
    }
    return null;
  }

  const latest = await fetchLatestVersion();
  if (!latest) return null;

  writeCache(latest);
  return latest === currentVersion ? null : latest;
}

/**
 * 判断是否应跳过版本检查。
 */
export function isOfflineMode(): boolean {
  return (
    process.env.JAV_OFFLINE === 'true' ||
    process.env.JAV_OFFLINE === '1' ||
    process.argv.includes('--offline')
  );
}

/**
 * 判断当前命令是否是辅助命令（logs/refresh/upgrade）。
 * 这些命令不需要版本检查。
 */
export function isAuxiliaryCommand(): boolean {
  const cmd = process.argv[2];
  if (!cmd || cmd.startsWith('-')) return false;
  return ['logs', 'refresh', 'upgrade'].includes(cmd);
}

/**
 * 判断当前是否是查看帮助或版本信息。
 */
export function isHelpOrVersion(): boolean {
  const helpFlags = ['--help', '-h'];
  const versionFlags = ['--version', '-V'];
  return helpFlags.some(f => process.argv.includes(f)) ||
    versionFlags.some(f => process.argv.includes(f));
}
