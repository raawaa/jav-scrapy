# 🚀 一键安装指南

## 方法一：通过 npm 直接安装（推荐）

无需克隆仓库，直接通过 npm 从 GitHub 安装：

```bash
# 全局安装
npm install -g https://github.com/raawaa/jav-scrapy.git

# 或者使用 npx 临时使用
npx github:raawaa/jav-scrapy
```

安装完成后，可以直接使用：
```bash
jav --help
```

## 方法二：指定版本安装

```bash
# 安装最新发布版本
npm install -g jav-scrapy

# 安装特定版本
npm install -g jav-scrapy@0.8.0

# 安装开发版本
npm install -g https://github.com/raawaa/jav-scrapy.git#master
```

## 方法三：使用 yarn

```bash
# 全局安装
yarn global add https://github.com/raawaa/jav-scrapy.git

# 或者使用 yarn dlx
yarn dlx github:raawaa/jav-scrapy
```

## 方法四：使用 pnpm

```bash
# 全局安装
pnpm add -g https://github.com/raawaa/jav-scrapy.git

# 或者使用 pnpm dlx
pnpm dlx github:raawaa/jav-scrapy
```

## 卸载

```bash
# npm
npm uninstall -g jav-scrapy

# yarn
yarn global remove jav-scrapy

# pnpm
pnpm remove -g jav-scrapy
```

## 更新

```bash
# npm
npm update -g jav-scrapy

# yarn
yarn global upgrade jav-scrapy

# pnpm
pnpm update -g jav-scrapy
```

## 使用示例

安装完成后，可以直接使用：

```bash
# 基本使用
jav

# 搜索并下载
jav -s "关键词" -l 10

# 使用代理
jav -x http://127.0.0.1:8087

# 更新防屏蔽地址
jav update
```

## 注意事项

1. **系统要求**：需要 Node.js 14 或更高版本
2. **权限**：全局安装可能需要管理员权限
3. **网络**：安装过程中需要访问 GitHub 和 npm registry
4. **Puppeteer**：首次使用时会自动下载 Chromium 浏览器

## 故障排除

### 权限问题
```bash
# Linux/macOS
sudo npm install -g https://github.com/raawaa/jav-scrapy.git

# Windows (以管理员身份运行 PowerShell)
npm install -g https://github.com/raawaa/jav-scrapy.git
```

### 网络问题
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com/
npm install -g https://github.com/raawaa/jav-scrapy.git

# 恢复官方源
npm config set registry https://registry.npmjs.org/
```

### 依赖安装失败
```bash
# 清理缓存
npm cache clean --force

# 重新安装
npm install -g https://github.com/raawaa/jav-scrapy.git
```