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

- The Worker configuration is in `wrangler.jsonc` and serves the built `dist/` assets with SPA route fallback.
- It binds `DB` to the Cloudflare D1 database `racketpoint-db`.
- Validate the Cloudflare deployment configuration with `npm run build` followed by `npm run check:worker`.
- Push the repository to trigger the existing Cloudflare Git deployment.

## Connect the domain racketpoint.bg

- Open your project in Vercel -> Settings -> Domains.
- Add `racketpoint.bg` and `www.racketpoint.bg`.
- In your domain registrar DNS, set `A` record for `@` to `76.76.21.21`.
- In your domain registrar DNS, set `CNAME` record for `www` to `cname.vercel-dns.com`.
- Wait for verification and SSL issuance in Vercel.

## Environment setup

Copy `.env.example` and configure values for your environment.

Important defaults for production safety are already encoded in the app:

- Local auth fallback is disabled by default.
- Client-triggered bootstrap is disabled by default.
- Frontend admin unlock requires `VITE_ADMIN_PASSWORD` (no hardcoded fallback password).

## BORICA card payments

Card checkout now uses BORICA APGW via serverless endpoints.

### Implemented endpoints

- `POST /api/payments/borica/init`
  - Builds payment payload (`TERMINAL`, `TRTYPE`, `AMOUNT`, `CURRENCY`, `ORDER`, `TIMESTAMP`, `NONCE`)
  - Signs payload with RSA SHA-256 (`P_SIGN`)
  - Returns gateway action URL + form fields for browser POST redirect
- `POST /api/payments/borica/callback`
  - Verifies BORICA response signature (`P_SIGN`) with BORICA public key
  - Redirects customer to `/payments/borica/result` with normalized status params

### Frontend flow

- `cash_on_delivery`: keeps local order queue flow.
- `card`: calls `/api/payments/borica/init`, stores a pending local order session, then auto-posts to BORICA.
- `/payments/borica/result`: validates callback status and finalizes approved local order record.

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

## Single-system Vercel backend (WooCommerce-like)

This project now includes a built-in commerce backend under `api/` so you can run one system on Vercel (frontend + serverless APIs + database).

### Implemented backend areas

- Auth API
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/profile`
  - `PUT /api/auth/profile`
  - `GET/POST /api/auth/verify-email`
  - `POST /api/auth/resend-verification`
  - `POST /api/auth/request-password-reset`
  - `POST /api/auth/reset-password`
- Products API (admin CRUD + public listing)
  - `GET /api/products`
  - `POST /api/products` (admin)
  - `PUT /api/products?id=...` (admin)
  - `DELETE /api/products?id=...` (admin)
- Orders API
  - `POST /api/orders/create`
  - `GET /api/orders` (session user)
  - `PUT /api/orders/status` (admin)
- Admin stats
  - `GET /api/admin/stats` (admin)
  - `GET /api/admin/stock-movements` (admin)
- Payments gateway abstraction
  - `GET /api/payments/gateways`
  - `POST /api/payments/gateways/checkout`
  - Existing BORICA endpoints remain active.
- System utilities
  - `GET /api/system/health`
  - `POST /api/system/bootstrap` (requires bootstrap key)

### Persistence model

- Database: Postgres via `@vercel/postgres`.
- Tables are auto-created on first API usage by `api/_lib/db.ts`.
- JWT sessions are used for API auth.

### Required environment variables

- `POSTGRES_URL` (provided by Vercel Postgres integration)
- `JWT_SECRET`

### Recommended environment variables

- `ADMIN_EMAIL` (default: `admin@racketpoint.bg`)
- `ADMIN_PASSWORD_HASH` (bcrypt hash, recommended for auto-seeding admin)
- `BOOTSTRAP_API_KEY` (required for `/api/system/bootstrap`)
- `PUBLIC_APP_URL` (used in verification/reset links)
- `EMAIL_VERIFICATION_REQUIRED` (`true` recommended)
- `EMAIL_WEBHOOK_URL` (for real email delivery)
- BORICA variables from the payment section above.

## Security and reliability hardening already implemented

- Server-side pricing and stock reservation in order creation.
- Checkout idempotency support via `X-Idempotency-Key`.
- BORICA callback signature persistence and payment event audit table.
- Restock on `Cancelled`/`Refunded` order status transitions (one-time guarded).
- Inventory movement audit trail in `stock_movements`.
- Basic API rate limiting on auth/reset/order-create endpoints.
- Edge security headers via `vercel.json`.

### Bootstrap flow

1. Connect Vercel Postgres to the project.
2. Set `JWT_SECRET` and `BOOTSTRAP_API_KEY`.
3. Optionally call:
   - `POST /api/system/bootstrap`
   - Header: `x-bootstrap-key: <BOOTSTRAP_API_KEY>`
   - Body can include admin credentials and sample product seeding.
