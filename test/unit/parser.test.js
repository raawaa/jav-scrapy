/**
 * Parser 单元测试
 *
 * 覆盖所有 6 个 static 方法：
 *   parsePageLinks, parseMetadata, parseCategories,
 *   parseActress, parseFilmData, extractAntiBlockUrls
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 从编译后的 JS 加载 Parser
const { parsePageLinks, parseMetadata, parseCategories, parseActress, parseFilmData, extractAntiBlockUrls } = require("../../dist/core/parser");

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

describe('Parser', function () {
  let homepageHtml, page2Html, detailPageHtml, genreHtml, ageVerifyHtml;

  before(function () {
    homepageHtml  = fs.readFileSync(path.join(FIXTURES_DIR, 'homepage.html'), 'utf-8');
    page2Html     = fs.readFileSync(path.join(FIXTURES_DIR, 'page2.html'), 'utf-8');
    detailPageHtml = fs.readFileSync(path.join(FIXTURES_DIR, 'detail-page.html'), 'utf-8');
    genreHtml     = fs.readFileSync(path.join(FIXTURES_DIR, 'genre-page.html'), 'utf-8');
    ageVerifyHtml = fs.readFileSync(path.join(FIXTURES_DIR, 'age-verify.html'), 'utf-8');
  });

  // ─── parsePageLinks ────────────────────────────────────
  describe('parsePageLinks', function () {
    it('从首页提取 30 个影片链接', function () {
      const links = parsePageLinks(homepageHtml);
      assert.ok(Array.isArray(links), '应返回数组');
      assert.strictEqual(links.length, 30, '首页应有 30 部影片');
      links.forEach((link, i) => {
        assert.ok(
          /^https:\/\/www\.javbus\.com\/[A-Z0-9]+-?\d+/.test(link),
          `链接 #${i} 格式异常: ${link}`
        );
      });
    });

    it('从第 2 页提取 30 个影片链接', function () {
      const links = parsePageLinks(page2Html);
      assert.ok(Array.isArray(links));
      assert.strictEqual(links.length, 30, '第 2 页应有 30 部影片');
    });

    it('空 HTML 返回空数组', function () {
      assert.deepStrictEqual(parsePageLinks(''), []);
    });

    it('驾考题页面（无影片链接）返回空数组', function () {
      const links = parsePageLinks(ageVerifyHtml);
      assert.ok(Array.isArray(links));
      assert.strictEqual(links.length, 0, '驾考题页面不应有影片链接');
    });
  });

  // ─── parseMetadata ────────────────────────────────────
  describe('parseMetadata', function () {
    it('从详情页提取完整元数据', function () {
      const meta = parseMetadata(detailPageHtml);
      assert.ok(meta, '应返回元数据对象');
      assert.ok(typeof meta.gid === 'string' && meta.gid.length > 0, 'gid 应是非空字符串');
      assert.ok(typeof meta.uc === 'string' && meta.uc.length > 0, 'uc 应是非空字符串');
      assert.ok(typeof meta.img === 'string' && meta.img.length > 0, 'img 应是非空字符串');
      assert.ok(typeof meta.title === 'string' && meta.title.length > 0, 'title 应是非空字符串');
      assert.ok(Array.isArray(meta.category), 'category 应是数组');
      assert.ok(Array.isArray(meta.actress), 'actress 应是数组');
    });

    it('空 HTML 抛出 Error', function () {
      assert.throws(() => parseMetadata(''), Error);
    });
  });

  // ─── parseCategories ────────────────────────────────────
  describe('parseCategories', function () {
    it('从详情页提取分类标签', function () {
      const cats = parseCategories(detailPageHtml);
      assert.ok(Array.isArray(cats), '应返回数组');
      assert.ok(cats.length > 0, '应有至少一个分类');
      cats.forEach((c, i) => {
        assert.ok(typeof c === 'string' && c.length > 0, `分类 #${i} 应为非空字符串`);
      });
    });

    it('空 HTML 返回空数组', function () {
      assert.deepStrictEqual(parseCategories(''), []);
    });
  });

  // ─── parseActress ────────────────────────────────────
  describe('parseActress', function () {
    it('从详情页提取演员列表', function () {
      const actresses = parseActress(detailPageHtml);
      assert.ok(Array.isArray(actresses), '应返回数组');
      actresses.forEach((a, i) => {
        assert.ok(typeof a === 'string' && a.length > 0, `演员 #${i} 应为非空字符串`);
      });
    });

    it('空 HTML 返回空数组', function () {
      assert.deepStrictEqual(parseActress(''), []);
    });
  });

  // ─── parseFilmData ────────────────────────────────────
  describe('parseFilmData', function () {
    it('从 Metadata 构造 FilmData', function () {
      const meta = parseMetadata(detailPageHtml);
      const link = 'https://www.javbus.com/START-563';
      const filmData = parseFilmData(meta, link);
      assert.ok(filmData, '应返回 FilmData 对象');
      assert.strictEqual(filmData.title, meta.title, '标题应一致');
      assert.deepStrictEqual(filmData.category, meta.category, '分类应一致');
      assert.deepStrictEqual(filmData.actress, meta.actress, '演员应一致');
      assert.strictEqual(filmData.originalLink, link, 'originalLink 应保留来源详情页 link (ADR-0002)');
    });
  });

  // ─── extractAntiBlockUrls ──────────────────────────────
  describe('extractAntiBlockUrls', function () {
    it('从首页提取防屏蔽地址', function () {
      const urls = extractAntiBlockUrls(homepageHtml);
      assert.ok(Array.isArray(urls), '应返回数组');
      assert.ok(urls.length > 0, '应提取到至少一个防屏蔽地址');
    });

    it('从驾考题页面也应能提取（如果存在）', function () {
      const urls = extractAntiBlockUrls(ageVerifyHtml);
      assert.ok(Array.isArray(urls));
      // 驾考题页面可能没有防屏蔽地址，空数组也可以接受
    });

    it('空 HTML 返回空数组', function () {
      assert.deepStrictEqual(extractAntiBlockUrls(''), []);
    });
  });
});
