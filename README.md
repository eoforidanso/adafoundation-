# Ada Community Impact Foundation

Website for Ada Community Impact Foundation, supporting education, health, clean water, livelihoods and coastal protection in Ada, Greater Accra Region, Ghana.

A single static page (`index.html`) with no build step.

## Dashboard

The foundation manages the site at https://adacommunityimpactfoundation.org/admin:

- **Photos**: upload photos, pick the main banner, add captions, credits and descriptions
- **Board**: add, edit, reorder or remove directors, with optional photos
- **Goals**: edit the impact numbers and mark each as a 2030 target or achieved
- **News & events**: publish updates; a News section appears on the site when one is published
- **Volunteers**: sign-ups from the "Get involved" form, with status tracking and spreadsheet export
- **Donations & receipts**: record Zelle, check or cash gifts and produce IRS-compliant receipts
- **Site details**: headline, introduction, phone, Zelle, email and city
- **Email alerts**: an email to the address under Site details each time someone signs up to volunteer
  (sent from alerts@adacommunityimpactfoundation.org through Cloudflare Email Sending)

Content lives in the Cloudflare D1 database `acif`; uploaded photos live in the R2 bucket `acif-photos`.
`index.html` keeps the original content as a fallback; the worker (`src/worker.js`) fills in the latest
content from the database on every visit.

### Setting or changing the dashboard password

```bash
cd ~/Desktop/vscode/adafoundation
npx wrangler secret put ADMIN_PASSWORD
```

Type the password when asked. Changing it signs everyone out.

## Deploying

After changing code or static files, deploy with:

```bash
npx wrangler deploy
```

Database changes go in `migrations/` and are applied with `npx wrangler d1 migrations apply acif --remote`.
`.assetsignore` keeps the code, database files and README from being published.
