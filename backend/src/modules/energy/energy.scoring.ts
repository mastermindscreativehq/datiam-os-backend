import type { EnergyFrame } from './energy.analyzer';
import type { EnergySection } from './energy.sections';

export type EnergyArc    = 'slow_burn' | 'explosive' | 'steady' | 'rollercoaster' | 'plateau';
export type TensionCurve = 'ascending'  | 'descending' | 'plateau' | 'wave';

export interface EnergyIntelligence {
  energyArc:         EnergyArc;
  peakMoment:        string;        // "MM:SS"
  dropStrength:      number;        // 0-100
  energyVolatility:  number;        // 0-100
  tensionCurve:      TensionCurve;
  replayRetention:   number;        // 0-100
}

export interface EnergyCurvePoint {
  t:   number;  // time in seconds (integer)
  rms: number;  // 0-1 (4 decimal places)
  sc:  number;  // spectral centroid Hz (integer)
}

// ------------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------------

interface SecondBucket {
  meanRms: number;
  meanSc:  number;
}

function buildSecondBuckets(frames: EnergyFrame[]): SecondBucket[] {
  const map = new Map<number, EnergyFrame[]>();
  for (const f of frames) {
    const s = Math.floor(f.timeSeconds);
    const bucket = map.get(s) ?? [];
    bucket.push(f);
    map.set(s, bucket);
  }

  const sorted = [...map.entries()].sort((a, b) => a[0] - b[0]);
  return sorted.map(([, fs]) => ({
    meanRms: avg(fs.map(f => f.rms)),
    meanSc:  avg(fs.map(f => f.spectralCentroid).filter(v => v > 0)),
  }));
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = avg(values);
  return Math.sqrt(avg(values.map(v => (v - m) ** 2)));
}

