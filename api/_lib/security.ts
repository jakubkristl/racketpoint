type OriginOptions = {
  allowWithoutOrigin?: boolean;
};

function toOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function getAllowedOrigins() {
  const candidates = [
    process.env.PUBLIC_APP_URL,
    process.env.BORICA_RESULT_URL,
    'https://racketpoint.bg',
    'https://www.racketpoint.bg',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  const origins = candidates
    .map((item) => toOrigin((item ?? '').trim()))
    .filter(Boolean);

  return new Set(origins);
}

export function setNoStore(res: any) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export function enforceTrustedOrigin(req: any, res: any, options?: OriginOptions) {
  const allowWithoutOrigin = options?.allowWithoutOrigin ?? true;
  const originHeader = String(req.headers?.origin ?? '').trim();

  if (!originHeader) {
    if (allowWithoutOrigin) {
      return true;
    }

    res.status(403).json({ error: 'Origin is required.' });
    return false;
  }

  const origin = toOrigin(originHeader);
  if (!origin) {
    res.status(403).json({ error: 'Invalid origin.' });
    return false;
  }

  const allowed = getAllowedOrigins();
  if (!allowed.has(origin)) {
    res.status(403).json({ error: 'Origin is not allowed.' });
    return false;
  }

  return true;
}