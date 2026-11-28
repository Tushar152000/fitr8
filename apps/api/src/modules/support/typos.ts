/**
 * Typo tolerance for the support search: Postgres full-text search matches exact word stems, so
 * "adnroid" finds nothing. A query word that is not in the FAQ's own vocabulary is replaced by the
 * closest FAQ word, but only for longer words (short words are too easy to "fix" into the wrong
 * word: "same" → "name"): one edit from 6 letters, two edits from 9.
 */

/** Edit distance where swapping two neighbouring letters counts as one edit. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
      }
    }
  }
  return d[a.length]![b.length]!;
}

export const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);

/** Every word used in the FAQ's questions, keywords and answers. */
export function buildVocabulary(texts: string[]): Set<string> {
  return new Set(texts.flatMap(words));
}

function allowedEdits(word: string): number {
  if (word.length >= 9) return 2;
  if (word.length >= 6) return 1;
  return 0;
}

/** The word itself when the FAQ knows it, else its closest FAQ word within the allowed edits. */
export function correctWord(word: string, vocab: Set<string>): string {
  const max = allowedEdits(word);
  if (!max || vocab.has(word)) return word;
  let best = word;
  let bestDistance = max + 1;
  for (const candidate of vocab) {
    if (Math.abs(candidate.length - word.length) > max) continue;
    const dist = editDistance(word, candidate);
    if (dist < bestDistance || (dist === bestDistance && candidate < best)) {
      best = candidate;
      bestDistance = dist;
    }
  }
  return bestDistance <= max ? best : word;
}

export function correctText(text: string, vocab: Set<string>): string {
  return words(text)
    .map((w) => correctWord(w, vocab))
    .join(" ");
}
