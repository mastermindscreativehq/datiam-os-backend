import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const postgres = require('postgres');

const db = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });

const tables = await db`
  SELECT table_name, array_agg(column_name ORDER BY ordinal_position) AS columns
  FROM information_schema.columns
  WHERE table_name IN ('company_memory','contact_memory','artist_sync_memory')
  GROUP BY table_name ORDER BY table_name
`;
console.log('=== Memory Tables ===');
console.log(JSON.stringify(tables, null, 2));

const fkCheck = await db`
  SELECT
    tc.table_name, kcu.column_name,
    ccu.table_name AS foreign_table, ccu.column_name AS foreign_column,
    rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('company_memory','contact_memory','artist_sync_memory')
  ORDER BY tc.table_name
`;
console.log('\n=== Foreign Keys ===');
console.log(JSON.stringify(fkCheck, null, 2));

await db.end();
