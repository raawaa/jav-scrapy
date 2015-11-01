#!/usr/bin/env node

'use strict';
var vo = require('vo');
var Nightmare = require('nightmare');
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
    .version('0.3.0')
    .usage('[options]')
    .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2', 2)
    .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：10000')
    .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0', 0)
    .option('-o, --output <path>', '设置磁链抓取结果的保存位置，默认为当前用户的主目录下的magnets.txt文件', path.join(userHome, 'magnets.txt'))
    .option('-s, --search <string>', '搜索关键词')
    .option('-b, --base <url>', '自定义baseUrl')
    .option('-c, --cover <dir>', '只保存封面,至目录<dir>中')
    .parse(process.argv);


var parallel = parseInt(program.parallel);

// 如果是下载封面，调整连接超时为30秒
if(program.cover && !program.timeout){
    var timeout = 30000;
}else{
    var timeout = parseInt(program.timeout) || 10000;
}

var count = parseInt(program.limit);
var hasLimit = !(count === 0);
var output = program.output.replace(/['"]/g, '');

if (hasLimit) {
    debugger;
    console.log();
    var progress = new ProgressBar('总进度(:current/:total): [:bar]', {
        total: parseInt(program.limit),
        width: 50,
        incomplete: '-'.gray,
        complete: '='.bold

    });
}

console.log('========== 获取资源站点：%s =========='.green.bold, baseUrl);
console.log('并行连接数：'.green, parallel.toString().green.bold, '      ', '连接超时设置：'.green, (timeout / 1000.0).toString().green.bold, '秒'.green);
console.log('磁链保存位置: '.green, output.green.bold);

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
    // FINALLY
    function(err) {
        if (err) return console.log('抓取过程终止：%s', err.message);
        if (hasLimit && count < 1) console.log('已抓取%s个磁链，本次抓取完毕，等待其他爬虫回家...'.green.bold, program.limit);
    });

/****************************
 *****************************
 **** MAIN LOOP END ! ******
 ****************************
 ****************************/

function parseLinks(next) {
    // console.log(currentPageHtml);
    let $ = cheerio.load(currentPageHtml);
    let links = [];
    $('a.movie-box').each(function(i, elem) {
        links.push($(this).attr('href'));
    });
    let fanhao = [];
    links.forEach(function(link) {
        fanhao.push(link.split('/').pop());
    });
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
            console.log('getItems finished');
            if (err && err.message === 'limit') return next();
            if (err) {
                throw err;
                return next(err);
            };
            console.log('===== 第%d页处理完毕 ====='.green, pageIndex);
            console.log();
            return next();
        });

}

function pageExist(callback) {
    if (hasLimit && count < 1) return callback();
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
                // .accept('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
                // .set('Accept-Encoding', 'gzip, deflate')
                // .set('Connection', 'keep-alive')
                .timeout(timeout).redirects(2)
                .end(function(err, res) {
                    // console.log(res.status)
                    if (err) {
                        if (err.status === 404) {
                            console.error('已抓取完所有页面,StatusCode:', err.status);
                            return callback(err);
                        } else {
                            retryCount++;
                            console.error('第%d页页面获取失败：%s'.red, pageIndex, err.message);
                            console.error('...进行第%d次尝试...'.red, retryCount);
                            return callback(err);
                        }
                    }
                    currentPageHtml = res.text;
                    callback(null, res);
                });
        },
        function(err, res) {
            retryCount = 3;
            if (err && err.status === 404) {
                return callback(null, false);
            }
            if (err) {
                return callback(err);
            }
            callback(null, res.ok);
        });
}

function parse(script) {
    //console.log(script);
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
    // console.log('count: %d'.yellow, count);
    debugger;
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
                //console.log('fetch link: %S'.blue, link);
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
    request.get(baseUrl + "/ajax/uncledatoolsbyajax.php?gid=" + meta.gid + "&lang=" + meta.lang + "&img=" + meta.img + "&uc=" + meta.uc + "&floor=" + Math.floor(Math.random() * 1e3 + 1))
        .set('Referer', 'http://www.javbus.in/SCOP-094')
        .timeout(timeout)
        .end(function(err, res) {
            if (hasLimit && count < 1) {
                return done(new Error('limit'));
            };
            if (err) {
                if (!progress)
                    console.error('番号%s磁链获取失败: %s'.red, link.split('/').pop(), err.message);
                return done(null); // one magnet fetch fail, do not crash the whole task.
            };
            let $ = cheerio.load(res.text);
            let anchor = $('[onclick]').first().attr('onclick');
            if (anchor) {
                anchor = /\'(magnet:.+?)\'/g.exec(anchor)[1];
                fs.appendFile(output, anchor + '\r\n', function(err) {
                    if (err) {
                        throw err;
                        return done(err);
                    };
                    if (!progress) console.log(anchor.gray);
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
            debugger;
            if (!finished) {
                finished = true;
                console.log('[Finished]'.green.bold, fileFullPath);
                return done();
            };
        }) // .timeout(timeout)
        .on('error', function(err) {
            debugger;
            if (!finished) {
                finished = true;
                console.error('[ Error  ]'.red.bold, fileFullPath, err.message.red);
                return done();
            };
            // return done();
            // if (finished) {
            //     return done();
            // }else{
            //     finished = true;
            // }
        })
        // .on('close', function() {
        //     console.log(fanhao, 'read close');
        // })
        .pipe(coverFileStream);
    // coverFileStream.on('finish', function() {
    //     console.log(fanhao, 'write finished');
    // });
    // coverFileStream.on('error', function(err) {
    //     console.log(fanhao, 'write error');
    // });
    // coverFileStream.on('unpipe', function(src) {
    //     console.log('[Finished]'.green.bold, fileFullPath);
        // return done();
    // });
}

