import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });

const cols = await sql`
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'execution_log'
  ORDER BY ordinal_position
`;

console.log('\n=== execution_log table columns ===');
cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`));

const count = await sql`SELECT COUNT(*) FROM execution_log`;
console.log(`\nRow count: ${count[0].count}`);

const enumVals = await sql`
  SELECT e.enumlabel
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'delivery_status'
  ORDER BY e.enumsortorder
`;
console.log('\ndelivery_status enum values:', enumVals.map(r => r.enumlabel));

const outreachCols = await sql`
  SELECT COUNT(*) FROM outreach_campaign
`;
console.log(`\noutreach_campaign rows: ${outreachCols[0].count}`);

await sql.end();
