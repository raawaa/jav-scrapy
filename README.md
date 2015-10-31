#jav-scrapy

jav-scrapy，一个爬取 AV 磁力链接的小爬虫。

![anim.gif](https://ooo.0o0.ooo/2015/10/31/56345cf140299.gif "anim.gif")

## Prequisites

- Node.js 4.2.1+

## Installation

```bash
$ git clone https://git.coding.net/raawaa/jav-scrapy.git
$ cd jav-scrapy
$ npm install # 安装npm包依赖
$ npm link # 使jav-scrapy全局可执行
```

## Usage

```bash
  Usage: jav [options]

  Options:

    -h, --help            output usage information
    -V, --version         output the version number
    -p, --parallel <num>  设置抓取并发连接数，默认值：2
    -t, --timeout <num>   自定义连接超时时间(毫秒)。默认值：10000
    -l,  --limit <num>    设置抓取影片的数量上限，0为抓取全部影片。默认值：0
    -o, --output <path>   设置磁链抓取结果的保存位置，默认为当前用户的主目录下的magnets.txt文件
```

## Todo

- ~~让 jav-scrapy 的操作方式更像原生命令行程序~~
- 只抓取某一类型的影片磁链
- 加影片磁链保存至本地数据库
- 增量抓取
