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
    -l, --limit <num>    设置抓取影片的数量上限，0为抓取全部影片。默认值：0
    -o, --output <path>   设置磁链抓取结果的保存位置，默认为当前用户的主目录下的magnets.txt文件
    -s, --search <string> 根据关键词抓取磁链,如ipz只抓取ipz开头的番号,ipz-634则只抓取该番号的磁链
    -b, --base <url>      设置抓取起始页
    -c, --cover <dir>     只下载封面而不抓取磁链，封面保存在目录<dir>中。可配合--output之外的其他选项使用
```

### Examples

到此为止觉得已经够自己用的了，短期不会再更新了，放几个用例吧：

```bash
# 下载影片封面到~/porn_covers/目录下，图片文件名为番号，并行下载数为 10
$ jav -c ~/porn_covers/ -p 10         

# 抓取 ipz 开头的所有番号的磁链，并保存在~/magnets.txt 中，并行抓取数 20
$ jav -s ipz -p 20 -o ~/magnets.txt 

# 抓取番号 ipz-634 这部影片的磁链
$ jav -s ipz-634 -o ~/magnet.txt   

# 抓取「连裤袜」主题的所有影片磁链...并行数 10
$ jav -b http://www.javbus.in/genre/28 -p 10 -o ~/magnets.txt
```

## Todo

- ~~让 jav-scrapy 的操作方式更像原生命令行程序~~
- 只抓取某一类型的影片磁链
- 加影片磁链保存至本地数据库
- 增量抓取
