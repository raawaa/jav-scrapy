# 🎬 jav-scrapy

一个可以爬取 AV 磁力链接或影片封面的小爬虫。

🚀 **主要功能**：
- 抓取 AV 影片的磁力链接、影片信息并保存为 JSON 文件。
- 抓取影片的封面图片并保存到本地。
- 支持关键词搜索功能，可根据关键词过滤影片。
- 支持并发下载，可自定义并发数。
- 支持代理服务器配置。

📝 **TODO**:
- [ ] 实现类似git的子命令模式，例如：
    - `jav search <搜索关键字>`搜索内容并抓取；
    - `jav cat <类型>`抓取特定类型影片；
    - `jav act <女优名字>`抓取特定女优影片。
- [ ] 支持自定义抓取规则。
- [ ] 支持自定义保存路径。

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
# 基本用法
$ jav

# 常用选项
$ jav -p 5 -t 60000 -o ~/downloads/magnets

# 搜索特定影片
$ jav -s "影片关键词"

# 使用代理服务器
$ jav -x http://127.0.0.1:8087

# 不抓取图片
$ jav -N

# 抓取所有磁链（默认只抓取最大体积的磁链）
$ jav -a
```

## ⌨️ 命令行选项说明


| 选项                 | 说明                                     |
| ---------------------- | ------------------------------------------ |
| -p, --parallel<num>  | 设置并发连接数（默认：2）                |
| -t, --timeout<num>   | 设置连接超时时间（毫秒，默认：30000）    |
| -o, --output<path>   | 设置结果保存路径（默认：当前工作目录）      |
| -s, --search<string> | 搜索关键词                               |
| -b, --base<url>      | 自定义起始页URL                          |
| -x, --proxy<url>     | 使用代理服务器                           |




## 📌 Notes

- 本程序至抓取所有磁链中，体积最大的磁链。

### ❗如何更换防屏蔽地址

在 `src/core/config.ts` 文件中，修改相应的配置内容并重新编译安装：

```typescript
    constructor() {
        this.config = {
            DEFAULT_TIMEOUT: 30000,
            BASE_URL: 'https://www.fanbus.ink',
            searchUrl:'/search',
            parallel: 2,
            headers: {
                Referer: 'https://www.fanbus.ink/',
                Cookie: 'existmag=mag'
            },
            output: path.join(userHome, 'magnets'),
            search: null,
            base: null,
            nomag: false,
            allmag: false,
            nopic: false
        };
```

或者在命令行中使用 `-b` 选项指定自定义起始页URL：


```bash
$ jav -b https://www.fanbus.ink/
```

## 👥 Contributors

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
