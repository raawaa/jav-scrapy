<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# iFlow 项目上下文文档

## 项目概述

jav-scrapy 是一个基于 Node.js 和 TypeScript 开发的网络爬虫工具，专门用于抓取 AV 影片的磁力链接、影片信息和封面图片。该项目采用模块化架构，具有良好的并发控制、错误处理机制、防屏蔽功能以及高级反爬虫绕过能力。项目版本为 **1.0.0**，使用 CommonJS 模块系统。

### 重要里程碑

项目已成功完成从 0.8.4 到 1.0.0 的重大升级，标志着项目的成熟化和稳定化：
- **v1.0.0**: 集成 Speckit 功能规格管理系统，优化发布流程
- **v0.8.0**: 项目架构重构，迁移到 TypeScript
- **v0.7.0**: 基础功能完善

### 自动化发布流程

项目实现了完整的自动化发布流程，包括：
- **Conventional Commits 规范**: 使用 commitlint 确保提交信息符合规范
- **语义化版本控制**: 基于 semantic-release 自动版本管理
- **GitHub Actions**: 自动化构建、测试和发布流程
- **Speckit (OpenSpec) 集成**: 规范化的功能规格管理系统

### 主要技术栈
- **语言**: TypeScript (ES2020)
- **运行环境**: Node.js 20+
- **模块系统**: CommonJS
- **核心依赖**: 
  - axios (HTTP 请求) - 1.13.2
  - axios-retry (请求重试) - ^4.5.0
  - commander (命令行解析) - 12.1.0
  - cli-progress (进度条显示) - ^3.12.0
  - winston (日志记录) - ^3.17.0
  - chalk (控制台美化) - ^5.4.1
  - puppeteer-core (浏览器自动化) - ^24.28.0
  - tunnel (代理支持) - ^0.0.6
  - winreg (Windows 注册表操作) - ^1.2.5

