/**
 * Magnet extraction characterization tests (issue #91)
 *
 * These tests pin the EXACT current behavior of RequestHandler.fetchMagnet as
 * it exists today, BEFORE the magnet-extraction logic is refactored out into a
 * pure function. They are characterization tests: they document the current
 * contract on purpose — including the quirks — so that a later refactor can
 * prove it preserves behavior.
 *
 * Pinned behaviors:
 *  - Default mode selects the LARGEST magnet (file size normalized to MB;
 *    GB * 1024).
 *  - allmag mode returns EVERY magnet.
 *  - Positional pairing quirk: magnets[i] is paired with sizes[i] (both are
 *    derived from independent regexes over the body, then zipped by index).
 *  - The '\n'-joined MagnetResult.magnet string in allmag mode (the dead
 *    backward-compat field — it has no production reader today; pinned anyway).
 *  - Edge cases:
 *      * No size string anywhere in body            -> null (both modes)
 *      * Sizes present but no magnets  + allmag     -> { magnet:'', magnetLinks:[] }
 *      * Sizes present but no magnets  + default    -> null
 *
 * The test transport is exercised via the NODE_ENV='test' branch in
 * fetchMagnet, which routes through getXMLHttpRequest (axios). The fixture
 * test/fixtures/magnet-response.txt is real table-row HTML (~13KB).
 *
 * DO NOT "fix" the quirks pinned here. A later slice will relocate these tests
 * onto a pure function.
 */
const assert = require('assert');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RequestHandler = require('../../dist/core/requestHandler').default;

const BASE = 'https://www.javbus.com';

/**
 * Build a RequestHandler config. Mirrors the shape used by the production code
 * path in fetchMagnet (base/BASE_URL/headers/Cookie/allmag).
 */
function makeConfig(overrides = {}) {
  return {
    retryCount: 1,
    retryDelay: 100,
    BASE_URL: BASE + '/',
    baseUrl: BASE + '/',
    base: BASE + '/',
    parallel: 2,
    headers: { Referer: BASE + '/', Cookie: 'existmag=mag' },
    output: os.tmpdir(),
    search: null,
    allmag: false,
    nopic: false,
    timeout: 5000,
    searchUrl: '/search',
    limit: 0,
    delay: 1,
    ...overrides
  };
}

/** Valid metadata that passes the gid/img/uc validation guards in fetchMagnet. */
function makeMetadata(overrides = {}) {
  return {
    title: 'TEST-123 Test Film',
    gid: '1234567890',
    img: 'pics/cover/test.jpg',
    uc: 'abc123456',
    category: [],
    actress: [],
    ...overrides
  };
}

/**
 * Intercept the AJAX magnet endpoint and return `body` with HTTP 200.
 * The interceptor matches the uncledatoolsbyajax URL that fetchMagnet builds.
 */
function interceptMagnetAjax(body) {
  axios.interceptors.request.use((config) => {
    const requestUrl = config.url || '';
    if (!requestUrl.includes('ajax/uncledatoolsbyajax')) return config;
    const response = {
      data: body,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      request: {}
    };
    config.adapter = () => Promise.resolve(response);
    return config;
  });
}

