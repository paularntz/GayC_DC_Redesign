# GayC/DC Redesign

Next.js redesign for gaycdcofficial.com, backed by Turso/libSQL and built for Netlify.

## Where content lives

All page content (bio, shows, photos, videos, press, merchandise, contact, etc.) is stored in **Turso** as one JSON document in the `site_content` table (`slug = main`).

`src/data/siteData.json` is the **source file in git** and a **local fallback** when Turso is not configured or a read fails. It is **not** what production reads when Turso env vars are set.

After editing `siteData.json`, sync it to Turso:

```bash
npm run seed
```

Netlify runs `npm run seed` before every build, so a deploy also pushes the latest `siteData.json` to Turso (requires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Netlify env vars).

Contact form submissions are stored separately in Turso (`contact_submissions` table).

## Local setup

```bash
npm install
cp .env.example .env.local
# Add your Turso credentials to .env.local, then:
# Optional: merge content from scraped markdown exports
npm run import:scrapes -- ~/Downloads/GAYC_DC_Scrapes
npm run seed
npm run dev
```

## Env vars

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Set these in Netlify (Site settings → Environment variables) for both build and runtime.

## Memory Match game (`/game`)

A campy, AC/DC-inspired memory matching mini-game lives at the `/game` route.
The game logic is fully client-side and has no backend dependencies.

Files:

- `src/app/game/page.tsx` — Next.js page route.
- `src/components/MemoryGame.tsx` — `'use client'` component with all gameplay,
  audio, confetti, and animation code (commented).
- Memory-game styles are appended to `src/app/globals.css` under the
  `GAYC/DC Memory Match game` section header.
- `public/images/` — drop your real images here. See
  `public/images/README.md` for the exact filenames the game expects:
  `member-1.jpg` … `member-5.jpg`, `gaycdc-logo.png`, `card-back.png`.
  Until those files exist the game gracefully renders neon text fallbacks,
  so it still looks polished out of the box.

Features: 5- or 6-pair difficulty, move counter, par reminder, per-difficulty
best score in `localStorage`, optional Web Audio synth power-chord and
fanfare (off by default), confetti on each match and on win, and a "Play
Again" win modal.
