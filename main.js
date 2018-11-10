const program = require('commander')
const movieUrlStream = require('./movie_url_stream');

const BASE_URL = 'www.buscdn.net';

movieUrlStream(BASE_URL, 1, 3).subscribe(x => console.log(x), e => console.error(e.message));


const VERSION = require('./package.json').version;

// program
//     .version(VERSION)
//     .usage('[options]')
//     .option('-p, --parallel <num>', '设置抓取并发连接数，默认值：2', 2)
//     .option('-t, --timeout <num>', '自定义连接超时时间(毫秒)。默认值：30000毫秒')
//     .option('-l, --limit <num>', '设置抓取影片的数量上限，0为抓取全部影片。默认值：0', 0)
//     .option('-o, --output <file_path>', '设置磁链和封面抓取结果的保存位置，默认为当前用户的主目录下的 magnets 文件夹', path.join(userHome, 'magnets'))
//     .option('-s, --search <string>', '搜索关键词，可只抓取搜索结果的磁链或封面')
//     .option('-b, --base <url>', '自定义抓取的起始页')
//     .option('-x, --proxy <url>', '使用代理服务器, 例：-x http://127.0.0.1:8087')
//     .option('-n, --nomag', '是否抓取尚无磁链的影片')
//     .option('-a, --allmag', '是否抓取影片的所有磁链(默认只抓取文件体积最大的磁链)')
//     .parse(process.argv);

