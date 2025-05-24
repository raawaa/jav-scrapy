import winreg from 'winreg';
import { URL } from 'url';

interface SystemProxyConfig {
    enabled: boolean;
    server?: string;
    override?: string;
    pacUrl?: string;
}

export async function getSystemProxy(): Promise<SystemProxyConfig> {
    return new Promise((resolve) => {
        const regKey = new winreg({
            hive: winreg.HKCU,
            key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
        });

        const results: Record<string, string> = {};
        
        regKey.values((err: Error, items: winreg.RegistryItem[]) => {
            if (err) {
                console.warn('读取系统代理设置失败:', err.message);
                resolve({ enabled: false });
                return;
            }

            // console.log('从注册表读取的原始项:', items);

            items.forEach((item: winreg.RegistryItem) => {
                results[item.name] = item.value as string;
            });

            // console.log('处理后的注册表代理设置:', results);

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