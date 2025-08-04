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

✨**Windows用户可以直接使用自动化安装脚本`install.bat`傻瓜式安装。**

否则请参考以下手动安装步骤：

### 手动安装

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

- **只抓取磁力链接，不下载图片**:
```bash
$ jav -N
```

- **指定抓取的起始页URL**:
```bash
$ jav -b https://www.your-preferred-jav-site.com/
```

## ⌨️ 命令行选项说明

| 选项                 | 说明                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| -p, --parallel<num>  | 设置并发连接数（默认：2）                                            |
| -t, --timeout<num>   | 设置连接超时时间（毫秒，默认：30000）                                |
| -o, --output<path>   | 设置结果保存路径（默认：当前工作目录）。**建议指定一个有写入权限的目录。** |
| -s, --search<string> | 搜索关键词                                                           |
| -b, --base<url>      | 自定义抓取的起始页URL。指定此选项将覆盖本地保存的防屏蔽地址。           |
| -x, --proxy<url>     | 使用代理服务器。如果检测到系统代理，此选项会覆盖系统代理设置。       |
| -l, --limit<num>     | 设置抓取影片的数量上限，0为抓取全部影片（默认：0）                    |
| -n, --nomag          | 是否抓取尚无磁链的影片（默认：不抓取）                               |
| -a, --allmag         | 是否抓取影片的所有磁链（默认：只抓取最大体积的磁链）               |
| -N, --nopic          | 不抓取图片                                                           |


## 📌 注意事项 (Notes)

- 程序会自动检测并使用系统代理设置。
- 抓取图片时，如果文件名过长或包含非法字符，程序会尝试自动简化文件名进行保存。
- `jav update` 命令会将检测到的防屏蔽地址追加保存到 `~/.jav-scrapy-antiblock-urls.json` 文件中。


## 👥 贡献者 (Contributors)

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
