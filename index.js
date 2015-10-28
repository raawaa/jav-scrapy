'use strict';
var vo = require('vo');
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var request = require('superagent');
var async = require('async');

const baseUrl = 'http://javbus.in';
var pageIndex = 1;

// request.get(baseUrl + '/page/' + pageIndex).redirects(2).end(function(err,res){
// 	if(err) console.log(err.status);
// 	console.log(res.status);
// });
var singlePage = vo(getPage, getPageLinks)(baseUrl + (pageIndex === 1 ? '': '/page/' + pageIndex), function(err, res) {
	if (err) throw err;
	getItems(res);
});

function getPage(url, next) {
	//console.log('get page: ', url);
	request.get(url).redirects(3).end(function(err, res) {
		if (err) {
			//console.log(err.status);
			return next(err)
		};
		//console.log('=================');
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

// function* getItems(links) {
// 	while (links.length) {
// 		let link = links.pop();
// 		let res = yield request.get(link);
// 		var $ = cheerio.load(res.text);
// 		let script = $('script', 'body').eq(3).html();
// 		console.log(script);
// 	}
// }
function getItems(links) {
	async.mapLimit(links, 5, getItem, function(err, res) {
		if (err) throw err;
		//console.log(res);
		let metas = parse(res);
		async.forEachOfLimit(metas,5 ,function(value, key, callback) {
			request.get(baseUrl + "/ajax/uncledatoolsbyajax.php?gid=" + value.gid + "&lang=" + value.lang + "&img=" + value.img + "&uc=" + value.uc + "&floor=" + Math.floor(Math.random() * 1e3 + 1)).set('Referer','http://www.javbus.in/SCOP-094').end(function(err, res) {
				let $ = cheerio.load(res.text);
				let anchor = $('a[data-message="magnet"]').first().attr('href');
				if(anchor) console.log(anchor);
                callback(err);
				//console.log(value.gid);
				//console.log(value.uc);
				//console.log(value.img);
			});
		});
	});
	function getItem(link, done) {
		//console.log(link);
		request.get(link).end(function(err, res) {
			//console.log(link);
			if (err) done(err);
			let $ = cheerio.load(res.text);
			let script = $('script', 'body').eq(3).html();
			//console.log(script);
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
                lang:'zh'
			});
		});
		return metas;
	}

}
