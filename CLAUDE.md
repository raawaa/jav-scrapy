<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

### Essential Development Commands
```bash
# Development
npm run build              # Compile TypeScript to dist/
npm run dev                # Run TypeScript directly with ts-node
npm run dev:watch          # Auto-restart on file changes

# Testing
npm test                   # Run tests with mocha (note: no tests exist currently)

# Version Management
npm run release            # Run semantic-release

# Installation
npm install -g . --force   # Install globally for CLI usage
```

### Running the Application
```bash
jav                         # Run crawl with default settings
jav crawl                   # Explicit crawl command
jav update                  # Update anti-blocking URLs
jav --help                  # Show all options
```

## Project Overview

**jav-scrapy** is a TypeScript-based web scraper for JAV content that uses a multi-queue architecture for concurrent processing. Built with Node.js, it crawls magnet links, film metadata, and poster images with anti-blocking capabilities.

## High-Level Architecture

The application uses a **four-stage pipeline** with separate async queues:

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

### Core Components

**Entry Point** (`src/jav.ts`):
- CLI using Commander.js with extensive options
- Two commands: `crawl` (default), `update`
- Signal handling (SIGINT, SIGTERM) for graceful shutdown
- Progress bar with MultiBar support
- Main execution orchestrator

**Queue Manager** (`src/core/queueManager.ts`):
- Four specialized async queues with event-driven architecture
- Real-time monitoring with heartbeat logging
- Task duration tracking (>60s warnings)
- Graceful shutdown with queue cleanup

**Configuration** (`src/core/config.ts`):
- Multi-source config with precedence:
  1. Default constants (`src/core/constants.ts`)
  2. System proxy (auto-detected)
  3. Local anti-block URLs (`~/.jav-scrapy-antiblock-urls.json`)
  4. CLI arguments (highest priority)
- URL normalization, cookie management

**HTTP Handler** (`src/core/requestHandler.ts`):
- Axios client with 1.5x exponential backoff retry
- Dynamic User-Agent rotation
- Proxy support (HTTP/HTTPS/SOCKS)
- Cloudflare bypass via Puppeteer (`--cloudflare` flag)
- AJAX requests for magnet links
- Cookie validation

**HTML Parser** (`src/core/parser.ts`):
- Cheerio-based with malformed HTML handling
- Multiple parsing strategies (fallback positions)
- Extracts: film links, metadata (gid, uc, img, title), categories, actresses
- Anti-blocking URLs from alert containers

### Supporting Infrastructure

- **Puppeteer Pool** (`src/core/puppeteerPool.ts`): Resource management for browser instances
- **Resource Monitor** (`src/core/resourceMonitor.ts`): System resource tracking
- **File Handler** (`src/core/fileHandler.ts`): Path sanitization, concurrent writes
- **Logger** (`src/core/logger.ts`): Winston-based multi-level logging
- **Constants** (`src/core/constants.ts`): Default config, user agents, delay utilities

### Utilities

- **Cloudflare Bypass** (`src/utils/cloudflareBypass.ts`): Puppeteer with age verification
- **System Proxy** (`src/utils/systemProxy.ts`): Cross-platform proxy detection
- **Error Handler** (`src/utils/errorHandler.ts`): Centralized error categorization
- **Delay Manager** (`src/utils/delayManager.ts`): Centralized delay with exponential backoff

### Data Flow

1. **Index Pages** → Fetch & parse for film links
2. **Detail Pages** → Extract metadata (gid, uc, img, title, categories, actresses)
3. **Magnet Links** → AJAX calls with specialized headers
4. **File Writes** → Save film data (high concurrency: 2x)
5. **Image Downloads** → Fetch posters with referer headers (low concurrency: 0.5x)

All operations use configurable concurrency and exponential backoff to avoid server overload.

## Configuration System

**Key Parameters:**
- `parallel`: Base concurrency (default: 2)
- `timeout`: Request timeout ms (default: 30000)
- `delay`: Base delay seconds (default: 2)
- `limit`: Max films (0 = unlimited)
- `proxy`: Proxy URL (auto-detected)
- `useCloudflareBypass`: Enable Puppeteer bypass
- `nomag`: Skip films without magnets
- `allmag`: Fetch all magnets vs largest only
- `nopic`: Skip image downloads

