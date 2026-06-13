const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  const result = await pool.query(`
    SELECT si.upload_id, si.overall_sync_score, ad.primary_genre, ad.mood_primary
    FROM sync_intelligence si
    INNER JOIN audio_dna ad ON ad.upload_id = si.upload_id
    LIMIT 5
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
