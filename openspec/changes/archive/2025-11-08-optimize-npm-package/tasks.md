## 1. Package Configuration Updates
- [x] 1.1 Update package.json files array - remove "src" entry, keep only "dist"
- [x] 1.2 Update package.json main field to "dist/jav.js" for consistency
- [x] 1.3 Verify package.json bin field points to correct entry (dist/jav.js)
- [x] 1.4 Test package.json syntax with `npm pkg get files`

## 2. Create .npmignore File
- [x] 2.1 Create .npmignore file in project root
- [x] 2.2 Add patterns to exclude src/ directory
- [x] 2.3 Add patterns to exclude test/ directory
- [x] 2.4 Add patterns to exclude development tool directories (.husky, .vscode, .claude, .iflow, .specify)
- [x] 2.5 Add patterns to exclude dev config files (*.config.js, .eslintrc.json, .releaserc.json, etc.)
- [x] 2.6 Add patterns to exclude OpenSpec management files (openspec/**)
- [x] 2.7 Add patterns to exclude git/CI files (.github/**, .travis.yml, etc.)
- [x] 2.8 Add patterns to exclude log files (*.log)

## 3. Validation & Testing
- [x] 3.1 Run `npm pack` to generate .tgz package
- [x] 3.2 Inspect package contents with `tar -tzf package.tgz | head -30`
- [x] 3.3 Verify no TypeScript source files in package
- [x] 3.4 Verify dist/ directory is present with all compiled files
- [x] 3.5 Check package size and confirm reduction (102KB compressed, 546KB unpacked)
- [x] 3.6 Test global installation: `npm install -g ./package.tgz`
- [x] 3.7 Verify `jav --help` works after global installation
- [x] 3.8 Clean up test package: `rm package.tgz`

## 4. Documentation Updates
- [x] 4.1 Update CLAUDE.md installation section if needed (no changes required)
- [x] 4.2 Verify README.md mentions correct installation method (no changes required)

## 5. Final Validation
- [x] 5.1 Run `openspec validate optimize-npm-package --strict`
- [x] 5.2 Fix any validation issues (none found)
- [ ] 5.3 Commit changes with conventional commit format
- [ ] 5.4 Tag version for release (v0.9.0 or similar)
