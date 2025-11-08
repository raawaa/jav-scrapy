# Change: Automatic GitHub Release Creation

## Why
Currently, releasing new versions requires manual intervention to create GitHub releases, update changelogs, and manage version tags. This is error-prone and doesn't follow modern CI/CD best practices. The goal is to automate the entire release process so that every push to the master branch that contains feature commits automatically generates a properly versioned GitHub release with changelog.

## What Changes
- **ADDED**: GitHub Actions workflow (`.github/workflows/release.yml`) to trigger on push to master
- **MODIFIED**: `.releaserc.json` to include `@semantic-release/github` plugin for automatic GitHub releases
- **MODIFIED**: `package.json` to add `@semantic-release/github` dependency
- **ADDED**: Documentation for the automatic release process

**BREAKING**: No - this is a new automation feature that doesn't affect existing functionality

## Impact
- Affected specs: `ci-cd` capability
- Affected code: GitHub Actions workflow, semantic-release configuration
- Automatic version bumping based on conventional commits (major/minor/patch)
- Automatic GitHub release creation with release notes
- Automatic CHANGELOG.md updates
- Eliminates manual release process
- Improves release consistency and documentation
