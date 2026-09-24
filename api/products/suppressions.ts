import { ensureSchema, sql } from '../_lib/db';
import { requireAdmin } from '../_lib/auth';
import { methodNotAllowed, readBody } from '../_lib/http';
import { notifyClubSiteCatalogChanged } from '../_lib/clubSiteSync';

type SuppressionPayload = {
  keys?: string[];
  label?: string;
};

function sanitizeKeys(raw: unknown) {
  if (!Array.isArray(raw)) {
    return [] as string[];
  }

  return [...new Set(
    raw
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  )];
}

export default async function handler(req: any, res: any) {
  if (!['GET', 'POST'].includes(req.method)) {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const result = await sql`SELECT identity_key FROM product_suppressions ORDER BY created_at DESC`;
      res.status(200).json({
        keys: result.rows.map((row) => String(row.identity_key)),
      });
      return;
    }

    const admin = requireAdmin(req, res);
    if (!admin) {
      return;
    }

    const body = readBody<SuppressionPayload>(req);
    const keys = sanitizeKeys(body.keys);
    if (keys.length === 0) {
      res.status(400).json({ error: 'keys array is required.' });
      return;
    }

    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : null;

    for (const key of keys) {
      await sql`
        INSERT INTO product_suppressions (identity_key, label)
        VALUES (${key}, ${label})
        ON CONFLICT (identity_key) DO NOTHING
      `;
    }

    void notifyClubSiteCatalogChanged('product_suppress');
    res.status(200).json({ ok: true, inserted: keys.length, keys });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Suppressions API failure.' });
  }
}
