import {createHash} from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const normalize = value => String(value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim();

export function passage(question) {
  return (question.segments ?? []).filter(segment =>
    !/^Question \d+\.$/.test(segment.text) &&
    segment.text !== question.question &&
    !/^(Regardez|Observez|Écoutez|Choisissez) /i.test(segment.text)
  ).map(segment => segment.text).join(' ');
}

export function fivegrams(text) {
  const tokens = normalize(text).split(' ').filter(Boolean), grams = new Set();
  for (let i = 0; i + 5 <= tokens.length; i++) grams.add(tokens.slice(i, i + 5).join(' '));
  return grams;
}

// Compare all positions, including duplicates within one paper. An inverted
// index avoids quadratic rescanning of long transcripts. Return evidence,
// never a claim that lexical distance establishes semantic originality.
export function overlaps(items, threshold = 0.62) {
  const index = new Map(), prior = [], matches = [];
  for (const item of items) {
    const grams = fivegrams(item.text), hits = new Map();
    for (const gram of grams) for (const other of index.get(gram) ?? [])
      hits.set(other, (hits.get(other) ?? 0) + 1);
    for (const [other, count] of hits) {
      const denominator = Math.min(grams.size, prior[other].grams.size);
      if (denominator && count / denominator >= threshold)
        matches.push({left: prior[other].id, right: item.id, score: count / denominator});
    }
    const number = prior.length;
    prior.push({...item, grams});
    for (const gram of grams) {
      if (!index.has(gram)) index.set(gram, []);
      index.get(gram).push(number);
    }
  }
  return matches;
}

export function choiceStats(question) {
  const key = 'ABCD'.indexOf(question.correct), options = question.options ?? [];
  if (options.length !== 4 || key < 0 || new Set(options.map(normalize)).size !== 4)
    return {valid: false};
  const lengths = options.map(option => [...option.trim()].length);
  const wordLengths = options.map(option => normalize(option).split(' ').filter(Boolean).length);
  const max = Math.max(...lengths), ties = lengths.filter(length => length === max).length;
  const min = Math.min(...lengths), shortTies=lengths.filter(length => length === min).length;
  return {valid: true, lengths, wordLengths, ratio: max / Math.max(1, Math.min(...lengths)),
    correctLongest: lengths[key] === max, uniqueCorrectLongest: lengths[key] === max && ties === 1,
    longestCredit: lengths[key] === max ? 1 / ties : 0,
    correctShortest: lengths[key] === min,
    shortestCredit: lengths[key] === min ? 1 / shortTies : 0,
    extremeWords: options.flatMap((text, index) => /\b(toujours|jamais|uniquement|aucun|tous)\b/i.test(normalize(text)) ? [index] : [])};
}

// Match Python json.dumps(segments, ensure_ascii=False, sort_keys=True), used
// by the existing offline renderer. MP3 hashes alone cannot detect stale text.
export function sourceHash(segments) {
  return sha256('[' + segments.map(segment => '{' + Object.keys(segment).sort()
    .map(key => JSON.stringify(key) + ': ' + JSON.stringify(segment[key])).join(', ') + '}').join(', ') + ']');
}

// Ignore labels, accessibility metadata and palette. Different geometry still
// needs visual review: this detects copies, not image/answer agreement.
export function imageFingerprint(svg) {
  return sha256(svg.replace(/<!--[^]*?-->/g, '')
    .replace(/<(text|title|desc)\b[^>]*>[^]*?<\/\1>/gi, '')
    .replace(/\s(?:aria-label|aria-labelledby|id)="[^"]*"/gi, '')
    .replace(/\b(?:fill|stroke)="[^"]*"/gi, '')
    .replace(/\s+/g, ''));
}

export function keyPattern(questions) {
  const key = questions.map(q => q.correct).join('');
  const counts = Object.fromEntries([...'ABCD'].map(letter => [letter, [...key].filter(x => x === letter).length]));
  let permutations = 0, blocks = 0;
  for (let i = 0; i + 4 <= key.length; i += 4) {
    blocks++;
    if (new Set(key.slice(i, i + 4)).size === 4) permutations++;
  }
  return {counts, key, permutationBlocks: permutations, blocks,
    // Greedily picking the least-used letter forces a predictable four-item
    // deck. Randomizing a balanced paper once avoids this local constraint.
    suspiciousFourItemDeck: blocks >= 8 && permutations / blocks >= 0.8};
}

export function reviewHash(question) {
  return sha256(JSON.stringify({question: question.question, options: question.options,
    correct: question.correct, explanation: question.explanation, segments: question.segments}));
}

export const reviewCriteria = Object.freeze(['originality','french','difficulty','question',
  'singleCorrectAnswer','distractors','choiceLengths','paraphrase','answerMapping',
  'explanation','recording','duration','picture','examRules']);

export function reviewStatus(question, version, audioHash, imageHash, reviews) {
  const match=reviews.find(review => review.version === version && review.number === question.number &&
    review.contentHash === reviewHash(question) && review.audioHash === audioHash && review.imageHash === imageHash);
  const pending=reviewCriteria.filter(criterion => match?.checks?.[criterion] !== 'pass');
  if (!match) return {review:null,pending};
  // A checklist with ticks is insufficient: capture the actual answer-bearing
  // evidence and why each other choice fails. Changed text/media invalidate it.
  if (!Array.isArray(match.evidence) || !match.evidence.length ||
      match.evidence.some(quote => typeof quote !== 'string' || quote.length<12 || !question.transcript.includes(quote))) pending.push('evidence');
  if (question.number>=9) {
    if (match.correctText !== question.options['ABCD'.indexOf(question.correct)]) pending.push('correctText');
    const wrong=[0,1,2,3].filter(index => index !== 'ABCD'.indexOf(question.correct));
    if (!wrong.every(index => match.distractors?.some(d => d.letter === 'ABCD'[index] && typeof d.reason === 'string' && d.reason.length>=25))) pending.push('distractorReasons');
  }
  if (!match.scenario || typeof match.scenario !== 'string' || match.scenario.length<15) pending.push('scenario');
  if (!match.listeningNotes || match.listeningNotes.length<25) pending.push('listeningNotes');
  if (question.number<=4 && (!match.imageDescription || match.imageDescription.length<25)) pending.push('imageDescription');
  return {review:match,pending};
}
