import { describe, it, expect } from 'vitest';
import { buildRevenueForecast } from '../revenue-forecast';
import { makeScores, makeZeroScores } from './fixtures';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildRevenueForecast', () => {

  // ── Output structure ───────────────────────────────────────────────────────

  describe('output structure', () => {
    it('returns exactly 10 RevenueForecast objects', () => {
      expect(buildRevenueForecast(makeScores())).toHaveLength(10);
    });

    it('each entry has all required fields', () => {
      for (const rf of buildRevenueForecast(makeScores())) {
        expect(rf).toMatchObject({
          category:              expect.any(String),
          label:                 expect.any(String),
          licenseRangeMin:       expect.any(Number),
          licenseRangeMax:       expect.any(Number),
          formattedRange:        expect.any(String),
          likelihood:            expect.any(String),
          revenueClass:          expect.any(String),
          commercialValue:       expect.any(String),
          annualEstimateMin:     expect.any(Number),
          annualEstimateMax:     expect.any(Number),
          formattedAnnualEstimate: expect.any(String),
        });
      }
    });

    it('sorted by licenseRangeMax descending', () => {
      const results = buildRevenueForecast(makeScores());
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].licenseRangeMax).toBeGreaterThanOrEqual(results[i + 1].licenseRangeMax);
      }
    });
  });

  // ── Likelihood tiers ───────────────────────────────────────────────────────

  describe('likelihood tiers', () => {
    it('score >= 75 → likelihood "High"', () => {
      const scores = makeScores({ film_trailer: { score: 80 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      expect(ft.likelihood).toBe('High');
    });

    it('score 74 → likelihood "Medium"', () => {
      const scores = makeScores({ film_trailer: { score: 74 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      expect(ft.likelihood).toBe('Medium');
    });

    it('score >= 55 → likelihood "Medium"', () => {
      const scores = makeScores({ film_trailer: { score: 60 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      expect(ft.likelihood).toBe('Medium');
    });

    it('score 54 → likelihood "Low"', () => {
      const scores = makeScores({ film_trailer: { score: 54 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      expect(ft.likelihood).toBe('Low');
    });

    it('score >= 35 → likelihood "Low"', () => {
      const scores = makeScores({ film_trailer: { score: 40 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      expect(ft.likelihood).toBe('Low');
    });

    it('score 34 → likelihood "Very Low"', () => {
      const scores = makeScores({ film_trailer: { score: 34 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      expect(ft.likelihood).toBe('Very Low');
    });

    it('score 0 → likelihood "Very Low"', () => {
      const scores = makeZeroScores();
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      expect(ft.likelihood).toBe('Very Low');
    });
  });

  // ── RevenueClass tiers ─────────────────────────────────────────────────────

  describe('revenueClass tiers', () => {
    it('score >= 75 → "Premium"',   () => expect(buildRevenueForecast(makeScores({ film_trailer: { score: 80 } })).find(r => r.category === 'film_trailer')!.revenueClass).toBe('Premium'));
    it('score 60  → "Emerging"',    () => expect(buildRevenueForecast(makeScores({ film_trailer: { score: 60 } })).find(r => r.category === 'film_trailer')!.revenueClass).toBe('Emerging'));
    it('score 40  → "Speculative"', () => expect(buildRevenueForecast(makeScores({ film_trailer: { score: 40 } })).find(r => r.category === 'film_trailer')!.revenueClass).toBe('Speculative'));
    it('score 20  → "Marginal"',    () => expect(buildRevenueForecast(makeScores({ film_trailer: { score: 20 } })).find(r => r.category === 'film_trailer')!.revenueClass).toBe('Marginal'));
  });

  // ── License range scaling ──────────────────────────────────────────────────

  describe('license range scaling', () => {
    it('score >= 75 uses factor 1.0 → full base range', () => {
      const scores = makeScores({ film_trailer: { score: 80 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      // film_trailer baseMin=8000, baseMax=75000, factor 1.0
      expect(ft.licenseRangeMin).toBe(8_000);
      expect(ft.licenseRangeMax).toBe(75_000);
    });

    it('score 60 uses factor 0.7', () => {
      const scores = makeScores({ film_trailer: { score: 60 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      // 8000*0.7=5600, 75000*0.7=52500
      expect(ft.licenseRangeMin).toBe(5_600);
      expect(ft.licenseRangeMax).toBe(52_500);
    });

    it('score 40 uses factor 0.4', () => {
      const scores = makeScores({ film_trailer: { score: 40 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      // 8000*0.4=3200, 75000*0.4=30000
      expect(ft.licenseRangeMin).toBe(3_200);
      expect(ft.licenseRangeMax).toBe(30_000);
    });

    it('score 20 uses factor 0.15', () => {
      const scores = makeScores({ film_trailer: { score: 20 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      // 8000*0.15=1200, 75000*0.15=11250
      expect(ft.licenseRangeMin).toBe(1_200);
      expect(ft.licenseRangeMax).toBe(11_250);
    });
  });

  // ── Currency formatting ────────────────────────────────────────────────────

  describe('currency formatting', () => {
    it('formattedRange contains a dash separator', () => {
      for (const rf of buildRevenueForecast(makeScores())) {
        expect(rf.formattedRange).toContain('–');
      }
    });

    it('values >= $1000 are formatted as "$XK"', () => {
      const scores = makeScores({ film_trailer: { score: 80 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      // 8000 → $8K, 75000 → $75K
      expect(ft.formattedRange).toContain('$8K');
      expect(ft.formattedRange).toContain('$75K');
    });

    it('values < $1000 are formatted as "$X"', () => {
      // social_content baseMin=200 * 0.15 = 30 (score 20)
      const scores = makeScores({ social_content: { score: 20 } });
      const sc = buildRevenueForecast(scores).find(rf => rf.category === 'social_content')!;
      expect(sc.formattedRange).toContain('$30');
    });

    it('formattedAnnualEstimate ends with "/yr"', () => {
      for (const rf of buildRevenueForecast(makeScores())) {
        expect(rf.formattedAnnualEstimate).toContain('/yr');
      }
    });
  });

  // ── Annual estimate calculation ────────────────────────────────────────────

  describe('annual estimates', () => {
    it('High likelihood uses placementsPerYearHigh', () => {
      const scores = makeScores({ film_trailer: { score: 80 } });
      const ft = buildRevenueForecast(scores).find(rf => rf.category === 'film_trailer')!;
      // film_trailer High: 3 placements/yr; rangeMin=8000, rangeMax=75000
      expect(ft.annualEstimateMin).toBe(8_000 * 3);
      expect(ft.annualEstimateMax).toBe(75_000 * 3);
    });

    it('annualEstimateMin <= annualEstimateMax', () => {
      for (const rf of buildRevenueForecast(makeScores())) {
        expect(rf.annualEstimateMin).toBeLessThanOrEqual(rf.annualEstimateMax);
      }
    });
  });
});
