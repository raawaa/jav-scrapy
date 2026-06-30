# Cloudflare 403 diagnostic (`cf-diag.js`)

This is a throwaway diagnostic script for triaging Cloudflare-style 4xx / connection
errors against javbus.com (and similar targets). It is **not** part of the production
product. It exists only to gather hard data from a reporter's environment so a real
fix can be specified.

If you opened issue #67 (or similar — "Request failed with status code 403" or "处理详情页失败")
and a maintainer asked you to run `cf-diag.js`, this is what you do.

## What it does

For each of four javbus endpoints the scraper hits, the script fires three requests
back-to-back and tallies pass/fail:

| Stack | What it is | What it represents |
|-------|-----------|-------------------|
| `bare`  | axios + minimal headers (UA, Accept, Accept-Language, Accept-Encoding, Cache-Control, Cookie `existmag=mag`) | **Exactly** what `requestHandler.getPage` (`src/core/requestHandler.ts:106-197`) sends for listing & detail pages today |
| `full`  | bare + a Chromium-145 client-hint envelope (`Sec-CH-UA`, `Sec-CH-UA-Mobile`, `Sec-CH-UA-Platform`, `Sec-Fetch-*`, `Upgrade-Insecure-Requests`) | A "what if we just added every modern header" theoretical ceiling — measures whether the gap is header-only or deeper |
| `koon`  | `koonjs` (Rust + BoringSSL, browser profile `chrome145`) | **Exactly** what `requestHandler.fetchMagnet` (`src/core/requestHandler.ts:199-274`) already does for the AJAX magnet endpoint |

The four probes:

1. `main listing /page/2` — bare listing pagination
2. `genre /genre/3` — category page
3. `detail page SSIS-001` — single-film detail page
4. `AJAX uncledatoolsbyajax` — the magnet AJAX endpoint

## How to run it

You need the repo's dependencies installed once:

```bash
npm install
npm run build   # builds dist/core/constants.js which the script imports
```

Then:

```bash
node test/diagnostics/cf-diag.js
```

Defaults: 2 iterations, 3.5s delay between probes, 12s timeout, **direct (no proxy)**.
Override any of them:

```bash
node test/diagnostics/cf-diag.js 2 3500 12000 none
node test/diagnostics/cf-diag.js 3 5000 15000 'http://127.0.0.1:7890'   # only if you actually use this proxy normally
```

The script prints a human-readable progress line per probe followed by a tally and a
`JSON-BLOB` block at the end. The blob is the part to paste back into the issue.

## Critical: don't proxy through a tunnel

If you run jav-scrapy through a proxy in production (because you're behind GFW, on a
VPN, or in a data center), Cloudflare sees the **proxy's outbound IP**, not yours.
That makes the script useless for reproducing your own error.

For #67 triage you want to run this *bare* from the network where the actual error
happens. If you normally run the scraper through a proxy, run the proxy too — and
note it in the issue.

## What the result means

Three broad outcomes:

- **`bare FAIL, koon PASS`** on the same probe — JA3 fingerprinting is confirmed; the
  fix is to route `getPage` through koonjs too (or another TLS-fingerprinting
  mitigation). This is the prediction behind `1.4.0`-era plans.
- **All three PASS** — JA3 isn't the issue here. Likely rate-limiting, IP reputation,
  session state, or a server-side change that broke something else (parsing, cookies,
  age-verification redirect). Diagnose further by reading the body of the 200 response
  and comparing it to the fixture under `test/fixtures/`.
- **All three FAIL** — typically a problem *outside* the request stack: cookie expiry,
  blocked IP, proxy required, or Cloudflare deployed an aggressive bot fight that
  no Chrome fingerprint passes.

## Cleaning up

The script is a one-off. Once the underlying bug is fixed and the regression is
covered by a unit test, delete this directory:

```bash
rm -rf test/diagnostics
```
