'use strict';
var vo = require('vo');
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var request = require('superagent');
var async = require('async');

const baseUrl = 'http://www.javbus.in';
var pageIndex = 1;

async.during(
	// test page exist
	function(callback) {
		let url = baseUrl + (pageIndex === 1 ? '' : '/page/' + pageIndex);
		console.log(url);
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
							callback(err);
						}
						// console.log(res.header)
						callback(null, res);
					});
			},
			function(err, result) {
				if (err) {
					callback(err);
				}
				callback(null,result.ok);

			});
	},
	// when page exist
	function(callback) {
		console.log('page!');
		callback(null);
	},
	function(err) {
		if (err) throw err;
	});

// var singlePage = vo(getPage, getPageLinks)(baseUrl + (pageIndex === 1 ? '' : '/page/' + pageIndex), function(err, res) {
// 	if (err) throw err;
// 	getItems(res);
// });
function scrapOnePage() {

}

function getPage(url, next) {
	request.get(url).redirects(3).end(function(err, res) {
		if (err) {
			return next(err)
		};
		return next(null, res.text);
	});
}

function getPageLinks(html) {
	let $ = cheerio.load(html);
	let anchors = $('#item-frame');
	let links = [];
	anchors.each(function(i, elem) {
		let url = $(this).children('a').first().attr('href');
		links.push(url);
	});
	return Promise.resolve(links);
}

function getItems(links) {
	async.mapLimit(links, 5, getItem, function(err, res) {
		if (err) throw err;
		let metas = parse(res);
		async.forEachOfLimit(metas, 5, function(value, key, callback) {
			request.get(baseUrl + "/ajax/uncledatoolsbyajax.php?gid=" + value.gid + "&lang=" + value.lang + "&img=" + value.img + "&uc=" + value.uc + "&floor=" + Math.floor(Math.random() * 1e3 + 1)).set('Referer', 'http://www.javbus.in/SCOP-094').end(function(err, res) {
				let $ = cheerio.load(res.text);
				let anchor = $('a[data-message="magnet"]').first().attr('href');
				if (anchor) console.log(anchor);
				callback(err);
			});
		});
	});

	function getItem(link, done) {
		request.get(link).end(function(err, res) {
			if (err) done(err);
			let $ = cheerio.load(res.text);
			let script = $('script', 'body').eq(3).html();
			done(null, script);
		});
	}

	function parse(scripts) {
		var metas = [];
		scripts.forEach(function(script) {
			let gid_r = /gid\s+=\s+(\d+)/g.exec(script);
			let gid = gid_r[1];
			let uc_r = /uc\s+=\s(\d+)/g.exec(script);
			let uc = uc_r[1];
			let img_r = /img\s+=\s+\'(\http:.+\.jpg)/g.exec(script);
			let img = img_r[1];
			metas.push({
				gid: gid,
				img: img,
				uc: uc,
				lang: 'zh'
			});
		});
		return metas;
	}
}