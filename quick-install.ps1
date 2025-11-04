# jav-scrapy Windows 快速安装脚本
# 支持 Windows PowerShell

# 设置控制台编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

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

# 检查 Node.js
function Test-NodeJS {
    Write-Info "检查 Node.js 环境..."
    
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
            if ($majorVersion -ge 14) {
                Write-Success "Node.js 版本检查通过：$nodeVersion"
                return $true
            } else {
                Write-Error "Node.js 版本过低，需要 14 或更高版本，当前版本：$nodeVersion"
                Write-Info "请访问 https://nodejs.org 下载最新版本"
                return $false
            }
        }
    } catch {
        Write-Error "未检测到 Node.js"
        Write-Info "请访问 https://nodejs.org 下载安装"
        return $false
    }
    
    return $false
}

# 检查 npm
function Test-NPM {
    Write-Info "检查 npm..."
    
    try {
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            Write-Success "npm 检查通过：$npmVersion"
            return $true
        }
    } catch {
        Write-Error "未检测到 npm"
        return $false
    }
    
    return $false
}

# 选择安装方法
function Select-InstallMethod {
    Write-ColorMessage "请选择安装方法：" "Blue"
    Write-Host "1) npm 全局安装（推荐）"
    Write-Host "2) yarn 全局安装"
    Write-Host "3) pnpm 全局安装"
    Write-Host "4) npx 临时使用"
    Write-Host "5) yarn dlx 临时使用"
    Write-Host "6) pnpm dlx 临时使用"
    
    while ($true) {
        $choice = Read-Host "请输入选项 (1-6)"
        switch ($choice) {
            "1" { Install-NPMGlobal; break }
            "2" { Install-YarnGlobal; break }
            "3" { Install-PnpmGlobal; break }
            "4" { Install-NPX; break }
            "5" { Install-YarnDLX; break }
            "6" { Install-PnpmDLX; break }
            default { Write-Error "无效选项，请重新输入" }
        }
    }
}

# npm 全局安装
function Install-NPMGlobal {
    Write-Info "使用 npm 全局安装..."
    
    try {
        npm install -g https://github.com/raawaa/jav-scrapy.git
        if ($LASTEXITCODE -eq 0) {
            Write-Success "安装完成！使用 'jav --help' 查看帮助"
        } else {
            Write-Error "安装失败，请检查权限或网络连接"
            Write-Info "尝试以管理员身份运行 PowerShell"
        }
    } catch {
        Write-Error "安装过程中出现错误：$($_.Exception.Message)"
        Write-Info "请尝试以管理员身份运行 PowerShell"
    }
}

# yarn 全局安装
function Install-YarnGlobal {
    try {
        $yarnVersion = yarn --version 2>$null
        if (-not $yarnVersion) {
            Write-Error "未检测到 yarn，请先安装 yarn"
            Write-Info "运行: npm install -g yarn"
            return
        }
        
        Write-Info "使用 yarn 全局安装..."
        yarn global add https://github.com/raawaa/jav-scrapy.git
        Write-Success "安装完成！使用 'jav --help' 查看帮助"
    } catch {
        Write-Error "安装过程中出现错误：$($_.Exception.Message)"
    }
}

# pnpm 全局安装
function Install-PnpmGlobal {
    try {
        $pnpmVersion = pnpm --version 2>$null
        if (-not $pnpmVersion) {
            Write-Error "未检测到 pnpm，请先安装 pnpm"
            Write-Info "运行: npm install -g pnpm"
            return
        }
        
        Write-Info "使用 pnpm 全局安装..."
        pnpm add -g https://github.com/raawaa/jav-scrapy.git
        Write-Success "安装完成！使用 'jav --help' 查看帮助"
    } catch {
        Write-Error "安装过程中出现错误：$($_.Exception.Message)"
    }
}

# npx 临时使用
function Install-NPX {
    Write-Info "设置 npx 临时使用..."
    
    $profilePath = $PROFILE.CurrentUserCurrentHost
    $aliasCommand = "Set-Alias -Name jav -Value 'npx github:raawaa/jav-scrapy'"
    
    if (-not (Test-Path $profilePath)) {
        New-Item -Path $profilePath -ItemType File -Force | Out-Null
    }
    
    Add-Content -Path $profilePath -Value $aliasCommand
    Write-Success "已添加别名到 PowerShell 配置文件"
    Write-Info "请运行: . `$PROFILE 或重新打开 PowerShell"
    Write-Info "现在可以直接使用 'jav' 命令"
}

# yarn dlx 临时使用
function Install-YarnDLX {
    Write-Info "设置 yarn dlx 临时使用..."
    
    $profilePath = $PROFILE.CurrentUserCurrentHost
    $aliasCommand = "Set-Alias -Name jav -Value 'yarn dlx github:raawaa/jav-scrapy'"
    
    if (-not (Test-Path $profilePath)) {
        New-Item -Path $profilePath -ItemType File -Force | Out-Null
    }
    
    Add-Content -Path $profilePath -Value $aliasCommand
    Write-Success "已添加别名到 PowerShell 配置文件"
    Write-Info "请运行: . `$PROFILE 或重新打开 PowerShell"
    Write-Info "现在可以直接使用 'jav' 命令"
}

# pnpm dlx 临时使用
function Install-PnpmDLX {
    Write-Info "设置 pnpm dlx 临时使用..."
    
    $profilePath = $PROFILE.CurrentUserCurrentHost
    $aliasCommand = "Set-Alias -Name jav -Value 'pnpm dlx github:raawaa/jav-scrapy'"
    
    if (-not (Test-Path $profilePath)) {
        New-Item -Path $profilePath -ItemType File -Force | Out-Null
    }
    
    Add-Content -Path $profilePath -Value $aliasCommand
    Write-Success "已添加别名到 PowerShell 配置文件"
    Write-Info "请运行: . `$PROFILE 或重新打开 PowerShell"
    Write-Info "现在可以直接使用 'jav' 命令"
}

# 主函数
function Main {
    Write-ColorMessage "🎬 jav-scrapy Windows 快速安装脚本" "Blue"
    Write-Host "=================================="
    
    if (-not (Test-NodeJS)) {
        return
    }
    
    if (-not (Test-NPM)) {
        return
    }
    
    Select-InstallMethod
    
    Write-ColorMessage "🎉 安装完成！" "Green"
    Write-ColorMessage "使用示例：" "Blue"
    Write-Host "jav --help"
    Write-Host "jav -s '关键词' -l 10"
    Write-Host "jav update"
    
    Write-Host "`n按任意键退出..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# 运行主函数
Main