'use strict';
var vo = require('vo');
var Nightmare = require('nightmare');
var cheerio = require('cheerio');
var request = require('superagent');


const baseUrl = 'http://javbus.in';
var pageIndex = 55464565654;

// request.get(baseUrl + '/page/' + pageIndex).redirects(2).end(function(err,res){
// 	if(err) console.log(err.status);
// 	console.log(res.status);
// });


var singlePage = vo(getPage, getPageLinks, getItems)(baseUrl + '/page/' + pageIndex, function(err, res) {
	if (err) throw err;
	console.log(res);
});

function getPage(url, next) {
	request.get(url).redirects(2).end(function(err, res) {
		// if (err){ console.log(err.status); return next(err)};
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



function* getItems(links) {
	while (links.length) {
		let link = links.pop();
		let response = yield request.get(link);
		var $ = cheerio.load(response.text);
		let script = $('script', 'body').eq(3).html();
		console.log(script);
	}
}