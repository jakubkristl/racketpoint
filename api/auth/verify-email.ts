import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed } from '../_lib/http';
import { enforceRateLimit, getClientIp } from '../_lib/rateLimit';
import { setNoStore } from '../_lib/security';

function readToken(req: any) {
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : '';
  const bodyToken = typeof req.body?.token === 'string' ? req.body.token : '';
  return (queryToken || bodyToken).trim();
}

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'GET' && req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const ip = getClientIp(req);
  if (!enforceRateLimit(req, res, { key: `auth:verify-email:${ip}`, max: 30, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  try {
    await ensureSchema();
    const token = readToken(req);

    if (!token) {
      res.status(400).json({ error: 'Verification token is required.' });
      return;
    }

    const result = await sql`
      UPDATE users
      SET
        email_verified = TRUE,
        email_verification_token = NULL,
        email_verification_sent_at = NULL
      WHERE email_verification_token = ${token}
      RETURNING id, email
    `;

    if (result.rowCount === 0) {
      res.status(400).json({ error: 'Invalid or expired verification token.' });
      return;
    }

    res.status(200).json({ ok: true, message: 'Email verified successfully.' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Email verification failed.' });
  }
}
