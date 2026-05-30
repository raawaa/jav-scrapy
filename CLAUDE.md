# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Lessons Learned (from session 2026-05-30)

### 1. TLS fingerprint vs HTTP headers
When Cloudflare returns 403 on AJAX endpoints but 200 on main pages, the issue is likely **TLS fingerprint** (JA3), not HTTP headers. System `curl` (LibreSSL) and Node.js (OpenSSL) have different TLS stacks — test with `curl` first to isolate the cause. Don't waste time tweaking headers if curl works.

### 2. No native binary downloads behind GFW
Never try to install packages that download native binaries from GitHub releases in this environment. GitHub release assets are blocked. Prefer:
- Pure JS solutions (no native addons)
- Packages with pre-built binaries on npm registry (via optional dependencies)
- Subprocess calls to system tools (curl)

### 3. Check Agent compatibility before integrating
`axios-cookiejar-support` is incompatible with custom HTTPS agents (`tunnel.httpsOverHttp`). Test small integrations incrementally — don't batch changes and discover breakage only at runtime.

### 4. Git revert loses uncommitted context
`git checkout -- file.ts` reverts to the committed version. If the working tree has other uncommitted changes (renamed methods, new types), the reverted file will reference symbols that no longer exist. Prefer selective undo over full revert.

### 5. Clean up failed experiments
Don't leave installed-but-unused packages in `package.json`. Each npm install adds to audit surface and lockfile churn. Uninstall promptly when switching approaches.

## Quick Start

### Essential Development Commands
```bash
# Development
npm run build              # Compile TypeScript to dist/
npm run dev                # Run TypeScript directly with ts-node
npm run dev:watch          # Auto-restart on file changes

# Testing
npm test                   # Run tests with mocha (48 tests, 4 test suites)

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
jav logs                    # View and export log files
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
- Three commands: `crawl` (default), `update`, `logs`
- Signal handling (SIGINT, SIGTERM) with queue state dump on shutdown
- Uncaught exception/rejection handlers for crash logging
- Progress bar with MultiBar support
- Run ID generation and startup environment snapshot in logs

**Queue Manager** (`src/core/queueManager.ts`):
- Four specialized async queues with event-driven architecture
- Real-time monitoring with heartbeat logging
- Task duration tracking (>60s warnings)
- Graceful shutdown with queue cleanup

**Configuration** (`src/core/config.ts`):
- Multi-source config with precedence:
  1. Default constants (`src/core/constants.ts`)
  2. System proxy (auto-detected)
  3. Local anti-block URLs (stored in app data directory, see `src/core/paths.ts`)
  4. CLI arguments (highest priority)
- URL normalization, cookie management

**HTTP Handler** (`src/core/requestHandler.ts`):
- Axios client with 1.5x exponential backoff retry
- Dynamic User-Agent rotation
- Proxy support (HTTP/HTTPS/SOCKS)
- AJAX requests for magnet links
- Cookie validation

**HTML Parser** (`src/core/parser.ts`):
- Cheerio-based with malformed HTML handling
- Multiple parsing strategies (fallback positions)
- Extracts: film links, metadata (gid, uc, img, title), categories, actresses
- Anti-blocking URLs from alert containers

### Supporting Infrastructure

- **File Handler** (`src/core/fileHandler.ts`): Path sanitization, concurrent writes
- **Logger** (`src/core/logger.ts`): Three-channel output (console/files/errors) with Winston
- **Output** (`src/output.ts`): User-facing formatted output (banner, progress, summary)
- **Paths** (`src/core/paths.ts`): Cross-platform application data directory management
- **Constants** (`src/core/constants.ts`): Default config, user agents, delay utilities

### Utilities

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
- **Crash protection**: `uncaughtException`/`unhandledRejection` handlers log error and queue state before exit

## Development Best Practices

### No Global Dependencies Policy
- All tools managed as local npm dependencies
- Use `npx` to run packages: `npx pkg` not `pkg`
- Ensures reproducible builds across machines
- Prevents system environment pollution

### Testing Status
- **Test cases across 2 test suites** (Parser, ErrorHandler)
- Test infrastructure: Mocha, Chai, Nock
- All tests pass: `npm test`

### Browser Fingerprinting
- User-Agent rotation includes modern Chrome headers (Sec-CH-UA)
- Updated for 2024+ standards

### Resource Management
- Centralized delay management
- Signal handling for clean shutdown

## Project Structure

```
src/
├── jav.ts                     # CLI entry point
├── output.ts                  # User-facing output formatting
├── core/                      # Core modules
│   ├── config.ts             # Configuration management
│   ├── constants.ts          # Default values, user agents
│   ├── fileHandler.ts        # File operations
│   ├── logger.ts             # Three-channel logging (console/files/errors)
│   ├── parser.ts             # HTML parsing
│   ├── paths.ts              # Cross-platform app data paths
│   ├── queueManager.ts       # Four-queue system
│   ├── requestHandler.ts     # HTTP client with retry
├── types/
│   └── interfaces.ts         # TypeScript interfaces
└── utils/
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
- Local URL cache: stored in app data directory (see `src/core/paths.ts`)
- Random URL selection from cache
- Dynamic browser fingerprinting

## Debugging & Monitoring

- Queue status reporting at debug level (file only, not visible in console)
- Long-running task alerts (>60s)
- Verbose console output with `--verbose` flag
- Log file location: app data directory (see `src/core/paths.ts`)
- Log management via `jav logs` (tail, export)
- Run ID tracking for multi-session log separation
- Uncaught exception/rejection crash logging with queue state dump
- Cookie lifecycle management
- Proxy configuration validation

## Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `npm run build` to compile to `dist/`
3. Test with `npm run dev` (direct TypeScript execution)
4. Follow conventional commits for version bumps
5. `npm run release` for automated publishing
