"use strict";
/**
 * @file constants.ts
 * @description 共享常量配置模块
 * @module core/constants
 * @exports BASE_URL
 * @exports DEFAULT_HEADERS
 * @exports DEFAULT_CONFIG
 * @exports USER_AGENTS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_AGENTS = exports.DEFAULT_CONFIG = exports.DEFAULT_HEADERS = exports.BASE_URL = void 0;
exports.getRandomDelay = getRandomDelay;
exports.getExponentialBackoffDelay = getExponentialBackoffDelay;
// 基础URL配置
exports.BASE_URL = 'https://www.javbus.com/';
// 默认请求头配置
exports.DEFAULT_HEADERS = {
    Referer: exports.BASE_URL,
    Cookie: 'existmag=mag'
};
// 默认配置
exports.DEFAULT_CONFIG = {
    retryCount: 3,
    retryDelay: 1000,
    parallel: 2,
    timeout: 30000,
    searchUrl: '/search',
    minDelay: 5, // 最小延迟秒数
    maxDelay: 15, // 最大延迟秒数
    strictSSL: true // 默认严格验证SSL证书
};
// 常见浏览器User-Agent列表（定期更新）
exports.USER_AGENTS = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    // Edge Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0',
    // Firefox Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
    // Chrome macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    // Safari macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Safari/605.1.15',
    // Firefox macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0',
    // Chrome Linux
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
];
/**
 * 生成随机延迟时间（毫秒）
 * @param minSeconds 最小秒数
 * @param maxSeconds 最大秒数
 * @returns 延迟毫秒数
 */
function getRandomDelay(minSeconds = 5, maxSeconds = 15) {
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
function getExponentialBackoffDelay(baseDelay, attempt, maxDelay = 30000) {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // 添加随机抖动
    return Math.min(exponentialDelay + jitter, maxDelay);
}
//# sourceMappingURL=constants.js.map