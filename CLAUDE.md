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
- CLI application using Commander.js
- Two main commands: `crawl` (default) and `update`
- Signal handling for graceful shutdown (SIGINT, SIGTERM)
- Progress bar display using cli-progress

**Queue Management (`src/core/queueManager.ts`)**
- Four separate async queues handling different processing stages:
  - Index page queue: Fetches and parses listing pages
  - Detail page queue: Processes individual film pages
  - File write queue: Saves film data to files
  - Image download queue: Downloads film posters
- Event-driven architecture with custom QueueEventType events
- Configurable concurrency per queue

**Configuration (`src/core/config.ts`)**
- Merges settings from multiple sources: defaults, system proxy, anti-block URLs, command line args
- Loads anti-blocking URLs from `~/.jav-scrapy-antiblock-urls.json`
- Proxy configuration with system proxy detection and override capability

**HTTP Handling (`src/core/requestHandler.ts`)**
- Axios-based HTTP client with retry logic
- Proxy support (HTTP/HTTPS/SOCKS)
- Image downloading with proper file naming
- Magnet link fetching

**HTML Parsing (`src/core/parser.ts`)**
- Cheerio-based parser for extracting film data
- Parses film links, metadata, categories, and actresses
- Extracts anti-blocking URLs from alert boxes
- Robust error handling for malformed HTML

### Data Flow

1. **Index pages** are fetched and parsed for film links
2. **Detail pages** are processed to extract metadata and magnet links
3. **File operations** save film data concurrently
4. **Image downloads** fetch posters in parallel

All operations use configurable concurrency limits and delays to avoid overwhelming target servers.

### Key Files Structure

- `src/types/interfaces.ts` - TypeScript interfaces for Config, FilmData, Metadata
- `src/core/constants.ts` - Default configuration values and constants
- `src/utils/systemProxy.ts` - System proxy detection for different platforms
- `src/utils/errorHandler.ts` - Centralized error handling utilities
- `src/utils/cookies.ts` - Cookie management utilities

### Configuration Precedence

1. Default constants
2. System proxy settings (auto-detected)
3. Local anti-block URLs file
4. Command line arguments (highest priority)

### Error Handling Strategy

- Graceful degradation for individual task failures
- Queue-level error handlers that don't stop processing
- Detailed debug logging for troubleshooting
- Network error detection with longer retry delays