/**
 * FileHandler 单元测试
 *
 * 覆盖：构造函数校验、writeFilmDataToFile（新建/去重/智能更新）
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FileHandler = require('../../dist/core/fileHandler').default;

describe('FileHandler', function () {

  let tmpDir;
  let handler;

  function makeFilmData(overrides = {}) {
    return {
      title: overrides.title || 'TEST-123 Test Film',
      magnetLinks: overrides.magnetLinks || [
        { link: 'magnet:?xt=urn:btih:AAA&dn=test', size: '1.00GB' }
      ],
      category: overrides.category || ['サンプル'],
      actress: overrides.actress || ['浜崎 true'],
      ...overrides
    };
  }

  function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fh-test-'));
  });

  afterEach(function () {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  // ─── 构造函数 ────────────────────────────────────
  describe('constructor', function () {
    it('接受有效目录', function () {
      assert.doesNotThrow(() => new FileHandler(tmpDir));
    });

    it('空字符串抛出 Error', function () {
      assert.throws(() => new FileHandler(''), Error);
    });

    it('非字符串抛出 Error', function () {
      assert.throws(() => new FileHandler(null), Error);
      assert.throws(() => new FileHandler(undefined), Error);
      assert.throws(() => new FileHandler(123), Error);
    });

    it('目录不存在时自动创建', async function () {
      const nested = path.join(tmpDir, 'a', 'b', 'c');
      assert.ok(!fs.existsSync(nested));
      new FileHandler(nested);
      // 给 async ensureOutputDirExists 时间完成
      await new Promise(resolve => setTimeout(resolve, 200));
      assert.ok(fs.existsSync(nested));
    });
  });

  // ─── writeFilmDataToFile ─────────────────────────
  describe('writeFilmDataToFile', function () {
    it('创建 filmData.json 并写入第一条数据', async function () {
      handler = new FileHandler(tmpDir);
      const data = makeFilmData();
      await handler.writeFilmDataToFile(data);

      const filePath = path.join(tmpDir, 'filmData.json');
      assert.ok(fs.existsSync(filePath));
      const content = readJson(filePath);
      assert.strictEqual(content.length, 1);
      assert.strictEqual(content[0].title, data.title);
    });

    it('追加不重复的数据', async function () {
      handler = new FileHandler(tmpDir);
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'AAA-001 First',
        magnetLinks: [{ link: 'magnet:?xt=urn:btih:AAA&dn=first', size: '1.00GB' }]
      }));
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'BBB-002 Second',
        magnetLinks: [{ link: 'magnet:?xt=urn:btih:BBB&dn=second', size: '2.00GB' }]
      }));

      const content = readJson(path.join(tmpDir, 'filmData.json'));
      assert.strictEqual(content.length, 2);
    });

    it('标题完全匹配时跳过重复', async function () {
      handler = new FileHandler(tmpDir);
      await handler.writeFilmDataToFile(makeFilmData({ title: 'TEST-123' }));
      await handler.writeFilmDataToFile(makeFilmData({ title: 'TEST-123' }));

      const content = readJson(path.join(tmpDir, 'filmData.json'));
      assert.strictEqual(content.length, 1);
    });

    it('影片 ID 匹配时识别为重复', async function () {
      handler = new FileHandler(tmpDir);
      await handler.writeFilmDataToFile(makeFilmData({ title: 'ABC-123 Full Title' }));
      await handler.writeFilmDataToFile(makeFilmData({ title: 'ABC-123 Different Title' }));

      const content = readJson(path.join(tmpDir, 'filmData.json'));
      assert.strictEqual(content.length, 1);
    });

    it('无效数据抛出 Error', async function () {
      handler = new FileHandler(tmpDir);
      await assert.rejects(
        () => handler.writeFilmDataToFile(null),
        Error
      );
    });

    it('磁力链接不同时更新重复数据', async function () {
      handler = new FileHandler(tmpDir);
      const original = makeFilmData({ title: 'UPD-001', magnetLinks: [{ link: 'magnet:?xt=urn:btih:OLD&dn=old', size: '1.00GB' }] });
      await handler.writeFilmDataToFile(original);

      const updated = makeFilmData({ title: 'UPD-001', magnetLinks: [{ link: 'magnet:?xt=urn:btih:NEW&dn=new', size: '2.00GB' }] });
      await handler.writeFilmDataToFile(updated);

      const content = readJson(path.join(tmpDir, 'filmData.json'));
      assert.strictEqual(content.length, 1);
      assert.strictEqual(content[0].magnetLinks[0].link, 'magnet:?xt=urn:btih:NEW&dn=new');
    });

    it('演员信息更完整时更新', async function () {
      handler = new FileHandler(tmpDir);
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'ACT-001',
        actress: ['浜崎 true']
      }));
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'ACT-001',
        actress: ['浜崎 true', '吉沢明歩']
      }));

      const content = readJson(path.join(tmpDir, 'filmData.json'));
      assert.strictEqual(content.length, 1);
      assert.strictEqual(content[0].actress.length, 2);
    });

    it('分类信息更完整时更新', async function () {
      handler = new FileHandler(tmpDir);
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'CAT-001',
        category: ['サンプル']
      }));
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'CAT-001',
        category: ['サンプル', '高清']
      }));

      const content = readJson(path.join(tmpDir, 'filmData.json'));
      assert.strictEqual(content.length, 1);
      assert.strictEqual(content[0].category.length, 2);
    });

    it('文件中的 JSON 损坏时重新初始化', async function () {
      handler = new FileHandler(tmpDir);
      const filePath = path.join(tmpDir, 'filmData.json');
      fs.writeFileSync(filePath, 'invalid json{', 'utf-8');

      await handler.writeFilmDataToFile(makeFilmData({ title: 'NEW-001' }));
      const content = readJson(filePath);
      assert.strictEqual(content.length, 1);
    });

    it('单对象旧格式自动包装为数组', async function () {
      handler = new FileHandler(tmpDir);
      const filePath = path.join(tmpDir, 'filmData.json');
      // 写一个单对象（非数组）
      fs.writeFileSync(filePath, JSON.stringify({ title: 'OLD-001', category: [], actress: [] }), 'utf-8');

      await handler.writeFilmDataToFile(makeFilmData({ title: 'NEW-002' }));
      const content = readJson(filePath);
      assert.strictEqual(content.length, 2);
    });
  });

});
