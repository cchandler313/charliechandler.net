# charliechandler.net v1.0 redesign

A lightweight personal technology hub deployed on Cloudflare Workers.

## Site sections

- `/` landing page
- `/about/` background, focus areas, technology stack
- `/security/` live cybersecurity news aggregator
- `/projects/` security and infrastructure project portfolio
- `/projects/zero-trust-network/` first project build log
- `/lab/` short technical notes and queued writeups
- `/api/cyber-news` normalized RSS aggregation API
- `/api/ping` Worker health check
- custom `404.html` for unknown routes

## Architecture

The site deliberately stays framework-free. Wrangler explicitly routes `/api/*` through the Worker first while static HTML uses Cloudflare's automatic trailing-slash handling. Cloudflare Workers serves static assets from `public/`, while `src/worker.js` handles the Security Wire API. This keeps the deploy surface small, avoids a build pipeline that adds little value for the current site, and leaves room to add durable storage later if project or lab content moves into a CMS.

## Security Wire

The Worker fetches multiple RSS/Atom feeds in parallel, isolates failed sources, normalizes and categorizes stories, deduplicates results, and returns source-health metadata. The front-end only displays headlines and short excerpts and always links to the original publisher.

## Local development

```bash
npx wrangler dev
```

Then open the local URL printed by Wrangler.

## Deploy

```bash
npx wrangler deploy
```

## Recommended Git workflow

1. Create a feature branch from `main`.
2. Apply the redesign files on that branch.
3. Run `npx wrangler dev` and test desktop/mobile navigation plus `/api/ping` and `/api/cyber-news`.
4. Open a pull request into `main`.
5. Use the Cloudflare preview/deployment checks before merge.
6. Merge only after visual and feed validation.
