const { parallel } = require("async");

module.exports = {
    DEFAULT_TIMEOUT: 30000,
    proxy: null,
    headers: {
        'Referer': 'http://www.javbus2.pw',
        'Cookie': 'existmag=mag; PHPSESSID=4p7qb93bj920lemlmrpk9tu4m4',
    },
    BASE_URL: 'https://www.fanbus.ink/',
    parallel: 2
};