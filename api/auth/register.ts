import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { ensureSchema, sql } from '../_lib/db';
import { methodNotAllowed, readBody } from '../_lib/http';
import { signSession } from '../_lib/auth';
import { sendTransactionalEmail } from '../_lib/email';
import { enforceRateLimit, getClientIp } from '../_lib/rateLimit';
import { isStrongPassword, isValidEmail, normalizeEmail, sanitizeText } from '../_lib/validation';

type RegisterBody = {
  name: string;
  email: string;
  password: string;
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
  if (!enforceRateLimit(req, res, { key: `auth:register:${ip}`, max: 10, windowMs: 10 * 60 * 1000 })) {
    return;
  }

  try {
    await ensureSchema();
    const body = readBody<RegisterBody>(req);
    const name = sanitizeText(body.name, 80);
    const email = normalizeEmail(body.email);
    const password = body.password ?? '';

    if (!name || !email || !isValidEmail(email) || !isStrongPassword(password)) {
      res.status(400).json({ error: 'Name, valid email and strong password are required.' });
      return;
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    if (existing.rowCount > 0) {
      res.status(409).json({ error: 'Account already exists.' });
      return;
    }

    const id = `usr_${Date.now().toString(36)}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationRequired = requiresEmailVerification();
    const verificationToken = verificationRequired ? crypto.randomBytes(24).toString('hex') : null;

    await sql`
      INSERT INTO users (
        id, name, email, password_hash, role, addresses,
        email_verified, email_verification_token, email_verification_sent_at
      )
      VALUES (
        ${id}, ${name}, ${email}, ${passwordHash}, 'USER', '[]'::jsonb,
        ${verificationRequired ? false : true},
        ${verificationToken},
        ${verificationToken ? new Date().toISOString() : null}
      )
    `;

    if (verificationToken) {
      const verificationUrl = buildVerificationUrl(verificationToken);
      await sendTransactionalEmail({
        to: email,
        subject: 'Verify your Racketpoint account',
        text: `Welcome to Racketpoint. Verify your email by opening: ${verificationUrl}`,
      }).catch(() => undefined);
    }

    const token = signSession({ id, name, email, role: 'USER' });
    res.status(201).json({
      token,
      verificationRequired,
      verification: verificationToken
        ? {
          token: process.env.NODE_ENV === 'production' ? undefined : verificationToken,
          url: process.env.NODE_ENV === 'production' ? undefined : buildVerificationUrl(verificationToken),
        }
        : undefined,
      user: {
        id,
        name,
        email,
        role: 'USER',
        addresses: [],
        emailVerified: verificationRequired ? false : true,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Registration failed.' });
  }
}
