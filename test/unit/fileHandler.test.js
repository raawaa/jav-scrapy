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
const { buildCsvRow, joinField, CSV_HEADER } = require('../../dist/core/fileHandler');

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

  // ─── CSV 辅助函数（#95） ─────────────────────────────
  describe('joinField', function () {
    it('用 | 拼接数组', function () {
      assert.strictEqual(joinField(['a', 'b', 'c']), 'a|b|c');
    });

    it('空数组返回空字符串', function () {
      assert.strictEqual(joinField([]), '');
    });

    it('支持自定义分隔符', function () {
      assert.strictEqual(joinField(['a', 'b'], ','), 'a,b');
    });
  });

  describe('buildCsvRow', function () {
    it('按列顺序生成 CSV 行：title,original_link,magnets,actress,category', function () {
      const row = buildCsvRow({
        title: 'TEST-001',
        originalLink: 'https://www.javbus.com/TEST-001',
        magnetLinks: [
          { link: 'magnet:?xt=urn:btih:AAA', size: '1.00GB' },
          { link: 'magnet:?xt=urn:btih:BBB', size: '500.00MB' }
        ],
        actress: ['浜崎 true', '吉沢明歩'],
        category: ['サンプル', '高清']
      });
      const expected =
        'TEST-001,' +
        'https://www.javbus.com/TEST-001,' +
        'magnet:?xt=urn:btih:AAA (1.00GB)|magnet:?xt=urn:btih:BBB (500.00MB),' +
        '浜崎 true|吉沢明歩,' +
        'サンプル|高清\n';
      assert.strictEqual(row, expected);
    });

    it('无磁链时 magnets 列为空字符串', function () {
      const row = buildCsvRow({
        title: 'NOMAG-001',
        originalLink: 'https://www.javbus.com/NOMAG-001',
        magnetLinks: [],
        actress: ['A'],
        category: ['サンプル']
      });
      assert.strictEqual(
        row,
        'NOMAG-001,https://www.javbus.com/NOMAG-001,,A,サンプル\n'
      );
    });

    it('行尾使用 LF（\\n），不加 BOM、无 RFC 4180 转义（#94 范围）', function () {
      const row = buildCsvRow({
        title: 'TEST-002',
        originalLink: 'https://www.javbus.com/TEST-002',
        magnetLinks: [{ link: 'm', size: '1.00GB' }],
        actress: ['A'],
        category: ['B']
      });
      assert.ok(row.endsWith('\n'), '行尾应为 \\n');
      assert.ok(!row.startsWith('\uFEFF'), '不应包含 BOM');
    });
  });

  // ─── writeFilmDataToCsv ─────────────────────────────
  describe('writeFilmDataToCsv', function () {
    it('首次写入生成带表头的 CSV：表头 + 一行数据', async function () {
      handler = new FileHandler(tmpDir);
      await handler.writeFilmDataToCsv(makeFilmData({
        title: 'CSV-001',
        originalLink: 'https://www.javbus.com/CSV-001',
        magnetLinks: [{ link: 'magnet:?xt=urn:btih:CSV1', size: '2.00GB' }],
        actress: ['浜崎 true'],
        category: ['サンプル']
      }));

      const csvPath = path.join(tmpDir, 'filmData.csv');
      assert.ok(fs.existsSync(csvPath), 'filmData.csv 应生成');
      const content = fs.readFileSync(csvPath, 'utf-8');
      assert.strictEqual(content, CSV_HEADER + '\n' +
        'CSV-001,https://www.javbus.com/CSV-001,magnet:?xt=urn:btih:CSV1 (2.00GB),浜崎 true,サンプル\n');
    });

    it('二次写入只追加数据行，不重复表头', async function () {
      handler = new FileHandler(tmpDir);
      await handler.writeFilmDataToCsv(makeFilmData({
        title: 'CSV-001',
        originalLink: 'https://www.javbus.com/CSV-001',
        magnetLinks: [],
        actress: [],
        category: []
      }));
      await handler.writeFilmDataToCsv(makeFilmData({
        title: 'CSV-002',
        originalLink: 'https://www.javbus.com/CSV-002',
        magnetLinks: [],
        actress: [],
        category: []
      }));

      const csvPath = path.join(tmpDir, 'filmData.csv');
      const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
      assert.strictEqual(lines.length, 3, '表头 + 2 行数据');
      assert.strictEqual(lines[0], CSV_HEADER, '首行为表头');
      assert.ok(lines[1].startsWith('CSV-001,'));
      assert.ok(lines[2].startsWith('CSV-002,'));
    });
  });

  // ─── format=csv 联动 JSON 与 CSV ───────────────────────────────
  describe('format=csv 的去重协调（#95）', function () {
    it('format=json 默认仅写 JSON，不写 CSV（向后兼容）', async function () {
      handler = new FileHandler(tmpDir, { format: 'json' });
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'FMT-001',
        originalLink: 'https://www.javbus.com/FMT-001'
      }));
      assert.ok(fs.existsSync(path.join(tmpDir, 'filmData.json')));
      assert.ok(!fs.existsSync(path.join(tmpDir, 'filmData.csv')), '默认 json 不写 CSV');
    });

    it('format=csv 实际写入时 JSON 与 CSV 同时产出', async function () {
      handler = new FileHandler(tmpDir, { format: 'csv' });
      const data = makeFilmData({
        title: 'FMT-002',
        originalLink: 'https://www.javbus.com/FMT-002',
        magnetLinks: [{ link: 'magnet:?xt=urn:btih:FMT2', size: '1.50GB' }],
        actress: ['A'],
        category: ['B']
      });
      await handler.writeFilmDataToFile(data);

      assert.ok(fs.existsSync(path.join(tmpDir, 'filmData.json')));
      const jsonContent = JSON.parse(fs.readFileSync(path.join(tmpDir, 'filmData.json'), 'utf-8'));
      assert.strictEqual(jsonContent.length, 1);
      assert.strictEqual(jsonContent[0].title, 'FMT-002');

      const csvPath = path.join(tmpDir, 'filmData.csv');
      assert.ok(fs.existsSync(csvPath));
      const csvLines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
      assert.strictEqual(csvLines.length, 2, '表头 + 1 行');
      assert.strictEqual(csvLines[0], CSV_HEADER);
      assert.ok(csvLines[1].startsWith('FMT-002,https://www.javbus.com/FMT-002,magnet:?xt=urn:btih:FMT2 (1.50GB),A,B'));
    });

    it('format=csv 重复标题跳过时 JSON 与 CSV 都不写', async function () {
      handler = new FileHandler(tmpDir, { format: 'csv' });
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'DUP-001',
        originalLink: 'https://www.javbus.com/DUP-001'
      }));

      const csvPath = path.join(tmpDir, 'filmData.csv');
      const csvLinesAfterFirst = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
      assert.strictEqual(csvLinesAfterFirst.length, 2, '首次写入：表头 + 1 行');

      // 重复写入同一标题 -> JSON & CSV 都跳过
      await handler.writeFilmDataToFile(makeFilmData({
        title: 'DUP-001',
        originalLink: 'https://www.javbus.com/DUP-001-different'
      }));
      const csvLinesAfterDup = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
      assert.strictEqual(csvLinesAfterDup.length, 2, '重复跳过后 CSV 行数不变');
      const jsonContent = JSON.parse(fs.readFileSync(path.join(tmpDir, 'filmData.json'), 'utf-8'));
      assert.strictEqual(jsonContent.length, 1, '重复跳过后 JSON 不新增');
    });
  });

});
