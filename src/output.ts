import chalk from 'chalk';

type MultibarLike = {
  log: (msg: string) => void;
};

let multibar: MultibarLike | null = null;
export const Output = {
  setMultibar(mb: MultibarLike | null): void {
    multibar = mb;
  },

  write(message: string): void {
    if (multibar) {
      multibar.log(message + '\n');
    } else {
      process.stdout.write(message + '\n');
    }
  },

  banner(config: { parallel: number; delay: number; proxy?: string; nomag?: boolean; base: string | null; limit: number; BASE_URL: string }, version: string): void {
    this.write(chalk.cyan('╔══════════════════════════════════════════╗'));
    this.write(chalk.cyan('║         Jav Scrapy - 开始抓取             ║'));
    this.write(chalk.cyan('╚══════════════════════════════════════════╝'));
    this.write(chalk.gray(`版本: ${version}`));
    if (config.limit > 0) {
      this.write(`目标: ${chalk.white(config.limit)} 部影片`);
    }
    this.write(`并发: ${chalk.white(config.parallel)} | 延迟: ${chalk.white(config.delay || 8)}s` +
      (config.proxy ? ` | 代理: ${chalk.green('✓')}` : ` | 代理: ${chalk.red('✗')}`) +
      (config.nomag ? ` | 无磁链: ${chalk.yellow('跳过')}` : ''));
    this.write(`起始页: ${chalk.underline(config.base || config.BASE_URL)}`);
  },

  pageProgress(pageIndex: number, linkCount: number): void {
    const icon = linkCount > 0 ? chalk.green('✓') : chalk.yellow('✓');
    this.write(`  ${icon} 第${pageIndex}页: ${linkCount} 部影片`);
  },

  filmQueued(added: number, total: number, limit: number): void {
    this.write(`已添加 ${added} 个影片到处理队列 (${total}/${limit})`);
  },

  filmResult(title: string, hasMagnet: boolean): void {
    const tag = hasMagnet ? ' [磁链]' : ' [无磁链]';
    this.write(`  ${chalk.green('✓')} ${title}${tag}`);
  },

  delay(seconds: number): void {
    this.write(chalk.gray(`  ⏳ ${seconds}秒后下一页...`));
  },

  pageError(pageIndex: number, message: string): void {
    this.write(chalk.red(`  ✗ 第${pageIndex}页出错: ${message}`));
  },

  networkRetry(seconds: number): void {
    this.write(chalk.yellow(`  网络错误，${seconds}秒后重试...`));
  },

  genericRetry(seconds: number): void {
    this.write(chalk.yellow(`  等待 ${seconds} 秒后重试...`));
  },

  waitingForDrain(): void {
    this.write(chalk.yellow('正在等待队列中的任务完成...'));
  },

  summary(stats: {
    totalTime: number;
    pages: number;
    filmsFound: number;
    filmsCompleted: number;
    filmsFailed: number;
    output: string;
  }): void {
    this.write('');
    this.write(chalk.cyan('══════════════════ 抓取完成 ══════════════════'));
    this.write(`  总耗时: ${chalk.white(stats.totalTime)} 秒`);
    this.write(`  扫描页数: ${chalk.white(stats.pages)}`);
    this.write(`  发现影片: ${chalk.white(stats.filmsFound)}`);
    this.write(`  处理完成: ${chalk.green(stats.filmsCompleted)}`);
    if (stats.filmsFailed > 0) {
      this.write(`  失败: ${chalk.red(stats.filmsFailed)}`);
    }
    this.write(`  保存位置: ${chalk.underline(stats.output)}`);
    this.write(chalk.cyan('═════════════════════════════════════════════'));
    this.write('');
  },

  error(message: string): void {
    process.stderr.write(`${chalk.red('✗')} ${message}\n`);
  }
};
