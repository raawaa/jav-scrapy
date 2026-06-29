/**
 * extractMagnetLinks characterization tests (issues #91 → #92)
 *
 * Originally pinned RequestHandler.fetchMagnet's end-to-end behavior (issue #91,
 * via the NODE_ENV='test' transport). Issue #92 extracted the pure parsing into
 * parser.extractMagnetLinks; these tests now call that pure function DIRECTLY —
 * same fixtures, same expected outputs, no HTTP transport, no fetchMagnet.
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
 * The fixture test/fixtures/magnet-response.txt is real table-row HTML (~13KB).
 *
 * DO NOT "fix" the quirks pinned here.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { extractMagnetLinks } = require('../../dist/core/parser');

describe('extractMagnetLinks (characterization, issues #91→#92)', function () {
  // The fixture is the source of truth for the "happy path" assertions below.
  const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'magnet-response.txt');
  const fixtureBody = fs.readFileSync(FIXTURE_PATH, 'utf8');

  // ─── happy path: real fixture ──────────────────────────────────
  describe('default mode (largest magnet)', function () {
    it('selects the largest magnet by file size (GB normalized to MB)', function () {
      const result = extractMagnetLinks(fixtureBody, { allmag: false });

      // Largest in the fixture is the 9.13GB [4K] magnet (9349.12 MB).
      const LARGEST = 'magnet:?xt=urn:btih:9bf7cdd5ecd88146e5a59163b14e9fa487a54d3f&dn=SDMUA-088.%5B4K%5D';
      assert.ok(result, 'expected a result, got null');
      assert.strictEqual(result.magnet, LARGEST, '.magnet must be the largest magnet link');
      assert.ok(result.magnetLinks, 'magnetLinks array must be present');
      assert.strictEqual(result.magnetLinks.length, 1, 'default mode returns exactly one magnet');
      assert.deepStrictEqual(result.magnetLinks[0], { link: LARGEST, size: '9.13GB' });
    });

    it('formats size with GB suffix when >= 1024 MB', function () {
      // The largest (9.13GB) is well above 1024 MB → GB formatting path.
      const result = extractMagnetLinks(fixtureBody, { allmag: false });
      assert.ok(result.magnetLinks[0].size.endsWith('GB'));
      assert.strictEqual(result.magnetLinks[0].size, '9.13GB');
    });

    it('prefers GB-sized magnet over larger-count MB-sized magnets', function () {
      // Hand-crafted body: the MB magnet (2048.00MB = 2GB) is larger than the
      // 1.50GB magnet but smaller than the 4.00GB magnet — confirms GB/MB are
      // normalized to a common MB unit before comparison.
      const body = [
        '<a href="magnet:?xt=urn:btih:AAAA&dn=small-gb">x</a><td>1.50GB</td>',
        '<a href="magnet:?xt=urn:btih:BBBB&dn=big-mb">x</a><td>2048.00MB</td>',
        '<a href="magnet:?xt=urn:btih:CCCC&dn=biggest-gb">x</a><td>4.00GB</td>'
      ].join('');
      const result = extractMagnetLinks(body, { allmag: false });
      assert.strictEqual(result.magnet, 'magnet:?xt=urn:btih:CCCC&dn=biggest-gb');
    });
  });

  describe('allmag mode (every magnet)', function () {
    it('returns every distinct magnet from the fixture (8 total)', function () {
      const result = extractMagnetLinks(fixtureBody, { allmag: true });

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

    it('preserves document order (positional magnets[i] <-> sizes[i] pairing)', function () {
      const result = extractMagnetLinks(fixtureBody, { allmag: true });

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

    it('produces the dead \'\\n\'-joined .magnet string (backward-compat field)', function () {
      const result = extractMagnetLinks(fixtureBody, { allmag: true });

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
    it('dedups magnets via Set but does NOT dedup sizes (independent regexes)', function () {
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
      const result = extractMagnetLinks(body, { allmag: true });

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

    it('default-mode .magnet is a raw link string (NOT \'\\n\'-joined)', function () {
      const result = extractMagnetLinks(fixtureBody, { allmag: false }); // allmag=false
      assert.ok(!result.magnet.includes('\n'), 'default .magnet must be a single link with no newline');
    });
  });

  // ─── edge cases ────────────────────────────────────────────────
  describe('edge cases', function () {
    it('returns null when body contains no size string at all (default mode)', function () {
      const result = extractMagnetLinks('<html><body>no magnets, no sizes here</body></html>', { allmag: false });
      assert.strictEqual(result, null);
    });

    it('returns null when body contains no size string at all (allmag mode)', function () {
      const result = extractMagnetLinks('<html><body>no magnets, no sizes here</body></html>', { allmag: true });
      assert.strictEqual(result, null);
    });

    it('returns {magnet:"", magnetLinks:[]} when sizes present but no magnets + allmag', function () {
      // body.match returns null when no magnet matches; new Set(null) is an
      // empty Set, so [...it] === [] (truthy). The `!magnetLinks || !sizes`
      // guard is therefore bypassed, and the allmag branch builds an empty
      // result. Pinning the actual outcome: empty result object.
      const result = extractMagnetLinks('<table><tr><td>4.87GB</td></tr><tr><td>1.00GB</td></tr></table>', { allmag: true });
      assert.deepStrictEqual(result, { magnet: '', magnetLinks: [] });
    });

    it('returns null when sizes present but no magnets + default mode', function () {
      // Default branch reduce()s over an empty parsedPairs with initial value
      // parsedPairs[0] === undefined; the `if (maxSizePair)` guard then leaves
      // result as null. Pinning that it does NOT throw and returns null.
      const result = extractMagnetLinks('<table><tr><td>4.87GB</td></tr><tr><td>1.00GB</td></tr></table>', { allmag: false });
      assert.strictEqual(result, null);
    });
  });
});
