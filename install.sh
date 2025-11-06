#!/bin/bash
set -e

# jav-scrapy 一键安装脚本
# 支持 Linux 和 macOS

# 配置
REPO_OWNER="raawaa"
REPO_NAME="jav-scrapy"
BIN_NAME="jav"
API_BASE="https://api.github.com"
RAW_BASE="https://raw.githubusercontent.com"

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

# 检测系统
detect_system() {
    print_info "检测系统环境..."
    
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="x64" ;;
        arm64|aarch64) ARCH="arm64" ;;
        *) 
            print_error "不支持的架构: $ARCH"
            print_info "支持的架构: x64, arm64"
            exit 1 
            ;;
    esac
    
    case $OS in
        darwin) OS="macos" ;;
        linux) OS="linux" ;;
        *) 
            print_error "不支持的操作系统: $OS"
            print_info "支持的操作系统: Linux, macOS"
            exit 1 
            ;;
    esac
    
    print_success "检测到系统: $OS ($ARCH)"
}

# 检查网络连接
check_network() {
    print_info "检查网络连接..."
    
    if ! curl -s --connect-timeout 5 "$API_BASE/rate_limit" > /dev/null; then
        print_error "无法连接到 GitHub，请检查网络连接"
        print_info "如果在中国大陆，可能需要配置代理"
        exit 1
    fi
    
    print_success "网络连接正常"
}

# 获取最新版本
get_latest_version() {
    print_info "获取最新版本信息..."

    # 首先尝试获取最新release
    local latest_url="$API_BASE/repos/$REPO_OWNER/$REPO_NAME/releases/latest"
    local response=$(curl -s "$latest_url")
    VERSION=$(echo "$response" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

    if [ -n "$VERSION" ]; then
        # 检查最新版本是否有二进制文件
        local assets_count=$(echo "$response" | grep -c '"name":' || echo "0")
        local expected_pattern="jav-scrapy-${VERSION}-${OS}-${ARCH}"
        local found_binary=$(echo "$response" | grep "\"name\":[[:space:]]*\"$expected_pattern\"" || echo "")

        if [ "$assets_count" -gt 0 ] && [ -n "$found_binary" ]; then
            print_success "找到包含$OS $ARCH二进制文件的版本: $VERSION"
            return 0
        elif [ "$assets_count" -gt 0 ]; then
            # 检查是否有该平台的任何二进制文件
            local any_platform_binary=$(echo "$response" | grep "\"name\":[[:space:]]*\"jav-scrapy-${VERSION}-${OS}-" || echo "")
            if [ -n "$any_platform_binary" ]; then
                print_warning "找到$OS平台的二进制文件但架构不匹配: $VERSION"
                local available_binaries=$(echo "$response" | grep "\"name\":[[:space:]]*\"jav-scrapy-${VERSION}-${OS}-" | sed -E 's/.*"([^"]+)".*/\1/' | tr '\n' ', ')
                print_info "可用的$OS二进制文件: $available_binaries"
                print_warning "下载可能失败，可能需要手动下载"
                return 0
            else
                print_warning "最新版本 $VERSION 没有此平台的二进制文件"
            fi
        else
            print_warning "最新版本 $VERSION 没有二进制文件 (可能是semantic-release版本)"
        fi
    fi

    # 如果最新版本不合适，获取所有releases并查找
    print_info "查找其他有二进制文件的版本..."
    local api_url="$API_BASE/repos/$REPO_OWNER/$REPO_NAME/releases"

    # 使用简单的方法处理JSON响应
    local releases_response=$(curl -s "$api_url")

    # 提取所有版本信息并检查（使用文件临时存储来避免子shell问题）
    local temp_file="/tmp/jav-scrapy-versions.txt"
    echo "$releases_response" | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' > "$temp_file"

    while IFS= read -r version; do
        if [ -n "$version" ]; then
            print_info "检查版本: $version"

            # 获取该版本的详细信息
            local version_url="$API_BASE/repos/$REPO_OWNER/$REPO_NAME/releases/tags/$version"
            local version_response=$(curl -s "$version_url")

            # 检查是否有对应平台的二进制文件
            local expected_pattern="jav-scrapy-${version}-${OS}-${ARCH}"
            local found_binary=$(echo "$version_response" | grep "\"name\":[[:space:]]*\"$expected_pattern\"" || echo "")

            if [ -n "$found_binary" ]; then
                print_success "找到包含$OS $ARCH二进制文件的版本: $version"
                VERSION="$version"
                rm -f "$temp_file"
                return 0
            fi
        fi
    done < "$temp_file"

    rm -f "$temp_file"

    # 如果没有找到合适的版本，使用最新版本但给出警告
    if [ -z "$VERSION" ]; then
        print_error "没有找到包含$OS $ARCH二进制文件的版本"
        print_info "请手动访问: https://github.com/$REPO_OWNER/$REPO_NAME/releases"
        exit 1
    fi
}

# 下载二进制文件
download_binary() {
    local filename="jav-scrapy-${VERSION}-${OS}-${ARCH}"
    local download_url="https://github.com/$REPO_OWNER/$REPO_NAME/releases/download/$VERSION/$filename"
    
    print_info "下载二进制文件: $filename"
    
    # 创建临时目录
    mkdir -p /tmp/jav-scrapy-install
    local temp_file="/tmp/jav-scrapy-install/$filename"
    
    # 下载文件
    if ! curl -fsSL --connect-timeout 30 --retry 3 "$download_url" -o "$temp_file"; then
        print_error "下载失败"
        print_info "下载地址: $download_url"
        print_info "请检查网络连接或手动下载"
        exit 1
    fi
    
    # 验证文件
    if [ ! -f "$temp_file" ] || [ ! -s "$temp_file" ]; then
        print_error "下载的文件无效"
        exit 1
    fi
    
    chmod +x "$temp_file"
    print_success "下载完成"
}

# 安装二进制文件
install_binary() {
    # 确定安装目录
    local install_dir=""
    
    if [ -w "/usr/local/bin" ]; then
        install_dir="/usr/local/bin"
    elif [ -w "$HOME/.local/bin" ]; then
        install_dir="$HOME/.local/bin"
    else
        install_dir="$HOME/.local/bin"
        mkdir -p "$install_dir"
    fi
    
    print_info "安装到: $install_dir"
    
    # 移动文件
    local temp_file="/tmp/jav-scrapy-install/jav-scrapy-${VERSION}-${OS}-${ARCH}"
    mv "$temp_file" "$install_dir/$BIN_NAME"
    
    # 检查PATH
    if [[ ":$PATH:" != *":$install_dir:"* ]]; then
        print_warning "安装目录不在PATH中，正在添加..."
        
        # 检测shell并配置
        local shell_rc=""
        case $SHELL in
            */bash)
                shell_rc="$HOME/.bashrc"
                echo "export PATH=\"\$PATH:$install_dir\"" >> "$shell_rc"
                ;;
            */zsh)
                shell_rc="$HOME/.zshrc"
                echo "export PATH=\"\$PATH:$install_dir\"" >> "$shell_rc"
                ;;
            */fish)
                shell_rc="$HOME/.config/fish/config.fish"
                mkdir -p "$(dirname "$shell_rc")"
                echo "set -gx PATH \$PATH $install_dir" >> "$shell_rc"
                ;;
            *)
                print_warning "未识别的shell: $SHELL"
                print_info "请手动将 $install_dir 添加到PATH环境变量"
                ;;
        esac
        
        if [ -n "$shell_rc" ]; then
            print_success "已添加到 $shell_rc"
            print_warning "请运行 'source $shell_rc' 或重新打开终端"
        fi
    fi
    
    print_success "安装完成: $install_dir/$BIN_NAME"
}

