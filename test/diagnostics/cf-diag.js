/**
 * Cloudflare 403 differential diagnostic for jav-scrapy issues (#67 and friends).
 *
 * For each listing endpoint jav-scrapy crawls, this hits it three ways and tallies
 * pass/fail rates:
 *
 *   - "bare":   same headers requestHandler.ts:106-197 sends (axios + repo UA + minimal headers).
 *               Reproduces the *unprotected* code path the in-flight crawl takes today.
 *   - "full":   bare + Chromium-145 client-hint envelope (Sec-CH-UA, Sec-Fetch-*).
 *               Shows what "just tweak the headers" would achieve without TLS work.
 *   - "koon":   through the `koonjs` library (Rust + BoringSSL, browser profile chrome145).
 *               Mirrors what `requestHandler.fetchMagnet` already does for AJAX.
 *
 * The bug under triage is that `getPage` (listing + detail) still uses bare axios,
 * while `fetchMagnet` (AJAX) uses koonjs. A useful reproduction shows the bare path
 * failing in the reporter's environment while koon passes. If all three stacks pass,
 * the issue is probably rate-limiting / IP reputation / session state, not JA3.
 *
 * Usage:
 *   node test/diagnostics/cf-diag.js [iters] [delay-ms] [timeout-ms] [proxy-url|none]
 *
 *   iters       default 2 (a 1-iter warmup is implicit, run once plus steady-state sample)
 *   delay-ms    default 3500 (gap between probes, raise if you see rate-limit 429 noise)
 *   timeout-ms  default 12000
 *   proxy-url   default empty. Use `none` to be explicit, or `http://127.0.0.1:7890` etc.
 *               IMPORTANT: if you use a proxy, the proxy's outbound IP — not yours —
 *               is what Cloudflare sees. Run *without* the proxy for a faithful repro
 *               of your own ISP-direct experience.
 */
const axios = require('axios');
const tunnel = require('tunnel');
const { Koon } = require('koonjs');
const { USER_AGENTS } = require('../../dist/core/constants');

const PROBES = [
  { name: 'main listing /page/2',  url: 'https://www.javbus.com/page/2' },
  { name: 'genre /genre/3',        url: 'https://www.javbus.com/genre/3' },
  { name: 'detail page SSIS-001',  url: 'https://www.javbus.com/SSIS-001' },
  { name: 'AJAX uncledatoolsbyajax', url: 'https://www.javbus.com/ajax/uncledatoolsbyajax.php?gid=349968&uc=0&lang=zh&img=ssis001' }
];

const PROXY = (process.argv[5] === 'none' || !process.argv[5]) ? '' : process.argv[5];
let agent = null;
if (PROXY) {
  const u = new URL(PROXY);
  agent = u.protocol === 'http:'
    ? tunnel.httpsOverHttp({ proxy: { host: u.hostname, port: parseInt(u.port, 10) } })
    : tunnel.httpsOverHttps({ proxy: { host: u.hostname, port: parseInt(u.port, 10) } });
}

const HEADERS_BARE = (ua) => ({
  'User-Agent': ua,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Cookie': 'existmag=mag'
});

const HEADERS_FULL = (ua) => {
  const h = HEADERS_BARE(ua);
  if (ua.includes('Chrome') || ua.includes('Edg')) {
    h['Sec-Ch-Ua'] = '"Chromium";v="145", "Not_A Brand";v="99"';
    h['Sec-Ch-Ua-Mobile'] = '?0';
    h['Sec-Ch-Ua-Platform'] = '"Windows"';
    h['Sec-Fetch-Site'] = 'none';
    h['Sec-Fetch-Mode'] = 'navigate';
    h['Sec-Fetch-Dest'] = 'document';
    h['Sec-Fetch-User'] = '?1';
    h['Upgrade-Insecure-Requests'] = '1';
  } else if (ua.includes('Firefox')) {
    h['Sec-Fetch-Site'] = 'none';
    h['Sec-Fetch-Mode'] = 'navigate';
    h['Sec-Fetch-Dest'] = 'document';
    h['Sec-Fetch-User'] = '?1';
    h['Upgrade-Insecure-Requests'] = '1';
  }
  return h;
};

