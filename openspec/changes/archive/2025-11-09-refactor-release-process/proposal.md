# Change: Redefine Release and Version Management Rules

## Why
The current release process uses semantic-release which automatically versions and publishes based on conventional commits. The new requirement is to have a manual local release process where developers run `npm version` locally to generate version and tag, update all version references in code, and have GitHub workflow trigger on tag to publish release with changelog. This provides more control over the release process and allows for manual verification before publishing.

## What Changes
- **REMOVED**: Automatic semantic-release process triggered by pushes to master/main
- **ADDED**: Manual local release process using npm version commands
- **MODIFIED**: GitHub Actions workflow to trigger on git tags instead of branch pushes
- **ADDED**: Process to update all version references in code during local release
- **MODIFIED**: Changelog generation to work with the new manual process

## Impact
- Affected specs: `ci-cd`, `packaging`, `release`
- Affected code: `.github/workflows/release.yml`, `package.json`, `.releaserc.json`, `src/jav.ts`
- Developers will need to run local release commands instead of just pushing commits