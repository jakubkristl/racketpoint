import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed } from '../_lib/http';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    methodNotAllowed(res);
    return;
  }

  try {
    await ensureSchema();
    await sql`SELECT 1`;
    res.status(200).json({ ok: true, service: 'racketpoint-commerce-api', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Health check failed.' });
  }
}
