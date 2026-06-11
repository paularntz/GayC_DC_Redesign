import { NextResponse } from 'next/server';
import {
  listSetlistTrackSettings,
  setSetlistTrackPitch,
  setSetlistTrackVolume,
} from '@/lib/setlist-pitch-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

async function parseSetlistSlug(context: RouteContext): Promise<string> {
  const params = await context.params;
  return String(params?.slug || '').trim();
}

export async function GET(_request: Request, context: RouteContext) {
  const slug = await parseSetlistSlug(context);

  try {
    const { pitchByTrack, volumeByTrack } = await listSetlistTrackSettings(slug);
    return NextResponse.json({ settings: pitchByTrack, volumeSettings: volumeByTrack });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not load pitch settings.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const slug = await parseSetlistSlug(context);
  const body = await request
    .json()
    .catch(() => ({} as Record<string, unknown>));

  try {
    const data = body as {
      trackKey?: unknown;
      pitchCents?: unknown;
      pitchShift?: unknown;
      volume?: unknown;
    };
    const pitchCents =
      data.pitchCents !== undefined && data.pitchCents !== null
        ? data.pitchCents
        : Number(data.pitchShift ?? 0) * 100;
    const setting =
      data.volume === undefined
        ? await setSetlistTrackPitch(slug, data.trackKey, pitchCents)
        : await setSetlistTrackVolume(slug, data.trackKey, data.volume);
    return NextResponse.json({ setting });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not save pitch setting.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
