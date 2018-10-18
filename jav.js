#!/usr/bin/env node

'use strict';
var cheerio = require('cheerio');
var request = require('request');
var async = require('async');
require('colors');
var program = require('commander');
var userHome = require('user-home');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
const _ = require('lodash');
//var archiver = require('archiver');//下版会加入打包截图文件夹为zip，压缩包也很方便可以用hamana方便阅览

// global var

const VERSION = require('./package.json').version;

program
  .version('VERSION')
  .usage('[options]')
  .option('-o, --output <file_path>', '保存位置，勿含空格半角括号单引号和文件名不允许的符号，已有的文件会跳过 \n\
  ★例：-o E:|!!!javbus-genre|妹[-s]|，默认为D:|javbus|(|替换为右斜杠)', 'd:\jav') 
  //可更改最后一逗号内为默认保存位置，可参考下面：
  //默认为D:|jav| ', 'd:\jav' 
  //默认为用户目录|magnets| ', path.join(userHome, 'magnets') 
  .option('-w, --www <string>', '自定义域名, 默认www.javbus.com \n\
  ★一直timeout链接失败时可改为www.javbus.in .me .us .pw www.javbus2.com www.seedmm.com www.busjav.cc www.busdmm.net www.dmmsee.net等；地址发布页https://announce.seedmm.com/website.php')
  .option('-s, --search <string>', '搜索关键词，可繁中/日文/番号，单词勿含空格，如只搜番号须加入-，不设置则为从网站首页开始！')
  .option('-i, --inclass <string>', '在某类搜索代码，如star女优、label发行商、studio制作商、series系列、genre类别，搜索关键词则必须为其中代码！（网站点入影片右方链接中找）')
  .option('-u, --uncensored', '切换至无码(默认有码)，适用于上面所有搜索和类')
  .option('-b, --base <url>', '自定义抓取起始页，有关键词则此无效，例如可用来抓某类别1j：-b http://www.javbus.in/genre/1j（但如不限制一页即-l 30则有问题推荐用jgenre；另网址search/后面的关键字不能是汉字/日文，可网页搜后复制过来）')
  .option('-l, --limit <num>', '抓取影片数量上限，一般一页30个，0即默认不设置为抓取全部影片', 0)
  .option('-a, --allmag', '抓取影片的所有磁链(默认只抓取最高清磁链)')//如何改为默认都抓？？
  .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：10', 5)
  .option('-t, --timeout <num>', '设置连接超时时间(毫秒)。默认值：5000毫秒', 5000)
  .option('-x, --proxy <url>', '设置代理服务器, 例：-x http://127.0.0.1:8087')
  .parse(process.argv);

