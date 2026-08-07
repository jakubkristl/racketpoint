import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

export type SessionUser = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  name: string;
};

function readSecret() {
  const secret = (process.env.JWT_SECRET ?? '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET is missing.');
  }

  return secret;
}

export function signSession(user: SessionUser) {
  return jwt.sign(user, readSecret(), { expiresIn: '7d' });
}

export function parseBearerToken(req: any) {
  const value = String(req.headers?.authorization ?? '');
  if (!value.startsWith('Bearer ')) {
    return null;
  }

  return value.slice('Bearer '.length).trim() || null;
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, readSecret()) as JwtPayload & SessionUser;
    if (!decoded?.id || !decoded?.email || !decoded?.role) {
      return null;
    }

    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

export function getSessionUser(req: any) {
  const token = parseBearerToken(req);
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export function requireSession(req: any, res: any) {
  const session = getSessionUser(req);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return session;
}

export function requireAdmin(req: any, res: any) {
  const session = requireSession(req, res);
  if (!session) {
    return null;
  }

  if (session.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin role required' });
    return null;
  }

  return session;
}
