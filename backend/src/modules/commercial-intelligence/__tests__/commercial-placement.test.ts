import { describe, it, expect } from 'vitest';
import { buildCommercialPlacementPotential } from '../commercial-placement';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildCommercialPlacementPotential', () => {

  // ── Tier boundaries ────────────────────────────────────────────────────────

  describe('Exceptional tier (81–100)', () => {
    it('score 100 → Exceptional, cyan', () => {
      const r = buildCommercialPlacementPotential(100);
      expect(r.classification).toBe('Exceptional');
      expect(r.colorKey).toBe('cyan');
    });

    it('score 81 → Exceptional', () => {
      expect(buildCommercialPlacementPotential(81).classification).toBe('Exceptional');
    });

    it('score 90 → Exceptional', () => {
      expect(buildCommercialPlacementPotential(90).classification).toBe('Exceptional');
    });
  });

  describe('Strong tier (61–80)', () => {
    it('score 80 → Strong, green', () => {
      const r = buildCommercialPlacementPotential(80);
      expect(r.classification).toBe('Strong');
      expect(r.colorKey).toBe('green');
    });

    it('score 61 → Strong', () => {
      expect(buildCommercialPlacementPotential(61).classification).toBe('Strong');
    });

    it('score 70 → Strong', () => {
      expect(buildCommercialPlacementPotential(70).classification).toBe('Strong');
    });
  });

  describe('Moderate tier (41–60)', () => {
    it('score 60 → Moderate, yellow', () => {
      const r = buildCommercialPlacementPotential(60);
      expect(r.classification).toBe('Moderate');
      expect(r.colorKey).toBe('yellow');
    });

    it('score 41 → Moderate', () => {
      expect(buildCommercialPlacementPotential(41).classification).toBe('Moderate');
    });

    it('score 50 → Moderate', () => {
      expect(buildCommercialPlacementPotential(50).classification).toBe('Moderate');
    });
  });

  describe('Low tier (21–40)', () => {
    it('score 40 → Low, orange', () => {
      const r = buildCommercialPlacementPotential(40);
      expect(r.classification).toBe('Low');
      expect(r.colorKey).toBe('orange');
    });

    it('score 21 → Low', () => {
      expect(buildCommercialPlacementPotential(21).classification).toBe('Low');
    });

    it('score 30 → Low', () => {
      expect(buildCommercialPlacementPotential(30).classification).toBe('Low');
    });
  });

  describe('Very Low tier (0–20)', () => {
    it('score 20 → Very Low, red', () => {
      const r = buildCommercialPlacementPotential(20);
      expect(r.classification).toBe('Very Low');
      expect(r.colorKey).toBe('red');
    });

    it('score 0 → Very Low, red', () => {
      const r = buildCommercialPlacementPotential(0);
      expect(r.classification).toBe('Very Low');
      expect(r.colorKey).toBe('red');
    });

    it('score 1 → Very Low', () => {
      expect(buildCommercialPlacementPotential(1).classification).toBe('Very Low');
    });
  });

  // ── Score field ────────────────────────────────────────────────────────────

  describe('score field', () => {
    it('score field is Math.round of input', () => {
      expect(buildCommercialPlacementPotential(75.7).score).toBe(76);
      expect(buildCommercialPlacementPotential(75.4).score).toBe(75);
    });

    it('rounding can push score into different tier (80.5 → 81 → Exceptional)', () => {
      const r = buildCommercialPlacementPotential(80.5);
      expect(r.score).toBe(81);
      expect(r.classification).toBe('Exceptional');
    });

    it('rounding stays in same tier for mid-range (50.4 → 50 → Moderate)', () => {
      const r = buildCommercialPlacementPotential(50.4);
      expect(r.score).toBe(50);
      expect(r.classification).toBe('Moderate');
    });
  });

  // ── Description field ─────────────────────────────────────────────────────

  describe('description field', () => {
    it('returns a non-empty description string', () => {
      for (const score of [5, 30, 50, 70, 90]) {
        expect(buildCommercialPlacementPotential(score).description.length).toBeGreaterThan(0);
      }
    });

    it('Exceptional description mentions "Elite"', () => {
      expect(buildCommercialPlacementPotential(90).description).toContain('Elite');
    });
  });
});
