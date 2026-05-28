import ffmpeg from 'fluent-ffmpeg';
import os from 'os';
import path from 'path';
import fs from 'fs';

ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
ffmpeg.setFfprobePath('/usr/bin/ffprobe');

export interface AudioMetadata {
  duration_seconds: number;
  sample_rate: number;
  bit_rate: number;
  channels: number;
  format: string;
  codec: string;
}

export interface FFmpegAnalysisResult {
  bpm: number | null;
  duration_seconds: number;
  loudness_lufs: number | null;
  peak_db: number | null;
  sample_rate: number;
  bit_rate: number;
  channels: number;
  format: string;
  spectral_centroid: number | null;
  waveform_data: number[];
}

async function writeTempFile(buffer: Buffer, ext: string): Promise<string> {
  const tmpPath = path.join(
    os.tmpdir(),
    `datiam_audio_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
  );
  await fs.promises.writeFile(tmpPath, buffer);
  return tmpPath;
}

function safeUnlink(filePath: string): void {
  fs.unlink(filePath, () => {});
}

export async function extractMetadata(inputPath: string): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
      resolve({
        duration_seconds: parseFloat(String(metadata.format.duration ?? '0')),
        sample_rate: parseInt(String(audioStream?.sample_rate ?? '44100'), 10),
        bit_rate: parseInt(String(metadata.format.bit_rate ?? '0'), 10),
        channels: audioStream?.channels ?? 2,
        format: metadata.format.format_name ?? 'unknown',
        codec: audioStream?.codec_name ?? 'unknown',
      });
    });
  });
}

async function measureLoudness(
  inputPath: string,
): Promise<{ loudness_lufs: number | null; peak_db: number | null }> {
  return new Promise((resolve) => {
    let stderr = '';
    ffmpeg(inputPath)
      .audioFilters('ebur128=peak=true')
      .format('null')
      .output(process.platform === 'win32' ? 'NUL' : '/dev/null')
      .on('stderr', (line: string) => { stderr += line + '\n'; })
      .on('end', () => {
        const lufsMatch = stderr.match(/I:\s*([-\d.]+)\s*LUFS/);
        const peakMatch = stderr.match(/Peak:\s*([-\d.]+)\s*dBFS/);
        resolve({
          loudness_lufs: lufsMatch ? parseFloat(lufsMatch[1]) : null,
          peak_db: peakMatch ? parseFloat(peakMatch[1]) : null,
        });
      })
      .on('error', () => resolve({ loudness_lufs: null, peak_db: null }))
      .run();
  });
}

async function generateWaveformData(inputPath: string, points = 500): Promise<number[]> {
  const tmpOut = path.join(os.tmpdir(), `wf_${Date.now()}.raw`);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .audioFilters(['aresample=8000', 'pan=mono|c0=0.5*FL+0.5*FR'])
        .format('f32le')
        .output(tmpOut)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    const rawBuffer = await fs.promises.readFile(tmpOut);
    const floats = new Float32Array(
      rawBuffer.buffer,
      rawBuffer.byteOffset,
      rawBuffer.byteLength / 4,
    );

    if (floats.length === 0) return new Array(points).fill(0) as number[];

    const chunkSize = Math.max(1, Math.floor(floats.length / points));
    const waveform: number[] = [];

    for (let i = 0; i < points; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, floats.length);
      let maxAmp = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(floats[j]);
        if (abs > maxAmp) maxAmp = abs;
      }
      waveform.push(Math.min(1, maxAmp));
    }

    return waveform;
  } catch {
    return new Array(points).fill(0) as number[];
  } finally {
    safeUnlink(tmpOut);
  }
}

async function estimateBPM(inputPath: string): Promise<number | null> {
  const tmpOut = path.join(os.tmpdir(), `bpm_${Date.now()}.raw`);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .duration(60)
        .audioFilters(['aresample=22050', 'pan=mono|c0=0.5*FL+0.5*FR'])
        .format('f32le')
        .output(tmpOut)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    const rawBuffer = await fs.promises.readFile(tmpOut);
    const floats = new Float32Array(
      rawBuffer.buffer,
      rawBuffer.byteOffset,
      rawBuffer.byteLength / 4,
    );

    if (floats.length < 4096) return null;

    const sampleRate = 22050;
    const hopSize = 512;
    const energyEnv: number[] = [];

    for (let i = 0; i < floats.length - hopSize; i += hopSize) {
      let energy = 0;
      for (let j = i; j < i + hopSize; j++) {
        energy += floats[j] * floats[j];
      }
      energyEnv.push(Math.sqrt(energy / hopSize));
    }

    const mean = energyEnv.reduce((a, b) => a + b, 0) / energyEnv.length;
    const threshold = mean * 1.4;

    const onsets: number[] = [];
    for (let i = 2; i < energyEnv.length - 2; i++) {
      if (
        energyEnv[i] > threshold &&
        energyEnv[i] > energyEnv[i - 1] &&
        energyEnv[i] > energyEnv[i - 2] &&
        energyEnv[i] >= energyEnv[i + 1]
      ) {
        const timeSec = (i * hopSize) / sampleRate;
        // Enforce minimum 0.2s gap between onsets
        if (onsets.length === 0 || timeSec - onsets[onsets.length - 1] > 0.2) {
          onsets.push(timeSec);
        }
      }
    }

    if (onsets.length < 4) return null;

    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }

    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (!median || median <= 0) return null;

    const bpm = 60 / median;
    if (bpm < 40 || bpm > 250) return null;

    // Halve/double to common BPM range 60-180
    let adjusted = bpm;
    while (adjusted < 60) adjusted *= 2;
    while (adjusted > 180) adjusted /= 2;

    return Math.round(adjusted * 10) / 10;
  } catch {
    return null;
  } finally {
    safeUnlink(tmpOut);
  }
}

export async function processAudioBuffer(
  buffer: Buffer,
  mimeType: string,
): Promise<FFmpegAnalysisResult> {
  const ext = mimeType.includes('wav') || mimeType.includes('wave')
    ? '.wav'
    : mimeType.includes('flac')
    ? '.flac'
    : mimeType.includes('aac')
    ? '.aac'
    : mimeType.includes('ogg')
    ? '.ogg'
    : '.mp3';

  const tmpPath = await writeTempFile(buffer, ext);

  try {
    const [metadata, loudness, waveform, bpm] = await Promise.all([
      extractMetadata(tmpPath),
      measureLoudness(tmpPath),
      generateWaveformData(tmpPath),
      estimateBPM(tmpPath),
    ]);

    return {
      bpm,
      duration_seconds: metadata.duration_seconds,
      loudness_lufs: loudness.loudness_lufs,
      peak_db: loudness.peak_db,
      sample_rate: metadata.sample_rate,
      bit_rate: metadata.bit_rate,
      channels: metadata.channels,
      format: metadata.format,
      spectral_centroid: null,
      waveform_data: waveform,
    };
  } finally {
    safeUnlink(tmpPath);
  }
}

export async function processAudioFromUrl(
  url: string,
  mimeType: string,
): Promise<FFmpegAnalysisResult> {
  const [metadata, loudness, waveform, bpm] = await Promise.all([
    extractMetadata(url),
    measureLoudness(url),
    generateWaveformData(url),
    estimateBPM(url),
  ]);

  return {
    bpm,
    duration_seconds: metadata.duration_seconds,
    loudness_lufs: loudness.loudness_lufs,
    peak_db: loudness.peak_db,
    sample_rate: metadata.sample_rate,
    bit_rate: metadata.bit_rate,
    channels: metadata.channels,
    format: metadata.format,
    spectral_centroid: null,
    waveform_data: waveform,
  };
}
