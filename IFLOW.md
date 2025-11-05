# iFlow 项目上下文文档

## 项目概述

jav-scrapy 是一个基于 Node.js 和 TypeScript 开发的网络爬虫工具，专门用于抓取 AV 影片的磁力链接、影片信息和封面图片。该项目采用模块化架构，具有良好的并发控制、错误处理机制、防屏蔽功能以及高级反爬虫绕过能力。项目版本为 0.8.0，使用 CommonJS 模块系统。

### 主要技术栈
- **语言**: TypeScript
- **运行环境**: Node.js
- **模块系统**: CommonJS
- **核心依赖**: 
  - axios (HTTP 请求)
  - axios-retry (请求重试)
  - commander (命令行解析)
  - cli-progress (进度条显示)
  - winston (日志记录)
  - chalk (控制台美化)
  - puppeteer/puppeteer-extra/puppeteer-extra-plugin-stealth (浏览器自动化和绕过反爬机制)
  - tunnel (代理支持)
  - winreg (Windows 注册表操作)

### 开发依赖
- **开发工具**: nodemon, ts-node
- **类型定义**: @types/* 包提供完整的 TypeScript 支持
- **HTML解析**: cheerio
- **异步流程控制**: async
- **测试工具**: mocha + chai + nock (测试框架，但当前无测试目录)

### 项目架构
```
src/
├── jav.ts                  # 主入口文件，包含命令行接口和主要逻辑
├── core/                   # 核心模块
│   ├── config.ts           # 配置管理
│   ├── constants.ts        # 常量定义
│   ├── fileHandler.ts      # 文件处理
│   ├── logger.ts           # 日志系统
│   ├── parser.ts           # HTML 解析
│   ├── queueManager.ts     # 队列管理
│   ├── requestHandler.ts   # HTTP 请求处理
│   ├── puppeteerPool.ts    # Puppeteer 实例池
│   └── resourceMonitor.ts  # 资源监控器
├── types/                  # 类型定义
│   └── interfaces.ts       # 接口定义
└── utils/                  # 工具函数
    ├── cloudflareBypass.ts # Cloudflare 绕过处理
    ├── delayManager.ts     # 延迟管理器
    ├── errorHandler.ts     # 错误处理
    └── systemProxy.ts      # 系统代理检测
```

## 构建和运行

### 环境要求
- Node.js (建议最新 LTS 版本)
- TypeScript (全局安装)

### 安装依赖
```bash
npm install
```

### 编译 TypeScript 代码
```bash
npm run build
```

### 开发模式运行
```bash
npm run dev
```

### 开发模式监听运行
```bash
npm run dev:watch
```

### 运行测试
```bash
npm test
```

### 全局安装
```bash
npm install -g . --force
```

### 项目配置
- TypeScript 编译目标：ES2020
- 输出目录：./dist
- 源码目录：./src
- 支持装饰器和实验性元数据
- 模块解析：node
- 启用 ES 模块互操作和一致性检查

## 使用方法

### 基本命令
```bash
# 基本抓取（等同于 jav crawl）
jav

# 更新防屏蔽地址
jav update

# 指定参数抓取
jav -l 10 -o ~/downloads -p 5 -s "关键词"
```

### 主要命令行选项
- `-p, --parallel <num>`: 并发连接数（默认：2）
- `-t, --timeout <num>`: 连接超时时间（毫秒，默认：30000）
- `-l, --limit <num>`: 抓取影片数量上限（默认：0，全部）
- `-o, --output <path>`: 结果保存路径（默认：当前目录）
- `-s, --search <string>`: 搜索关键词
- `-b, --base <url>`: 自定义起始页URL
- `-x, --proxy <url>`: 使用代理服务器
- `-d, --delay <num>`: 设置请求间隔时间（秒，默认：2秒）
- `-n, --nomag`: 是否抓取尚无磁链的影片
- `-a, --allmag`: 是否抓取影片的所有磁链
- `-N, --nopic`: 不抓取图片
- `-c, --cookies <string>`: 手动设置Cookies，格式: "key1=value1; key2=value2"
- `--cloudflare`: 启用 Cloudflare 绕过功能

## 开发约定

### 代码风格
- 使用 TypeScript 进行类型安全编程
- 采用模块化设计，每个功能模块独立
- 使用 async/await 处理异步操作
- 遵循语义化版本控制
- 使用 ESLint 和 Prettier 保持代码风格一致

### 错误处理
- 使用 try-catch 包装可能出错的代码块
- 实现重试机制（默认重试3次，可配置，使用指数退避策略）
- 使用 winston 进行结构化日志记录
- 添加信号处理（SIGINT, SIGTERM）确保资源正确清理
- 使用专门的 ErrorHandler 模块处理不同类型的错误
- 支持 getExponentialBackoffDelay 函数进行智能重试延迟计算

### 配置管理
- 配置优先级：命令行参数 > 本地防屏蔽地址 > 系统代理 > 默认配置
- 防屏蔽地址保存在 `~/.jav-scrapy-antiblock-urls.json`
- 支持系统代理自动检测和手动代理设置
- 添加请求延迟参数（默认2秒）以避免请求过于频繁
- 支持手动设置Cookies和Cloudflare绕过功能

### 队列管理
- 使用多个队列处理不同类型的任务（索引页、详情页、文件写入、图片下载）
- 实现事件驱动的任务处理机制
- 支持并发控制和优雅停止
- 使用 async 库管理异步任务队列

## 特色功能

### 进度条显示
当使用 `-l` 参数指定下载数量时，会显示实时进度条，包括：
- 当前进度百分比
- 已完成/总数量
- 预计剩余时间
- 优雅的资源清理机制

### 防屏蔽地址管理
- 自动检测并保存防屏蔽地址
- 支持本地地址优先使用
- 通过 `jav update` 命令更新地址列表

### 智能文件名处理
- 自动处理过长或含非法字符的文件名
- 确保图片保存成功

### 代理支持
- 自动检测系统代理设置（macOS、Windows）
- 支持 HTTP/HTTPS 代理
- 支持手动指定代理服务器

### Cloudflare 防护绕过
- 集成 Puppeteer + Stealth 插件绕过 Cloudflare 防护
- 自动处理反爬虫机制
- 随机 User-Agent 和浏览器指纹（包括 Sec-CH-UA 头部）
- 实现 Puppeteer 实例池和资源监控系统

### 高级请求头伪装
- 模拟真实浏览器指纹（Sec-CH-UA 头部）
- 智能 Cookie 管理（优先级：手动设置 > Cloudflare Cookies > 浏览器 Cookies > 默认 Cookies）
- 支持手动设置和验证 Cookies 字符串

### 智能重试机制
- 使用指数退避策略进行重试
- 失败时自动更换 User-Agent
- 支持多种错误类型的重试（网络错误、5xx、429、403等）
- 智能 Cookie 验证和过滤

### 系统代理自动检测
- 支持 macOS 系统代理检测（通过 scutil）
- 支持 Windows 系统代理检测（通过注册表）
- 自动应用检测到的代理设置

### 延迟管理系统
- 集中式延迟管理器（DelayManager），提供精细化的请求间隔控制
- 支持不同类型请求的差异化延迟设置：
  - 索引页请求：1-3秒
  - 详情页请求：3-6秒
  - 图片下载：2-5秒
  - 错误重试：5-10秒
- 支持可中断的延迟机制，实现优雅的程序退出
- 提供延迟统计和监控功能
- 使用 getRandomDelay 和 getExponentialBackoffDelay 函数实现智能延迟算法

### 请求延迟控制
- 添加请求间隔时间设置（-d/--delay 参数）
- 使用随机延迟（getRandomDelay 函数）避免过于频繁的请求
- 默认延迟范围：5-15秒（可通过 constants.ts 配置）
- 支持指数退避延迟算法（getExponentialBackoffDelay）

### 队列统计与监控
- 实时显示各队列状态（等待中、运行中任务数量）
- 提供影片处理统计信息（已加入队列、开始处理、成功完成的数量）
- 支持优雅等待所有队列任务完成后再退出
- 增强的队列管理功能，支持更好的任务调度和错误恢复

### Puppeteer 实例池和资源监控
- 实现 Puppeteer 实例池管理，优化资源使用
- 支持动态调整池大小和健康检查
- 集成资源监控系统，实时监控内存和 CPU 使用情况
- 支持打包环境下的 Puppeteer 配置处理

## 测试和调试

### 运行测试
```bash
npm test              # 使用 mocha 运行测试 (注意：当前项目中无测试目录)
```

### 开发模式
```bash
npm run dev           # 直接运行 TypeScript 代码
npm run dev:watch     # 使用 nodemon 监听文件变化并自动重启
```

### 日志级别
项目使用 winston 进行日志管理，支持不同级别的日志输出，便于调试和问题排查。

### 调试模式
可以通过修改配置或环境变量来启用更详细的日志输出，帮助定位问题。

### 测试工具
- **Mocha**: 测试运行器
- **Chai**: 断言库
- **Nock**: HTTP 模拟和测试
- 注意：虽然 package.json 中配置了测试脚本和依赖，但当前项目代码中没有 test/ 目录和测试文件

## 部署说明

### 编译发布
```bash
npm run build
npm publish
```

### 全局安装
项目支持全局安装，安装后可在任何位置使用 `jav` 命令。

### Windows 自动化安装
提供 `install.bat` 和 `install.ps1` 脚本，支持 Windows 用户一键安装。

### 二进制构建
支持构建跨平台二进制文件：
```bash
npm run build-binary              # 构建当前平台二进制
npm run build-binary:windows      # 构建 Windows 二进制
npm run build-binary:all          # 构建所有平台二进制
```

## 注意事项

1. 程序会自动检测并使用系统代理设置
2. 抓取图片时会自动简化文件名以避免保存失败
3. 建议定期运行 `jav update` 更新防屏蔽地址
4. 使用 Ctrl+C 可以安全中断程序执行
5. 项目仅用于学习和研究目的，请遵守相关法律法规
6. 添加了请求延迟参数（-d/--delay）以避免请求过于频繁被封禁
7. 启用 Cloudflare 绕过功能会启动浏览器实例，需要额外的系统资源
8. 项目版本为 0.8.0，使用 CommonJS 模块系统
9. 默认重试次数为 3 次，使用指数退避策略
10. TypeScript 编译目标为 ES2020，确保在较新 Node.js 环境中运行
11. 使用本地防屏蔽地址时会随机选择一个作为基础URL，提高访问成功率
12. 集中式延迟管理器支持更精细的请求间隔控制和优雅退出机制
13. 项目已清理未使用的依赖项，优化了包大小和加载性能
14. 虽然配置了测试框架，但当前无测试文件，需要时可以添加测试目录
15. 支持二进制打包，可构建跨平台可执行文件

## 贡献者

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)