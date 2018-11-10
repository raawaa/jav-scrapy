const rp = require('request-promise');
const { from } = require('rxjs');
const { flatMap, take } = require('rxjs/operators');
const cheerio = require('cheerio');


const getPageHtml = (baseUrl) => (pageIndex) => {
    const options = {
        uri: 'https://' + baseUrl + '/page/' + pageIndex,
        headers: {
            'referer': 'https://www.javbus.com'
        }

    };
    return rp(options);
};


const getItemUrls = (pageHtml) => {
    let $ = cheerio.load(pageHtml);
    return $('a.movie-box').map(function (el) { return $(this).attr('href'); }).get();
};

// const onError = r => console.error(r.message);

const pageRange = (num) => [...Array(num).keys()].map(x => x + 1);

const 


// movieUrl$.subscribe(x => console.log(x), onError);
module.exports = (baseUrl, numPage, numMoive) => {
    const movieUrl$ = from(pageRange(numPage)).pipe(flatMap(getPageHtml(baseUrl)), flatMap(getItemUrls), take(numMoive));
    return movieUrl$;

}

