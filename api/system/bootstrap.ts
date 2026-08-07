import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, readBody } from '../_lib/http';

type BootstrapBody = {
  adminEmail?: string;
  adminPassword?: string;
  seedSampleProducts?: boolean;
};

const sports = ['Squash', 'Badminton', 'Padel', 'Table Tennis', 'Tennis'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const allowInProduction = (process.env.BOOTSTRAP_ALLOW_IN_PRODUCTION ?? '').trim().toLowerCase() === 'true';
  if (process.env.NODE_ENV === 'production' && !allowInProduction) {
    res.status(403).json({ error: 'Bootstrap endpoint is disabled in production.' });
    return;
  }

  const apiKey = (req.headers['x-bootstrap-key'] || '').toString();
  if (!apiKey || apiKey !== (process.env.BOOTSTRAP_API_KEY ?? '').trim()) {
    res.status(401).json({ error: 'Invalid bootstrap key.' });
    return;
  }

  try {
    await ensureSchema();
    const body = readBody<BootstrapBody>(req);

    if (body.adminEmail && body.adminPassword) {
      const email = body.adminEmail.trim().toLowerCase();
      const hash = await bcrypt.hash(body.adminPassword, 10);

      await sql`
        INSERT INTO users (id, name, email, password_hash, role)
        VALUES (${`adm_${Date.now().toString(36)}`}, 'Store Admin', ${email}, ${hash}, 'ADMIN')
        ON CONFLICT (email)
        DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'ADMIN'
      `;
    }

    if (body.seedSampleProducts) {
      for (const sport of sports) {
        const slug = `${sport.toLowerCase().replace(/\s+/g, '-')}-starter-racket`;
        await sql`
          INSERT INTO products (
            id, title, slug, description, brand, sport, sub_category,
            cost_price, selling_price, discount_price, stock, images, attributes, sizes, weight_grams, balance
          )
          VALUES (
            ${`prd_${sport.toLowerCase().replace(/\s+/g, '_')}`},
            ${`${sport} Starter Racket`},
            ${slug},
            ${`Entry-level ${sport} racket for onboarding the catalog.`},
            'Racketpoint',
            ${sport},
            'Rackets',
            52.00,
            89.00,
            NULL,
            25,
            ${JSON.stringify(['/branding/logo-fallback.png'])}::jsonb,
            ${JSON.stringify({ material: 'Graphite Blend' })}::jsonb,
            ${JSON.stringify(['M', 'L'])}::jsonb,
            125,
            'Balanced'
          )
          ON CONFLICT (slug) DO NOTHING
        `;
      }
    }

    res.status(200).json({ ok: true, message: 'Bootstrap complete.' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Bootstrap failed.' });
  }
}
