import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { AppError } from '../../middleware/errorHandler';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'audio-uploads';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError('Supabase storage not configured', 500, 'STORAGE_UNCONFIGURED');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient(url, key, { realtime: { transport: WebSocket as any } });
}

export async function uploadAudioFile(
  buffer: Buffer,
  storagePath: string,
  mimeType: string,
): Promise<string> {
  const supabase = getSupabase();

  console.log('[Storage] upload start', {
    bucket: BUCKET,
    storagePath,
    mimeType,
    bytes: buffer.length,
  });

  let supabaseError: unknown;
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
    supabaseError = error ?? null;
  } catch (thrown) {
    const e = thrown as Error;
    console.error('[Storage] Supabase upload THREW (network/init exception):', {
      message: e.message,
      stack: e.stack,
      storagePath,
      mimeType,
      bytes: buffer.length,
    });
    throw new AppError(`Storage upload threw: ${e.message}`, 500, 'STORAGE_ERROR');
  }

  if (supabaseError) {
    const e = supabaseError as { message?: string; statusCode?: string; error?: string };
    console.error('[Storage] Supabase upload returned error:', {
      message: e.message,
      statusCode: e.statusCode,
      error: e.error,
      storagePath,
      mimeType,
      bytes: buffer.length,
    });
    throw new AppError(`Storage upload failed: ${e.message}`, 500, 'STORAGE_ERROR');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  console.log('[Storage] upload OK', { publicUrl: data.publicUrl });
  return data.publicUrl;
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error) throw new AppError(`Failed to create signed URL: ${error.message}`, 500, 'STORAGE_ERROR');
  return data.signedUrl;
}

export async function deleteAudioFile(storagePath: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new AppError(`Storage delete failed: ${error.message}`, 500, 'STORAGE_ERROR');
}
