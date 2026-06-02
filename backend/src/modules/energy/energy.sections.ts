import type { EnergyFrame } from './energy.analyzer';

export type SectionType = 'intro' | 'verse' | 'pre_chorus' | 'chorus' | 'bridge' | 'outro';

export interface EnergySection {
  sectionType:          SectionType;
  sectionIndex:         number;
  startTime:            number;
  endTime:              number;
  duration:             number;
  avgRms:               number;
  peakRms:              number;
  avgSpectralCentroid:  number;
  avgSpectralFlux:      number;
  avgZcr:               number;
  energyScore:          number; // 0-100 normalized
  tensionScore:         number; // 0-100 normalized
}

interface SecondWindow {
  second:      number;
  meanRms:     number;
  maxRms:      number;
  meanSc:      number;
  meanFlux:    number;
  meanZcr:     number;
  frameCount:  number;
}

// ------------------------------------------------------------------
// Aggregate Meyda frames into 1-second windows for boundary analysis
// ------------------------------------------------------------------
function aggregateIntoWindows(frames: EnergyFrame[]): SecondWindow[] {
  const buckets = new Map<number, EnergyFrame[]>();

  for (const f of frames) {
    const sec = Math.floor(f.timeSeconds);
    const bucket = buckets.get(sec) ?? [];
    bucket.push(f);
    buckets.set(sec, bucket);
  }

  const windows: SecondWindow[] = [];
  for (const [sec, fs] of buckets) {
    const meanRms  = avg(fs.map(f => f.rms));
    const maxRms   = Math.max(...fs.map(f => f.rms));
    const meanSc   = avg(fs.map(f => f.spectralCentroid).filter(v => v > 0));
    const meanFlux = avg(fs.map(f => f.spectralFlux));
    const meanZcr  = avg(fs.map(f => f.zcr));

    windows.push({ second: sec, meanRms, maxRms, meanSc, meanFlux, meanZcr, frameCount: fs.length });
  }

  return windows.sort((a, b) => a.second - b.second);
}

// Novelty = how different is this second from the previous one
function computeNovelty(windows: SecondWindow[]): number[] {
  const maxRms  = Math.max(...windows.map(w => w.meanRms)) || 1;
  const maxSc   = Math.max(...windows.map(w => w.meanSc))  || 1;
  const maxFlux = Math.max(...windows.map(w => w.meanFlux)) || 1;

  return windows.map((w, i) => {
    if (i === 0) return 0;
    const prev = windows[i - 1];
    const rmsDiff  = Math.abs(w.meanRms  - prev.meanRms)  / maxRms;
    const scDiff   = Math.abs(w.meanSc   - prev.meanSc)   / maxSc;
    const fluxDiff = Math.abs(w.meanFlux - prev.meanFlux) / maxFlux;
    return rmsDiff * 0.40 + scDiff * 0.40 + fluxDiff * 0.20;
  });
}

// Greedy peak-picking with minimum gap enforcement
function pickBoundaries(novelty: number[], durationSeconds: number): number[] {
  const minGapSec   = 8;
  const targetCount = Math.max(2, Math.min(8, Math.floor(durationSeconds / 20)));

  const peaks: Array<{ idx: number; val: number }> = [];
  for (let i = 1; i < novelty.length - 1; i++) {
    if (novelty[i] > novelty[i - 1] && novelty[i] > novelty[i + 1]) {
      peaks.push({ idx: i, val: novelty[i] });
    }
  }
  peaks.sort((a, b) => b.val - a.val);

  const selected: number[] = [];
  for (const peak of peaks) {
    if (selected.length >= targetCount) break;
    const tooClose = selected.some(b => Math.abs(b - peak.idx) < minGapSec);
    if (!tooClose) selected.push(peak.idx);
  }

  return selected.sort((a, b) => a - b);
}

// Convert boundary seconds to Segment objects and compute per-segment stats
function buildSegments(
  boundaries: number[],
  frames: EnergyFrame[],
  durationSeconds: number,
): Omit<EnergySection, 'sectionType' | 'sectionIndex' | 'energyScore' | 'tensionScore'>[] {
  const edges = [0, ...boundaries, Math.ceil(durationSeconds)];
  const segments: Omit<EnergySection, 'sectionType' | 'sectionIndex' | 'energyScore' | 'tensionScore'>[] = [];

  for (let i = 0; i < edges.length - 1; i++) {
    const startTime = edges[i];
    const endTime   = Math.min(edges[i + 1], durationSeconds);
    if (endTime - startTime < 2) continue;

    const segFrames = frames.filter(
      f => f.timeSeconds >= startTime && f.timeSeconds < endTime,
    );

    if (segFrames.length === 0) continue;

    const rmsVals = segFrames.map(f => f.rms);
    const scVals  = segFrames.map(f => f.spectralCentroid).filter(v => v > 0);

    segments.push({
      startTime,
      endTime,
      duration:           endTime - startTime,
      avgRms:             avg(rmsVals),
      peakRms:            Math.max(...rmsVals),
      avgSpectralCentroid: avg(scVals),
      avgSpectralFlux:    avg(segFrames.map(f => f.spectralFlux)),
      avgZcr:             avg(segFrames.map(f => f.zcr)),
    });
  }

  return segments;
}

