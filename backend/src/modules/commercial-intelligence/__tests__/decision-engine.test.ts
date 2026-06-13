import { describe, it, expect } from 'vitest';
import { buildDecisionEngine } from '../decision-engine';
import { makeScores, makeZeroScores } from './fixtures';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildDecisionEngine', () => {

  // ── Output structure ───────────────────────────────────────────────────────

  describe('output structure', () => {
    it('returns actions, primaryFocus, and strategyType', () => {
      const r = buildDecisionEngine(makeScores(), 55);
      expect(r).toMatchObject({
        actions:       expect.any(Array),
        primaryFocus:  expect.any(String),
        strategyType:  expect.any(String),
      });
    });

    it('each action has all required fields', () => {
      for (const action of buildDecisionEngine(makeScores(), 55).actions) {
        expect(action).toMatchObject({
          priority:       expect.any(Number),
          title:          expect.any(String),
          description:    expect.any(String),
          impact:         expect.any(String),
          timeframe:      expect.any(String),
          targetAudience: expect.any(String),
          channel:        expect.any(String),
        });
      }
    });
  });

  // ── Category action inclusion ──────────────────────────────────────────────

  describe('category actions', () => {
    it('top 3 categories with score >= 35 produce 3 category actions', () => {
      const scores = makeScores({
        film_trailer:   { score: 80 },
        commercial_ads: { score: 75 },
        sports_content: { score: 70 },
        // all others default to 50
      });
      const r = buildDecisionEngine(scores, 68);
      const categoryActions = r.actions.filter(a => a.priority <= 3);
      expect(categoryActions).toHaveLength(3);
    });

    it('only categories with score >= 35 are included', () => {
      const scores = makeScores({
        film_trailer:    { score: 80 },
        netflix_drama:   { score: 60 },
        // force everything else below threshold
        documentary:     { score: 10 },
        sports_content:  { score: 10 },
        gaming:          { score: 10 },
        fashion:         { score: 10 },
        luxury_brands:   { score: 10 },
        travel_campaigns:{ score: 10 },
        commercial_ads:  { score: 10 },
        social_content:  { score: 10 },
      });
      const r = buildDecisionEngine(scores, 45);
      // 2 qualifying categories → 2 category actions + library + instrumental
      const catActions = r.actions.filter(a =>
        a.title !== 'Submit to Premium Sync Licensing Libraries' &&
        a.title !== 'Create and Register Instrumental Version'
      );
      expect(catActions).toHaveLength(2);
    });

    it('category action impact is "High" when score >= 65', () => {
      const scores = makeScores({ film_trailer: { score: 80 } });
      const r = buildDecisionEngine(scores, 65);
      const ftAction = r.actions.find(a => a.title === 'Pitch to Film Trailer Music Supervisors')!;
      expect(ftAction.impact).toBe('High');
    });

    it('category action impact is "Medium" when 45 <= score < 65', () => {
      const scores = makeScores({ film_trailer: { score: 55 } });
      const r = buildDecisionEngine(scores, 55);
      const ftAction = r.actions.find(a => a.title === 'Pitch to Film Trailer Music Supervisors')!;
      expect(ftAction.impact).toBe('Medium');
    });

    it('category action impact is "Low" when score < 45', () => {
      const scores = makeScores({
        film_trailer:   { score: 40 },
        // push all others below 35 so film_trailer is #1
        netflix_drama:  { score: 10 },
        documentary:    { score: 10 },
        sports_content: { score: 10 },
        gaming:         { score: 10 },
        fashion:        { score: 10 },
        luxury_brands:  { score: 10 },
        travel_campaigns:{ score: 10 },
        commercial_ads: { score: 10 },
        social_content: { score: 10 },
      });
      const r = buildDecisionEngine(scores, 40);
      const ftAction = r.actions.find(a => a.title === 'Pitch to Film Trailer Music Supervisors')!;
      expect(ftAction.impact).toBe('Low');
    });
  });

  // ── Library and instrumental actions ──────────────────────────────────────

  describe('library and instrumental actions', () => {
    it('library action is included when overallScore >= 30', () => {
      const r = buildDecisionEngine(makeScores(), 30);
      expect(r.actions.some(a => a.title === 'Submit to Premium Sync Licensing Libraries')).toBe(true);
    });

    it('library action is NOT included when overallScore < 30', () => {
      const r = buildDecisionEngine(makeZeroScores(), 25);
      expect(r.actions.some(a => a.title === 'Submit to Premium Sync Licensing Libraries')).toBe(false);
    });

    it('instrumental version action is ALWAYS included', () => {
      for (const score of [0, 25, 50, 75, 100]) {
        const r = buildDecisionEngine(makeScores(), score);
        expect(r.actions.some(a => a.title === 'Create and Register Instrumental Version')).toBe(true);
      }
    });

    it('instrumental action has "High" impact', () => {
      const r = buildDecisionEngine(makeScores(), 55);
      const ia = r.actions.find(a => a.title === 'Create and Register Instrumental Version')!;
      expect(ia.impact).toBe('High');
    });
  });

  // ── Strategy type ─────────────────────────────────────────────────────────

  describe('strategyType', () => {
    it('overallScore >= 70 AND topScore >= 75 → "Aggressive Pitch"', () => {
      const scores = makeScores({ film_trailer: { score: 80 } });
      const r = buildDecisionEngine(scores, 72);
      expect(r.strategyType).toBe('Aggressive Pitch');
    });

    it('overallScore 68 (< 70) → "Targeted Pitch" regardless of topScore', () => {
      const scores = makeScores({ film_trailer: { score: 80 } });
      const r = buildDecisionEngine(scores, 68);
      expect(r.strategyType).toBe('Targeted Pitch');
    });

    it('overallScore >= 50 → "Targeted Pitch"', () => {
      const r = buildDecisionEngine(makeScores(), 55);
      expect(r.strategyType).toBe('Targeted Pitch');
    });

    it('overallScore >= 30 and < 50 → "Library Submission"', () => {
      const r = buildDecisionEngine(makeScores(), 38);
      expect(r.strategyType).toBe('Library Submission');
    });

    it('overallScore < 30 → "Development Needed"', () => {
      const r = buildDecisionEngine(makeZeroScores(), 20);
      expect(r.strategyType).toBe('Development Needed');
    });
  });

  // ── Primary focus ─────────────────────────────────────────────────────────

  describe('primaryFocus', () => {
    it('returns the label of the top-scoring category (score >= 35)', () => {
      const scores = makeScores({
        gaming:          { score: 95 },
        film_trailer:    { score: 60 },
      });
      const r = buildDecisionEngine(scores, 65);
      expect(r.primaryFocus).toBe('Gaming');
    });

    it('all scores < 35 → primaryFocus is "Library Development"', () => {
      const r = buildDecisionEngine(makeZeroScores(), 20);
      expect(r.primaryFocus).toBe('Library Development');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('zero scores produce only the instrumental action (no library below 30, no categories)', () => {
      const r = buildDecisionEngine(makeZeroScores(), 0);
      expect(r.actions).toHaveLength(1);
      expect(r.actions[0].title).toBe('Create and Register Instrumental Version');
    });

    it('max scores produce 3 category actions + library + instrumental = 5 total', () => {
      const scores = makeScores(
        Object.fromEntries(
          ['film_trailer','netflix_drama','documentary','sports_content','gaming',
           'fashion','luxury_brands','travel_campaigns','commercial_ads','social_content']
            .map(c => [c, { score: 100 }])
        ) as any
      );
      const r = buildDecisionEngine(scores, 100);
      expect(r.actions).toHaveLength(5);
    });

    it('actions are in ascending priority order', () => {
      const r = buildDecisionEngine(makeScores(), 55);
      for (let i = 0; i < r.actions.length - 1; i++) {
        expect(r.actions[i].priority).toBeLessThan(r.actions[i + 1].priority);
      }
    });
  });
});
