#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 版本号同步和 changelog 生成脚本
 * 用于在发布前确保版本号一致性并生成最新的 changelog
 */

class VersionManager {
  constructor() {
    this.packageJsonPath = path.join(__dirname, '..', 'package.json');
    this.changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    this.packageJson = this.readPackageJson();
  }

  readPackageJson() {
    try {
      const content = fs.readFileSync(this.packageJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('❌ 无法读取 package.json:', error.message);
      process.exit(1);
    }
  }

  writePackageJson() {
    try {
      fs.writeFileSync(this.packageJsonPath, JSON.stringify(this.packageJson, null, 2) + '\n');
      console.log('✅ package.json 已更新');
    } catch (error) {
      console.error('❌ 无法写入 package.json:', error.message);
      process.exit(1);
    }
  }

  getCurrentVersion() {
    return this.packageJson.version;
  }

  updateVersion(newVersion) {
    if (!this.isValidVersion(newVersion)) {
      console.error('❌ 无效的版本号格式:', newVersion);
      process.exit(1);
    }

    this.packageJson.version = newVersion;
    this.writePackageJson();
    console.log(`✅ 版本号已更新为: ${newVersion}`);
  }

  isValidVersion(version) {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    return semverRegex.test(version);
  }

  generateChangelog() {
    try {
      console.log('📝 正在生成 changelog...');
      execSync('npm run changelog', { stdio: 'inherit' });
      console.log('✅ Changelog 已生成');
    } catch (error) {
      console.error('❌ 生成 changelog 失败:', error.message);
      process.exit(1);
    }
  }

  generateFirstChangelog() {
    try {
      console.log('📝 正在生成初始 changelog...');
      execSync('npm run changelog:first', { stdio: 'inherit' });
      console.log('✅ 初始 Changelog 已生成');
    } catch (error) {
      console.error('❌ 生成初始 changelog 失败:', error.message);
      process.exit(1);
    }
  }

  checkChangelogExists() {
    return fs.existsSync(this.changelogPath);
  }

  getGitTag() {
    return `v${this.getCurrentVersion()}`;
  }

  createGitTag() {
    const tag = this.getGitTag();
    try {
      console.log(`🏷️  正在创建 git tag: ${tag}`);
      execSync(`git tag ${tag}`, { stdio: 'inherit' });
      console.log(`✅ Git tag ${tag} 已创建`);
    } catch (error) {
      console.error('❌ 创建 git tag 失败:', error.message);
      process.exit(1);
    }
  }

  pushGitTag() {
    const tag = this.getGitTag();
    try {
      console.log(`📤 正在推送 git tag: ${tag}`);
      execSync(`git push origin ${tag}`, { stdio: 'inherit' });
      console.log(`✅ Git tag ${tag} 已推送`);
    } catch (error) {
      console.error('❌ 推送 git tag 失败:', error.message);
      process.exit(1);
    }
  }

  checkGitStatus() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      return status.trim() === '';
    } catch (error) {
      console.error('❌ 检查 git status 失败:', error.message);
      return false;
    }
  }

  showVersionInfo() {
    const version = this.getCurrentVersion();
    const tag = this.getGitTag();
    const changelogExists = this.checkChangelogExists();
    const gitClean = this.checkGitStatus();

    console.log('\n📋 版本信息:');
    console.log(`   当前版本: ${version}`);
    console.log(`   Git Tag: ${tag}`);
    console.log(`   Changelog: ${changelogExists ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   Git 状态: ${gitClean ? '✅ 干净' : '❌ 有未提交的更改'}`);
    console.log('');
  }

  validateRelease() {
    const version = this.getCurrentVersion();
    const tag = this.getGitTag();
    const changelogExists = this.checkChangelogExists();
    const gitClean = this.checkGitStatus();

    let issues = [];

    if (!this.isValidVersion(version)) {
      issues.push(`版本号格式无效: ${version}`);
    }

    if (!changelogExists) {
      issues.push('CHANGELOG.md 文件不存在');
    }

    if (!gitClean) {
      issues.push('Git 工作区有未提交的更改');
    }

    // 检查 tag 是否已存在
    try {
      execSync(`git rev-parse ${tag}`, { stdio: 'pipe' });
      issues.push(`Git tag ${tag} 已存在`);
    } catch (error) {
      // tag 不存在，这是正常的
    }

    if (issues.length > 0) {
      console.error('❌ 发布前检查失败:');
      issues.forEach(issue => console.error(`   - ${issue}`));
      return false;
    }

    console.log('✅ 发布前检查通过');
    return true;
  }
}

// 命令行接口
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const versionManager = new VersionManager();

  switch (command) {
    case 'info':
      versionManager.showVersionInfo();
      break;

    case 'update':
      if (!args[1]) {
        console.error('❌ 请提供新版本号');
        process.exit(1);
      }
      versionManager.updateVersion(args[1]);
      break;

    case 'changelog':
      if (versionManager.checkChangelogExists()) {
        versionManager.generateChangelog();
      } else {
        versionManager.generateFirstChangelog();
      }
      break;

    case 'tag':
      versionManager.createGitTag();
      break;

    case 'push-tag':
      versionManager.pushGitTag();
      break;

    case 'validate':
      const isValid = versionManager.validateRelease();
      process.exit(isValid ? 0 : 1);
      break;

    case 'prepare-release':
      if (!args[1]) {
        console.error('❌ 请提供版本号');
        process.exit(1);
      }
      
      console.log('🚀 准备发布...');
      
      // 更新版本号
      versionManager.updateVersion(args[1]);
      
      // 生成 changelog
      if (versionManager.checkChangelogExists()) {
        versionManager.generateChangelog();
      } else {
        versionManager.generateFirstChangelog();
      }
      
      // 创建 git tag
      versionManager.createGitTag();
      
      // 验证发布
      versionManager.validateRelease();
      
      console.log('✅ 发布准备完成！');
      console.log(`📤 运行 'git push origin ${versionManager.getGitTag()}' 来触发自动发布`);
      break;

    default:
      console.log(`
📦 jav-scrapy 版本管理工具

用法:
  node scripts/version.js <命令> [参数]

命令:
  info                    显示当前版本信息
  update <version>        更新版本号
  changelog              生成/更新 changelog
  tag                    创建 git tag
  push-tag               推送 git tag
  validate               验证发布准备状态
  prepare-release <ver>  准备完整发布（更新版本、生成changelog、创建tag）

示例:
  node scripts/version.js info
  node scripts/version.js update 0.9.0
  node scripts/version.js prepare-release 0.9.0
      `);
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = VersionManager;