describe('fetchMagnet magnet extraction (characterization, issue #91)', function () {
  // The fixture is the source of truth for the "happy path" assertions below.
  const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'magnet-response.txt');
  const fixtureBody = fs.readFileSync(FIXTURE_PATH, 'utf8');

  afterEach(function () {
    axios.interceptors.request.clear();
  });

  // ─── happy path: real fixture ──────────────────────────────────
  describe('default mode (largest magnet)', function () {
    it('selects the largest magnet by file size (GB normalized to MB)', async function () {
      interceptMagnetAjax(fixtureBody);
      const rh = new RequestHandler(makeConfig());
      const result = await rh.fetchMagnet(makeMetadata());

      // Largest in the fixture is the 9.13GB [4K] magnet (9349.12 MB).
      const LARGEST = 'magnet:?xt=urn:btih:9bf7cdd5ecd88146e5a59163b14e9fa487a54d3f&dn=SDMUA-088.%5B4K%5D';
      assert.ok(result, 'expected a result, got null');
      assert.strictEqual(result.magnet, LARGEST, '.magnet must be the largest magnet link');
      assert.ok(result.magnetLinks, 'magnetLinks array must be present');
      assert.strictEqual(result.magnetLinks.length, 1, 'default mode returns exactly one magnet');
      assert.deepStrictEqual(result.magnetLinks[0], { link: LARGEST, size: '9.13GB' });
    });

    it('formats size with GB suffix when >= 1024 MB', async function () {
      // The largest (9.13GB) is well above 1024 MB → GB formatting path.
      interceptMagnetAjax(fixtureBody);
      const rh = new RequestHandler(makeConfig());
      const result = await rh.fetchMagnet(makeMetadata());
      assert.ok(result.magnetLinks[0].size.endsWith('GB'));
      assert.strictEqual(result.magnetLinks[0].size, '9.13GB');
    });

    it('prefers GB-sized magnet over larger-count MB-sized magnets', async function () {
      // Hand-crafted body: the MB magnet (2048.00MB = 2GB) is larger than the
      // 1.50GB magnet but smaller than the 4.00GB magnet — confirms GB/MB are
      // normalized to a common MB unit before comparison.
      const body = [
        '<a href="magnet:?xt=urn:btih:AAAA&dn=small-gb">x</a><td>1.50GB</td>',
        '<a href="magnet:?xt=urn:btih:BBBB&dn=big-mb">x</a><td>2048.00MB</td>',
        '<a href="magnet:?xt=urn:btih:CCCC&dn=biggest-gb">x</a><td>4.00GB</td>'
      ].join('');
      interceptMagnetAjax(body);
      const rh = new RequestHandler(makeConfig());
      const result = await rh.fetchMagnet(makeMetadata());
      assert.strictEqual(result.magnet, 'magnet:?xt=urn:btih:CCCC&dn=biggest-gb');
    });
  });

  describe('allmag mode (every magnet)', function () {
    it('returns every distinct magnet from the fixture (8 total)', async function () {
      interceptMagnetAjax(fixtureBody);
      const rh = new RequestHandler(makeConfig({ allmag: true }));
      const result = await rh.fetchMagnet(makeMetadata());

      assert.ok(result);
      // The fixture contains 8 distinct btih hashes (3 href/onclick copies per
      // row collapse to one via the Set dedup).
      assert.strictEqual(result.magnetLinks.length, 8);

      const expectedLinks = [
        'magnet:?xt=urn:btih:23d763d602ee7a4491735103987d44d86ee481f5&dn=SDMUA-088',
        'magnet:?xt=urn:btih:f00ee9375678077896103959b06be707567c6375&dn=%E7%AC%AC%E4%B8%80%E6%9C%83%E6%89%80%E6%96%B0%E7%89%87%40SIS001%40SDMUA-088',
        'magnet:?xt=urn:btih:9bf7cdd5ecd88146e5a59163b14e9fa487a54d3f&dn=SDMUA-088.%5B4K%5D',
        'magnet:?xt=urn:btih:6b7dd033811a507783e5326f21681b536243fcee&dn=SDMUA-088',
        'magnet:?xt=urn:btih:c80c985f4bb4277729127eec0618eb0c4793b8b3&dn=SDMUA-088',
        'magnet:?xt=urn:btih:993701FB08A2B6000D100F941B940B68DDBDF206&dn=SDMUA-088',
        'magnet:?xt=urn:btih:8F7BC6AE24D1D99A2B44634238D83D554306BC04&dn=SDMUA088',
        'magnet:?xt=urn:btih:172D419C73ED35FDE9D4FE34D345EE45F33BDBA1&dn=SDMUA088'
      ];
      assert.deepStrictEqual(
        result.magnetLinks.map((m) => m.link),
        expectedLinks
      );
    });

    it('preserves document order (positional magnets[i] <-> sizes[i] pairing)', async function () {
      interceptMagnetAjax(fixtureBody);
      const rh = new RequestHandler(makeConfig({ allmag: true }));
      const result = await rh.fetchMagnet(makeMetadata());

      // The pairing quirk: each magnet is paired with the size at the SAME
      // index from an independent regex match over the body. Pinned here so a
      // refactor cannot silently re-pair them.
      const expectedPairs = [
        { link: 'magnet:?xt=urn:btih:23d763d602ee7a4491735103987d44d86ee481f5&dn=SDMUA-088', size: '4.87GB' },
        { link: 'magnet:?xt=urn:btih:f00ee9375678077896103959b06be707567c6375&dn=%E7%AC%AC%E4%B8%80%E6%9C%83%E6%89%80%E6%96%B0%E7%89%87%40SIS001%40SDMUA-088', size: '4.89GB' },
        { link: 'magnet:?xt=urn:btih:9bf7cdd5ecd88146e5a59163b14e9fa487a54d3f&dn=SDMUA-088.%5B4K%5D', size: '9.13GB' },
        { link: 'magnet:?xt=urn:btih:6b7dd033811a507783e5326f21681b536243fcee&dn=SDMUA-088', size: '1.07GB' },
        { link: 'magnet:?xt=urn:btih:c80c985f4bb4277729127eec0618eb0c4793b8b3&dn=SDMUA-088', size: '2.01GB' },
        { link: 'magnet:?xt=urn:btih:993701FB08A2B6000D100F941B940B68DDBDF206&dn=SDMUA-088', size: '2.20GB' },
        { link: 'magnet:?xt=urn:btih:8F7BC6AE24D1D99A2B44634238D83D554306BC04&dn=SDMUA088', size: '1.25GB' },
        { link: 'magnet:?xt=urn:btih:172D419C73ED35FDE9D4FE34D345EE45F33BDBA1&dn=SDMUA088', size: '1.53GB' }
      ];
      assert.deepStrictEqual(result.magnetLinks, expectedPairs);
    });

    it('produces the dead \'\\n\'-joined .magnet string (backward-compat field)', async function () {
      interceptMagnetAjax(fixtureBody);
      const rh = new RequestHandler(makeConfig({ allmag: true }));
      const result = await rh.fetchMagnet(makeMetadata());

      // .magnet has no production reader today, but its exact shape is pinned
      // because it is part of the public MagnetResult contract.
      const links = result.magnetLinks.map((m) => m.link);
      assert.strictEqual(result.magnet, links.join('\n'));
      // Sanity: a multi-magnet body yields a multi-line string.
      assert.ok(result.magnet.includes('\n'), 'allmag .magnet must contain newlines when >1 magnet');
      assert.strictEqual(result.magnet.split('\n').length, 8);
    });
  });

  // ─── quirks ────────────────────────────────────────────────────
  describe('quirks (pinned, do not "fix")', function () {
    it('dedups magnets via Set but does NOT dedup sizes (independent regexes)', async function () {
      // Two distinct magnets, but the size "1.00GB" appears twice. The size
      // regex is applied to the whole body, so duplicates are NOT removed.
      // sizes.length here is 2 while distinct magnets is 2 — but if a magnet
      // string repeated, magnets would collapse while sizes would not,
      // shifting the positional pairing. This test pins the independence.
      const body = [
        '<a href="magnet:?xt=urn:btih:AAAA&dn=dup">x</a><td>1.00GB</td>',
        '<a href="magnet:?xt=urn:btih:AAAA&dn=dup">x</a><td>1.00GB</td>',
        '<a href="magnet:?xt=urn:btih:BBBB&dn=other">x</a><td>2.00GB</td>'
      ].join('');
      interceptMagnetAjax(body);
      const rh = new RequestHandler(makeConfig({ allmag: true }));
      const result = await rh.fetchMagnet(makeMetadata());

      // Set collapses the 3 hrefs to 2 distinct magnets; sizes regex yields 3.
      assert.strictEqual(result.magnetLinks.length, 2, 'distinct magnets after Set dedup');
      // Positional pairing: magnets[0]=AAAA pairs with sizes[0]=1.00GB;
      // magnets[1]=BBBB pairs with sizes[1]=1.00GB (the SECOND size), NOT
      // sizes[2]=2.00GB. This is the quirk.
      assert.strictEqual(result.magnetLinks[0].link.includes('AAAA'), true);
      assert.strictEqual(result.magnetLinks[0].size, '1.00GB');
      assert.strictEqual(result.magnetLinks[1].link.includes('BBBB'), true);
      assert.strictEqual(result.magnetLinks[1].size, '1.00GB', 'BBBB pairs with sizes[1], not sizes[2]');
    });

    it('default-mode .magnet is a raw link string (NOT \'\\n\'-joined)', async function () {
      interceptMagnetAjax(fixtureBody);
      const rh = new RequestHandler(makeConfig()); // allmag=false
      const result = await rh.fetchMagnet(makeMetadata());
      assert.ok(!result.magnet.includes('\n'), 'default .magnet must be a single link with no newline');
    });
  });

  // ─── edge cases ────────────────────────────────────────────────
  describe('edge cases', function () {
    it('returns null when body contains no size string at all (default mode)', async function () {
      interceptMagnetAjax('<html><body>no magnets, no sizes here</body></html>');
      const rh = new RequestHandler(makeConfig());
      const result = await rh.fetchMagnet(makeMetadata());
      assert.strictEqual(result, null);
    });

    it('returns null when body contains no size string at all (allmag mode)', async function () {
      interceptMagnetAjax('<html><body>no magnets, no sizes here</body></html>');
      const rh = new RequestHandler(makeConfig({ allmag: true }));
      const result = await rh.fetchMagnet(makeMetadata());
      assert.strictEqual(result, null);
    });

    it('returns {magnet:"", magnetLinks:[]} when sizes present but no magnets + allmag', async function () {
      // magnetLinks comes back as an empty array (NOT null) because of
      // [...new Set(null-ish)] — wait: with no magnet match, .match returns
      // null, [...new Set(null)] throws. In practice the guard is reached
      // because magnetLinks=[] (empty) is truthy-or-falsy per `!magnetLinks`.
      // Pinning the actual outcome: empty result object.
      interceptMagnetAjax('<table><tr><td>4.87GB</td></tr><tr><td>1.00GB</td></tr></table>');
      const rh = new RequestHandler(makeConfig({ allmag: true }));
      const result = await rh.fetchMagnet(makeMetadata());
      assert.deepStrictEqual(result, { magnet: '', magnetLinks: [] });
    });

    it('returns null when sizes present but no magnets + default mode', async function () {
      // Default branch reduce()s over an empty parsedPairs with initial value
      // parsedPairs[0] === undefined; the `if (maxSizePair)` guard then leaves
      // result as null. Pinning that it does NOT throw and returns null.
      interceptMagnetAjax('<table><tr><td>4.87GB</td></tr><tr><td>1.00GB</td></tr></table>');
      const rh = new RequestHandler(makeConfig());
      const result = await rh.fetchMagnet(makeMetadata());
      assert.strictEqual(result, null);
    });
  });
});
