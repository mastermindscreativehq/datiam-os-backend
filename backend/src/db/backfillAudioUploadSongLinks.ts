import 'dotenv/config';
import { eq, isNull } from 'drizzle-orm';
import { db } from './index';
import { audio_uploads } from './schema';
import { createSongCore } from '../modules/catalog-engine/songs.service';

// One-time backfill for audio_uploads rows created before uploads always
// auto-linked to a Song (see audio.service.ts initiateUpload). Uses the same
// createSongCore write path as new uploads so backfilled data follows
// identical rules to what the app creates going forward.
const titleFromFileName = (fileName: string) =>
  fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Untitled Upload';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const orphans = await db.select().from(audio_uploads).where(isNull(audio_uploads.song_id));
  console.log(`Found ${orphans.length} orphaned audio_uploads row(s).${dryRun ? ' (dry run — no writes will happen)' : ''}`);

  let linked = 0;
  let skipped = 0;

  for (const upload of orphans) {
    const title = titleFromFileName(upload.file_name);

    if (!upload.artist_id) {
      console.warn(`SKIP  upload ${upload.id} ("${upload.file_name}") — no artist_id, cannot create a Song for it.`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`WOULD LINK  upload ${upload.id} ("${upload.file_name}") -> new draft song "${title}" (artist ${upload.artist_id})`);
      linked++;
      continue;
    }

    const song = await createSongCore({
      artist_id: upload.artist_id,
      title,
      release_status: 'draft',
    });
    await db
      .update(audio_uploads)
      .set({ song_id: song.id, updated_at: new Date() })
      .where(eq(audio_uploads.id, upload.id));
    console.log(`LINKED  upload ${upload.id} ("${upload.file_name}") -> song ${song.id} ("${song.title}")`);
    linked++;
  }

  console.log(`\nDone. ${linked} ${dryRun ? 'would be linked' : 'linked'}, ${skipped} skipped (no artist_id).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
