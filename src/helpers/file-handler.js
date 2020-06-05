import { logger } from './constants';

const fs = require('fs');
const util = require('util');

const copyFileAsync = util.promisify(fs.copyFile);

class FileHandler {
  static listFiles(path) {
    console.log({ 'list files': fs.readdirSync(path) });
    return fs.readdirSync(path);
    // return readdir(path);
  }

  static async copyFile(originalPath, newPath) {
    try {
      await copyFileAsync(originalPath, newPath);
      // await fs.copyFile(originalPath, newPath)
      logger.debug(`${originalPath} copied to ${newPath}`);
      return true;
    } catch (err) {
      logger.error(err);
      return false;
    }
  }
}

module.exports = FileHandler;
