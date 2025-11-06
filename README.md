# 🎬 jav-scrapy

一个可以爬取 AV 磁力链接或影片封面的小爬虫。

## ✨ 特性

- **灵活的抓取功能**: 支持抓取磁力链接、影片信息和封面图片。
- **智能的防屏蔽地址管理**: 通过 `update` 命令自动检测并保存防屏蔽地址，`crawl` 命令优先使用本地地址，也可手动指定。
- **自动代理支持**: 自动检测并使用系统代理设置。
- **文件名自动简化**: 智能处理过长或含非法字符的文件名，确保图片保存成功。
- **并发控制**: 可自定义抓取并发数，提高效率。
- **多种筛选方式**: 支持按关键词搜索、按磁链存在与否筛选影片。

## ⚙️ 系统要求

在安装之前，请确保您的系统已安装以下基础软件：

- **Node.js** (版本 18 或更高，推荐使用最新的LTS版本进行开发) - [下载地址](https://nodejs.org/)
  - 开发环境：推荐使用 Node.js 20+ 以获得最佳性能和新特性支持
  - 二进制构建：使用 Node.js 18 目标以确保最大兼容性
- **Git** - [下载地址](https://git-scm.com/)

> **注意**: 本项目所有开发工具都作为本地依赖包管理，无需安装任何全局 npm 包，避免污染您的系统环境。

## ⚙️ 安装

### 🚀 一行命令安装

无需任何环境配置，一行命令完成下载、安装和配置：

**Linux/macOS：**
```bash
curl -sSL https://raw.githubusercontent.com/raawaa/jav-scrapy/master/install.sh | bash
```

**Windows PowerShell (管理员权限运行)：**
```powershell
iwr -useb https://raw.githubusercontent.com/raawaa/jav-scrapy/master/install.ps1 | iex
```

> **系统要求**：Windows PowerShell 5.0+，支持 x64 和 ARM64 架构

安装完成后，直接使用：
```bash
jav --help
```

### 🔧 安装过程说明

安装脚本会自动执行以下操作：

- ✅ **系统检测**：自动检测 PowerShell 版本和系统架构 (x64/ARM64)
- ✅ **版本选择**：从 GitHub 获取最新的包含二进制文件的版本
- ✅ **下载安装**：下载对应架构的程序并安装到 `%LOCALAPPDATA%\jav-scrapy\`
- ✅ **环境配置**：自动添加到用户 PATH 环境变量
- ✅ **创建快捷方式**：在桌面创建快捷方式 (可选)
- ✅ **安装验证**：验证安装成功并显示版本信息

> **注意**：PATH 环境变量更新后，需要重新启动 PowerShell 才能生效。如果遇到中文显示问题，这是正常的，安装脚本使用英文输出确保兼容性。

### 📋 卸载方法

安装完成后，会自动创建卸载脚本：

**Linux/macOS：**
```bash
/usr/local/bin/jav-scrapy-uninstall
# 或
~/.local/bin/jav-scrapy-uninstall
```

**Windows：**
```cmd
%LOCALAPPDATA%\jav-scrapy\uninstall.bat
```

## 🚀 使用方法

**默认命令**: 直接运行 `jav` 等同于运行 `jav crawl` 命令。

### 🌐 防屏蔽地址管理 (`jav update`)

建议首次使用或定期运行此命令来更新防屏蔽地址列表。程序会尝试检测最新的可用地址，并追加保存到 `~/.jav-scrapy-antiblock-urls.json` 文件中。

```bash
$ jav update
```

`crawl` 命令在未指定 `-b` 参数时，会优先使用 `~/.jav-scrapy-antiblock-urls.json` 文件中的地址。

### 🎬 启动抓取任务 (`jav crawl` 或 `jav`)

运行抓取任务。可以根据需求使用不同的选项。

```bash
$ jav crawl [options]
# 或者简写为
$ jav [options]
```

**常用示例**: 

- **基本抓取（默认设置）**:
```bash
$ jav
```
（这会使用本地防屏蔽地址或默认地址，抓取全部磁力链接和封面到当前目录）

- **抓取指定数量的影片并指定输出目录和并发数**:
```bash
$ jav -l 10 -o ~/downloads/magnets -p 5
```

- **搜索并抓取特定关键词的影片**:
```bash
$ jav -s "影片关键词"
```

- **使用指定的代理服务器**:
```bash
$ jav -x http://127.0.0.1:8087
```

- **设置请求间隔时间**:
```bash
$ jav -d 3
```

- **手动设置Cookies**:
```bash
$ jav -c "session_id=abc123; token=def456"
```

- **启用Cloudflare绕过功能**:
```bash
$ jav --cloudflare
```

- **只抓取磁力链接，不下载图片**:
```bash
$ jav -N
```

- **指定抓取的起始页URL**:
```bash
$ jav -b https://www.your-preferred-jav-site.com/
```

- **组合多个选项**:
```bash
$ jav -l 5 -p 3 -d 2 -o /path/to/output -s "关键词" --cloudflare
```

## ⌨️ 命令行选项说明

| 选项                 | 说明                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| -p, --parallel<num>  | 设置抓取并发连接数（默认：2）                                            |
| -t, --timeout<num>   | 设置连接超时时间（毫秒，默认：30000）                                |
| -o, --output<path>   | 设置磁链和封面抓取结果的保存位置（默认为当前工作目录）                    |
| -s, --search<string> | 搜索关键词，可只抓取搜索结果的磁链或封面                               |
| -b, --base<url>      | 自定义抓取的起始页URL。指定此选项将覆盖本地保存的防屏蔽地址。           |
| -x, --proxy<url>     | 使用代理服务器（例：-x http://127.0.0.1:8087）。如果检测到系统代理，此选项会覆盖系统代理设置。       |
| -l, --limit<num>     | 设置抓取影片的数量上限，0为抓取全部影片（默认：0）                    |
| -d, --delay<num>     | 设置请求间隔时间（秒，默认：2秒）                                      |
| -n, --nomag          | 是否抓取尚无磁链的影片（默认：不抓取）                               |
| -a, --allmag         | 是否抓取影片的所有磁链（默认只抓取文件体积最大的磁链）               |
| -N, --nopic          | 不抓取图片                                                           |
| -c, --cookies<string> | 手动设置Cookies（格式："key1=value1; key2=value2"）                 |
| --cloudflare         | 启用 Cloudflare 绕过功能                                            |


## 📌 注意事项 (Notes)

- 程序会自动检测并使用系统代理设置。
- 抓取图片时，如果文件名过长或包含非法字符，程序会尝试自动简化文件名进行保存。
- `jav update` 命令会将检测到的防屏蔽地址追加保存到 `~/.jav-scrapy-antiblock-urls.json` 文件中。


## 👥 贡献者 (Contributors)

- [@qiusli](https://github.com/qiusli)
- [@Eddie104](https://github.com/Eddie104)
- [@leongfeng](https://github.com/leongfeng)
