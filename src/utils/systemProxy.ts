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
        return await getMacOSProxy();
    } else if (platform === 'win32') {
        return await getWindowsProxy();
    } else {
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
        let httpPort = '';
        let httpsPort = '';

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
            } else if (trimmedLine.startsWith('HTTPPort')) {
                const match = trimmedLine.match(/HTTPPort : (\d+)/);
                if (match) {
                    httpPort = match[1].trim();
                }
            } else if (trimmedLine.startsWith('HTTPSPort')) {
                const match = trimmedLine.match(/HTTPSPort : (\d+)/);
                if (match) {
                    httpsPort = match[1].trim();
                }
            } else if (trimmedLine.startsWith('ProxyAutoConfigURLString')) {
                const match = trimmedLine.match(/ProxyAutoConfigURLString : (.+)/);
                if (match) {
                    proxyConfig.pacUrl = match[1].trim();
                }
            }
        }

        proxyConfig.enabled = httpEnable || httpsEnable;

        if (httpsEnable && httpsServer) {
            proxyConfig.server = httpsPort ? `${httpsServer}:${httpsPort}` : httpsServer;
        } else if (httpEnable && httpServer) {
            proxyConfig.server = httpPort ? `${httpServer}:${httpPort}` : httpServer;
        }

        return proxyConfig;
    } catch (error) {
        console.warn('read macOS proxy failed:', error instanceof Error ? error.message : String(error));
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
                console.warn('read Windows proxy failed:', err.message);
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

    if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(server)) {
        return `http://${server}`;
    }

    try {
        new URL(server);
        return server;
    } catch {
        console.warn('invalid proxy address:', server);
        return undefined;
    }
}
