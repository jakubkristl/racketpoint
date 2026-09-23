# Racketpoint ops quick start

The live stack is **Cloudflare Workers + D1**. There is no separate serverless host.

## 1. Install

```bash
npm install
```

## 2. Local frontend

```bash
npm run dev
```

## 3. Local Worker (assets + API + D1)

```bash
npm run cf:dev
```

## 4. Production deploy

```bash
npm run deploy
```

## 5. Worker secrets

In Cloudflare Dashboard → Workers → `racketpoint` → Settings → Variables / Secrets, set at least:

| Name | Notes |
|------|--------|
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Min 8 characters |
| `BORICA_*` | Only if card payments are enabled |

## 6. Domain

Attach `racketpoint.bg` / `www.racketpoint.bg` as custom domains on the Worker and keep DNS on Cloudflare.

## Catalog notes

- Club-shop / starter catalog is seeded from the Worker + storefront data modules.
- Optional Squashpoint scrape export: `npm run import:squashpoint` → `public/imports/squashpoint-products.json`
