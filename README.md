# jav-scrapy

一个可以爬取 AV 磁力链接或影片封面的小爬虫。

![anim.gif](https://ooo.0o0.ooo/2015/10/31/56345cf140299.gif "anim.gif")


### 前提条件
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

## Installation

```bash
# 通过npm全局安装
$ npm install -g .

# 验证安装
$ jav --version
```

## Usage

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

### 命令行选项说明
| 选项 | 说明 |
|------|------|
| -p, --parallel <num> | 设置并发连接数（默认：2） |
| -t, --timeout <num> | 设置连接超时时间（毫秒，默认：30000） |
| -l, --limit <num> | 限制抓取影片数量（0表示无限制，默认：0） |
| -o, --output <path> | 设置结果保存路径（默认：~/magnets） |
| -s, --search <string> | 搜索关键词 |
| -b, --base <url> | 自定义起始页URL |
| -x, --proxy <url> | 使用代理服务器 |
| -n, --nomag | 抓取尚无磁链的影片 |
| -a, --allmag | 抓取所有磁链（默认只抓取最大体积的） |
| -N, --nopic | 不抓取图片 |




## Features

- 自动抓取影片磁力链接和封面图片
- 支持并发下载，可自定义并发数
- 支持代理服务器配置
- 支持关键词搜索过滤
- 结果自动保存到指定目录

## Notes

- Windows 用户注目，如在 jav-scrapy 目录下直接运行 `jav` 命令可能会报错，可参考 [issue #1](https://github.com/raawaa/jav-scrapy/issues/1) 。
- 若影片存在高清资源，则优先抓取高清磁链。

### ❗如何更换防屏蔽地址

在项目文件夹下的 `jav.js` 文件中更换如下行的地址（大致在第18行），并保存即可：
```javascript
const baseUrl = 'https://www.buscdn.life/';
```

## Contributors

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
