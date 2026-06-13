import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeDnaRow, makeEnergyRow, makeSiRow } from './fixtures';

// ── Mock: DB connection (prevents postgres connection attempt on import) ────────
const mockLimit = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockChain = vi.hoisted(() => ({
  from:    vi.fn(),
  where:   vi.fn(),
  orderBy: vi.fn(),
  limit:   mockLimit,
}));

vi.mock('../../../db', () => ({
  db: { select: vi.fn().mockReturnValue(mockChain) },
}));

vi.mock('../../../db/schema', () => ({
  audio_dna:        { upload_id: 'upload_id' },
  energy_analysis:  { upload_id: 'upload_id' },
  sync_intelligence:{ upload_id: 'upload_id', artist_id: 'artist_id', created_at: 'created_at' },
  audio_uploads:    { id: 'id', file_name: 'file_name' },
}));

// drizzle-orm's eq is used as a pass-through in the mock chain
vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return actual;
});

// ── Import service AFTER mocks are in place ────────────────────────────────────
import { getCommercialIntelligenceReport, getArtistCommercialReports } from '../commercial-intelligence.service';

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: chain methods return the chain itself for fluent interface
  mockChain.from.mockReturnValue(mockChain);
  mockChain.where.mockReturnValue(mockChain);
  mockChain.orderBy.mockReturnValue(mockChain);
  mockLimit.mockResolvedValue([]);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getCommercialIntelligenceReport', () => {

  describe('error conditions', () => {
    it('throws "No Audio DNA" when dna row is missing', async () => {
      mockLimit
        .mockResolvedValueOnce([])            // dna: empty
        .mockResolvedValueOnce([makeEnergyRow()])
        .mockResolvedValueOnce([makeSiRow()])
        .mockResolvedValueOnce([{ file_name: 'track.mp3' }]);

      await expect(getCommercialIntelligenceReport('upload-abc'))
        .rejects.toThrow('No Audio DNA');
    });

    it('throws "No Sync Intelligence" when sync_intelligence row is missing', async () => {
      mockLimit
        .mockResolvedValueOnce([makeDnaRow()])
        .mockResolvedValueOnce([makeEnergyRow()])
        .mockResolvedValueOnce([])            // si: empty
        .mockResolvedValueOnce([{ file_name: 'track.mp3' }]);

      await expect(getCommercialIntelligenceReport('upload-abc'))
        .rejects.toThrow('No Sync Intelligence');
    });
  });

  describe('successful report generation', () => {
    it('returns a complete CommercialIntelligenceReport', async () => {
      mockLimit
        .mockResolvedValueOnce([makeDnaRow()])
        .mockResolvedValueOnce([makeEnergyRow()])
        .mockResolvedValueOnce([makeSiRow()])
        .mockResolvedValueOnce([{ file_name: 'afrobeats-track.mp3' }]);

      const report = await getCommercialIntelligenceReport('upload-abc');

      expect(report).toMatchObject({
        uploadId:                   'upload-abc',
        fileName:                   'afrobeats-track.mp3',
        overallSyncScore:           expect.any(Number),
        generatedAt:                expect.any(String),
        whyScores:                  expect.any(Array),
        executiveSyncAssessment:    expect.any(Object),
        commercialPlacementPotential: expect.any(Object),
        marketAlignment:            expect.any(Array),
        revenueForecast:            expect.any(Array),
        comparableArtists:          expect.any(Array),
        syncRiskAssessment:         expect.any(Object),
        decisionEngine:             expect.any(Object),
        datiamVerdict:              expect.any(Object),
      });
    });

    it('whyScores has 10 entries', async () => {
      mockLimit
        .mockResolvedValueOnce([makeDnaRow()])
        .mockResolvedValueOnce([makeEnergyRow()])
        .mockResolvedValueOnce([makeSiRow()])
        .mockResolvedValueOnce([{ file_name: null }]);

      const report = await getCommercialIntelligenceReport('upload-abc');
      expect(report.whyScores).toHaveLength(10);
    });

    it('comparableArtists has 5 entries', async () => {
      mockLimit
        .mockResolvedValueOnce([makeDnaRow()])
        .mockResolvedValueOnce([makeEnergyRow()])
        .mockResolvedValueOnce([makeSiRow()])
        .mockResolvedValueOnce([]);

      const report = await getCommercialIntelligenceReport('upload-abc');
      expect(report.comparableArtists).toHaveLength(5);
    });

    it('fileName is null when upload row is missing', async () => {
      mockLimit
        .mockResolvedValueOnce([makeDnaRow()])
        .mockResolvedValueOnce([makeEnergyRow()])
        .mockResolvedValueOnce([makeSiRow()])
        .mockResolvedValueOnce([]);   // no upload row → fileName = null

      const report = await getCommercialIntelligenceReport('upload-abc');
      expect(report.fileName).toBeNull();
    });

    it('null energy row → report still generates with null energyArc', async () => {
      mockLimit
        .mockResolvedValueOnce([makeDnaRow()])
        .mockResolvedValueOnce([])            // no energy row
        .mockResolvedValueOnce([makeSiRow()])
        .mockResolvedValueOnce([{ file_name: 'track.mp3' }]);

      const report = await getCommercialIntelligenceReport('upload-abc');
      expect(report).toBeTruthy();
      expect(report.uploadId).toBe('upload-abc');
    });

    it('generatedAt is a valid ISO date string', async () => {
      mockLimit
        .mockResolvedValueOnce([makeDnaRow()])
        .mockResolvedValueOnce([makeEnergyRow()])
        .mockResolvedValueOnce([makeSiRow()])
        .mockResolvedValueOnce([{ file_name: null }]);

      const report = await getCommercialIntelligenceReport('upload-abc');
      expect(() => new Date(report.generatedAt)).not.toThrow();
      expect(isNaN(new Date(report.generatedAt).getTime())).toBe(false);
    });

    it('null si.top_categories → falls back to computed ranking', async () => {
      const siRow = { ...makeSiRow(), top_categories: null };
      mockLimit
        .mockResolvedValueOnce([makeDnaRow()])
        .mockResolvedValueOnce([makeEnergyRow()])
        .mockResolvedValueOnce([siRow])
        .mockResolvedValueOnce([{ file_name: 'track.mp3' }]);

      const report = await getCommercialIntelligenceReport('upload-abc');
      expect(report.executiveSyncAssessment.headline).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('getArtistCommercialReports', () => {
  it('returns an empty array when no sync_intelligence rows exist', async () => {
    mockLimit.mockResolvedValueOnce([]);  // no si rows for artist
    const reports = await getArtistCommercialReports('artist-xyz', 10);
    expect(reports).toEqual([]);
  });

  it('returns up to limit reports for a given artist', async () => {
    const si1 = makeSiRow('upload-1', 'artist-xyz');
    const si2 = makeSiRow('upload-2', 'artist-xyz');

    // First call: getArtistCommercialReports queries si rows
    mockLimit.mockResolvedValueOnce([si1, si2]);

    // Subsequent calls: getCommercialIntelligenceReport for each si row
    // upload-1: dna, energy, si, upload
    mockLimit
      .mockResolvedValueOnce([makeDnaRow('upload-1')])
      .mockResolvedValueOnce([makeEnergyRow('upload-1')])
      .mockResolvedValueOnce([si1])
      .mockResolvedValueOnce([{ file_name: 'track-1.mp3' }]);

    // upload-2: dna, energy, si, upload
    mockLimit
      .mockResolvedValueOnce([makeDnaRow('upload-2')])
      .mockResolvedValueOnce([makeEnergyRow('upload-2')])
      .mockResolvedValueOnce([si2])
      .mockResolvedValueOnce([{ file_name: 'track-2.mp3' }]);

    const reports = await getArtistCommercialReports('artist-xyz', 10);
    expect(reports).toHaveLength(2);
    expect(reports[0].uploadId).toBe('upload-1');
    expect(reports[1].uploadId).toBe('upload-2');
  });

  it('skips failed sub-reports (allSettled) and returns only successful ones', async () => {
    const si1 = makeSiRow('upload-1', 'artist-xyz');
    const si2 = makeSiRow('upload-fail', 'artist-xyz');

    mockLimit.mockResolvedValueOnce([si1, si2]);

    // upload-1 succeeds
    mockLimit
      .mockResolvedValueOnce([makeDnaRow('upload-1')])
      .mockResolvedValueOnce([makeEnergyRow('upload-1')])
      .mockResolvedValueOnce([si1])
      .mockResolvedValueOnce([{ file_name: 'ok.mp3' }]);

    // upload-fail: dna row missing → throws → allSettled filters it out
    mockLimit
      .mockResolvedValueOnce([])              // no dna → throws
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([si2])
      .mockResolvedValueOnce([]);

    const reports = await getArtistCommercialReports('artist-xyz', 10);
    expect(reports).toHaveLength(1);
    expect(reports[0].uploadId).toBe('upload-1');
  });
});
