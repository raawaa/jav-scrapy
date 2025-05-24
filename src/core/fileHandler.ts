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

import fs from 'fs';
import path from 'path';
import { FilmData } from '../types/interfaces'; // 导入 FilmData 类型
import logger from './logger';


class FileHandler {
  private outputDir: string; // 定义 outputDir 属性
  private filename: string; // 定义 filename 属性

  /**
   * 创建 FileHandler 实例
   * @param {string} outputDir - 输出目录路径
   * @throws {Error} 如果 outputDir 不是非空字符串
   */
  constructor(outputDir: string) {
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
  private async ensureOutputDirExists() {
    try {
      await fs.promises.access(this.outputDir, fs.constants.F_OK);
    } catch {
      await fs.promises.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * 将 FilmData 对象写入 JSON 文件
   * @param {FilmData} data - 要写入的电影数据对象
   * @returns {Promise<void>}
   * @throws {Error} 如果 data 不是 FilmData 类型
   */
  public async writeFilmDataToFile(data: FilmData) {
    // 校验 data 是否为 FilmData 类型
    if (typeof data !== 'object' || data === null) {
      throw new Error(`Invalid data provided: "${data}". Data must be a non-null object of type FilmData.`);
    }

    try {
      // 定义文件路径
      const filePath = path.join(this.outputDir, 'filmData.json');

      // 读取现有文件内容（如果存在）
      let existingData: FilmData[] = [];
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        try {
          existingData = JSON.parse(fileContent);
          if (!Array.isArray(existingData)) {
            existingData = [existingData];
          }
        } catch {
          existingData = [];
          logger.warn(`Invalid JSON format in ${filePath}, using empty array as default`);
        }
      }

      // 检查是否已存在相同 title 的数据
      const isDuplicate = existingData.some(item => item.title === data.title);

      if (!isDuplicate) {
        // 添加新数据
        existingData.push(data);

        // 将完整数据转换为格式化的 JSON 字符串
        const jsonData = JSON.stringify(existingData, null, 2);

        // 写入文件
        fs.writeFileSync(filePath, jsonData);

        // logger.info(`Film data successfully written to ${filePath}`);
      } else {
        // logger.info(`Skipped duplicate film data with title: ${data.title}`);
      }

      // 写入文件
    } catch (error) {
      logger.error(`Failed to write film data: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

export default FileHandler;