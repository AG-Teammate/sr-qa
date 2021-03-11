const md5lib = require('md5');
const csvParser = require('csv-parser');
const fs = require('fs');
const writeToPath = require('@fast-csv/format').writeToPath;

require('dotenv').config();

const md5 = (str) => md5lib(str);

const readCsv = async (filename) => {
  return new Promise((resolve, reject) => {
    try {
      const results = [];
      fs.createReadStream(filename)
        .pipe(
          csvParser({
            separator: process.env.CSV_SEPARATOR || ',',
          })
        )
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', async () => {
          resolve(results);
        });
    } catch (e) {
      reject(e);
    }
  });
};

const writeCsv = async (filename, array) => {
  return new Promise((resolve, reject) => {
    writeToPath(filename, array, {
      headers: true,
      delimiter: process.env.CSV_SEPARATOR,
    })
      .on('error', reject)
      .on('finish', resolve);
  });
};

const fileExists = async (path) =>
  !!(await fs.promises.stat(path).catch(() => false));

module.exports = {
  md5,
  readCsv,
  fileExists,
  writeCsv,
};
