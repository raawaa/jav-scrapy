## ADDED Requirements
### Requirement: Manual Release Process
The system SHALL support a manual release process where developers run `npm version` locally to generate version and tag.

#### Scenario: Local Version Bump
- **WHEN** a developer runs `npm version [major|minor|patch]`
- **THEN** the version in package.json SHALL be updated
- **AND** a git tag SHALL be created with the new version
- **AND** a changelog SHALL be generated based on conventional commits

### Requirement: Tag-Based GitHub Release
The system SHALL trigger GitHub Actions workflow when git tags are pushed.

#### Scenario: Tag Push Triggers Release
- **WHEN** a git tag is pushed to the repository
- **THEN** the GitHub Actions workflow SHALL be triggered
- **AND** the release SHALL be published to npm
- **AND** the changelog SHALL be included in the GitHub release

## MODIFIED Requirements
### Requirement: Version Reference Management
The system SHALL ensure all version references in the codebase are updated during the release process.

#### Scenario: Version Synchronization
- **WHEN** `npm version` command is executed
- **THEN** all version references in the codebase SHALL be updated
- **AND** the application SHALL read the version from package.json at runtime

#### Scenario: Changelog Generation
- **WHEN** a new release is created
- **THEN** the changelog SHALL be automatically generated
- **AND** the changelog SHALL follow the conventional commits format
- **AND** the changelog SHALL be included in the GitHub release

## REMOVED Requirements
### Requirement: Automatic Semantic Release
**Reason**: Replaced by manual release process with tag-based triggering.
**Migration**: The automatic release process based on conventional commits to master/main branches is no longer used.

### Requirement: Branch-Based Release Trigger
**Reason**: Replaced by tag-based release triggering.
**Migration**: The release process no longer triggers on pushes to master/main branches.