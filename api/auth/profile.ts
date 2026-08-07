import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, readBody } from '../_lib/http';
import { requireSession } from '../_lib/auth';
import { setNoStore } from '../_lib/security';
import { sanitizeAddresses, sanitizeText } from '../_lib/validation';

type UpdateProfileBody = {
  name?: string;
  addresses?: unknown[];
};

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'GET' && req.method !== 'PUT') {
    methodNotAllowed(res);
    return;
  }

  const session = requireSession(req, res);
  if (!session) {
    return;
  }

  try {
    await ensureSchema();

    if (req.method === 'GET') {
      const result = await sql`
        SELECT id, name, email, role, addresses, created_at
        FROM users
        WHERE id = ${session.id}
        LIMIT 1
      `;

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      res.status(200).json(result.rows[0]);
      return;
    }

    const body = readBody<UpdateProfileBody>(req);
    const name = sanitizeText(body.name, 80);
    const addresses = Array.isArray(body.addresses) ? sanitizeAddresses(body.addresses) : undefined;

    if (!name && addresses === undefined) {
      res.status(400).json({ error: 'At least one profile field is required.' });
      return;
    }

    const result = await sql`
      UPDATE users
      SET
        name = COALESCE(${name ?? null}, name),
        addresses = COALESCE(${addresses ? JSON.stringify(addresses) : null}::jsonb, addresses)
      WHERE id = ${session.id}
      RETURNING id, name, email, role, addresses, created_at
    `;

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Profile request failed.' });
  }
}
