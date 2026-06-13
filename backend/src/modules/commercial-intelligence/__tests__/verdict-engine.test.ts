import { describe, it, expect } from 'vitest';
import { buildDatiamVerdict } from '../verdict-engine';
import { baseDna, lowDna, makeScores } from './fixtures';
import type { DnaInputForSync } from '../../sync-intelligence/sync-intelligence.types';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildDatiamVerdict', () => {

  // ── Output structure ───────────────────────────────────────────────────────

  describe('output structure', () => {
    it('returns all required fields', () => {
      const r = buildDatiamVerdict(baseDna, makeScores(), 55);
      expect(r).toMatchObject({
        commercialOutlook: expect.any(String),
        bestOpportunity:   expect.any(String),
        bestRevenuePath:   expect.any(String),
        bestAudience:      expect.any(Array),
        syncReadiness:     expect.any(Number),
        recommendation:    expect.any(String),
        executiveSummary:  expect.any(String),
        confidenceScore:   expect.any(Number),
      });
    });
  });

  // ── Commercial outlook tiers ───────────────────────────────────────────────

  describe('commercialOutlook', () => {
    it('score >= 80 → "Exceptional"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 80).commercialOutlook).toBe('Exceptional');
    });

    it('score 79 → "Strong"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 79).commercialOutlook).toBe('Strong');
    });

    it('score >= 65 → "Strong"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 67).commercialOutlook).toBe('Strong');
    });

    it('score 64 → "Moderate"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 64).commercialOutlook).toBe('Moderate');
    });

    it('score >= 45 → "Moderate"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 50).commercialOutlook).toBe('Moderate');
    });

    it('score 44 → "Limited"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 44).commercialOutlook).toBe('Limited');
    });

    it('score >= 25 → "Limited"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 28).commercialOutlook).toBe('Limited');
    });

    it('score 24 → "Developing"', () => {
      expect(buildDatiamVerdict(lowDna, makeScores(), 24).commercialOutlook).toBe('Developing');
    });

    it('score 0 → "Developing"', () => {
      expect(buildDatiamVerdict(lowDna, makeScores(), 0).commercialOutlook).toBe('Developing');
    });
  });

  // ── Recommendation tiers ───────────────────────────────────────────────────

  describe('recommendation', () => {
    it('score >= 75 → "Pitch Immediately"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 75).recommendation).toBe('Pitch Immediately');
    });

    it('score 74 → "Targeted Outreach"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 74).recommendation).toBe('Targeted Outreach');
    });

    it('score >= 55 → "Targeted Outreach"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 58).recommendation).toBe('Targeted Outreach');
    });

    it('score 54 → "Develop Further"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 54).recommendation).toBe('Develop Further');
    });

    it('score >= 35 → "Develop Further"', () => {
      expect(buildDatiamVerdict(baseDna, makeScores(), 40).recommendation).toBe('Develop Further');
    });

    it('score 34 → "Niche Placement Only"', () => {
      expect(buildDatiamVerdict(lowDna, makeScores(), 34).recommendation).toBe('Niche Placement Only');
    });

    it('score >= 20 → "Niche Placement Only"', () => {
      expect(buildDatiamVerdict(lowDna, makeScores(), 22).recommendation).toBe('Niche Placement Only');
    });

    it('score 19 → "Not Ready"', () => {
      expect(buildDatiamVerdict(lowDna, makeScores(), 19).recommendation).toBe('Not Ready');
    });

    it('score 0 → "Not Ready"', () => {
      expect(buildDatiamVerdict(lowDna, makeScores(), 0).recommendation).toBe('Not Ready');
    });
  });

  // ── syncReadiness calculation ──────────────────────────────────────────────

  describe('syncReadiness', () => {
    it('syncReadiness = round(score * 0.6 + topScore * 0.4)', () => {
      // All categories default to score=50, so topScore=50
      const r = buildDatiamVerdict(baseDna, makeScores(), 60);
      // round(60*0.6 + 50*0.4) = round(36+20) = 56
      expect(r.syncReadiness).toBe(56);
    });

    it('syncReadiness is capped at 100', () => {
      const scores = makeScores(
        Object.fromEntries(
          ['film_trailer','netflix_drama','documentary','sports_content','gaming',
           'fashion','luxury_brands','travel_campaigns','commercial_ads','social_content']
            .map(c => [c, { score: 100 }])
        ) as any
      );
      const r = buildDatiamVerdict(baseDna, scores, 100);
      expect(r.syncReadiness).toBe(100);
    });

    it('syncReadiness is within 0–100', () => {
      for (const score of [0, 25, 50, 75, 100]) {
        const r = buildDatiamVerdict(baseDna, makeScores(), score);
        expect(r.syncReadiness).toBeGreaterThanOrEqual(0);
        expect(r.syncReadiness).toBeLessThanOrEqual(100);
      }
    });
  });

  // ── bestOpportunity and bestRevenuePath ───────────────────────────────────

  describe('bestOpportunity', () => {
    it('bestOpportunity is the label of the highest-scoring category', () => {
      const scores = makeScores({ gaming: { score: 95 } });
      const r = buildDatiamVerdict(baseDna, scores, 60);
      expect(r.bestOpportunity).toBe('Gaming');
    });

    it('bestRevenuePath is the revenue path for the top category', () => {
      const scores = makeScores({ film_trailer: { score: 95 } });
      const r = buildDatiamVerdict(baseDna, scores, 60);
      expect(r.bestRevenuePath).toBe('Major Studio Film Licensing');
    });
  });

  // ── bestAudience ───────────────────────────────────────────────────────────

  describe('bestAudience', () => {
    it('bestAudience has at most 3 entries', () => {
      const r = buildDatiamVerdict(baseDna, makeScores(), 55);
      expect(r.bestAudience.length).toBeLessThanOrEqual(3);
    });

    it('bestAudience entries are non-empty strings', () => {
      for (const audience of buildDatiamVerdict(baseDna, makeScores(), 55).bestAudience) {
        expect(audience.length).toBeGreaterThan(0);
      }
    });
  });

  // ── confidenceScore ────────────────────────────────────────────────────────

  describe('confidenceScore', () => {
    it('confidenceScore is within 0–100', () => {
      for (const score of [0, 25, 50, 75, 100]) {
        const r = buildDatiamVerdict(baseDna, makeScores(), score);
        expect(r.confidenceScore).toBeGreaterThanOrEqual(0);
        expect(r.confidenceScore).toBeLessThanOrEqual(100);
      }
    });

    it('higher overall score → higher confidenceScore', () => {
      const low  = buildDatiamVerdict(baseDna, makeScores(), 20).confidenceScore;
      const high = buildDatiamVerdict(baseDna, makeScores(), 80).confidenceScore;
      expect(high).toBeGreaterThan(low);
    });

    it('more high-scoring categories increase confidenceScore (diversity bonus)', () => {
      // highCategories filters score >= 50; use score=80 for "all high" and score=30 for "none high"
      const allHigh = makeScores(
        Object.fromEntries(
          ['film_trailer','netflix_drama','documentary','sports_content','gaming',
           'fashion','luxury_brands','travel_campaigns','commercial_ads','social_content']
            .map(c => [c, { score: 80 }])
        ) as any
      );
      const allLow = makeScores(
        Object.fromEntries(
          ['film_trailer','netflix_drama','documentary','sports_content','gaming',
           'fashion','luxury_brands','travel_campaigns','commercial_ads','social_content']
            .map(c => [c, { score: 30 }])
        ) as any
      );
      const diverseScore = buildDatiamVerdict(baseDna, allHigh, 70).confidenceScore;
      const narrowScore  = buildDatiamVerdict(baseDna, allLow,  70).confidenceScore;
      expect(diverseScore).toBeGreaterThan(narrowScore);
    });
  });

  // ── Executive summary ─────────────────────────────────────────────────────

  describe('executiveSummary', () => {
    it('Exceptional outlook summary references top category label', () => {
      const scores = makeScores({ film_trailer: { score: 95 } });
      const r = buildDatiamVerdict(baseDna, scores, 82);
      expect(r.executiveSummary.toLowerCase()).toContain('film trailer');
    });

    it('null primaryGenre → summary uses "this genre"', () => {
      const dna = { ...baseDna, primaryGenre: null } as unknown as DnaInputForSync;
      const r = buildDatiamVerdict(dna, makeScores(), 55);
      expect(r.executiveSummary).toContain('this genre');
    });

    it('null moodPrimary → summary uses "nuanced"', () => {
      const dna = { ...baseDna, moodPrimary: null } as unknown as DnaInputForSync;
      const r = buildDatiamVerdict(dna, makeScores(), 55);
      expect(r.executiveSummary).toContain('nuanced');
    });

    it('Strong outlook summary references top category', () => {
      const scores = makeScores({ sports_content: { score: 85 } });
      const r = buildDatiamVerdict(baseDna, scores, 68);
      expect(r.executiveSummary.toLowerCase()).toContain('sports content');
    });

    it('Developing outlook summary mentions "further development"', () => {
      const r = buildDatiamVerdict(lowDna, makeScores(), 20);
      expect(r.executiveSummary.toLowerCase()).toContain('further development');
    });
  });
});
