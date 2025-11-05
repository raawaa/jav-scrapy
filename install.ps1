# jav-scrapy Windows 一键安装脚本
# 支持 Windows PowerShell

# 设置控制台编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 配置
$RepoOwner = "raawaa"
$RepoName = "jav-scrapy"
$BinName = "jav"
$InstallDir = "$env:LOCALAPPDATA\jav-scrapy"

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# 打印带颜色的消息
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

# 检查PowerShell版本
function Test-PowerShellVersion {
    Write-Info "检查PowerShell版本..."
    
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        Write-Error "需要PowerShell 5.0或更高版本，当前版本: $($PSVersionTable.PSVersion)"
        Write-Info "请升级PowerShell或使用Windows PowerShell"
        exit 1
    }
    
    Write-Success "PowerShell版本检查通过: $($PSVersionTable.PSVersion)"
}

# 检查网络连接
function Test-NetworkConnection {
    Write-Info "检查网络连接..."
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/rate_limit" -TimeoutSec 10
        Write-Success "网络连接正常"
        return $true
    } catch {
        Write-Error "无法连接到GitHub，请检查网络连接"
        Write-Info "如果在中国大陆，可能需要配置代理"
        exit 1
    }
}

# 检测系统架构
function Get-SystemArchitecture {
    Write-Info "检测系统架构..."
    
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "AMD64") { 
        "x64" 
    } elseif ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { 
        "arm64" 
    } else {
        Write-Error "不支持的系统架构: $($env:PROCESSOR_ARCHITECTURE)"
        Write-Info "支持的架构: x64, arm64"
        exit 1
    }
    
    Write-Success "检测到架构: $arch"
    return $arch
}

# 获取最新版本
function Get-LatestVersion {
    Write-Info "获取最新版本信息..."
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
        $version = $response.tag_name
        
        if ([string]::IsNullOrEmpty($version)) {
            Write-Error "无法获取最新版本信息"
            Write-Info "请手动访问: https://github.com/$RepoOwner/$RepoName/releases"
            exit 1
        }
        
        Write-Success "最新版本: $version"
        return $version
    } catch {
        Write-Error "获取版本信息失败: $($_.Exception.Message)"
        exit 1
    }
}

