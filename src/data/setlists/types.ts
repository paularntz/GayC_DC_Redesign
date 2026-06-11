export type SetlistTrack = {
  code: string;
  title: string;
  audioUrl: string;
  note?: string;
};

export type SetlistTheme = {
  surface?: string;
  panel?: string;
  text?: string;
  muted?: string;
  subtle?: string;
  border?: string;
  shadow?: string;
  button?: string;
  buttonText?: string;
  rowSurface?: string;
  activeRow?: string;
  readyBg?: string;
  readyText?: string;
  missingBg?: string;
  missingText?: string;
};

export type Setlist = {
  slug: string;
  title: string;
  description: string;
  intro: string;
  eyebrow?: string;
  tracks: SetlistTrack[];
  theme?: SetlistTheme;
};
