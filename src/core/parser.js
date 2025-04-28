const logger = require('../logger');
const RequestHandler = require('./requestHandler');

class Parser {

  constructor(config) {
    this.config = config;
  }

  static parsePageLinks(html) {
    const $ = require('cheerio').load(html);
    return $('a.movie-box').map((i, el) => $(el).attr('href')).get();
  }

  static parseMetadata(html) {
    const $ = require('cheerio').load(html);
    const script = $('script', 'body').eq(2).html();

    const gid = /gid\s+=\s+(\d+)/.exec(script)[1];
    const uc = /uc\s+=\s(\d+)/.exec(script)[1];
    const imgRegex = /img\s+=\s+'([^']+)'/;

    return {
      gid,
      uc,
      img: imgRegex.exec(script)[1],
      title: $('h3').text(),
      category: this.parseCategories($),
      actress: this.parseActress($)
    };
  }

  /**
   * 解析 HTML 内容中的分类信息。
   * @param {string} html - 需要解析的 HTML 字符串。
   * @returns {Array<string>} - 包含所有分类名称的数组。
   */
  static parseCategories(html) {
    // 使用 cheerio 库加载 HTML 内容，以便使用类似 jQuery 的语法进行元素选择
    const $ = require('cheerio').load(html);
    // 选择所有 <span class="genre"> 元素下的 <label> 元素内的 <a> 元素，
    // 并将这些 <a> 元素的文本内容提取出来，最终返回一个包含所有文本内容的数组
    return $('span.genre label a').map((i, el) => $(el).text()).get();

  }

  static parseActress(html) {
    const $ = require('cheerio').load(html);
    return $('span.genre[onmouseover] a').map((i, el) => $(el).text()).get();
  }
  async parseMagnet(metadata) {
    // 使用 RequestHandler 向指定 URL 发送请求
    const url = `https://www.fanbus.ink/ajax/uncledatoolsbyajax.php?gid=${metadata.gid}&lang=zh&img=${metadata.img}&uc=${metadata.uc}&floor=880`;
    const requestHandler = new RequestHandler(this.config);
    const response = await requestHandler.getXMLHttpRequest(url);

    // response.body 的内容是这样的：
    // "       \r\n            <tr onmouseover=\"this.style.backgroundColor='#F4F9FD';this.style.cursor='pointer';\" onmouseout=\"this.style.backgroundColor='#FFFFFF'\" height=\"35px\" style=\" border-top:#DDDDDD solid 1px\">\r\n                <td width=\"70%\" onclick=\"window.open('magnet:?xt=urn:btih:C081C69939076EC6F0396B13AE926AB090AD8C39&dn=FNEW-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:C081C69939076EC6F0396B13AE926AB090AD8C39&dn=FNEW-009\">\r\n                \tFNEW-009 <a class=\"btn btn-mini-new btn-primary disabled\" title=\"包含高清HD的磁力連結\">高清</a>                \t</a>\r\n                </td>\r\n                <td style=\"text-align:center;white-space:nowrap\" onclick=\"window.open('magnet:?xt=urn:btih:C081C69939076EC6F0396B13AE926AB090AD8C39&dn=FNEW-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:C081C69939076EC6F0396B13AE926AB090AD8C39&dn=FNEW-009\">\r\n                \t5.87GB                \t</a>\r\n                </td>\r\n                <td style=\"text-align:center;white-space:nowrap\" onclick=\"window.open('magnet:?xt=urn:btih:C081C69939076EC6F0396B13AE926AB090AD8C39&dn=FNEW-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:C081C69939076EC6F0396B13AE926AB090AD8C39&dn=FNEW-009\">\r\n                \t2025-04-26                \t</a>\r\n                </td>            \r\n            </tr>\r\n\t\t         \r\n            <tr onmouseover=\"this.style.backgroundColor='#F4F9FD';this.style.cursor='pointer';\" onmouseout=\"this.style.backgroundColor='#FFFFFF'\" height=\"35px\" style=\" border-top:#DDDDDD solid 1px\">\r\n                <td width=\"70%\" onclick=\"window.open('magnet:?xt=urn:btih:5454E9E0C327C76AD2D420632DDAE171CEFA63F4&dn=FNEW-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:5454E9E0C327C76AD2D420632DDAE171CEFA63F4&dn=FNEW-009\">\r\n                \tFNEW-009                 \t</a>\r\n                </td>\r\n                <td style=\"text-align:center;white-space:nowrap\" onclick=\"window.open('magnet:?xt=urn:btih:5454E9E0C327C76AD2D420632DDAE171CEFA63F4&dn=FNEW-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:5454E9E0C327C76AD2D420632DDAE171CEFA63F4&dn=FNEW-009\">\r\n                \t1.52GB                \t</a>\r\n                </td>\r\n                <td style=\"text-align:center;white-space:nowrap\" onclick=\"window.open('magnet:?xt=urn:btih:5454E9E0C327C76AD2D420632DDAE171CEFA63F4&dn=FNEW-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:5454E9E0C327C76AD2D420632DDAE171CEFA63F4&dn=FNEW-009\">\r\n                \t2025-04-26                \t</a>\r\n                </td>            \r\n            </tr>\r\n\t\t         \r\n            <tr onmouseover=\"this.style.backgroundColor='#F4F9FD';this.style.cursor='pointer';\" onmouseout=\"this.style.backgroundColor='#FFFFFF'\" height=\"35px\" style=\" border-top:#DDDDDD solid 1px\">\r\n                <td width=\"70%\" onclick=\"window.open('magnet:?xt=urn:btih:A78DFDB729CA07CEDFCE10823AF8B098ADF79470&dn=fnew-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:A78DFDB729CA07CEDFCE10823AF8B098ADF79470&dn=fnew-009\">\r\n                \tfnew-009 <a class=\"btn btn-mini-new btn-primary disabled\" title=\"包含高清HD的磁力連結\">高清</a>                \t</a>\r\n                </td>\r\n                <td style=\"text-align:center;white-space:nowrap\" onclick=\"window.open('magnet:?xt=urn:btih:A78DFDB729CA07CEDFCE10823AF8B098ADF79470&dn=fnew-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:A78DFDB729CA07CEDFCE10823AF8B098ADF79470&dn=fnew-009\">\r\n                \t5.91GB                \t</a>\r\n                </td>\r\n                <td style=\"text-align:center;white-space:nowrap\" onclick=\"window.open('magnet:?xt=urn:btih:A78DFDB729CA07CEDFCE10823AF8B098ADF79470&dn=fnew-009','_self')\">\r\n                \t<a style=\"color:#333\" rel=\"nofollow\" title=\"滑鼠右鍵點擊並選擇【複製連結網址】\" href=\"magnet:?xt=urn:btih:A78DFDB729CA07CEDFCE10823AF8B098ADF79470&dn=fnew-009\">\r\n                \t2025-04-26                \t</a>\r\n                </td>            \r\n            </tr>\r\n\t\t  \r\n\t\t\t<script type=\"text/javascript\">\r\n\t\t\t$('#movie-loading').hide();\r\n\t\t\t</script>\r\n        "
    //  根据 response.body 的内容，获取其中的magnet链接和大小信息，然后返回最大的那个磁链
    
    const magnetLinks = [...new Set(response.body.match(/magnet:\?xt=urn:btih:[A-F0-9]+&dn=[^&"']+/gi))]; // 获取并去重所有的magnet链接
    const sizes = response.body.match(/\d+\.\d+GB|\d+MB/g); // 获取所有的大小信息
    logger.info(`magnetLinks: ${magnetLinks} `);
    logger.info(`sizes: ${sizes} `);
    // 检查是否匹配到了磁链和大小信息
    if (magnetLinks && sizes) {
      const magnetSizePairs = magnetLinks.map((magnetLink, index) => ({
        magnetLink,
        size: sizes[index], // 对应大小信息
      }));
      logger.debug(`magnetSizePairs: ${magnetSizePairs} `);
      // 解析大小信息为数字，单位为MB
      const parsedMagnetSizePairs = magnetSizePairs.map((pair) => ({
        magnetLink: pair.magnetLink,
        size: parseFloat(pair.size.replace('GB', '').replace('MB', '')) * (pair.size.includes('GB') ? 1024 : 1), // 转换为MB

      }))
      logger.debug(`parsedMagnetSizePairs: ${parsedMagnetSizePairs} `);
      // 找到最大的磁链
      const maxSizePair = parsedMagnetSizePairs.reduce((max, current) => {
        return current.size > max.size? current : max;
      }, { size: 0 });
      logger.debug(`maxSizePair: ${maxSizePair} `);
      return maxSizePair.magnetLink; // 返回最大的磁链
    } else {
      return null; // 如果没有匹配到磁链和大小信息，返回null
    }
    
    
    // const $ = require('cheerio').load(response.body);




    // const magnetLinks = $('tr')
    //   .map((i, row) => {
    //     const magnetLink = $(row).find('td a').first().attr('href'); // 获取第一个 <a> 元素的 href 属性
    //     const sizeText = $(row).find('td').eq(1).text().trim(); // 获取第二个 <td> 元素的文本内容，并去除首尾空格
    //     const sizeMatch = /([\d.]+)(GB|MB)/i.exec(sizeText);
    //     logger.debug(`magnetLink: ${magnetLink} `);
    //     logger.info(`sizeText: ${sizeText} `);
    //     logger.info(`sizeMatch: ${sizeMatch} `);
    //     // 检查是否匹配到了大小信息
    //     if (magnetLink && sizeMatch) {
    //       const size = parseFloat(sizeMatch[1]);
    //       const unit = sizeMatch[2].toUpperCase();
    //       return {
    //         magnetLink,
    //         size: unit === 'GB' ? size * 1024 : size, // Convert GB to MB for comparison
    //       };
    //     }
    //     return null;
    //   })
    //   .get()
    //   .filter(Boolean)
    //   .sort((a, b) => b.size - a.size)
    //   .map(item => item.magnetLink);
    // return magnetLinks.length > 0 ? magnetLinks : null;

  }

}


module.exports = Parser;