/**
 * Text normalization and similarity calculation utilities for fuzzy reconciliation
 */

const NOISE_TOKENS = new Set([
  'PVT',
  'LTD',
  'LIMITED',
  'PRIVATE',
  'INC',
  'LLC',
  'CORP',
  'CORPORATION',
  'SOLUTIONS',
  'INDIA',
  'PAYMENT',
  'PAYMENTS',
  'SETTLEMENT',
  'NEFT',
  'RTGS',
  'IMPS',
  'UPI',
  'ACH',
  'CR',
  'DR',
  'TXN',
  'CHG',
  'BILL',
  'INV',
  'REF',
  'TRANSFER',
  'DIRECT',
  'MANAGEMENT',
  'HOLDINGS',
  'HQ',
]);

/**
 * Normalizes a string by converting to uppercase, stripping special characters,
 * and filtering out common noise words.
 *
 * @param {string} str
 * @returns {string}
 */
export function normalizeText(str) {
  if (!str || typeof str !== 'string') return '';
  const cleaned = str
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(' ').filter((token) => token.length > 0 && !NOISE_TOKENS.has(token));
  return tokens.join(' ');
}

/**
 * Extracts meaningful tokens from string (length >= 2, non-noise)
 */
export function extractTokens(str) {
  if (!str || typeof str !== 'string') return [];
  const cleaned = str
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned
    .split(' ')
    .filter((token) => token.length >= 2 && !NOISE_TOKENS.has(token));
}

/**
 * Extracts acronyms (initials of capitalized words, e.g. Amazon Web Services -> AWS)
 */
export function getAcronyms(str) {
  if (!str || typeof str !== 'string') return [];
  const rawWords = str
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const acronyms = [];
  if (rawWords.length >= 2) {
    const initials = rawWords.map((w) => w[0].toUpperCase()).join('');
    if (initials.length >= 2) acronyms.push(initials);
  }

  // Also extract initials of filtered tokens
  const filtered = rawWords.filter((w) => !NOISE_TOKENS.has(w.toUpperCase()));
  if (filtered.length >= 2) {
    const initials = filtered.map((w) => w[0].toUpperCase()).join('');
    if (initials.length >= 2 && !acronyms.includes(initials)) acronyms.push(initials);
  }

  return acronyms;
}

/**
 * Extracts character n-grams (default: trigrams, n=3) from a string.
 *
 * @param {string} str
 * @param {number} n
 * @returns {Set<string>}
 */
export function getNGrams(str, n = 3) {
  const ngrams = new Set();
  if (!str || str.length < n) {
    if (str && str.length > 0) ngrams.add(str);
    return ngrams;
  }
  for (let i = 0; i <= str.length - n; i++) {
    ngrams.add(str.substring(i, i + n));
  }
  return ngrams;
}

/**
 * Computes standard Levenshtein distance between two strings.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinDistance(a, b) {
  const s1 = a || '';
  const s2 = b || '';

  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return track[s2.length][s1.length];
}

/**
 * Computes normalized Levenshtein similarity [0.0 - 1.0].
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function levenshteinSimilarity(a, b) {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Computes 3-gram (Sørensen-Dice) similarity between two strings [0.0 - 1.0].
 *
 * @param {string} strA
 * @param {string} strB
 * @param {number} n
 * @returns {number}
 */
export function nGramSimilarity(strA, strB, n = 3) {
  const normA = normalizeText(strA);
  const normB = normalizeText(strB);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 1.0;

  // Direct substring inclusion (e.g. "RAZORPAY" inside "RAZORPAY SOFTWARE")
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    if (minLen / maxLen >= 0.30) {
      return Math.max(0.85, minLen / maxLen);
    }
  }

  const ngramsA = getNGrams(normA, n);
  const ngramsB = getNGrams(normB, n);

  let intersection = 0;
  for (const gram of ngramsA) {
    if (ngramsB.has(gram)) {
      intersection++;
    }
  }

  const total = ngramsA.size + ngramsB.size;
  if (total === 0) return 0.0;
  return (2 * intersection) / total;
}

