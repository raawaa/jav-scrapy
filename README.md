# 🎬 jav-scrapy

一个可以爬取 AV 磁力链接或影片封面的小爬虫。

## ✨ 特性

- **灵活的抓取功能**: 支持抓取磁力链接、影片信息和封面图片。
- **智能的防屏蔽地址管理**: 通过 `update` 命令自动检测并保存防屏蔽地址，`crawl` 命令优先使用本地地址，也可手动指定。
- **自动代理支持**: 自动检测并使用系统代理设置。
- **文件名自动简化**: 智能处理过长或含非法字符的文件名，确保图片保存成功。
- **并发控制**: 可自定义抓取并发数，提高效率。
- **多种筛选方式**: 支持按关键词搜索、按磁链存在与否筛选影片。

## ⚙️ 安装

### 🚀 一键安装（推荐）

无需克隆仓库，直接通过 npm 从 GitHub 安装：

```bash
# 全局安装
npm install -g https://github.com/raawaa/jav-scrapy.git

# 或者使用 npx 临时使用
npx github:raawaa/jav-scrapy
```

### 🖥️ 自动安装脚本

**Windows 用户：**
```bash
# PowerShell
.\quick-install.ps1

# 或者传统批处理
.\install.bat
```

**Linux/macOS 用户：**
```bash
chmod +x quick-install.sh
./quick-install.sh
```

### 📦 手动安装

#### 🔧 必要环境

- **Node.js 环境**：从 [Node.js 官方网站](https://nodejs.org/) 下载安装。安装完成后，通过以下命令验证：

```bash
$ node --version
$ npm --version
```

- **TypeScript 环境**：通过 npm 全局安装 TypeScript 编译器：

```bash
$ npm install -g typescript
```

安装完成后，通过以下命令验证：

```bash
$ tsc --version
```

#### 🛠️ 编译安装本程序

```bash
# 克隆仓库
$ git clone https://github.com/raawaa/jav-scrapy.git

# 进入项目目录
$ cd jav-scrapy

# 安装依赖
$ npm install

# 编译 TypeScript 代码
$ npm run build

# 安装全局命令
$ npm install -g . --force
```

### 📋 更多安装选项

查看 [INSTALL.md](./INSTALL.md) 了解更多安装方法和故障排除。

## 🚀 使用方法

**默认命令**: 直接运行 `jav` 等同于运行 `jav crawl` 命令。

### 🌐 防屏蔽地址管理 (`jav update`)

建议首次使用或定期运行此命令来更新防屏蔽地址列表。程序会尝试检测最新的可用地址，并追加保存到 `~/.jav-scrapy-antiblock-urls.json` 文件中。

```bash
$ jav update
```

`crawl` 命令在未指定 `-b` 参数时，会优先使用 `~/.jav-scrapy-antiblock-urls.json` 文件中的地址。

### 🎬 启动抓取任务 (`jav crawl` 或 `jav`)

运行抓取任务。可以根据需求使用不同的选项。

```bash
$ jav crawl [options]
# 或者简写为
$ jav [options]
```

**常用示例**: 

- **基本抓取（默认设置）**:
```bash
$ jav
```
（这会使用本地防屏蔽地址或默认地址，抓取全部磁力链接和封面到当前目录）

- **抓取指定数量的影片并指定输出目录和并发数**:
```bash
$ jav -l 10 -o ~/downloads/magnets -p 5
```

- **搜索并抓取特定关键词的影片**:
```bash
$ jav -s "影片关键词"
```

- **使用指定的代理服务器**:
```bash
$ jav -x http://127.0.0.1:8087
```

- **设置请求间隔时间**:
```bash
$ jav -d 3
```

- **手动设置Cookies**:
```bash
$ jav -c "session_id=abc123; token=def456"
```

- **启用Cloudflare绕过功能**:
```bash
$ jav --cloudflare
```

- **只抓取磁力链接，不下载图片**:
```bash
$ jav -N
```

- **指定抓取的起始页URL**:
```bash
$ jav -b https://www.your-preferred-jav-site.com/
```

- **组合多个选项**:
```bash
$ jav -l 5 -p 3 -d 2 -o /path/to/output -s "关键词" --cloudflare
```

## ⌨️ 命令行选项说明

| 选项                 | 说明                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| -p, --parallel<num>  | 设置抓取并发连接数（默认：2）                                            |
| -t, --timeout<num>   | 设置连接超时时间（毫秒，默认：30000）                                |
| -o, --output<path>   | 设置磁链和封面抓取结果的保存位置（默认为当前工作目录）                    |
| -s, --search<string> | 搜索关键词，可只抓取搜索结果的磁链或封面                               |
| -b, --base<url>      | 自定义抓取的起始页URL。指定此选项将覆盖本地保存的防屏蔽地址。           |
| -x, --proxy<url>     | 使用代理服务器（例：-x http://127.0.0.1:8087）。如果检测到系统代理，此选项会覆盖系统代理设置。       |
| -l, --limit<num>     | 设置抓取影片的数量上限，0为抓取全部影片（默认：0）                    |
| -d, --delay<num>     | 设置请求间隔时间（秒，默认：2秒）                                      |
| -n, --nomag          | 是否抓取尚无磁链的影片（默认：不抓取）                               |
| -a, --allmag         | 是否抓取影片的所有磁链（默认只抓取文件体积最大的磁链）               |
| -N, --nopic          | 不抓取图片                                                           |
| -c, --cookies<string> | 手动设置Cookies（格式："key1=value1; key2=value2"）                 |
| --cloudflare         | 启用 Cloudflare 绕过功能                                            |


## 📌 注意事项 (Notes)

- 程序会自动检测并使用系统代理设置。
- 抓取图片时，如果文件名过长或包含非法字符，程序会尝试自动简化文件名进行保存。
- `jav update` 命令会将检测到的防屏蔽地址追加保存到 `~/.jav-scrapy-antiblock-urls.json` 文件中。


## 👥 贡献者 (Contributors)

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
