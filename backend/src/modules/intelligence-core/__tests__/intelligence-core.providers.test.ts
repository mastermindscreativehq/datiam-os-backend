import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeContext, makeSong, makeAudioDna, makeSyncIntelligence } from './fixtures';

// commercialProvider calls into the real commercial-intelligence engine —
// mock it so this stays a pure unit test with no DB dependency.
const mockGetReport = vi.hoisted(() => vi.fn());
vi.mock('../../commercial-intelligence/commercial-intelligence.service', () => ({
  getCommercialIntelligenceReport: mockGetReport,
}));

import { commercialProvider, syncProvider, playlistProvider } from '../intelligence-core.providers';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('commercialProvider', () => {
  it('reuses the Commercial Intelligence report when audio analysis exists', async () => {
    mockGetReport.mockResolvedValue({
      commercialPlacementPotential: { score: 81, classification: 'Strong' },
      datiamVerdict: {
        executiveSummary: 'Strong sync potential across film and gaming.',
        recommendation: 'Targeted Outreach',
        bestOpportunity: 'Film Trailer',
        bestAudience: ['Gen Z', 'Sports fans'],
      },
      revenueTierForecast: { expected: { formattedTotal: '$5k-$15k' } },
    });

    const ctx = makeContext({
      resolvedUpload: { id: 'upload-1' } as any,
      audioDna: makeAudioDna(),
      syncIntelligence: makeSyncIntelligence(),
    });

    const result = await commercialProvider.analyze(ctx);

    expect(mockGetReport).toHaveBeenCalledWith('upload-1');
    expect(result.dataCompleteness).toBe('full');
    expect(result.score).toBe(81);
    expect(result.summary).toContain('Strong sync potential');
  });

  it('falls back to a metadata-only genre heuristic when no audio analysis exists', async () => {
    const ctx = makeContext({ release: { ...makeContext().release, genre: 'pop' } as any, pastReleaseCount: 2 });

    const result = await commercialProvider.analyze(ctx);

    expect(mockGetReport).not.toHaveBeenCalled();
    expect(result.dataCompleteness).toBe('metadata_only');
    expect(result.score).not.toBeNull();
    expect(result.summary).toContain('No audio analysis yet');
  });

  it('returns a null score when there is no genre and no audio analysis', async () => {
    const ctx = makeContext({ release: { ...makeContext().release, genre: null } as any });

    const result = await commercialProvider.analyze(ctx);

    expect(result.score).toBeNull();
    expect(result.dataCompleteness).toBe('metadata_only');
  });

  it('falls back gracefully if the commercial-intelligence call throws', async () => {
    mockGetReport.mockRejectedValue(new Error('No Audio DNA analysis found'));
    const ctx = makeContext({
      resolvedUpload: { id: 'upload-1' } as any,
      audioDna: makeAudioDna(),
      syncIntelligence: makeSyncIntelligence(),
    });

    const result = await commercialProvider.analyze(ctx);

    expect(result.dataCompleteness).toBe('metadata_only');
  });
});

describe('syncProvider', () => {
  it('reads sync_intelligence directly when present', async () => {
    const ctx = makeContext({ syncIntelligence: makeSyncIntelligence() });

    const result = await syncProvider.analyze(ctx);

    expect(result.score).toBe(62.5);
    expect(result.dataCompleteness).toBe('full');
    expect(result.summary).toContain('Film Trailer');
  });

  it('flags missing audio analysis with a null score instead of fabricating one', async () => {
    const ctx = makeContext({ syncIntelligence: null });

    const result = await syncProvider.analyze(ctx);

    expect(result.score).toBeNull();
    expect(result.dataCompleteness).toBe('metadata_only');
    expect(result.summary).toContain('requires audio analysis');
  });
});

describe('playlistProvider', () => {
  it('scores from real audio_dna + song signals when available (full completeness)', async () => {
    const ctx = makeContext({
      songs: [makeSong({ bpm: 108, duration_seconds: 180, energy_score: '0.80' })],
      audioDna: makeAudioDna({ danceability: '80.00' }),
    });

    const result = await playlistProvider.analyze(ctx);

    expect(result.score).not.toBeNull();
    expect(result.score as number).toBeGreaterThan(60);
    expect(result.dataCompleteness).toBe('full');
  });

  it('degrades to genre/duration heuristic when no audio_dna or energy_score exists', async () => {
    const ctx = makeContext({
      songs: [makeSong({ energy_score: null, bpm: null, duration_seconds: 200 })],
      audioDna: null,
      release: { ...makeContext().release, genre: 'afrobeats' } as any,
    });

    const result = await playlistProvider.analyze(ctx);

    expect(result.score).not.toBeNull();
    expect(result.dataCompleteness).toBe('metadata_only');
  });

  it('returns a null score when there is truly no signal at all', async () => {
    const ctx = makeContext({
      songs: [],
      audioDna: null,
      release: { ...makeContext().release, genre: null } as any,
    });

    const result = await playlistProvider.analyze(ctx);

    expect(result.score).toBeNull();
    expect(result.dataCompleteness).toBe('metadata_only');
  });

  it('rewards a duration in the 2:30-3:30 sweet spot over an outlier duration', async () => {
    const sweetSpot = await playlistProvider.analyze(
      makeContext({ songs: [makeSong({ duration_seconds: 180, bpm: null, energy_score: null })], audioDna: null, release: { ...makeContext().release, genre: null } as any }),
    );
    const outlier = await playlistProvider.analyze(
      makeContext({ songs: [makeSong({ duration_seconds: 600, bpm: null, energy_score: null })], audioDna: null, release: { ...makeContext().release, genre: null } as any }),
    );

    expect((sweetSpot.score as number)).toBeGreaterThan(outlier.score as number);
  });
});
