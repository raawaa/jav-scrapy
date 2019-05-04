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
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

// global var

const baseUrl = 'https://www.3ubdxu00l1lkcjoz5n.com/uncensored/actresses';
const searchUrl = '/search';
var pageIndex = 1;
var currentPageHtml = null;

program
    .version('0.6.0')
    .usage('[options]')
    .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2', 2)
    .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：30000毫秒')
    .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0', 0)
    .option('-o, --output <file_path>', '设置磁链和封面抓取结果的保存位置，默认为当前用户的主目录下的 magnets 文件夹', path.join(userHome, 'magnets'))
    .option('-s, --search <string>', '搜索关键词，可只抓取搜索结果的磁链或封面')
    .option('-b, --base <url>', '自定义抓取的起始页')
    .option('-x, --proxy <url>', '使用代理服务器, 例：-x http://127.0.0.1:8087')
    .parse(process.argv);


var parallel = parseInt(program.parallel);
var timeout = parseInt(program.timeout) || 30000;
var proxy = process.env.http_proxy || program.proxy;
// console.log('proxy: ', proxy);
request = request.defaults({
    timeout: timeout,
    headers: {
        'Referer': 'http://www.javbus.in',
        'Cookie': 'existmag=all'
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
var errorCount = 0;

console.log('========== 获取资源站点：%s =========='.green.bold, baseUrl);
console.log('并行连接数：'.green, parallel.toString().green.bold, '			',
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
    function(callback) {
        async.waterfall(
            [parseLinks, getItems],
            function(err) {
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
        actress = [];
    let totalCountCurPage = $('div.item').length;
    if (hasLimit) {
        if (count > totalCountCurPage) {
            $('div.item').each(link_actress_handler);
        } else {
            $('div.item').slice(0, count).each(link_actress_handler);
        }
    } else {
        $('div.item').each(link_actress_handler);
    }
    if (program.search && links.length == 1) {
        targetFound = true;
    }

    function link_actress_handler() {
        let link = $(this).find('a').attr('href');
        links.push(link);
        actress.push($(this).find('a div.photo-info span').text());
    }

    console.log('正处理以下女优...\n'.green + actress.toString().yellow);
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
    var url = baseUrl + (pageIndex === 1 ? '' : ('/' + pageIndex));
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
        function(callback) {
            let options = {
                headers: {
                    'Cookie': 'existmag=all'
                }
            };
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
                    callback(null, res);
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
    let maskCode = link.split('/').pop();
    let josnDir = output + "/" + maskCode;
    let picPath = path.join(josnDir, maskCode + '.jpg');
    let jsonPath = path.join(josnDir, maskCode + '.json');
    mkdirp.sync(josnDir);

    if (hasLimit) {
        count--;
    }

    try {
        fs.accessSync(picPath, fs.F_OK);
        fs.accessSync(jsonPath, fs.F_OK);
        console.log(('[' + maskCode + ']').yellow.bold.inverse + ' ' + 'Alreday fetched, SKIP!'.yellow);
        return callback(null);
    } catch (e) {
        request.get(link, function(err, res, body) {
            if (err) {
                console.error(('[' + maskCode + ']').red.bold.inverse + ' ' + err.message.red);
                errorCount++;
                return callback(null);
            }
            let $ = cheerio.load(body);
            let picUrl = $('.avatar-box > .photo-frame > img').attr('src');

            let infoDiv = $('.avatar-box .photo-info');
            let name = infoDiv.find('.pb10').text();
            let alias = "";
            if (name.includes("（")) {
                let arr = name.split('（');
                name = arr[0];
                alias = arr[1].replace('）', "").replace('、', '|');
            }
            let birtyday = "1970-01-01";
            let height = 0;
            let cup = "X";
            let bust = 0;
            let waist = 0;
            let hip = 0;
            // 生日: 1988-05-24年齡: 26身高: 163cm罩杯: D胸圍: 88cm腰圍: 59cm臀圍: 85cm出生地: 京都府愛好: ゲーム
            let pList = infoDiv.find('p').each(function(i, p) {
                let text = $(p).text();
                if (text.includes("生日: ")) {
                    birtyday = text.replace("生日: ", "");
                } else if (text.includes("身高: ")) {
                    height = parseInt(text.replace("身高: ", "").replace("cm", ""));
                } else if (text.includes("罩杯: ")) {
                    cup = text.replace("罩杯: ", "");
                } else if (text.includes("胸圍: ")) {
                    bust = parseInt(text.replace("胸圍: ", "").replace("cm", ""));
                } else if (text.includes("腰圍: ", "")) {
                    waist = parseInt(text.replace("腰圍: ", "").replace("cm", ""));
                } else if (text.includes("臀圍: ", "")) {
                    hip = parseInt(text.replace("臀圍: ", "").replace("cm", ""));
                }
            });

            // 保存json
            fs.access(jsonPath, fs.F_OK, function(err) {
                if (err) {
                    // let jsonText = `{\n\t"name":"${name}",\n\t"birtyday":"${birtyday}",\n\t"height":${height},\n\t"cup":"${cup}",\n\t"bust":${bust},\n\t"waist":${waist},\n\t"hip":${hip},\n\t"alias":"${alias}"\n\t"Picture":${picUrl}\n}`
                    let jsonInfo = {
                        name: name,
                        birtyday: birtyday,
                        height: height,
                        cup: cup,
                        bust: bust,
                        waist: waist,
                        hip: hip,
                        alias: alias,
                        Picture: picUrl,
                        maskCode: maskCode,
                    };
                    MongoClient.connect(url, function(err, db) {
                        if (err) {
                            console.error(('[' + name + ']').red.bold.inverse + '[mongodb连接失败]' + err.message.red);
                            return done(null);
                        };
                        var dbo = db.db("javbus");
                        dbo.collection("actress").insertOne(jsonInfo, function(err, res) {
                            if (err) {
                                console.error(('[' + name + ']').red.bold.inverse + '[该演员在mongodb中已存在]' + err.message.red);
                                db.close();
                            } else {
                                console.log(('[' + name + ']').green.bold.inverse + '[Mongodb保存成功]'.yellow.inverse);
                                db.close();
                            }
                        });
                    });
                    fs.writeFile(jsonPath, JSON.stringify(jsonInfo, '', 4), function(err) {
                        if (err) {
                            throw err;
                        }
                        console.log(('[' + maskCode + '.json]').green.bold.inverse + " is saved".yellow);
                        getActressPic(maskCode, picUrl, callback);
                    });
                } else {
                    console.log(('[' + maskCode + '.json]').green.bold.inverse + 'file already exists, skip!'.yellow);
                    getActressPic(maskCode, picUrl, callback);
                }
            });
        });
    }
}

/**
 * 获取演员头像
 */
function getActressPic(maskCode, picUrl, done) {
    if (picUrl) {
        var filename = maskCode + '.jpg';
        var fileFullPath = path.join(output + "/" + maskCode, filename);
        fs.access(fileFullPath, fs.F_OK, function(err) {
            if (err) {
                var coverFileStream = fs.createWriteStream(fileFullPath + '.part');
                var finished = false;
                request.get(picUrl)
                    .on('end', function() {
                        if (!finished) {
                            fs.renameSync(fileFullPath + '.part', fileFullPath);
                            finished = true;
                            console.error(('[' + maskCode + ']').green.bold.inverse + '[头像]'.yellow.inverse, fileFullPath);
                            return done();
                        }
                    })
                    .on('error', function(err) {
                        if (!finished) {
                            finished = true;
                            console.error(('[' + maskCode + ']').red.bold.inverse + '[头像]'.yellow.inverse, err.message.red);
                            errorCount++;
                            return done();
                        }
                    })
                    .pipe(coverFileStream);
            } else {
                console.log(('[' + maskCode + ']').green.bold.inverse + '[头像]'.yellow.inverse, 'file already exists, skip!'.yellow);
                return done();
            }
        });
    } else {
        console.log(('[' + maskCode + ']').green.bold.inverse + '[头像]'.yellow.inverse, ' error'.yellow);
        return done();
    }
}