var output = program.output.replace(/['"]/g, '');
var baseUrl = 'https://' + ( program.www || 'www.javbus.com' ); 
//timeout链接失败时可更改jav.js代码的48行域名为.com(默认) .in .me .us .pw javbus2.com seedmm.com，地址发布页https://announce.seedmm.com/website.php
var searchUrl = '/' + ( program.inclass || 'search' );
//改为genre可获取类别，改为studio/label可获取公司/发行商(代码见网站)前加uncensored/才能获取无码类别、公司、发行商
if (program.uncensored) {searchUrl = '/uncensored' + searchUrl };  //有-u时加入/uncensored/
var pageIndex = 1;
var currentPageHtml = null;
var count = parseInt(program.limit);
var hasLimit = (count !== 0),
  targetFound = false;
var errorCount = 0;
var parallel = parseInt(program.parallel);
var timeout = parseInt(program.timeout) || 5000;
var proxy = process.env.http_proxy || program.proxy; // console.log('proxy: ', proxy);
request = request.defaults({
  timeout: timeout,
  headers: {
    'Referer': 'http://www.javbus2.com',
    'Cookie': 'existmag=all'
  }
});
if (proxy) {
  request = request.defaults({
    'proxy': proxy
  });
}

console.log('保存位置:%s =========================================================='.green.bold, output);
console.log('网站地址:%s'.green.bold, baseUrl.green, searchUrl.green + '/'.green + (program.search ? program.search : ' ').green, ' 限制数量:'.green + (count / 0).toString().green.bold, ' 代理设置:'.green + (proxy ? proxy : '无').green.bold, ' 并行连接:'.green + parallel.toString().green.bold, ' 连接超时:'.green + (timeout / 1000.0).toString().green.bold + '秒'.green);


/****************************
 *****************************
 **** MAIN LOOP START ! ******
 ****************************
 ****************************/

mkdirp.sync(output);

async.during(
  pageExist,
  // when page exist
  function(callback) {
    async.waterfall(
      [parseLinks, getItems],
      function(err) {
        pageIndex++;
        if (err) return callback(err);
        return callback(null);
      });
  },
  // page not exits or finished parsing
  function(err) {
    if (err) {
		console.log('抓取过程终止：%s'.red.bold, err.message);
		console.log('★一直timeout链接失败时可设域名参数 -w www.javbus.in或.me .us .pw www.javbus2.com www.seedmm.com www.busjav.cc www.busdmm.net www.dmmsee.net等，地址发布页https://announce.seedmm.com/website.php'.red);
      return process.exit(1);
    }
    if (hasLimit && (count < 1)) {
      console.log('已尝试抓取%s部影片，本次抓取完毕'.green.bold, program.limit);
    } else {
      console.log('没有更多影片了，抓取完毕'.green.bold);
    }
    return process.exit(0); // 不等待未完成的异步请求，直接结束进程
  }
);

/****************************
 *****************************
 **** MAIN LOOP END ! ******
 ****************************
 ****************************/

function parseLinks(next) {
  let $ = cheerio.load(currentPageHtml);
  let links = [],
    fanhao = [];
  let totalCountCurPage = $('a.movie-box').length;
  if (hasLimit) {
    if (count > totalCountCurPage) {
      $('a.movie-box').each(link_fanhao_handler);
    } else {
      $('a.movie-box').slice(0, count).each(link_fanhao_handler);
    }
  } else {
    $('a.movie-box').each(link_fanhao_handler);
  }
  if (program.search && links.length == 1) {
    targetFound = true;
  }

  function link_fanhao_handler() {
    let link = $(this).attr('href');
    links.push(link);
    fanhao.push(link.split('/').pop());
  }

  console.log('正处理以下番号影片...\n'.green + fanhao.toString().yellow);
  next(null, links);
}

function getItems(links, next) {
  async.forEachOfLimit(
    links,
    parallel,
    getItemPage,
    function(err) {
      if (err) {
        if (err.message === 'limit') {
          return next();
        }
        throw err;
      }
      console.log('===== 第%d页处理完毕 ====='.green, pageIndex);
      console.log();
      return next();
    });
}

function pageExist(callback) {
  if (hasLimit && (count < 1) || targetFound) {
    return callback();
  }
  var url = baseUrl + (pageIndex === 1 ? '' : ('/page/' + pageIndex));
  if (program.search) {
    url = baseUrl + searchUrl + '/' + encodeURI(program.search) + (pageIndex === 1 ? '' : ('/' + pageIndex));
	// 优先使用搜索关键词
  } else if (program.base) {
    url = program.base + (pageIndex === 1 ? '' : ('/' + pageIndex));
	// 没关键词时使用起始页
  } else {
    // 只在没有指定搜索条件时显示
    console.log('获取第%d页中的影片链接 ( %s )...'.green, pageIndex, url);
  }

  let retryCount = 1;
  async.retry(3,
    function(callback) {
      let options =  program.nomag ? { url: url, headers: { 'Cookie': 'existmag=all' } } : { url: url };
      request
        .get(url, function(err, res, body) {
          if (err) {
            if (err.status === 404) {
              console.error('已抓取完所有页面, StatusCode:', err.status);
            } else {
              retryCount++;
              console.error('第%d页页面获取失败：%s'.red, pageIndex, err.message);
              console.error('...进行第%d次尝试...'.red, retryCount);
            }
            return callback(err);
          }
          currentPageHtml = body;
          return callback(null, res);
        });
    },
    function(err, res) {
      if (err) {
        if (err.status === 404) {
          return callback(null, false);
        }
        return callback(err);
      }
      callback(null, res.statusCode == 200);
    });
}

function parse(script) {
  let gid_r = /gid\s+=\s+(\d+)/g.exec(script);
  let gid = gid_r[1];
  let uc_r = /uc\s+=\s(\d+)/g.exec(script);
  let uc = uc_r[1];
  let img_r = /img\s+=\s+\'(\http.+\.jpg)/g.exec(script);
  let img = img_r[1];
  return {
    gid: gid,
    img: img,
    uc: uc,
    lang: 'zh'
  }; 
}

function getItemPage(link, index, callback) {
  let fanhao = link.split('/').pop();
  let coverFilePath = path.join(output + '.jpg');//封面保存位置去掉子文件夹
  let magnetFilePath = path.join(output, fanhao + '.json'); //改为output指json信息文件都存放于output下（无子文件夹）
  if (hasLimit) {
    count--;
  }
    request
      .get(link, function(err, res, body) {
        if (err) {
          console.error(('[' + fanhao + ']').red.bold.inverse + ' ' + err.message.red);
          return callback(null);
        }
        let $ = cheerio.load(body);
        let script = $('script', 'body').eq(2).html();
        let meta = parse(script);
		// 提取标题
		meta.title = $('h3').text().replace(/[\f\n\r\t\v]|[\]|[ | ]{3,}|<\/?[^>]*>/g, '');//去掉换行制表符等空字符，去掉3个以上空格、HTML tag
		// 提取日期 时长 制作商 发行商 系列
        $('div.col-md-3 > p ').each(function(i, e){
          let text = $(e).text();
          if(text.includes('發行日期:')){
            meta.date = text.replace('發行日期: ', '');
          }else if(text.includes('長度:')){
            meta.length = text.replace(/長度:|[\f\n\r\t\v]|[\]|[ | ]{3,}|<\/?[^>]*>/g, '');//增加输出！去掉换行符行尾行前空白、HTML tag
          }else if(text.includes('製作商:')){
            meta.studio = text.replace(/製作商:|[\f\n\r\t\v]|[\]|[ | ]{3,}|<\/?[^>]*>/g, '');//增加输出！去掉换行符行尾行前空白、HTML tag
          }else if(text.includes('發行商:')){
            meta.label = text.replace(/發行商:|[\f\n\r\t\v]|[\]|[ | ]{3,}|<\/?[^>]*>/g, '');//增加输出！去掉换行符行尾行前空白、HTML tag
          }else if(text.includes('系列:')){
            meta.series = text.replace(/系列:|[\f\n\r\t\v]|[\]|[ | ]{3,}|<\/?[^>]*>/g, '');//去掉换行符行尾行前空白、HTML tag
          }
		});
		// 提取类别，没问题了！
		meta.genre = [];
		$('span.genre').each(function (i, a) {
          let $a = $(a);
          if(!$a.attr('onmouseover')){
            meta.genre.push($a.text());
		  }
        });
        // 提取演员
		meta.star = [];
        $('span.genre').each(function (i, e) {
          let $e = $(e);
		  /* if($span.attr('genre')){
			meta.genre.push($e.text());
		  }else */ if($e.attr('onmouseover')){
			meta.star.push($e.find('a').text().replace(/[\f\n\r\t\v]|[\]|[ | ]{3,}|<\/?[^>]*>/g, ''));//去掉换行符行尾行前空白、HTML tag
          }
        });        
		
		//获取信息
        getItemMagnet(link, meta, callback);

        // 所有截图link
        var snapshots = []
        $('a.sample-box').each(function (i, e) {
          let $e = $(e);
          snapshots.push($e.attr('href'))
        })
        getSnapshots(link, snapshots);//获取截图
      });
}

//获取信息json&磁链部分
function getItemMagnet(link, meta, done) {
	function text2size(text) {
        let re = /([0-9.]+)([GMTK]B)/i;
        let found = _.trim(text).match(re);
        if (found) {
            let num = found[1];
            let unit;
            switch (found[2]) {
                case 'GB':
                    unit = 1000;
                    break;
                case 'MB':
                    unit = 1;
                    break;
                default:
                    unit = 0;
                    break;
            }
            return num * unit;
        } else {
            return 0;
        }
    }
	let fanhao = link.split('/').pop();
	let itemOutput = output + "/" +  'json'; //itemOutput为子文件夹，这里指json信息文件都存放于output-json下
	mkdirp.sync(output);
	let magnetFilePath = path.join(output, fanhao + '.json'); //改为output指json信息文件都存放于output下（无子文件夹）
	let jsonInfo = {
		title: meta.title,
		data: meta.date,
		length: meta.length,
		studio: meta.studio,
		label: meta.label,
		series: meta.series,
		genre: meta.genre,
		star: meta.star
    }; //获取信息
	fs.access(magnetFilePath, fs.F_OK, function (err) {
		if (err) {
			request
				.get(baseUrl + '/ajax/uncledatoolsbyajax.php?gid=' + meta.gid + '&lang=' + meta.lang + '&img=' + meta.img + '&uc=' + meta.uc + '&floor=' + Math.floor(Math.random() * 1e3 + 1),
					function(err, res, body) {
						if (err) {
							console.error(('[' + fanhao + ']').red.bold.inverse + ' ' + err.message.red);
							return done(null); // one magnet fetch fail, do not crash the whole task.
						}
						const $ = cheerio.load(body);
						if ($('tr').eq(-1).children('td').eq(1).children('a').text()) {
							let mag_sizes = $('tr').map(function readMagnetAndSize(i, e) {
								let anchorInSecondTableCell = $(e).children('td').eq(1).children('a');
								return {
									magnet: anchorInSecondTableCell.attr('href'),
									size: text2size(anchorInSecondTableCell.text()),
									sizeText: _.trim(anchorInSecondTableCell.text())
								};
							}).get();
							//mag_sizes = _.orderBy(mag_sizes, 'size', 'desc');//此行有问题！
							const magOrdered = _.map(mag_sizes, x => x.magnet);
							jsonInfo.magnets = program.allmag ? magOrdered : _.slice(magOrdered, 0, 1);
							fs.writeFile(path.join(output, fanhao + '-magnet.txt'), jsonInfo.magnets.toString().replace(/,/g, '\r\n'), function (err) { // 写入磁链txt，都存放于output下（无子文件夹），原8.0多行在windows输出的txt有问题，将replace处改了
								if (err) {
									throw err;
								}
								console.log(('[' + fanhao + ']').green.bold.inverse + '[磁链]'.yellow.inverse + '影片磁链已抽出为txt'.grey);
								//console.log(jsonInfo.magnets);
							});
						}
						fs.writeFile(magnetFilePath, JSON.stringify(jsonInfo,'','\t'), // 写入json信息文件，中间插入本来是\t，改为\r\n后windows记事本打开是换行无缩进了但json打开难看出现一堆LF CRLF CRLF
							function (err) {
								if (err) {
									throw err;
								}
								console.log(('[' + fanhao + ']').green.bold.inverse + '[信息]'.yellow.inverse + '影片信息已抓取');
								getItemCover(link, meta, done);
						});
					});
		} else {
			console.log(('[' + fanhao + ']').green.bold.inverse + '[信息]'.yellow.inverse, 'file already exists, skip!'.yellow);
			getItemCover(link, meta, done);
		}
	})
}

//获取封面部分
function getItemCover(link, meta, done) {
  var fanhao = link.split('/').pop();
  var title = meta.title.replace(/[\\\/\*\?\:\"\|\<\>]/g, ' ').substring(0, 200);//去掉标题中windows文件名不许出现的字符 防止标题过长
  var star = meta.star.toString().replace(/[\\\/\*\?\:\"\|\<\>]/g, ' ').substring(0, 100);//使演员信息变为字符串 防止演员过长
  var date = meta.date.substring(2).replace(/[\-]/g, '');
  var fullname = (title + ' -' + star).substring(0, 220) + '['+ date + '].jpg';//图片命名为标题 -演员[日期].jpg
  mkdirp.sync(output);//改为output
  var fileFullPath = path.join(output, fullname);//图片保存位置改为output
  fs.access(fileFullPath, fs.F_OK, function(err) {
    if (err) {
      var coverFileStream = fs.createWriteStream(fileFullPath + '.part');
      var finished = false;
      request.get(meta.img)
        .on('end', function() {
          if (!finished) {
            try{
				fs.renameSync(fileFullPath + '.part', fileFullPath);
				finished = true;
			}catch(e){}
            console.error(('[' + fanhao + ']').green.bold.inverse + '[封面]'.yellow.inverse + fullname);
            return done();
          }
        })
        .on('error', function(err) {
          if (!finished) {
            finished = true;
            console.error(('[' + fanhao + ']').red.bold.inverse + '[封面]'.yellow.inverse, err.message.red);
            return done();
          }
        })
        .pipe(coverFileStream);
    } else {
      console.log(('[' + fanhao + ']').green.bold.inverse + '[封面]'.yellow.inverse, 'file already exists, skip!'.yellow);
      return done();
    }
  })
}


//获取截图部分
function getSnapshots(link, snapshots) {
    // https://pics.dmm.co.jp/digital/video/118abp00454/118abp00454jp-1.jpg
	let fanhao = link.split('/').pop();
    let itemOutput = output + "/" + fanhao;//存储位置仍在名为番号的子文件夹，方便独立打包压缩
 	fs.access(itemOutput + ".rar", fs.F_OK, function (err) {//有rar时跳过
		if (err) {
			for (var i = 0; i < snapshots.length; i++){//循环下截图
				getSnapshot(link, snapshots[i]);
			}
			console.log(('[' + fanhao + ']').green.bold.inverse + '[截图]'.yellow.inverse + '影片截图已尝试处理'.grey) ;//◀◀◀◀◀◀◀◀◀◀◀◀◀◀这里目前还不能显示'file already exists, skip!'.yellow
		} else {
			console.log(('[' + fanhao + ']').green.bold.inverse + '[截图]'.yellow.inverse, 'file already exists, skip!'.yellow); //每个截图单独的log
		}
	}) 
}

//每个截图
function getSnapshot(link, snahpshotLink) {
    let fanhao = link.split('/').pop();
    let itemOutput = output + "/" + fanhao;
    mkdirp.sync(itemOutput);
    let snapshotName = snahpshotLink.split('/').pop();
    let fileFullPath = path.join(itemOutput, snapshotName)
	fs.access(fileFullPath, fs.F_OK, function (err) {
		if (err) {
			var snapshotFileStream = fs.createWriteStream(fileFullPath + '.part');
			var finished = false;
			request.get(snahpshotLink)
				.on('end', function () {
					if (!finished) {
						try{
							fs.renameSync(fileFullPath + '.part', fileFullPath);
						}catch(e){}			
						//◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀◀能用但会把没下完的也删了！
						/* if (fs.statSync(fileFullPath).size < 2733) {
							fs.unlinkSync(fileFullPath);	//删除大小为0或2,732字节的图片或par
							console.log('删除了一个空截图：' + fileFullPath); //删每个空截图单独的log
						} */
						finished = true;
						//console.log(('[' + fanhao + ']').green.bold.inverse + '[截图]'.yellow.inverse, snapshotName);
					}
				})
				.on('error', function (err) {
					if (!finished) {
						finished = true;
						console.error(('[' + fanhao + ']').red.bold.inverse + '[截图]'.yellow.inverse, err.message.red);
					}
				})
				.pipe(snapshotFileStream);

		} else {
			//console.log(('[' + fanhao + ']').green.bold.inverse + '[截图]'.yellow.inverse, 'file already exists, skip!'.yellow); //每个截图单独的log
		}
	})

}
