@echo off
chcp 65001 > nul

:: 调用PowerShell脚本
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0install.ps1"

if %errorLevel% neq 0 (
    echo 安装过程中出现错误
    pause
    exit /b 1
)

pause
