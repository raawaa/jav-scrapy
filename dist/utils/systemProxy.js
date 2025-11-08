"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemProxy = getSystemProxy;
exports.parseProxyServer = parseProxyServer;
const child_process_1 = require("child_process");
const util_1 = require("util");
const winreg_1 = __importDefault(require("winreg"));
const url_1 = require("url");
const os = __importStar(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function getSystemProxy() {
    const platform = os.platform();
    if (platform === 'darwin') {
        // macOS系统代理检测
        return await getMacOSProxy();
    }
    else if (platform === 'win32') {
        // Windows系统代理检测
        return await getWindowsProxy();
    }
    else {
        // Linux或其他系统，暂时返回未启用
        return { enabled: false };
    }
}
async function getMacOSProxy() {
    try {
        const { stdout } = await execAsync('scutil --proxy');
        const lines = stdout.split('\n');
        const proxyConfig = {
            enabled: false
        };
        let httpEnable = false;
        let httpsEnable = false;
        let httpServer = '';
        let httpsServer = '';
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('HTTPEnable')) {
                httpEnable = trimmedLine.includes('1');
            }
            else if (trimmedLine.startsWith('HTTPSEnable')) {
                httpsEnable = trimmedLine.includes('1');
            }
            else if (trimmedLine.startsWith('HTTPProxy')) {
                const match = trimmedLine.match(/HTTPProxy : (.+)/);
                if (match) {
                    httpServer = match[1].trim();
                }
            }
            else if (trimmedLine.startsWith('HTTPSProxy')) {
                const match = trimmedLine.match(/HTTPSProxy : (.+)/);
                if (match) {
                    httpsServer = match[1].trim();
                }
            }
            else if (trimmedLine.startsWith('ProxyAutoConfigURLString')) {
                const match = trimmedLine.match(/ProxyAutoConfigURLString : (.+)/);
                if (match) {
                    proxyConfig.pacUrl = match[1].trim();
                }
            }
        }
        // 如果HTTP或HTTPS代理启用，则认为代理已启用
        proxyConfig.enabled = httpEnable || httpsEnable;
        // 优先使用HTTPS代理，如果没有则使用HTTP代理
        if (httpsEnable && httpsServer) {
            proxyConfig.server = httpsServer;
        }
        else if (httpEnable && httpServer) {
            proxyConfig.server = httpServer;
        }
        return proxyConfig;
    }
    catch (error) {
        console.warn('读取macOS系统代理设置失败:', error instanceof Error ? error.message : String(error));
        return { enabled: false };
    }
}
async function getWindowsProxy() {
    return new Promise((resolve) => {
        const regKey = new winreg_1.default({
            hive: winreg_1.default.HKCU,
            key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
        });
        const results = {};
        regKey.values((err, items) => {
            if (err) {
                console.warn('读取Windows系统代理设置失败:', err.message);
                resolve({ enabled: false });
                return;
            }
            items.forEach((item) => {
                results[item.name] = item.value;
            });
            resolve({
                enabled: results['ProxyEnable'] === '1' || results['ProxyEnable'] === '0x1',
                server: results['ProxyServer'],
                override: results['ProxyOverride'],
                pacUrl: results['AutoConfigURL']
            });
        });
    });
}
function parseProxyServer(server) {
    if (!server)
        return undefined;
    // 处理V2rayN默认格式 "127.0.0.1:10809"
    if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(server)) {
        return `http://${server}`;
    }
    // 处理已有协议的情况
    try {
        new url_1.URL(server);
        return server;
    }
    catch {
        console.warn('代理地址格式无效:', server);
        return undefined;
    }
}
//# sourceMappingURL=systemProxy.js.map