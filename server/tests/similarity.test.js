import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText,
  getNGrams,
  nGramSimilarity,
  levenshteinDistance,
  levenshteinSimilarity,
  computeTextSimilarity,
  dateDiffInDays,
} from '../utils/similarity.js';

test('normalizeText: strips special characters and removes common noise tokens', () => {
  const raw = 'NEFT/12345/RAZORPAY SOFTWARE PVT LTD/SETTLEMENT';
  const normalized = normalizeText(raw);
  assert.equal(normalized, '12345 RAZORPAY SOFTWARE');
});

test('getNGrams: extracts 3-grams correctly', () => {
  const ngrams = getNGrams('RAZORPAY', 3);
  assert.ok(ngrams.has('RAZ'));
  assert.ok(ngrams.has('AZO'));
  assert.ok(ngrams.has('ZOR'));
  assert.ok(ngrams.has('ORP'));
  assert.ok(ngrams.has('RPA'));
  assert.ok(ngrams.has('PAY'));
});

test('nGramSimilarity: calculates high similarity for matching corporate names with variations', () => {
  const score1 = nGramSimilarity('GOOGLE WORKSPACE INDIA', 'Google Cloud India Pvt Ltd');
  assert.ok(score1 >= 0.3, `Expected score >= 0.3, got ${score1}`);

  const scoreExact = nGramSimilarity('AMAZON WEB SERVICES', 'Amazon Web Services India Pvt Ltd');
  assert.ok(scoreExact >= 0.85, `Expected score >= 0.85, got ${scoreExact}`);
});

test('levenshteinDistance & similarity: handles typos and minor differences', () => {
  const dist = levenshteinDistance('DELHIVERY', 'DELHIVRY');
  assert.equal(dist, 1);

  const sim = levenshteinSimilarity('DELHIVERY LOGISTICS', 'DELHIVERY LOGISTICS PVT LTD');
  assert.ok(sim >= 0.9, `Expected sim >= 0.9, got ${sim}`);
});

test('computeTextSimilarity: returns highest matching score between methods', () => {
  const score = computeTextSimilarity(
    'IMPS/P2A/UTR-1001/BHARTI AIRTEL/SETTLEMENT',
    'Airtel Enterprise Telecom'
  );
  assert.ok(score >= 0.75, `Expected score >= 0.75, got ${score}`);
});

test('dateDiffInDays: correctly calculates signed day differences', () => {
  const d1 = new Date('2026-08-15T10:00:00Z');
  const d2 = new Date('2026-08-18T10:00:00Z');
  assert.equal(dateDiffInDays(d2, d1), 3);
  assert.equal(dateDiffInDays(d1, d2), -3);
  assert.equal(dateDiffInDays(d1, d1), 0);
});
