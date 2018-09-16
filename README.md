# jav-scrapy

一个可以爬取 AV 磁力链接或影片封面的小爬虫。

![anim.gif](https://ooo.0o0.ooo/2015/10/31/56345cf140299.gif "anim.gif")

## Prequisites

- Node.js 4.2.1+

## Installation

```bash
$ git clone https://github.com/raawaa/jav-scrapy.git
$ cd jav-scrapy
$ npm install # 安装npm包依赖
$ sudo npm link    # 使jav-scrapy全局可执行
```

## Usage

```bash
  Usage: jav [options]

  Options:

    -h, --help                output usage information
    -V, --version             output the version number
    -o, --output <file_path>  保存位置，勿含空格，已有的文件会跳过，例：-o E:|学习资料[18-06]|，默认为d:|javbus|(|替换为右斜杠)
    -s, --search <string>     搜索关键词，可中文/日文/番号，不设置则为从首页开始！番号必须后加-
    -l, --limit <num>         设置抓取影片的数量上限，0为抓取全部影片。默认值：0
    -b, --base <url>          自定义抓取起始页，例如可用来抓某类别1j：-b http://www.javbus.in/genre/1j（网址search/后面的关键字不能是汉字/日文，可网页搜后复制过来）
    -a, --allmag              抓取影片的所有磁链(默认只抓取文件体积最大的磁链)
    -n, --nomag               抓取尚无磁链的影片
    -x, --proxy <url>         设置代理，例：-x http://127.0.0.1:8087
    -p, --parallel <num>      设置抓取并发连接数，默认值：5
    -t, --timeout <num>       设置连接超时时间(毫秒)。默认值：5000毫秒
      一直timeout链接失败时可更改jav.js的18行域名为https://www.javbus.com .in .me .us .pw javbus2.com seedmm.com，
      地址发布页https://announce.seedmm.com/website.php
      (js位于Users-XXX-AppData-Roaming-npm-node_modules-jav-scarpy下)
```

### Examples

```bash
# 抓取所有影片封面、磁链、片段截图，保存到 d:/javbus 目录下，并行下载数为 10
$ jav -p 10

# 抓取番号以 ipz 开头的所有影片，并保存在 /path/to/folder 中，并行抓取数 20
$ jav -s ipz -p 20 -o /path/to/folder

# 抓取番号为 ipz-634 的影片
$ jav -s ipz-634

# 抓取il主题的所有影片(各主题代码请在浏览器链接上找)
$ jav -b http://www.javbus.in/genre/il

# 使用代理
$ jav -x http://127.0.0.1:8087
```

## Notes

- Windows 用户注目，如在 jav-scrapy 目录下直接运行 `jav` 命令可能会报错，可参考 [issue #1](https://github.com/raawaa/jav-scrapy/issues/1) 。
- 若影片存在高清资源，则优先抓取高清磁链。
- 网址被墙导致链接超时，可尝试自行修改jav.js代码18行域名为你找到的可用的。
- 如有其他需求如不需要小图、不建立子文件夹、图片命名为标题演员等的请参见其他branch或closed pull中别的同志的方案。

## Contributors

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
- [@McNEET](https://github.com/McNEET)
