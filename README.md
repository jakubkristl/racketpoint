# Racketpoint.bg

Modern storefront starter for a premium racket sports e-commerce shop.

## Focus

- Tennis
- Squash
- Badminton
- Padel
- Racketball
- Table tennis

## What is included

- Responsive landing page
- Sports-first discovery sections
- Category navigation
- Featured product sections
- Brand and value proposition blocks
- TypeScript + React + Vite starter
- Local admin CMS shell for catalog edits

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Offline bulk product management (CSV)

You can manage products offline and upload in one batch.

- CSV template: `bulk/products/products-template.csv`
- Image folder: `public/imports/product-images/`
- Workflow guide: `bulk/products/README.md`
- Build admin import JSON: `npm run bulk:build`

Before running bulk build, export current JSON from `/admin` and save it as:

- `bulk/products/base-snapshot.json`

Then run:

```bash
npm run bulk:build
```

This generates:

- `bulk/products/bulk-import.json`

Paste it into `/admin` -> Import JSON to apply all changes at once.

## Deploy to Cloudflare Workers

The storefront and `/api` routes run as one Cloudflare Worker (`src/worker.ts`) with:

- Static assets from `dist/` (Vite build)
- D1 database (`racketpoint-db`) for products, users, sessions, and orders
- Config in `wrangler.jsonc`

```bash
npm run deploy
```

For local Worker + D1:

```bash
npm run cf:dev
```

## Connect the domain racketpoint.bg

- In Cloudflare Dashboard → Workers & Pages → your `racketpoint` Worker → Custom Domains
- Add `racketpoint.bg` and `www.racketpoint.bg`
- Point DNS for the domain at Cloudflare (proxied) so the Worker serves the site

## Environment setup

Copy `.env.example` and configure values for your environment.

Set production secrets on the Worker (Wrangler / Cloudflare dashboard), for example:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `BORICA_TERMINAL_ID`
- `BORICA_PRIVATE_KEY_PEM`

Important defaults for production safety are already encoded in the app:

- Local auth fallback is disabled by default.
- Client-triggered bootstrap is disabled by default.
- Frontend admin unlock requires `VITE_ADMIN_PASSWORD` (no hardcoded fallback password).

## BORICA card payments

Card checkout is prepared for BORICA APGW. Gateway discovery is served by the Worker at `GET /api/payments/gateways`.

### Frontend flow

- `cash_on_delivery`: order create via Worker `/api/orders/create`.
- `card`: uses BORICA init/result flow when those Worker routes are enabled.
- `/payments/borica/result`: validates callback status and finalizes the order record.

### Commerce backend required environment variables

- `BORICA_TERMINAL_ID`
- `BORICA_PRIVATE_KEY_PEM`
- `BORICA_PUBLIC_KEY_PEM`

### Optional BORICA environment variables

- `BORICA_GATE_URL` (default: `https://3dsgate.borica.bg/cgi-bin/cgi_link`)
- `BORICA_BACKREF_URL` (default: `https://racketpoint.bg/api/payments/borica/callback`)
- `BORICA_RESULT_URL` (default: `https://racketpoint.bg/payments/borica/result`)
- `BORICA_CURRENCY` (default: `EUR`)
- `BORICA_MERCHANT_ID`
- `BORICA_MERCHANT_NAME`
- `BORICA_MERCHANT_URL`
- `BORICA_COUNTRY` (default: `BG`)
- `BORICA_MERCH_GMT` (default: `+03`)
- `BORICA_LANG` (default: `BG`)
- `BORICA_MPAY`

### URL to register with BORICA / bank

Use this return (BackRef) URL in production:

- `https://racketpoint.bg/api/payments/borica/callback`

## Cloudflare Worker backend

Backend logic lives in `src/worker.ts` and `src/workerCommerce.ts` (not a separate serverless platform).

### Implemented Worker API areas

- Auth
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- Products
  - `GET /api/products`
  - `POST|PUT /api/products` (admin)
- Orders
  - `POST /api/orders/create`
  - `GET /api/orders` (session user; `?all=1` for admin)
- Payments
  - `GET /api/payments/gateways`

### Persistence model

- Database: Cloudflare D1 (`DB` binding in `wrangler.jsonc`)
- Schema is ensured on Worker requests
- Session tokens are stored in D1

### Recommended Worker secrets / vars

- `ADMIN_EMAIL` (default: `admin@racketpoint.bg`)
- `ADMIN_PASSWORD`
- `PUBLIC_APP_URL`
- BORICA variables from the payment section above

See `BACKEND_SETUP.md` for a shorter ops checklist.
