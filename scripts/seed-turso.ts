import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local (and .env) so the script works when run via `npm run seed`
// without needing to export env vars manually.
for (const file of ['.env', '.env.local']) {
  const envPath = path.join(__dirname, '..', file);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}

const siteDataPath = path.join(__dirname, '../src/data/siteData.json');
const siteData = JSON.parse(fs.readFileSync(siteDataPath, 'utf-8'));

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.warn(
    'Skipping Turso seed: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are not set. ' +
      'Production will use stale database content or fall back to siteData.json.'
  );
  process.exit(0);
}

async function main() {
  console.log('Connecting to Turso database:', url);
  const db = createClient({ url: url!, authToken: authToken! });

  console.log('Creating tables if they do not exist...');
  await db.batch([
    `create table if not exists site_content (
      slug text primary key,
      payload text not null,
      updated_at text not null default (datetime('now'))
    )`,
    `create table if not exists contact_submissions (
      id integer primary key autoincrement,
      name text not null,
      email text not null,
      message text not null,
      created_at text not null
    )`,
    `create table if not exists shows (
      id integer primary key autoincrement,
      show_date text not null,
      title text not null,
      venue text not null,
      city text not null,
      region text not null,
      time text,
      notes text,
      ticket_url text,
      is_past integer not null default 0
    )`,
    `create table if not exists merch_orders (
      id integer primary key autoincrement,
      paypal_order_id text not null,
      paypal_payment_id text,
      customer_name text not null,
      customer_email text not null,
      shipping_address text,
      items_summary text not null,
      subtotal real not null,
      shipping real not null,
      total real not null,
      status text not null,
      created_at text not null
    )`,
    `create table if not exists setlist_pitch_settings (
      setlist_slug text not null,
      track_key text not null,
      pitch_shift integer not null default 0 check (pitch_shift between -1 and 1),
      pitch_cents integer not null default 0 check (pitch_cents between -100 and 100),
      volume real not null default 1 check (volume between 0 and 1),
      updated_at text not null default (datetime('now')),
      primary key (setlist_slug, track_key)
    )`,
    `create index if not exists idx_setlist_pitch_settings_setlist
      on setlist_pitch_settings(setlist_slug, updated_at desc)`
  ], 'write');

  console.log('Seeding site_content table...');
  const payload = JSON.stringify(siteData);
  await db.execute({
    sql: `insert into site_content (slug, payload, updated_at) 
          values (?, ?, datetime('now')) 
          on conflict(slug) do update set payload = excluded.payload, updated_at = datetime('now')`,
    args: ['main', payload],
  });

  console.log('Site content synced:', {
    photos: siteData.photos?.items?.length ?? 0,
    videos: Array.isArray(siteData.videos) ? siteData.videos.length : 0,
    press: siteData.press?.items?.length ?? 0,
    merchandiseCategories: siteData.merchandise?.categories?.length ?? 0,
    upcomingShows: siteData.upcomingShows?.length ?? 0,
    pastShows: siteData.pastShows?.length ?? 0,
    payloadBytes: Buffer.byteLength(payload, 'utf8'),
  });

  console.log('Seeding shows table...');
  // Clear any existing seeded shows to avoid duplicates on re-run
  await db.execute('delete from shows');

  // Insert upcoming shows
  for (const show of siteData.upcomingShows) {
    await db.execute({
      sql: `insert into shows (show_date, title, venue, city, region, time, notes, ticket_url, is_past) 
            values (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      args: [
        show.date,
        show.title,
        show.venue,
        show.city,
        show.region,
        show.time,
        show.notes,
        show.ticketUrl
      ]
    });
  }

  // Insert past shows
  for (const show of siteData.pastShows) {
    await db.execute({
      sql: `insert into shows (show_date, title, venue, city, region, time, notes, ticket_url, is_past) 
            values (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        show.date,
        show.details,
        '',
        '',
        '',
        '',
        `Historical show #${show.number}`,
        ''
      ]
    });
  }

  console.log('Turso database seeded successfully!');
}

main().catch((err) => {
  console.error('Error seeding Turso database:', err);
  process.exit(1);
});
