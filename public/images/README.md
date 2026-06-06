# GAYC/DC Memory Match — Image Placeholders

The memory matching game at `/game` looks for the following files in this folder:

| File path                           | What it is                                            |
| ----------------------------------- | ----------------------------------------------------- |
| `/images/member-1.jpg`              | Band member 1 portrait                                |
| `/images/member-2.jpg`              | Band member 2 portrait                                |
| `/images/member-3.jpg`              | Band member 3 portrait                                |
| `/images/member-4.jpg`              | Band member 4 portrait                                |
| `/images/member-5.jpg`              | Band member 5 portrait                                |
| `/images/gaycdc-logo.png`           | Logo card (used as the 6th "member" in HARD mode)     |
| `/images/card-back.png`             | Artwork shown on the back of every face-down card     |

## How to replace the placeholders

1. Drop your real images into this folder (`public/images/`) using **exactly** the
   filenames above.
2. The game will pick them up automatically — no code changes needed.

## What happens when an image is missing?

The game gracefully degrades:

- Missing **member** image → renders a bold, neon-styled name card with the
  member's stage name on a colored gradient.
- Missing **card back** → renders a bold "GAYC/DC" lightning-bolt card back
  built from CSS.
- Missing **logo** (HARD mode only) → renders a "GAYC/DC" logo card built from CSS.

## Recommended image specs

- Members: portrait orientation, ~600×900 px, JPG. Crop tight on the face.
- Logo: square or wide, ~600×600 px, transparent PNG.
- Card back: square or 2:3 portrait, ~600×900 px, PNG. Keep central focus,
  the corners may be slightly clipped by the card's rounded border.
