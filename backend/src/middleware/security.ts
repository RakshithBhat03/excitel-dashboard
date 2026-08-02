import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const API_AUTH_USERNAME = process.env.API_AUTH_USERNAME;
const API_AUTH_PASSWORD = process.env.API_AUTH_PASSWORD;
const API_AUTH_REQUIRED = process.env.API_AUTH_REQUIRED === 'true';
const AUTH_VALUES_PROVIDED = [API_AUTH_USERNAME, API_AUTH_PASSWORD].filter(
  (value) => Boolean(value),
).length;
const API_AUTH_CONFIGURED = Boolean(API_AUTH_USERNAME && API_AUTH_PASSWORD);

const DEFAULT_ORIGINS = [
  'http://localhost:3080',
  'http://127.0.0.1:3080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

export const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || DEFAULT_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  max: number;
  windowMs: number;
  message: string;
}

function readPositiveInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function unauthorized(res: Response): void {
  res.setHeader('WWW-Authenticate', 'Basic realm="Excitel Dashboard API", charset="UTF-8"');
  res.status(401).json({ success: false, error: 'Authentication required' });
}

function parseBasicCredentials(header: string | undefined): [string, string] | null {
  if (!header || !header.startsWith('Basic ')) return null;

  const encoded = header.slice('Basic '.length).trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;

  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 1) return null;

  return [decoded.slice(0, separator), decoded.slice(separator + 1)];
}

/**
 * Auth is opt-in for the documented loopback-only setup. Once enabled, this
 * middleware protects every /api route without putting credentials in the UI.
 */
export function requireApiAuth(req: Request, res: Response, next: NextFunction): void {
  if (!API_AUTH_REQUIRED && !API_AUTH_CONFIGURED) {
    next();
    return;
  }

  if (!API_AUTH_CONFIGURED) {
    res.status(503).json({ success: false, error: 'API authentication is misconfigured' });
    return;
  }

  const credentials = parseBasicCredentials(req.get('authorization'));
  const usernameMatches = credentials ? safeEqual(credentials[0], API_AUTH_USERNAME ?? '') : false;
  const passwordMatches = credentials ? safeEqual(credentials[1], API_AUTH_PASSWORD ?? '') : false;

  if (!usernameMatches || !passwordMatches) {
    unauthorized(res);
    return;
  }

  next();
}

/** Fail closed when authentication is explicitly required or partially configured. */
export function assertApiAuthConfiguration(): void {
  if (AUTH_VALUES_PROVIDED > 0 && !API_AUTH_CONFIGURED) {
    throw new Error('API_AUTH_USERNAME and API_AUTH_PASSWORD must be provided together');
  }
  if (API_AUTH_REQUIRED && !API_AUTH_CONFIGURED) {
    throw new Error('API_AUTH_REQUIRED=true requires API_AUTH_USERNAME and API_AUTH_PASSWORD');
  }
}

export function isApiAuthEnabled(): boolean {
  return API_AUTH_REQUIRED || API_AUTH_CONFIGURED;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const entries = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }

    // Bound memory if an exposed service receives many unique source addresses.
    if (entries.size > 10_000) entries.clear();

    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = entries.get(key);
    const entry = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + options.windowMs };

    entry.count += 1;
    entries.set(key, entry);

    const remaining = Math.max(0, options.max - entry.count);
    res.setHeader('RateLimit-Limit', options.max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > options.max) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ success: false, error: options.message });
      return;
    }

    next();
  };
}

export const apiRateLimit = createRateLimiter({
  max: readPositiveInt('API_RATE_LIMIT_MAX', 120),
  windowMs: readPositiveInt('API_RATE_LIMIT_WINDOW_MS', 60_000),
  message: 'Too many API requests; try again shortly',
});

export const syncRateLimit = createRateLimiter({
  max: readPositiveInt('SYNC_RATE_LIMIT_MAX', 5),
  windowMs: readPositiveInt('SYNC_RATE_LIMIT_WINDOW_MS', 10 * 60_000),
  message: 'Too many sync requests; try again later',
});

/**
 * Browser state-changing requests must come from a configured application
 * origin. Requests without Origin are retained for authenticated CLI use.
 */
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    res.status(403).json({ success: false, error: 'Untrusted request origin' });
    return;
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      if (!allowedOrigins.has(new URL(referer).origin)) {
        res.status(403).json({ success: false, error: 'Untrusted request origin' });
        return;
      }
    } catch {
      res.status(403).json({ success: false, error: 'Untrusted request origin' });
      return;
    }
  }

  if (!origin || allowedOrigins.has(origin)) {
    next();
  }
}
