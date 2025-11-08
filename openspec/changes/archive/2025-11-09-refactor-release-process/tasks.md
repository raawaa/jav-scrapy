## 1. Implementation
- [x] 1.1 Remove semantic-release configuration from `.releaserc.json`
- [x] 1.2 Update GitHub Actions workflow in `.github/workflows/release.yml` to trigger on tags instead of branch pushes
- [x] 1.3 Modify `package.json` scripts to add new release commands
- [x] 1.4 Update version references in `src/jav.ts` to use package.json version
- [x] 1.5 Add documentation for the new release process in README.md
- [x] 1.6 Test the new release workflow with a beta version
- [x] 1.7 Update commitlint configuration if needed for new workflow
- [x] 1.8 Remove semantic-release dependencies from package.json

## 2. Validation
- [x] 2.1 Verify local npm version command updates all version references
- [x] 2.2 Confirm GitHub Actions workflow triggers correctly on tags
- [x] 2.3 Test changelog generation works with the new process
- [x] 2.4 Ensure release assets are properly published
- [x] 2.5 Validate that the new workflow supports all version types (major, minor, patch)

## 3. Documentation
- [x] 3.1 Update README with new release instructions
- [x] 3.2 Document the tag-based release workflow
- [x] 3.3 Add examples of release commands for different version types