const normalizeText = require('normalize-text').normalizeText;
const normalizeForSearch = require('normalize-for-search');

const removePunctuation = (str) =>
  str.replace(/[&\/\\#,+$~%\.!^'"\;:*?\[\]<>{}-]/g, '');
const isRegExp = (text) => {
  // check for groups (a|b|c)
  return /\((?:[^\|\)]+\|)+(?:[^\|\)]+)\)/.test(text);
};
const normalize = (text) => {
  return removePunctuation(normalizeForSearch(normalizeText(text)));
};

const evaluate = (result, expected) => {
  const norm = normalize(result);

  const answers = expected.map((ex) => normalize(ex));
  let correctIndex = -1;
  let isCorrectByRegex = false;
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (isRegExp(a)) {
      if (new RegExp(a, 'i').test(norm)) {
        //correct
        isCorrectByRegex = true;
        correctIndex = i;
        break;
      }
    } else {
      if (a === norm) {
        correctIndex = i;
        break;
      }
    }
  }
  //evaluate words on the first option
  let correctWordCount = 0;
  let incorrectWordCount = 0;
  const words = answers[0].split(' ');
  const norm_words = norm.split(' ');
  words.forEach((w) => {
    if (norm_words.includes(w)) {
      correctWordCount++;
    } else {
      incorrectWordCount++;
    }
  });

  let resultsObj = {};
  resultsObj.correct_N = correctIndex > -1 ? 1 : 0;
  resultsObj.correct_REGEX_N = isCorrectByRegex ? 1 : 0;
  resultsObj.correctIndex = correctIndex;
  resultsObj.first_answer_words = words.length;
  resultsObj.first_answer_words_correct = correctWordCount;
  resultsObj.first_answer_words_incorrect = incorrectWordCount;
  resultsObj.first_answer_words_correct_percent_N =
    correctWordCount / words.length;
  resultsObj.first_answer_words_incorrect_percent_N =
    incorrectWordCount / words.length;
  return resultsObj;
};

module.exports = { evaluate };
