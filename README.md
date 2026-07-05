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

## Deploy to Vercel

1. Push this project to your GitHub repository.
2. In Vercel, click Add New Project and import the repository.
3. Keep defaults:
	- Framework Preset: Vite
	- Build Command: npm run build
	- Output Directory: dist
4. Deploy.

The project includes `vercel.json` with SPA rewrites so routes like `/category/rackets` work on refresh.

## Connect the domain racketpoint.bg

1. Open your project in Vercel -> Settings -> Domains.
2. Add `racketpoint.bg` and `www.racketpoint.bg`.
3. In your domain registrar DNS, set:
	- `A` record for `@` to `76.76.21.21`
	- `CNAME` record for `www` to `cname.vercel-dns.com`
4. Wait for verification and SSL issuance in Vercel.

## Optional environment variable

Set `VITE_ADMIN_PASSWORD` in Vercel Project Settings -> Environment Variables to secure admin access.