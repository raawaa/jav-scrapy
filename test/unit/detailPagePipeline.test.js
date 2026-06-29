/**
 * DetailPagePipeline 单元测试
 *
 * 表格驱动五场景：
 *   1. 完整成功：HTML 解析 + 磁链成功 → 返回 { filmData, metadata } 含磁链
 *   2. 磁链为 null（软失败）：返回 { filmData, metadata } 不含磁链
 *   3. 磁链抛错（软失败）：返回 { filmData, metadata } 不含磁链
 *   4. 元数据抛错（硬失败）：返回 null
 *   5. getPage 返回 null（硬失败）：返回 null
 *
 * 接口只有一个 process(link)；fake 注入 RequestHandler 走的是构造函数注入。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DetailPagePipeline = require('../../dist/core/pipelines/detailPage').default;
const { parseMetadata } = require('../../dist/core/parser');

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const DETAIL_HTML = fs.readFileSync(path.join(FIXTURES_DIR, 'detail-page.html'), 'utf-8');

const LINK = 'https://www.javbus.com/START-563';

function makeFakeRequestHandler({ page, magnets }) {
  return {
    getPage: async () => page,
    fetchMagnet: magnets
  };
}

describe('DetailPagePipeline', function () {
  let metadata;

  before(function () {
    metadata = parseMetadata(DETAIL_HTML);
  });

  const cases = [
    {
      name: '完整成功：HTML 解析 + 磁链成功',
      fake: () => makeFakeRequestHandler({
        page: { statusCode: 200, body: DETAIL_HTML },
        magnets: async () => ({
          magnet: 'magnet:?xt=urn:btih:DEAD&dn=test',
          magnetLinks: [{ link: 'magnet:?xt=urn:btih:DEAD&dn=test', size: '1.50GB' }]
        })
      }),
      expect: (result) => {
        assert.ok(result, '应返回非 null');
        assert.strictEqual(result.filmData.title, metadata.title, 'filmData.title 来自元数据');
        assert.strictEqual(result.filmData.originalLink, LINK, 'filmData.originalLink 来自 link (ADR-0002)');
        assert.strictEqual(result.filmData.magnetLinks.length, 1, 'filmData.magnetLinks 含一条');
        assert.strictEqual(result.filmData.magnetLinks[0].link, 'magnet:?xt=urn:btih:DEAD&dn=test');
        assert.deepStrictEqual(result.filmData.category, metadata.category);
        assert.deepStrictEqual(result.filmData.actress, metadata.actress);
        assert.deepStrictEqual(result.metadata, metadata, 'metadata 字段与解析结果一致');
      }
    },

    {
      name: '磁链为 null（软失败）：返回影片但无磁链',
      fake: () => makeFakeRequestHandler({
        page: { statusCode: 200, body: DETAIL_HTML },
        magnets: async () => null
      }),
      expect: (result) => {
        assert.ok(result, '应返回非 null');
        assert.strictEqual(result.filmData.title, metadata.title);
        assert.strictEqual(result.filmData.magnetLinks, undefined, 'magnetLinks 字段不出现（parseFilmData 默认）');
      }
    },

    {
      name: '磁链抛错（软失败）：返回影片但无磁链',
      fake: () => makeFakeRequestHandler({
        page: { statusCode: 200, body: DETAIL_HTML },
        magnets: async () => { throw new Error('koonjs boom'); }
      }),
      expect: (result) => {
        assert.ok(result, '应返回非 null');
        assert.strictEqual(result.filmData.title, metadata.title);
        assert.strictEqual(result.filmData.magnetLinks, undefined, '抛错不丢影片');
      }
    },

    {
      name: '元数据抛错（硬失败）：返回 null',
      fake: () => makeFakeRequestHandler({
        page: { statusCode: 200, body: '<html>no script</html>' },
        magnets: async () => { throw new Error('不应被调用'); }
      }),
      expect: (result) => {
        assert.strictEqual(result, null, 'parseMetadata 抛错 → 整条返回 null');
      }
    },

    {
      name: 'getPage 返回 null（硬失败）：返回 null',
      fake: () => makeFakeRequestHandler({
        page: null,
        magnets: async () => { throw new Error('不应被调用'); }
      }),
      expect: (result) => {
        assert.strictEqual(result, null, 'getPage 返 null → 整条返回 null');
      }
    }
  ];

  cases.forEach((c) => {
    it(c.name, async function () {
      const fake = c.fake();
      const pipeline = new DetailPagePipeline(/** @type {any} */ (fake));
      const result = await pipeline.process(LINK);
      c.expect(result);
    });
  });
});
