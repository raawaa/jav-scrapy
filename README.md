# 🎬 jav-scrapy

一个基于 TypeScript 的高性能 JAV 内容爬虫，采用多队列架构，具有防屏蔽功能和并发处理能力。


## ✨ 特性

### 核心功能
- **四阶段流水线架构**: 四个异步队列系统，支持并发处理
- **元数据提取**: 自动提取影片元数据、分类和演员信息
- **磁力链接爬取**: 使用 AJAX 处理磁力链接提取
- **并发图像下载**: 带 referer 头的海报图片下载

### 防屏蔽能力
- **代理支持**: 自动检测并使用系统代理 (HTTP/HTTPS/SOCKS)
- **URL 轮换**: 从本地 URL 缓存中随机选择以避免封禁
- **User-Agent 轮换**: 使用现代 Chrome 头的动态轮换
- **Cookie 管理**: 自动 Cookie 验证和生命周期管理

### 性能与可靠性
- **并发处理**: 可配置的不同操作并发级别
- **指数退避**: 网络错误的 1.5x 退避重试机制
- **进度跟踪**: 实时进度条和队列监控
- **超时保护**: 卡住进程的 10 分钟强制关闭
- **三级输出架构**: 用户面向输出、调试文件日志、错误 stderr 分离
- **日志管理**: 统一数据目录、运行 ID 追踪、`jav logs` 命令

## 📋 目录

