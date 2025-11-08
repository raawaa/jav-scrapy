## MODIFIED Requirements
### Requirement: NPM Package Distribution
The package MUST be optimized for global installation to reduce size and improve installation performance.

#### Scenario: Global installation from GitHub
- **WHEN** user runs `npm install -g raawaa/jav-scrapy`
- **THEN** only runtime-necessary files are downloaded and installed
- **AND** package size is reduced by at least 60% compared to current version
- **AND** "jav" command is available globally after installation

#### Scenario: Package contents verification
- **WHEN** user inspects the installed package directory
- **THEN** they will NOT find development files (src/, test/, .husky, etc.)
- **AND** they WILL find only dist/ directory with compiled JavaScript
- **AND** they WILL find README.md and package.json for reference

#### Scenario: Functionality preserved
- **WHEN** user runs `jav --help` after global installation
- **THEN** all existing functionality works exactly as before
- **AND** no TypeScript source files are visible in the installation

## ADDED Requirements
### Requirement: Package File Exclusion
The package MUST exclude development-specific files and directories from the published npm package.

#### Scenario: Development files excluded
- **GIVEN** the package is published to npm or installed from GitHub
- **WHEN** listing package contents
- **THEN** the following MUST NOT be present:
  - src/ directory (TypeScript source)
  - test/ directory (test files)
  - .husky/ directory (git hooks)
  - .vscode/ directory (editor config)
  - .claude/, .iflow/, .specify/ directories (dev tools)
  - node_modules/ directory (dependencies - already excluded by npm)
  - Various dev config files (.eslintrc.json, .releaserc.json, etc.)

#### Scenario: Runtime files included
- **GIVEN** the package is published
- **WHEN** listing package contents
- **THEN** the following MUST be present:
  - dist/ directory with all compiled JavaScript
  - dist/jav.js as the main entry point
  - README.md for user documentation
  - package.json for package metadata
  - Any runtime configuration files (if added in future)

### Requirement: .npmignore Configuration
The package MUST use .npmignore to explicitly control which files are excluded from installation.

#### Scenario: .npmignore prevents dev file inclusion
- **WHEN** .npmignore file is present in the project root
- **THEN** patterns in .npmignore MUST exclude:
  - Development directories (src/**, test/**, .husky/**, .vscode/**, etc.)
  - Development configuration files (*.config.js, .eslintrc.json, etc.)
  - Dev tool directories (.claude/**, .iflow/**, .specify/**)
  - OpenSpec change management files (openspec/**)
  - Git and CI/CD files (.github/**, .travis.yml, etc.)

#### Scenario: Explicit inclusion needed
- **WHEN** a file should be included despite matching .npmignore patterns
- **THEN** it MUST be added to package.json files array
- **AND** the files array MUST take precedence over .npmignore
