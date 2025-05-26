# 🎬 jav-scrapy

一个可以爬取 AV 磁力链接或影片封面的小爬虫。

🚀 **主要功能**：
- 抓取 AV 影片的磁力链接、影片信息并保存为 JSON 文件。
- 抓取影片的封面图片并保存到本地。自动处理文件名过长或包含非法字符的情况。
- 支持关键词搜索功能，可根据关键词过滤影片。
- 支持并发下载，可自定义并发数。
- 支持代理服务器配置。如果检测到系统代理设置，会自动使用系统代理。
- **新增 `update` 命令，用于自动检测并管理防屏蔽地址。**

📝 **TODO**:
- [ ] 实现类似git的子命令模式，例如：
    - `jav search <搜索关键字>`搜索内容并抓取；
    - `jav cat <类型>`抓取特定类型影片；
    - `jav act <女优名字>`抓取特定女优影片。

## ⚙️ 安装

✨**Windows用户可以直接使用自动化安装脚本`install.bat`傻瓜式安装。**

否则请使用以下方式手动安装：

### 手动安装

#### 🔧 必要环境

- **Node.js 环境**：由于该工具是通过 `npm` 进行全局安装的，所以需要系统已经安装了 Node.js。你可以从 [Node.js 官方网站](https://nodejs.org/) 下载并安装适合你操作系统的版本。安装完成后，你可以通过以下命令验证 Node.js 和 `npm` 是否安装成功：

```bash
$ node --version
$ npm --version
```

- **TypeScript 环境**：由于该库是使用 TypeScript 编写的，需要安装 TypeScript 编译器。你可以通过 `npm` 全局安装 TypeScript，命令如下：

```bash
$ npm install -g typescript
```

安装完成后，你可以通过以下命令验证 TypeScript 是否安装成功：

```bash
$ tsc --version
```

#### 🛠️ 编译安装本程序

```bash
# 克隆仓库
$ git clone https://github.com/qiusli/jav-scrapy.git

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

```bash
# 启动抓取任务
$ jav crawl [options]

# 常用选项
$ jav crawl -p 5 -t 60000 -o ~/downloads/magnets

# 搜索特定影片
$ jav crawl -s "影片关键词"

# 使用代理服务器
$ jav crawl -x http://127.0.0.1:8087

# 不抓取图片
$ jav crawl -N

# 抓取所有磁链（默认只抓取最大体积的磁链）
$ jav crawl -a

# 抓取指定数量的影片
$ jav crawl -l 10

# **更新防屏蔽地址**
# 运行此命令会自动检测并保存新的防屏蔽地址到 ~/.jav-scrapy-antiblock-urls.json 文件中。
# 抓取命令 (crawl) 会优先使用这些本地保存的地址。
$ jav update

# **指定起始页URL**
# 如果您通过 -b 参数指定了起始页URL，程序将优先使用您指定的地址，忽略本地保存的防屏蔽地址。
$ jav crawl -b https://www.your-preferred-jav-site.com/
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
| -n, --nomag          | 是否抓取尚无磁链的影片                                               |
| -a, --allmag         | 是否抓取影片的所有磁链（默认只抓取文件体积最大的磁链）               |
| -N, --nopic          | 不抓取图片                                                           |


## 📌 Notes

- 程序会自动检测并使用系统代理设置。
- 抓取图片时，如果文件名过长或包含非法字符，程序会尝试自动简化文件名进行保存。
- `jav update` 命令会将检测到的防屏蔽地址追加保存到 `~/.jav-scrapy-antiblock-urls.json` 文件中。


## 👥 Contributors

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
