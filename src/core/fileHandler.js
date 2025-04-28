const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

class FileHandler {
  constructor({ outputDir }) {
    this.outputDir = outputDir;
    mkdirp.sync(this.outputDir);
  }

  ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      mkdirp.sync(dir);
    }
  }

  async writeJSON(filePath, data) {
    this.ensureDir(filePath);
    return fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async fileExists(filePath) {
    return fs.promises.access(filePath, fs.constants.F_OK)
      .then(() => true)
      .catch(() => false);
  }

  createWriteStream(filePath) {
    this.ensureDir(filePath);
    return fs.createWriteStream(filePath);
  }
}

module.exports = FileHandler;