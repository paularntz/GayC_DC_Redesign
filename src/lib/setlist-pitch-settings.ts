import type { Client } from '@libsql/client';
import { getDb } from './data';

export const MIN_SETLIST_PITCH_CENTS = -100;
export const MAX_SETLIST_PITCH_CENTS = 100;
export const DEFAULT_SETLIST_VOLUME = 1;

export type SetlistPitchSettings = {
  pitchByTrack: Record<string, number>;
  volumeByTrack: Record<string, number>;
};

let schemaReadyPromise: Promise<void> | null = null;

function cleanText(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeSetlistPitchCents(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(
    MIN_SETLIST_PITCH_CENTS,
    Math.min(MAX_SETLIST_PITCH_CENTS, Math.round(numeric))
  );
}

export function normalizeSetlistVolume(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_SETLIST_VOLUME;
  }

  return Math.max(0, Math.min(1, Number(numeric.toFixed(2))));
}

function normalizeSetlistSlug(value: unknown): string {
  return cleanText(value).slice(0, 160);
}

function normalizeTrackKey(value: unknown): string {
  return cleanText(value).slice(0, 500);
}

function getRequiredClient(): Client {
  const client = getDb();
  if (!client) {
    throw new Error(
      'Turso database is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.'
    );
  }
  return client;
}

async function ensureSetlistPitchSettingsSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const client = getRequiredClient();
      await client.execute(`
        CREATE TABLE IF NOT EXISTS setlist_pitch_settings (
          setlist_slug TEXT NOT NULL,
          track_key TEXT NOT NULL,
          pitch_shift INTEGER NOT NULL DEFAULT 0 CHECK (pitch_shift BETWEEN -1 AND 1),
          pitch_cents INTEGER NOT NULL DEFAULT 0 CHECK (pitch_cents BETWEEN -100 AND 100),
          volume REAL NOT NULL DEFAULT 1 CHECK (volume BETWEEN 0 AND 1),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (setlist_slug, track_key)
        )
      `);
      const columns = await client.execute('PRAGMA table_info(setlist_pitch_settings)');
      const columnNames = new Set(
        columns.rows.map((row) => cleanText((row as Record<string, unknown>).name).toLowerCase())
      );
      if (!columnNames.has('pitch_cents')) {
        await client.execute(
          'ALTER TABLE setlist_pitch_settings ADD COLUMN pitch_cents INTEGER NOT NULL DEFAULT 0 CHECK (pitch_cents BETWEEN -100 AND 100)'
        );
        await client.execute(`
          UPDATE setlist_pitch_settings
          SET pitch_cents = pitch_shift * 100
          WHERE pitch_cents = 0 AND pitch_shift != 0
        `);
      }
      if (!columnNames.has('volume')) {
        await client.execute(
          'ALTER TABLE setlist_pitch_settings ADD COLUMN volume REAL NOT NULL DEFAULT 1 CHECK (volume BETWEEN 0 AND 1)'
        );
      }
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_setlist_pitch_settings_setlist
        ON setlist_pitch_settings(setlist_slug, updated_at DESC)
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

export async function listSetlistTrackSettings(
  setlistSlug: unknown
): Promise<SetlistPitchSettings> {
  const slug = normalizeSetlistSlug(setlistSlug);
  if (!slug) {
    throw new Error('Setlist slug is required.');
  }

  await ensureSetlistPitchSettingsSchema();
  const client = getRequiredClient();
  const rs = await client.execute({
    sql: `
      SELECT track_key, pitch_shift, pitch_cents, volume
      FROM setlist_pitch_settings
      WHERE setlist_slug = ?
      ORDER BY updated_at DESC
    `,
    args: [slug],
  });

  const pitchByTrack: Record<string, number> = {};
  const volumeByTrack: Record<string, number> = {};
  for (const row of rs.rows as Array<Record<string, unknown>>) {
    const trackKey = cleanText(row.track_key);
    if (!trackKey) continue;

    const pitchCentsValue =
      row.pitch_cents !== null && row.pitch_cents !== undefined
        ? row.pitch_cents
        : Number(row.pitch_shift || 0) * 100;
    const pitchCents = normalizeSetlistPitchCents(pitchCentsValue);
    const volume = normalizeSetlistVolume(row.volume);
    if (pitchCents !== 0) {
      pitchByTrack[trackKey] = pitchCents;
    }
    if (volume !== DEFAULT_SETLIST_VOLUME) {
      volumeByTrack[trackKey] = volume;
    }
  }

  return { pitchByTrack, volumeByTrack };
}

