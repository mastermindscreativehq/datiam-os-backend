import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { authenticate, requireRole } from '../../middleware/auth';
import { success } from '../../utils/response';

const router = Router();

router.use(authenticate);
router.use(requireRole('owner', 'admin'));

interface JournalEntry {
  idx: number;
  tag: string;
}

router.get('/', async (_req, res, next) => {
  try {
    const journalPath = path.join(process.cwd(), 'drizzle', 'meta', '_journal.json');
    let allMigrations: string[] = [];

    if (fs.existsSync(journalPath)) {
      const raw = fs.readFileSync(journalPath, 'utf-8');
      const journal = JSON.parse(raw) as { entries: JournalEntry[] };
      allMigrations = journal.entries.map(e => e.tag);
    }

    const latestCodeVersion = allMigrations[allMigrations.length - 1] ?? null;

    // Drizzle tracks applied migrations in drizzle.__drizzle_migrations.
    // Applied in strict insertion order, so row count maps 1:1 to journal index.
    let applied: string[] = [];
    try {
      const rows = await db.execute(
        sql`SELECT COUNT(*) AS count FROM drizzle.__drizzle_migrations`,
      );
      const count = Number((rows as Record<string, unknown>[])[0]?.count ?? 0);
      applied = allMigrations.slice(0, isNaN(count) ? 0 : count);
    } catch {
      // Table absent on fresh environments before first migrate — treat as 0 applied.
    }

    const pending = allMigrations.slice(applied.length);
    const currentDbVersion = applied[applied.length - 1] ?? null;

    success(res, {
      applied,
      pending,
      currentDbVersion,
      latestCodeVersion,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
