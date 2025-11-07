# jav-scrapy Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-07

## Active Technologies

Node.js 20+, TypeScript, Puppeteer, axios, commander, winston, cli-progress

## Project Structure

```text
src/
├── jav.ts              # Main entry point
├── core/               # Core modules
│   ├── config.ts       # Configuration management
│   ├── constants.ts    # Constant definitions
│   ├── fileHandler.ts  # File handling operations
│   ├── logger.ts       # Logging system
│   ├── parser.ts       # HTML parsing
│   ├── puppeteerPool.ts # Puppeteer instance pool
│   ├── queueManager.ts # Task queue management
│   ├── requestHandler.ts # HTTP request handling
│   └── resourceMonitor.ts # Resource monitoring
├── types/              # Type definitions
│   └── interfaces.ts   # Interface definitions
└── utils/              # Utility functions
    ├── cloudflareBypass.ts # Cloudflare bypass handling
    ├── delayManager.ts # Request delay management
    ├── errorHandler.ts # Error handling
    └── systemProxy.ts  # System proxy detection

tests/
├── fileHandler.test.js
├── parser.test.js
└── requestHandler.test.js
```

## Commands

npm run dev          # Development mode
npm run build        # Compile TypeScript
npm test             # Run tests
npm run dev:watch    # Watch and restart on changes
jav [options]        # Run the scraper
jav update           # Update anti-blocking URLs

## Code Style

- Use TypeScript with CommonJS modules
- Follow ethical scraping practices
- Implement proper error handling and retry mechanisms
- Respect rate limits and add appropriate delays
- Handle user privacy and proxy settings securely

## Recent Changes

- Added Puppeteer instance pool for efficient browser management
- Implemented resource monitoring system
- Enhanced Cloudflare bypass capabilities
- Improved delay management system

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
