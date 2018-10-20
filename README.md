# jav-scrapy

一个可以爬取 javbus 网站的小爬虫
-- 修改版，增加-w -i -u参数以便进阶抓取；调整log使输出更直观；将封面重命名为番号标题-演员[日期].jpg，并和信息.json，磁链.txt保存到一个主文件夹下，截图在各子文件夹方便之后手动批量打包。

![anim.gif](https://ooo.0o0.ooo/2015/10/31/56345cf140299.gif "anim.gif")

## Prequisites

- Node.js 4.2.1+

## Installation

```bash
$ git clone https://github.com/raawaa/jav-scrapy.git
$ cd jav-scrapy
$ sudo npm link    # 安装npm包依赖并使jav-scrapy全局可执行
```

## Usage

```bash
  Usage: jav [options]

  Options:
  -h, --help                output usage information
  -V, --version             output the version number
  -o, --output <file_path>  保存位置，勿含空格半角括号单引号和文件名不允许的符号，已有的文件会跳过
    ★例：-o E:|!!!javbus-genre|妹[-s]|，默认为D:|jav|(|替换为右斜杠)
  -w, --www <string>        自定义域名, 默认www.javbus.com
    ★一直timeout链接失败时可改为www.javbus.in .me .us .pw www.javbus2.com www.seedmm.com www.busjav.cc www.busdmm.net www.dmmsee.net等；地址发布页https://announce.seedmm.com/website.php
  -s, --search <string>     搜索关键词，可繁中/日文/番号，单词勿含空格，如只搜番号须加入-，不设置则为从网站首页开始！
  -i, --inclass <string>    在某类搜索代码，如star女优、label发行商、studio制作商、series系列、genre类别，搜索关键词则必须为其中代码！（网站点入影片右方链接中找）
  -u, --uncensored          切换至无码(默认有码)，适用于上面所有搜索和类
  -b, --base <url>          自定义抓取起始页，有关键词则此无效，例如可用来抓某类别1j：-b http://www.javbus.in/genre/1j（网址如search/后的关键字不能是汉字/日文，可网页搜后复制过来）
  -l, --limit <num>         抓取影片数量上限，一般一页30个，0即默认不设置为抓取全部影片
  -a, --allmag              抓取影片的所有磁链(默认只抓取最高清磁链)
  -p, --parallel <num>      设置抓取并发连接数，默认值：5
  -t, --timeout <num>       设置连接超时时间(毫秒)。默认值：5000毫秒
  -x, --proxy <url>         设置代理服务器, 例：-x http://127.0.0.1:8087
```

### Examples

```bash
# 抓取最近1000个影片封面、磁链、片段截图，保存到 d:\jav 目录下
$ jav -l 1000

# 抓取番号以 ipz 开头的所有影片，并保存在 /path/to/folder 中（windows指%UserData%\path\to\folder）
$ jav -s ipz -o /path/to/folder

# 抓取番号为 ipz-634 的影片，域名www.javbus.in好用
$ jav -s ipz-634 -w www.javbus.in

# 抓取代码为a的主题的所有影片(各主题代码请在浏览器链接上找)
$ jav -s a -i genre

# 抓取代码为a的演员的所有无码影片(各演员代码请在浏览器链接上找)
$ jav -s a -i star -u

# 使用代理
$ jav -x http://127.0.0.1:8087
```

## Notes

- GUI现有更多功能，如方便的测试和翻译按钮、支持如html或JbusDriver等app生成的含多番号的类文本中所有影片批量抓取、安装帮助等。需自行编译.e。
- Windows系统安装目录为%AppData%\npm\node\modules\jav-scarpy。如在 jav-scrapy 目录下直接运行 `jav` 命令可能会报错，可参考 [issue #1](https://github.com/raawaa/jav-scrapy/issues/1) 。

## Contributors

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
- [@McNEET](https://github.com/McNEET)