### 开发依赖
- **开发工具**: nodemon ^3.1.10, ts-node ^10.9.2
- **类型定义**: @types/* 包提供完整的 TypeScript 支持
  - @types/node ^24.10.0
  - @types/cli-progress ^3.11.6
  - @types/tunnel ^0.0.7
  - @types/async ^3.2.25
  - @types/winreg ^1.2.36
- **HTML解析**: cheerio - ^1.1.2
- **异步流程控制**: async - ^3.2.6
- **测试工具**:
  - mocha ^11.7.4 (测试运行器)
- **版本管理**:
  - semantic-release ^24.2.0
  - @commitlint/cli ^19.6.1
  - @commitlint/config-conventional ^19.6.0
  - conventional-changelog-cli ^4.1.0
  - conventional-changelog-conventionalcommits ^8.0.0
  - husky ^9.1.7 (Git hooks)
- **其他工具**: temp ^0.9.4, typescript ^5.9.3

### 项目架构
```
项目根目录/
├── src/                    # 源代码目录
│   ├── jav.ts              # 主入口文件，包含命令行接口和主要逻辑
│   ├── core/               # 核心模块
│   │   ├── config.ts       # 配置管理
│   │   ├── constants.ts    # 常量定义
│   │   ├── fileHandler.ts  # 文件处理
│   │   ├── logger.ts       # 日志系统
│   │   ├── parser.ts       # HTML 解析
│   │   ├── queueManager.ts # 队列管理
│   │   ├── requestHandler.ts # HTTP 请求处理
│   │   ├── puppeteerPool.ts # Puppeteer 实例池
│   │   └── resourceMonitor.ts # 资源监控器
│   ├── types/              # 类型定义
│   │   └── interfaces.ts   # 接口定义
│   └── utils/              # 工具函数
│       ├── cloudflareBypass.ts # Cloudflare 绕过处理
│       ├── delayManager.ts # 延迟管理器
│       ├── errorHandler.ts # 错误处理
│       └── systemProxy.ts  # 系统代理检测
├── .specify/               # Speckit 规范系统
│   ├── memory/             # 记忆和约定配置
│   ├── scripts/            # 自动化脚本
│   └── templates/          # 规范模板
├── openspec/               # OpenSpec 功能规格管理
│   ├── AGENTS.md           # AI 助手指导文档
│   ├── project.md          # 项目规范
│   ├── specs/              # 现有功能规格
│   └── changes/            # 变更提案
├── .iflow/                 # iFlow 配置和代理
│   └── agents/             # iFlow 专用代理配置
├── dist/                   # TypeScript 编译输出目录
└── test/                   # 测试文件目录
    ├── fileHandler.test.js
    ├── parser.test.js
    └── requestHandler.test.js
```

## 构建和运行

### 环境要求
- Node.js (版本 20 或更高，推荐使用最新的 LTS 版本进行开发)
- Git
- npm 或 yarn 包管理器

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
npm test              # 使用 mocha 运行测试
```

### 全局安装
```bash
npm install -g . --force
```

### 版本发布
```bash
npm run release               # 执行 semantic-release 发布
npm run changelog              # 生成 changelog
```

### 项目配置
- TypeScript 编译目标：ES2020
- 输出目录：./dist
- 源码目录：./src
- 支持装饰器和实验性元数据
- 模块解析：node
- 启用 ES 模块互操作和一致性检查
- 支持严格类型检查

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
- 支持严格的类型检查和代码质量保证

### Conventional Commits 规范

项目遵循 Conventional Commits 规范，确保提交信息的一致性和可读性：

#### 提交类型 (type)
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统或依赖更新
- `ci`: CI/CD 相关
- `chore`: 其他不涉及代码变动的更改

#### 作用域 (scope)
- `core`: 核心功能
- `utils`: 工具函数
- `parser`: 解析器
- `handler`: 处理器
- `config`: 配置
- `cli`: 命令行
- `deps`: 依赖
- `release`: 发布
- `specs`: 规范系统
- `ci-cd`: 持续集成/持续部署

#### 提交格式
```
type(scope): subject

body

footer
```

**示例**:
```
feat(core): 添加资源监控功能

- 实现内存和 CPU 使用情况监控
- 添加资源使用阈值警告
- 支持监控数据导出

Closes #123
```

### Speckit (OpenSpec) 规范系统

项目集成了 Speckit (OpenSpec) 功能规格管理系统，提供规范化的功能开发流程：

#### Speckit 流程
1. **变更提案阶段**: 创建功能提案和任务清单
2. **实现阶段**: 按规范实现功能并验证
3. **归档阶段**: 完成部署后归档变更记录

#### 主要命令
```bash
openspec list                  # 列出活跃变更
openspec show [item]           # 显示变更或规范详情
openspec validate [item]       # 验证变更或规范
openspec archive <change-id>   # 归档完成后的变更
```

#### 规范文件结构
```
openspec/
├── project.md              # 项目约定
├── specs/                  # 现有功能规范
│   └── [capability]/
│       ├── spec.md         # 需求和场景
│       └── design.md       # 技术设计
├── changes/                # 变更提案
│   ├── [change-name]/
│   │   ├── proposal.md     # 变更原因和内容
│   │   ├── tasks.md        # 实现清单
│   │   ├── design.md       # 技术决策
│   │   └── specs/          # 规范变更
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # 已完成变更
```

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

### Git Hooks

项目使用 Husky 管理 Git hooks，确保代码质量：
- **commit-msg**: 使用 commitlint 验证提交信息格式
- **pre-commit**: 可配置代码格式检查和测试运行

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
- 集成 Puppeteer-core 绕过 Cloudflare 防护
- 自动处理反爬虫机制
- 随机 User-Agent 和浏览器指纹（包括 Sec-CH-UA 头部）
- 实现 Puppeteer 实例池和资源监控系统
- 支持年龄验证页面自动处理
- 支持 AJAX 请求执行以获取动态内容

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
- 支持共享池实例以提高资源利用率
- 智能浏览器路径检测，支持系统 Chrome 和捆绑 Chrome

## 测试和调试

### 运行测试
```bash
npm test              # 使用 mocha 运行测试
```

项目包含以下测试文件：
- `fileHandler.test.js`: 文件处理模块测试
- `parser.test.js`: HTML 解析模块测试
- `requestHandler.test.js`: HTTP 请求处理模块测试

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
- **TypeScript**: 静态类型检查和编译

## 部署说明

### 编译发布
```bash
npm run build
npm publish
```

### 全局安装
项目支持全局安装，安装后可在任何位置使用 `jav` 命令。

### 自动化发布流程

项目实现了完整的自动化发布流程：

#### 版本管理
- 使用 semantic-release 进行语义化版本控制
- 基于 Conventional Commits 自动确定版本类型（major/minor/patch）
- 自动更新 package.json 和 CHANGELOG.md
- 支持 main 和 master 分支

#### GitHub Actions 集成
- 自动化构建和测试
- 自动创建 GitHub Release
- 支持多平台二进制文件构建
- 集成 Speckit 规范系统验证

## 版本管理系统

### semantic-release 配置

项目使用 semantic-release 实现自动化版本管理：

#### 支持的分支
- `main`: 主要开发分支
- `master`: 传统主分支（向后兼容）

#### 版本确定规则
- `feat`: 提交触发 minor 版本更新
- `fix`: 提交触发 patch 版本更新
- `feat` + `BREAKING CHANGE`: 触发 major 版本更新
- `fix` + `BREAKING CHANGE`: 触发 major 版本更新

### Changelog 管理

- 自动生成基于提交历史的 changelog
- 使用 conventional-changelog 工具
- 支持首次生成和增量更新
- 格式符合 Angular 规范
- 与 GitHub Release 集成

## Speckit (OpenSpec) 集成

### Speckit 系统概述

项目集成了 Speckit (OpenSpec) 功能规格管理系统，提供规范化的功能开发流程：

#### 三阶段工作流
1. **变更提案阶段**: 创建功能提案和任务清单
2. **实现阶段**: 按规范实现功能并验证
3. **归档阶段**: 完成部署后归档变更记录

#### 主要功能
- 规范化的功能开发流程
- 自动化的规范验证
- 变更历史追踪和归档
- 与 CI/CD 流程集成

#### 模板系统
项目提供规范化的模板：
- `proposal.md`: 变更提案模板
- `tasks.md`: 实现任务模板
- `spec.md`: 功能规格模板
- `checklist.md`: 验收清单模板

### iFlow 集成

#### iFlow 配置

项目集成了 iFlow CLI 工具，提供增强的开发体验：

##### 配置文件
- `.iflow/`: iFlow 配置目录
- `.iflow/agents/`: 专用代理配置
- `IFLOW.md`: 项目上下文文档（本文件）

#### iFlow 代理类型
项目包含多个专用代理，针对不同的开发任务：
- `general-purpose`: 通用任务代理
- `code-quality-reviewer`: 代码质量审查
- `code-reviewer`: TypeScript 代码审查
- `github-workflow-manager`: GitHub 工作流管理
- `project-architect`: 项目架构设计
- `web-scraper-designer`: 爬虫架构设计

#### iFlow 记忆功能

iFlow 会记住以下用户偏好和项目信息：
- 提交信息规范要求（Conventional Commits）
- Word 文档处理方式（使用 MCP 工具）
- 项目特定的开发约定和偏好
- Speckit 规范系统使用方式

#### 使用 iFlow

iFlow CLI 可以通过以下方式使用：
- 直接在终端中执行命令
- 自动识别项目上下文
- 提供智能代码补全和建议
- 集成项目的开发工作流
- 支持 Speckit 规范系统的开发流程

## 注意事项

1. **浏览器依赖**: 项目使用 `puppeteer-core` 替代 `puppeteer`，需要系统安装 Chrome/Chromium 浏览器
2. **代理设置**: 程序会自动检测并使用系统代理设置
3. **文件处理**: 抓取图片时会自动简化文件名以避免保存失败
4. **防屏蔽地址**: 建议定期运行 `jav update` 更新防屏蔽地址
5. **优雅退出**: 使用 Ctrl+C 可以安全中断程序执行
6. **法律合规**: 项目仅用于学习和研究目的，请遵守相关法律法规
7. **请求频率**: 添加了请求延迟参数（-d/--delay）以避免请求过于频繁被封禁
8. **资源消耗**: 启用 Cloudflare 绕过功能会启动浏览器实例，需要额外的系统资源
9. **版本信息**: 项目版本为 1.0.0，使用 CommonJS 模块系统
10. **重试机制**: 默认重试次数为 3 次，使用指数退避策略
11. **TypeScript**: 编译目标为 ES2020，确保在较新 Node.js 环境中运行
12. **防屏蔽策略**: 使用本地防屏蔽地址时会随机选择一个作为基础URL，提高访问成功率
13. **延迟管理**: 集中式延迟管理器支持更精细的请求间隔控制和优雅退出机制
14. **依赖优化**: 项目已清理未使用的依赖项，优化了包大小和加载性能
15. **规范要求**: 提交信息必须符合 Conventional Commits 规范，否则会被 commitlint 拒绝
16. **环境要求**: 使用 Node.js 20 作为开发和构建目标，确保最佳性能和兼容性
17. **发布自动化**: 自动化发布流程会在推送到 main/master 分支时自动触发
18. **功能规格**: 集成了 Speckit (OpenSpec) 功能规格管理系统，提供规范化的开发流程
19. **iFlow 集成**: 项目集成了 iFlow CLI，提供增强的开发体验和专用代理支持
20. **浏览器检测**: PuppeteerPool 实现了智能浏览器路径检测，支持多种操作系统

## 贡献者

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)  
- [@leongfeng](https://github.com/leongfeng)

---

**项目状态**: 活跃开发中 v1.0.0  
**最后更新**: 2025年11月8日  
**维护者**: jav-scrapy 团队