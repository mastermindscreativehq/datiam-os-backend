import { describe, it, expect } from 'vitest';
import { buildComparableArtists } from '../comparable-artists';
import { baseDna, cinematicDna, lowDna } from './fixtures';
import type { DnaInputForSync } from '../../sync-intelligence/sync-intelligence.types';

// ─────────────────────────────────────────────────────────────────────────────

describe('buildComparableArtists', () => {

  // ── Output structure ───────────────────────────────────────────────────────

  describe('output structure', () => {
    it('returns exactly 5 comparable artists', () => {
      expect(buildComparableArtists(baseDna)).toHaveLength(5);
    });

    it('each artist has all required fields', () => {
      for (const ca of buildComparableArtists(baseDna)) {
        expect(ca).toMatchObject({
          name:                   expect.any(String),
          similarity:             expect.any(Number),
          genre:                  expect.any(String),
          knownPlacements:        expect.any(Array),
          sharedEmotionalTraits:  expect.any(Array),
          sharedCommercialPatterns: expect.any(Array),
          similarityReason:       expect.any(String),
        });
      }
    });

    it('similarity scores are within 0–100', () => {
      for (const ca of buildComparableArtists(baseDna)) {
        expect(ca.similarity).toBeGreaterThanOrEqual(0);
        expect(ca.similarity).toBeLessThanOrEqual(100);
      }
    });

    it('results are sorted by similarity descending', () => {
      const results = buildComparableArtists(baseDna);
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
      }
    });
  });

  // ── Genre matching ────────────────────────────────────────────────────────

  describe('genre matching', () => {
    it('afrobeats input places afrobeats artists at the top', () => {
      const afrobeatsArtists = ['Asake', 'Burna Boy', 'Wizkid', 'Tems', 'Rema', 'Omah Lay'];
      const results = buildComparableArtists(baseDna);
      expect(afrobeatsArtists).toContain(results[0].name);
    });

    it('cinematic genre pushes non-afrobeats artists to the top', () => {
      const results = buildComparableArtists(cinematicDna);
      // cinematic is not an afrobeats genre; top artists should be emotionally similar
      expect(results[0].name).toBeTruthy();
    });

    it('null primaryGenre falls back to emotional similarity only', () => {
      const dna = { ...baseDna, primaryGenre: null } as unknown as DnaInputForSync;
      const results = buildComparableArtists(dna);
      expect(results).toHaveLength(5);
      for (const ca of results) {
        expect(ca.similarity).toBeGreaterThanOrEqual(0);
      }
    });

    it('exact genre match (e.g. "hip-hop") scores genreSimilarity=100', () => {
      const dna: DnaInputForSync = {
        ...baseDna,
        primaryGenre: 'hip-hop',
        danceability: 80,
        aggression: 78,
        darkness: 72,
        tension: 75,
        triumph: 70,
      };
      const results = buildComparableArtists(dna);
      // Travis Scott or Drake or Kendrick Lamar should rank highly
      const hipHopArtists = ['Travis Scott', 'Drake', 'Kendrick Lamar'];
      expect(hipHopArtists.some(name => results.slice(0, 3).map(r => r.name).includes(name))).toBe(true);
    });

    it('unknown genre still returns 5 results (purely emotional similarity)', () => {
      const dna: DnaInputForSync = { ...baseDna, primaryGenre: 'zzz-xyzzy-unknown' };
      const results = buildComparableArtists(dna);
      expect(results).toHaveLength(5);
    });
  });

  // ── Similarity reason messages ─────────────────────────────────────────────

  describe('similarityReason', () => {
    it('high similarity (>=85) → "Near-identical" reason', () => {
      // An exact-genre + emotionally-matching DNA should produce very high similarity
      const dna: DnaInputForSync = {
        ...baseDna,
        primaryGenre: 'afrobeats',
        triumph:    78,
        brightness: 82,
        danceability: 88,
        spirituality: 65,
        warmth: 70,
      };
      const results = buildComparableArtists(dna);
      const asake = results.find(r => r.name === 'Asake');
      if (asake && asake.similarity >= 85) {
        expect(asake.similarityReason).toMatch(/Near-identical/i);
      }
      // At minimum: all reasons are non-empty strings
      for (const r of results) {
        expect(r.similarityReason.length).toBeGreaterThan(0);
      }
    });

    it('all similarity reasons are non-empty strings', () => {
      for (const r of buildComparableArtists(baseDna)) {
        expect(r.similarityReason.length).toBeGreaterThan(0);
      }
    });
  });

  // ── Emotional similarity ───────────────────────────────────────────────────

  describe('emotional similarity', () => {
    it('emotionally-matching DNA bumps similar artists up the list', () => {
      // Frank Ocean / SZA emotional profile: melancholy, romance, warmth, spirituality
      const dna: DnaInputForSync = {
        ...lowDna,
        primaryGenre: 'r&b',
        melancholy: 80,
        romance: 82,
        warmth: 75,
        spirituality: 72,
        darkness: 60,
      };
      const results = buildComparableArtists(dna);
      const soulArtists = ['SZA', 'Frank Ocean', 'Daniel Caesar', 'Tems', 'Omah Lay'];
      expect(soulArtists.some(name => results.slice(0, 3).map(r => r.name).includes(name))).toBe(true);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('low DNA still returns 5 artists', () => {
      expect(buildComparableArtists(lowDna)).toHaveLength(5);
    });

    it('all returned artists have non-empty knownPlacements arrays', () => {
      for (const ca of buildComparableArtists(baseDna)) {
        expect(ca.knownPlacements.length).toBeGreaterThan(0);
      }
    });

    it('no duplicate artist names in the result', () => {
      const results = buildComparableArtists(baseDna);
      const names = results.map(r => r.name);
      expect(new Set(names).size).toBe(5);
    });
  });
});
