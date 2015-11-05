#jav-scrapy

一个可以爬取 AV 磁力链接或影片封面的小爬虫。

![anim.gif](https://ooo.0o0.ooo/2015/10/31/56345cf140299.gif "anim.gif")

## Prequisites

- Node.js 4.2.1+

## Installation

```bash
$ git clone https://git.coding.net/raawaa/jav-scrapy.git
$ cd jav-scrapy
$ npm install # 安装npm包依赖
$ npm link    # 使jav-scrapy全局可执行
```

## Usage

```bash
  Usage: jav [options]

  Options:

    -h, --help                output usage information
    -V, --version             output the version number
    -p, --parallel <num>      设置抓取并发连接数，默认值：2
    -t, --timeout <num>       自定义连接超时时间(毫秒)。默认值：10000
    -l, --limit <num>         设置抓取影片的数量上限，0为抓取全部影片。默认值：0
    -o, --output <file_path>  设置磁链抓取结果的保存位置，默认为当前用户的主目录下的 magnets.txt 文件
    -s, --search <string>     搜索关键词，可只抓取搜索结果的磁链或封面
    -b, --base <url>          自定义抓取的起始页
    -c, --cover <dir>         只抓取封面而不抓取磁链，并将封面图片文件保存至目录 <dir> 中。当 --output 选项存在时，此选项不起作用
```

### Examples

```bash
# 下载所有影片封面到 /path/to/covers/ 目录下，图片文件名为番号，并行下载数为 10
$ jav -c /path/to/covers/ -p 10         

# 抓取 ipz 开头的所有番号的磁链，并保存在 /path/to/magnets.txt 中，并行抓取数 20
$ jav -s ipz -p 20 -o /path/to/magnets.txt 

# 抓取 ipz 开头的所有番号的封面，并保存在 /path/to/covers/ 目录中，并行抓取数 20
$ jav -s ipz -p 20 -c /path/to/covers/ 

# 抓取番号 ipz-634 这部影片的磁链保存在 /path/to/magnets.txt 中
$ jav -s ipz-634 -o /path/to/magnets.txt

# 抓取「连裤袜」主题的所有影片磁链，保存在 /path/to/magnets.txt 中，并行抓取数 10
$ jav -b http://www.javbus.in/genre/28 -p 10 -o ~/magnets.txt
```

## Notes

- Windows 用户注目，如在 jav-scrapy 目录下直接运行 `jav` 命令可能会报错，可参考 [issue #1](https://github.com/raawaa/jav-scrapy/issues/1) 。
- 若影片存在高清资源，则优先抓取高清磁链。

## Contributors

- [@qiusli](https://github.com/qiusli)
