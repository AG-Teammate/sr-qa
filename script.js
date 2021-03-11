const cliProgress = require('cli-progress');
const { readCsv } = require('./util');
const path = require('path');
const fs = require('fs');
const { writeCsv } = require('./util');
const { evaluate } = require('./evaluate');
const { tts } = require('./ms-api');
const { stt } = require('./ms-api');
const { md5 } = require('./util');
const { fileExists } = require('./util');

const getText = (r) => r[process.env.CSV_TEXT_COL];
const getFilename = (r) =>
  `${md5(getText(r))}-ms-${process.env.MS_LANGUAGE}.wav`; //TODO more STT providers?

(async function main() {
  console.log(`Reading CSV...`);
  const results = await readCsv('input.csv');
  console.log(`Read ${results.length} row(s)`);
  console.log(`Checking if we have any audios in the stt-audios folder...`);
  for (let r of results) {
    const text = getText(r);
    if (!text || text?.length < 1) {
      console.error(`ERR! No text for ${JSON.stringify(r)}`);
      r.__error = true;
    } else {
      const filename = getFilename(r);
      if (await fileExists(path.join(__dirname, '/stt-audios/', filename))) {
        r.__exists = true;
      }
    }
  }
  const resultsExist = results.filter((r) => r.__exists);
  const resultsNotExist = results.filter((r) => !r.__exists && !r.__error);
  console.log(
    `Will Text-to-Speech ${resultsNotExist?.length} audios. ${resultsExist?.length} audios already exist.`
  );
  const progress = new cliProgress.SingleBar();
  progress.start(resultsNotExist.length, 0);
  for (let r of resultsNotExist) {
    try {
      const text = r[process.env.CSV_TEXT_COL];
      const filename = path.join(__dirname, '/stt-audios/', getFilename(r));

      await stt(filename, text);

      progress.increment();
    } catch (e) {
      console.error(e);
      r.__error = true;
    }
  }
  progress.stop();
  console.log(`Text-to-speech DONE`);

  const resultsNoError = results.filter((r) => !r.__error);
  console.log(`Will process ${resultsNoError.length} audios`);

  console.log(
    `Checking if we have any API results in the tss-api-results folder...`
  );
  for (let r of resultsNoError) {
    const filename = path.join(
      __dirname,
      '/tss-api-results/',
      getFilename(r) + '.ms-stt.json'
    );
    if (await fileExists(filename)) {
      r.__api_exists = true;
    }
  }

  const resultsSttNotExists = resultsNoError.filter((r) => !r.__api_exists);
  console.log(
    `Will Speech-to-Text ${resultsSttNotExists?.length} audios. ${
      resultsNoError.filter((r) => r.__api_exists).length
    } API results already exist.`
  );
  progress.start(resultsSttNotExists.length, 0);
  for (let r of resultsSttNotExists) {
    try {
      const filename = path.join(__dirname, '/stt-audios/', getFilename(r));
      const text = getText(r);
      const result = await tts(filename, text);
      if (result && result.privText) {
        await fs.promises.writeFile(
          path.join(
            __dirname,
            '/tss-api-results/',
            getFilename(r) + '.ms-stt.json'
          ),
          JSON.stringify(result, null, 4)
        );
      } else {
        console.error(`Received no response text for ${filename}`);
        console.error(JSON.stringify(result, null, 4));
        r.__error = true;
      }
      progress.increment();
    } catch (e) {
      console.error(e);
      r.__error = true;
    }
  }
  progress.stop();
  console.log(`Speech-to-Text DONE`);

  console.log(
    `Will evaluate ${results.filter((r) => !r.__error).length}/${
      results.length
    } result(s). ${results.filter((r) => r.__error).length} error(s)`
  );
  progress.start(results.length, 0);
  for (let r of results) {
    try {
      const text = getText(r);
      const apiResFilename = path.join(
        __dirname,
        '/tss-api-results/',
        getFilename(r) + '.ms-stt.json'
      );
      const apiRes = JSON.parse(await fs.promises.readFile(apiResFilename));
      const result = apiRes.privText;
      const evaluation = evaluate(result, [text]);
      for (let k of Object.keys(evaluation)) {
        r[k] = evaluation[k];
      }
    } catch (e) {
      console.log(e);
    }
    if (r.correct_N === 1) {
      r.RESULT = 'PASS';
    } else {
      r.RESULT = 'FAIL';
    }
    progress.increment();
  }
  progress.stop();
  console.log(
    `PASS: ${results.filter((r) => r.RESULT === 'PASS').length}/${
      results.length
    }`
  );
  await writeCsv('output.csv', results);
  console.log(`CSV written`);
})();
