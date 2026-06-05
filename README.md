# GayC/DC Redesign

Next.js redesign for gaycdcofficial.com, backed by Turso/libSQL and built for Netlify.

## Local setup

```bash
npm install
cp .env.example .env.local
# Optional: merge content from scraped markdown exports
npm run import:scrapes -- ~/Downloads/GAYC_DC_Scrapes
npm run seed
npm run dev
```

## Env vars

- TURSO_DATABASE_URL
- TURSO_AUTH_TOKEN
