## [0.8.5](https://github.com/raawaa/jav-scrapy/compare/v0.8.4...v0.8.5) (2025-11-05)


### Bug Fixes

* update Windows binary build process in GitHub Actions ([5870560](https://github.com/raawaa/jav-scrapy/commit/587056073e2a4fa564285d8e363eeee0b0ab07d3))

## [0.8.4](https://github.com/raawaa/jav-scrapy/compare/v0.8.3...v0.8.4) (2025-11-05)


### Bug Fixes

* improve Windows installer script to handle encoding and version detection ([0a2e8e9](https://github.com/raawaa/jav-scrapy/commit/0a2e8e9f361c800b078aa1680f133ec340b6a221))

## [0.8.3](https://github.com/raawaa/jav-scrapy/compare/v0.8.2...v0.8.3) (2025-11-05)


### Bug Fixes

* correct sed command syntax in GitHub Actions workflow ([8161103](https://github.com/raawaa/jav-scrapy/commit/81611038c5239e616f6fccc723b406eb498bd683))

## [0.8.2](https://github.com/raawaa/jav-scrapy/compare/v0.8.1...v0.8.2) (2025-11-05)


### Bug Fixes

* Trigger GitHub Action with empty commit ([5e404bb](https://github.com/raawaa/jav-scrapy/commit/5e404bb3ee03e45cdbfd9719ac45af7c0d20efb2))

## [0.8.1](https://github.com/raawaa/jav-scrapy/compare/v0.8.0...v0.8.1) (2025-11-05)


### Bug Fixes

* **puppeteer:** 优化打包环境下Puppeteer的配置处理 ([e630cde](https://github.com/raawaa/jav-scrapy/commit/e630cdec52d00d655a78c288255b217bb12894da))

# [0.8.0](https://github.com/raawaa/jav-scrapy/compare/v0.7.0...v0.8.0) (2025-11-05)


### Bug Fixes

* **axios/proxy:** 通过请求拦截器修复HTTP代理访问HTTPS网站的连接问题 ([fc04263](https://github.com/raawaa/jav-scrapy/commit/fc04263987f24494f15ff409b5fa9ce2e5eb1d09))
* **config:** 当用户手动设置了baseURL时，自动将请求头referer配置为新的baseurl ([738e8c1](https://github.com/raawaa/jav-scrapy/commit/738e8c145f5a0b975bdd2403765f0d8498cef3bd))
* **config:** 更新请求头中的Referer和Cookie配置 ([4bbeb47](https://github.com/raawaa/jav-scrapy/commit/4bbeb47d38544860c8acc5e1a661d3eec85780db))
* meta.category always return an empty array ([9a42963](https://github.com/raawaa/jav-scrapy/commit/9a4296362ae194e7678bb8bf83bf0df9b1f2feb2))
* **requestHandler:** 在下载图片前检查文件是否存在 ([c14c49f](https://github.com/raawaa/jav-scrapy/commit/c14c49fe4067e966451fe8c151d88496eb6e0544))
* **requestHandler:** 增加对https代理的支持 ([de7b11a](https://github.com/raawaa/jav-scrapy/commit/de7b11a1d3bbc695f79936f62d23c9bc4a293983))
* 修复 -N/--nopic 和 -a/--allmag 参数功能 ([484b28d](https://github.com/raawaa/jav-scrapy/commit/484b28df8129b5bfe073ea90e71decd969d12ffa))
* 修复semantic-release配置中的分支名称从main改为master ([623be69](https://github.com/raawaa/jav-scrapy/commit/623be69a734876b90fc53777a3a31ab65e9b13a3))
* 升级GitHub Actions中的Node.js版本到20以满足semantic-release要求 ([062860c](https://github.com/raawaa/jav-scrapy/commit/062860c35152658c19b364fa50d8ad23c628bdc9))
* 添加master分支支持到GitHub Actions workflow ([8dad9a1](https://github.com/raawaa/jav-scrapy/commit/8dad9a1d7241f03c6677e1388fe32687f3535e86))
* 移除semantic-release中的npm插件以避免NPM token错误 ([cf59267](https://github.com/raawaa/jav-scrapy/commit/cf592678394946a83b6b24c6c768a3b996e86ff1))
* 重构配置管理和URL生成逻辑，修复配置初始化错误 ([7de26be](https://github.com/raawaa/jav-scrapy/commit/7de26be47ea9b93c307fe7c2b2bea04ece2d8414))


### Features

* **config:** 重构防屏蔽地址加载逻辑 ([8f9365e](https://github.com/raawaa/jav-scrapy/commit/8f9365ea5c71b1d7d5ccb4113e328851db595637))
* **dependencies:** 更新依赖项以支持代理功能和类型定义 ([fa2ac48](https://github.com/raawaa/jav-scrapy/commit/fa2ac48f4f0522065ebe21fcfd4cf48a0405eb3c))
* **parser:** 优化解析器功能并完善注释 ([0144b8b](https://github.com/raawaa/jav-scrapy/commit/0144b8bd22a857214792ac85637ca5a421ecb598))
* **parser:** 添加提取防屏蔽地址的功能并更新JavScraper逻辑 ([ddb0fee](https://github.com/raawaa/jav-scrapy/commit/ddb0fee3fda29bad154590c1877b23feaa9ce90c))
* **progress:** 添加进度条功能以提升用户体验 ([f0ca9b0](https://github.com/raawaa/jav-scrapy/commit/f0ca9b00ebbdf0d0c533ae8098ebe56956d6f9f3))
* **requestHandler:** 添加图片下载功能并重构配置管理 ([9ac8c83](https://github.com/raawaa/jav-scrapy/commit/9ac8c83ed5c02b77c3c7acb5cc46241720a957ee))
* 优化队列管理和错误处理逻辑 ([cb111ce](https://github.com/raawaa/jav-scrapy/commit/cb111ce4371dae253a148eac7334cfe004e748ad))
* 增强爬虫功能并改进错误处理 ([0a696d7](https://github.com/raawaa/jav-scrapy/commit/0a696d70531e0de8383c855ab3b5f0289add8823))
* 增强队列管理和监控功能 ([c65fd4a](https://github.com/raawaa/jav-scrapy/commit/c65fd4a675acd8a90433605103dd26d0bb9cc0a3))
* **安装:** 添加Windows自动化安装脚本并更新README ([4225b5f](https://github.com/raawaa/jav-scrapy/commit/4225b5f2a7c800f555c3c498cd3623fc931fdfe3))
* 实现Puppeteer池和资源监控系统 ([d55c1ce](https://github.com/raawaa/jav-scrapy/commit/d55c1ce02972c535a6be406c8272c6cc83980b95))
* 将项目迁移至TypeScript并重构核心模块 ([93e592d](https://github.com/raawaa/jav-scrapy/commit/93e592d45ca5a817ca05970bd2b77f569e183945))
* 添加抓取数量限制功能 ([4eddc46](https://github.com/raawaa/jav-scrapy/commit/4eddc46cc47d57a32fd9b2df69b321802fc927d1))

## 0.8.0 (2025-11-05)

* fix: 修复 -N/--nopic 和 -a/--allmag 参数功能 ([484b28d](https://github.com/raawaa/jav-scrapy/commit/484b28d))
* fix: 重构配置管理和URL生成逻辑，修复配置初始化错误 ([7de26be](https://github.com/raawaa/jav-scrapy/commit/7de26be))
* fix: meta.category always return an empty array ([9a42963](https://github.com/raawaa/jav-scrapy/commit/9a42963))
* fix(axios/proxy): 通过请求拦截器修复HTTP代理访问HTTPS网站的连接问题 ([fc04263](https://github.com/raawaa/jav-scrapy/commit/fc04263))
* fix(config): 当用户手动设置了baseURL时，自动将请求头referer配置为新的baseurl ([738e8c1](https://github.com/raawaa/jav-scrapy/commit/738e8c1))
* fix(config): 更新请求头中的Referer和Cookie配置 ([4bbeb47](https://github.com/raawaa/jav-scrapy/commit/4bbeb47))
* fix(requestHandler): 在下载图片前检查文件是否存在 ([c14c49f](https://github.com/raawaa/jav-scrapy/commit/c14c49f))
* fix(requestHandler): 增加对https代理的支持 ([de7b11a](https://github.com/raawaa/jav-scrapy/commit/de7b11a))
* chore: 更新.gitignore文件以简化路径匹配 ([1c62d42](https://github.com/raawaa/jav-scrapy/commit/1c62d42))
* chore: 将 .vscode 文件夹添加到 .gitignore ([b18092f](https://github.com/raawaa/jav-scrapy/commit/b18092f))
* chore: 清理未使用的依赖项并更新package.json ([d6b7be9](https://github.com/raawaa/jav-scrapy/commit/d6b7be9))
* chore: 让git不再跟踪lint和ide配置文件 ([cae851d](https://github.com/raawaa/jav-scrapy/commit/cae851d))
* chore: 在package.json中添加prepare脚本 ([5cb91dd](https://github.com/raawaa/jav-scrapy/commit/5cb91dd))
* chore(.gitignore): 调整忽略规则 ([2eb86c3](https://github.com/raawaa/jav-scrapy/commit/2eb86c3))
* chore(.gitignore): 更新.vscode和.trae的忽略规则 ([2600e06](https://github.com/raawaa/jav-scrapy/commit/2600e06))
* chore(.gitignore): 更新忽略文件列表，添加.vscode和.trae ([c97b065](https://github.com/raawaa/jav-scrapy/commit/c97b065))
* chore(actress): 删除不再使用的actress.js文件 ([a60e708](https://github.com/raawaa/jav-scrapy/commit/a60e708))
* chore(jav): 优化防屏蔽地址文件路径处理 ([2c06de1](https://github.com/raawaa/jav-scrapy/commit/2c06de1))
* docs: 更新 README 并调整默认输出路径描述 ([eee9547](https://github.com/raawaa/jav-scrapy/commit/eee9547))
* docs: 更新 README.md 以反映最新配置和安装步骤 ([94dd86e](https://github.com/raawaa/jav-scrapy/commit/94dd86e))
* docs: 更新 README.md 以增强可读性和添加 TODO 列表 ([652d1d5](https://github.com/raawaa/jav-scrapy/commit/652d1d5))
* docs: 更新.gitignore和README.md文件 ([88d6754](https://github.com/raawaa/jav-scrapy/commit/88d6754))
* docs: 更新仓库克隆链接为新的github地址 ([08a3ba6](https://github.com/raawaa/jav-scrapy/commit/08a3ba6))
* docs: 更新README.md中的命令行选项说明 ([15e00ca](https://github.com/raawaa/jav-scrapy/commit/15e00ca))
* docs: 更新README和package.json以简化安装流程 ([b7d63b3](https://github.com/raawaa/jav-scrapy/commit/b7d63b3))
* docs: 将README.md中的二级标题调整为三级标题 ([98a4bac](https://github.com/raawaa/jav-scrapy/commit/98a4bac))
* docs: 完善核心模块的代码注释和类型定义 ([52b225b](https://github.com/raawaa/jav-scrapy/commit/52b225b))
* docs: 完善项目文档和安装脚本 ([c6797e5](https://github.com/raawaa/jav-scrapy/commit/c6797e5))
* docs: 为多个核心模块添加文件注释和模块描述 ([5ff428e](https://github.com/raawaa/jav-scrapy/commit/5ff428e))
* docs: 移除 README.md 中不再使用的动画 GIF ([8786e76](https://github.com/raawaa/jav-scrapy/commit/8786e76))
* docs: 移除README.md中的待办事项 ([6187a0c](https://github.com/raawaa/jav-scrapy/commit/6187a0c))
* refactor: 将队列管理逻辑提取到独立的QueueManager类 ([1626423](https://github.com/raawaa/jav-scrapy/commit/1626423))
* refactor: 移除命令行选项的默认值参数 ([0805476](https://github.com/raawaa/jav-scrapy/commit/0805476))
* refactor: 移除未使用的导入模块 ([ebb251e](https://github.com/raawaa/jav-scrapy/commit/ebb251e))
* refactor: 移除未使用的依赖并重构配置管理 ([b9af65b](https://github.com/raawaa/jav-scrapy/commit/b9af65b))
* refactor: 移除未使用的依赖并重构配置管理 ([c7c84ab](https://github.com/raawaa/jav-scrapy/commit/c7c84ab))
* refactor: 移除未使用的URL处理函数 ([dc1f0e8](https://github.com/raawaa/jav-scrapy/commit/dc1f0e8))
* refactor: 移除未使用的user-home和path模块依赖 ([18dc164](https://github.com/raawaa/jav-scrapy/commit/18dc164))
* refactor: 重构文件处理和解析逻辑，优化类型定义 ([033cc23](https://github.com/raawaa/jav-scrapy/commit/033cc23))
* refactor: 重命名队列创建方法以提高代码可读性 ([4a5434d](https://github.com/raawaa/jav-scrapy/commit/4a5434d))
* refactor(config): 将 searchUrl 移动到配置接口并优化 URL 处理逻辑 ([d260c97](https://github.com/raawaa/jav-scrapy/commit/d260c97))
* refactor(config): 统一设置所有URL字段并确保末尾无斜杠 ([870448e](https://github.com/raawaa/jav-scrapy/commit/870448e))
* refactor(config): 移除对 path 和 user-home 的依赖并优化配置管理 ([5914031](https://github.com/raawaa/jav-scrapy/commit/5914031))
* refactor(fileHandler): 优化影片数据json写入逻辑 ([c67cb18](https://github.com/raawaa/jav-scrapy/commit/c67cb18))
* refactor(jav.js): 优化抓取队列的错误处理和任务执行逻辑 ([109f995](https://github.com/raawaa/jav-scrapy/commit/109f995))
* refactor(logger): 将logger模块移动到core目录下 ([7bd7a2a](https://github.com/raawaa/jav-scrapy/commit/7bd7a2a))
* refactor(queue): 重构延迟管理为集中式延迟管理器 ([d107ae1](https://github.com/raawaa/jav-scrapy/commit/d107ae1))
* refactor(queueManager): 改进错误处理函数的类型定义和注释 ([c9b5b55](https://github.com/raawaa/jav-scrapy/commit/c9b5b55))
* refactor(queueManager): 重构队列管理逻辑并添加事件处理机制 ([5059d1a](https://github.com/raawaa/jav-scrapy/commit/5059d1a))
* refactor(requestHandler): 优化请求配置和重试策略 ([602e32f](https://github.com/raawaa/jav-scrapy/commit/602e32f))
* feat: 将项目迁移至TypeScript并重构核心模块 ([93e592d](https://github.com/raawaa/jav-scrapy/commit/93e592d))
* feat: 添加抓取数量限制功能 ([4eddc46](https://github.com/raawaa/jav-scrapy/commit/4eddc46))
* feat: 优化队列管理和错误处理逻辑 ([cb111ce](https://github.com/raawaa/jav-scrapy/commit/cb111ce))
* feat: 增强队列管理和监控功能 ([c65fd4a](https://github.com/raawaa/jav-scrapy/commit/c65fd4a))
* feat: 增强爬虫功能并改进错误处理 ([0a696d7](https://github.com/raawaa/jav-scrapy/commit/0a696d7))
* feat(config): 重构防屏蔽地址加载逻辑 ([8f9365e](https://github.com/raawaa/jav-scrapy/commit/8f9365e))
* feat(dependencies): 更新依赖项以支持代理功能和类型定义 ([fa2ac48](https://github.com/raawaa/jav-scrapy/commit/fa2ac48))
* feat(parser): 添加提取防屏蔽地址的功能并更新JavScraper逻辑 ([ddb0fee](https://github.com/raawaa/jav-scrapy/commit/ddb0fee))
* feat(parser): 优化解析器功能并完善注释 ([0144b8b](https://github.com/raawaa/jav-scrapy/commit/0144b8b))
* feat(progress): 添加进度条功能以提升用户体验 ([f0ca9b0](https://github.com/raawaa/jav-scrapy/commit/f0ca9b0))
* feat(requestHandler): 添加图片下载功能并重构配置管理 ([9ac8c83](https://github.com/raawaa/jav-scrapy/commit/9ac8c83))
* style(jav): 格式化代码，调整空格和注释位置 ([994fe23](https://github.com/raawaa/jav-scrapy/commit/994fe23))
* :ambulance: 修复获取封面或截图时导致的崩溃 ([e9c1187](https://github.com/raawaa/jav-scrapy/commit/e9c1187))
* 初始提交：为代码重构创建专用分支 ([a4b6737](https://github.com/raawaa/jav-scrapy/commit/a4b6737))
* 更新防屏蔽地址 ([d9e7424](https://github.com/raawaa/jav-scrapy/commit/d9e7424))
* 更新功能说明 ([27a9fb1](https://github.com/raawaa/jav-scrapy/commit/27a9fb1))
* 更新README文档，新增`update`命令以自动检测和管理防屏蔽地址，同时优化抓取命令的使用说明。更新JavScraper类以支持新的命令逻辑，增强错误处理和资源清理。调整ConfigManage ([1b871f3](https://github.com/raawaa/jav-scrapy/commit/1b871f3))
* 更新README文档，优化功能描述和使用说明，新增防屏蔽地址管理和抓取命令示例，提升用户体验和可读性。 ([f7ca83f](https://github.com/raawaa/jav-scrapy/commit/f7ca83f))
* 将'crawl'命令设置为默认命令，优化爬虫启动方式 ([12db118](https://github.com/raawaa/jav-scrapy/commit/12db118))
* 说明如何更换防屏蔽地址 ([1f350ee](https://github.com/raawaa/jav-scrapy/commit/1f350ee))
* 修复封面抓取报错崩溃 ([101a0d2](https://github.com/raawaa/jav-scrapy/commit/101a0d2))
* 修复审核中的磁链无法获取的问题 ([5bedf91](https://github.com/raawaa/jav-scrapy/commit/5bedf91))
* 优化JavScraper类的日志记录，统一使用logInfo方法替代console.log，提升代码可读性和一致性。 ([429cbf7](https://github.com/raawaa/jav-scrapy/commit/429cbf7))
* 优化JavScraper类的日志记录和错误处理，移除冗余注释，简化代码结构。更新信号处理以增强资源清理的可读性。 ([fb8dbfa](https://github.com/raawaa/jav-scrapy/commit/fb8dbfa))
* 语法小检查:) ([9cef4c8](https://github.com/raawaa/jav-scrapy/commit/9cef4c8))
* add nopic option ([509cedb](https://github.com/raawaa/jav-scrapy/commit/509cedb))
* Add option to grab all magnets of a movie clip ([d4842b3](https://github.com/raawaa/jav-scrapy/commit/d4842b3))
* add option to skip downloading snapshot pictures ([87cd38a](https://github.com/raawaa/jav-scrapy/commit/87cd38a))
* audit and fix dependencies ([1263493](https://github.com/raawaa/jav-scrapy/commit/1263493))
* Bump lodash from 4.17.15 to 4.17.21 ([1350a11](https://github.com/raawaa/jav-scrapy/commit/1350a11))
* feat(安装): 添加Windows自动化安装脚本并更新README ([4225b5f](https://github.com/raawaa/jav-scrapy/commit/4225b5f))
* Fix outdated git URL ([3b24a6f](https://github.com/raawaa/jav-scrapy/commit/3b24a6f))
* get largest magnet in size ([0b1a370](https://github.com/raawaa/jav-scrapy/commit/0b1a370))
* lint ([244f884](https://github.com/raawaa/jav-scrapy/commit/244f884))
* migrate to yarn ([63b7e89](https://github.com/raawaa/jav-scrapy/commit/63b7e89))
* option to scrap non-magnet film or not ([f449efd](https://github.com/raawaa/jav-scrapy/commit/f449efd))
* reformat ([a514f99](https://github.com/raawaa/jav-scrapy/commit/a514f99))
* update javbus site url ([5e0b9f3](https://github.com/raawaa/jav-scrapy/commit/5e0b9f3))
* update javbus site url ([9f1c02d](https://github.com/raawaa/jav-scrapy/commit/9f1c02d))
* update readme ([af8ac14](https://github.com/raawaa/jav-scrapy/commit/af8ac14))
* Update readme ([2a7b260](https://github.com/raawaa/jav-scrapy/commit/2a7b260))
* Update readme ([3b16988](https://github.com/raawaa/jav-scrapy/commit/3b16988))
* Update README.md ([f2e19cb](https://github.com/raawaa/jav-scrapy/commit/f2e19cb))
* update site url ([dd991c6](https://github.com/raawaa/jav-scrapy/commit/dd991c6))
* Update site url; and npm audit. ([675a1b4](https://github.com/raawaa/jav-scrapy/commit/675a1b4))
* update version number ([2a753ef](https://github.com/raawaa/jav-scrapy/commit/2a753ef))
* update versioning and npm link methods ([83ae91c](https://github.com/raawaa/jav-scrapy/commit/83ae91c))



# 更新日志

本文档记录了 jav-scrapy 项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- 自动化版本管理和 changelog 生成
- 改进的 GitHub Actions 工作流程
- 支持多平台二进制文件自动构建

### 变更
- 重构发布流程以支持自动化版本控制

---

## [0.8.0] - 2024-XX-XX

### 新增
- Cloudflare 绕过功能
- 高级请求头伪装
- 智能延迟管理系统
- 队列统计与监控功能
- 系统代理自动检测

### 优化
- 改进的重试机制
- 更好的错误处理
- 性能优化

### 修复
- 修复文件名处理问题
- 修复代理检测问题

---

## [0.7.0] - 2024-XX-XX

### 新增
- 基础爬虫功能
- 多平台支持
- 命令行界面

---

[未发布]: https://github.com/raawaa/jav-scrapy/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/raawaa/jav-scrapy/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/raawaa/jav-scrapy/releases/tag/v0.7.0
