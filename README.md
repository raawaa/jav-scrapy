# jav-scrapy

基于 TypeScript 的 JAV 内容爬虫，支持多队列并发处理、元数据提取、磁力链接爬取和海报下载。

## 安装

### 全局安装（推荐）

```bash
npm install -g raawaa/jav-scrapy
```

安装后可直接使用 `jav` 命令。

### 临时使用

```bash
npx raawaa/jav-scrapy --help
```

### 系统要求

- **Node.js**: 16.x 或更高（推荐 18.x LTS）
- **磁盘空间**: 100 MB（应用）+ 下载内容

## 快速开始

### 基本爬取

```bash
jav crawl
```

### 限制数量

```bash
jav crawl --limit 100
```

### 使用代理

```bash
jav crawl --proxy http://proxy.example.com:8080
```

### 跳过图片

```bash
jav crawl --nopic
```

## 命令参考

### `jav crawl` — 执行爬取（默认命令）

```bash
jav crawl [options]
```

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--limit <n>` | 最大爬取影片数（0=无限制） | 0 |
| `--parallel <n>` | 基础并发级别 | 2 |
| `--delay <s>` | 请求间基础延迟（秒） | 2 |
| `--timeout <ms>` | 请求超时（毫秒） | 30000 |
| `--proxy <url>` | 代理 URL（自动检测系统代理） | — |
| `--nomag` | 跳过无磁力链接的影片 | false |
| `--allmag` | 获取所有磁力链接（默认仅最大） | false |
| `--nopic` | 跳过图片下载 | false |
| `-v, --verbose` | 详细调试输出 | false |
| `-q, --quiet` | 仅显示错误和最终摘要 | false |

### `jav update` — 更新防屏蔽 URL 缓存

### `jav logs` — 日志管理

```bash
jav logs              # 显示日志文件路径
jav logs --tail 100   # 查看最后 100 行
jav logs --export     # 导出日志到当前目录
```

### 其他

```bash
jav --help       # 显示帮助
jav --version    # 显示版本
```

## 配置

### 配置优先级

1. **CLI 参数**（最高）
2. **本地缓存**（防屏蔽地址文件）
3. **系统代理**（自动检测）
4. **内置默认值**

### 代理支持

支持 HTTP、HTTPS、SOCKS4、SOCKS5 代理：

```bash
# 无认证
--proxy http://proxy.example.com:8080

# 带认证
--proxy http://username:password@proxy.example.com:8080
```

系统代理自动检测：Windows（注册表）、macOS（系统偏好设置）、Linux（环境变量 `http_proxy` 等）。

### 数据目录

应用数据统一存储在：

| 平台 | 路径 |
|------|------|
| macOS | `~/.jav-scrapy/` |
| Windows | `%LOCALAPPDATA%\jav-scrapy\` |
| Linux | `~/.local/share/jav-scrapy/` |

```
数据目录/
├── antiblock-urls.json    # 防屏蔽地址缓存
└── logs/
    ├── jav-scrapy.log     # 完整运行日志
    └── error.log          # 错误日志
```

## 高级用法

```bash
# 高并发深度爬取
jav crawl --limit 500 --parallel 3 --delay 3

# 调试模式
jav crawl --verbose --limit 10

# 仅爬取有磁力链接的影片
jav crawl --nomag --nopic
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 安装失败 | `npm install -g https://github.com/raawaa/jav-scrapy/tarball/main` |
| 代理不工作 | 检查格式 `--proxy http://user:pass@host:port` 和代理连通性 |
| 请求被屏蔽 | 增加延迟 `--delay 5` 或使用代理 |
| 内存不足 | 降低并发 `--parallel 1` |

## 许可证

MIT
