/**
 * @file constants.ts
 * @description 共享常量配置模块
 * @module core/constants
 * @exports BASE_URL
 * @exports DEFAULT_HEADERS
 * @exports DEFAULT_CONFIG
 * @exports USER_AGENTS
 */

// 基础URL配置
export const BASE_URL = 'https://www.javbus.com/';

// 默认请求头配置
export const DEFAULT_HEADERS = {
  Referer: BASE_URL,
  Cookie: 'existmag=mag'
};

// 默认配置
export const DEFAULT_CONFIG = {
  retryCount: 3,
  retryDelay: 1000,
  parallel: 2,
  timeout: 30000,
  searchUrl: '/search',
  minDelay: 5, // 最小延迟秒数
  maxDelay: 15 // 最大延迟秒数
};

// 常见浏览器User-Agent列表（定期更新）
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

/**
 * 生成随机延迟时间（毫秒）
 * @param minSeconds 最小秒数
 * @param maxSeconds 最大秒数
 * @returns 延迟毫秒数
 */
export function getRandomDelay(minSeconds: number = 5, maxSeconds: number = 15): number {
  const randomSeconds = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  return Math.floor(randomSeconds * 1000);
}

/**
 * 生成随机指数退避延迟
 * @param baseDelay 基础延迟时间（毫秒）
 * @param attempt 尝试次数
 * @param maxDelay 最大延迟时间（毫秒）
 * @returns 延迟毫秒数
 */
export function getExponentialBackoffDelay(baseDelay: number, attempt: number, maxDelay: number = 30000): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // 添加随机抖动
  return Math.min(exponentialDelay + jitter, maxDelay);
}

// 默认请求头配置
export const DEFAULT_REQUEST_HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
  'accept-encoding': 'gzip, deflate, br',
  'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'max-age=0',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'Connection': 'keep-alive'
};