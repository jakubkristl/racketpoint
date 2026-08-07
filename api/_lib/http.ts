export function methodNotAllowed(res: any) {
  res.status(405).json({ error: 'Method not allowed' });
}

export function readBody<T>(req: any): T {
  if (!req.body || typeof req.body !== 'object') {
    throw new Error('Missing request body');
  }

  return req.body as T;
}

export function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
