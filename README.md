# jav-scrapy

基于 TypeScript 的 JAV 内容爬虫，支持多队列并发处理、元数据提取、磁力链接爬取和海报下载。

## 安装

> **要求**：Node.js 16+（推荐 18 LTS）。

### macOS / Linux

一行命令安装，自动下载最新版：

```bash
curl -fsSL https://raw.github.com/raawaa/jav-scrapy/main/install.sh | sh
```

安装完成后可直接使用 `jav` 命令。

### Windows

```bash
npm install -g raawaa/jav-scrapy#v1.2.0
```

如果只想临时尝鲜，无需安装：

```bash
npx raawaa/jav-scrapy --help
```

### 升级

```bash
jav upgrade              # 自动升级到最新版
jav upgrade v1.5.0       # 升级到指定版本
```

## 快速开始

以下命令从默认片源爬取影片信息，自动提取元数据、磁力链接和海报：

```bash
jav crawl                      # 直接开爬，使用默认参数
jav crawl --limit 100          # 最多爬 100 部影片就停
jav crawl --proxy http://proxy.example.com:8080  # 通过代理爬取
jav crawl --nopic              # 跳过海报下载，只需元数据
jav crawl --limit 500 --parallel 3 --delay 3  # 高并发深度爬取
```

## 爬取结果

运行 `jav crawl` 后，结果会保存到当前工作目录（可通过 `-o <path>` 指定）：

```
<output-dir>/
├── filmData.json           # 所有爬取结果汇总为一个 JSON 数组
├── START-001.jpg           # 封面海报
└── WAAA-002.jpg            # 每部影片对应一个图片文件
```

`filmData.json` 每条记录包含以下字段：

```json
{
  "title": "START-001 影片标题",
  "magnetLinks": [
    { "link": "magnet:?xt=urn:btih:...", "size": "5.23GB" }
  ],
  "category": ["高清画质", "剧情片"],
  "actress": ["演员名"]
}
```

> 自动去重：重复爬取时，会按标题 → 影片ID → 磁力链接依次检测重复，并用信息更完整的条目覆盖已有数据。

## 命令参考

### `jav crawl` — 执行爬取（默认命令）

程序会依次遍历索引页 → 详情页 → 提取磁力链接，最后写入文件和下载海报：

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
| `-o, --output <path>` | 输出目录（默认当前目录） | `process.cwd()` |
| `-v, --verbose` | 详细调试输出 | false |
| `-q, --quiet` | 仅显示错误和最终摘要 | false |

### `jav refresh` — 刷新防屏蔽地址

目标网站有多个防屏蔽镜像域名。运行此命令会从首页提取最新的可用镜像地址并缓存到本地。`jav crawl` 启动时会随机选用一个，避免单一域名被封导致爬取失败。建议每周运行一次，或发现爬取异常时先执行 `jav refresh`。

> 如果目标网站被 GFW 屏蔽，`jav refresh` 也需要代理才能访问首页提取镜像地址：`jav refresh --proxy http://127.0.0.1:8087`。未指定 `--proxy` 时会自动检测系统代理。

### `jav logs` — 日志管理

```bash
jav logs              # 显示日志文件路径
jav logs --tail 100   # 查看最后 100 行
jav logs --export     # 导出日志到当前目录
```

所有命令支持 `--help` 和 `--version`。

## 配置

配置按以下优先级依次覆盖（高优先级生效）：

1. **CLI 参数** — 命令行的 `--proxy` 等选项优先
2. **本地缓存** — 防屏蔽地址文件自动更新
3. **系统代理** — 自动检测系统代理设置
4. **内置默认值**

### 代理支持

支持 HTTP、HTTPS、SOCKS4、SOCKS5：

```bash
--proxy http://proxy.example.com:8080                    # 无认证
--proxy http://username:password@proxy.example.com:8080   # 带认证
```

系统代理自动检测：Windows（注册表）、macOS（系统偏好设置）、Linux（环境变量）。

### 应用数据

不同平台位置不同（macOS `~/.jav-scrapy/`、Windows `%LOCALAPPDATA%\jav-scrapy\`、Linux `~/.local/share/jav-scrapy/`）：

```
~/.jav-scrapy/
├── antiblock-urls.json    # 防屏蔽地址缓存
└── logs/
    ├── jav-scrapy.log     # 运行日志
    └── error.log          # 错误日志
```

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 安装失败 | `curl -fsSL https://raw.github.com/raawaa/jav-scrapy/main/install.sh | sh` 或 `npm install -g https://github.com/raawaa/jav-scrapy/tarball/main` |
| 代理不工作 | 检查格式 `--proxy http://user:pass@host:port` 和代理连通性 |
| 请求被屏蔽 | 增加延迟 `--delay 5` 或使用代理 |
| 内存不足 | 降低并发 `--parallel 1` |

## 许可证

MIT
