/**
 * Decision Engine — boundary-case tests.
 * Spec §1.3: score > 600 → SANCTION, score >= 500 → RECONSIDER, score < 500 → REJECT.
 */

const { deriveDecision, deriveLegacyBand } = require('../../../src/modules/trust/services/decisionEngine');

describe('deriveDecision', () => {
  test('601 → SANCTION (just above threshold)', () => {
    expect(deriveDecision(601)).toBe('SANCTION');
  });

  test('600 → RECONSIDER (boundary — NOT sanction)', () => {
    expect(deriveDecision(600)).toBe('RECONSIDER');
  });

  test('500 → RECONSIDER (floor of reconsider band)', () => {
    expect(deriveDecision(500)).toBe('RECONSIDER');
  });

  test('499 → REJECT (just below reconsider floor)', () => {
    expect(deriveDecision(499)).toBe('REJECT');
  });

  test('1000 → SANCTION (maximum score)', () => {
    expect(deriveDecision(1000)).toBe('SANCTION');
  });

  test('0 → REJECT (minimum score)', () => {
    expect(deriveDecision(0)).toBe('REJECT');
  });

  test('throws on NaN', () => {
    expect(() => deriveDecision(NaN)).toThrow('score must be a number');
  });

  test('throws on non-number', () => {
    expect(() => deriveDecision('601')).toThrow('score must be a number');
  });
});

describe('deriveLegacyBand', () => {
  test('751 → excellent', () => expect(deriveLegacyBand(751)).toBe('excellent'));
  test('750 → good', () => expect(deriveLegacyBand(750)).toBe('good'));
  test('501 → good', () => expect(deriveLegacyBand(501)).toBe('good'));
  test('500 → fair', () => expect(deriveLegacyBand(500)).toBe('fair'));
  test('251 → fair', () => expect(deriveLegacyBand(251)).toBe('fair'));
  test('250 → poor', () => expect(deriveLegacyBand(250)).toBe('poor'));
  test('0 → poor', () => expect(deriveLegacyBand(0)).toBe('poor'));
});
