# Change: Optimize NPM Package for Global Installation

## Why
Currently, the npm package includes both compiled files (dist/) and development source files (src/), as well as various development configuration files. This creates an unnecessarily large package installation (5.8MB+) thatbloats the global installation directory with files that end users don't need. The goal is to reduce the package size by 60-70% by only including runtime-necessary files.

## What Changes
- **MODIFIED**: package.json `files` array - remove "src" directory, only include "dist"
- **MODIFIED**: package.json `main` entry point - update to "dist/jav.js" for consistency
- **ADDED**: .npmignore file to explicitly exclude development files
- **MODIFIED**: .gitignore alignment to ensure dev files stay in development

**BREAKING**: No - this is a packaging optimization that doesn't change runtime behavior

## Impact
- Affected specs: `packaging` capability
- Affected code: package.json configuration, new .npmignore file
- Users will download ~60-70% fewer files when installing globally
- Installation directory will be cleaner with only compiled JavaScript
- No functional changes to the application
- Maintains compatibility with existing usage
