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

// global var

const baseUrl = 'https://www.javbus2.pw';
const searchUrl = '/search';
var pageIndex = 1;
var currentPageHtml = null;

program
    .version('0.7.0')
    .usage('[options]')
    .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2', 2)
    .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：30000毫秒')
    .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0', 0)
    .option('-o, --output <file_path>', '设置磁链和封面抓取结果的保存位置，默认为当前用户的主目录下的 magnets 文件夹', path.join(userHome, 'magnets'))
    .option('-s, --search <string>', '搜索关键词，可只抓取搜索结果的磁链或封面')
    .option('-b, --base <url>', '自定义抓取的起始页')
    .option('-x, --proxy <url>', '使用代理服务器, 例：-x http://127.0.0.1:8087')
    .option('-n, --nomag', '是否抓取尚无磁链的影片')
    .parse(process.argv);


var parallel = parseInt(program.parallel);
var timeout = parseInt(program.timeout) || 30000;
var proxy = process.env.http_proxy || program.proxy;
// console.log('proxy: ', proxy);
request = request.defaults({
    timeout: timeout,
    headers: {
        'Referer': 'http://www.javbus2.pw'
    }
});
if (proxy) {
    request = request.defaults({
        'proxy': proxy
    });
}
var count = parseInt(program.limit);
var hasLimit = (count !== 0),
    targetFound = false;
