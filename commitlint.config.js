module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 修复
        'docs',     // 文档
        'style',    // 格式
        'refactor', // 重构
        'perf',     // 性能
        'test',     // 测试
        'build',    // 构建
        'ci',       // CI
        'chore',    // 其他
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'core',      // 核心功能
        'utils',     // 工具函数
        'parser',    // 解析器
        'handler',   // 处理器
        'config',    // 配置
        'cli',       // 命令行
        'deps',      // 依赖
        'release',   // 发布
      ],
    ],
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
  },
};