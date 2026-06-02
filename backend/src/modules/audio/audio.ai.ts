export interface AudioAIProfile {
  emotional_profile: {
    primary_emotion: string;
    secondary_emotion: string;
    intensity: number;
    valence: number;
    arousal: number;
  };
  cinematic_score: number;
  sync_categories: string[];
  genre_confidence: Record<string, number>;
  vocal_intensity: number;
  replay_score: number;
  trailer_suitability: number;
  ai_notes: string;
}

export async function runAISonicAnalysis(
  fileName: string,
  metadata: {
    bpm?: number | null;
    duration_seconds?: number;
    loudness_lufs?: number | null;
    channels?: number;
    format?: string;
    sample_rate?: number;
  },
): Promise<AudioAIProfile | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a professional music supervisor and AI audio analyst for DATIAM OS, an artist business platform.

Analyze this audio track based on its technical metadata and generate a complete music intelligence profile.

File: ${fileName}
Duration: ${metadata.duration_seconds?.toFixed(1) ?? 'unknown'}s
BPM: ${metadata.bpm ?? 'unknown'}
Loudness: ${metadata.loudness_lufs != null ? `${metadata.loudness_lufs} LUFS` : 'unknown'}
Channels: ${metadata.channels ?? 'unknown'}
Format: ${metadata.format ?? 'unknown'}
Sample Rate: ${metadata.sample_rate ? `${metadata.sample_rate}Hz` : 'unknown'}

Respond ONLY with valid JSON — no markdown, no text outside the JSON object:
{
  "emotional_profile": {
    "primary_emotion": "string (e.g. melancholic, euphoric, intense, contemplative, energetic, dark, uplifting)",
    "secondary_emotion": "string",
    "intensity": <number 0-100>,
    "valence": <number 0-100, 0=negative 100=positive>,
    "arousal": <number 0-100, 0=calm 100=excited>
  },
  "cinematic_score": <number 0-100>,
  "sync_categories": ["e.g. TV Drama", "Action Film", "Commercial - Luxury", "Sports Highlight", "Documentary", "Trailer"],
  "genre_confidence": { "genre_name": <0.0-1.0>, ... },
  "vocal_intensity": <number 0-100, 0=instrumental 100=heavy vocal>,
  "replay_score": <number 0-100>,
  "trailer_suitability": <number 0-100>,
  "ai_notes": "1-2 sentences on commercial potential and key sound characteristics"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { content: Array<{ text: string }> };
    const raw = data.content?.[0]?.text ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    return JSON.parse(match[0]) as AudioAIProfile;
  } catch (err) {
    console.error('[AudioAI] runAISonicAnalysis failed:', err instanceof Error ? err.stack : err);
    return null;
  }
}
