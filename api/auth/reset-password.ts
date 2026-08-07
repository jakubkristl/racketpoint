import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, readBody } from '../_lib/http';
import { enforceRateLimit, getClientIp } from '../_lib/rateLimit';
import { isStrongPassword } from '../_lib/validation';

type ResetPasswordBody = {
  token: string;
  newPassword: string;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const ip = getClientIp(req);
  if (!enforceRateLimit(req, res, { key: `auth:reset:${ip}`, max: 12, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  try {
    await ensureSchema();
    const body = readBody<ResetPasswordBody>(req);
    const token = body.token?.trim();
    const newPassword = body.newPassword ?? '';

    if (!token || !isStrongPassword(newPassword)) {
      res.status(400).json({ error: 'Token and strong password are required.' });
      return;
    }

    const userResult = await sql`
      SELECT id, password_reset_expires_at
      FROM users
      WHERE password_reset_token = ${token}
      LIMIT 1
    `;

    if (userResult.rowCount === 0) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    const row = userResult.rows[0] as {
      id: string;
      password_reset_expires_at: string | null;
    };

    if (!row.password_reset_expires_at || new Date(row.password_reset_expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await sql`
      UPDATE users
      SET
        password_hash = ${hash},
        password_reset_token = NULL,
        password_reset_expires_at = NULL
      WHERE id = ${row.id}
    `;

    res.status(200).json({ ok: true, message: 'Password has been reset.' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Password reset failed.' });
  }
}
