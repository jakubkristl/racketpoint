type RateLimitOptions = {
  key: string;
  max: number;
  windowMs: number;
};

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

function now() {
  return Date.now();
}

function cleanupExpired() {
  const timestamp = now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= timestamp) {
      buckets.delete(key);
    }
  }
}

export function getClientIp(req: any) {
  const forwardedFor = String(req.headers?.['x-forwarded-for'] ?? '').split(',')[0]?.trim();
  if (forwardedFor) {
    return forwardedFor;
  }

  const realIp = String(req.headers?.['x-real-ip'] ?? '').trim();
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export function enforceRateLimit(req: any, res: any, options: RateLimitOptions) {
  cleanupExpired();

  const timestamp = now();
  const existing = buckets.get(options.key);
  if (!existing || existing.resetAt <= timestamp) {
    buckets.set(options.key, {
      count: 1,
      resetAt: timestamp + options.windowMs,
    });

    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - 1)));
    return true;
  }

  if (existing.count >= options.max) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - timestamp) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    return false;
  }

  existing.count += 1;
  buckets.set(options.key, existing);

  res.setHeader('X-RateLimit-Limit', String(options.max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - existing.count)));
  return true;
}
