#!/usr/bin/env node

'use strict';
var vo = require('vo');
var cheerio = require('cheerio');
var request = require('superagent');
var async = require('async');
var colors = require('colors');
var program = require('commander');
var ProgressBar = require('progress');
var userHome = require('user-home');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');

var noop = function noop() {};

// global var
const baseUrl = 'http://www.javbus.in';
const searchUrl = '/search'
var pageIndex = 1;
var currentPageHtml = null;

program
  .version('0.3.3')
  .usage('[options]')
  .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2', 2)
  .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：10000')
  .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0', 0)
  .option('-o, --output <file_path>', '设置磁链抓取结果的保存位置，默认为当前用户的主目录下的 magnets.txt 文件', path.join(userHome, 'magnets.txt'))
  .option('-s, --search <string>', '搜索关键词，可只抓取搜索结果的磁链或封面')
  .option('-b, --base <url>', '自定义抓取的起始页')
  .option('-c, --cover <dir>', '只抓取封面而不抓取磁链，并将封面图片文件保存至目录 <dir> 中。当 --output 选项存在时，此选项不起作用')
  .parse(process.argv);


var parallel = parseInt(program.parallel);
var timeout = parseInt(program.timeout) || 10000;
// 如果是下载封面，调整连接超时为30秒
if (program.cover && !program.timeout) {
  timeout = 30000;
}

