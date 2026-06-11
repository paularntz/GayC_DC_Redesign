import { default2025Setlist } from './default-2025';
import { eagleLaMay32026Setlist } from './eagle-la-may-3-2026';
import { gaycdcPracticeSetlist } from './gaycdc-practice';
import type { Setlist } from './types';

export type { Setlist, SetlistTrack, SetlistTheme } from './types';

const setlists: Setlist[] = [
  gaycdcPracticeSetlist,
  default2025Setlist,
  eagleLaMay32026Setlist,
];

export function listSetlists(): Setlist[] {
  return setlists;
}

export function getSetlistBySlug(slug: string): Setlist | null {
  return setlists.find((setlist) => setlist.slug === slug) || null;
}
