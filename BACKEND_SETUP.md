# Racketpoint Backend Setup

This project runs as a single system on Vercel:

- React storefront (Vite)
- Vercel serverless API routes under `api/`
- Vercel Postgres for persistence
- BORICA and COD payment gateways

## Architecture

```text
Browser
  -> Vite Frontend
  -> Vercel API Routes (/api)
  -> Vercel Postgres
```

## Required environment variables

- `POSTGRES_URL`
- `JWT_SECRET`

## Recommended environment variables

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `BOOTSTRAP_API_KEY`
- `BORICA_TERMINAL_ID`
- `BORICA_PRIVATE_KEY_PEM`
- `BORICA_PUBLIC_KEY_PEM`
- `BORICA_GATE_URL`
- `BORICA_BACKREF_URL`
- `BORICA_RESULT_URL`

## Implemented API map

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`

### Products

- `GET /api/products`
- `POST /api/products` (admin)
- `PUT /api/products?id=<id>` (admin)
- `DELETE /api/products?id=<id>` (admin)

### Orders

- `POST /api/orders/create`
- `GET /api/orders`
- `PUT /api/orders/status` (admin)

### Admin

- `GET /api/admin/stats` (admin)

### Payments

- `GET /api/payments/gateways`
- `POST /api/payments/gateways/checkout`
- `POST /api/payments/borica/init`
- `GET|POST /api/payments/borica/callback`

### System

- `GET /api/system/health`
- `POST /api/system/bootstrap`

## Bootstrap flow

1. Deploy to Vercel with Postgres connected.
2. Set all required environment variables.
3. Call bootstrap once to initialize admin and optional sample products.

Example bootstrap call:

```bash
curl -X POST "https://racketpoint.bg/api/system/bootstrap" \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-key: $BOOTSTRAP_API_KEY" \
  -d '{"adminEmail":"admin@racketpoint.bg","adminPassword":"StrongPass123!","seedSampleProducts":true}'
```

## Security notes

- Use strong `JWT_SECRET` and rotate periodically.
- Never expose bootstrap key in frontend code.
- Keep BORICA key material only in Vercel environment variables.
- Restrict admin operations to `ADMIN` role JWTs.
