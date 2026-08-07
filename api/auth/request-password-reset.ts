import crypto from 'node:crypto';
import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, readBody } from '../_lib/http';
import { sendTransactionalEmail } from '../_lib/email';
import { enforceRateLimit, getClientIp } from '../_lib/rateLimit';
import { isValidEmail, normalizeEmail } from '../_lib/validation';

type ResetRequestBody = {
  email: string;
};

function expiryIso(hours: number) {
  const now = Date.now();
  return new Date(now + hours * 60 * 60 * 1000).toISOString();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const ip = getClientIp(req);
  if (!enforceRateLimit(req, res, { key: `auth:reset-request:${ip}`, max: 8, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  try {
    await ensureSchema();
    const body = readBody<ResetRequestBody>(req);
    const email = normalizeEmail(body.email);

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = expiryIso(2);

    const updated = await sql`
      UPDATE users
      SET
        password_reset_token = ${token},
        password_reset_expires_at = ${expiresAt}
      WHERE email = ${email}
      RETURNING id
    `;

    const appBase = (process.env.PUBLIC_APP_URL ?? 'http://localhost:5173').trim().replace(/\/$/, '');
    const resetUrl = `${appBase}/reset-password?token=${encodeURIComponent(token)}`;

    if (updated.rowCount > 0) {
      await sendTransactionalEmail({
        to: email,
        subject: 'Reset your Racketpoint password',
        text: `Use this link to reset your password: ${resetUrl}. This link expires in 2 hours.`,
      }).catch(() => undefined);
    }

    // Do not leak user existence in production responses.
    const payload: Record<string, unknown> = {
      ok: true,
      message: 'If this account exists, a password reset has been issued.',
    };

    if (updated.rowCount > 0 && process.env.NODE_ENV !== 'production') {
      payload.token = token;
      payload.url = resetUrl;
    }

    res.status(200).json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Password reset request failed.' });
  }
}
