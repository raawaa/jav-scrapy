"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Output = void 0;
const chalk_1 = __importDefault(require("chalk"));
let multibar = null;
exports.Output = {
    setMultibar(mb) {
        multibar = mb;
    },
    write(message) {
        if (multibar) {
            multibar.log(message + '\n');
        }
        else {
            process.stdout.write(message + '\n');
        }
    },
    banner(config, version) {
        this.write(chalk_1.default.cyan('╔══════════════════════════════════════════╗'));
        this.write(chalk_1.default.cyan('║         Jav Scrapy - 开始抓取             ║'));
        this.write(chalk_1.default.cyan('╚══════════════════════════════════════════╝'));
        this.write(chalk_1.default.gray(`版本: ${version}`));
        if (config.limit > 0) {
            this.write(`目标: ${chalk_1.default.white(config.limit)} 部影片`);
        }
        this.write(`并发: ${chalk_1.default.white(config.parallel)} | 延迟: ${chalk_1.default.white(config.delay || 8)}s` +
            (config.proxy ? ` | 代理: ${chalk_1.default.green('✓')}` : ` | 代理: ${chalk_1.default.red('✗')}`) +
            (config.nomag ? ` | 无磁链: ${chalk_1.default.yellow('跳过')}` : ''));
        this.write(`起始页: ${chalk_1.default.underline(config.base || config.BASE_URL)}`);
    },
    pageProgress(pageIndex, linkCount) {
        const icon = linkCount > 0 ? chalk_1.default.green('✓') : chalk_1.default.yellow('✓');
        this.write(`  ${icon} 第${pageIndex}页: ${linkCount} 部影片`);
    },
    filmQueued(added, total, limit) {
        this.write(`已添加 ${added} 个影片到处理队列 (${total}/${limit})`);
    },
    filmResult(title, hasMagnet) {
        const tag = hasMagnet ? ' [磁链]' : ' [无磁链]';
        this.write(`  ${chalk_1.default.green('✓')} ${title}${tag}`);
    },
    delay(seconds) {
        this.write(chalk_1.default.gray(`  ⏳ ${seconds}秒后下一页...`));
    },
    pageError(pageIndex, message) {
        this.write(chalk_1.default.red(`  ✗ 第${pageIndex}页出错: ${message}`));
    },
    networkRetry(seconds) {
        this.write(chalk_1.default.yellow(`  网络错误，${seconds}秒后重试...`));
    },
    genericRetry(seconds) {
        this.write(chalk_1.default.yellow(`  等待 ${seconds} 秒后重试...`));
    },
    waitingForDrain() {
        this.write(chalk_1.default.yellow('正在等待队列中的任务完成...'));
    },
    summary(stats) {
        this.write('');
        this.write(chalk_1.default.cyan('══════════════════ 抓取完成 ══════════════════'));
        this.write(`  总耗时: ${chalk_1.default.white(stats.totalTime)} 秒`);
        this.write(`  扫描页数: ${chalk_1.default.white(stats.pages)}`);
        this.write(`  发现影片: ${chalk_1.default.white(stats.filmsFound)}`);
        this.write(`  处理完成: ${chalk_1.default.green(stats.filmsCompleted)}`);
        if (stats.filmsFailed > 0) {
            this.write(`  失败: ${chalk_1.default.red(stats.filmsFailed)}`);
        }
        this.write(`  保存位置: ${chalk_1.default.underline(stats.output)}`);
        this.write(chalk_1.default.cyan('═════════════════════════════════════════════'));
        this.write('');
    },
    error(message) {
        process.stderr.write(`${chalk_1.default.red('✗')} ${message}\n`);
    }
};
//# sourceMappingURL=output.js.map