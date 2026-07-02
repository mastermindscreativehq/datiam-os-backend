import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import * as schema from './schema';
import { platform_definitions, countries } from './growth-schema';

const client = postgres(process.env.DATABASE_URL!, { max: 1, ssl: { rejectUnauthorized: false } });
const db = drizzle(client, { schema });

async function seed() {
  console.log('Seeding DATIAM OS database...');

  const existingUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'admin@datiam.com'))
    .limit(1);

  if (existingUser.length === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('[seed] FATAL: ADMIN_PASSWORD environment variable is not set.');
      console.error('[seed] Set ADMIN_PASSWORD in Railway Variables before running seed.');
      process.exit(1);
    }
    const password_hash = await bcrypt.hash(adminPassword, 12);
    await db.insert(schema.users).values({
      email: 'admin@datiam.com',
      password_hash,
      full_name: 'DATIAM Owner',
      role: 'owner',
    });
    console.log('✓ Admin user created  →  admin@datiam.com  (password from ADMIN_PASSWORD env var)');
  } else {
    console.log('  Admin user already exists, skipping.');
  }

  const existingProfile = await db.select().from(schema.artist_profiles).limit(1);

  if (existingProfile.length === 0) {
    await db.insert(schema.artist_profiles).values({
      stage_name: 'DATIAM',
      legal_name: 'DATIAM Artist',
      bio: 'Independent artist building label-level infrastructure. Music + Business.',
      country: 'Nigeria',
      genre_primary: 'Afro spiritual',
      genre_secondary: 'Afrobeat / RnB / Soul / Afrodark',
      brand_statement: 'Authentic music. Business-first mindset.',
    });
    console.log('✓ DATIAM artist profile created');
  } else {
    console.log('  Artist profile already exists, skipping.');
  }

  // ── Platform Definitions (Growth OS) ─────────────────────────────────────

  const existingPlatform = await db.select().from(platform_definitions).limit(1);

  if (existingPlatform.length === 0) {
    await db.insert(platform_definitions).values([
      {
        name: 'Instagram',
        slug: 'instagram',
        base_url: 'https://www.instagram.com',
        supports_scheduling: true,
        supports_analytics: true,
        is_streaming: false,
        is_social: true,
        metadata: { color: '#E1306C', content_types: ['reel', 'post', 'story', 'carousel'] },
      },
      {
        name: 'TikTok',
        slug: 'tiktok',
        base_url: 'https://www.tiktok.com',
        supports_scheduling: true,
        supports_analytics: true,
        is_streaming: false,
        is_social: true,
        metadata: { color: '#010101', content_types: ['video', 'duet', 'stitch'] },
      },
      {
        name: 'YouTube',
        slug: 'youtube',
        base_url: 'https://www.youtube.com',
        supports_scheduling: true,
        supports_analytics: true,
        is_streaming: true,
        is_social: true,
        metadata: { color: '#FF0000', content_types: ['video', 'short', 'live'] },
      },
      {
        name: 'X (Twitter)',
        slug: 'twitter',
        base_url: 'https://www.x.com',
        supports_scheduling: true,
        supports_analytics: true,
        is_streaming: false,
        is_social: true,
        metadata: { color: '#1DA1F2', content_types: ['tweet', 'thread', 'spaces'] },
      },
      {
        name: 'Spotify',
        slug: 'spotify',
        base_url: 'https://www.spotify.com',
        supports_scheduling: false,
        supports_analytics: true,
        is_streaming: true,
        is_social: false,
        metadata: { color: '#1DB954', content_types: ['track', 'album', 'playlist'] },
      },
      {
        name: 'SoundCloud',
        slug: 'soundcloud',
        base_url: 'https://www.soundcloud.com',
        supports_scheduling: false,
        supports_analytics: true,
        is_streaming: true,
        is_social: false,
        metadata: { color: '#FF5500', content_types: ['track', 'playlist'] },
      },
    ]);
    console.log('✓ Platform definitions seeded (6 platforms)');
  } else {
    console.log('  Platform definitions already exist, skipping.');
  }

  // ── Countries (key music markets) ────────────────────────────────────────

  const existingCountry = await db.select().from(countries).limit(1);

  if (existingCountry.length === 0) {
    await db.insert(countries).values([
      { name: 'Nigeria', iso_code: 'NG', region: 'Africa', is_music_market: true },
      { name: 'United States', iso_code: 'US', region: 'North America', is_music_market: true },
      { name: 'United Kingdom', iso_code: 'GB', region: 'Europe', is_music_market: true },
      { name: 'Ghana', iso_code: 'GH', region: 'Africa', is_music_market: true },
      { name: 'South Africa', iso_code: 'ZA', region: 'Africa', is_music_market: true },
      { name: 'Kenya', iso_code: 'KE', region: 'Africa', is_music_market: true },
      { name: 'Canada', iso_code: 'CA', region: 'North America', is_music_market: true },
      { name: 'France', iso_code: 'FR', region: 'Europe', is_music_market: true },
      { name: 'Germany', iso_code: 'DE', region: 'Europe', is_music_market: true },
      { name: 'Brazil', iso_code: 'BR', region: 'South America', is_music_market: true },
      { name: 'Australia', iso_code: 'AU', region: 'Oceania', is_music_market: true },
      { name: 'India', iso_code: 'IN', region: 'Asia', is_music_market: true },
      { name: 'Japan', iso_code: 'JP', region: 'Asia', is_music_market: true },
      { name: 'Sweden', iso_code: 'SE', region: 'Europe', is_music_market: true },
      { name: 'Jamaica', iso_code: 'JM', region: 'Caribbean', is_music_market: true },
    ]);
    console.log('✓ Countries seeded (15 music markets)');
  } else {
    console.log('  Countries already exist, skipping.');
  }

  await client.end();
  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
