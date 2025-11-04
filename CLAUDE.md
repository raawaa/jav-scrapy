# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run the TypeScript file directly with ts-node
- `npm run dev:watch` - Run with nodemon for auto-restart during development
- `npm test` - Run tests with mocha
- `npm install -g . --force` - Install the package globally for CLI usage

### Running the Application
- `jav` - Run crawl command with default settings
- `jav crawl` - Explicit crawl command
- `jav update` - Update anti-blocking URLs

## Architecture Overview

This is a TypeScript-based web scraper for JAV content that uses a multi-queue architecture for concurrent processing.

### Core Components

**Main Entry Point (`src/jav.ts`)**
- CLI application using Commander.js with extensive command-line options
- Two main commands: `crawl` (default) and `update`
- Signal handling for graceful shutdown (SIGINT, SIGTERM)
- Progress bar display using cli-progress with MultiBar support
- Complex execution flow with queue monitoring and timeout handling

**Queue Management (`src/core/queueManager.ts`)**
- Four separate async queues handling different processing stages:
  - Index page queue: Fetches and parses listing pages (configurable concurrency)
  - Detail page queue: Processes individual film pages (0.75x base concurrency)
  - File write queue: Saves film data to files (2x base concurrency)
  - Image download queue: Downloads film posters (0.5x base concurrency)
- Event-driven architecture with custom QueueEventType events
- Real-time queue monitoring with heart beat logging
- Task duration tracking and long-running task warnings
- Graceful shutdown with queue cleanup

**Configuration (`src/core/config.ts`)**
- Multi-source configuration merging with precedence system:
  1. Default constants from `src/core/constants.ts`
  2. System proxy settings (auto-detected via `src/utils/systemProxy.ts`)
  3. Local anti-block URLs from `~/.jav-scrapy-antiblock-urls.json`
  4. Command line arguments (highest priority)
- URL field normalization (ensures no trailing slashes)
- Cookie management with manual override support

**HTTP Handling (`src/core/requestHandler.ts`)**
- Axios-based HTTP client with sophisticated retry logic (1.5x exponential backoff)
- Comprehensive browser fingerprinting with dynamic User-Agent rotation
- Proxy support for HTTP/HTTPS/SOCKS via tunnel module
- Cloudflare bypass integration using Puppeteer (optional via `--cloudflare` flag)
- AJAX request handling with specialized headers for magnet link fetching
- Image downloading with automatic filename sanitization and fallback handling
- Cookie validation and security measures to prevent injection attacks

**HTML Parsing (`src/core/parser.ts`)**
- Cheerio-based parser with robust error handling for malformed HTML
- Multiple parsing strategies for metadata extraction (fallback script positions)
- Film link extraction from movie-box elements
- Category parsing from span.genre label a structures
- Actress parsing from star-name a elements
- Anti-blocking URL extraction from alert alert-info containers
- Detailed debug logging for parsing failures

**Utilities:**
- `src/utils/cloudflareBypass.ts` - Puppeteer-based Cloudflare bypass with age verification
- `src/utils/systemProxy.ts` - Cross-platform system proxy detection
- `src/utils/errorHandler.ts` - Centralized error handling with categorization
- `src/core/fileHandler.ts` - File operations with path sanitization
- `src/core/logger.ts` - Winston-based logging with multiple levels

### Data Flow

1. **Index pages** are fetched and parsed for film links with random delays
2. **Detail pages** are processed to extract metadata (gid, uc, img, title, categories, actresses)
3. **Magnet links** are fetched via AJAX calls with specialized headers and retry logic
4. **File operations** save film data concurrently with high concurrency
5. **Image downloads** fetch posters with proper referer headers and filename sanitization

All operations use configurable concurrency limits and exponential backoff delays to avoid overwhelming target servers.

### Configuration Details

**Key Configuration Parameters:**
- `parallel`: Base concurrency for index page processing (default: 2)
- `timeout`: Request timeout in milliseconds (default: 30000)
- `delay`: Base delay between requests in seconds (default: 2)
- `limit`: Maximum number of films to process (0 = unlimited)
- `proxy`: Proxy server URL (auto-detected from system)
- `useCloudflareBypass`: Enable Puppeteer-based Cloudflare bypass
- `nomag`: Skip films without magnet links
- `allmag`: Fetch all magnet links instead of just the largest
- `nopic`: Skip image downloads

**URL Management:**
- Base URLs are normalized to remove trailing slashes
- Anti-block URLs are randomly selected from local cache
- Referer headers are automatically generated from base URLs

### Error Handling Strategy

- **Network errors**: Exponential backoff with increased delays (1.5x multiplier)
- **Queue failures**: Individual task failures don't stop queue processing
- **File system errors**: Automatic filename simplification for long/invalid names
- **Parsing errors**: Multiple fallback strategies with detailed debugging
- **Validation**: Input sanitization to prevent injection attacks
- **Timeout handling**: Queue-level timeouts with forced shutdown after 10 minutes

### Debugging and Monitoring

- Real-time queue status reporting every 30 seconds
- Long-running task alerts (>60 seconds)
- Request/response logging at debug level
- Performance timing for each operation
- Cookie lifecycle management with refresh intervals
- Proxy configuration validation