# 安装脚本 - jav-scrapy
# 功能：自动化安装Node.js环境、项目依赖并构建项目

# 设置控制台编码为UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# 设置代码页为65001(UTF-8)
chcp 65001 | Out-Null

# 1. 检查并安装Node.js
Write-Host "[1/4] 检查Node.js环境..." -ForegroundColor Cyan
$nodeVersion = (node --version) 2>$null

if (-not $nodeVersion) {
    Write-Host "未检测到Node.js，正在安装..." -ForegroundColor Yellow
    
    # 下载并安装Node.js LTS版本
    $nodeInstaller = "$env:TEMP\nodejs.msi"
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v18.17.1/node-v18.17.1-x64.msi" -OutFile $nodeInstaller
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", "`"$nodeInstaller`"", "/qn" -Wait
    
    # 刷新环境变量
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # 验证安装
    $nodeVersion = node --version
    if (-not $nodeVersion) {
        Write-Host "Node.js安装失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "已安装Node.js $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "已检测到Node.js $nodeVersion" -ForegroundColor Green
}

# 2. 安装TypeScript编译器
Write-Host "[2/4] 安装TypeScript编译器..." -ForegroundColor Cyan
npm install -g typescript
$tscVersion = tsc --version
Write-Host "已安装TypeScript $tscVersion" -ForegroundColor Green

# 3. 安装项目依赖
Write-Host "[3/4] 安装项目依赖..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "依赖安装失败" -ForegroundColor Red
    exit 1
}
Write-Host "依赖安装完成" -ForegroundColor Green

# 4. 构建项目
Write-Host "[4/4] 构建项目..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "构建完成" -ForegroundColor Green

# 5. 全局安装
Write-Host "[5/5] 全局安装..." -ForegroundColor Cyan
npm install -g . --force
Write-Host "安装完成！" -ForegroundColor Green

# 完成提示
Write-Host "全部安装成功！您现在可以通过 'jav-scrapy' 命令使用本工具。" -ForegroundColor Green
