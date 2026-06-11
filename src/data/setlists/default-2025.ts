import { gaycdcPracticeSetlist } from './gaycdc-practice';
import type { Setlist, SetlistTrack } from './types';

const practiceTrackMap: Record<string, SetlistTrack> = Object.fromEntries(
  gaycdcPracticeSetlist.tracks.map((track) => [track.code, track])
);

function pickTrack(code: string, sourceCode: string = code): SetlistTrack {
  const track = practiceTrackMap[sourceCode];
  if (!track) {
    return {
      code,
      title: code,
      audioUrl: '',
      note: 'Track not found in the current Dropbox-backed library yet.',
    };
  }

  return {
    ...track,
    code,
  };
}

export const default2025Setlist: Setlist = {
  slug: '2026-default-set',
  title: '2026 Default Set',
  description: 'Core 2026 GAYC:DC running order.',
  intro:
    'This set uses the same Dropbox-backed audio library as the practice jukebox. Missing tracks stay visible in the order but are skipped by the player.',
  tracks: [
    pickTrack('WIRE'),
    pickTrack('CKSKR'),
    pickTrack('RHYTHM'),
    pickTrack('TEETH'),
    pickTrack('BOOGIE'),
    pickTrack('FLAMES'),
    pickTrack('THRILL'),
    pickTrack('PNP'),
    pickTrack('DEEDS'),
    pickTrack('$$$'),
    pickTrack('DAMNATION'),
    pickTrack('THNDRFKT'),
    pickTrack('JOSE'),
    pickTrack('LTBCK', 'LTBCOCK'),
    pickTrack('HWY'),
    pickTrack('RIFFRAFF'),
  ],
};
