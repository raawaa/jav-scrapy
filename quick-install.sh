#!/bin/bash

# jav-scrapy 快速安装脚本
# 支持 Linux 和 macOS

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "未检测到 Node.js，请先安装 Node.js"
        print_info "访问 https://nodejs.org 下载安装"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    local major_version=$(echo $node_version | cut -d'.' -f1)
    
    if [ "$major_version" -lt 14 ]; then
        print_error "Node.js 版本过低，需要 14 或更高版本，当前版本：$node_version"
        exit 1
    fi
    
    print_success "Node.js 版本检查通过：$node_version"
}

# 检查 npm
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "未检测到 npm"
        exit 1
    fi
    
    print_success "npm 检查通过"
}

# 选择安装方法
choose_install_method() {
    echo -e "${BLUE}请选择安装方法：${NC}"
    echo "1) npm 全局安装（推荐）"
    echo "2) yarn 全局安装"
    echo "3) pnpm 全局安装"
    echo "4) npx 临时使用"
    echo "5) yarn dlx 临时使用"
    echo "6) pnpm dlx 临时使用"
    
    while true; do
        read -p "请输入选项 (1-6): " choice
        case $choice in
            1) install_npm_global; break ;;
            2) install_yarn_global; break ;;
            3) install_pnpm_global; break ;;
            4) install_npx; break ;;
            5) install_yarn_dlx; break ;;
            6) install_pnpm_dlx; break ;;
            *) print_error "无效选项，请重新输入" ;;
        esac
    done
}

# npm 全局安装
install_npm_global() {
    print_info "使用 npm 全局安装..."
    
    if command -v sudo &> /dev/null && [ "$EUID" -ne 0 ]; then
        print_warning "检测到需要管理员权限，使用 sudo"
        sudo npm install -g https://github.com/raawaa/jav-scrapy.git
    else
        npm install -g https://github.com/raawaa/jav-scrapy.git
    fi
    
    print_success "安装完成！使用 'jav --help' 查看帮助"
}

# yarn 全局安装
install_yarn_global() {
    if ! command -v yarn &> /dev/null; then
        print_error "未检测到 yarn，请先安装 yarn"
        exit 1
    fi
    
    print_info "使用 yarn 全局安装..."
    yarn global add https://github.com/raawaa/jav-scrapy.git
    print_success "安装完成！使用 'jav --help' 查看帮助"
}

# pnpm 全局安装
install_pnpm_global() {
    if ! command -v pnpm &> /dev/null; then
        print_error "未检测到 pnpm，请先安装 pnpm"
        exit 1
    fi
    
    print_info "使用 pnpm 全局安装..."
    pnpm add -g https://github.com/raawaa/jav-scrapy.git
    print_success "安装完成！使用 'jav --help' 查看帮助"
}

# npx 临时使用
install_npx() {
    print_info "设置 npx 临时使用..."
    echo "alias jav='npx github:raawaa/jav-scrapy'" >> ~/.bashrc
    print_success "已添加别名到 ~/.bashrc"
    print_info "请运行 'source ~/.bashrc' 或重新打开终端"
    print_info "现在可以直接使用 'jav' 命令"
}

# yarn dlx 临时使用
install_yarn_dlx() {
    print_info "设置 yarn dlx 临时使用..."
    echo "alias jav='yarn dlx github:raawaa/jav-scrapy'" >> ~/.bashrc
    print_success "已添加别名到 ~/.bashrc"
    print_info "请运行 'source ~/.bashrc' 或重新打开终端"
    print_info "现在可以直接使用 'jav' 命令"
}

# pnpm dlx 临时使用
install_pnpm_dlx() {
    print_info "设置 pnpm dlx 临时使用..."
    echo "alias jav='pnpm dlx github:raawaa/jav-scrapy'" >> ~/.bashrc
    print_success "已添加别名到 ~/.bashrc"
    print_info "请运行 'source ~/.bashrc' 或重新打开终端"
    print_info "现在可以直接使用 'jav' 命令"
}

# 主函数
main() {
    echo -e "${BLUE}🎬 jav-scrapy 快速安装脚本${NC}"
    echo "=================================="
    
    check_node
    check_npm
    choose_install_method
    
    echo -e "${GREEN}🎉 安装完成！${NC}"
    echo -e "${BLUE}使用示例：${NC}"
    echo "jav --help"
    echo "jav -s '关键词' -l 10"
    echo "jav update"
}

# 运行主函数
main "$@"