import { describe, it, expect } from 'vitest';
import { buildMarketAlignment } from '../market-alignment';
import { makeScores, makeZeroScores, makeMaxScores } from './fixtures';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildMarketAlignment', () => {

  // ── Output structure ───────────────────────────────────────────────────────

  describe('output structure', () => {
    it('returns exactly 10 MarketAlignment objects', () => {
      expect(buildMarketAlignment(makeScores())).toHaveLength(10);
    });

    it('each entry has all required fields', () => {
      for (const ma of buildMarketAlignment(makeScores())) {
        expect(ma).toMatchObject({
          category:      expect.any(String),
          label:         expect.any(String),
          alignmentScore: expect.any(Number),
          demand:        expect.any(String),
          competition:   expect.any(String),
          growth:        expect.any(String),
          marketNote:    expect.any(String),
        });
      }
    });

    it('results are sorted by alignmentScore descending', () => {
      const results = buildMarketAlignment(makeScores());
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].alignmentScore).toBeGreaterThanOrEqual(results[i + 1].alignmentScore);
      }
    });
  });

  // ── Alignment score calculation ────────────────────────────────────────────

  describe('alignmentScore calculation', () => {
    it('Very High demand applies 1.1× multiplier', () => {
      // netflix_drama and commercial_ads and social_content have "Very High" demand
      const scores = makeScores({ netflix_drama: { score: 100, confidence: 80 } });
      const nd = buildMarketAlignment(scores).find(ma => ma.category === 'netflix_drama')!;
      // 100 * 1.1 = 110 → capped at 100
      expect(nd.alignmentScore).toBe(100);
    });

    it('Very High demand: score 50 → alignmentScore 55 (50 × 1.1)', () => {
      const scores = makeScores({ netflix_drama: { score: 50, confidence: 70 } });
      const nd = buildMarketAlignment(scores).find(ma => ma.category === 'netflix_drama')!;
      expect(nd.alignmentScore).toBe(55);
    });

    it('High demand applies 1.0× multiplier (no change)', () => {
      const scores = makeScores({ film_trailer: { score: 70, confidence: 80 } });
      const ft = buildMarketAlignment(scores).find(ma => ma.category === 'film_trailer')!;
      expect(ft.alignmentScore).toBe(70);
    });

    it('Medium demand applies 0.9× multiplier', () => {
      // documentary has Medium demand
      const scores = makeScores({ documentary: { score: 60, confidence: 70 } });
      const doc = buildMarketAlignment(scores).find(ma => ma.category === 'documentary')!;
      // 60 * 0.9 = 54
      expect(doc.alignmentScore).toBe(54);
    });

    it('alignmentScore is capped at 100', () => {
      const max = makeMaxScores();
      for (const ma of buildMarketAlignment(max)) {
        expect(ma.alignmentScore).toBeLessThanOrEqual(100);
      }
    });

    it('alignmentScore is at minimum 0 for zero scores', () => {
      for (const ma of buildMarketAlignment(makeZeroScores())) {
        expect(ma.alignmentScore).toBeGreaterThanOrEqual(0);
        expect(ma.alignmentScore).toBe(0);
      }
    });
  });

  // ── High score category appears first ─────────────────────────────────────

  describe('sorting', () => {
    it('category with highest score appears first in results', () => {
      const scores = makeScores({
        documentary:   { score: 5  },
        commercial_ads: { score: 95 },
      });
      const results = buildMarketAlignment(scores);
      expect(results[0].category).toBe('commercial_ads');
    });

    it('all-zero scores returns 10 entries all with alignmentScore 0', () => {
      const results = buildMarketAlignment(makeZeroScores());
      expect(results.every(ma => ma.alignmentScore === 0)).toBe(true);
    });
  });

  // ── Market metadata ────────────────────────────────────────────────────────

  describe('market metadata', () => {
    it('social_content has Very High demand and Very High competition', () => {
      const sc = buildMarketAlignment(makeScores()).find(ma => ma.category === 'social_content')!;
      expect(sc.demand).toBe('Very High');
      expect(sc.competition).toBe('Very High');
    });

    it('documentary has Low competition', () => {
      const doc = buildMarketAlignment(makeScores()).find(ma => ma.category === 'documentary')!;
      expect(doc.competition).toBe('Low');
    });

    it('every entry has a non-empty marketNote', () => {
      for (const ma of buildMarketAlignment(makeScores())) {
        expect(ma.marketNote.length).toBeGreaterThan(10);
      }
    });
  });
});
