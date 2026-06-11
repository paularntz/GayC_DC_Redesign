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

export const eagleLaMay32026Setlist: Setlist = {
  slug: 'eagle-la-may-3-2026',
  title: 'The Eagle LA, May 3, 2026',
  eyebrow: 'The Eagle LA • May 3, 2026',
  description: 'Dropbox-backed gig set for The Eagle in Los Angeles.',
  intro: 'Built for the May 3, 2026 Eagle LA show.',
  tracks: [
    pickTrack('WIRE'),
    pickTrack('CKSKR'),
    pickTrack('BOOGIE'),
    pickTrack('PNP'),
    pickTrack('DEEDS'),
    pickTrack('LTBCK', 'LTBCOCK'),
    pickTrack('HWY'),
    pickTrack('JOSE'),
    pickTrack('RIFF RAFF', 'RIFFRAFF'),
  ],
};
