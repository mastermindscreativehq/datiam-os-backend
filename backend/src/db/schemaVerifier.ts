import { db } from './index';
import { sql } from 'drizzle-orm';

interface ColumnCheck {
  table: string;
  column: string;
}

export interface SchemaReport {
  healthy: boolean;
  missingTables: string[];
  missingColumns: ColumnCheck[];
}

const REQUIRED_TABLES = ['activity_log'];

const REQUIRED_COLUMNS: ColumnCheck[] = [
  { table: 'artist_profiles', column: 'genre' },
  { table: 'users', column: 'role' },
];

export async function verifySchema(): Promise<SchemaReport> {
  const missingTables: string[] = [];
  const missingColumns: ColumnCheck[] = [];

  for (const tableName of REQUIRED_TABLES) {
    const rows = await db.execute(sql`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
      LIMIT 1
    `);
    if ((rows as unknown[]).length === 0) {
      missingTables.push(tableName);
    }
  }

  for (const { table, column } of REQUIRED_COLUMNS) {
    const rows = await db.execute(sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
      LIMIT 1
    `);
    if ((rows as unknown[]).length === 0) {
      missingColumns.push({ table, column });
    }
  }

  return {
    healthy: missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
  };
}
