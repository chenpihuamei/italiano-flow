export const CHALLENGE_TYPES = ["context", "grammar", "lookalike", "phrase", "sense"];

function unique(values) {
  return [...new Set(values)];
}

export function validateTrainingDeck(deck) {
  const errors = [];
  const words = Array.isArray(deck?.words) ? deck.words : [];
  const ids = new Set();
  let exampleCount = 0;
  const types = new Set();

  if (words.length !== 50) errors.push(`Expected exactly 50 words, found ${words.length}`);

  for (const [index, word] of words.entries()) {
    const label = word?.id || `word-${index + 1}`;
    if (!word?.id || ids.has(word.id)) errors.push(`${label}: missing or duplicate id`);
    ids.add(word?.id);
    for (const field of ["lemma", "level", "pos", "definitionIt", "definitionZh", "levelSource", "levelConfidence"]) {
      if (!word?.[field]) errors.push(`${label}: missing ${field}`);
    }
    if (!Array.isArray(word?.lookalikes) || word.lookalikes.length < 3) errors.push(`${label}: needs 3 lookalikes`);
    if (!Array.isArray(word?.family) || word.family.length < 2) errors.push(`${label}: needs a word family`);
    if (!Array.isArray(word?.meaningDistractors) || unique(word.meaningDistractors).length !== 3) errors.push(`${label}: needs 3 unique meaning distractors`);
    if (!Array.isArray(word?.examples) || word.examples.length < 3) errors.push(`${label}: needs at least 3 examples`);
    exampleCount += word?.examples?.length || 0;
    for (const example of word?.examples || []) {
      if (!example.form || !example.text || !example.translation || !example.note) errors.push(`${label}: incomplete example`);
    }
    const challenge = word?.challenge;
    if (!challenge || !CHALLENGE_TYPES.includes(challenge.type)) {
      errors.push(`${label}: invalid challenge type`);
      continue;
    }
    types.add(challenge.type);
    if (!challenge.prompt || !challenge.answer || !challenge.explanation) errors.push(`${label}: incomplete challenge`);
    if (!Array.isArray(challenge.options) || unique(challenge.options).length !== 4 || !challenge.options.includes(challenge.answer)) {
      errors.push(`${label}: challenge needs 4 unique options including the answer`);
    }
  }

  return {
    wordCount: words.length,
    exampleCount,
    challengeTypes: [...types].sort(),
    errors,
  };
}

function hashSeed(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableShuffle(values, seedText) {
  const result = [...values];
  let seed = hashSeed(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const target = seed % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function meaningQuestion(word) {
  return {
    id: `${word.id}-meaning`,
    wordId: word.id,
    lemma: word.lemma,
    level: word.level,
    pos: word.pos,
    type: "meaning",
    prompt: `Quale significato descrive meglio «${word.lemma}»?`,
    options: stableShuffle([word.definitionZh, ...word.meaningDistractors], `${word.id}-meaning`),
    answer: word.definitionZh,
    explanation: `${word.definitionIt} · ${word.definitionZh}`,
    family: word.family,
    lookalikes: word.lookalikes,
    examples: word.examples,
    levelSource: word.levelSource,
    levelConfidence: word.levelConfidence,
  };
}

function challengeQuestion(word) {
  const challenge = word.challenge;
  return {
    id: `${word.id}-${challenge.type}`,
    wordId: word.id,
    lemma: word.lemma,
    level: word.level,
    pos: word.pos,
    type: challenge.type,
    prompt: challenge.prompt,
    options: stableShuffle(challenge.options, `${word.id}-${challenge.type}`),
    answer: challenge.answer,
    explanation: challenge.explanation,
    family: word.family,
    lookalikes: word.lookalikes,
    examples: word.examples,
    levelSource: word.levelSource,
    levelConfidence: word.levelConfidence,
  };
}

export function buildTrainingSession(deck, mode = "mixed") {
  const validation = validateTrainingDeck(deck);
  if (validation.errors.length) throw new Error(validation.errors.join("\n"));
  const words = deck.words;
  if (mode === "meaning") return words.map(meaningQuestion);
  if (CHALLENGE_TYPES.includes(mode)) {
    return words.filter((word) => word.challenge.type === mode).map(challengeQuestion);
  }
  if (mode !== "mixed") throw new Error(`Unknown training mode: ${mode}`);
  return words.map((word, index) => index % 2 === 0 ? meaningQuestion(word) : challengeQuestion(word));
}

export function recordTrainingAnswer(current, wordId, isCorrect, reviewedAt = new Date().toISOString()) {
  const previous = current?.[wordId] || { attempts: 0, correct: 0, streak: 0 };
  const streak = isCorrect ? previous.streak + 1 : 0;
  return {
    ...(current || {}),
    [wordId]: {
      attempts: previous.attempts + 1,
      correct: previous.correct + (isCorrect ? 1 : 0),
      streak,
      lastReviewed: reviewedAt,
      status: streak >= 3 ? "reviewing" : "learning",
    },
  };
}
