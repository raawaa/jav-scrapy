## ADDED Requirements
### Requirement: Automatic GitHub Release Creation
The system MUST automatically create GitHub releases with proper versioning and changelogs when code is pushed to the master branch.

#### Scenario: Push triggers release workflow
- **WHEN** code is pushed to the master branch
- **THEN** GitHub Actions workflow is triggered automatically
- **AND** semantic-release analyzes the commit messages
- **AND** determines the appropriate version bump (major/minor/patch)
- **AND** creates a GitHub release with version tag

#### Scenario: Version determination from commits
- **GIVEN** commits follow conventional commit format (feat:, fix:, chore:, etc.)
- **WHEN** semantic-release analyzes the commits
- **THEN** it determines the version bump:
  - feat: → minor version bump
  - fix: → patch version bump
  - breaking change in commit → major version bump
  - chore:, docs:, etc. → no release (unless configured otherwise)

#### Scenario: Release with changelog
- **WHEN** a release is created
- **THEN** the GitHub release MUST include:
  - Auto-generated release notes from commit messages
  - CHANGELOG.md entries for this version
  - Version tag (e.g., v0.9.0)
  - Links to commits and compare views
- **AND** CHANGELOG.md is updated in the repository

#### Scenario: No release for non-feature commits
- **WHEN** only chore, docs, or other non-breaking changes are pushed
- **THEN** semantic-release MAY skip creating a release (depending on configuration)
- **AND** no version tag is created
- **AND** repository remains on the current version

### Requirement: GitHub Actions Workflow
The system MUST use GitHub Actions to run the automated release process.

#### Scenario: Workflow triggers on push
- **WHEN** code is pushed to master branch
- **THEN** the "Release" workflow runs on Ubuntu latest
- **AND** the workflow checks out code with full history
- **AND** sets up Node.js 20
- **AND** installs dependencies with `npm ci`
- **AND** builds the project with `npm run build`
- **AND** runs `npx semantic-release`

#### Scenario: Workflow uses GitHub token
- **WHEN** the workflow runs semantic-release
- **THEN** it MUST have access to GITHUB_TOKEN secret
- **AND** the token is used to authenticate GitHub API calls
- **AND** the token has permissions to create releases and tags

### Requirement: Semantic-Release Configuration
The system MUST be configured with semantic-release plugins for automatic releases.

#### Scenario: Configured plugins
- **GIVEN** `.releaserc.json` exists
- **WHEN** semantic-release runs
- **THEN** it MUST use these plugins in order:
  1. `@semantic-release/commit-analyzer` - analyzes commits
  2. `@semantic-release/release-notes-generator` - generates release notes
  3. `@semantic-release/changelog` - updates CHANGELOG.md
  4. `@semantic-release/git` - commits changes to repository
  5. `@semantic-release/github` - creates GitHub release

#### Scenario: Branch configuration
- **GIVEN** the repository has master/main branch
- **WHEN** semantic-release is configured
- **THEN** it MUST monitor the correct branch (master or main)
- **AND** releases are created from that branch

### Requirement: No Manual Intervention Required
The release process MUST be fully automated without requiring manual steps.

#### Scenario: Push and release
- **WHEN** developer pushes to master
- **AND** the push contains feature commits
- **THEN** no manual action is required
- **AND** a release is created automatically
- **AND** the release is available on GitHub Releases page

#### Scenario: Release validation
- **GIVEN** a release is created
- **WHEN** user visits the GitHub repository Releases page
- **THEN** they will see:
  - Correct version number
  - Release notes with commit messages
  - Links to compare with previous version
  - Download links for artifacts (if any)
