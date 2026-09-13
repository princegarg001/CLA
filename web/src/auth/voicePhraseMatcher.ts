// Speech-to-text transcription is noisy — the same spoken phrase rarely comes
// back as the exact same string twice. This does normalized, similarity-based
// comparison instead of exact matching so a voice passphrase login is usable.
//
// Security note: this is a spoken-passphrase gate, not true voiceprint
// biometrics — it checks *what* was said, not *who* said it. Appropriate for
// a single-user founder tool's convenience lock, not identity verification
// against an attacker who knows the phrase.

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const currentRow = new Array(b.length + 1).fill(0);
    currentRow[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const deletionCost = previousRow[j + 1] + 1;
      const insertionCost = currentRow[j] + 1;
      const substitutionCost = previousRow[j] + (a[i] === b[j] ? 0 : 1);
      currentRow[j + 1] = Math.min(deletionCost, insertionCost, substitutionCost);
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

/** 0.0 (no relation) .. 1.0 (identical after normalization). */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  const wordScore = union === 0 ? 0 : overlap / union;

  const distance = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  const charScore = maxLen === 0 ? 0 : 1 - distance / maxLen;

  return wordScore * 0.6 + charScore * 0.4;
}

export function matches(spoken: string, target: string, threshold = 0.72): boolean {
  return similarity(spoken, target) >= threshold;
}
