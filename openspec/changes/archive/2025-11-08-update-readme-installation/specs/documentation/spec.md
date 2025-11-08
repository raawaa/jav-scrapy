## ADDED Requirements

### Requirement: Project README Documentation
The project SHALL provide a comprehensive README.md file that serves as the primary user-facing documentation.

#### Scenario: User views README for installation
- **WHEN** a user visits the project repository
- **THEN** they can find clear installation instructions in the README.md

#### Scenario: User checks system requirements
- **WHEN** a user wants to install the application
- **THEN** they can see the required Node.js and npm versions
- **AND** they can see the supported operating systems
- **AND** they can see what dependencies are required

#### Scenario: User follows quick start guide
- **WHEN** a user completes the installation
- **THEN** they can follow the quick start guide to run their first crawl
- **AND** the basic usage examples work as documented

#### Scenario: Developer sets up development environment
- **WHEN** a developer wants to contribute to the project
- **THEN** they can find development setup instructions
- **AND** they can understand the build process
- **AND** they can run tests and build commands

### Requirement: Installation Instructions
The README SHALL provide both global and local installation methods.

#### Scenario: Global installation
- **WHEN** a user runs `npm install -g . --force`
- **THEN** they can use the `jav` command from anywhere
- **AND** the command is available in their system PATH

#### Scenario: Local installation with npx
- **WHEN** a user wants to use the tool without global installation
- **THEN** they can run it with `npx jav-scrapy`
- **AND** they don't need to modify their system PATH

#### Scenario: User needs to build from source
- **WHEN** a user clones the repository
- **THEN** they can run `npm install` to install dependencies
- **AND** they can run `npm run build` to compile TypeScript
- **AND** the compiled files will be in the `dist/` directory

### Requirement: Runtime Environment Documentation
The README SHALL clearly specify the runtime environment requirements.

#### Scenario: User checks Node.js compatibility
- **WHEN** a user checks their Node.js version
- **THEN** they know they need Node.js 16+ (LTS recommended)
- **AND** they know they need npm 8+ (comes with Node.js 16+)

#### Scenario: User checks system compatibility
- **WHEN** a user wants to know if their system is supported
- **THEN** they can see that Windows, macOS, and Linux are supported
- **AND** they understand that Puppeteer has additional system dependencies

#### Scenario: User understands TypeScript requirements
- **WHEN** a user wants to develop or modify the project
- **THEN** they know TypeScript 5.x is required for development
- **AND** they know the build process compiles to CommonJS (ES2020 target)

### Requirement: Configuration and Usage Documentation
The README SHALL provide clear guidance on configuration and usage.

#### Scenario: User learns basic usage
- **WHEN** a user reads the usage section
- **THEN** they understand the basic `jav crawl` command
- **AND** they know how to use `--help` to see all options
- **AND** they understand common flags like `--limit`, `--proxy`, `--cloudflare`

#### Scenario: User configures proxy
- **WHEN** a user wants to use a proxy
- **THEN** they can see how to configure it via CLI arguments
- **AND** they understand the proxy auto-detection feature

#### Scenario: User understands anti-blocking features
- **WHEN** a user encounters blocking issues
- **THEN** they can see documentation about anti-blocking features
- **AND** they know how to use the `--cloudflare` flag
- **AND** they understand the URL cache mechanism
