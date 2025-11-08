"use strict";
/**
 * @file fileHandler.ts
 * @description 文件处理模块，用于处理文件的读取、写入和操作。
 * @module fileHandler
 * @requires fs - 用于文件系统操作的库。
 * @requires path - 用于处理文件路径的库。
 * @requires types/interfaces - 包含 FilmData 接口的路径。
 * @requires logger - 日志记录器模块。
 * @exports FileHandler - 文件处理类的导出。
 * @author raawaa
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./logger"));
class FileHandler {
    /**
     * 创建 FileHandler 实例
     * @param {string} outputDir - 输出目录路径
     * @throws {Error} 如果 outputDir 不是非空字符串
     */
    constructor(outputDir) {
        // 校验输入是否为非空字符串
        if (typeof outputDir !== 'string' || outputDir.trim() === '') {
            throw new Error(`Invalid output directory provided: "${outputDir}". Output directory must be a non-empty string.`);
        }
        this.outputDir = outputDir;
        this.ensureOutputDirExists();
        this.filename = 'filmData.json'; // 定义默认文件名
    }
    /**
     * 确保输出目录存在，如果不存在则创建
     * @private
     * @returns {Promise<void>}
     */
    async ensureOutputDirExists() {
        try {
            await fs_1.default.promises.access(this.outputDir, fs_1.default.constants.F_OK);
        }
        catch {
            await fs_1.default.promises.mkdir(this.outputDir, { recursive: true });
        }
    }
    /**
     * 将 FilmData 对象写入 JSON 文件
     * @param {FilmData} data - 要写入的电影数据对象
     * @returns {Promise<void>}
     * @throws {Error} 如果 data 不是 FilmData 类型
     */
    async writeFilmDataToFile(data) {
        // 校验 data 是否为 FilmData 类型
        if (typeof data !== 'object' || data === null) {
            throw new Error(`Invalid data provided: "${data}". Data must be a non-null object of type FilmData.`);
        }
        logger_1.default.debug(`FileHandler: 开始写入影片数据，标题: ${data.title}`);
        logger_1.default.debug(`FileHandler: 输出目录: ${this.outputDir}`);
        try {
            // 定义文件路径
            const filePath = path_1.default.join(this.outputDir, 'filmData.json');
            logger_1.default.debug(`FileHandler: 文件路径: ${filePath}`);
            // 读取现有文件内容（如果存在）
            let existingData = [];
            if (fs_1.default.existsSync(filePath)) {
                logger_1.default.debug(`FileHandler: 文件已存在，读取现有内容`);
                const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
                try {
                    existingData = JSON.parse(fileContent);
                    if (!Array.isArray(existingData)) {
                        existingData = [existingData];
                    }
                    logger_1.default.debug(`FileHandler: 读取到 ${existingData.length} 条现有数据`);
                }
                catch {
                    existingData = [];
                    logger_1.default.warn(`Invalid JSON format in ${filePath}, using empty array as default`);
                }
            }
            else {
                logger_1.default.debug(`FileHandler: 文件不存在，将创建新文件`);
            }
            // 智能重复检测逻辑
            let duplicateIndex = -1;
            let duplicateReason = '';
            // 1. 检查标题完全匹配
            duplicateIndex = existingData.findIndex(item => item.title === data.title);
            if (duplicateIndex !== -1) {
                duplicateReason = '标题完全匹配';
            }
            // 2. 如果标题不匹配，尝试提取影片ID进行比较（如START-411、WAAA-540等）
            if (duplicateIndex === -1) {
                const extractFilmId = (title) => {
                    // 匹配更精确的影片ID格式（字母+数字的组合，支持更复杂的格式）
                    const match = title.match(/^([A-Z]+-?\d+[A-Z]*)/i);
                    return match ? match[1].toUpperCase() : null;
                };
                const newDataId = extractFilmId(data.title);
                if (newDataId) {
                    duplicateIndex = existingData.findIndex(item => {
                        const existingId = extractFilmId(item.title);
                        return existingId && existingId === newDataId;
                    });
                    if (duplicateIndex !== -1) {
                        duplicateReason = `影片ID匹配: ${newDataId}`;
                    }
                }
            }
            // 3. 如果还找不到重复，检查磁力链接是否相同
            if (duplicateIndex === -1 && data.magnetLinks && data.magnetLinks.length > 0) {
                const newMagnetLinks = data.magnetLinks.map(ml => ml.link).sort().join('|');
                duplicateIndex = existingData.findIndex(item => {
                    if (item.magnetLinks && item.magnetLinks.length > 0) {
                        const existingMagnetLinks = item.magnetLinks.map(ml => ml.link).sort().join('|');
                        return existingMagnetLinks === newMagnetLinks;
                    }
                    return false;
                });
                if (duplicateIndex !== -1) {
                    duplicateReason = '磁力链接匹配';
                }
            }
            // 4. 模糊匹配：检查标题相似度（去除特殊字符和空格后比较）
            if (duplicateIndex === -1) {
                const normalizeTitle = (title) => {
                    return title
                        .toLowerCase()
                        .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 保留字母、数字、空格和中文字符
                        .replace(/\s+/g, ' ')
                        .trim();
                };
                const normalizedNewTitle = normalizeTitle(data.title);
                if (normalizedNewTitle.length > 10) { // 只对较长的标题进行模糊匹配
                    duplicateIndex = existingData.findIndex(item => {
                        const normalizedExistingTitle = normalizeTitle(item.title);
                        if (normalizedExistingTitle.length < 10)
                            return false;
                        // 计算相似度（简单的字符匹配）
                        const similarity = normalizedNewTitle === normalizedExistingTitle ||
                            normalizedNewTitle.includes(normalizedExistingTitle) ||
                            normalizedExistingTitle.includes(normalizedNewTitle);
                        return similarity;
                    });
                    if (duplicateIndex !== -1) {
                        duplicateReason = '标题相似匹配';
                    }
                }
            }
            const isDuplicate = duplicateIndex !== -1;
            logger_1.default.debug(`FileHandler: 检查重复数据，是否重复: ${isDuplicate}${isDuplicate ? ` (${duplicateReason})` : ''}`);
            if (!isDuplicate) {
                // 添加新数据
                existingData.push(data);
                logger_1.default.debug(`FileHandler: 添加新数据到数组，当前总数: ${existingData.length}`);
                // 将完整数据转换为格式化的 JSON 字符串
                const jsonData = JSON.stringify(existingData, null, 2);
                logger_1.default.debug(`FileHandler: JSON数据长度: ${jsonData.length} 字符`);
                // 写入文件
                fs_1.default.writeFileSync(filePath, jsonData);
                logger_1.default.info(`FileHandler: 影片数据成功写入文件: ${filePath}`);
                logger_1.default.info(`FileHandler: 影片标题: ${data.title}`);
                const magnetPreview = data.magnetLinks && data.magnetLinks.length > 0
                    ? data.magnetLinks.map(ml => ml.link).slice(0, 2).join('\n').substring(0, 100) + '...'
                    : '无';
                logger_1.default.info(`FileHandler: 磁力链接: ${magnetPreview}`);
            }
            else {
                // 如果是重复数据，智能检查是否需要更新
                const existingItem = existingData[duplicateIndex];
                let shouldUpdate = false;
                let updateReason = '';
                // 检查磁力链接质量（优先级最高）
                const newMagnetLinks = data.magnetLinks && data.magnetLinks.length > 0
                    ? data.magnetLinks.map(ml => ml.link).sort().join('|')
                    : '';
                const existingMagnetLinks = existingItem.magnetLinks && existingItem.magnetLinks.length > 0
                    ? existingItem.magnetLinks.map(ml => ml.link).sort().join('|')
                    : '';
                if (newMagnetLinks && newMagnetLinks !== existingMagnetLinks) {
                    shouldUpdate = true;
                    updateReason = '磁力链接更新';
                }
                // 检查演员信息完整性
                else if (data.actress && data.actress.length > 0 &&
                    (!existingItem.actress || existingItem.actress.length === 0 ||
                        data.actress.length > existingItem.actress.length ||
                        (data.actress.length === existingItem.actress.length &&
                            data.actress.join('').length > existingItem.actress.join('').length))) {
                    shouldUpdate = true;
                    updateReason = '演员信息更新';
                }
                // 检查分类信息完整性
                else if (data.category && data.category.length > 0 &&
                    (!existingItem.category || existingItem.category.length === 0 ||
                        data.category.length > existingItem.category.length ||
                        (data.category.length === existingItem.category.length &&
                            data.category.join('').length > existingItem.category.join('').length))) {
                    shouldUpdate = true;
                    updateReason = '分类信息更新';
                }
                // 检查标题质量（新标题可能更完整或更准确）
                else if (data.title.length > existingItem.title.length + 5) { // 新标题明显更长
                    shouldUpdate = true;
                    updateReason = '标题信息更新';
                }
                if (shouldUpdate) {
                    // 更新现有数据
                    existingData[duplicateIndex] = data;
                    logger_1.default.info(`FileHandler: 更新重复影片数据，标题: ${data.title}，原因: ${updateReason}`);
                    // 写入更新后的数据
                    const jsonData = JSON.stringify(existingData, null, 2);
                    fs_1.default.writeFileSync(filePath, jsonData);
                    logger_1.default.info(`FileHandler: 影片数据更新成功写入文件: ${filePath}`);
                }
                else {
                    logger_1.default.info(`FileHandler: 跳过重复影片数据，标题: ${data.title}`);
                }
            }
        }
        catch (error) {
            logger_1.default.error(`FileHandler: 写入影片数据失败: ${error instanceof Error ? error.message : String(error)}`);
            logger_1.default.error(`FileHandler: 错误详情: ${error instanceof Error ? error.stack : String(error)}`);
            throw error;
        }
    }
}
exports.default = FileHandler;
//# sourceMappingURL=fileHandler.js.map