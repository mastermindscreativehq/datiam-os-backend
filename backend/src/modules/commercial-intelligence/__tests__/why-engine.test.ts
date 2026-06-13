import { describe, it, expect } from 'vitest';
import { buildWhyScores } from '../why-engine';
import { baseDna, cinematicDna, lowDna, riskDna, makeScores, makeZeroScores } from './fixtures';
import type { DnaInputForSync } from '../../sync-intelligence/sync-intelligence.types';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildWhyScores', () => {

  // ── Output structure ───────────────────────────────────────────────────────

  describe('output structure', () => {
    it('returns exactly 10 WhyScore objects (one per SyncCategory)', () => {
      expect(buildWhyScores(baseDna, makeScores())).toHaveLength(10);
    });

    it('each WhyScore has the required shape', () => {
      for (const ws of buildWhyScores(baseDna, makeScores())) {
        expect(ws).toMatchObject({
          category:        expect.any(String),
          label:           expect.any(String),
          score:           expect.any(Number),
          confidence:      expect.any(Number),
          positiveFactors: expect.any(Array),
          negativeFactors: expect.any(Array),
          confidenceLabel: expect.any(String),
        });
      }
    });

    it('score and confidence mirror the provided categoryScores', () => {
      const scores = makeScores({ film_trailer: { score: 73, confidence: 88 } });
      const ft = buildWhyScores(baseDna, scores).find(ws => ws.category === 'film_trailer')!;
      expect(ft.score).toBe(73);
      expect(ft.confidence).toBe(88);
    });

    it('all ScoreFactor impact values are "positive" or "negative" in the correct array', () => {
      for (const ws of buildWhyScores(baseDna, makeScores())) {
        for (const f of ws.positiveFactors) expect(f.impact).toBe('positive');
        for (const f of ws.negativeFactors) expect(f.impact).toBe('negative');
      }
    });

    it('all ScoreFactor strength values are valid', () => {
      const valid = new Set(['strong', 'moderate', 'weak']);
      for (const ws of buildWhyScores(cinematicDna, makeScores())) {
        for (const f of [...ws.positiveFactors, ...ws.negativeFactors]) {
          expect(valid.has(f.strength), `invalid strength "${f.strength}"`).toBe(true);
        }
      }
    });
  });

  // ── confidenceLabel thresholds ─────────────────────────────────────────────

  describe('confidenceLabel', () => {
    it.each([
      [80, 'Very High'],
      [79, 'High'],
      [65, 'High'],
      [64, 'Moderate'],
      [45, 'Moderate'],
      [44, 'Low'],
      [25, 'Low'],
      [24, 'Very Low'],
      [0,  'Very Low'],
    ] as [number, string][])('confidence %i → %s', (confidence, expected) => {
      const scores = makeScores({ film_trailer: { score: 50, confidence } });
      const ft = buildWhyScores(baseDna, scores).find(ws => ws.category === 'film_trailer')!;
      expect(ft.confidenceLabel).toBe(expected);
    });
  });

  // ── film_trailer factor evaluators ────────────────────────────────────────

  describe('film_trailer factors', () => {
    const ft = (d: DnaInputForSync) =>
      buildWhyScores(d, makeScores()).find(ws => ws.category === 'film_trailer')!;

    it('tension > 65 → "High cinematic tension" positive factor', () => {
      expect(ft({ ...cinematicDna, tension: 70 }).positiveFactors
        .some(f => f.label === 'High cinematic tension')).toBe(true);
    });

    it('tension < 40 → "Insufficient cinematic tension" negative factor', () => {
      expect(ft({ ...lowDna, tension: 35 }).negativeFactors
        .some(f => f.label === 'Insufficient cinematic tension')).toBe(true);
    });

    it('triumph > 65 → "Strong triumphant resolution" positive factor', () => {
      expect(ft({ ...cinematicDna, triumph: 70 }).positiveFactors
        .some(f => f.label === 'Strong triumphant resolution')).toBe(true);
    });

    it('triumph < 45 → "Weak narrative resolution" negative factor', () => {
      expect(ft({ ...lowDna, triumph: 40 }).negativeFactors
        .some(f => f.label === 'Weak narrative resolution')).toBe(true);
    });

    it('energyArc "rising" → "Escalating energy arc" positive factor', () => {
      expect(ft({ ...cinematicDna, energyArc: 'rising' }).positiveFactors
        .some(f => f.label === 'Escalating energy arc')).toBe(true);
    });

    it('energyArc "peak" → "Escalating energy arc" positive factor', () => {
      expect(ft({ ...cinematicDna, energyArc: 'peak' }).positiveFactors
        .some(f => f.label === 'Escalating energy arc')).toBe(true);
    });

    it('energyArc "steady" → "Non-escalating energy arc" negative factor', () => {
      expect(ft({ ...cinematicDna, energyArc: 'steady' }).negativeFactors
        .some(f => f.label === 'Non-escalating energy arc')).toBe(true);
    });

    it('null energyArc → "Non-escalating energy arc" negative factor', () => {
      expect(ft({ ...cinematicDna, energyArc: null }).negativeFactors
        .some(f => f.label === 'Non-escalating energy arc')).toBe(true);
    });

    it('dropStrength > 70 → "Dramatic impact moments" positive factor', () => {
      expect(ft({ ...cinematicDna, dropStrength: 75 }).positiveFactors
        .some(f => f.label === 'Dramatic impact moments')).toBe(true);
    });

    it('dropStrength < 40 → "Weak dynamic contrast" negative factor', () => {
      expect(ft({ ...lowDna, dropStrength: 35 }).negativeFactors
        .some(f => f.label === 'Weak dynamic contrast')).toBe(true);
    });

    it('cinematic genre → "Genre alignment" positive factor', () => {
      expect(ft({ ...cinematicDna, primaryGenre: 'cinematic' }).positiveFactors
        .some(f => f.label === 'Genre alignment')).toBe(true);
    });

    it('jazz genre → "Genre misalignment" negative factor', () => {
      // secondaryGenre must be null — cinematicDna.secondaryGenre='orchestral' which
      // IS in the secondary-genre alignment list and would produce a false positive.
      expect(ft({ ...cinematicDna, primaryGenre: 'jazz', secondaryGenre: null }).negativeFactors
        .some(f => f.label === 'Genre misalignment')).toBe(true);
    });

    it('tense mood → "Mood profile match" positive factor', () => {
      expect(ft({ ...cinematicDna, moodPrimary: 'tense' }).positiveFactors
        .some(f => f.label === 'Mood profile match')).toBe(true);
    });

    it('peaceful mood → "Mood profile mismatch" negative factor', () => {
      expect(ft({ ...cinematicDna, moodPrimary: 'peaceful' }).negativeFactors
        .some(f => f.label === 'Mood profile mismatch')).toBe(true);
    });

    it('darkness > 55 → "Dark atmospheric depth" positive factor', () => {
      expect(ft({ ...cinematicDna, darkness: 60 }).positiveFactors
        .some(f => f.label === 'Dark atmospheric depth')).toBe(true);
    });
  });

  // ── netflix_drama factor evaluators ───────────────────────────────────────

  describe('netflix_drama factors', () => {
    const nd = (d: DnaInputForSync) =>
      buildWhyScores(d, makeScores()).find(ws => ws.category === 'netflix_drama')!;

    it('melancholy > 60 → "Rich melancholic emotional depth" positive factor', () => {
      expect(nd({ ...baseDna, melancholy: 70 }).positiveFactors
        .some(f => f.label === 'Rich melancholic emotional depth')).toBe(true);
    });

    it('aggression > 60 → "Excessive aggressive energy" negative factor', () => {
      expect(nd({ ...baseDna, aggression: 65 }).negativeFactors
        .some(f => f.label === 'Excessive aggressive energy')).toBe(true);
    });

    it('danceability > 70 → "Overly rhythmic character" negative factor', () => {
      expect(nd({ ...baseDna, danceability: 75 }).negativeFactors
        .some(f => f.label === 'Overly rhythmic character')).toBe(true);
    });
  });

  // ── documentary factor evaluators ─────────────────────────────────────────

  describe('documentary factors', () => {
    const doc = (d: DnaInputForSync) =>
      buildWhyScores(d, makeScores()).find(ws => ws.category === 'documentary')!;

    it('aggression < 35 → "Non-aggressive profile" positive factor', () => {
      expect(doc({ ...lowDna, aggression: 30 }).positiveFactors
        .some(f => f.label === 'Non-aggressive profile')).toBe(true);
    });

    it('aggression > 55 → "Elevated aggression" negative factor', () => {
      expect(doc({ ...riskDna, aggression: 60, primaryGenre: 'ambient' }).negativeFactors
        .some(f => f.label === 'Elevated aggression')).toBe(true);
    });

    it('danceability < 50 → "Non-rhythmic character" positive factor', () => {
      expect(doc({ ...lowDna, danceability: 40 }).positiveFactors
        .some(f => f.label === 'Non-rhythmic character')).toBe(true);
    });

    it('danceability > 65 → "Overly rhythmic for documentary" negative factor', () => {
      expect(doc({ ...baseDna, primaryGenre: 'folk', danceability: 70 }).negativeFactors
        .some(f => f.label === 'Overly rhythmic for documentary')).toBe(true);
    });
  });

  // ── sports_content factor evaluators ──────────────────────────────────────

  describe('sports_content factors', () => {
    const sc = (d: DnaInputForSync) =>
      buildWhyScores(d, makeScores()).find(ws => ws.category === 'sports_content')!;

    it('danceability > 70 → "High rhythmic drive" positive factor', () => {
      expect(sc({ ...baseDna, danceability: 75 }).positiveFactors
        .some(f => f.label === 'High rhythmic drive')).toBe(true);
    });

    it('danceability < 50 → "Low rhythmic energy" negative factor', () => {
      expect(sc({ ...lowDna }).negativeFactors
        .some(f => f.label === 'Low rhythmic energy')).toBe(true);
    });
  });

  // ── social_content factor evaluators ──────────────────────────────────────

  describe('social_content factors', () => {
    const sc = (d: DnaInputForSync) =>
      buildWhyScores(d, makeScores()).find(ws => ws.category === 'social_content')!;

    it('danceability > 65 → "Viral dance and movement energy" positive factor', () => {
      expect(sc({ ...baseDna, danceability: 70 }).positiveFactors
        .some(f => f.label === 'Viral dance and movement energy')).toBe(true);
    });

    it('danceability < 50 → "Low viral movement potential" negative factor', () => {
      expect(sc({ ...lowDna }).negativeFactors
        .some(f => f.label === 'Low viral movement potential')).toBe(true);
    });

    it('melancholy > 65 → "High melancholy limits viral reach" negative factor', () => {
      expect(sc({ ...baseDna, melancholy: 70 }).negativeFactors
        .some(f => f.label === 'High melancholy limits viral reach')).toBe(true);
    });

    it('dropStrength > 60 → "Strong hook and drop moments" positive factor', () => {
      expect(sc({ ...baseDna, dropStrength: 65 }).positiveFactors
        .some(f => f.label === 'Strong hook and drop moments')).toBe(true);
    });
  });

  // ── gaming factor evaluators ───────────────────────────────────────────────

  describe('gaming factors', () => {
    const gm = (d: DnaInputForSync) =>
      buildWhyScores(d, makeScores()).find(ws => ws.category === 'gaming')!;

    it('tension > 60 → "High tension profile" positive factor', () => {
      expect(gm({ ...cinematicDna, primaryGenre: 'electronic', tension: 65 }).positiveFactors
        .some(f => f.label === 'High tension profile')).toBe(true);
    });

    it('darkness > 55 → "Dark atmospheric depth" positive factor for gaming', () => {
      expect(gm({ ...cinematicDna, darkness: 60 }).positiveFactors
        .some(f => f.label === 'Dark atmospheric depth')).toBe(true);
    });

    it('romance > 55 → "Romantic profile misalignment" negative factor for gaming', () => {
      expect(gm({ ...baseDna, romance: 60 }).negativeFactors
        .some(f => f.label === 'Romantic profile misalignment')).toBe(true);
    });
  });

  // ── luxury_brands factor evaluators ───────────────────────────────────────

  describe('luxury_brands factors', () => {
    const lb = (d: DnaInputForSync) =>
      buildWhyScores(d, makeScores()).find(ws => ws.category === 'luxury_brands')!;

    it('warmth > 60 → "Rich, warm texture" positive factor', () => {
      expect(lb({ ...baseDna, primaryGenre: 'classical', warmth: 65 }).positiveFactors
        .some(f => f.label === 'Rich, warm texture')).toBe(true);
    });

    it('aggression > 50 → "Elevated aggression" negative factor for luxury', () => {
      expect(lb({ ...riskDna, primaryGenre: 'jazz' }).negativeFactors
        .some(f => f.label === 'Elevated aggression')).toBe(true);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('all-zero scores still returns 10 WhyScore objects', () => {
      expect(buildWhyScores(lowDna, makeZeroScores())).toHaveLength(10);
    });

    it('unknown genre produces genre misalignment factors across categories', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'zzz-unknown-genre' };
      const results = buildWhyScores(dna, makeScores());
      const misaligned = results.filter(ws =>
        ws.negativeFactors.some(f => f.label.toLowerCase().includes('misalignment')),
      );
      expect(misaligned.length).toBeGreaterThan(0);
    });

    it('ScoreFactor descriptions reference the numeric score value', () => {
      const dna: DnaInputForSync = { ...cinematicDna, tension: 80 };
      const ft = buildWhyScores(dna, makeScores()).find(ws => ws.category === 'film_trailer')!;
      const tensionFactor = ft.positiveFactors.find(f => f.label === 'High cinematic tension')!;
      expect(tensionFactor.description).toContain('80');
    });
  });
});
