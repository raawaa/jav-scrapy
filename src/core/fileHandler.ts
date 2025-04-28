import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import { FilmData } from '../types/interfaces'; // 导入 FilmData 类型


class FileHandler {
  private outputDir: string; // 定义 outputDir 属性

  constructor(outputDir: string) {
    if (!outputDir) {
      throw new Error('Output directory is required');
    }
    this.outputDir = outputDir;
  }



  private ensureDir(filePath: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      mkdirp.sync(dir);
    }
  }

  async writeJSON(filePath: string, data: FilmData) {
    this.ensureDir(filePath);
    return fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async fileExists(filePath: string) {
    return fs.promises.access(filePath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
  }

  createWriteStream(filePath: string) {
    this.ensureDir(filePath);
    return fs.createWriteStream(filePath);
  }
}

export default FileHandler;