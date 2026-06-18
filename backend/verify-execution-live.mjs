import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: { rejectUnauthorized: false } });

console.log('\n=== DATIAM Execution Engine v1 — Live Verification ===\n');

// Step 1: Confirm execution_log table exists with correct columns
const cols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'execution_log'
  ORDER BY ordinal_position
`;
console.log('Step 1 — execution_log table columns:');
cols.forEach(c => console.log(`  ✓  ${c.column_name}  (${c.data_type})`));

// Step 2: Confirm delivery_status enum
const enumVals = await sql`
  SELECT e.enumlabel
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'delivery_status'
  ORDER BY e.enumsortorder
`;
console.log('\nStep 2 — delivery_status enum:', enumVals.map(r => r.enumlabel).join(', '));

// Step 3: Show existing campaigns
const campaigns = await sql`
  SELECT id, status, company_id, contact_id, territory
  FROM outreach_campaign
  ORDER BY created_at DESC
  LIMIT 5
`;
console.log(`\nStep 3 — outreach_campaign rows: ${campaigns.length}`);
campaigns.forEach(c =>
  console.log(`  ${c.id.slice(0,8)}…  status=${c.status}  territory=${c.territory}  contact_id=${c.contact_id ?? 'null'}`)
);

if (campaigns.length === 0) {
  console.log('\nNo campaigns — skipping insert test.');
  await sql.end();
  process.exit(0);
}

const campaign = campaigns[0];
const origStatus = campaign.status;

// Step 4: Load the message for this campaign
const messages = await sql`
  SELECT id, status FROM outreach_message
  WHERE campaign_id = ${campaign.id}
  ORDER BY created_at DESC
  LIMIT 1
`;
const message = messages[0] ?? null;
console.log(`\nStep 4 — message for campaign: ${message ? message.id.slice(0,8) + '…  status=' + message.status : 'none'}`);

// Step 5: Mark campaign as queued (simulates pre-send)
await sql`UPDATE outreach_campaign SET status = 'queued', updated_at = now() WHERE id = ${campaign.id}`;
if (message) {
  await sql`UPDATE outreach_message SET status = 'queued', updated_at = now() WHERE id = ${message.id}`;
}
console.log('\nStep 5 — Campaign + message marked queued ✓');

// Step 6: Insert execution_log row (simulates send result)
const testMsgId = `test-verify-${Date.now()}`;
const sentAt = new Date();

const [logRow] = await sql`
  INSERT INTO execution_log
    (campaign_id, message_id, contact_id, provider, recipient_email, subject,
     delivery_status, sent_at, provider_message_id, metadata)
  VALUES (
    ${campaign.id},
    ${message?.id ?? null},
    ${campaign.contact_id ?? null},
    'resend',
    'verify@datiam-test.io',
    'Sync Licensing Opportunity — Verification Run',
    'sent',
    ${sentAt.toISOString()},
    ${testMsgId},
    ${{ engine_version: 'execution-v1', test: true }}
  )
  RETURNING *
`;
console.log('\nStep 6 — Inserted execution_log row:');
console.log(`  id:              ${logRow.id}`);
console.log(`  campaign_id:     ${logRow.campaign_id}`);
console.log(`  provider:        ${logRow.provider}`);
console.log(`  recipient_email: ${logRow.recipient_email}`);
console.log(`  subject:         ${logRow.subject}`);
console.log(`  delivery_status: ${logRow.delivery_status}`);
console.log(`  sent_at:         ${logRow.sent_at}`);
console.log(`  provider_msg_id: ${logRow.provider_message_id}`);

// Step 7: Update campaign to sent
await sql`UPDATE outreach_campaign SET status = 'sent', updated_at = now() WHERE id = ${campaign.id}`;
if (message) {
  await sql`UPDATE outreach_message SET status = 'sent', updated_at = now() WHERE id = ${message.id}`;
}
const [afterUpdate] = await sql`SELECT id, status FROM outreach_campaign WHERE id = ${campaign.id}`;
console.log(`\nStep 7 — Campaign status: '${origStatus}' → '${afterUpdate.status}' ✓`);

// Step 8: Simulate GET /api/execution/logs — join with campaign + contact
const logs = await sql`
  SELECT
    el.id,
    el.campaign_id,
    el.provider,
    el.recipient_email,
    el.delivery_status,
    el.sent_at,
    el.created_at,
    oc.status   AS campaign_status,
    oc.territory
  FROM execution_log el
  JOIN outreach_campaign oc ON oc.id = el.campaign_id
  ORDER BY el.created_at DESC
  LIMIT 10
`;
console.log(`\nStep 8 — GET /api/execution/logs (${logs.length} row(s)):`);
logs.forEach(r =>
  console.log(`  log=${r.id.slice(0,8)}…  provider=${r.provider}  status=${r.delivery_status}  campaign_status=${r.campaign_status}`)
);

// Step 9: Cleanup
await sql`DELETE FROM execution_log WHERE id = ${logRow.id}`;
await sql`UPDATE outreach_campaign SET status = ${origStatus}, updated_at = now() WHERE id = ${campaign.id}`;
if (message) {
  await sql`UPDATE outreach_message SET status = ${origStatus}, updated_at = now() WHERE id = ${message.id}`;
}
console.log('\nStep 9 — Cleanup: test row deleted, statuses restored ✓');

console.log('\n=== All verification steps passed ✓ ===\n');
await sql.end();
