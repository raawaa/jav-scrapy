# jav-scrapy Windows One-Click Installation Script
# For Windows PowerShell
#
# This script automatically downloads and installs the latest version of jav-scrapy
# It detects system architecture, downloads the appropriate binary, and configures PATH
# 用途：Windows下一键安装jav-scrapy爬虫工具

# Set console encoding to UTF-8 (设置控制台编码为UTF-8)
try {
    $OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    chcp 65001 > $null 2>&1
} catch {
    Write-Warning "Cannot set UTF-8 encoding, Chinese may not display properly"
}

# Configuration (配置信息)
$RepoOwner = "raawaa"              # GitHub repository owner
$RepoName = "jav-scrapy"           # GitHub repository name
$InstallDir = "$env:LOCALAPPDATA\jav-scrapy"  # Installation directory (安装目录)

# Color definitions
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Print colored messages
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Info {
    param([string]$Message)
    Write-ColorMessage "[INFO] $Message" "Blue"
}

function Write-Success {
    param([string]$Message)
    Write-ColorMessage "[SUCCESS] $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorMessage "[WARNING] $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-ColorMessage "[ERROR] $Message" "Red"
}

# Check PowerShell version
function Test-PowerShellVersion {
    Write-Info "Checking PowerShell version..."

    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-Error "PowerShell 5.0 or higher required, current: $($PSVersionTable.PSVersion)"
        exit 1
    }

    Write-Success "PowerShell version OK: $($PSVersionTable.PSVersion)"
}

# Check network connection
function Test-NetworkConnection {
    Write-Info "Checking network connection..."

    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/rate_limit" -TimeoutSec 10
        Write-Success "Network connection OK"
        return $true
    } catch {
        Write-Error "Cannot connect to GitHub"
        Write-Info "If in China, you may need proxy or VPN"
        exit 1
    }
}

# Detect system architecture
function Get-SystemArchitecture {
    Write-Info "Detecting system architecture..."

    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "AMD64") {
        "x64"
    } elseif ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
        "arm64"
    } else {
        Write-Error "Unsupported architecture: $($env:PROCESSOR_ARCHITECTURE)"
        exit 1
    }

    Write-Success "Architecture: $arch"
    return $arch
}

# Get latest version
function Get-LatestVersion {
    Write-Info "Getting latest version..."

    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/releases"
        $arch = Get-SystemArchitecture
        $checkedVersions = 0

        foreach ($release in $response) {
            $version = $release.tag_name
            $hasAssets = $release.assets.Count -gt 0
            $checkedVersions++

            Write-Info "Checking version: $version (assets: $($release.assets.Count))"

            if ($hasAssets) {
                # Look for Windows exe files, try architecture-specific first, then any Windows exe
                $foundWindowsExe = $release.assets | Where-Object {
                    $_.name -like "*.exe" -and
                    $_.name -like "*windows*" -and
                    $_.name -like "*$arch*"
                } | Select-Object -First 1

                if (-not $foundWindowsExe) {
                    # If no architecture-specific binary found, look for any Windows exe
                    $foundWindowsExe = $release.assets | Where-Object {
                        $_.name -like "*.exe" -and
                        $_.name -like "*windows*"
                    } | Select-Object -First 1

                    if ($foundWindowsExe) {
                        Write-Warning "Found Windows binary but not for $arch architecture: $($foundWindowsExe.name)"
                        Write-Warning "This may not work on your system"
                    }
                }

                if ($foundWindowsExe) {
                    Write-Success "Found version with Windows binary: $version"
                    Write-Info "Binary file: $($foundWindowsExe.name)"
                    Write-Warning "Note: This binary may not match your $arch architecture"
                    return $version
                } else {
                    Write-Warning "Version $version has assets but no Windows binary"
                }
            } else {
                Write-Warning "Version $version has no assets (likely semantic-release without binaries)"
            }

            # Limit checks to avoid API limits
            if ($checkedVersions -ge 10) {
                Write-Warning "Checked 10 most recent versions, stopping to avoid API limits"
                break
            }
        }

        Write-Error "No version with Windows $arch binaries found"
        Write-Info "Please visit: https://github.com/$RepoOwner/$RepoName/releases"
        Write-Info "You may need to download the binary manually"
        exit 1
    } catch {
        Write-Error "Version check failed: $($_.Exception.Message)"
        exit 1
    }
}

