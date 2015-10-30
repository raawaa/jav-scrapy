#!/usr/bin/env node

'use strict';
var vo = require('vo');
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var request = require('superagent');
var async = require('async');
var colors = require('colors');
var program = require('commander');

var noop = function noop() {};

// global var
const baseUrl = 'http://www.javbus.in';
var pageIndex = 1;
var currentPageHtml = null;


program
	.version('0.1.0')
	.usage('[options]')
	.option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2', 2)
	.option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：10000', 10000)
	.option('-l,  --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0）', 0)
	.parse(process.argv);

//if (program.parallel) {
var parallel = parseInt(program.parallel);
var timeout = parseInt(program.timeout);
var count = parseInt(program.limit);
var hasLimit = !(count === 0);
//}

console.log('========== 获取资源站点：%s =========='.green.bold, baseUrl);
console.log('并行连接数：%d       连接超时设置：%d秒'.green.bold, parallel, timeout / 1000.0);

/****************************
 *****************************
 **** MAIN LOOP START ! ******
 ****************************
 ****************************/
async.during(
	pageExist,
	// when page exist
	function(callback) {
		let pageTasks = [parseLinks, getMagnet];

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
		if (err)
			return console.log('抓取过程终止：%s', err.message);
		if (hasLimit && count < 1)
			console.log('已抓取%s个磁链，本次抓取完毕，等待未响应的异步请求...'.green.bold, program.limit);
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

function getMagnet(links, next) {

	async.forEachOfLimit(
		links,
		parallel,
		function(link, index, callback) {
			// console.log('count: %d'.yellow, count);

			request
				.get(link)
				.timeout(timeout)
				.end(function(err, res) {
					if (hasLimit && count < 1) {
						return callback(new Error('limit'));
					};
					if (err) {
						console.error('番号%s页面获取失败：%s'.red, link.split('/').pop(), err.message);
						return callback(null);
					}
					let $ = cheerio.load(res.text);
					let script = $('script', 'body').eq(2).html();
					let meta = parse(script);
					//console.log('fetch link: %S'.blue, link);
					request
						.get(baseUrl + "/ajax/uncledatoolsbyajax.php?gid=" + meta.gid + "&lang=" + meta.lang + "&img=" + meta.img + "&uc=" + meta.uc + "&floor=" + Math.floor(Math.random() * 1e3 + 1))
						.set('Referer', 'http://www.javbus.in/SCOP-094')
						.timeout(timeout)
						.end(function(err, res) {
							debugger;
							if (hasLimit && count < 1) {
								return callback(new Error('limit'));
							};
							//console.log('bingo'.blue);
							if (err) {
								console.error('番号%s磁链获取失败: %s'.red, link.split('/').pop(), err.message);
								return callback(null); // one magnet fetch fail, do not crash the whole task.
							};
							// console.log(res.text);
							let $ = cheerio.load(res.text);
							let anchor = $('[onclick]').first().attr('onclick');
							if (anchor) {
								anchor = /\'(magnet:.+?)\'/g.exec(anchor)[1];
								console.log(anchor.gray);
								count--;
							}
							return callback(null);
						});
				});
		},
		function(err) {
			debugger;
			if (err && err.message === 'limit')
				return next();
			if (err) {
				throw err;
				return next(err);
			};
			console.log('===== 第%d页处理完毕 ====='.green, pageIndex);
			console.log();
			return next();
		});

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
}



function pageExist(callback) {
	if (hasLimit && count < 1) return callback();
	let url = baseUrl + (pageIndex === 1 ? '' : '/page/' + pageIndex);
	// console.log(url);
	console.log('获取第%d页中的影片链接...'.green, pageIndex);
	let retryCount = 1;
	async.retry(3,
		function(callback, result) {
			request
				.get(url)
				.accept('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
				.set('Accept-Encoding', 'gzip, deflate')
				.set('Connection', 'keep-alive')
				.timeout(timeout)
				.redirects(2)
				.end(function(err, res) {
					// console.log(res.status)
					if (err) {
						if (err.status === 404) {
							console.error('已抓取完所有页面,StatusCode:', err.status);
							return callback(null);
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
			if (err) {
				return callback(err);
			}
			callback(null, res.ok);
		});
}