# Ada Community Impact Foundation

Website for Ada Community Impact Foundation, supporting education, health, clean water, livelihoods and coastal protection in Ada, Greater Accra Region, Ghana.

A single static page (`index.html`) with no build step.

## Deploying

The site is served by Cloudflare at https://adacommunityimpactfoundation.org (and www). After changing `index.html`, deploy with:

```bash
npx wrangler deploy
```

`wrangler.jsonc` holds the Cloudflare settings and custom domains; `.assetsignore` keeps the README and config files from being published. GitHub Pages also serves a copy at https://eoforidanso.github.io/adafoundation-/.

## Before going live

- Donations are taken by Zelle at 773-329-3016; send donors a written receipt for gifts of $250 or more.
- Replace the example 2030 goal figures with the foundation's own.
- Connect the volunteer form to a form service.
