import { z } from 'zod';

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/flac',
  'audio/aac',
  'audio/ogg',
  'audio/x-wav',
  'audio/wave',
] as const;

export const MAX_AUDIO_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

export const listUploadsSchema = z.object({
  artist_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const processAudioSchema = z.object({
  upload_id: z.string().uuid(),
});

export const uploadStemSchema = z.object({
  upload_id: z.string().uuid(),
  artist_id: z.string().uuid(),
  stem_type: z.enum(['vocals', 'drums', 'bass', 'other', 'instrumental']),
});

export type ListUploadsInput  = z.infer<typeof listUploadsSchema>;
export type ProcessAudioInput = z.infer<typeof processAudioSchema>;
export type UploadStemInput   = z.infer<typeof uploadStemSchema>;
