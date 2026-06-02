/**
 * Custom migration runner for DATIAM OS.
 *
 * drizzle-kit migrate uses content hashes that only match drizzle-kit-generated
 * files. Hand-written SQL migrations (0005-0009) are never applied by drizzle-kit.
 * This runner tracks applied migrations in the schema_migrations table instead,
 * applying any that are listed in the journal but not yet recorded.
 */
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import postgres from 'postgres';

const MIGRATIONS_DIR = path.join(__dirname, '../../drizzle');
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, 'meta/_journal.json');

interface JournalEntry { tag: string }
interface Journal { entries: JournalEntry[] }

async function runMigrations() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, ssl: { rejectUnauthorized: false } });

  try {
    // Ensure tracking table exists (idempotent)
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        migration_name text UNIQUE NOT NULL,
        executed_at timestamptz DEFAULT now()
      )
    `);

    // Load journal to get ordered migration list
    const journal: Journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
    const ordered = journal.entries.map(e => e.tag);

    // Get already-applied migrations
    const applied = await sql<{ migration_name: string }[]>`SELECT migration_name FROM schema_migrations`;
    const appliedSet = new Set(applied.map(r => r.migration_name));

    let appliedCount = 0;
    for (const tag of ordered) {
      if (appliedSet.has(tag)) {
        console.log(`[migrations] skip (already applied): ${tag}`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, `${tag}.sql`);
      if (!fs.existsSync(filePath)) {
        console.warn(`[migrations] WARN: ${tag}.sql not found — skipping`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      // Split on Drizzle's statement-breakpoint marker
      const statements = content.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

      console.log(`[migrations] applying ${tag} (${statements.length} statement(s))...`);
      for (const stmt of statements) {
        await sql.unsafe(stmt);
      }

      await sql`INSERT INTO schema_migrations (migration_name) VALUES (${tag}) ON CONFLICT DO NOTHING`;
      console.log(`[migrations] OK: ${tag}`);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log('[migrations] All migrations already applied — nothing to do.');
    } else {
      console.log(`[migrations] Applied ${appliedCount} migration(s).`);
    }
  } finally {
    await sql.end();
  }
}

runMigrations().catch(err => {
  console.error('[migrations] FATAL:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