async function axiosProbe(target, ua, headers, timeoutMs) {
  const t0 = Date.now();
  try {
    const r = await axios.get(target.url, {
      timeout: timeoutMs, maxRedirects: 0, validateStatus: s => s < 600,
      httpsAgent: agent, proxy: false, headers
    });
    return { status: r.status, server: r.headers['server'] || '', ms: Date.now() - t0 };
  } catch (e) {
    return { status: e.response?.status || 'ERR', code: e.code || '', ms: Date.now() - t0 };
  }
}

let koon = null;
async function koonProbe(target, timeoutMs) {
  if (!koon) koon = new Koon({ browser: 'chrome145', proxy: PROXY || undefined });
  const t0 = Date.now();
  const p = (async () => {
    const resp = await koon.get(target.url, {
      headers: { 'Accept': '*/*', 'Referer': 'https://www.javbus.com/', 'Cookie': 'existmag=mag' }
    });
    await resp.text();
    return { status: resp.status };
  })();
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('KOON-TIMEOUT')), timeoutMs));
  try {
    const out = await Promise.race([p, timeout]);
    return { status: out.status, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 'ERR', code: e.message?.slice(0, 60) || '', ms: Date.now() - t0 };
  }
}

(async () => {
  const iters = parseInt(process.argv[2] || '2', 10);
  const delayMs = parseInt(process.argv[3] || '3500', 10);
  const timeoutMs = parseInt(process.argv[4] || '12000', 10);
  console.log(`[cf-diag] node=${process.version} iters=${iters} delay=${delayMs} timeout=${timeoutMs} proxy=${PROXY || 'direct'}`);

  await axiosProbe({ url: 'https://www.javbus.com/' }, USER_AGENTS[0], HEADERS_FULL(USER_AGENTS[0]), timeoutMs).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  const out = { bare: [], full: [], koon: [] };
  for (let i = 0; i < iters; i++) {
    const ua = USER_AGENTS[i % USER_AGENTS.length];
    for (const target of PROBES) {
      const a = await axiosProbe(target, ua, HEADERS_BARE(ua), timeoutMs);
      const b = await axiosProbe(target, ua, HEADERS_FULL(ua), timeoutMs);
      const k = await koonProbe(target, timeoutMs);
      a.iter = i; a.probe = target.name;
      b.iter = i; b.probe = target.name;
      k.iter = i; k.probe = target.name;
      out.bare.push(a); out.full.push(b); out.koon.push(k);
      const sig = (r) => r.status === 'ERR' || r.status >= 400 ? `FAIL(${r.code || r.status})` : 'PASS';
      console.log(`[cf-diag] iter=${i} ${target.name.padEnd(28)} ax-bare=${sig(a)} ax-full=${sig(b)} koon=${sig(k)}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  const tally = (arr) => {
    const m = {};
    for (const r of arr) {
      const sig = (r.status === 'ERR' || r.status >= 400) ? 'FAIL' : 'PASS';
      m[r.probe] = m[r.probe] || { PASS: 0, FAIL: 0 };
      m[r.probe][sig]++;
    }
    return m;
  };
  console.log('\n[cf-diag] ========== TALLY ==========');
  for (const [name, arr] of Object.entries(out)) {
    console.log(`[cf-diag] ${name.padEnd(6)}:`, JSON.stringify(tally(arr)));
  }
  console.log('[cf-diag] ========== /TALLY ==========');
  console.log('[cf-diag] bare reproduces what requestHandler.getPage sends today.');
  console.log('[cf-diag] full shows whether header tweaks alone would solve it.');
  console.log('[cf-diag] koon shows what fetchMagnet (AJAX) already does. Use that row to confirm.');
  console.log('[cf-diag] If bare FAILS but koon PASSES on the same probe, JA3 fingerprinting is confirmed.');

  console.log('\n[cf-diag] JSON-BLOB-BEGIN');
  console.log(JSON.stringify({
    node: process.version,
    iters, delayMs, timeoutMs, proxy: PROXY || 'direct',
    bare: tally(out.bare), full: tally(out.full), koon: tally(out.koon),
    raw: out
  }, null, 2));
  console.log('[cf-diag] JSON-BLOB-END');
})().catch(e => { console.error('[cf-diag] FATAL', e); process.exit(1); });
