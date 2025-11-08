## ADDED Requirements
### Requirement: Manual Version Management
The system SHALL allow manual version updates through npm version commands.

#### Scenario: Version Update Process
- **WHEN** a developer runs `npm version [major|minor|patch]`
- **THEN** the package.json version SHALL be updated
- **AND** the compiled JavaScript version SHALL reflect the new version
- **AND** all version references in the distribution files SHALL be updated

## MODIFIED Requirements
### Requirement: Package Distribution
The system SHALL update version references in all distribution files during release.

#### Scenario: Distribution Build with New Version
- **WHEN** a new version is created via npm version
- **THEN** the dist/ directory SHALL be rebuilt with the new version
- **AND** all version strings in the compiled files SHALL match the package.json version