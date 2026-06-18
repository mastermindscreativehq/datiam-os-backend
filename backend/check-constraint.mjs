import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const postgres = require('postgres');
const db = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });
const rows = await db`SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%relationship_score%'`;
console.log(JSON.stringify(rows, null, 2));
await db.end();
