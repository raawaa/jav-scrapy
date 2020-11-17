# Jav-scrapy-GUI

一个可以爬取 javbus 网站的小爬虫 修改GUI版
- 在原作基础上，增加-w -i -u参数以便进阶抓取；调整log使输出更直观；将封面重命名为番号标题-演员[日期].jpg，并和信息.json，磁链.txt保存到一个主文件夹下，截图在各子文件夹方便之后手动批量打包。
- !GUI现有更多功能，如方便的测试和翻译按钮、支持如html或JbusDriver等app生成的含多番号的类文本中所有影片批量抓取、安装帮助等。为避免传播需自行编译.e，见谅。

![image](https://github.com/McNEET/jav-scrapy/blob/patch-1/Snap.png)
![image](https://github.com/McNEET/jav-scrapy/blob/patch-1/Snap_GUI.png)

## Easy installation & Usage

(本说明适用于Windows系统)
- 从node官网下载相应的node安装，windows系统直接运行msi安装；(http://nodejs.cn/download/)
- 下载我release中最新的zip包，解压；
- 用易语音静态编译其中的.e文件为.exe，放在相同位置；(易语言下载例如https://www.52pojie.cn/thread-1095238-1-1.html)
- 运行该exe，此时还不能抓取，请先仔细查看上面写的安装指南，即点击bat安装，之后会自动退出该程序；(bat内容：安装jav.js npm包依赖并在%ProgramFiles(x86)%下建立Jav-scrapy程序夹将除jav.js外所有文件拷入，建立桌面快捷方式)
- 运行桌面图标，检查状态即可。
- 注：
- Windows系统jav.js npm包安装目录为%AppData%\npm\node\modules\jav-scarpy，如在 jav-scrapy 目录下直接运行 `jav` 命令可能会报错(exe也不要放在jav.js同目录下抓取)，可参考 [issue #1](https://github.com/raawaa/jav-scrapy/issues/1) ；
- 已知问题1：代理失败，-x输入xxnet的代理不行unable to verify the first certificate，xx-net的话用全局会报证书问题；
- 已知问题2：截图经常下不好，很多空文件.part，不明原因；
- 已知问题3：从起始页抓取有问题，如不限制少于还剩的页数x30（每页有30项）则有毛病会不停循环；
- 已知问题4：极少数页面报错中断jav.js:210 let gid = gid_r[1]; TypeError: Cannot read property '1' of null，可能是由于网站页面结构更改的原因导致，暂时的解决办法可考虑从该页的下一页开始抓(起始页抓取处输入下页的地址)，注意要限制数量，如不限制少于还剩的页数x30（每页有30项）则有毛病会不停循环；
- 关于批量功能：批量文本功能可处理如html或JbusDriver等app生成的含多番号的类文本中所有影片批量抓取，批量目录则可将含番号的文件名中所有番号抽出抓取，非常适合更新完善信息。此功能依赖番号正则表达式查找，现用[0-Z]{2,6}\D-[0-9]{2,5}，去掉了类似2018-10这种，但少了类似abp1-001这种，另无码影片番号规律不太一样，暂支持不良。


## Prequisites

- Node.js 4.2.1+

## Manual installation of jav.js

```bash  #windows请用管理员方式打开命令行
$ git clone https://github.com/mcneet/jav-scrapy.git  #需要安装git；无git的可以下载zip解压至%AppData%\npm\node\modules\jav-scarpy下，放在其他目录GUI将无法使用
$ cd jav-scrapy  #转入该目录
$ sudo npm link  #安装npm包依赖并使jav-scrapy全局可执行；windows输入npm link即可
```

## Manual usage of jav.js

```bash
  Usage: jav [options]

  Options:
  -h, --help                output usage information
  -V, --version             output the version number
  -o, --output <file_path>  保存位置，勿含空格半角括号单引号和文件名不允许的符号，已有的文件会跳过
    ★例：-o E:|!!!javbus-genre|妹[-s]|，默认为D:|jav|(Windows系统|代表右斜杠，其他系统为左斜杠)
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


## Contributors

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
- [@McNEET](https://github.com/McNEET)