**URL Management:**
- Base URLs normalized (no trailing slashes)
- Anti-block URLs randomly selected from local cache
- Referer headers auto-generated

## Build System & Deployment

- **TypeScript**: ES2020 target → `dist/` directory
- **Entry Point**: `dist/jav.js` (set in package.json)
- **Release**: Semantic-release with conventional commits

**Important Build Files:**
- `tsconfig.json`: ES2020 target, CommonJS modules
- `package.json`: Main entry `jav.js`, bin `jav`
- `.releaserc.json`: Semantic-release configuration

## Commit Conventions (Enforced by Husky)

**Commit Format:** `<type>(<scope>): <subject>`

**Types:**
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

**Scopes:**
- `core`: Core functionality
- `utils`: Utilities
- `parser`: Parser
- `handler`: Handler
- `config`: Configuration
- `cli`: Command-line
- `deps`: Dependencies
- `release`: Release process

**Rules:**
- Subject: no trailing period, not in upper case
- Header max length: 100 characters
- Enforced via `.husky/commit-msg` hook

## Error Handling Strategy

- **Network errors**: 1.5x exponential backoff, increased delays
- **Queue failures**: Individual task failures don't stop processing
- **File system**: Auto-simplify filenames for long/invalid names
- **Parsing**: Multiple fallback strategies with debug logging
- **Validation**: Input sanitization prevents injection
- **Timeouts**: 10-minute forced shutdown

## Development Best Practices

### No Global Dependencies Policy
- All tools managed as local npm dependencies
- Use `npx` to run packages: `npx pkg` not `pkg`
- Ensures reproducible builds across machines
- Prevents system environment pollution

### Testing Status
- **No test files exist** in the repository
- Test infrastructure configured (Mocha, Chai, Nock)
- `test/*.test.js` pattern expected
- Tests should be added for new features

### Browser Fingerprinting
- User-Agent rotation includes modern Chrome headers (Sec-CH-UA)
- Puppeteer stealth plugin for anti-detection
- Updated for 2024+ standards

### Resource Management
- Puppeteer instance pooling
- System resource monitoring
- Centralized delay management
- Signal handling for clean shutdown

## Project Structure

```
src/
├── jav.ts                     # CLI entry point
├── core/                      # Core modules
│   ├── config.ts             # Configuration management
│   ├── constants.ts          # Default values, user agents
│   ├── fileHandler.ts        # File operations
│   ├── logger.ts             # Winston logging
│   ├── parser.ts             # HTML parsing
│   ├── queueManager.ts       # Four-queue system
│   ├── requestHandler.ts     # HTTP client with retry
│   ├── puppeteerPool.ts      # Browser instance pool
│   └── resourceMonitor.ts    # Resource tracking
├── types/
│   └── interfaces.ts         # TypeScript interfaces
└── utils/
    ├── cloudflareBypass.ts   # Cloudflare bypass
    ├── delayManager.ts       # Delay control
    ├── errorHandler.ts       # Error categorization
    └── systemProxy.ts        # Proxy detection
```

## Key Implementation Details

### Concurrency Levels
- Index pages: **1x** (base)
- Detail pages: **0.75x**
- File writes: **2x** (highest priority)
- Image downloads: **0.5x** (lowest priority)

### Request Rate Limiting
- Different delays per request type
- Configurable base delay + randomization
- Centralized DelayManager for graceful interruption

### Anti-Blocking Strategy
- Local URL cache: `~/.jav-scrapy-antiblock-urls.json`
- Random URL selection from cache
- Cloudflare bypass via Puppeteer (optional)
- Dynamic browser fingerprinting

## Debugging & Monitoring

- Queue status reporting every 30 seconds
- Long-running task alerts (>60s)
- Debug-level request/response logging
- Performance timing per operation
- Cookie lifecycle management
- Proxy configuration validation
- Resource monitoring

## Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `npm run build` to compile to `dist/`
3. Test with `npm run dev` (direct TypeScript execution)
4. Follow conventional commits for version bumps
5. `npm run release` for automated publishing