var count = parseInt(program.limit), coverLeft = count;
var hasLimit = (count !== 0);
var output = program.output.replace(/['"]/g, '');

var progress;
if (hasLimit) {
  debugger;
  console.log();
  progress = new ProgressBar('总进度(:current/:total): [:bar]', {
    total: count,
    width: 50,
    incomplete: '-'.gray,
    complete: '='.bold
  });
}

console.log('========== 获取资源站点：%s =========='.green.bold, baseUrl);
console.log('并行连接数：'.green, parallel.toString().green.bold, '      ',
  '连接超时设置：'.green, (timeout / 1000.0).toString().green.bold, '秒'.green);
if (!program.cover) {
  console.log('磁链保存位置: '.green, output.green.bold);
} else {
  console.log('封面保存位置: '.green, path.normalize(program.cover).green.bold);
}

/****************************
 *****************************
 **** MAIN LOOP START ! ******
 ****************************
 ****************************/
async.during(
  pageExist,
  // when page exist
  function(callback) {
    let pageTasks = [parseLinks, getItems];

    async.waterfall(
      pageTasks,
      function(err, result) {
        pageIndex++;
        if (err) return callback(err);
        callback(null);
      });
  },
  // page not exits or finished parsing
  function(err) {
    if (err) {
      console.log('抓取过程终止：%s', err.message);
      return process.exit(1);
    }
    if (hasLimit && (count < 1 || coverLeft < 1)) {
      console.log('已抓取%s个%s，本次抓取完毕'.green.bold,
                  program.limit, 
                  ( program.cover ? '封面' : '磁链' ));
      return process.exit(0); // 不等待未完成的异步请求，直接结束进程
    }
  }
);

/****************************
 *****************************
 **** MAIN LOOP END ! ******
 ****************************
 ****************************/

function parseLinks(next) {
  let $ = cheerio.load(currentPageHtml);
  let links = [], fanhao = [];
  let totalCoverCurPage = $('a.movie-box').length;
  if(coverLeft > totalCoverCurPage) {
    $('a.movie-box').each(link_fanhao_handler);
  } else {
    $('a.movie-box').slice(0, coverLeft).each(link_fanhao_handler);
  }

  function link_fanhao_handler(i, elem) {
    let link = $(this).attr('href');
    links.push(link);
    fanhao.push(link.split('/').pop());
  }
  
  console.log('正处理以下番号影片...'.green);
  console.log(fanhao.toString().yellow)
  next(null, links);
}

function getItems(links, next) {
  async.forEachOfLimit(
    links,
    parallel,
    getItemPage,
    function(err) {
      if (err) {
        if(err.message === 'limit') {
          return next();
        }
        throw err;
        return next(err);
      };
      console.log('===== 第%d页处理完毕 ====='.green, pageIndex);
      console.log();
      return next();
    });
}

function pageExist(callback) {
  if (hasLimit && (count < 1 || coverLeft < 1)) {
    return callback();
  }
  var url = baseUrl + (pageIndex === 1 ? '' : ('/page/' + pageIndex));
  if (program.search) {
    url = baseUrl + searchUrl + '/' + program.search + (pageIndex === 1 ? '' : ('/' + pageIndex));
  } else if (program.base) {
    url = program.base + (pageIndex === 1 ? '' : ('/' + pageIndex));
  }

  console.log('获取第%d页中的影片链接 ( %s )...'.green, pageIndex, url);
  let retryCount = 1;
  async.retry(3,
    function(callback, result) {
      request
        .get(url)
        .set("Cookie", program.cover ? "existmag=all" : "existmag=mag")
        .timeout(timeout)
        .redirects(2)
        .end(function(err, res) {
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
          currentPageHtml = res.text;
          callback(null, res);
        });
    },
    function(err, res) {
      if (err) {
        if(err.status === 404) {
            return callback(null, false);
        }
        return callback(err);
      }
      callback(null, res.ok);
    });
}

function parse(script) {
  let gid_r = /gid\s+=\s+(\d+)/g.exec(script);
  let gid = gid_r[1];
  let uc_r = /uc\s+=\s(\d+)/g.exec(script);
  let uc = uc_r[1];
  let img_r = /img\s+=\s+\'(\http:.+\.jpg)/g.exec(script);
  let img = img_r[1];
  return {
    gid: gid,
    img: img,
    uc: uc,
    lang: 'zh'
  };
}

function getItemPage(link, index, callback) {
  request
    .get(link)
    .timeout(timeout)
    .end(function(err, res) {
      if (hasLimit && count < 1) {
        return callback(new Error('limit'));
      };
      if (err) {
        if (!progress)
          console.error('番号%s页面获取失败：%s'.red, link.split('/').pop(), err.message);
        return callback(null);
      } else {
        let $ = cheerio.load(res.text);
        let script = $('script', 'body').eq(2).html();
        let meta = parse(script);
        if (!program.cover) {
          getItemMagnet(link, meta, callback);
        } else {
          mkdirp.sync(program.cover);
          getItemCover(link, meta, callback);
        }
      }
    });
}

function getItemMagnet(link, meta, done) {
  request
    .get( baseUrl 
         + "/ajax/uncledatoolsbyajax.php?gid=" 
         + meta.gid 
         + "&lang=" + meta.lang 
         + "&img=" + meta.img 
         + "&uc=" + meta.uc 
         + "&floor=" + Math.floor(Math.random() * 1e3 + 1) )
    .set('Referer', 'http://www.javbus.in/SCOP-094')
    .timeout(timeout)
    .end(function(err, res) {
      let fanhao = link.split('/').pop();
      if (hasLimit && count < 1) {
        return done(new Error('limit'));
      };
      if (err) {
        if (!progress)
          console.error('番号%s磁链获取失败: %s'.red, link.split('/').pop(), err.message);
        return done(null); // one magnet fetch fail, do not crash the whole task.
      };
      let $ = cheerio.load(res.text);
      // 尝试解析高清磁链
      let HDAnchor = $('a[title="包含高清HD的磁力連結"]').parent().attr('href');
      // 尝试解析普通磁链
      let anchor = $('a[title="滑鼠右鍵點擊並選擇【複製連結網址】"]').attr('href');
      // 若存在高清磁链，则优先选取高清磁链
      anchor = HDAnchor || anchor;
      if (anchor) {
        mkdirp.sync(path.dirname(output)); // fix issue #3若若
        fs.appendFile(output, anchor + '\r\n', function(err) {
          if (err) {
            throw err;
            return done(err);
          };
          if (!progress) {
            console.log( ( '[' + fanhao + ']' ).green.bold.inverse + ( HDAnchor ? '[HD]'.blue.bold.inverse : '' ) + ' ' + anchor);
          }
          if (progress) {
            progress.tick();
          }
          count--;
        })
      }
      return done(null);
    });
}

function getItemCover(link, meta, done) {
  var fanhao = link.split('/').pop();
  var filename = fanhao + '.jpg';
  var fileFullPath = path.join(program.cover, filename);
  var coverFileStream = fs.createWriteStream(fileFullPath);
  var finished = false;
  request.get(meta.img)
    .timeout(timeout)
    .on('end', function() {
      if (!finished) {
        finished = true;
        console.log('[Finished]'.green.bold, fileFullPath);
        return done();
      };
    })
    .on('error', function(err) {
      debugger;
      if (!finished) {
        finished = true;
        console.error('[ Error  ]'.red.bold, fileFullPath, err.message.red);
        return done();
      };
    })
    .pipe(coverFileStream);
    coverLeft--;
}
