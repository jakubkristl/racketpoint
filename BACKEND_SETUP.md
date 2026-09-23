# Racketpoint Backend Setup

This project runs as a single system on Cloudflare Workers:

- React storefront (Vite → `dist/`)
- Worker API routes in `src/worker.ts`
- Cloudflare D1 for persistence
- COD (and BORICA-ready) payment gateways

## Architecture

```text
Browser
  -> Cloudflare Worker (assets + /api)
  -> D1 (racketpoint-db)
```

## Deploy

```bash
npm run deploy
```

Config: `wrangler.jsonc`  
Worker entry: `src/worker.ts`  
Commerce helpers: `src/workerCommerce.ts`

## Recommended Worker secrets / vars

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `BORICA_TERMINAL_ID`
- `BORICA_PRIVATE_KEY_PEM`
- `BORICA_PUBLIC_KEY_PEM`
- `BORICA_GATE_URL`
- `BORICA_BACKREF_URL`
- `BORICA_RESULT_URL`
- `PUBLIC_APP_URL`

## Implemented API map

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Products

- `GET /api/products`
- `POST|PUT /api/products` (admin)

### Orders

- `POST /api/orders/create`
- `GET /api/orders`

### Payments

- `GET /api/payments/gateways`

## Security notes

- Use a strong admin password and rotate periodically.
- Keep BORICA key material only in Worker secrets (never in the frontend bundle).
- Restrict product write operations to admin sessions.