async function getExistingSetting(
  client: Client,
  slug: string,
  key: string
): Promise<{ pitchCents: number; volume: number }> {
  const existing = await client.execute({
    sql: `
      SELECT pitch_cents, volume
      FROM setlist_pitch_settings
      WHERE setlist_slug = ? AND track_key = ?
      LIMIT 1
    `,
    args: [slug, key],
  });

  const row = existing.rows[0] as Record<string, unknown> | undefined;
  return {
    pitchCents: normalizeSetlistPitchCents(row?.pitch_cents ?? 0),
    volume: row ? normalizeSetlistVolume(row.volume) : DEFAULT_SETLIST_VOLUME,
  };
}

async function deleteDefaultSetting(
  client: Client,
  slug: string,
  key: string,
  pitchCents: number,
  volume: number
): Promise<boolean> {
  if (pitchCents !== 0 || volume !== DEFAULT_SETLIST_VOLUME) {
    return false;
  }

  await client.execute({
    sql: `
      DELETE FROM setlist_pitch_settings
      WHERE setlist_slug = ? AND track_key = ?
    `,
    args: [slug, key],
  });
  return true;
}

export type SetlistTrackSetting = {
  trackKey: string;
  pitchCents: number;
  volume: number;
};

export async function setSetlistTrackPitch(
  setlistSlug: unknown,
  trackKey: unknown,
  pitchCents: unknown
): Promise<SetlistTrackSetting> {
  const slug = normalizeSetlistSlug(setlistSlug);
  const key = normalizeTrackKey(trackKey);
  const nextPitchCents = normalizeSetlistPitchCents(pitchCents);

  if (!slug) {
    throw new Error('Setlist slug is required.');
  }
  if (!key) {
    throw new Error('Track key is required.');
  }

  await ensureSetlistPitchSettingsSchema();
  const client = getRequiredClient();
  const existing = await getExistingSetting(client, slug, key);

  if (await deleteDefaultSetting(client, slug, key, nextPitchCents, existing.volume)) {
    return { trackKey: key, pitchCents: 0, volume: DEFAULT_SETLIST_VOLUME };
  }

  await client.execute({
    sql: `
      INSERT INTO setlist_pitch_settings (setlist_slug, track_key, pitch_shift, pitch_cents, volume, updated_at)
      VALUES (?, ?, 0, ?, ?, datetime('now'))
      ON CONFLICT(setlist_slug, track_key)
      DO UPDATE SET pitch_shift = 0, pitch_cents = excluded.pitch_cents, updated_at = datetime('now')
    `,
    args: [slug, key, nextPitchCents, existing.volume],
  });

  return { trackKey: key, pitchCents: nextPitchCents, volume: existing.volume };
}

export async function setSetlistTrackVolume(
  setlistSlug: unknown,
  trackKey: unknown,
  volume: unknown
): Promise<SetlistTrackSetting> {
  const slug = normalizeSetlistSlug(setlistSlug);
  const key = normalizeTrackKey(trackKey);
  const nextVolume = normalizeSetlistVolume(volume);

  if (!slug) {
    throw new Error('Setlist slug is required.');
  }
  if (!key) {
    throw new Error('Track key is required.');
  }

  await ensureSetlistPitchSettingsSchema();
  const client = getRequiredClient();
  const existing = await getExistingSetting(client, slug, key);

  if (await deleteDefaultSetting(client, slug, key, existing.pitchCents, nextVolume)) {
    return { trackKey: key, pitchCents: 0, volume: DEFAULT_SETLIST_VOLUME };
  }

  await client.execute({
    sql: `
      INSERT INTO setlist_pitch_settings (setlist_slug, track_key, pitch_shift, pitch_cents, volume, updated_at)
      VALUES (?, ?, 0, ?, ?, datetime('now'))
      ON CONFLICT(setlist_slug, track_key)
      DO UPDATE SET volume = excluded.volume, updated_at = datetime('now')
    `,
    args: [slug, key, existing.pitchCents, nextVolume],
  });

  return { trackKey: key, pitchCents: existing.pitchCents, volume: nextVolume };
}
