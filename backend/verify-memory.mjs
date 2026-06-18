/**
 * DATIAM Memory Layer v1 — Full Verification
 *
 * Steps:
 * 1. Check empty tables before rebuild
 * 2. Seed: insert artist, company, contact, opportunity, outcome
 * 3. Call POST /api/memory/rebuild
 * 4. Call GET /api/memory/artist/:id
 * 5. Call GET /api/memory/company/:id
 * 6. Call GET /api/memory/contact/:id
 * 7. Insert a second outcome → rebuild again → show updated rows
 * 8. Test FK cascade (delete company → company_memory row disappears)
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('dotenv').config();
const postgres = require('postgres');

const BASE = 'http://localhost:4001';
const db = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });

function sep(label) { console.log(`\n${'─'.repeat(60)}\n${label}\n${'─'.repeat(60)}`); }

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();
  return { status: res.status, body: json };
}

// ── 1. Verify empty state ────────────────────────────────────────────────────
sep('1. Confirm tables empty before rebuild');
const before = await db`
  SELECT 'artist_sync_memory' AS tbl, COUNT(*)::int AS n FROM artist_sync_memory
  UNION ALL SELECT 'company_memory', COUNT(*)::int FROM company_memory
  UNION ALL SELECT 'contact_memory', COUNT(*)::int FROM contact_memory
`;
console.log('Row counts (expect all 0):', JSON.stringify(before));

// ── 2. Seed test data ────────────────────────────────────────────────────────
sep('2. Seeding test data');

// Artist
const [artist] = await db`
  INSERT INTO artist_profiles (stage_name, genre, mood_profile)
  VALUES ('TestArtist_MemoryV1', 'hip-hop', 'confident')
  RETURNING id, stage_name
`;
console.log('Artist:', JSON.stringify(artist));

// Song
const [song] = await db`
  INSERT INTO songs (artist_id, title, genre, bpm, mood, release_status)
  VALUES (${artist.id}, 'Memory Test Track', 'hip-hop', 112, 'confident', 'draft')
  RETURNING id, title, genre, bpm, mood
`;
console.log('Song:', JSON.stringify(song));

// Company
const [company] = await db`
  INSERT INTO companies (name, type, tier)
  VALUES ('TestCorp_MemoryV1', 'music_supervisor_firm', 'tier_a')
  RETURNING id, name
`;
console.log('Company:', JSON.stringify(company));

// Contact
const [contact] = await db`
  INSERT INTO licensing_contacts (full_name, email, company_id, relationship_score, notes)
  VALUES ('Jane Supervisor', 'jane@testcorp.com', ${company.id}, 8, 'Works on drama series')
  RETURNING id, full_name
`;
console.log('Contact:', JSON.stringify(contact));

// Opportunity 1 (pitched)
const [opp1] = await db`
  INSERT INTO placement_opportunities
    (artist_id, song_id, company_id, contact_id, title, license_type, status, territory, pitched_at)
  VALUES
    (${artist.id}, ${song.id}, ${company.id}, ${contact.id},
     'Drama Series Ep 1', 'tv_drama', 'pitched', 'worldwide',
     now() - interval '5 days')
  RETURNING id, title
`;
console.log('Opportunity 1:', JSON.stringify(opp1));

// Outcome 1 — placed
const [out1] = await db`
  INSERT INTO placement_outcomes
    (opportunity_id, artist_id, song_id, outcome, final_fee_usd, royalties_collected_usd,
     license_type, territory)
  VALUES
    (${opp1.id}, ${artist.id}, ${song.id}, 'placed', 4500.00, 1200.00,
     'tv_drama', 'worldwide')
  RETURNING id, outcome, final_fee_usd
`;
console.log('Outcome 1 (placed):', JSON.stringify(out1));

// Opportunity 2
const [opp2] = await db`
  INSERT INTO placement_opportunities
    (artist_id, song_id, company_id, contact_id, title, license_type, status, territory, pitched_at)
  VALUES
    (${artist.id}, ${song.id}, ${company.id}, ${contact.id},
     'Drama Series Ep 2', 'tv_drama', 'rejected', 'north_america',
     now() - interval '2 days')
  RETURNING id, title
`;
console.log('Opportunity 2:', JSON.stringify(opp2));

// Outcome 2 — rejected
const [out2] = await db`
  INSERT INTO placement_outcomes
    (opportunity_id, artist_id, song_id, outcome, license_type, territory)
  VALUES
    (${opp2.id}, ${artist.id}, ${song.id}, 'rejected', 'tv_drama', 'north_america')
  RETURNING id, outcome
`;
console.log('Outcome 2 (rejected):', JSON.stringify(out2));

// ── 3. POST /api/memory/rebuild ──────────────────────────────────────────────
sep('3. POST /api/memory/rebuild');
const rebuild1 = await api('POST', '/api/memory/rebuild');
console.log('Status:', rebuild1.status);
console.log('Response:', JSON.stringify(rebuild1.body, null, 2));

// ── 4. GET /api/memory/artist/:id ────────────────────────────────────────────
sep('4. GET /api/memory/artist/:id');
const artistMem = await api('GET', `/api/memory/artist/${artist.id}`);
console.log('Status:', artistMem.status);
console.log('Response:', JSON.stringify(artistMem.body, null, 2));

// ── 5. GET /api/memory/company/:id ───────────────────────────────────────────
sep('5. GET /api/memory/company/:id');
const companyMem = await api('GET', `/api/memory/company/${company.id}`);
console.log('Status:', companyMem.status);
console.log('Response:', JSON.stringify(companyMem.body, null, 2));

// ── 6. GET /api/memory/contact/:id ───────────────────────────────────────────
sep('6. GET /api/memory/contact/:id');
const contactMem = await api('GET', `/api/memory/contact/${contact.id}`);
console.log('Status:', contactMem.status);
console.log('Response:', JSON.stringify(contactMem.body, null, 2));

// ── 7. Add a new placement outcome → rebuild → confirm update ────────────────
sep('7. Insert 3rd opportunity + placed outcome → rebuild → confirm memory updates');
const [opp3] = await db`
  INSERT INTO placement_opportunities
    (artist_id, song_id, company_id, contact_id, title, license_type, status, territory, pitched_at)
  VALUES
    (${artist.id}, ${song.id}, ${company.id}, ${contact.id},
     'Luxury Brand Ad', 'commercial_ad', 'contracted', 'europe',
     now() - interval '1 day')
  RETURNING id, title
`;
const [out3] = await db`
  INSERT INTO placement_outcomes
    (opportunity_id, artist_id, song_id, outcome, final_fee_usd,
     license_type, territory)
  VALUES
    (${opp3.id}, ${artist.id}, ${song.id}, 'placed', 9000.00,
     'commercial_ad', 'europe')
  RETURNING id, outcome, final_fee_usd
`;
console.log('New outcome inserted:', JSON.stringify(out3));

const rebuild2 = await api('POST', '/api/memory/rebuild');
console.log('Rebuild 2 response:', JSON.stringify(rebuild2.body));

const artistMemAfter = await api('GET', `/api/memory/artist/${artist.id}`);
console.log('\nArtist memory after 2nd placement:');
console.log('  placements_won:     ', artistMemAfter.body.placements_won, '(expect 2)');
console.log('  opportunities_submitted:', artistMemAfter.body.opportunities_submitted, '(expect 3)');
console.log('  total_sync_revenue: ', artistMemAfter.body.total_sync_revenue, '(expect 14700.00)');
console.log('  success_rate:       ', artistMemAfter.body.success_rate, '(expect 0.6667)');
console.log('  strongest_territories:', JSON.stringify(artistMemAfter.body.strongest_territories));

// ── 8. FK cascade — delete company → row disappears ─────────────────────────
sep('8. FK CASCADE — delete company → company_memory row should disappear');
const [beforeDelete] = await db`SELECT COUNT(*)::int AS n FROM company_memory WHERE company_id = ${company.id}`;
console.log('Rows before delete:', beforeDelete.n, '(expect 1)');

// Must cascade-delete linked data first (opportunities → outcomes ref artist_profiles cascade)
await db`DELETE FROM placement_outcomes WHERE opportunity_id IN (SELECT id FROM placement_opportunities WHERE company_id = ${company.id})`;
await db`DELETE FROM placement_opportunities WHERE company_id = ${company.id}`;
await db`DELETE FROM licensing_contacts WHERE company_id = ${company.id}`;
await db`DELETE FROM companies WHERE id = ${company.id}`;

const [afterDelete] = await db`SELECT COUNT(*)::int AS n FROM company_memory WHERE company_id = ${company.id}`;
console.log('Rows after company delete:', afterDelete.n, '(expect 0 — cascaded)');

// ── 9. Confirm direct SQL rows ───────────────────────────────────────────────
sep('9. Direct SQL row check — artist_sync_memory');
const directRows = await db`SELECT * FROM artist_sync_memory WHERE artist_id = ${artist.id}`;
console.log(JSON.stringify(directRows[0], null, 2));

// ── Cleanup ──────────────────────────────────────────────────────────────────
sep('Cleanup');
await db`DELETE FROM artist_sync_memory WHERE artist_id = ${artist.id}`;
await db`DELETE FROM songs WHERE id = ${song.id}`;
await db`DELETE FROM artist_profiles WHERE id = ${artist.id}`;
console.log('Test data removed');

await db.end();
console.log('\n=== VERIFICATION COMPLETE ===');
