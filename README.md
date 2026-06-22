# charliechandler.net clean one-page site

Clean one-page Cloudflare Worker site.

## Files

- `index.html` - terminal-style one-page website
- `src/worker.js` - Worker API route for `/api/cyber-news`
- `wrangler.jsonc` - Wrangler deploy configuration

## Cloudflare settings

Use this build configuration:

- Root directory: `/`
- Build command: blank
- Deploy command: `npx wrangler deploy`

If you keep these files inside a folder such as `charliechandler-site`, then set:

- Root directory: `charliechandler-site`

## Test after deployment

Open:

`https://charliechandler.net/api/cyber-news`

You should see JSON.

Then open:

`https://charliechandler.net`