# 创建卸载脚本
create_uninstall_script() {
    local install_dir=""
    if [ -w "/usr/local/bin" ]; then
        install_dir="/usr/local/bin"
    else
        install_dir="$HOME/.local/bin"
    fi
    
    local uninstall_script="$install_dir/jav-scrapy-uninstall"
    
    cat > "$uninstall_script" << EOF
#!/bin/bash
# jav-scrapy 卸载脚本

echo "🗑️  卸载 jav-scrapy..."

# 删除二进制文件
if [ -f "$install_dir/$BIN_NAME" ]; then
    rm -f "$install_dir/$BIN_NAME"
    echo "✅ 已删除: $install_dir/$BIN_NAME"
fi

# 删除卸载脚本
rm -f "$uninstall_script"

echo ""
echo "🎉 卸载完成！"
echo ""
echo "📋 后续清理步骤："
echo "1. 手动从以下文件中移除PATH配置："
echo "   - ~/.bashrc"
echo "   - ~/.zshrc" 
echo "   - ~/.config/fish/config.fish"
echo "2. 删除配置文件: ~/.jav-scrapy-antiblock-urls.json"
echo ""
echo "感谢使用 jav-scrapy！"
EOF
    
    chmod +x "$uninstall_script"
    print_success "创建卸载脚本: $uninstall_script"
}

# 验证安装
verify_installation() {
    local install_dir=""
    if [ -w "/usr/local/bin" ]; then
        install_dir="/usr/local/bin"
    else
        install_dir="$HOME/.local/bin"
    fi
    
    if [ -f "$install_dir/$BIN_NAME" ]; then
        print_success "安装验证成功"
        print_info "版本信息:"
        "$install_dir/$BIN_NAME" --version 2>/dev/null || print_warning "无法获取版本信息"
    else
        print_error "安装验证失败"
        exit 1
    fi
}

# 清理临时文件
cleanup() {
    if [ -d "/tmp/jav-scrapy-install" ]; then
        rm -rf "/tmp/jav-scrapy-install"
    fi
}

# 主函数
main() {
    echo -e "${BLUE}🎬 jav-scrapy 一键安装程序${NC}"
    echo "=================================="
    echo ""
    
    # 设置错误处理
    trap cleanup EXIT
    
    # 执行安装步骤
    detect_system
    check_network
    get_latest_version
    download_binary
    install_binary
    create_uninstall_script
    verify_installation
    
    echo ""
    echo -e "${GREEN}🎉 安装完成！${NC}"
    echo ""
    echo -e "${BLUE}📖 使用方法：${NC}"
    echo "  $BIN_NAME --help                    # 查看帮助"
    echo "  $BIN_NAME                           # 开始抓取"
    echo "  $BIN_NAME -s '关键词' -l 10        # 搜索并下载10个"
    echo "  $BIN_NAME update                    # 更新防屏蔽地址"
    echo ""
    echo -e "${BLUE}🗑️  卸载方法：${NC}"
    if [ -w "/usr/local/bin" ]; then
        echo "  /usr/local/bin/jav-scrapy-uninstall"
    else
        echo "  ~/.local/bin/jav-scrapy-uninstall"
    fi
    echo ""
    echo -e "${YELLOW}💡 提示：${NC}"
    echo "  - 首次运行可能需要下载Chromium浏览器"
    echo "  - 如遇网络问题，请配置代理或使用VPN"
    echo "  - 更多信息请访问: https://github.com/$REPO_OWNER/$REPO_NAME"
    echo ""
}

# 运行主函数
main "$@"
