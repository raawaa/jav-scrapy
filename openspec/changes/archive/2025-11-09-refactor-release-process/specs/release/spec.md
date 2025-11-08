## ADDED Requirements
### Requirement: Local Release Command
The system SHALL provide a local command for managing releases.

#### Scenario: Running Local Release
- **WHEN** a developer executes `npm run release` locally
- **THEN** the command SHALL update the version in package.json
- **AND** generate an updated changelog
- **AND** create a git tag matching the new version

### Requirement: Release Validation
The system SHALL validate release readiness before creating a new release.

#### Scenario: Release Validation Check
- **WHEN** a release command is executed
- **THEN** the system SHALL verify all tests pass
- **AND** verify the working directory is clean
- **AND** verify there are no uncommitted changes

## MODIFIED Requirements
### Requirement: Release Process
The system SHALL execute release process based on manual commands rather than automatic triggers.

#### Scenario: Manual Release Execution
- **WHEN** a developer initiates a release manually
- **THEN** the system SHALL build the project
- **AND** update version information
- **AND** generate changelog
- **AND** create git tag
- **AND** push changes to remote repository