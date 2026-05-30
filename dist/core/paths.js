"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOG_DIR = exports.APP_DATA_DIR = void 0;
exports.getLogDir = getLogDir;
exports.getMainLogPath = getMainLogPath;
exports.getErrorLogPath = getErrorLogPath;
exports.getAntiBlockUrlsPath = getAntiBlockUrlsPath;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
/**
 * 获取应用数据目录（跨平台兼容）
 * 所有持久化数据（配置、缓存、日志等）统一放在此目录下。
 */
function getAppDataDir() {
    const home = os_1.default.homedir();
    switch (process.platform) {
        case 'win32':
            return path_1.default.join(process.env.LOCALAPPDATA || process.env.USERPROFILE || home, 'jav-scrapy');
        case 'darwin':
            return path_1.default.join(home, '.jav-scrapy');
        default:
            const xdgData = process.env.XDG_DATA_HOME || path_1.default.join(home, '.local', 'share');
            return path_1.default.join(xdgData, 'jav-scrapy');
    }
}
exports.APP_DATA_DIR = getAppDataDir();
// 日志目录（创建失败时回退到 tmp）
let resolvedLogDir = path_1.default.join(exports.APP_DATA_DIR, 'logs');
try {
    fs_1.default.mkdirSync(resolvedLogDir, { recursive: true });
}
catch {
    resolvedLogDir = path_1.default.join(os_1.default.tmpdir(), 'jav-scrapy-logs');
    fs_1.default.mkdirSync(resolvedLogDir, { recursive: true });
}
exports.LOG_DIR = resolvedLogDir;
function getLogDir() {
    return exports.LOG_DIR;
}
function getMainLogPath() {
    return path_1.default.join(exports.LOG_DIR, 'jav-scrapy.log');
}
function getErrorLogPath() {
    return path_1.default.join(exports.LOG_DIR, 'error.log');
}
/**
 * 防屏蔽地址文件路径
 * 兼容旧位置 ~/.jav-scrapy-antiblock-urls.json，迁移到新位置 ~/.jav-scrapy/antiblock-urls.json
 */
function getAntiBlockUrlsPath() {
    const newPath = path_1.default.join(exports.APP_DATA_DIR, 'antiblock-urls.json');
    const oldPath = path_1.default.join(os_1.default.homedir(), '.jav-scrapy-antiblock-urls.json');
    // 旧位置存在且新位置不存在时，自动迁移
    if (fs_1.default.existsSync(oldPath) && !fs_1.default.existsSync(newPath)) {
        try {
            fs_1.default.mkdirSync(exports.APP_DATA_DIR, { recursive: true });
            fs_1.default.copyFileSync(oldPath, newPath);
            fs_1.default.unlinkSync(oldPath);
        }
        catch {
            return oldPath;
        }
    }
    return newPath;
}
//# sourceMappingURL=paths.js.map