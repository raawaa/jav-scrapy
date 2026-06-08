#!/usr/bin/env bash
set -euo pipefail

REPO="raawaa/jav-scrapy"
INSTALL_VERSION="${1:-latest}"

# Colors
RESET="\033[0m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RED="\033[31m"

info()  { printf "${CYAN}%s${RESET}\n" "$*"; }
ok()    { printf "${GREEN}%s${RESET}\n" "$*"; }
warn()  { printf "${YELLOW}⚠ %s${RESET}\n" "$*"; }
err()   { printf "${RED}✖ %s${RESET}\n" "$*"; }

# ---- 前置检查 ----
info "jav-scrapy 安装程序"

if ! command -v node &>/dev/null; then
  err "未检测到 Node.js。请先安装 Node.js 16+：https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
  err "Node.js 版本过低（当前 $(node -v)），需要 16+"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  err "未检测到 npm（Node.js 似乎未随附 npm）"
  exit 1
fi

# ---- 解析版本 ----
if [ "$INSTALL_VERSION" = "latest" ]; then
  info "正在查询最新版本..."
  LATEST=$(curl -fsSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "User-Agent: install.sh" \
    "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null \
    | grep '"tag_name"' \
    | sed 's/.*"tag_name": "v//;s/".*//' \
  )

  if [ -z "$LATEST" ]; then
    err "无法获取最新版本信息，请检查网络连接"
    err "如果网络受限，可手动指定版本："
    err "  curl -fsSL https://raw.github.com/$REPO/main/install.sh | sh -s -- v1.0.0"
    exit 1
  fi
  INSTALL_VERSION="$LATEST"
fi

# 去掉可能的 v 前缀
INSTALL_VERSION="${INSTALL_VERSION#v}"

TARBALL_URL="https://github.com/$REPO/releases/download/v${INSTALL_VERSION}/jav-scrapy-v${INSTALL_VERSION}.tgz"

info "正在安装 jav-scrapy v${INSTALL_VERSION}..."
info "源: $TARBALL_URL"

# ---- 执行安装 ----
if ! npm install -g "$TARBALL_URL" 2>&1; then
  err "安装失败。常见原因："
  err "  1. npm 全局安装权限不足 → 配置 npm 全局路径，或使用 npx："
  err "     npx $REPO --help"
  err "  2. 网络问题 → 检查代理设置："
  err "     export HTTP_PROXY=http://proxy:port"
  err "     export HTTPS_PROXY=http://proxy:port"
  err "  3. 版本不存在 → 确认版本 ${INSTALL_VERSION} 已发布"
  exit 1
fi

ok "✅ jav v${INSTALL_VERSION} 安装成功！"
echo ""
info "运行 jav --help 开始使用"
info "运行 jav upgrade 检查更新"