function formatTimestamp(seconds: number): string {
  const s   = Math.max(0, Math.round(seconds));
  const mm  = String(Math.floor(s / 60)).padStart(2, '0');
  const ss  = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ------------------------------------------------------------------
// Scoring functions
// ------------------------------------------------------------------

function classifyEnergyArc(buckets: SecondBucket[]): EnergyArc {
  if (buckets.length < 8) return 'steady';

  const rmsVals  = buckets.map(b => b.meanRms);
  const overallM = avg(rmsVals);
  const overallS = stdDev(rmsVals);
  const cv       = overallM > 0 ? overallS / overallM : 0;

  if (cv < 0.12) return 'steady';

  // Direction changes (rollercoaster detection)
  let dirChanges = 0;
  let prevDir    = 0;
  for (let i = 1; i < rmsVals.length; i++) {
    const dir = rmsVals[i] > rmsVals[i - 1] ? 1 : -1;
    if (prevDir !== 0 && dir !== prevDir) dirChanges++;
    prevDir = dir;
  }
  if (dirChanges / rmsVals.length > 0.20) return 'rollercoaster';

  // Peak position
  const maxIdx  = rmsVals.indexOf(Math.max(...rmsVals));
  const peakPos = maxIdx / rmsVals.length;

  if (peakPos < 0.28) return 'explosive';
  if (peakPos > 0.72) return 'slow_burn';

  // Plateau: sustained high energy in the middle
  const highFraction = rmsVals.filter(v => v >= overallM * 1.15).length / rmsVals.length;
  if (highFraction > 0.35) return 'plateau';

  return 'slow_burn';
}

function findPeakMoment(frames: EnergyFrame[]): string {
  if (frames.length === 0) return '00:00';
  const peak = frames.reduce((best, f) => (f.rms > best.rms ? f : best), frames[0]);
  return formatTimestamp(peak.timeSeconds);
}

function computeDropStrength(buckets: SecondBucket[]): number {
  if (buckets.length < 10) return 0;

  const rms    = buckets.map(b => b.meanRms);
  const maxRms = Math.max(...rms) || 0.001;

  let maxContrast = 0;

  // Slide a valley-to-peak window of 4-16 seconds
  for (let valley = 0; valley < rms.length - 4; valley++) {
    for (let peak = valley + 4; peak < Math.min(valley + 16, rms.length); peak++) {
      const contrast = (rms[peak] - rms[valley]) / maxRms;
      if (contrast > maxContrast) maxContrast = contrast;
    }
  }

  return Math.round(Math.min(100, maxContrast * 100));
}

function computeEnergyVolatility(buckets: SecondBucket[]): number {
  const rms = buckets.map(b => b.meanRms);
  const m   = avg(rms);
  if (m === 0) return 0;
  const cv  = stdDev(rms) / m;
  // CV of 0.5 → 100; typical dynamic tracks: 0.2-0.4
  return Math.round(Math.min(100, cv * 200));
}

function classifyTensionCurve(buckets: SecondBucket[]): TensionCurve {
  const scVals = buckets.map(b => b.meanSc).filter(v => v > 0);
  if (scVals.length < 4) return 'plateau';

  // Linear regression slope
  const n      = scVals.length;
  const xMean  = (n - 1) / 2;
  const yMean  = avg(scVals);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (scVals[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den > 0 ? num / den : 0;

  const scRange         = Math.max(...scVals) - Math.min(...scVals);
  const normalizedSlope = scRange > 0 ? (slope / (scRange / n)) : 0;

  // Wave: many direction changes in spectral centroid
  let changes  = 0;
  let prevDir2 = 0;
  for (let i = 1; i < scVals.length; i++) {
    const dir = scVals[i] > scVals[i - 1] ? 1 : -1;
    if (prevDir2 !== 0 && dir !== prevDir2) changes++;
    prevDir2 = dir;
  }
  if (changes / scVals.length > 0.22) return 'wave';

  if (normalizedSlope > 0.25) return 'ascending';
  if (normalizedSlope < -0.25) return 'descending';
  return 'plateau';
}

function computeReplayRetention(
  buckets:      SecondBucket[],
  dropStrength: number,
): number {
  const rms = buckets.map(b => b.meanRms);
  if (rms.length === 0) return 0;

  const n    = rms.length;
  const sorted = [...rms].sort((a, b) => a - b);
  const p70  = sorted[Math.floor(n * 0.70)] ?? 0;

  // Hook density: fraction of track above 70th percentile energy, scaled to 0-100
  const hookDensity = Math.min(100, (rms.filter(v => v >= p70).length / n) * 300);

  // Intro engagement: is first 20% of track at or above average?
  const intro     = rms.slice(0, Math.max(1, Math.floor(n * 0.20)));
  const introAvg  = avg(intro);
  const overallM  = avg(rms) || 0.001;
  const introEngage = Math.min(100, (introAvg / overallM) * 80);

  // Energy level: how loud is the peak relative to reference
  const peakRms    = Math.max(...rms);
  const energyLevel = Math.min(100, (peakRms / 0.30) * 100); // 0.30 = typical loud track RMS

  const score =
    hookDensity  * 0.35 +
    dropStrength * 0.30 +
    introEngage  * 0.15 +
    energyLevel  * 0.20;

  return Math.round(Math.min(100, score));
}

// ------------------------------------------------------------------
// Energy curve for visualization (downsampled to ~1 pt / 0.5 s)
// ------------------------------------------------------------------
export function buildEnergyCurve(
  frames: EnergyFrame[],
  maxPoints = 600,
): EnergyCurvePoint[] {
  if (frames.length === 0) return [];

  const maxRms = Math.max(...frames.map(f => f.rms)) || 1;
  const step   = Math.max(1, Math.ceil(frames.length / maxPoints));
  const curve: EnergyCurvePoint[] = [];

  for (let i = 0; i < frames.length; i += step) {
    const window = frames.slice(i, i + step);
    const rms    = avg(window.map(f => f.rms));
    const sc     = avg(window.map(f => f.spectralCentroid).filter(v => v > 0));

    curve.push({
      t:   parseFloat(frames[i].timeSeconds.toFixed(1)),
      rms: parseFloat((rms / maxRms).toFixed(4)),
      sc:  Math.round(sc),
    });
  }

  return curve;
}

// ------------------------------------------------------------------
// Public entry point
// ------------------------------------------------------------------
export function computeEnergyIntelligence(
  frames:   EnergyFrame[],
  sections: EnergySection[],
): EnergyIntelligence {
  void sections; // sections reserved for future AI enrichment

  const buckets       = buildSecondBuckets(frames);
  const energyArc     = classifyEnergyArc(buckets);
  const peakMoment    = findPeakMoment(frames);
  const dropStrength  = computeDropStrength(buckets);
  const energyVol     = computeEnergyVolatility(buckets);
  const tensionCurve  = classifyTensionCurve(buckets);
  const replayRet     = computeReplayRetention(buckets, dropStrength);

  return {
    energyArc,
    peakMoment,
    dropStrength,
    energyVolatility: energyVol,
    tensionCurve,
    replayRetention:  replayRet,
  };
}