/**
 * Computes token-level / keyword overlap score between narration and payee.
 * Financial narrations (e.g. "NEFT/123/RAZORPAY/INV-1") contain the key vendor name as a token.
 *
 * @param {string} narration
 * @param {string} payee
 * @returns {number}
 */
export function tokenSetSimilarity(narration, payee) {
  const narrationTokens = extractTokens(narration);
  const payeeTokens = extractTokens(payee);

  if (narrationTokens.length === 0 || payeeTokens.length === 0) {
    return 0.0;
  }

  // Check acronym matching (e.g. "AWS" in narration vs "Amazon Web Services" in payee)
  const payeeAcronyms = getAcronyms(payee);
  for (const acr of payeeAcronyms) {
    if (narrationTokens.includes(acr)) {
      return 0.92;
    }
  }

  const narrAcronyms = getAcronyms(narration);
  for (const acr of narrAcronyms) {
    if (payeeTokens.includes(acr)) {
      return 0.92;
    }
  }

  let maxTokenScore = 0.0;
  let matchingCount = 0;

  for (const pToken of payeeTokens) {
    let bestForP = 0.0;
    for (const nToken of narrationTokens) {
      if (nToken === pToken) {
        bestForP = 1.0;
        break;
      }
      if (nToken.includes(pToken) || pToken.includes(nToken)) {
        const ratio = Math.min(nToken.length, pToken.length) / Math.max(nToken.length, pToken.length);
        if (ratio >= 0.5) {
          bestForP = Math.max(bestForP, 0.88);
        }
      }
      const lev = 1 - levenshteinDistance(nToken, pToken) / Math.max(nToken.length, pToken.length);
      if (lev >= 0.75) {
        bestForP = Math.max(bestForP, lev);
      }
    }

    if (bestForP >= 0.75) {
      matchingCount++;
    }
    maxTokenScore = Math.max(maxTokenScore, bestForP);
  }

  // If at least one primary token matched with high confidence, grant strong score
  if (maxTokenScore >= 0.88) {
    return Math.max(0.85, maxTokenScore);
  }

  return (matchingCount / payeeTokens.length) * maxTokenScore;
}

/**
 * Computes combined best similarity between narration and payee strings.
 * Evaluates global n-gram, Levenshtein, segment-level matches, and token-set matching.
 *
 * @param {string} narration
 * @param {string} payee
 * @returns {number}
 */
export function computeTextSimilarity(narration, payee) {
  if (!narration || !payee) return 0.0;

  const rawNormNarr = normalizeText(narration);
  const rawNormPayee = normalizeText(payee);

  if (rawNormNarr === rawNormPayee && rawNormNarr.length > 0) {
    return 1.0;
  }

  const globalTrigram = nGramSimilarity(narration, payee, 3);
  const globalLev = levenshteinSimilarity(narration, payee);
  const tokenScore = tokenSetSimilarity(narration, payee);

  // Check delimiter segments (e.g. "IMPS/P2A/AWS CLOUD/INFRA-PAYMENT" -> segments: "IMPS", "P2A", "AWS CLOUD", "INFRA-PAYMENT")
  const segments = narration.split(/[/\\_-]/).map((s) => s.trim()).filter((s) => s.length >= 2);
  let bestSegmentScore = 0.0;
  for (const seg of segments) {
    const segScore = Math.max(
      nGramSimilarity(seg, payee, 3),
      levenshteinSimilarity(seg, payee),
      tokenSetSimilarity(seg, payee)
    );
    if (segScore > bestSegmentScore) {
      bestSegmentScore = segScore;
    }
  }

  return Math.max(globalTrigram, globalLev, tokenScore, bestSegmentScore);
}

/**
 * Calculates date difference in whole days between two dates.
 *
 * @param {Date|string} dateA
 * @param {Date|string} dateB
 * @returns {number}
 */
export function dateDiffInDays(dateA, dateB) {
  const dA = new Date(dateA);
  const dB = new Date(dateB);
  if (isNaN(dA.getTime()) || isNaN(dB.getTime())) return Infinity;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((dA.getTime() - dB.getTime()) / msPerDay);
}
