const path = require('path');
const slugify = require('slugify');
const { getFilename } = require('./util');
const { fileExists } = require('./util');
const { readCsv } = require('./util');
const ffmpeg = require('ffmpeg-cli');
const fs = require('fs');
const cliProgress = require('cli-progress');
const { writeCsv } = require('./util');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { S3Client } = require('@aws-sdk/client-s3');

const getRenamedFilename = (r) => {
  let acc = '';
  for (let i = 1; i < 100; i++) {
    if (!process.env[`CSV_NAME_COL${i}`]) break;
    let val = r[process.env[`CSV_NAME_COL${i}`]];
    if (val.startsWith('en:')) val = val.substr(3);
    acc += `${val}_`;
  }
  if (acc.endsWith('_')) acc = acc.substr(0, acc.length - 1);
  return slugify(acc + '.mp3', '_');
};

const s3client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: { secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, accessKeyId: process.env.AWS_ACCESS_KEY_ID },
});

(async function main() {
  console.log(`Reading CSV...`);
  const results = await readCsv('input.csv');
  console.log(`Read ${results.length} row(s)`);
  const progress = new cliProgress.SingleBar();
  progress.start(results.length, 0);
  for (let r of results) {
    const filename = getFilename(r);
    const fullWavFilename = path.join(__dirname, '/stt-audios/', filename);
    if (await fileExists(fullWavFilename)) {
      const newName = getRenamedFilename(r);
      const fullMp3Filename = path.join(__dirname, '/stt-mp3/', newName);
      //TODO process.env.MP3_BITRATE
      if (!await fileExists(fullMp3Filename)) {
        await ffmpeg.run(`-y -i ${fullWavFilename} -vn ${fullMp3Filename}`);
      }
      const s3cmd = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET,
        Key: `${process.env.AWS_PREFIX}/${newName}`,
        Body: await fs.promises.readFile(fullMp3Filename),
        ACL: 'public-read',
      });
      await s3client.send(s3cmd);
      r.S3_URL = `${process.env.AWS_CDN_HOTSNAME}${process.env.AWS_PREFIX}/${newName}`;
    } else {
      console.error(`File does not exist, skipping: ${filename}`);
    }
    progress.increment();
  }
  progress.stop();
  await writeCsv('output-mp3.csv', results);
  console.log(`output-mp3.csv written`);
})();
