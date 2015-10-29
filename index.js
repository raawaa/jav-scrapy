'use strict';
var vo = require('vo');
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var request = require('superagent');
var async = require('async');
var colors = require('colors');

var noop = function noop() {};

const baseUrl = 'http://www.javbus.in';
var pageIndex = 1;

var currentPageHtml = null;

console.log('========== 获取资源站点：%s ==========');

async.during(
	pageExist,
	// when page exist
	function(callback) {
		let pageTasks = [parseLinks, getMagnet];

		async.waterfall(
			pageTasks,
			function(err, result) {
				if (err) return callback(err);
				callback(null);
			});
	},
	// FINALLY
	function(err) {
		//if (err) throw err;
	});


function parseLinks(next) {
	// console.log(currentPageHtml);
	let $ = cheerio.load(currentPageHtml);
	let links = [];
	$('a.movie-box').each(function(i, elem) {
		links.push($(this).attr('href'));
	});
    let fanhao = [];
    links.forEach(function(link){
        fanhao.push(link.split('/').pop());
    });
    console.log('正处理以下番号影片...'.red);
    console.log(fanhao.toString().yellow)
	next(null, links);
}

function getMagnet(links, next) {

	async.forEachOfLimit(
		links,
		3,
		function(link, index, callback) {
			request
				.get(link)
				.end(function(err, res) {
                    if(err){
                        console.error('error in fetch url: %s', link);
                        return callback(err);
                    }
					let $ = cheerio.load(res.text);
					let script = $('script', 'body').eq(2).html();
					let meta = parse(script);
					request
						.get(baseUrl + "/ajax/uncledatoolsbyajax.php?gid=" + meta.gid + "&lang=" + meta.lang + "&img=" + meta.img + "&uc=" + meta.uc + "&floor=" + Math.floor(Math.random() * 1e3 + 1))
						.set('Referer', 'http://www.javbus.in/SCOP-094')
						.end(function(err, res) {
							if (err) {
								console.error('ajax magent-table error', err.message);
								return callback(err);
							};
							// console.log(res.text);
							let $ = cheerio.load(res.text);
							let anchor = $('[onclick]').first().attr('onclick');
							if (anchor) {
								anchor = /\'(magnet:.+?)\'/g.exec(anchor)[1];
								console.log(anchor);
							}
							callback(null);
						});
				});
		},
		function(err) {
			if (err) {

				return next(err);
			};
			next();
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
	// body...
	let url = baseUrl + (pageIndex === 1 ? '' : '/page/' + pageIndex);
	// console.log(url);
    console.log('获取第%d页中的影片链接...'.red, pageIndex);
	async.retry(3,
		function(callback, result) {
			request
				.get(url)
				.accept('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
				.set('Accept-Encoding', 'gzip, deflate')
				.set('Connection', 'keep-alive')
				.redirects(2)
				.end(function(err, res) {
					pageIndex++;
					// console.log(res.status)
					if (err) {
						console.error('已抓取完所有页面,StatusCode:', err.status);
						return callback(err);
					}
					currentPageHtml = res.text;
					callback(null, res);
				});
		},
		function(err, res) {
			if (err) {
				callback(err);
			} else {
				callback(null, res.ok);
			}

		});
}
