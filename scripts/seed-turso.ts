import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

const siteDataPath = path.join(__dirname, '../src/data/siteData.json');
const siteData = JSON.parse(fs.readFileSync(siteDataPath, 'utf-8'));

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables are required.');
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
    )`
  ], 'write');

  console.log('Seeding site_content table...');
  await db.execute({
    sql: `insert into site_content (slug, payload, updated_at) 
          values (?, ?, datetime('now')) 
          on conflict(slug) do update set payload = excluded.payload, updated_at = datetime('now')`,
    args: ['main', JSON.stringify(siteData)],
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
