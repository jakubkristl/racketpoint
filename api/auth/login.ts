import bcrypt from 'bcryptjs';
import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, readBody } from '../_lib/http';
import { signSession } from '../_lib/auth';
import { enforceRateLimit, getClientIp } from '../_lib/rateLimit';
import { setNoStore } from '../_lib/security';
import { isValidEmail, normalizeEmail } from '../_lib/validation';

type LoginBody = {
  email: string;
  password: string;
};

function requiresEmailVerification() {
  const raw = (process.env.EMAIL_VERIFICATION_REQUIRED ?? 'true').trim().toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

export default async function handler(req: any, res: any) {
  setNoStore(res);

  if (req.method !== 'POST') {
    methodNotAllowed(res);
    return;
  }

  const ip = getClientIp(req);
  if (!enforceRateLimit(req, res, { key: `auth:login:${ip}`, max: 20, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  try {
    await ensureSchema();
    const body = readBody<LoginBody>(req);
    const email = normalizeEmail(body.email);
    const password = body.password ?? '';

    if (!email || !isValidEmail(email) || !password) {
      res.status(400).json({ error: 'Valid email and password are required.' });
      return;
    }

    const result = await sql`
      SELECT id, name, email, role, password_hash, addresses, email_verified
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (result.rowCount === 0) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const user = result.rows[0] as {
      id: string;
      name: string;
      email: string;
      role: 'USER' | 'ADMIN';
      password_hash: string;
      addresses: unknown;
      email_verified: boolean;
    };

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    if (requiresEmailVerification() && !user.email_verified) {
      res.status(403).json({ error: 'Email is not verified yet.' });
      return;
    }

    const token = signSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        addresses: Array.isArray(user.addresses) ? user.addresses : [],
        emailVerified: Boolean(user.email_verified),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Login failed.' });
  }
}
