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

  constructor(outputDir: string) {
    // 校验输入是否为非空字符串
    if (typeof outputDir !== 'string' || outputDir.trim() === '') {
      throw new Error(`Invalid output directory provided: "${outputDir}". Output directory must be a non-empty string.`);
    }
    this.outputDir = outputDir;
    this.ensureOutputDirExists();
    this.filename = 'filmData.json'; // 定义默认文件名
  }

  private async ensureOutputDirExists() {
    try {
      await fs.promises.access(this.outputDir, fs.constants.F_OK);
    } catch {
      await fs.promises.mkdir(this.outputDir, { recursive: true });
    }
  }

  // 将 FilmData 对象转换为 JSON 字符串写入文件，如果文件不存在则创建文件，如果文件存在则追加内容
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
      
      // 添加新数据
      existingData.push(data);
      
      // 将完整数据转换为格式化的JSON字符串
      const jsonData = JSON.stringify(existingData, null, 2);
      
      // 写入文件
      fs.writeFileSync(filePath, jsonData);
      
      logger.info(`Film data successfully written to ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write film data: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}

export default FileHandler;