- [系统要求](#-系统要求)
- [安装](#-安装)
- [快速开始](#-快速开始)
- [使用方法](#-使用方法)
- [配置选项](#-配置选项)
- [数据目录](#-数据目录)
- [架构概述](#-架构概述)
- [开发设置](#-开发设置)
- [日志与调试](#-日志与调试)
- [故障排除](#-故障排除)
- [贡献指南](#-贡献指南)

## ⚙️ 系统要求

### 必需软件

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| **Node.js** | 16.x 或更高 | 18.x LTS 或更高 |
| **npm** | 8.x 或更高 | 最新 (10.x+) |
| **操作系统** | Windows 10+, macOS 10.14+, 或 Linux | 最新稳定版 |


### 内存要求

- **最低内存**: 512 MB 可用内存
- **推荐内存**: 2 GB 用于高并发性能
- **磁盘空间**: 100 MB 应用程序空间，加上下载内容所需空间

## ⚙️ 安装

### 🎉 新特性：预编译版本

从 v1.0.0 开始，项目提供**预编译版本**，用户可以直接从 GitHub 安装，无需本地 TypeScript 环境或构建过程！

### 直接安装 (推荐)

直接从 GitHub 安装预编译版本：

```bash
# 直接从 GitHub 安装（包含预编译的 JavaScript 文件）
npm install -g raawaa/jav-scrapy

# 现在可以从任何地方使用 'jav' 命令
jav --help
```

> **注意**: 从 v1.0.0 开始，dist 目录会被包含在发布包中，确保用户可以直接使用预编译版本。

**优势**：
- ✅ 无需 TypeScript 环境
- ✅ 无需本地编译
- ✅ 安装速度更快
- ✅ 即装即用

### 使用 npx 本地使用

无需全局安装，直接从 GitHub 运行预编译版本：

```bash
# 使用 npx 运行 (无需安装，包含预编译文件)
npx raawaa/jav-scrapy --help
```

**优势**：
- 🚀 零配置，即用即走
- 🔧 无需安装开发依赖
- 📦 自动下载预编译版本

### 开发模式

使用 TypeScript 直接运行 (无需构建):

```bash
git clone https://github.com/raawaa/jav-scrapy.git
cd jav-scrapy
npm install

# 开发模式运行
npm run dev

# 监控模式 (文件变化时自动重启)
npm run dev:watch
```

> **注意**: 本项目所有开发工具都作为本地依赖包管理，避免污染系统环境。使用 `npx` 运行本地包。

## 🚀 快速开始

### 基本使用

使用默认设置开始爬取：

```bash
jav crawl
```

### 限制影片数量

```bash
jav crawl --limit 100
```

### 使用代理

```bash
jav crawl --proxy http://proxy.example.com:8080
```

### 跳过图片下载

```bash
jav crawl --nopic
```

### 跳过没有磁力链接的影片

```bash
jav crawl --nomag
```

## 🚀 使用方法

### 可用命令

```bash
# 默认爬取命令
jav crawl [options]

# 更新防屏蔽 URLs 缓存
jav update

# 查看和管理日志
jav logs [options]

# 显示帮助
jav --help

# 显示版本
jav --version
```

### 常用选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--limit <number>` | 最大爬取影片数量 (0 = 无限制) | 0 |
| `--parallel <number>` | 基础并发级别 | 2 |
| `--delay <seconds>` | 请求间的基础延迟 | 2 |
| `--timeout <ms>` | 请求超时时间 (毫秒) | 30000 |
| `--proxy <url>` | 代理 URL (如未指定则自动检测) | - |
| `--nomag` | 跳过没有磁力链接的影片 | false |
| `--allmag` | 获取所有磁力链接 (不仅仅是最大的) | false |
| `--nopic` | 跳过图片下载 | false |
| `-v, --verbose` | 显示详细调试信息 | false |
| `-q, --quiet` | 静默模式，只显示错误和最终摘要 | false |

### 高级用法示例

#### 使用自定义设置爬取
```bash
jav crawl \
  --limit 500 \
  --parallel 3 \
  --delay 3 \
  --proxy http://user:pass@proxy.example.com:8080
```

#### 查看详细调试信息
```bash
jav crawl --verbose --limit 10
```

#### 更新防屏蔽 URLs
```bash
jav update
```

## 🔧 配置

### 配置优先级

配置按以下顺序加载 (从高到低优先级):

1. **CLI 参数** - 命令行标志
2. **本地缓存** - 防屏蔽地址文件（见下文「数据目录」）
3. **系统代理** - 从系统设置自动检测
4. **默认值** - 内置默认值

### 数据目录

应用的所有持久化数据统一存放在以下位置：

| 平台 | 数据目录 |
|------|----------|
| macOS | `~/.jav-scrapy/` |
| Windows | `%LOCALAPPDATA%\jav-scrapy\` |
| Linux | `~/.local/share/jav-scrapy/` |

```
数据目录/
├── antiblock-urls.json    # 防屏蔽地址缓存（自动从旧位置迁移）
└── logs/
    ├── jav-scrapy.log     # 主日志（所有级别）
    └── error.log          # 错误日志
```

### 代理配置

应用程序支持多种代理类型:

- **HTTP**: `http://proxy.example.com:8080`
- **HTTPS**: `https://proxy.example.com:8080`
- **SOCKS4**: `socks4://proxy.example.com:1080`
- **SOCKS5**: `socks5://proxy.example.com:1080`

带认证的格式:
```bash
--proxy http://username:password@proxy.example.com:8080
```

### 自动代理检测

应用程序可从以下来源自动检测代理:
- **Windows**: 注册表 (WinHTTP, WinINet)
- **macOS**: 系统偏好设置 (SCNetworkProxies)
- **Linux**: 环境变量 (`http_proxy`, `https_proxy`, `all_proxy`)

## 🏗️ 架构概述

### 四阶段流水线

jav-scrapy 使用复杂的四阶段流水线架构:

```
┌─────────────────────────────────────────────────────────────┐
│  阶段 1: 索引页面 (1x 并发)                                   │
│  - 获取列表页面                                               │
│  - 解析影片链接                                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  阶段 2: 详情页面 (0.75x 并发)                                 │
│  - 提取元数据 (gid, uc, img, title)                           │
│  - 解析分类和演员                                             │
│  - 准备文件写入任务                                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├────────────────────┐
                     ▼                    ▼
┌────────────────────────────────────┐  ┌────────────────────┐
│  阶段 3: 文件写入 (2x)              │  │  阶段 4: 图像      │
│  - 保存影片数据                     │  │  (0.5x)            │
│  - JSON/CSV 输出                    │  │  - 下载海报        │
│  - 高优先级                         │  │  - 带 referers     │
└────────────────────────────────────┘  └────────────────────┘
```

### 并发级别

| 阶段 | 并发 | 理由 |
|------|------|------|
| 索引页面 | 1x (基础) | 避免压垮服务器 |
| 详情页面 | 0.75x | 中等处理负载 |
| 文件写入 | 2x | 快速 I/O 操作 |
| 图像下载 | 0.5x | 带宽密集，低优先级 |

### 核心组件

- **QueueManager** (`src/core/queueManager.ts`): 编排四阶段流水线
- **RequestHandler** (`src/core/requestHandler.ts`): 带重试和代理支持的 HTTP 客户端
- **Parser** (`src/core/parser.ts`): 基于 Cheerio 的 HTML 解析器，带回退策略
- **Config** (`src/core/config.ts`): 多源配置管理
- **Logger** (`src/core/logger.ts`): 三通道输出架构（控制台/文件/错误）
- **Output** (`src/output.ts`): 用户面向的输出格式化
- **Paths** (`src/core/paths.ts`): 应用路径统一管理（跨平台）

## 🛠️ 开发设置

### 先决条件

- Node.js 16+ (推荐 LTS)
- npm 8+
- Git

> **注意**: 如果您只想使用 jav-scrapy 而不需要修改代码，请使用上面的"直接安装"方式。下面的步骤仅适用于需要参与项目开发的开发者。

### 设置开发环境 (仅限开发者)

```bash
# 克隆仓库
git clone https://github.com/raawaa/jav-scrapy.git
cd jav-scrapy

# 安装依赖
npm install

# 启动开发模式 (TypeScript 直接运行)
npm run dev

# 或启动监控模式 (文件变化时自动重启)
npm run dev:watch

# 构建生产版本
npm run build

# 运行测试 (如果存在)
npm test
```

### 开发命令

| 命令 | 描述 |
|------|------|
| `npm run build` | 将 TypeScript 编译到 `dist/` 目录 |
| `npm run dev` | 使用 `ts-node` 直接运行 TypeScript |
| `npm run dev:watch` | 使用 `nodemon` 监控文件变化 |
| `npm test` | 运行测试套件 (Mocha) |
| `npm run release` | 运行语义化发布进行版本管理 |

### 项目结构

```
src/
├── jav.ts                     # CLI 入口点
├── output.ts                  # 用户面向输出模块
├── core/                      # 核心模块
│   ├── config.ts             # 配置管理
│   ├── constants.ts          # 默认值，用户代理
│   ├── fileHandler.ts        # 文件操作
│   ├── logger.ts             # Winston 日志（三通道输出）
│   ├── parser.ts             # HTML 解析
│   ├── paths.ts              # 应用路径统一管理
│   ├── queueManager.ts       # 四队列系统
│   ├── requestHandler.ts     # 带重试的 HTTP 客户端
├── types/
│   └── interfaces.ts         # TypeScript 接口
└── utils/
    ├── delayManager.ts       # 延迟控制
    ├── errorHandler.ts       # 错误分类
    └── systemProxy.ts        # 代理检测
```

### TypeScript 配置

- **目标**: ES2020
- **模块**: CommonJS
- **输出目录**: `dist/`
- **源码目录**: `src/`
- **严格模式**: 启用

### 代码风格指南

- **无全局依赖**: 所有工具必须是本地 npm 依赖
- 使用 `npx` 运行包: `npx pkg` 而不是 `pkg`
- **错误处理**: 集中化错误分类（含 `uncaughtException` 崩溃保护）
- **日志记录**: 三通道输出架构（Output 模块 + Winston 文件日志）
- **应用路径**: 统一通过 `src/core/paths.ts` 管理，跨平台兼容

### 提交规范

项目使用由 Husky 强制执行的约定式提交:

```
<type>(<scope>): <subject>
```

**类型**: feat, fix, docs, style, refactor, perf, test, build, ci, chore

**示例**:
```bash
git commit -m "feat(core): add proxy authentication support"
```

## 🔍 故障排除

### 常见问题

#### "Cannot find module" 或安装问题
```bash
# 如果直接安装失败，请确保使用最新版本
npm install -g https://github.com/raawaa/jav-scrapy/tarball/main

# 如果仍有问题，清除 npm 缓存后重试
npm cache clean --force
npm install -g https://github.com/raawaa/jav-scrapy/tarball/main
```


#### 代理不工作
```bash
# 验证代理格式
--proxy http://user:pass@host:port

# 检查代理是否可访问
curl -x http://proxy.example.com:8080 http://httpbin.org/ip
```

#### 高并发时的内存问题
```bash
# 减少并发
--parallel 1

# 或减少延迟
--delay 1
```

#### 请求被阻止
```bash
# 增加延迟
--delay 5

# 使用代理
--proxy http://proxy.example.com:8080
```

## 📊 日志与调试

### 三通道输出架构

应用的输出分为三个独立通道：

| 通道 | 目标 | 内容 |
|------|------|------|
| **用户通道** | stdout | 业务进展、结果、摘要（无日志前缀） |
| **调试通道** | 文件 | 所有 debug/info/warn/error 级别的完整日志 |
| **错误通道** | stderr | 错误消息 |

### 日志详细级别

通过命令行选项控制控制台输出的详细程度：

```bash
jav crawl --limit 10            # 默认：只显示进度、结果和警告/错误
jav crawl --limit 10 --verbose  # 详细：显示所有调试信息
jav crawl --limit 10 --quiet    # 静默：只显示最终摘要和错误
```

### 日志文件

日志写入统一数据目录下的 `logs/` 子目录：

- `jav-scrapy.log` — 所有级别的完整运行日志
- `error.log` — 仅错误日志

每次运行会自动记录以下信息到日志文件：
- **运行 ID** — 每次运行生成唯一标识，日志行带 `[runId]` 前缀
- **启动快照** — Node.js 版本、操作系统、配置参数、可用内存
- **运行分隔** — 多次运行的日志在文件中有清晰的 `==== 运行 xxx 开始 ====` 分隔标记
- **崩溃记录** — `uncaughtException`/`unhandledRejection` 自动将错误和队列状态写入日志

### 日志管理

```bash
jav logs                   # 显示日志文件路径
jav logs --tail 100        # 显示最后 100 行日志
jav logs --export          # 导出日志到当前目录，方便分享
```

## 👥 贡献指南

我们欢迎贡献！请遵循以下步骤:

1. **Fork 仓库**
2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **进行更改**
4. **遵循提交规范**
   ```bash
   git commit -m "feat(scope): description"
   ```
5. **确保测试通过**
   ```bash
   npm test
   ```
6. **提交 Pull Request**

### 贡献准则

- **无全局依赖** - 保持所有工具为本地 npm 依赖
- **遵循 TypeScript 严格模式** - 所有类型检查必须通过
- **为新功能添加测试** - 使用 Mocha 配置了测试基础设施
- **更新文档** - 新功能包含 README 更新
- **使用 Winston 进行日志记录** - 遵循现有日志模式

### 贡献领域

- 额外代理类型支持
- 更多输出格式 (XML, YAML)
- Web UI 或仪表板
- 性能优化
- 额外防屏蔽策略
- 测试覆盖率改进

## 🏆 贡献者 (Contributors)

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)

## 🔄 手动发布流程 (Manual Release)

项目现在使用手动发布流程，开发者在本地运行 `npm version` 命令来生成版本和标签，然后 GitHub Actions 会在检测到新标签时自动发布到 npm 和 GitHub Releases：

- **手动版本管理**: 通过 `npm version` 命令手动更新版本号（major/minor/patch）
- **自动生成 CHANGELOG**: 在版本更新时自动生成 CHANGELOG.md
- **自动发布到 GitHub**: 推送标签后自动创建 GitHub Release
- **自动发布到 npm**: 推送标签后自动发布到 npm registry

#### 📝 版本发布命令 (Release Commands)

以下是发布不同版本类型的命令：

```bash
# 新功能 - 触发 minor 版本升级 (0.8.4 → 0.9.0)
git commit -m "feat: 添加新功能"

# 错误修复 - 触发 patch 版本升级 (0.8.4 → 0.8.5)
git commit -m "fix: 修复了某个问题"

# 重大变更 - 触发 major 版本升级 (0.8.4 → 1.0.0)
git commit -m "feat: 重构API\n\nBREAKING CHANGE: 旧API已弃用"

# 文档更新
git commit -m "docs: 更新README"

# 构建相关
git commit -m "build: 更新构建配置"

# 测试相关
git commit -m "test: 添加单元测试"
```

#### 🚀 发布流程

1. 确保所有测试通过
   ```bash
   npm test
   ```
2. 运行版本发布命令（选择适当的版本类型）
   ```bash
   npm run release:patch  # 或 minor/major
   ```
3. 推送标签和代码到远程仓库
   ```bash
   git push --follow-tags
   ```
4. GitHub Actions 会自动检测到新标签并执行发布流程

> **注意**: 所有开发工具都作为本地依赖管理，无需安装全局包。

## 📄 许可证

本项目基于 MIT 许可证授权。

## 💬 支持

- **Issues**: [GitHub Issues](https://github.com/raawaa/jav-scrapy/issues)
- **讨论**: [GitHub Discussions](https://github.com/raawaa/jav-scrapy/discussions)
- **邮箱**: 通过 GitHub 联系

## 🙏 致谢

- **Cheerio** HTML 解析
- **Axios** HTTP 请求
- **Winston** 日志记录
- **Commander.js** CLI 框架
- **TypeScript** 类型安全