function labelSections(
  segments: Omit<EnergySection, 'sectionType' | 'sectionIndex' | 'energyScore' | 'tensionScore'>[],
  durationSeconds: number,
  globalMaxRms: number,
): EnergySection[] {
  if (segments.length === 0) return [];

  const sortedByEnergy = [...segments].sort((a, b) => b.avgRms - a.avgRms);
  const maxRms         = globalMaxRms || sortedByEnergy[0].avgRms || 0.001;
  const meanRms        = avg(segments.map(s => s.avgRms));

  // Track used label positions to avoid duplicate "chorus" at start
  let chorusCount = 0;

  const labeled: EnergySection[] = segments.map((seg, i) => {
    const posCenter   = (seg.startTime + seg.endTime) / 2 / durationSeconds;
    const energyRank  = sortedByEnergy.indexOf(seg);
    const energyRatio = seg.avgRms / maxRms;

    // Preceding segment has lower energy → rising (pre-chorus indicator)
    const prevSegment = segments[i - 1];
    const isRising    = prevSegment ? seg.avgRms > prevSegment.avgRms * 1.15 : false;

    let sectionType: SectionType;

    if (posCenter < 0.12) {
      sectionType = 'intro';
    } else if (posCenter > 0.88) {
      sectionType = 'outro';
    } else if (energyRank === 0 || (energyRank === 1 && chorusCount === 0)) {
      sectionType = 'chorus';
      chorusCount++;
    } else if (isRising && energyRatio > 0.55 && posCenter > 0.1 && posCenter < 0.9) {
      sectionType = 'pre_chorus';
    } else if (
      posCenter > 0.45 &&
      posCenter < 0.78 &&
      energyRatio < 0.65 &&
      seg.avgRms < meanRms * 0.9
    ) {
      sectionType = 'bridge';
    } else {
      sectionType = 'verse';
    }

    // Normalize scores 0-100
    const energyScore  = Math.round(Math.min(100, (seg.avgRms / maxRms) * 100));
    const maxSc        = Math.max(...segments.map(s => s.avgSpectralCentroid)) || 1;
    const tensionScore = Math.round(Math.min(100, (seg.avgSpectralCentroid / maxSc) * 100));

    return {
      ...seg,
      sectionType,
      sectionIndex: i,
      energyScore,
      tensionScore,
    };
  });

  return labeled;
}

// ------------------------------------------------------------------
// Public entry point
// ------------------------------------------------------------------
export function detectSections(
  frames: EnergyFrame[],
  durationSeconds: number,
): EnergySection[] {
  if (frames.length === 0 || durationSeconds < 5) return [];

  // Very short tracks: return as single verse
  if (durationSeconds < 30) {
    const rms   = frames.map(f => f.rms);
    const scVals = frames.map(f => f.spectralCentroid).filter(v => v > 0);
    const maxRms = Math.max(...rms) || 1;
    return [{
      sectionType:         'verse',
      sectionIndex:        0,
      startTime:           0,
      endTime:             durationSeconds,
      duration:            durationSeconds,
      avgRms:              avg(rms),
      peakRms:             maxRms,
      avgSpectralCentroid: avg(scVals),
      avgSpectralFlux:     avg(frames.map(f => f.spectralFlux)),
      avgZcr:              avg(frames.map(f => f.zcr)),
      energyScore:         50,
      tensionScore:        50,
    }];
  }

  const windows     = aggregateIntoWindows(frames);
  const novelty     = computeNovelty(windows);
  const boundaries  = pickBoundaries(novelty, durationSeconds);
  const segments    = buildSegments(boundaries, frames, durationSeconds);
  const globalMaxRms = Math.max(...frames.map(f => f.rms)) || 0.001;

  return labelSections(segments, durationSeconds, globalMaxRms);
}

// ------------------------------------------------------------------
// Utilities
// ------------------------------------------------------------------
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
