import { exec } from 'child_process';
import { promisify } from 'util';
import winreg from 'winreg';
import { URL } from 'url';
import * as os from 'os';

const execAsync = promisify(exec);

interface SystemProxyConfig {
    enabled: boolean;
    server?: string;
    override?: string;
    pacUrl?: string;
}

export async function getSystemProxy(): Promise<SystemProxyConfig> {
    const platform = os.platform();
    
    if (platform === 'darwin') {
        // macOS系统代理检测
        return await getMacOSProxy();
    } else if (platform === 'win32') {
        // Windows系统代理检测
        return await getWindowsProxy();
    } else {
        // Linux或其他系统，暂时返回未启用
        return { enabled: false };
    }
}

async function getMacOSProxy(): Promise<SystemProxyConfig> {
    try {
        const { stdout } = await execAsync('scutil --proxy');
        const lines = stdout.split('\n');
        
        const proxyConfig: SystemProxyConfig = {
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
            } else if (trimmedLine.startsWith('HTTPSEnable')) {
                httpsEnable = trimmedLine.includes('1');
            } else if (trimmedLine.startsWith('HTTPProxy')) {
                const match = trimmedLine.match(/HTTPProxy : (.+)/);
                if (match) {
                    httpServer = match[1].trim();
                }
            } else if (trimmedLine.startsWith('HTTPSProxy')) {
                const match = trimmedLine.match(/HTTPSProxy : (.+)/);
                if (match) {
                    httpsServer = match[1].trim();
                }
            } else if (trimmedLine.startsWith('ProxyAutoConfigURLString')) {
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
        } else if (httpEnable && httpServer) {
            proxyConfig.server = httpServer;
        }
        
        return proxyConfig;
    } catch (error) {
        console.warn('读取macOS系统代理设置失败:', error instanceof Error ? error.message : String(error));
        return { enabled: false };
    }
}

async function getWindowsProxy(): Promise<SystemProxyConfig> {
    return new Promise((resolve) => {
        const regKey = new winreg({
            hive: winreg.HKCU,
            key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
        });

        const results: Record<string, string> = {};
        
        regKey.values((err: Error, items: winreg.RegistryItem[]) => {
            if (err) {
                console.warn('读取Windows系统代理设置失败:', err.message);
                resolve({ enabled: false });
                return;
            }

            items.forEach((item: winreg.RegistryItem) => {
                results[item.name] = item.value as string;
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

export function parseProxyServer(server?: string): string | undefined {
    if (!server) return undefined;
    
    // 处理V2rayN默认格式 "127.0.0.1:10809"
    if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(server)) {
        return `http://${server}`;
    }
    
    // 处理已有协议的情况
    try {
        new URL(server);
        return server;
    } catch {
        console.warn('代理地址格式无效:', server);
        return undefined;
    }
} 