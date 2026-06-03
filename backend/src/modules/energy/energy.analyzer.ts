import ffmpeg from 'fluent-ffmpeg';
import Meyda from 'meyda';
import os from 'os';
import path from 'path';
import fs from 'fs';

export const SAMPLE_RATE      = 22050;
export const FRAME_SIZE       = 4096;  // ~186ms per frame at 22050 Hz
export const HOP_SIZE         = 2048;  // ~93ms hop, 50% overlap
export const ANALYZER_VERSION = '1.0.0';

export interface EnergyFrame {
  timeSeconds:      number;
  rms:              number;
  energy:           number;
  zcr:              number;
  spectralCentroid: number;
  spectralFlux:     number;
  spectralRolloff:  number;
  mfcc:             number[];
}

export interface RawEnergyData {
  frames:           EnergyFrame[];
  durationSeconds:  number;
  sampleRate:       number;
  frameSize:        number;
  hopSize:          number;
  analyzerVersion:  string;
}

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

async function decodeAudioToPCM(inputPath: string): Promise<Buffer> {
  const tmpOut = path.join(
    os.tmpdir(),
    `energy_pcm_${Date.now()}_${Math.random().toString(36).slice(2)}.raw`,
  );

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(['aresample=22050', 'pan=mono|c0=0.5*FL+0.5*FR'])
        .format('f32le')
        .output(tmpOut)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    return fs.promises.readFile(tmpOut);
  } finally {
    fs.unlink(tmpOut, () => {});
  }
}

async function probeAudioDuration(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(inputPath, (err, meta) => {
      resolve(err ? 0 : parseFloat(String(meta.format.duration ?? '0')));
    });
  });
}

export async function extractEnergyFrames(inputPath: string): Promise<RawEnergyData> {
  const [pcmBuffer, duration] = await Promise.all([
    decodeAudioToPCM(inputPath),
    probeAudioDuration(inputPath),
  ]);

  // View the Node.js Buffer as Float32Array (f32le, little-endian)
  const samples = new Float32Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    pcmBuffer.byteLength / 4,
  );

  // Configure Meyda for offline (batch) analysis
  Meyda.bufferSize         = FRAME_SIZE;
  Meyda.sampleRate         = SAMPLE_RATE;
  Meyda.windowingFunction  = 'hanning';

  const frames: EnergyFrame[] = [];
  let prevFrame: Float32Array | null = null;

  // Yield the event loop every 100 frames so IORedis keepalives, BullMQ
  // heartbeats, and TCP reads can fire during long extractions.  Without this
  // the synchronous Meyda FFT+MFCC loop blocks Node.js for tens of seconds on
  // large files, causing Railway's proxy idle-timeout to drop the Redis socket.
  const YIELD_INTERVAL = 100;

  // Base extractors that are always safe regardless of whether a previous frame exists.
  const BASE_EXTRACTORS = ['rms', 'energy', 'zcr', 'spectralCentroid', 'spectralRolloff', 'mfcc'] as const;
  // spectralFlux requires a previous frame's signal; including it without one causes
  // Meyda to throw a TypeError when it attempts to FFT an undefined buffer.
  const FLUX_EXTRACTORS  = [...BASE_EXTRACTORS, 'spectralFlux'] as const;

  for (let i = 0; i + FRAME_SIZE <= samples.length; i += HOP_SIZE) {
    const frameIndex = frames.length;
    const frame      = samples.subarray(i, i + FRAME_SIZE);
    const hasPrev    = prevFrame !== null;
    const extractors = hasPrev ? FLUX_EXTRACTORS : BASE_EXTRACTORS;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let features: Record<string, any> | null = null;
    try {
      features = Meyda.extract(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extractors as any,
        frame,
        hasPrev ? prevFrame! : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as Record<string, any> | null;
    } catch (err) {
      // Log but do not crash the worker — a single bad frame should not abort the job.
      console.error(
        `[EnergyAnalyzer] Frame ${frameIndex} extraction failed (extractors: ${extractors.join(', ')}):`,
        err,
      );
    }

    if (features) {
      const rawMfcc: unknown = features['mfcc'];
      const mfcc: number[] =
        rawMfcc instanceof Float32Array
          ? Array.from(rawMfcc).map(safeNum)
          : Array.isArray(rawMfcc)
          ? (rawMfcc as number[]).map(safeNum)
          : [];

      frames.push({
        timeSeconds:      i / SAMPLE_RATE,
        rms:              safeNum(features['rms']),
        energy:           safeNum(features['energy']),
        zcr:              safeNum(features['zcr']),
        spectralCentroid: safeNum(features['spectralCentroid']),
        // 0 on the first frame (no previous spectrum to diff against)
        spectralFlux:     hasPrev ? safeNum(features['spectralFlux']) : 0,
        spectralRolloff:  safeNum(features['spectralRolloff']),
        mfcc,
      });
    }

    // Copy needed so spectralFlux has a stable reference for the next iteration.
    prevFrame = new Float32Array(frame);

    if (frames.length % YIELD_INTERVAL === 0) {
      await new Promise<void>(resolve => setImmediate(resolve));
    }
  }

  const actualDuration = duration > 0 ? duration : samples.length / SAMPLE_RATE;

  return {
    frames,
    durationSeconds: actualDuration,
    sampleRate:      SAMPLE_RATE,
    frameSize:       FRAME_SIZE,
    hopSize:         HOP_SIZE,
    analyzerVersion: ANALYZER_VERSION,
  };
}