var output = program.output.replace(/['"]/g, '');

console.log('========== 获取资源站点：%s =========='.green.bold, baseUrl);
console.log('并行连接数：'.green, parallel.toString().green.bold, '      ',
    '连接超时设置：'.green, (timeout / 1000.0).toString().green.bold, '秒'.green);
console.log('磁链保存位置: '.green, output.green.bold);
console.log('代理服务器: '.green, (proxy ? proxy : '无').green.bold);

/****************************
 *****************************
 **** MAIN LOOP START ! ******
 ****************************
 ****************************/

mkdirp.sync(output);

async.during(
    pageExist,
    // when page exist
    function (callback) {
        async.waterfall(
            [parseLinks, getItems],
            function (err) {
                pageIndex++;
                if (err) return callback(err);
                return callback(null);
            });
    },
    // page not exits or finished parsing
    function (err) {
        if (err) {
            console.log('抓取过程终止：%s', err.message);
            return process.exit(1);
        }
        if (hasLimit && (count < 1)) {
            console.log('已尝试抓取%s部影片，本次抓取完毕'.green.bold, program.limit);
        } else {
            console.log('抓取完毕'.green.bold);
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
        function (err) {
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
    } else if (program.base) {
        url = program.base + (pageIndex === 1 ? '' : ('/' + pageIndex));
    } else {
        // 只在没有指定搜索条件时显示
        console.log('获取第%d页中的影片链接 ( %s )...'.green, pageIndex, url);
    }

    let retryCount = 1;
    async.retry(3,
        function (callback) {
            let options = program.nomag ? { url: url, headers: { 'Cookie': 'existmag=all' } } : { url: url };
            request
                .get(options, function (err, res, body) {
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
        function (err, res) {
            if (err) {
                if (err.status === 404) {
                    return callback(null, false);
                }
                return callback(err);
            }
            return callback(null, res.statusCode == 200);
        });
}


function parse(script) {
    let gid_r = /gid\s+=\s+(\d+)/g.exec(script);
    let gid = gid_r[1];
    let uc_r = /uc\s+=\s(\d+)/g.exec(script);
    let uc = uc_r[1];
    let img_r = /img\s+=\s+'(http.+\.jpg)/g.exec(script);
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
    let coverFilePath = path.join(output, fanhao + '.jpg');
    let magnetFilePath = path.join(output, fanhao + '.txt');
    if (hasLimit) {
        count--;
    }
    try {
        fs.accessSync(coverFilePath, fs.F_OK);
        fs.accessSync(magnetFilePath, fs.F_OK);
        console.log(('[' + fanhao + ']').yellow.bold.inverse + ' ' + 'Alreday fetched, SKIP!'.yellow);
        return callback();
    } catch (e) {
        request
            .get(link, function (err, res, body) {
                if (err) {
                    console.error(('[' + fanhao + ']').red.bold.inverse + ' ' + err.message.red);
                    return callback(null);
                }
                let $ = cheerio.load(body);
                let script = $('script', 'body').eq(2).html();
                let meta = parse(script);

                $('div.col-md-3 > p').each(function (i, e) {
                    let text = $(e).text();
                    meta.category = [];
                    if (text.includes('發行日期:')) {
                        meta.date = text.replace('發行日期: ', '');
                    } else if (text.includes('系列:')) {
                        meta.series = text.replace('系列:', '');
                    } else if (text.includes('類別:')) {
                        $('div.col-md-3 > p > span.genre').each(function (idx, span) {
                            let $span = $(span);
                            if (!$span.attr('onmouseover')) {
                                meta.category.push($span.text());
                            }
                        });
                    }
                });
                // 提取演员
                meta.actress = [];
                $('span.genre').each(function (i, e) {
                    let $e = $(e);
                    if ($e.attr('onmouseover')) {
                        meta.actress.push($e.find('a').text());
                    }
                });
                // 提取片名
                meta.title = $('h3').text();

                getItemMagnet(link, meta, callback);

                // 所有截图link
                var snapshots = [];
                $('a.sample-box').each(function (i, e) {
                    let $e = $(e);

                    snapshots.push($e.attr('href'));
                });
                getSnapshots(link, snapshots);
            });
    }
}

function getSnapshots(link, snapshots) {
    // https://pics.dmm.co.jp/digital/video/118abp00454/118abp00454jp-1.jpg
    for (var i = 0; i < snapshots.length; i++) {
        getSnapshot(link, snapshots[i]);
    }
    console.log('截图下载完毕:' + link);
}

function getSnapshot(link, snahpshotLink) {
    let fanhao = link.split('/').pop();
    let itemOutput = output + '/' + fanhao;
    mkdirp.sync(itemOutput);

    let snapshotName = snahpshotLink.split('/').pop();
    let fileFullPath = path.join(itemOutput, snapshotName);
    fs.access(fileFullPath, fs.F_OK, function (err) {
        if (err) {
            var snapshotFileStream = fs.createWriteStream(fileFullPath + '.part');
            var finished = false;
            request.get(snahpshotLink)
                .on('end', function () {
                    if (!finished) {
                        fs.renameSync(fileFullPath + '.part', fileFullPath);
                        finished = true;
                        // console.error(('[' + fanhao + ']').green.bold.inverse + '[截图]'.yellow.inverse, fileFullPath);
                    }
                })
                .on('error', function (err) {
                    if (!finished) {
                        finished = true;
                        // console.error(('[' + fanhao + ']').red.bold.inverse + '[截图]'.yellow.inverse, err.message.red);
                    }
                })
                .pipe(snapshotFileStream);
        } else {
            // console.log(('[' + fanhao + ']').green.bold.inverse + '[截图]'.yellow.inverse, 'file already exists, skip!'.yellow);
        }
    });
}

function getItemMagnet(link, meta, done) {
    let fanhao = link.split('/').pop();
    let itemOutput = output + '/' + fanhao;
    mkdirp.sync(itemOutput);
    let magnetFilePath = path.join(itemOutput, fanhao + '.json');
    fs.access(magnetFilePath, fs.F_OK, function (err) {
        if (err) {
            request
                .get(baseUrl + '/ajax/uncledatoolsbyajax.php?gid=' + meta.gid + '&lang=' + meta.lang + '&img=' + meta.img + '&uc=' + meta.uc + '&floor=' + Math.floor(Math.random() * 1e3 + 1),
                    function (err, res, body) {
                        if (err) {
                            console.error(('[' + fanhao + ']').red.bold.inverse + ' ' + err.message.red);
                            return done(null); // one magnet fetch fail, do not crash the whole task.
                        }
                        let $ = cheerio.load(body);
                        // 尝试解析高清磁链
                        let HDAnchor = $('a[title="包含高清HD的磁力連結"]').parent().attr('href');
                        // 尝试解析普通磁链
                        let anchor = $('a[title="滑鼠右鍵點擊並選擇【複製連結網址】"]').attr('href');
                        // 若存在高清磁链，则优先选取高清磁链
                        anchor = HDAnchor || anchor;
                        // 将磁链单独存入文本文件以方便下载
                        if (anchor) {
                            fs.writeFile(path.join(itemOutput, fanhao + '-magnet.txt'), anchor, function (err) {
                                if (err) {
                                    throw err;
                                }
                            });
                        }

                        // // 再加上一些影片信息
                        let jsonText = '{\n\t"title":"' + meta.title + '",\n\t"date":"' + meta.date + '",\n\t"series":"' + meta.series + '",\n\t"anchor":"' + anchor + '",\n\t"category":[\n\t\t';
                        for (let i = 0; i < meta.category.length; i++) {
                            jsonText += i == 0 ? '"' + meta.category[i] + '"' : ',\n\t\t"' + meta.category[i] + '"';
                        }
                        jsonText += '\n\t],\n\t"actress":[\n\t\t';
                        for (let i = 0; i < meta.actress.length; i++) {
                            jsonText += i == 0 ? '"' + meta.actress[i] + '"' : ',\n\t\t"' + meta.actress[i] + '"';
                        }
                        jsonText += '\n\t]\n}';

                        if (jsonText) { // magnet file not exists
                            fs.writeFile(magnetFilePath, jsonText + '\r\n',
                                function (err) {
                                    if (err) {
                                        throw err;
                                    }
                                    console.log(('[' + fanhao + ']').green.bold.inverse + '[磁链]'.yellow.inverse + (HDAnchor ? '[HD]'.blue.bold.inverse : ''), anchor);
                                    getItemCover(link, meta, done);
                                });
                        } else {
                            getItemCover(link, meta, done); // 若尚未有磁链则仅抓取封面
                        }
                    });
        } else {
            console.log(('[' + fanhao + ']').green.bold.inverse + '[磁链]'.yellow.inverse, 'file already exists, skip!'.yellow);
            getItemCover(link, meta, done);
        }
    });
}

function getItemCover(link, meta, done) {
    var fanhao = link.split('/').pop();
    var filename = fanhao + 'l.jpg';
    let itemOutput = output + '/' + fanhao;
    mkdirp.sync(itemOutput);
    var fileFullPath = path.join(itemOutput, filename);
    fs.access(fileFullPath, fs.F_OK, function (err) {
        if (err) {
            var coverFileStream = fs.createWriteStream(fileFullPath + '.part');
            var finished = false;
            request.get(meta.img)
                .on('end', function () {
                    if (!finished) {
                        fs.renameSync(fileFullPath + '.part', fileFullPath);
                        finished = true;
                        console.error(('[' + fanhao + ']').green.bold.inverse + '[封面]'.yellow.inverse, fileFullPath);
                        // getItemSmallCover(link, meta, done);
                        return done();
                    }
                })
                .on('error', function (err) {
                    if (!finished) {
                        finished = true;
                        console.error(('[' + fanhao + ']').red.bold.inverse + '[封面]'.yellow.inverse, err.message.red);
                        // getItemSmallCover(link, meta, done);
                        return done();
                    }
                })
                .pipe(coverFileStream);
        } else {
            console.log(('[' + fanhao + ']').green.bold.inverse + '[封面]'.yellow.inverse, 'file already exists, skip!'.yellow);
            // getItemSmallCover(link, meta, done);
            return done();
        }
    });
}

// 获取封面小图
function getItemSmallCover(link, meta, done) {
    // 大图地址：
    // https://pics.javbus.info/cover/5cfb_b.jpg
    // 小图地址:
    // https://pics.javbus.info/thumb/5cfb.jpg
    var fanhao = link.split('/').pop();
    var filename = fanhao + 's.jpg';
    let itemOutput = output + '/' + fanhao;
    mkdirp.sync(itemOutput);
    var fileFullPath = path.join(itemOutput, filename);
    fs.access(fileFullPath, fs.F_OK, function (err) {
        if (err) {
            var coverFileStream = fs.createWriteStream(fileFullPath + '.part');
            var finished = false;
            request.get(meta.img.replace('cover', 'thumb').replace('_b', ''))
                .on('end', function () {
                    if (!finished) {
                        fs.renameSync(fileFullPath + '.part', fileFullPath);
                        finished = true;
                        console.error(('[' + fanhao + ']').green.bold.inverse + '[小封面]'.yellow.inverse, fileFullPath);
                        return done();
                    }
                })
                .on('error', function (err) {
                    if (!finished) {
                        finished = true;
                        console.error(('[' + fanhao + ']').red.bold.inverse + '[小封面]'.yellow.inverse, err.message.red);
                        return done();
                    }
                })
                .pipe(coverFileStream);
        } else {
            console.log(('[' + fanhao + ']').green.bold.inverse + '[小封面]'.yellow.inverse, 'file already exists, skip!'.yellow);
            return done();
        }
    });
}
