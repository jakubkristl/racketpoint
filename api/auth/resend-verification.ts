import crypto from 'node:crypto';
import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, readBody } from '../_lib/http';
import { sendTransactionalEmail } from '../_lib/email';
import { enforceRateLimit, getClientIp } from '../_lib/rateLimit';
import { isValidEmail, normalizeEmail } from '../_lib/validation';

type Body = {
  email: string;
};

function requiresEmailVerification() {
  const raw = (process.env.EMAIL_VERIFICATION_REQUIRED ?? 'true').trim().toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

function buildVerificationUrl(token: string) {
  const base = (process.env.PUBLIC_APP_URL ?? 'http://localhost:5173').trim().replace(/\/$/, '');
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const ip = getClientIp(req);
  if (!enforceRateLimit(req, res, { key: `auth:resend-verification:${ip}`, max: 8, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  try {
    if (!requiresEmailVerification()) {
      res.status(200).json({ ok: true, message: 'Email verification is currently not required.' });
      return;
    }

    await ensureSchema();
    const body = readBody<Body>(req);
    const email = normalizeEmail(body.email);

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }

    const userResult = await sql`
      SELECT id, email_verified
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (userResult.rowCount > 0) {
      const user = userResult.rows[0] as { id: string; email_verified: boolean };

      if (!user.email_verified) {
        const token = crypto.randomBytes(24).toString('hex');
        await sql`
          UPDATE users
          SET email_verification_token = ${token}, email_verification_sent_at = NOW()
          WHERE id = ${user.id}
        `;

        const verificationUrl = buildVerificationUrl(token);
        await sendTransactionalEmail({
          to: email,
          subject: 'Verify your Racketpoint account',
          text: `Verify your email by opening: ${verificationUrl}`,
        }).catch(() => undefined);
      }
    }

    res.status(200).json({ ok: true, message: 'If your account needs verification, a new email has been sent.' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Resend verification failed.' });
  }
}
