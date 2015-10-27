'use strict';
var vo = require('vo');
var Nightmare = require('nightmare');

var option = {
	show: true
};
var nightmare = Nightmare();

// control flow using vo library
vo(run)(function(err, res) {
	if (err) throw err;
});

// main task
function * run() {
	let pageIndex = 1;
	while (pageIndex) {
		let links = yield getLinks('http://javbus.in/page/' + pageIndex);
		if (links.length == 0) {
			return yield nightmare.end();
		}
		while (links.length) {
			let link = links.pop();
			let magnets = yield * getItemMagnet(link);
			if (magnets) console.log(magnets);
		}
		pageIndex++;
	}
	return yield nightmare.end();
}

// get item links in one page
function getLinks(pageUrl) {
	// get all item links in one page
	let anchors = nightmare.goto(pageUrl).evaluate(function() {
		var elems = document.querySelectorAll('#item-frame>a');
		var anchors = [];
		for (var i = 0, a; a = elems[i]; i++) {
			anchors.push(a.getAttribute('href'));
		}
		return anchors;
	});
	return anchors;
}

// get magnets links in item detail page
function * getItemMagnet(url) {
	//console.log('========= getItemMagnet ===========');
	console.log(url);
	return yield nightmare.goto(url).wait('#magnet-table>tr').evaluate(function() {
		//var anchors = document.querySelectorAll('#magnet-table>tr td>a[data-message=magnet]');
		//var magnets = [];
		//for (var i = 0, a; a = anchors[i]; i++) {
		//magnets.push(a.getAttribute('href'));
		//}
		//return magnets;
        
		// only fetch the first magnet
		var anchor = document.querySelector('#magnet-table>tr a[data-message=magnet]');
		if (anchor) return anchor.getAttribute('href');
		else return null;
	});
}

