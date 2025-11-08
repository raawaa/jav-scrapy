## Context
The project currently uses semantic-release for automated versioning and publishing. The new requirement is to shift to a manual release process where developers run `npm version` locally to generate version and tag, update all version references in code, and have GitHub workflow trigger on tag to publish release with changelog.

## Goals / Non-Goals

### Goals
- Enable manual control over the release process
- Maintain automated GitHub release publishing when tags are created
- Ensure all version references in the codebase are updated during release
- Keep changelog generation functionality
- Support all semantic versioning types (major, minor, patch)

### Non-Goals
- Changing the conventional commit format
- Modifying the build process
- Changing the testing approach

## Decisions

### Decision: Tag-based Release Workflow
Instead of automatically releasing on every push to master/main, we'll use a tag-based approach where:
1. Developers run `npm version [major|minor|patch]` locally
2. This updates package.json and creates a git tag
3. GitHub Actions workflow triggers on tag creation to publish release

### Decision: Version Reference Management
We'll ensure all version references in the codebase are updated during the release process by:
1. Using npm version's built-in functionality to update package.json
2. Ensuring the application reads version from package.json at runtime
3. Adding pre-version scripts to validate the release

### Decision: Changelog Generation
We'll maintain the existing conventional-changelog functionality but integrate it with the new workflow:
1. Generate changelog during the npm version process
2. Include changelog in the GitHub release

## Risks / Trade-offs

### Risk: Manual Process Reliability
Moving from automated to manual releases introduces human error risk. Mitigation:
- Document the process clearly
- Add validation scripts
- Test the workflow thoroughly

### Trade-off: Release Frequency
Manual releases may reduce release frequency but increase control. This is an intentional change requested by the team.

## Migration Plan
1. Update GitHub Actions workflow to trigger on tags
2. Modify package.json scripts to support the new workflow
3. Update version references in source code
4. Test the new workflow with a beta release
5. Document the new process

## Open Questions
- Should we maintain both workflows during transition or switch completely?
- Do we need to update any documentation beyond README?