# 下载二进制文件
function Download-Binary {
    param(
        [string]$Version,
        [string]$Architecture
    )
    
    $filename = "jav-scrapy-$Version-windows-$Architecture.exe"
    $downloadUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/$Version/$filename"
    $tempPath = "$env:TEMP\jav-scrapy-install"
    
    Write-Info "下载二进制文件: $filename"
    
    # 创建临时目录
    if (Test-Path $tempPath) {
        Remove-Item -Path $tempPath -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
    
    $tempFile = "$tempPath\$filename"
    
    try {
        # 下载文件
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile -TimeoutSec 300
        
        # 验证文件
        if (-not (Test-Path $tempFile) -or (Get-Item $tempFile).Length -eq 0) {
            Write-Error "下载的文件无效"
            exit 1
        }
        
        Write-Success "下载完成"
        return $tempFile
    } catch {
        Write-Error "下载失败: $($_.Exception.Message)"
        Write-Info "下载地址: $downloadUrl"
        Write-Info "请检查网络连接或手动下载"
        exit 1
    }
}

# 安装二进制文件
function Install-Binary {
    param(
        [string]$TempFile
    )
    
    Write-Info "安装到: $InstallDir"
    
    # 创建安装目录
    if (Test-Path $InstallDir) {
        Write-Info "安装目录已存在，正在清理..."
        Remove-Item -Path "$InstallDir\*" -Force -Recurse
    } else {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    
    # 复制文件
    $targetFile = "$InstallDir\jav.exe"
    Copy-Item -Path $TempFile -Destination $targetFile -Force
    
    # 添加到PATH环境变量
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
    if ($currentPath -notlike "*$InstallDir*") {
        Write-Info "添加到用户PATH环境变量..."
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$InstallDir", "User")
        Write-Warning "PATH环境变量已更新，重启PowerShell后生效"
    } else {
        Write-Success "PATH环境变量已配置"
    }
    
    Write-Success "安装完成: $targetFile"
}

# 创建卸载脚本
function Create-UninstallScript {
    $uninstallScript = "$InstallDir\uninstall.bat"
    
    $scriptContent = @"
@echo off
chcp 65001 >nul
echo 🗑️  卸载 jav-scrapy...
echo.

REM 删除二进制文件
if exist "$InstallDir\jav.exe" (
    del "$InstallDir\jav.exe"
    echo ✅ 已删除: $InstallDir\jav.exe
)

REM 删除安装目录
if exist "$InstallDir" (
    rd "$InstallDir" 2>nul
)

REM 删除卸载脚本自身
del "%~f0"

echo.
echo 🎉 卸载完成！
echo.
echo 📋 后续清理步骤：
echo 1. 手动从系统环境变量中移除: $InstallDir
echo 2. 删除配置文件: %USERPROFILE%\.jav-scrapy-antiblock-urls.json
echo.
echo 感谢使用 jav-scrapy！
pause
"@
    
    $scriptContent | Out-File -FilePath $uninstallScript -Encoding ASCII -Force
    Write-Success "创建卸载脚本: $uninstallScript"
}

# 创建快捷方式
function Create-Shortcut {
    $desktopPath = [Environment]::GetFolderPath("Desktop")
    $shortcutPath = "$desktopPath\jav-scrapy.lnk"
    
    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = "$InstallDir\jav.exe"
        $shortcut.WorkingDirectory = $InstallDir
        $shortcut.Description = "jav-scrapy - AV影片磁力链接爬虫工具"
        $shortcut.Save()
        
        Write-Success "创建桌面快捷方式: $shortcutPath"
    } catch {
        Write-Warning "创建桌面快捷方式失败: $($_.Exception.Message)"
    }
}

# 验证安装
function Test-Installation {
    $targetFile = "$InstallDir\jav.exe"
    
    if (Test-Path $targetFile) {
        Write-Success "安装验证成功"
        
        try {
            Write-Info "版本信息:"
            & $targetFile --version
        } catch {
            Write-Warning "无法获取版本信息，但文件安装成功"
        }
    } else {
        Write-Error "安装验证失败"
        exit 1
    }
}

# 清理临时文件
function Clear-TempFiles {
    $tempPath = "$env:TEMP\jav-scrapy-install"
    if (Test-Path $tempPath) {
        Remove-Item -Path $tempPath -Recurse -Force
    }
}

# 主函数
function Main {
    Write-ColorMessage "🎬 jav-scrapy Windows 一键安装程序" "Blue"
    Write-Host "=================================="
    Write-Host ""
    
    # 设置错误处理
    try {
        # 执行安装步骤
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
        Write-ColorMessage "🎉 安装完成！" "Green"
        Write-Host ""
        Write-ColorMessage "📖 使用方法：" "Blue"
        Write-Host "  jav --help                    # 查看帮助"
        Write-Host "  jav                           # 开始抓取"
        Write-Host "  jav -s '关键词' -l 10        # 搜索并下载10个"
        Write-Host "  jav update                    # 更新防屏蔽地址"
        Write-Host ""
        Write-ColorMessage "🗑️  卸载方法：" "Blue"
        Write-Host "  $InstallDir\uninstall.bat"
        Write-Host ""
        Write-ColorMessage "💡 提示：" "Yellow"
        Write-Host "  - 首次运行可能需要下载Chromium浏览器"
        Write-Host "  - 如遇网络问题，请配置代理或使用VPN"
        Write-Host "  - 重启PowerShell以使用PATH环境变量"
        Write-Host "  - 更多信息请访问: https://github.com/$RepoOwner/$RepoName"
        Write-Host ""
        
    } catch {
        Write-Error "安装过程中发生错误: $($_.Exception.Message)"
        exit 1
    } finally {
        Clear-TempFiles
    }
    
    Write-Host "按任意键退出..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# 运行主函数
Main