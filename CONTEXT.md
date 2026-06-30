# CONTEXT.md — Domain Glossary

Names for the seams and concepts in jav-scrapy. Architecture reviews and ADRs use
these terms; when a module is named after a concept, add it here.

## Core pipeline

- **Film** — the central domain object. A film carries metadata
  (`gid`/`uc`/`img`/`title`/`category`/`actress`), magnet links, and a poster
  image. Persisted as `FilmData`.
- **Index page** — a listing page; yields film links (`parsePageLinks`).
- **Detail page** — a single film's page; yields `Metadata` and is the entry to
  magnet fetching.
- **Detail-page pipeline** — the per-film flow: fetch detail page → parse
  metadata → fetch magnets → assemble `FilmData`. Currently buried inside the
  detail-page queue worker (`queueManager.ts`) and split across event handlers.
  (Architecture-review candidate B: lift into a named module.)
- **Magnet extraction** — the pure transform from the AJAX
  (`uncledatoolsbyajax`) response body to a `MagnetResult`: regex magnets +
  sizes, GB/MB normalization, largest-vs-`allmag` selection. Lives in
  `parser.ts` as `extractMagnetLinks`. Deepened out of
  `RequestHandler.fetchMagnet` (architecture-review candidate A).
- **Anti-block URL** (防屏蔽地址) — mirror domains scraped from the alert box,
  cached locally (`getAntiBlockUrlsPath`) and randomly selected as the base URL.

## Data shapes

- **Magnet link** — a `magnet:?xt=urn:btih:...` URI with an associated file size.
- **`MagnetResult.magnet`** — a `'\n'`-joined string kept for backward
  compatibility only; it has **no production reader**. `magnetLinks[]` is the
  structured form consumers actually use.
- **`FilmData`** — the per-film projection persisted to disk. Carries `title`,
  `magnetLinks[]`, `category[]`, `actress[]`, and `originalLink` (the source
  detail-page URL). Notably **does not** carry `gid`/`img` from `Metadata` —
  see ADR-0002 for the projection rationale.

## Routes into the listing pages

- **Star URL** (`/star/<id>`) — a listing scoped to one actress. Routes through
  the same pagination branch as `/genre/` and `/search/` in
  `getCurrentIndexPageUrl` (`src/jav.ts:270`), so `/star/2nv/2` paginates
  directly without going through the `/page/N` fallback.
- **Genre URL** (`/genre/<slug>`) — listing scoped to one category.
- **Search URL** (`/search/<keyword>`) — keyword-search listing.

## Output formats

- **Output format** — the file format produced by `FileHandler`. Driven by
  `--format json|csv` (default `json`). `xlsx` is planned but deferred (issue
  #72 follow-up).
- **Film JSON store** (`filmData.json`) — the authoritative per-crawl output.
  Smart de-dup and field-merging happen here (`src/core/fileHandler.ts:90-238`).
- **Film CSV view** (`filmData.csv`) — a flat, human-readable projection of
  the JSON store. One row per film. Column order:
  `title, original_link, magnets, actress, category`. Array fields are joined
  by `|`; magnets serialised as `link (size)` pairs (e.g.
  `magnet:?xt=... (1.5GB)|magnet:?xt=... (2.3GB)`). UTF-8 with BOM; RFC 4180
  escaping. CSV is **derived from JSON** (ADR-0001): even when `--format csv`
  is selected, JSON is written silently as the view's backing store, and CSV
  is appended per film after the corresponding JSON write.
