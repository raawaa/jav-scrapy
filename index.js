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


var singlePage = vo(getPage, getPageLinks)(baseUrl + '/page/' + (pageIndex===1?'':pageIndex), function(err, res) {
	if (err) throw err;
	getItems(res);
	console.log('END!!');

});

function getPage(url, next) {
	console.log('get page: ',url);
	request.get(url).redirects(3).end(function(err, res) {
		if (err){ console.log(err.status); return next(err)};
		console.log('=================');
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

	async.mapSeries(links, getItem, function(err,res){
		if(err) throw err;
		console.log(res);
	});

	function getItem(link, done) {
		console.log(link);
		request.get(link).end(function(err, res) {
			console.log(link);
			if (err) done(err);
			let $ = cheerio.load(res.text);
			let script = $('script', 'body').eq(3).html();
			console.log(script);
			done(null,script);
		});
	}

}