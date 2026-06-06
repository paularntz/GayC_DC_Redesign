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
