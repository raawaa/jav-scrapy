<!-- Sync Impact Report: 
Version change: 1.0.0 → 1.1.0
Modified principles: [All principles are new based on project analysis]
Added sections: [All sections added based on project analysis]
Removed sections: [No sections removed]
Templates requiring updates: [Updated for command-line program context - ✅ completed]
Follow-up TODOs: [RATIFICATION_DATE updated - ✅ completed]
-->
# jav-scrapy Constitution

## Core Principles

### Ethical Compliance First
The crawler must respect robots.txt, use appropriate delays to avoid server overload, and comply with applicable laws and terms of service. All scraping activities must follow ethical guidelines and respect website policies.

### Robust Anti-Detection
Implement sophisticated techniques to avoid detection and blocking, including user-agent rotation, request header variation, Cloudflare bypass, and proxy support. The system must maintain consistent access while avoiding aggressive behavior that could trigger anti-bot measures.

### Reliable Data Handling
Ensure robust error handling, retry mechanisms, and data integrity during scraping and storage operations. The system must gracefully handle network failures, timeouts, and malformed responses while maintaining data accuracy.

### Scalable Architecture
Design for concurrent processing, resource management, and efficient queue handling to maximize performance. The system must support configurable parallelization and efficient task scheduling across multiple processing queues.

### Privacy Protection
Securely handle user credentials and proxy settings, with proper encryption and secure storage practices. All user-provided information including cookies, proxies, and authentication tokens must be handled with appropriate security measures.

## Additional Constraints
Technology stack requirements: Node.js 20+, TypeScript, Puppeteer for browser automation, with support for cross-platform binary builds. Compliance standards require adherence to local laws regarding data scraping and storage. Deployment policies must support both global installation and packaged binary distribution.

## Development Workflow
Code review requirements: All changes must pass automated tests and manual review focusing on anti-detection effectiveness and ethical compliance. Testing gates require validation of Cloudflare bypass mechanisms, proxy support, and rate limiting behavior. Deployment approval process includes verification of anti-bot countermeasure effectiveness and legal compliance.

## Governance
The constitution supersedes all other practices; Amendments require documentation, approval, migration plan. All PRs/reviews must verify compliance; Complexity must be justified; Use `.specify/templates/plan-template.md` for runtime development guidance.

**Version**: 1.1.0 | **Ratified**: 2024-01-15 | **Last Amended**: 2025-11-07