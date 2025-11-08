# Project Context

## Purpose
**jav-scrapy** is a TypeScript-based web scraper for JAV content that uses a multi-queue architecture for concurrent processing. It crawls magnet links, film metadata, and poster images with anti-blocking capabilities including proxy support and Cloudflare bypass.

## Tech Stack
- **Language**: TypeScript (ES2020 target)
- **Runtime**: Node.js
- **HTTP Client**: Axios with exponential backoff retry
- **HTML Parsing**: Cheerio
- **Browser Automation**: Puppeteer (with stealth plugin)
- **Logging**: Winston
- **CLI Framework**: Commander.js
- **Concurrency**: Custom async queue system (4-stage pipeline)
- **Build System**: npm with TypeScript compiler
- **Release Management**: Semantic-release with conventional commits

## Project Conventions

### Code Style
- **No Global Dependencies**: All tools must be local npm dependencies, use `npx` to run packages
- **File Structure**: `src/` for TypeScript, `dist/` for compiled JavaScript
- **Entry Point**: `dist/jav.js` (set in package.json)
- **Path Handling**: All file operations use absolute paths
- **Error Handling**: Centralized error categorization, graceful degradation
- **Logging**: Winston multi-level logging with debug support

### Architecture Patterns

#### Four-Stage Pipeline Architecture
```
┌─────────────────┐
│  Index Pages    │  Fetch & parse listing pages
│  (Queue 1)      │  [parallel: base]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Detail Pages   │  Process film pages
│  (Queue 2)      │  [parallel: 0.75x]
└────────┬────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│  File Writes    │    │  Image Downloads│
│  (Queue 3)      │    │  (Queue 4)      │
│  [parallel: 2x] │    │  [parallel: 0.5x]│
└─────────────────┘    └─────────────────┘
```

#### Core Components
- **Queue Manager** (`src/core/queueManager.ts`): Four specialized async queues with event-driven architecture
- **Request Handler** (`src/core/requestHandler.ts`): Axios client with retry, proxy support, User-Agent rotation
- **HTML Parser** (`src/core/parser.ts`): Cheerio-based with multiple fallback strategies
- **Configuration** (`src/core/config.ts`): Multi-source config precedence (defaults → system proxy → local cache → CLI)
- **Puppeteer Pool** (`src/core/puppeteerPool.ts`): Resource management for browser instances

#### Concurrency Levels
- Index pages: **1x** (base)
- Detail pages: **0.75x**
- File writes: **2x** (highest priority)
- Image downloads: **0.5x** (lowest priority)

### Testing Strategy
- **No tests currently exist** - test infrastructure is configured (Mocha, Chai, Nock)
- **Test pattern**: `test/*.test.js` expected
- **Requirements**: Tests should be added for all new features
- **Testing approach**: Focus on integration tests for queue system and HTTP handling

### Git Workflow

#### Commit Conventions (Enforced by Husky)
**Format**: `<type>(<scope>): <subject>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no logic change)
- `refactor`: Code refactoring
- `perf`: Performance optimization
- `test`: Testing
- `build`: Build system/dependencies
- `ci`: CI/CD
- `chore`: Other changes

**Scopes**:
- `core`: Core functionality
- `utils`: Utilities
- `parser`: Parser
- `handler`: Handler
- `config`: Configuration
- `cli`: Command-line
- `deps`: Dependencies
- `release`: Release process

**Rules**:
- Subject: no trailing period, not in upper case
- Header max length: 100 characters
- Enforced via `.husky/commit-msg` hook

#### Release Process
- **Automated**: `npm run release` uses semantic-release
- **Version bumping**: Based on conventional commits
- **Deployment**: Automated via semantic-release

## Domain Context

### Web Scraping Specifics
- **Target Content**: JAV (Japanese Adult Video) metadata, magnet links, and poster images
- **Anti-blocking Strategy**:
  - Local URL cache: `~/.jav-scrapy-antiblock-urls.json`
  - Random URL selection from cache
  - Dynamic User-Agent rotation with modern Chrome headers (Sec-CH-UA)
  - Proxy support (HTTP/HTTPS/SOCKS)
  - Cloudflare bypass via Puppeteer (optional `--cloudflare` flag)
- **Request Patterns**:
  - Base URL normalization (no trailing slashes)
  - AJAX calls for magnet links with specialized headers
  - Referer headers auto-generated
  - Cookie validation and lifecycle management

### Data Processing Flow
1. **Index Pages** → Fetch & parse for film links
2. **Detail Pages** → Extract metadata (gid, uc, img, title, categories, actresses)
3. **Magnet Links** → AJAX calls with specialized headers
4. **File Writes** → Save film data (high concurrency: 2x)
5. **Image Downloads** → Fetch posters with referer headers (low concurrency: 0.5x)

## Important Constraints

### Performance & Resource Management
- **Puppeteer**: Instance pooling required to prevent resource exhaustion
- **System Resources**: Monitored via `src/core/resourceMonitor.ts`
- **Timeout Safety**: 10-minute forced shutdown for stuck processes
- **Queue Monitoring**: Real-time heartbeat logging, task duration tracking (>60s warnings)
- **Request Rate Limiting**: Different delays per request type with randomization

### Anti-Detection Requirements
- **User-Agent Rotation**: Must include modern Chrome headers (Sec-CH-UA)
- **Puppeteer Stealth**: Anti-detection plugin required
- **Browser Fingerprinting**: Dynamic fingerprinting for 2024+ standards
- **Cloudflare Bypass**: Optional Puppeteer-based bypass for age verification

### Configuration Constraints
- **Config Precedence**: CLI args > Local cache > System proxy > Defaults
- **Proxy Auto-detection**: Cross-platform proxy detection
- **URL Normalization**: Automatic trailing slash handling
- **Filename Sanitization**: Auto-simplify filenames for long/invalid names

## External Dependencies

### HTTP & Network
- **Axios**: HTTP client with retry logic
- **Proxy Support**: HTTP/HTTPS/SOCKS proxies
- **Cloudflare Bypass**: Puppeteer with stealth plugin

### Content Processing
- **Cheerio**: HTML parsing (jQuery-like)
- **Puppeteer**: Browser automation for JavaScript-heavy sites
- **File Operations**: Node.js fs/promises

### Development Tools
- **TypeScript Compiler**: ES2020 → CommonJS
- **Winston**: Structured logging
- **Commander.js**: CLI framework
- **Semantic-release**: Automated version management
- **Husky**: Git hooks for commit enforcement

### System Integration
- **Signal Handling**: SIGINT, SIGTERM for graceful shutdown
- **Progress Tracking**: MultiBar for real-time progress
- **Path Handling**: Cross-platform path sanitization