# Download binary
function Download-Binary {
    param(
        [string]$Version,
        [string]$Architecture
    )

    $tempPath = "$env:TEMP\jav-scrapy-install"

    Write-Info "Looking for binaries in version: $Version"

    if (Test-Path $tempPath) {
        Remove-Item -Path $tempPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempPath -Force | Out-Null

    try {
        # Get release info to find the correct binary file
        $releaseInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/releases/tags/$Version"

        # Find Windows exe for this architecture first, then any Windows exe
        $binaryAsset = $releaseInfo.assets | Where-Object {
            $_.name -like "*.exe" -and
            $_.name -like "*windows*" -and
            $_.name -like "*$Architecture*"
        } | Select-Object -First 1

        if (-not $binaryAsset) {
            # If no architecture-specific binary found, look for any Windows exe
            $binaryAsset = $releaseInfo.assets | Where-Object {
                $_.name -like "*.exe" -and
                $_.name -like "*windows*"
            } | Select-Object -First 1

            if ($binaryAsset) {
                Write-Warning "Found Windows binary but not for $Architecture architecture: $($binaryAsset.name)"
                Write-Warning "This may not work optimally on your system"
            }
        }

        if (-not $binaryAsset) {
            Write-Error "No Windows binary found in version $Version"
            Write-Info "Available files:"
            $releaseInfo.assets | ForEach-Object { Write-Info "  - $($_.name)" }
            exit 1
        }

        $downloadUrl = $binaryAsset.browser_download_url
        $filename = $binaryAsset.name
        $tempFile = "$tempPath\$filename"

        Write-Info "Downloading: $filename"
        Write-Info "From: $downloadUrl"

        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -TimeoutSec 300

        if (-not (Test-Path $tempFile) -or (Get-Item $tempFile).Length -eq 0) {
            Write-Error "Downloaded file is invalid"
            exit 1
        }

        Write-Success "Download completed: $filename"
        return $tempFile
    } catch {
        Write-Error "Download failed: $($_.Exception.Message)"
        exit 1
    }
}

# Install binary
function Install-Binary {
    param(
        [string]$TempFile
    )

    Write-Info "Installing to: $InstallDir"

    if (Test-Path $InstallDir) {
        Write-Info "Cleaning existing installation..."
        Remove-Item -Path "$InstallDir\*" -Force -Recurse
    } else {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    $targetFile = "$InstallDir\jav.exe"
    Copy-Item -Path $TempFile -Destination $targetFile -Force

    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($currentPath -notlike "*$InstallDir*") {
        Write-Info "Adding to PATH..."
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$InstallDir", "User")
        Write-Warning "Restart PowerShell to use PATH"
    } else {
        Write-Success "PATH already configured"
    }

    Write-Success "Installed: $targetFile"
}

# Create uninstall script
function Create-UninstallScript {
    $uninstallScript = "$InstallDir\uninstall.bat"

    $scriptContent = '@echo off
echo Uninstalling jav-scrapy...
echo.

if exist "' + $InstallDir + '\jav.exe" (
    del "' + $InstallDir + '\jav.exe"
    echo Deleted: jav.exe
)

if exist "' + $InstallDir + '" (
    rd "' + $InstallDir + '" 2>nul
)

del "%~f0"

echo.
echo Uninstallation completed!
echo Please manually remove from PATH: ' + $InstallDir + '
echo.
pause'

    $scriptContent | Out-File -FilePath $uninstallScript -Encoding ASCII -Force
    Write-Success "Created uninstall script"
}

# Create desktop shortcut
function Create-Shortcut {
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = "$desktopPath\jav-scrapy.lnk"

    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = "$InstallDir\jav.exe"
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.Description = "jav-scrapy - AV film magnet link crawler"
        $shortcut.Save()

        Write-Success "Created desktop shortcut"
    } catch {
        Write-Warning "Could not create shortcut: $($_.Exception.Message)"
    }
}

# Verify installation
function Test-Installation {
    $targetFile = "$InstallDir\jav.exe"

    if (Test-Path $targetFile) {
        Write-Success "Installation verified"

        try {
            Write-Info "Version info:"
            & $targetFile --version
        } catch {
            Write-Warning "Cannot get version info"
        }
    } else {
        Write-Error "Installation verification failed"
        exit 1
    }
}

# Clean temp files
function Clear-TempFiles {
    $tempPath = "$env:TEMP\jav-scrapy-install"
    if (Test-Path $tempPath) {
        Remove-Item -Path $tempPath -Recurse -Force
    }
}

# Main function
function Main {
    Write-ColorMessage "jav-scrapy Windows One-Click Installer" "Blue"
    Write-Host "=========================================="
    Write-Host ""

    try {
        Test-PowerShellVersion
        Test-NetworkConnection
        $architecture = Get-SystemArchitecture
        $version = Get-LatestVersion
        $tempFile = Download-Binary -Version $version -Architecture $architecture
        Install-Binary -TempFile $tempFile
        Create-UninstallScript
        Create-Shortcut
        Test-Installation

        Write-Host ""
        Write-ColorMessage "Installation completed!" "Green"
        Write-Host ""
        Write-ColorMessage "Usage:" "Blue"
        Write-Host "  jav --help                    # Show help"
        Write-Host "  jav                           # Start crawling"
        Write-Host "  jav -s keyword -l 10          # Search and download 10 items"
        Write-Host "  jav update                    # Update anti-blocking URLs"
        Write-Host ""
        Write-ColorMessage "Uninstall:" "Blue"
        Write-Host "  Run: $InstallDir\uninstall.bat"
        Write-Host ""
        Write-ColorMessage "Tips:" "Yellow"
        Write-Host "  - First run may download Chromium browser"
        Write-Host "  - Restart PowerShell to use PATH environment variable"
        Write-Host "  - More info: https://github.com/$RepoOwner/$RepoName"
        Write-Host ""

    } catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
        exit 1
    } finally {
        Clear-TempFiles
    }

    Write-Host "Press any key to exit..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Run main function
Main