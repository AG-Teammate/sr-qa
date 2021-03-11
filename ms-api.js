const MsSdk = require('microsoft-cognitiveservices-speech-sdk');
const fs = require('fs');

MsSdk.Recognizer.enableTelemetry(false);

const stt = async (filename, text) => {
  const audioConfig = MsSdk.AudioConfig.fromAudioFileOutput(filename);
  const speechConfig = MsSdk.SpeechConfig.fromSubscription(
    process.env.MS_API_KEY,
    process.env.MS_REGION
  );
  speechConfig.speechSynthesisLanguage = process.env.MS_LANGUAGE;
  speechConfig.speechSynthesisVoiceName = process.env.MS_VOICE;
  speechConfig.speechSynthesisOutputFormat =
    MsSdk.SpeechSynthesisOutputFormat.Riff16Khz16BitMonoPcm;
  let synthesizer = new MsSdk.SpeechSynthesizer(speechConfig, audioConfig);
  await new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(
      text,
      () => {
        synthesizer.close();
        synthesizer = undefined;
        resolve();
      },
      reject
    );
  });
};

const openPushStream = (filename) => {
  // create the push stream we need for the speech sdk.
  const pushStream = MsSdk.AudioInputStream.createPushStream();

  // open the file and push it to the push stream.
  fs.createReadStream(filename)
    .on('data', function (arrayBuffer) {
      pushStream.write(arrayBuffer.slice());
    })
    .on('end', function () {
      pushStream.close();
    });

  return pushStream;
};

const tts = async (filename, text) => {
  const audioConfig = MsSdk.AudioConfig.fromStreamInput(
    openPushStream(filename)
  );
  const speechConfig = MsSdk.SpeechConfig.fromSubscription(
    process.env.MS_API_KEY,
    process.env.MS_REGION
  );
  speechConfig.speechRecognitionLanguage = process.env.MS_LANGUAGE;
  let recognizer = new MsSdk.SpeechRecognizer(speechConfig, audioConfig);
  if (process.env.MS_PHRASE_LIST_ENABLED === '1') {
    const grammar = MsSdk.PhraseListGrammar.fromRecognizer(recognizer);
    grammar.clear();
    grammar.addPhrase(text);
  }
  return await new Promise((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (result) => {
        recognizer.close();
        recognizer = undefined;
        resolve(result);
      },
      (err) => {
        recognizer.close();
        recognizer = undefined;
        reject(err);
      }
    );
  });
};

module.exports = { stt, tts };
