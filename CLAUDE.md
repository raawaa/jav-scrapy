# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development
- `npm run build` - Compile TypeScript to JavaScript in `dist/` directory
- `npm run dev` - Run the TypeScript file directly with ts-node (development)
- `npm run dev:watch` - Run with nodemon for auto-restart during development
- `npm test` - Run tests with mocha from `test/` directory
- `npm install -g . --force` - Install the package globally for CLI usage
- `npm run build-binary` - Build standalone executables for default platforms using local pkg
- `npm run build-binary:windows` - Build Windows x64 executable only
- `npm run build-binary:all` - Build executables for all supported platforms (Windows/macOS/Linux, x64/arm64)

### Version Management
- `npm run version` - Update version across all files
- `npm run version:info` - Display current version information
- `npm run version:update` - Update version in package.json and source files
- `npm run version:changelog` - Update changelog with new version
- `npm run version:tag` - Create git tag for current version
- `npm run version:validate` - Validate version format and consistency
- `npm run version:prepare` - Prepare release with version update and changelog

### Release and Changelog
- `npm run release` - Run semantic-release for automated versioning and publishing
- `npm run changelog` - Update changelog with conventional commits
- `npm run changelog:first` - Generate initial changelog from all commits

### Testing and Quality
- Tests are located in `test/` directory with `.test.js` extension
- Uses Mocha framework with Chai assertions
- Nock for HTTP mocking in tests
- Current test files: `test.js`, `fileHandler.test.js`, `parser.test.js`, `requestHandler.test.js`

### Running the Application
- `jav` - Run crawl command with default settings (equivalent to `jav crawl`)
- `jav crawl` - Explicit crawl command with options
- `jav update` - Update anti-blocking URLs from remote sources
- Use `--help` flag for comprehensive option listing

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

**Additional Core Components:**
- `src/core/puppeteerPool.ts` - Puppeteer instance pool for resource management
- `src/core/resourceMonitor.ts` - System resource monitoring and management

**Utilities:**
- `src/utils/cloudflareBypass.ts` - Puppeteer-based Cloudflare bypass with age verification
- `src/utils/systemProxy.ts` - Cross-platform system proxy detection
- `src/utils/errorHandler.ts` - Centralized error handling with categorization
- `src/utils/delayManager.ts` - Centralized delay management with exponential backoff
- `src/core/fileHandler.ts` - File operations with path sanitization
- `src/core/logger.ts` - Winston-based logging with multiple levels
- `src/core/constants.ts` - Application constants and default values

### Type System
- `src/types/interfaces.ts` - TypeScript interfaces for Config, Film data structures, and other core types

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

### Build System and Deployment

- **TypeScript compilation**: Outputs to `dist/` directory with ES2017 target
- **Package.json**: Main entry point set to `jav.js`, bin field points to `./dist/jav.js`
- **Binary generation**: Uses pkg to create standalone executables for multiple platforms (Windows/macOS/Linux, x64/arm64)
- **Version management**: Automated version scripts in `scripts/version.js`
- **Release automation**: Semantic-release with conventional commits
- **Commit conventions**: Conventional commit format enforced via commitlint
- **Binary outputs**: Executables created in `binaries/` directory for all target platforms

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
- Resource monitoring via ResourceMonitor component
- Centralized delay management with DelayManager for different request types

## Development Guidelines

### Key Architectural Patterns

**Multi-Queue Processing System:**
- Four specialized queues handle different processing stages with configurable concurrency
- Event-driven architecture allows real-time monitoring and graceful shutdown
- Each queue type has specific retry logic and error handling strategies

**Configuration Management:**
- Multi-source configuration system with clear precedence (CLI args > local files > system defaults)
- URL normalization and validation prevents common configuration errors
- Proxy auto-detection across platforms (Windows/macOS)

**Error Handling Philosophy:**
- Individual task failures don't halt overall processing
- Exponential backoff with configurable multipliers for different error types
- Comprehensive error categorization via ErrorHandler
- Graceful degradation when optional features fail

**Resource Management:**
- Puppeteer instance pooling for efficient browser automation
- System resource monitoring prevents resource exhaustion
- Centralized delay management controls request pacing
- Signal handling ensures clean shutdown on interrupts

### Important Implementation Details

**Request Rate Limiting:**
- Different delay strategies for different request types (index pages, detail pages, images)
- Configurable base delay with randomization to avoid predictable patterns
- Centralized DelayManager supports graceful interruption

**Browser Fingerprinting:**
- Dynamic User-Agent rotation includes modern Chrome headers (Sec-CH-UA)
- Puppeteer stealth plugin provides advanced anti-detection capabilities
- Browser fingerprint management updated for 2024+ standards

**Data Structure Evolution:**
- Film data uses structured magnet link arrays instead of single largest link
- Configurable magnet link selection (largest only vs all links)
- Enhanced metadata extraction with fallback parsing strategies

### Testing Strategy

**Current Test Coverage:**
- `test/` directory contains basic test structure
- Tests for core components: fileHandler, parser, requestHandler
- Uses Mocha + Chai + Nock for comprehensive HTTP mocking

**Testing Best Practices:**
- Mock external HTTP responses to ensure consistent test runs
- Test error scenarios and edge cases, not just happy paths
- Validate configuration merging and precedence logic
- Test queue behavior under various failure conditions

### Dependency Management Philosophy

**No Global Dependencies Policy:**
- All development tools are managed as local dependencies via npm
- Use `npx` to run locally installed packages instead of global commands
- This ensures consistent development environments and prevents system pollution
- Examples: `npx pkg .` instead of `pkg .`, `npx mocha` instead of global mocha

**Benefits:**
- Eliminates version conflicts between different projects
- Simplifies onboarding for new contributors
- Ensures reproducible builds across different machines
- Reduces system environment pollution